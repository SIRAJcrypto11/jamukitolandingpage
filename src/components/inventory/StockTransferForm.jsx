import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StockTransferForm({ companyId, locations, products, onSuccess, onClose, currentUser }) {
  // Refactored state variables
  const [selectedProductId, setSelectedProductId] = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [currentProductData, setCurrentProductData] = useState(null); // Stores the full product object
  const [fromLocationStock, setFromLocationStock] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed from isSaving

  // Effect to load product data when selectedProductId changes
  useEffect(() => {
    if (selectedProductId) {
      const product = products.find(p => p.id === selectedProductId);
      setCurrentProductData(product);
    } else {
      setCurrentProductData(null);
    }
  }, [selectedProductId, products]);

  // Effect to load stock information when product or fromLocation changes
  useEffect(() => {
    if (selectedProductId && fromLocationId) {
      loadStockInfo();
    } else {
      setFromLocationStock(0); // Clear stock if product or location is unselected
    }
  }, [selectedProductId, fromLocationId, companyId]); // Added companyId as a dependency

  const loadStockInfo = async () => {
    try {
      // ✅ CRITICAL FIX: Filter dengan company_id untuk cegah data leak!
      const inventoryRecords = await base44.entities.Inventory.filter({
        company_id: companyId,  // ✅ WAJIB!
        product_id: selectedProductId,
        location_id: fromLocationId
      });

      if (inventoryRecords && inventoryRecords.length > 0) {
        setFromLocationStock(inventoryRecords[0].available_quantity || 0);
      } else {
        setFromLocationStock(0);
      }
    } catch (error) {
      console.error('Error loading stock info:', error);
      toast.error('Gagal memuat informasi stok');
    }
  };

  const handleSubmit = async () => {
    if (!selectedProductId || !fromLocationId || !toLocationId || transferQuantity <= 0) {
      toast.error('Lengkapi semua field yang diperlukan dan masukkan kuantitas yang valid.');
      return;
    }

    if (fromLocationId === toLocationId) {
      toast.error('Lokasi asal dan tujuan tidak boleh sama!');
      return;
    }

    if (!currentProductData) {
      toast.error('Produk tidak ditemukan.');
      return;
    }

    try {
      setIsSubmitting(true);

      const product = currentProductData; // Use the product data loaded into state
      const fromLoc = locations.find(l => l.id === fromLocationId);
      const toLoc = locations.find(l => l.id === toLocationId);

      if (!fromLoc || !toLoc) {
        toast.error('Lokasi asal atau tujuan tidak valid.');
        setIsSubmitting(false);
        return;
      }

      // Get source inventory
      // ✅ CRITICAL FIX: Filter dengan company_id!
      const sourceInv = await base44.entities.Inventory.filter({
        company_id: companyId,  // ✅ WAJIB!
        product_id: selectedProductId,
        location_id: fromLocationId
      });

      if (!sourceInv || sourceInv.length === 0) {
        toast.error('Stok produk tidak ditemukan di lokasi asal.');
        setIsSubmitting(false);
        return;
      }

      const source = sourceInv[0];

      if (source.available_quantity < transferQuantity) {
        toast.error(`Stok tersedia hanya ${source.available_quantity} unit.`);
        setIsSubmitting(false);
        return;
      }

      // Update source location (reduce stock)
      const newSourceQty = source.quantity - transferQuantity;
      const updatedSourceInventory = await base44.entities.Inventory.update(source.id, {
        quantity: newSourceQty,
        available_quantity: Math.max(0, newSourceQty - (source.reserved_quantity || 0)),
        stock_status: newSourceQty === 0 ? 'out_of_stock' :
                     newSourceQty <= (source.min_stock || 0) ? 'low_stock' :
                     'in_stock',
        last_stock_out: new Date().toISOString(),
        total_value: (source.unit_cost || 0) * newSourceQty
      });

      // Update destination location (add stock)
      // ✅ CRITICAL FIX: Filter dengan company_id!
      const destInv = await base44.entities.Inventory.filter({
        company_id: companyId,  // ✅ WAJIB!
        product_id: selectedProductId,
        location_id: toLocationId
      });

      // No need to store destinationInventoryId here, as the StockMovement only tracks origin.
      // If we needed to track both, we would create two movement records.
      if (destInv && destInv.length > 0) {
        const dest = destInv[0];
        const newDestQty = dest.quantity + transferQuantity;

        await base44.entities.Inventory.update(dest.id, {
          quantity: newDestQty,
          available_quantity: Math.max(0, newDestQty - (dest.reserved_quantity || 0)),
          stock_status: newDestQty === 0 ? 'out_of_stock' :
                       newDestQty <= (dest.min_stock || 0) ? 'low_stock' :
                       newDestQty >= (dest.max_stock || 1000) ? 'overstock' :
                       'in_stock',
          last_stock_in: new Date().toISOString(),
          total_value: (dest.unit_cost || 0) * newDestQty
        });
      } else {
        // Create new inventory at destination if it doesn't exist
        await base44.entities.Inventory.create({
          company_id: companyId,
          product_id: selectedProductId,
          product_name: product.name,
          product_sku: product.sku,
          location_id: toLocationId,
          location_name: toLoc.location_name,
          quantity: transferQuantity,
          available_quantity: transferQuantity,
          reserved_quantity: 0,
          min_stock: source.min_stock || 5, // Inherit min_stock from source or default
          max_stock: source.max_stock || 1000, // Inherit max_stock from source or default
          unit_cost: source.unit_cost || 0, // Inherit unit_cost from source or default
          total_value: (source.unit_cost || 0) * transferQuantity,
          stock_status: transferQuantity <= (source.min_stock || 0) ? 'low_stock' : 'in_stock',
          last_stock_in: new Date().toISOString()
        });
      }

      // Create stock movement record
      await base44.entities.StockMovement.create({
        company_id: companyId,
        inventory_id: updatedSourceInventory.id, // Reference the source inventory record
        product_id: selectedProductId,
        product_name: product.name,
        location_id: fromLocationId, // Movement originated from here
        location_name: fromLoc.location_name,
        movement_type: 'transfer',
        quantity: transferQuantity,
        stock_before: source.quantity,
        stock_after: newSourceQty,
        reference_type: 'transfer',
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        reason: reason || `Transfer to ${toLoc.location_name}`, // Use user-provided reason or default
        unit_cost: source.unit_cost || 0,
        total_value: (source.unit_cost || 0) * transferQuantity,
        performed_by: currentUser?.email || 'system',
        performed_by_name: currentUser?.full_name || 'System',
        notes: notes
      });

      toast.success('✅ Transfer stok berhasil!');
      
      // ✅ TRIPLE BROADCAST - Inventory, POS, Products
      try {
        const channel1 = new BroadcastChannel('snishop_inventory_updates');
        const channel2 = new BroadcastChannel('snishop_pos_updates');
        const channel3 = new BroadcastChannel('snishop_product_updates');
        
        const message = {
          type: 'STOCK_TRANSFERRED',
          companyId: companyId,
          productId: selectedProductId,
          fromLocationId: fromLocationId,
          toLocationId: toLocationId,
          quantity: transferQuantity,
          timestamp: Date.now()
        };
        
        channel1.postMessage(message);
        channel2.postMessage(message);
        channel3.postMessage(message);
        
        channel1.close();
        channel2.close();
        channel3.close();
        
        console.log('✅ TRANSFER BROADCAST to ALL channels');
      } catch (e) {
        console.warn('Broadcast failed:', e);
      }
      
      // ✅ Invalidate global cache
      try {
        const { default: globalCache } = await import('@/components/utils/globalDataCache');
        globalCache.invalidate(`inventory_${companyId}`);
        globalCache.invalidate(`products_${companyId}`);
        globalCache.invalidate(`pos_products_${companyId}`);
      } catch (e) {}

      if (onSuccess) onSuccess();
      if (onClose) onClose();

    } catch (error) {
      console.error('Error transferring stock:', error);
      toast.error('Gagal melakukan transfer stok');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // CONTENT ONLY - NO MODAL WRAPPER, PARENT HANDLE DIALOG DISPLAY
  // STRUKTUR LOGIC TRANSFER TETAP SAMA, HANYA TAMPILAN DIPERBAIKI
  // ============================================================================
  return (
    <div style={{ display: 'block', width: '100%' }}>
      {/* Product Selection */}
      <div style={{ marginBottom: '16px' }}>
        <Label style={{ color: '#d1d5db', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          Product *
        </Label>
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            color: 'white',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box',
            cursor: 'pointer'
          }}
        >
          <option value="">Select Product</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.name} - {product.sku}
            </option>
          ))}
        </select>
      </div>

      {/* From Location & To Location Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div>
          <Label style={{ color: '#d1d5db', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
            From Location *
          </Label>
          <select
            value={fromLocationId}
            onChange={(e) => setFromLocationId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              color: 'white',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              cursor: 'pointer'
            }}
          >
            <option value="">Select Location</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.location_name}</option>
            ))}
          </select>
          {fromLocationStock > 0 && (
            <p style={{ fontSize: '12px', color: '#4ade80', marginTop: '6px', margin: 0 }}>
              Available: {fromLocationStock} units
            </p>
          )}
        </div>

        <div>
          <Label style={{ color: '#d1d5db', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
            To Location *
          </Label>
          <select
            value={toLocationId}
            onChange={(e) => setToLocationId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              color: 'white',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              cursor: 'pointer'
            }}
          >
            <option value="">Select Location</option>
            {locations.filter(l => l.id !== fromLocationId).map(loc => (
              <option key={loc.id} value={loc.id}>{loc.location_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quantity */}
      <div style={{ marginBottom: '16px' }}>
        <Label style={{ color: '#d1d5db', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          Quantity to Transfer *
        </Label>
        <Input
          type="number"
          value={transferQuantity}
          onChange={(e) => setTransferQuantity(parseInt(e.target.value) || 0)}
          max={fromLocationStock}
          min="0"
          placeholder="0"
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            color: 'white',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px', margin: 0 }}>
          Max: {fromLocationStock} units
        </p>
      </div>

      {/* Reason */}
      <div style={{ marginBottom: '16px' }}>
        <Label style={{ color: '#d1d5db', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          Reason
        </Label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Restock, redistribution, dll"
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            color: 'white',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Notes */}
      <div style={{ marginBottom: '16px' }}>
        <Label style={{ color: '#d1d5db', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          Notes (optional)
        </Label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes"
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            color: 'white',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Transfer Summary */}
      {currentProductData && fromLocationId && toLocationId && transferQuantity > 0 && (
        <div style={{ 
          padding: '14px', 
          backgroundColor: '#0c4a6e', 
          border: '1px solid #0e7490',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <p style={{ color: 'white', fontWeight: '600', fontSize: '14px', marginBottom: '10px', margin: 0 }}>
            Transfer Summary:
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ color: '#cbd5e1', flex: '1 1 auto', minWidth: '80px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {locations.find(l => l.id === fromLocationId)?.location_name}
            </span>
            <ArrowRight style={{ color: '#06b6d4', flexShrink: 0, width: '18px', height: '18px' }} />
            <span style={{ color: '#cbd5e1', flex: '1 1 auto', minWidth: '80px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {locations.find(l => l.id === toLocationId)?.location_name}
            </span>
          </div>
          <p style={{ color: 'white', marginTop: '10px', fontSize: '13px', margin: 0 }}>
            <strong>{transferQuantity}</strong> x {currentProductData.name}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ paddingTop: '16px', borderTop: '1px solid #1f2937', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexDirection: 'row-reverse', flexWrap: 'wrap' }}>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !selectedProductId || !fromLocationId || !toLocationId || transferQuantity <= 0}
          style={{ 
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            cursor: isSubmitting || !selectedProductId || !fromLocationId || !toLocationId || transferQuantity <= 0 ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || !selectedProductId || !fromLocationId || !toLocationId || transferQuantity <= 0 ? 0.5 : 1,
            fontSize: '14px',
            fontWeight: '500',
            minWidth: '140px'
          }}
        >
          {isSubmitting && (
            <Loader2 style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
          )}
          <Save style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline-block' }} />
          Transfer Stock
        </Button>
        <Button 
          onClick={onClose}
          style={{ 
            backgroundColor: 'transparent',
            color: '#d1d5db',
            padding: '10px 20px',
            border: '1px solid #374151',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minWidth: '100px'
          }}
        >
          Cancel
        </Button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}