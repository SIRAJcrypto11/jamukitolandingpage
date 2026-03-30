import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BOMForm({ bom, products, rawMaterials, onSave, onClose }) {
  const [formData, setFormData] = useState({
    product_id: '',
    product_name: '',
    bom_code: '',
    version: '1.0',
    quantity_produced: 1,
    materials: [],
    labor_cost: 0,
    overhead_cost: 0,
    production_time_minutes: 0,
    instructions: '',
    is_active: true,
    status: 'draft',
    ...bom
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleAddMaterial = () => {
    setFormData({
      ...formData,
      materials: [
        ...formData.materials,
        {
          material_id: '',
          material_code: '',
          material_name: '',
          quantity_needed: 0,
          unit: '',
          unit_cost: 0,
          total_cost: 0,
          wastage_percentage: 0
        }
      ]
    });
  };

  const handleRemoveMaterial = (index) => {
    const newMaterials = formData.materials.filter((_, i) => i !== index);
    setFormData({ ...formData, materials: newMaterials });
  };

  const handleMaterialChange = (index, field, value) => {
    const newMaterials = [...formData.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    
    // Auto-calculate total cost
    if (field === 'quantity_needed' || field === 'unit_cost') {
      const qty = parseFloat(newMaterials[index].quantity_needed) || 0;
      const cost = parseFloat(newMaterials[index].unit_cost) || 0;
      newMaterials[index].total_cost = qty * cost;
    }

    // Auto-fill from selected material
    if (field === 'material_id') {
      const material = rawMaterials.find(m => m.id === value);
      if (material) {
        newMaterials[index].material_code = material.material_code;
        newMaterials[index].material_name = material.material_name;
        newMaterials[index].unit = material.unit_of_measure;
        newMaterials[index].unit_cost = material.unit_cost;
      }
    }

    setFormData({ ...formData, materials: newMaterials });
  };

  const calculateTotals = () => {
    const total_material_cost = formData.materials.reduce((sum, m) => sum + (m.total_cost || 0), 0);
    const total_production_cost = total_material_cost + formData.labor_cost + formData.overhead_cost;
    return { total_material_cost, total_production_cost };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.product_id || !formData.bom_code) {
      toast.error('Produk dan Kode BOM wajib diisi');
      return;
    }

    if (formData.materials.length === 0) {
      toast.error('Minimal harus ada 1 bahan baku');
      return;
    }

    const { total_material_cost, total_production_cost } = calculateTotals();
    const dataToSave = {
      ...formData,
      total_material_cost,
      total_production_cost
    };

    setIsSaving(true);
    try {
      await onSave(dataToSave);
    } finally {
      setIsSaving(false);
    }
  };

  const { total_material_cost, total_production_cost } = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-xl font-bold text-white">
            {bom ? 'Edit Bill of Materials' : 'Buat BOM Baru'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-white">Produk *</Label>
              <select
                value={formData.product_id}
                onChange={(e) => {
                  const product = products.find(p => p.id === e.target.value);
                  setFormData({
                    ...formData,
                    product_id: e.target.value,
                    product_name: product?.name || ''
                  });
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md"
                required
              >
                <option value="">Pilih Produk</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-white">Kode BOM *</Label>
              <Input
                value={formData.bom_code}
                onChange={(e) => setFormData({...formData, bom_code: e.target.value})}
                placeholder="BOM-001"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-white">Versi</Label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({...formData, version: e.target.value})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Quantity Produced</Label>
              <Input
                type="number"
                value={formData.quantity_produced}
                onChange={(e) => setFormData({...formData, quantity_produced: parseFloat(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Labor Cost (per unit)</Label>
              <Input
                type="number"
                value={formData.labor_cost}
                onChange={(e) => setFormData({...formData, labor_cost: parseFloat(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Overhead Cost (per unit)</Label>
              <Input
                type="number"
                value={formData.overhead_cost}
                onChange={(e) => setFormData({...formData, overhead_cost: parseFloat(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Materials List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-white text-lg">Bahan Baku</Label>
              <Button type="button" onClick={handleAddMaterial} size="sm" className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Bahan
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {formData.materials.map((material, index) => (
                <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="grid grid-cols-6 gap-3">
                    <div className="col-span-2">
                      <Label className="text-gray-400 text-xs">Bahan Baku</Label>
                      <select
                        value={material.material_id}
                        onChange={(e) => handleMaterialChange(index, 'material_id', e.target.value)}
                        className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-white rounded text-sm"
                      >
                        <option value="">Pilih Bahan</option>
                        {rawMaterials.map(m => (
                          <option key={m.id} value={m.id}>{m.material_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-gray-400 text-xs">Qty</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={material.quantity_needed}
                        onChange={(e) => handleMaterialChange(index, 'quantity_needed', parseFloat(e.target.value))}
                        className="bg-gray-900 border-gray-700 text-white text-sm h-8"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-400 text-xs">Unit</Label>
                      <Input
                        value={material.unit}
                        onChange={(e) => handleMaterialChange(index, 'unit', e.target.value)}
                        className="bg-gray-900 border-gray-700 text-white text-sm h-8"
                        readOnly
                      />
                    </div>

                    <div>
                      <Label className="text-gray-400 text-xs">Unit Cost</Label>
                      <Input
                        type="number"
                        value={material.unit_cost}
                        onChange={(e) => handleMaterialChange(index, 'unit_cost', parseFloat(e.target.value))}
                        className="bg-gray-900 border-gray-700 text-white text-sm h-8"
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-gray-400 text-xs">Total</Label>
                        <Input
                          type="number"
                          value={material.total_cost}
                          readOnly
                          className="bg-gray-900 border-gray-700 text-white text-sm h-8"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMaterial(index)}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Summary */}
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Material Cost</p>
                <p className="text-white font-semibold">Rp {total_material_cost.toLocaleString('id-ID')}</p>
              </div>
              <div>
                <p className="text-gray-400">Labor Cost</p>
                <p className="text-white font-semibold">Rp {formData.labor_cost.toLocaleString('id-ID')}</p>
              </div>
              <div>
                <p className="text-gray-400">Overhead Cost</p>
                <p className="text-white font-semibold">Rp {formData.overhead_cost.toLocaleString('id-ID')}</p>
              </div>
              <div>
                <p className="text-gray-400">Total Production Cost</p>
                <p className="text-green-400 font-bold text-lg">Rp {total_production_cost.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <Label className="text-white">Instruksi Produksi</Label>
            <Textarea
              value={formData.instructions}
              onChange={(e) => setFormData({...formData, instructions: e.target.value})}
              placeholder="Langkah-langkah produksi..."
              className="bg-gray-800 border-gray-700 text-white"
              rows={4}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label className="text-white">Aktif</Label>
              </div>
              <div>
                <Label className="text-white mr-2">Status:</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="px-3 py-1 bg-gray-800 border border-gray-700 text-white rounded"
                >
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="deprecated">Deprecated</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Simpan BOM
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}