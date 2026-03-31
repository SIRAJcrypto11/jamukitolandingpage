import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, MapPin, Building2, User, Crown } from 'lucide-react';

export default function LocationForm({ location, companyId, onSave, onClose }) {
  const [formData, setFormData] = useState({
    location_name: '',
    location_code: '',
    location_type: 'warehouse',
    address: '',
    city: '',
    manager_name: '',
    manager_contact: '',
    capacity: '',
    is_active: true,
    is_primary: false,
    sort_order: 0,
    coordinates: {
      latitude: null,
      longitude: null
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (location) {
      setFormData({
        location_name: location.location_name || '',
        location_code: location.location_code || '',
        location_type: location.location_type || 'warehouse',
        address: location.address || '',
        city: location.city || '',
        manager_name: location.manager_name || '',
        manager_contact: location.manager_contact || '',
        capacity: location.capacity || '',
        is_active: location.is_active !== false,
        is_primary: location.is_primary === true,
        sort_order: location.sort_order || 0,
        coordinates: location.coordinates || { latitude: null, longitude: null }
      });
    }
  }, [location]);

  const generateLocationCode = () => {
    const type = formData.location_type === 'warehouse' ? 'WH' :
      formData.location_type === 'store' ? 'ST' :
        formData.location_type === 'transit' ? 'TR' : 'VT';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${type}-${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.location_name) {
      toast.error('Nama lokasi harus diisi');
      return;
    }

    if (!formData.location_code) {
      const autoCode = generateLocationCode();
      setFormData(prev => ({ ...prev, location_code: autoCode }));
      toast.info('Kode lokasi dibuat otomatis');
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToSave = {
        ...formData,
        company_id: companyId,
        capacity: formData.capacity ? parseFloat(formData.capacity) : null,
        sort_order: formData.sort_order ? parseInt(formData.sort_order) : 0
      };

      if (location) {
        // ✅ UPDATE existing location
        await base44.entities.WarehouseLocation.update(location.id, dataToSave);
        toast.success('✅ Lokasi berhasil diperbarui');
      } else {
        // ✅ CREATE new location
        await base44.entities.WarehouseLocation.create(dataToSave);
        toast.success('✅ Lokasi berhasil ditambahkan');
      }

      if (onSave) onSave();

    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('❌ Gagal menyimpan lokasi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-purple-400" />
          Informasi Dasar
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="location_name" className="text-white">
              Nama Lokasi <span className="text-red-400">*</span>
            </Label>
            <Input
              id="location_name"
              value={formData.location_name}
              onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              placeholder="Contoh: Gudang Utama Jakarta"
              required
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <Label className="text-white">Kode Lokasi</Label>
            <div className="flex gap-2">
              <Input
                value={formData.location_code}
                onChange={(e) => setFormData({ ...formData, location_code: e.target.value })}
                placeholder="Contoh: WH-001"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setFormData(prev => ({ ...prev, location_code: generateLocationCode() }))}
                className="border-gray-700 text-gray-400 hover:text-white"
              >
                Auto
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-white">Urutan Tampilan (1, 2, 3...)</Label>
            <Input
              type="number"
              min="0"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              placeholder="0"
              className="bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-[10px] text-gray-500 mt-1">Gunakan angka untuk mengurutkan lokasi di POS (1 paling atas).</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-gray-800/30 p-3 rounded-md border border-gray-700/50">
          <input
            type="checkbox"
            id="is_primary"
            checked={formData.is_primary}
            onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
            className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
          />
          <Label htmlFor="is_primary" className="text-white cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Set sebagai Lokasi Utama</span>
            </div>
            <p className="text-[10px] text-gray-400 font-normal">Lokasi utama akan dipilih otomatis saat membuka Kasir/POS.</p>
          </Label>
        </div>

        <div>
          <Label htmlFor="location_type" className="text-white">Tipe Lokasi</Label>
          <Select
            value={formData.location_type}
            onValueChange={(value) => setFormData({ ...formData, location_type: value })}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="warehouse">🏭 Warehouse (Gudang)</SelectItem>
              <SelectItem value="store">🏪 Store (Toko)</SelectItem>
              <SelectItem value="transit">🚚 Transit</SelectItem>
              <SelectItem value="virtual">💻 Virtual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          Alamat & Lokasi
        </h3>

        <div>
          <Label htmlFor="address" className="text-white">Alamat Lengkap</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Jl. Contoh No. 123, Kelurahan..."
            rows={3}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city" className="text-white">Kota</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Jakarta"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="capacity" className="text-white">Kapasitas (unit/m²)</Label>
            <Input
              id="capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="1000"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="latitude" className="text-white">Latitude (GPS)</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={formData.coordinates.latitude || ''}
              onChange={(e) => setFormData({
                ...formData,
                coordinates: {
                  ...formData.coordinates,
                  latitude: e.target.value ? parseFloat(e.target.value) : null
                }
              })}
              placeholder="-6.2088"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="longitude" className="text-white">Longitude (GPS)</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={formData.coordinates.longitude || ''}
              onChange={(e) => setFormData({
                ...formData,
                coordinates: {
                  ...formData.coordinates,
                  longitude: e.target.value ? parseFloat(e.target.value) : null
                }
              })}
              placeholder="106.8456"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>
      </div>

      {/* Manager Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-green-400" />
          Penanggung Jawab
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="manager_name" className="text-white">Nama Manager</Label>
            <Input
              id="manager_name"
              value={formData.manager_name}
              onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
              placeholder="John Doe"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="manager_contact" className="text-white">Kontak Manager</Label>
            <Input
              id="manager_contact"
              value={formData.manager_contact}
              onChange={(e) => setFormData({ ...formData, manager_contact: e.target.value })}
              placeholder="08123456789"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Status Lokasi</p>
            <p className="text-xs text-gray-400">Lokasi nonaktif tidak akan muncul di pilihan</p>
          </div>
          <Button
            type="button"
            variant={formData.is_active ? "default" : "outline"}
            size="sm"
            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
            className={formData.is_active ? 'bg-green-600 hover:bg-green-700' : 'border-gray-700'}
          >
            {formData.is_active ? '✅ Aktif' : '❌ Nonaktif'}
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
          className="border-gray-700 text-white"
        >
          Batal
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>💾 Simpan Lokasi</>
          )}
        </Button>
      </div>
    </form>
  );
}
