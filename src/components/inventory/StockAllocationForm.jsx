
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, MapPin, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StockAllocationForm({ 
  productId, 
  productName,
  locationId,
  locationName,
  currentStock = 0,
  companyId,
  onSuccess, 
  onClose 
}) {
  const [allocations, setAllocations] = useState({
    offline: 0,
    online: 0,
    marketplace: 0,
    b2b: 0,
    reserved: 0
  });

  const [geoZones, setGeoZones] = useState({
    same_city: 0,
    other_cities: 0,
    export: 0
  });

  // New states required for the expanded inventory management logic from the outline
  // Defaulting to 0 as there are no UI elements provided to set these in this form
  const [minStock, setMinStock] = useState(0); 
  const [maxStock, setMaxStock] = useState(0);
  const [reorderPoint, setReorderPoint] = useState(0);
  const [unitCost, setUnitCost] = useState(0);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const defaultOffline = Math.floor(currentStock * 0.5);
    const defaultOnline = Math.floor(currentStock * 0.3);
    const defaultMarketplace = Math.floor(currentStock * 0.2);
    const defaultSameCity = Math.floor(currentStock * 0.7);
    const defaultOtherCities = Math.floor(currentStock * 0.3);

    setAllocations({
      offline: defaultOffline,
      online: defaultOnline,
      marketplace: defaultMarketplace,
      b2b: 0,
      reserved: 0
    });

    setGeoZones({
      same_city: defaultSameCity,
      other_cities: defaultOtherCities,
      export: 0
    });
  }, [currentStock]);

  const totalChannelAllocation = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const totalGeoAllocation = Object.values(geoZones).reduce((sum, val) => sum + val, 0);

  const handleSave = async () => {
    // Current allocation validation
    if (totalChannelAllocation > currentStock) {
      toast.error('Total alokasi channel melebihi stok yang tersedia!');
      return;
    }

    if (totalGeoAllocation > currentStock) {
      toast.error('Total alokasi geografis melebihi stok yang tersedia!');
      return;
    }

    // New validation from the outline, using currentStock as the primary quantity
    if (currentStock <= 0) {
      toast.error('Stok utama harus lebih dari 0 untuk membuat/mengupdate inventaris.');
      return;
    }
    
    try {
      setIsSaving(true);

      // Mock products and locations data for the `find` method to work
      // In a real application, these would typically be fetched or passed as more complete objects.
      const products = [{ id: productId, name: productName, sku: 'N/A' }]; 
      const locations = [{ id: locationId, location_name: locationName }];

      const product = products.find(p => p.id === productId);
      const location = locations.find(l => l.id === locationId);

      if (!product || !location) {
        toast.error('Data produk atau lokasi tidak ditemukan.');
        return;
      }

      // Check if inventory record already exists
      // ✅ CRITICAL FIX: Filter dengan company_id untuk cegah data leak!
      let inventoryRecords = await base44.entities.Inventory.filter({
        company_id: companyId,  // ✅ WAJIB!
        product_id: productId,
        location_id: locationId
      });

      // Calculate stock status (from outline)
      const stockStatus = currentStock === 0 ? 'out_of_stock' :
                         currentStock <= minStock ? 'low_stock' :
                         currentStock >= maxStock ? 'overstock' :
                         'in_stock';

      // Prepare inventory data, combining existing allocation data with new fields from outline
      const inventoryData = {
        company_id: companyId,  // ✅ WAJIB!
        product_id: productId,
        product_name: productName,
        product_sku: product?.sku || 'N/A', // using mocked product with safe access
        location_id: locationId,
        location_name: locationName,
        quantity: currentStock, // Using currentStock as the main quantity for the record
        // available_quantity: currentStock, // This was from the outline's handleSubmit
        // Retaining existing calculation for available_quantity based on reserved stock
        available_quantity: currentStock - allocations.reserved, 
        min_stock: minStock,
        max_stock: maxStock,
        reorder_point: reorderPoint,
        unit_cost: unitCost,
        total_value: unitCost * currentStock,
        stock_status: stockStatus,
        channel_allocations: allocations, // Existing allocation data
        geographic_zones: geoZones,     // Existing allocation data
        reserved_quantity: allocations.reserved // Existing allocation data
      };

      if (inventoryRecords && inventoryRecords.length > 0) {
        const record = inventoryRecords[0];
        await base44.entities.Inventory.update(record.id, inventoryData);
        toast.success('✅ Inventaris dan alokasi stok berhasil diperbarui!');
      } else {
        // Create new record (from outline logic)
        await base44.entities.Inventory.create(inventoryData);
        toast.success('✅ Inventaris dan alokasi stok berhasil dibuat!');
      }

      // Broadcast Inventory Change (from outline)
      try {
        const channel = new BroadcastChannel('snishop_inventory_updates');
        channel.postMessage({
          type: 'INVENTORY_UPDATED',
          companyId: companyId,
          productId: productId,
          locationId: locationId,
          timestamp: Date.now()
        });
        channel.close();
      } catch (e) {
        console.warn('Gagal menyiarkan pembaruan inventaris:', e);
      }

      if (onSuccess) onSuccess();
      if (onClose) onClose();

    } catch (error) {
      console.error('Error saving inventory and allocation:', error);
      toast.error('Gagal menyimpan inventaris dan alokasi');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // SIMPLE CONTENT ONLY - NO WRAPPER MODAL, PARENT HANDLE MODAL DISPLAY
  // ============================================================================
  return (
    <div style={{ display: 'block', width: '100%' }}>
      {/* Current Stock Info */}
      <div style={{ padding: '16px', backgroundColor: '#0c4a6e', border: '1px solid #0e7490', borderRadius: '8px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Total Stock:</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{currentStock} units</span>
        </div>
      </div>

      {/* Channel Allocation */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: 'white', fontWeight: '600', marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Store size={18} style={{ color: '#a78bfa' }} />
          Channel Allocation
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '12px' }}>
          <div>
            <Label style={{ color: '#d1d5db', fontSize: '14px', display: 'block', marginBottom: '8px' }}>🏪 Offline Store</Label>
            <Input
              type="number"
              value={allocations.offline}
              onChange={(e) => setAllocations({...allocations, offline: parseInt(e.target.value) || 0})}
              style={{ width: '100%', padding: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }}
              min="0"
              max={currentStock}
            />
          </div>
          <div>
            <Label style={{ color: '#d1d5db', fontSize: '14px', display: 'block', marginBottom: '8px' }}>💻 Online</Label>
            <Input
              type="number"
              value={allocations.online}
              onChange={(e) => setAllocations({...allocations, online: parseInt(e.target.value) || 0})}
              style={{ width: '100%', padding: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }}
              min="0"
              max={currentStock}
            />
          </div>
          <div>
            <Label style={{ color: '#d1d5db', fontSize: '14px', display: 'block', marginBottom: '8px' }}>🛒 Marketplace</Label>
            <Input
              type="number"
              value={allocations.marketplace}
              onChange={(e) => setAllocations({...allocations, marketplace: parseInt(e.target.value) || 0})}
              style={{ width: '100%', padding: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }}
              min="0"
              max={currentStock}
            />
          </div>
          <div>
            <Label style={{ color: '#d1d5db', fontSize: '14px', display: 'block', marginBottom: '8px' }}>🏢 B2B</Label>
            <Input
              type="number"
              value={allocations.b2b}
              onChange={(e) => setAllocations({...allocations, b2b: parseInt(e.target.value) || 0})}
              style={{ width: '100%', padding: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }}
              min="0"
              max={currentStock}
            />
          </div>
        </div>
        <div style={{ padding: '12px', backgroundColor: totalChannelAllocation > currentStock ? '#7f1d1d' : '#1b4332', border: `1px solid ${totalChannelAllocation > currentStock ? '#dc2626' : '#2d6a4f'}`, borderRadius: '6px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'white' }}>
            Total: <strong>{totalChannelAllocation}</strong> / {currentStock}
          </p>
        </div>
      </div>

      {/* Geographic Distribution */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: 'white', fontWeight: '600', marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={18} style={{ color: '#22d3ee' }} />
          Geographic Distribution
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '12px' }}>
          <div>
            <Label style={{ color: '#d1d5db', fontSize: '14px', display: 'block', marginBottom: '8px' }}>📍 Dalam Kota</Label>
            <Input
              type="number"
              value={geoZones.same_city}
              onChange={(e) => setGeoZones({...geoZones, same_city: parseInt(e.target.value) || 0})}
              style={{ width: '100%', padding: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }}
              min="0"
              max={currentStock}
            />
          </div>
          <div>
            <Label style={{ color: '#d1d5db', fontSize: '14px', display: 'block', marginBottom: '8px' }}>🚚 Luar Kota</Label>
            <Input
              type="number"
              value={geoZones.other_cities}
              onChange={(e) => setGeoZones({...geoZones, other_cities: parseInt(e.target.value) || 0})}
              style={{ width: '100%', padding: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }}
              min="0"
              max={currentStock}
            />
          </div>
          <div>
            <Label style={{ color: '#d1d5db', fontSize: '14px', display: 'block', marginBottom: '8px' }}>✈️ Export</Label>
            <Input
              type="number"
              value={geoZones.export}
              onChange={(e) => setGeoZones({...geoZones, export: parseInt(e.target.value) || 0})}
              style={{ width: '100%', padding: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }}
              min="0"
              max={currentStock}
            />
          </div>
        </div>
        <div style={{ padding: '12px', backgroundColor: totalGeoAllocation > currentStock ? '#7f1d1d' : '#1b4332', border: `1px solid ${totalGeoAllocation > currentStock ? '#dc2626' : '#2d6a4f'}`, borderRadius: '6px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'white' }}>
            Total: <strong>{totalGeoAllocation}</strong> / {currentStock}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ paddingTop: '16px', borderTop: '1px solid #1f2937', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexDirection: 'row-reverse' }}>
        <Button 
          onClick={handleSave} 
          disabled={isSaving || totalChannelAllocation > currentStock || totalGeoAllocation > currentStock}
          style={{ 
            backgroundColor: '#2563eb', 
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.5 : 1,
            fontSize: '14px',
            fontWeight: '500',
            width: '100%'
          }}
        >
          {isSaving ? (
            <>
              <Loader2 style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline-block' }} />
              Saving...
            </>
          ) : (
            <>
              <Save style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline-block' }} />
              Save
            </>
          )}
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
            width: '100%'
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
