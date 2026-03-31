import { useState, useEffect } from 'react';
import { ProductVoucher } from '@/entities/ProductVoucher';
import { DigitalProduct } from '@/entities/DigitalProduct';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function ProductVoucherTab() {
  const [vouchers, setVouchers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_purchase: 0,
    max_discount: 0,
    usage_limit: null,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    applicable_products: [],
    applicable_categories: [],
    is_active: true
  });

  const categoryLabels = {
    zoom: "Zoom Meeting",
    design: "Design Tools",
    plagiarism_check: "Plagiarism Check",
    streaming: "Streaming",
    video_editing: "Video Editing",
    other: "Lainnya"
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vouchersData, productsData] = await Promise.all([
        ProductVoucher.list('-created_date'),
        DigitalProduct.list()
      ]);
      setVouchers(vouchersData);
      setProducts(productsData);
    } catch (error) {
      toast.error("Gagal memuat data voucher");
    }
  };

  const handleCreate = () => {
    setEditingVoucher(null);
    setFormData({
      code: '',
      name: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_purchase: 0,
      max_discount: 0,
      usage_limit: null,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      applicable_products: [],
      applicable_categories: [],
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (voucher) => {
    setEditingVoucher(voucher);
    setFormData({
      ...voucher,
      valid_from: voucher.valid_from?.split('T')[0] || '',
      valid_until: voucher.valid_until?.split('T')[0] || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Hapus voucher ini?')) {
      try {
        await ProductVoucher.delete(id);
        toast.success("Voucher berhasil dihapus");
        loadData();
      } catch (error) {
        toast.error("Gagal menghapus voucher");
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.name) {
      toast.error("Kode dan nama voucher wajib diisi");
      return;
    }

    setIsProcessing(true);
    try {
      const dataToSave = {
        ...formData,
        code: formData.code.toUpperCase(),
        usage_limit: formData.usage_limit || null
      };

      if (editingVoucher) {
        await ProductVoucher.update(editingVoucher.id, dataToSave);
        toast.success("Voucher berhasil diperbarui");
      } else {
        await ProductVoucher.create(dataToSave);
        toast.success("Voucher berhasil ditambahkan");
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error("Gagal menyimpan voucher");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Voucher Produk</h2>
          <p className="text-gray-600 dark:text-gray-400">Kelola voucher discount untuk produk</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Voucher
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Min. Pembelian</TableHead>
                <TableHead>Masa Berlaku</TableHead>
                <TableHead>Penggunaan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map((voucher) => (
                <TableRow key={voucher.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {voucher.code}
                    </Badge>
                  </TableCell>
                  <TableCell>{voucher.name}</TableCell>
                  <TableCell>
                    {voucher.discount_type === 'percentage' 
                      ? `${voucher.discount_value}%`
                      : `Rp ${voucher.discount_value.toLocaleString('id-ID')}`
                    }
                  </TableCell>
                  <TableCell>Rp {(voucher.min_purchase || 0).toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(voucher.valid_from), 'dd MMM', { locale: id })} - 
                    {format(new Date(voucher.valid_until), 'dd MMM yyyy', { locale: id })}
                  </TableCell>
                  <TableCell>
                    {voucher.usage_count || 0} / {voucher.usage_limit || '∞'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={voucher.is_active ? 'default' : 'secondary'}>
                      {voucher.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(voucher)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(voucher.id)}>
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {vouchers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Belum ada voucher. Klik "Tambah Voucher" untuk membuat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Voucher Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVoucher ? 'Edit Voucher' : 'Tambah Voucher Baru'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kode Voucher *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="DISC50K"
                  className="font-mono"
                />
              </div>
              <div>
                <Label>Nama Voucher *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Diskon 50rb"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tipe Discount</Label>
                <Select value={formData.discount_type} onValueChange={(v) => setFormData({ ...formData, discount_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Persentase (%)</SelectItem>
                    <SelectItem value="fixed_amount">Jumlah Tetap (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nilai Discount *</Label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                  placeholder={formData.discount_type === 'percentage' ? '10' : '50000'}
                />
              </div>
              {formData.discount_type === 'percentage' && (
                <div>
                  <Label>Max Potongan (Rp)</Label>
                  <Input
                    type="number"
                    value={formData.max_discount || ''}
                    onChange={(e) => setFormData({ ...formData, max_discount: Number(e.target.value) || 0 })}
                    placeholder="100000"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min. Pembelian (Rp)</Label>
                <Input
                  type="number"
                  value={formData.min_purchase}
                  onChange={(e) => setFormData({ ...formData, min_purchase: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Batas Penggunaan</Label>
                <Input
                  type="number"
                  value={formData.usage_limit || ''}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Berlaku Dari *</Label>
                <Input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>
              <div>
                <Label>Berlaku Sampai *</Label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Berlaku untuk Kategori (Kosong = Semua)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={formData.applicable_categories.includes(key)}
                      onChange={(e) => {
                        const cats = e.target.checked 
                          ? [...formData.applicable_categories, key]
                          : formData.applicable_categories.filter(c => c !== key);
                        setFormData({ ...formData, applicable_categories: cats });
                      }}
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
              <Label>Voucher Aktif</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button onClick={() => setIsModalOpen(false)} variant="outline">
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isProcessing}>
              {isProcessing ? 'Menyimpan...' : 'Simpan Voucher'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}