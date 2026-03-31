import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';
import { formatRupiah } from '@/components/utils/currencyFormatter';

export default function FinanceForm({ user, record, categories, accounts, mode, companyId, onSuccess, onClose }) {
  const SALES_CHANNELS = [
    { id: 'OFFLINE', name: 'Offline Store', icon: '🏪' },
    { id: 'SHOPEE', name: 'Shopee', icon: '🛒' },
    { id: 'TOKOPEDIA', name: 'Tokopedia', icon: '🟢' },
    { id: 'TIKTOK', name: 'TikTok Shop', icon: '🎵' },
    { id: 'GRAB', name: 'GrabFood/GrabMart', icon: '🚗' },
    { id: 'GOJEK', name: 'GoFood/GoShop', icon: '🛵' },
    { id: 'WHATSAPP', name: 'WhatsApp Order', icon: '📱' },
    { id: 'WEBSITE', name: 'Website', icon: '🌐' },
    { id: 'ONLINE_DALAM_KOTA', name: 'Online Dalam Kota', icon: '🏙️' },
    { id: 'ONLINE_LUAR_KOTA', name: 'Online Luar Kota', icon: '🏘️' },
    { id: 'ONLINE_LUAR_PROVINSI', name: 'Online Luar Provinsi', icon: '🗾' },
    { id: 'OTHER', name: 'Lainnya', icon: '🔹' }
  ];

  const [formData, setFormData] = useState({
    type: record?.type || 'expense',
    amount: record?.amount || '',
    category: record?.category || '',
    description: record?.description || '',
    date: record?.date ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    attachment_url: record?.attachment_url || '',
    account_id: record?.account_id || '',
    contact_name: record?.contact_name || '',
    sales_channel: record?.sales_channel || '' // ✅ NEW: Sales Channel
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const filteredCategories = useMemo(() => {
    // Map specialized types to broad categories if needed, or just show all relevant
    const broadType = (formData.type === 'debt') ? 'income'
      : (formData.type === 'receivable' || formData.type === 'investment') ? 'expense'
        : formData.type;

    return (categories || []).filter(
      cat => cat.type === broadType
    );
  }, [categories, formData.type]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      toast.info('📤 Mengunggah file...');

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setFormData(prev => ({ ...prev, attachment_url: file_url }));
      toast.success('✅ File berhasil diunggah');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('❌ Gagal mengunggah file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || formData.amount <= 0) {
      toast.error('Jumlah harus lebih dari 0');
      return;
    }

    if (!formData.category) {
      toast.error('Kategori harus dipilih');
      return;
    }

    // ✅ VALIDATION: Contact Name required for Debt/Receivable
    if ((formData.type === 'debt' || formData.type === 'receivable') && !formData.contact_name) {
      toast.error(formData.type === 'debt' ? 'Isi nama pemberi pinjaman' : 'Isi nama peminjam');
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToSave = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        date: new Date(formData.date).toISOString(),
        attachment_url: formData.attachment_url,
        account_id: formData.account_id || null,
        contact_name: formData.contact_name || null,
        sales_channel: formData.sales_channel || null, // ✅ Save Sales Channel
        status: (formData.type === 'debt' || formData.type === 'receivable') ? 'unpaid' : 'paid',
        source: 'manual',
        mode: mode,
        user_id: user.id,
        company_id: companyId || null
      };

      console.log('💾 FinanceForm: Saving record with data:', dataToSave);

      if (onSuccess) {
        await onSuccess(dataToSave);
      }

    } catch (error) {
      console.error('❌ Error saving finance record:', error);
      toast.error('❌ Gagal menyimpan catatan keuangan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-4">
        {record ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
      </h2>

      {companyId && (
        <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-400">
            🔵 Mode BUSINESS - Data akan tersimpan untuk seluruh perusahaan
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type" className="text-white">Tipe *</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => {
              const broadType = (value === 'debt') ? 'income' : (value === 'receivable' || value === 'investment') ? 'expense' : value;
              const availableCats = (categories || []).filter(c => c.type === broadType);
              const nextCategory = availableCats.length > 0 ? availableCats[0].name : 'Lainnya';

              console.log('🔄 Tipe changed to:', value, 'Auto-selecting category:', nextCategory);

              setFormData({
                ...formData,
                type: value,
                category: nextCategory
              });
            }}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="income">💰 Pemasukan</SelectItem>
              <SelectItem value="expense">💸 Pengeluaran</SelectItem>
              <SelectItem value="debt">↙️ Hutang (Dana Masuk)</SelectItem>
              <SelectItem value="receivable">↗️ Piutang (Dana Keluar)</SelectItem>
              <SelectItem value="investment">📈 Investasi (Dana Keluar)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="amount" className="text-white">Jumlah (Rp) *</Label>
          <Input
            id="amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0"
            required
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
      </div>

      {/* ✅ NEW: Contact Field for Debt/Receivable */}
      {(formData.type === 'debt' || formData.type === 'receivable') && (
        <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-700/50 animate-in fade-in slide-in-from-top-2">
          <Label htmlFor="contact_name" className="text-white">
            {formData.type === 'debt' ? 'Hutang ke Siapa? (Pemberi Pinjaman)' : 'Dipinjam Oleh Siapa? (Peminjam)'} *
          </Label>
          <Input
            id="contact_name"
            value={formData.contact_name}
            onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
            placeholder={formData.type === 'debt' ? 'Nama Bank / Orang' : 'Nama Karyawan / Orang'}
            required
            className="mt-1 bg-gray-800 border-yellow-700 text-white focus:border-yellow-500"
          />
        </div>
      )}

      <div>
        <Label htmlFor="category" className="text-white">Kategori *</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Pilih kategori" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700 text-white">
            {filteredCategories.length > 0 && filteredCategories.map((cat) => (
              <SelectItem key={cat.id || Math.random()} value={cat.name} className="text-white">
                {cat.icon || '📌'} {cat.name}
              </SelectItem>
            ))}
            <SelectItem value="Lainnya" className="text-gray-400">
              Lainnya (Tambah kategori di tab Kategori)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="date" className="text-white">Tanggal *</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <div>
        <Label htmlFor="description" className="text-white">Deskripsi</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Catatan tambahan..."
          rows={3}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <div>
        <Label className="text-white">Bukti Transaksi (Opsional)</Label>
        <div className="mt-2">
          {formData.attachment_url ? (
            <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
              <img
                src={formData.attachment_url}
                alt="Bukti"
                className="w-16 h-16 object-cover rounded"
              />
              <span className="flex-1 text-sm text-gray-300 truncate">File uploaded</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFormData({ ...formData, attachment_url: '' })}
                className="text-red-400"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="file-upload"
              />
              <Label htmlFor="file-upload" className="cursor-pointer">
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 mb-2 animate-spin text-blue-400" />
                    <span className="text-sm text-gray-400">Mengunggah...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <span className="text-sm text-gray-400">Klik untuk upload bukti</span>
                  </div>
                )}
              </Label>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="account_id" className="text-white">Rekening/Kantong *</Label>
        <Select
          value={formData.account_id}
          onValueChange={(value) => setFormData({ ...formData, account_id: value })}
        >
          <SelectTrigger id="account_id" className="bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Pilih rekening" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700">
            {accounts && accounts.length > 0 ? (
              accounts.filter(a => a.is_active).map(account => (
                <SelectItem key={account.id} value={account.id} className="text-white">
                  {account.icon} {account.name} - {formatRupiah(account.calculated_balance || 0)}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled className="text-gray-400">
                Belum ada rekening - Buat di tab Rekening
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        <p className="text-xs text-gray-400 mt-1">
          💡 Pilih rekening yang digunakan untuk transaksi ini
        </p>
      </div>

      {/* ✅ Sales Channel - Only for income type */}
      {(formData.type === 'income') && (
        <div>
          <Label htmlFor="sales_channel" className="text-white">Channel Penjualan</Label>
          <Select
            value={formData.sales_channel || ''}
            onValueChange={(value) => setFormData({ ...formData, sales_channel: value })}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Pilih channel (opsional)" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value={null}>-- Tidak ada channel --</SelectItem>
              {SALES_CHANNELS.map(ch => (
                <SelectItem key={ch.id} value={ch.id} className="text-white">
                  {ch.icon} {ch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400 mt-1">💡 Opsional: pilih channel jika ini transaksi penjualan online</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
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
          disabled={isSubmitting || isUploading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Menyimpan...
            </>
          ) : (
            '💾 Simpan'
          )}
        </Button>
      </div>
    </form>
  );
}