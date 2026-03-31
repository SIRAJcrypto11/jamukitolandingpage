import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RawMaterialForm({ material, suppliers, onSave, onClose }) {
  const [formData, setFormData] = useState({
    material_code: '',
    material_name: '',
    category: 'raw_material',
    unit_of_measure: 'pcs',
    current_stock: 0,
    min_stock: 10,
    max_stock: 1000,
    reorder_point: 20,
    unit_cost: 0,
    supplier_id: '',
    supplier_name: '',
    lead_time_days: 7,
    storage_location: '',
    notes: '',
    is_active: true,
    ...material
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.material_name || !formData.material_code) {
      toast.error('Nama dan kode bahan baku wajib diisi');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">
            {material ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Kode Bahan Baku *</Label>
              <Input
                value={formData.material_code}
                onChange={(e) => setFormData({...formData, material_code: e.target.value})}
                placeholder="SKU-001"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-white">Nama Bahan Baku *</Label>
              <Input
                value={formData.material_name}
                onChange={(e) => setFormData({...formData, material_name: e.target.value})}
                placeholder="Tepung Terigu"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-white">Kategori</Label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md"
              >
                <option value="raw_material">Bahan Baku</option>
                <option value="packaging">Kemasan</option>
                <option value="ingredient">Bahan Tambahan</option>
                <option value="component">Komponen</option>
                <option value="other">Lainnya</option>
              </select>
            </div>

            <div>
              <Label className="text-white">Satuan</Label>
              <Input
                value={formData.unit_of_measure}
                onChange={(e) => setFormData({...formData, unit_of_measure: e.target.value})}
                placeholder="kg, liter, pcs"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Stok Saat Ini</Label>
              <Input
                type="number"
                value={formData.current_stock}
                onChange={(e) => setFormData({...formData, current_stock: parseFloat(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Stok Minimum</Label>
              <Input
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({...formData, min_stock: parseFloat(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Stok Maximum</Label>
              <Input
                type="number"
                value={formData.max_stock}
                onChange={(e) => setFormData({...formData, max_stock: parseFloat(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Reorder Point</Label>
              <Input
                type="number"
                value={formData.reorder_point}
                onChange={(e) => setFormData({...formData, reorder_point: parseFloat(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Harga Per Unit</Label>
              <Input
                type="number"
                value={formData.unit_cost}
                onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value)})}
                placeholder="0"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Lead Time (hari)</Label>
              <Input
                type="number"
                value={formData.lead_time_days}
                onChange={(e) => setFormData({...formData, lead_time_days: parseInt(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Supplier</Label>
              <Input
                value={formData.supplier_name}
                onChange={(e) => setFormData({...formData, supplier_name: e.target.value})}
                placeholder="Nama Supplier"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Lokasi Penyimpanan</Label>
              <Input
                value={formData.storage_location}
                onChange={(e) => setFormData({...formData, storage_location: e.target.value})}
                placeholder="Gudang A"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-white">Catatan</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Catatan tambahan..."
              className="bg-gray-800 border-gray-700 text-white"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="w-4 h-4"
            />
            <Label className="text-white">Aktif</Label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}