
import { useState, useEffect } from 'react';
import { Voucher } from '@/entities/Voucher';
import { VoucherUsage } from '@/entities/VoucherUsage';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, CalendarIcon, Tag, Copy, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

export default function VoucherTab() {
  const [vouchers, setVouchers] = useState([]);
  const [voucherUsages, setVoucherUsages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [user, setUser] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_purchase: 0,
    max_discount: null,
    usage_limit: null,
    valid_from: new Date(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    applicable_plans: [],
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
      
      const [vouchersData, usagesData] = await Promise.all([
        Voucher.list('-created_date'),
        VoucherUsage.list('-created_date')
      ]);
      
      setVouchers(vouchersData);
      setVoucherUsages(usagesData);
    } catch (error) {
      toast.error('Gagal memuat data voucher');
      console.error(error);
    }
  };

  const generateVoucherCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const voucherData = {
        ...formData,
        code: formData.code.toUpperCase(),
        valid_from: formData.valid_from.toISOString(),
        valid_until: formData.valid_until.toISOString(),
        created_by: user.email
      };

      if (editingVoucher) {
        await Voucher.update(editingVoucher.id, voucherData);
        toast.success('Voucher berhasil diperbarui!');
      } else {
        await Voucher.create(voucherData);
        toast.success('Voucher berhasil dibuat!');
      }
      
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Gagal menyimpan voucher');
      console.error(error);
    }
  };

  const handleEdit = (voucher) => {
    setEditingVoucher(voucher);
    setFormData({
      ...voucher,
      valid_from: new Date(voucher.valid_from),
      valid_until: new Date(voucher.valid_until),
      applicable_plans: voucher.applicable_plans || []
    });
    setShowForm(true);
  };

  const handleDelete = async (voucherId) => {
    if (confirm('Yakin ingin menghapus voucher ini?')) {
      try {
        await Voucher.delete(voucherId);
        toast.success('Voucher berhasil dihapus!');
        loadData();
      } catch (error) {
        toast.error('Gagal menghapus voucher');
        console.error(error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_purchase: 0,
      max_discount: null,
      usage_limit: null,
      valid_from: new Date(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      applicable_plans: [],
      is_active: true
    });
    setEditingVoucher(null);
    setShowForm(false);
  };

  const copyVoucherCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Kode voucher berhasil disalin!');
  };

  const getVoucherStats = () => {
    const total = vouchers.length;
    const active = vouchers.filter(v => v.is_active).length;
    const expired = vouchers.filter(v => new Date(v.valid_until) < new Date()).length;
    // Assuming voucherUsages for total count is fine, as 'usage_count' on individual voucher might not sum up directly
    // Or, if vouchers data now contains an aggregate total usage, use that. For now, keeping as is.
    const totalUsage = voucherUsages.length; 
    
    return { total, active, expired, totalUsage };
  };

  const stats = getVoucherStats();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Voucher</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Tag className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Voucher Aktif</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Tag className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sudah Kedaluwarsa</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <Tag className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Penggunaan</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalUsage}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header & Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Manajemen Voucher</h2>
          <p className="text-gray-600 dark:text-gray-400">Kelola voucher discount untuk user</p>
        </div>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Buat Voucher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVoucher ? 'Edit Voucher' : 'Buat Voucher Baru'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Kode Voucher</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      placeholder="DISCOUNT10"
                      maxLength={20}
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData({...formData, code: generateVoucherCode()})}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label>Nama Voucher</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Diskon Tahun Baru"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Jenis Diskon</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value) => setFormData({...formData, discount_type: value})}
                  >
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
                  <Label>
                    {formData.discount_type === 'percentage' ? 'Persentase Diskon' : 'Jumlah Diskon (Rp)'}
                  </Label>
                  <Input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value) || 0})}
                    min="0"
                    max={formData.discount_type === 'percentage' ? 100 : undefined}
                    required
                  />
                </div>

                {formData.discount_type === 'percentage' && (
                  <div>
                    <Label>Maksimum Diskon (Rp)</Label>
                    <Input
                      type="number"
                      value={formData.max_discount || ''}
                      onChange={(e) => setFormData({...formData, max_discount: parseFloat(e.target.value) || null})}
                      placeholder="Opsional"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Pembelian (Rp)</Label>
                  <Input
                    type="number"
                    value={formData.min_purchase}
                    onChange={(e) => setFormData({...formData, min_purchase: parseFloat(e.target.value) || 0})}
                    min="0"
                  />
                </div>
                
                <div>
                  <Label>Batas Penggunaan</Label>
                  <Input
                    type="number"
                    value={formData.usage_limit || ''}
                    onChange={(e) => setFormData({...formData, usage_limit: parseInt(e.target.value) || null})}
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal Mulai</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.valid_from, 'dd MMM yyyy', { locale: id })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.valid_from}
                        onSelect={(date) => setFormData({...formData, valid_from: date})}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Tanggal Berakhir</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.valid_until, 'dd MMM yyyy', { locale: id })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.valid_until}
                        onSelect={(date) => setFormData({...formData, valid_until: date})}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label>Paket yang Berlaku</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['pro', 'business', 'advanced', 'enterprise'].map(plan => (
                    <label key={plan} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.applicable_plans.includes(plan)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              applicable_plans: [...formData.applicable_plans, plan]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              applicable_plans: formData.applicable_plans.filter(p => p !== plan)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="capitalize">{plan}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label>Voucher Aktif</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingVoucher ? 'Perbarui' : 'Buat'} Voucher
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vouchers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Voucher</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Diskon</TableHead>
                  <TableHead>Berlaku</TableHead>
                  <TableHead>Penggunaan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map(voucher => {
                  const now = new Date();
                  const isExpired = new Date(voucher.valid_until) < now;
                  const isNotYetActive = new Date(voucher.valid_from) > now;
                  
                  // FIX: Use the 'usage_count' field from the voucher entity directly
                  const usage = voucher.usage_count || 0;
                  
                  return (
                    <TableRow key={voucher.id}>
                      <TableCell className="font-mono">
                        <div className="flex items-center gap-2">
                          {voucher.code}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyVoucherCode(voucher.code)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{voucher.name}</TableCell>
                      <TableCell>
                        {voucher.discount_type === 'percentage' 
                          ? `${voucher.discount_value}%` 
                          : `Rp ${voucher.discount_value.toLocaleString()}`}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(voucher.valid_from), 'dd MMM yyyy', { locale: id })}</div>
                          <div className="text-gray-500">s/d {format(new Date(voucher.valid_until), 'dd MMM yyyy', { locale: id })}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {usage}{voucher.usage_limit ? ` / ${voucher.usage_limit}` : ''}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            !voucher.is_active ? 'secondary' :
                            isExpired ? 'destructive' :
                            isNotYetActive ? 'outline' : 'default'
                          }
                        >
                          {!voucher.is_active ? 'Nonaktif' :
                           isExpired ? 'Kedaluwarsa' :
                           isNotYetActive ? 'Belum Aktif' : 'Aktif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(voucher)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(voucher.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
