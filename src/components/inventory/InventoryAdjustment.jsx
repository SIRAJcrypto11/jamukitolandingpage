import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2, Plus, Minus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Inventory Adjustment Component
 * Untuk stock opname, damaged goods, dll
 */
export default function InventoryAdjustment({ 
  inventory, 
  onClose, 
  onSuccess, 
  company, 
  currentUser 
}) {
  const [adjustmentType, setAdjustmentType] = useState('increase');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('stock_take');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!inventory) return null;

  const handleAdjustment = async () => {
    const qty = parseInt(quantity);
    
    if (!qty || qty <= 0) {
      toast.error('Masukkan jumlah yang valid (harus lebih dari 0)');
      return;
    }

    if (!reason) {
      toast.error('Pilih alasan adjustment');
      return;
    }

    setIsProcessing(true);

    try {
      const currentQty = inventory.quantity || 0;
      let newQuantity;
      let movementType; // Used for StockMovement type (in, out, adjustment)
      let quantityForMovement = qty; // Default quantity for movement record

      if (adjustmentType === 'increase') {
        newQuantity = currentQty + qty;
        movementType = 'in';
      } else if (adjustmentType === 'decrease') {
        newQuantity = Math.max(0, currentQty - qty);
        movementType = 'out';
      } else { // adjustmentType === 'set'
        newQuantity = qty;
        movementType = 'adjustment';
        // For 'set' type, the quantity in StockMovement should reflect the absolute change
        quantityForMovement = Math.abs(newQuantity - currentQty);
      }

      const availableQty = Math.max(0, newQuantity - (inventory.reserved_quantity || 0));
      const stockStatus = newQuantity === 0 ? 'out_of_stock' :
                         newQuantity <= (inventory.min_stock || 0) ? 'low_stock' :
                         newQuantity >= (inventory.max_stock || 1000) ? 'overstock' :
                         'in_stock';

      // Update inventory
      await base44.entities.Inventory.update(inventory.id, {
        quantity: newQuantity,
        available_quantity: availableQty,
        stock_status: stockStatus,
        last_stock_in: adjustmentType === 'increase' ? new Date().toISOString() : inventory.last_stock_in,
        last_stock_out: adjustmentType === 'decrease' ? new Date().toISOString() : inventory.last_stock_out,
        total_value: (inventory.unit_cost || 0) * newQuantity // Total value of the stock
      });

      // Create stock movement record
      await base44.entities.StockMovement.create({
        company_id: company.id,
        inventory_id: inventory.id,
        product_id: inventory.product_id,
        product_name: inventory.product_name,
        location_id: inventory.location_id,
        location_name: inventory.location_name,
        movement_type: movementType,
        quantity: quantityForMovement, // Quantity of the change
        stock_before: currentQty,
        stock_after: newQuantity,
        reference_type: 'adjustment',
        reason: reason || `Manual ${movementType} adjustment`,
        unit_cost: inventory.unit_cost || 0,
        total_value: (inventory.unit_cost || 0) * quantityForMovement, // Value of the change
        performed_by: currentUser.email,
        performed_by_name: currentUser.full_name || currentUser.email,
        notes: notes
      });

      // Create alert if low stock or out of stock (preserving original functionality)
      if (stockStatus === 'low_stock' || stockStatus === 'out_of_stock') {
        await base44.entities.StockAlert.create({
          company_id: company.id,
          inventory_id: inventory.id,
          product_id: inventory.product_id,
          product_name: inventory.product_name,
          location_id: inventory.location_id,
          location_name: inventory.location_name,
          alert_type: stockStatus === 'out_of_stock' ? 'out_of_stock' : 'low_stock',
          current_quantity: newQuantity,
          threshold_quantity: inventory.min_stock || 0,
          severity: stockStatus === 'out_of_stock' ? 'critical' : 'high',
          status: 'active'
        });
      }

      toast.success('✅ Adjustment berhasil disimpan!');
      
      // ✅ TRIPLE BROADCAST - Inventory, POS, Products
      try {
        const channel1 = new BroadcastChannel('snishop_inventory_updates');
        const channel2 = new BroadcastChannel('snishop_pos_updates');
        const channel3 = new BroadcastChannel('snishop_product_updates');
        
        const message = {
          type: 'STOCK_ADJUSTED',
          companyId: company.id,
          productId: inventory.product_id,
          locationId: inventory.location_id,
          oldQuantity: currentQty,
          newQuantity: newQuantity,
          timestamp: Date.now()
        };
        
        channel1.postMessage(message);
        channel2.postMessage(message);
        channel3.postMessage(message);
        
        channel1.close();
        channel2.close();
        channel3.close();
        
        console.log('✅ ADJUSTMENT BROADCAST to ALL channels');
      } catch (e) {
        console.warn('Broadcast failed:', e);
      }
      
      // ✅ Invalidate global cache
      try {
        const { default: globalCache } = await import('@/components/utils/globalDataCache');
        globalCache.invalidate(`inventory_${company.id}`);
        globalCache.invalidate(`products_${company.id}`);
        globalCache.invalidate(`pos_products_${company.id}`);
      } catch (e) {}

      if (onSuccess) {
        onSuccess();
      }
      
      onClose();

    } catch (error) {
      console.error('Error saving adjustment:', error);
      toast.error('Gagal menyimpan adjustment');
    } finally {
      setIsProcessing(false);
    }
  };

  const getReasonLabel = (reasonKey) => {
    const reasons = {
      stock_take: 'Stock Opname',
      damaged: 'Barang Rusak',
      expired: 'Kadaluarsa',
      lost: 'Hilang/Dicuri',
      found: 'Ditemukan',
      correction: 'Koreksi Data',
      return: 'Return dari Customer',
      initial: 'Stok Awal',
      other: 'Lainnya'
    };
    return reasons[reasonKey] || reasonKey;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-400" />
            Penyesuaian Stok
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{inventory.product_name}</p>
                <p className="text-xs text-gray-400 truncate">SKU: {inventory.product_sku}</p>
              </div>
              <Badge className="bg-blue-600 text-white ml-2 flex-shrink-0">
                {inventory.location_name}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div>
                <p className="text-xs text-gray-400">Stok Saat Ini</p>
                <p className="text-2xl font-bold text-white">{inventory.quantity || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Tersedia</p>
                <p className="text-lg font-semibold text-green-400">{inventory.available_quantity || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Reserved</p>
                <p className="text-lg font-semibold text-yellow-400">{inventory.reserved_quantity || 0}</p>
              </div>
            </div>
          </div>

          {/* Adjustment Type */}
          <div>
            <Label className="text-sm mb-2 block">Tipe Penyesuaian</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={adjustmentType === 'increase' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('increase')}
                className={adjustmentType === 'increase' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah
              </Button>
              <Button
                variant={adjustmentType === 'decrease' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('decrease')}
                className={adjustmentType === 'decrease' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                <Minus className="w-4 h-4 mr-2" />
                Kurang
              </Button>
              <Button
                variant={adjustmentType === 'set' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('set')}
                className={adjustmentType === 'set' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Set
              </Button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <Label htmlFor="quantity" className="text-sm">
              {adjustmentType === 'set' ? 'Jumlah Baru' : 'Jumlah Perubahan'}
            </Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="bg-gray-800 border-gray-700 text-white mt-1"
            />
            {adjustmentType !== 'set' && quantity && (
              <p className="text-xs text-gray-400 mt-1">
                Stok akan menjadi: {adjustmentType === 'increase' 
                  ? (inventory.quantity || 0) + parseInt(quantity) 
                  : Math.max(0, (inventory.quantity || 0) - parseInt(quantity))}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason" className="text-sm">Alasan</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason" className="bg-gray-800 border-gray-700 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="stock_take">Stock Opname</SelectItem>
                <SelectItem value="damaged">Barang Rusak</SelectItem>
                <SelectItem value="expired">Kadaluarsa</SelectItem>
                <SelectItem value="lost">Hilang/Dicuri</SelectItem>
                <SelectItem value="found">Ditemukan</SelectItem>
                <SelectItem value="correction">Koreksi Data</SelectItem>
                <SelectItem value="return">Return dari Customer</SelectItem>
                <SelectItem value="initial">Stok Awal</SelectItem>
                <SelectItem value="other">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm">Catatan (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan..."
              className="bg-gray-800 border-gray-700 text-white mt-1"
              rows={3}
            />
          </div>

          {/* Warning for decrease */}
          {adjustmentType === 'decrease' && quantity && parseInt(quantity) > (inventory.quantity || 0) && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-300">
                <p className="font-semibold">Peringatan!</p>
                <p className="text-xs mt-1">Jumlah pengurangan lebih besar dari stok saat ini. Stok akan menjadi 0.</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button
              onClick={handleAdjustment}
              className={`flex-1 ${
                adjustmentType === 'increase' ? 'bg-green-600 hover:bg-green-700' :
                adjustmentType === 'decrease' ? 'bg-red-600 hover:bg-red-700' :
                'bg-purple-600 hover:bg-purple-700'
              }`}
              disabled={isProcessing || !quantity}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Konfirmasi
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}