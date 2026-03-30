import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Receipt, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ReceiptTemplate from '@/components/pos/ReceiptTemplate';

const DUMMY_TRANSACTION = {
  transaction_number: 'TRX-SAMPLE-001',
  created_date: new Date().toISOString(),
  cashier_name: 'Budi (Kasir)',
  items: [
    { product_name: 'Kopi Susu Gula Aren', quantity: 2, price: 18000, subtotal: 36000 },
    { product_name: 'Roti Bakar Coklat', quantity: 1, price: 15000, subtotal: 15000 }
  ],
  subtotal: 51000,
  tax_amount: 0,
  discount_amount: 0,
  total: 51000,
  payment_method: 'cash',
  payment_amount: 100000,
  change_amount: 49000
};

export default function ReceiptSettingsForm({ selectedCompany }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    show_company_logo: true,
    show_company_address: true,
    show_customer_name: true,
    show_customer_points: true,
    show_points_earned: true,
    show_payment_details: true,
    show_change: true,
    custom_header_text: '',
    custom_address: '',           // ✅ NEW: Dedicated address field
    custom_footer_text: 'Terima kasih sudah berbelanja!',
    show_promo_message: false,
    promo_message: '',
    auto_print_enabled: true,
    sales_channels_config: {},
    // ✅ Advanced Customization
    logo_size: 'medium',
    font_size: 'medium',
    font_family: 'monospace',
    receipt_width: '80mm',
    show_cashier_name: true,
    custom_bank_info: '',
    custom_social_media: ''
  });

  useEffect(() => {
    if (selectedCompany) {
      loadSettings();
    }
  }, [selectedCompany]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const result = await base44.entities.CompanyReceiptSettings.filter({
        company_id: selectedCompany.id
      });

      if (result && result.length > 0) {
        setSettings(result[0]);
        setFormData({
          show_company_logo: result[0].show_company_logo !== false,
          show_company_address: result[0].show_company_address !== false,
          show_customer_name: result[0].show_customer_name !== false,
          show_customer_points: result[0].show_customer_points !== false,
          show_points_earned: result[0].show_points_earned !== false,
          show_payment_details: result[0].show_payment_details !== false,
          show_change: result[0].show_change !== false,
          custom_header_text: result[0].custom_header_text || '',
          custom_address: result[0].custom_address || '',  // ✅ NEW
          custom_footer_text: result[0].custom_footer_text || 'Terima kasih sudah berbelanja!',
          show_promo_message: result[0].show_promo_message || false,
          promo_message: result[0].promo_message || '',
          auto_print_enabled: result[0].auto_print_enabled !== false,
          sales_channels_config: result[0].sales_channels_config || {},
          // ✅ Advanced Customization
          logo_size: result[0].logo_size || 'medium',
          font_size: result[0].font_size || 'medium',
          font_family: result[0].font_family || 'monospace',
          receipt_width: result[0].receipt_width || '80mm',
          show_cashier_name: result[0].show_cashier_name !== false,
          custom_bank_info: result[0].custom_bank_info || '',
          custom_social_media: result[0].custom_social_media || ''
        });
      }
    } catch (error) {
      console.error('Load settings error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    // Handle both form submit (with event) and button click (may have event from onClick)
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    console.log('🔵 handleSave CALLED');
    console.log('🔵 formData to save:', formData);
    console.log('🔵 settings.id:', settings?.id);
    console.log('🔵 selectedCompany.id:', selectedCompany?.id);

    setIsSaving(true);

    // ✅ IMMEDIATE TOAST - This MUST appear when button is clicked
    toast.loading('Menyimpan pengaturan struk...', { id: 'save-receipt', duration: 10000 });

    try {
      let savedSettings;

      if (settings && settings.id) {
        console.log('🔵 UPDATING existing settings with ID:', settings.id);
        savedSettings = await base44.entities.CompanyReceiptSettings.update(settings.id, formData);
        console.log('✅ UPDATE SUCCESS:', savedSettings);
      } else {
        console.log('🔵 CREATING new settings for company:', selectedCompany.id);
        savedSettings = await base44.entities.CompanyReceiptSettings.create({
          company_id: selectedCompany.id,
          ...formData
        });
        console.log('✅ CREATE SUCCESS:', savedSettings);
      }

      // ✅ Update local state FIRST
      setSettings(savedSettings);
      console.log('✅ Local state updated');

      // ✅ SUCCESS NOTIFICATION IMMEDIATELY
      toast.success('✅ Pengaturan struk berhasil disimpan!', { id: 'save-receipt', duration: 3000 });

      // ✅ REAL-TIME SYNC: Notify POS Cashier about settings change
      try {
        const settingsChannel = new BroadcastChannel('snishop_receipt_settings_updates');
        settingsChannel.postMessage({
          type: 'receipt_settings_updated',
          companyId: selectedCompany.id,
          timestamp: new Date().toISOString()
        });
        settingsChannel.close();
        console.log('📡 Broadcast: Receipt settings updated');
      } catch (broadcastErr) {
        console.warn('Broadcast failed (non-critical):', broadcastErr);
      }

      // ✅ BROADCAST UPDATE for sales_channels_config
      try {
        const channel = new BroadcastChannel('snishop_channel_config_updates');
        channel.postMessage({
          type: 'CONFIG_UPDATED',
          companyId: selectedCompany.id,
          config: formData.sales_channels_config,
          timestamp: Date.now()
        });
        channel.close();
      } catch (e) { }

      // ✅ Reload settings with delay to avoid race condition
      setTimeout(() => {
        loadSettings();
        console.log('✅ Settings reloaded from DB');
      }, 500);

    } catch (error) {
      console.error('❌ Save error:', error);
      toast.error('Gagal menyimpan: ' + (error.message || JSON.stringify(error)));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-white dark:bg-gray-900 border-none shadow-none md:border md:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Pengaturan Struk WhatsApp & Print
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Informasi yang Ditampilkan</h3>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_company_logo">Tampilkan Logo Perusahaan</Label>
                <Switch
                  id="show_company_logo"
                  checked={formData.show_company_logo}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_company_logo: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_customer_name">Tampilkan Nama Customer</Label>
                <Switch
                  id="show_customer_name"
                  checked={formData.show_customer_name}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_customer_name: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_customer_points">Tampilkan Total Poin Customer Saat Ini</Label>
                <Switch
                  id="show_customer_points"
                  checked={formData.show_customer_points}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_customer_points: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_points_earned">Tampilkan Poin yang Didapat Transaksi Ini</Label>
                <Switch
                  id="show_points_earned"
                  checked={formData.show_points_earned}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_points_earned: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_payment_details">Tampilkan Detail Pembayaran</Label>
                <Switch
                  id="show_payment_details"
                  checked={formData.show_payment_details}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_payment_details: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_change">Tampilkan Kembalian</Label>
                <Switch
                  id="show_change"
                  checked={formData.show_change}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_change: checked })}
                />
              </div>
            </div>

            {/* ✅ ENHANCED: Visual Formatting Options */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                🎨 Pengaturan Tampilan
                <Badge variant="outline" className="text-[10px] font-normal">Visual</Badge>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logo_size">Ukuran Logo</Label>
                  <select
                    id="logo_size"
                    value={formData.logo_size}
                    onChange={(e) => setFormData({ ...formData, logo_size: e.target.value })}
                    className="mt-2 w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                  >
                    <option value="small">Kecil (40px)</option>
                    <option value="medium">Sedang (60px)</option>
                    <option value="large">Besar (80px)</option>
                    <option value="xl">Sangat Besar (100px)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="receipt_width">Lebar Kertas</Label>
                  <select
                    id="receipt_width"
                    value={formData.receipt_width}
                    onChange={(e) => setFormData({ ...formData, receipt_width: e.target.value })}
                    className="mt-2 w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                  >
                    <option value="58mm">58mm (Kecil)</option>
                    <option value="80mm">80mm (Standard)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="font_size">Ukuran Font</Label>
                  <select
                    id="font_size"
                    value={formData.font_size}
                    onChange={(e) => setFormData({ ...formData, font_size: e.target.value })}
                    className="mt-2 w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                  >
                    <option value="small">Kecil (11px)</option>
                    <option value="medium">Sedang (13px)</option>
                    <option value="large">Besar (15px)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="font_family">Jenis Font</Label>
                  <select
                    id="font_family"
                    value={formData.font_family}
                    onChange={(e) => setFormData({ ...formData, font_family: e.target.value })}
                    className="mt-2 w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                  >
                    <option value="monospace">Monospace (POS Classic)</option>
                    <option value="sans-serif">Sans-Serif (Modern)</option>
                    <option value="serif">Serif (Formal)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_cashier_name">Tampilkan Nama Kasir</Label>
                <Switch
                  id="show_cashier_name"
                  checked={formData.show_cashier_name}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_cashier_name: checked })}
                />
              </div>
            </div>

            {/* ✅ ENHANCED: Multi-line Text Sections */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                📝 Teks Custom
                <Badge variant="outline" className="text-[10px] font-normal">Multi-baris</Badge>
              </h3>

              <div>
                <Label htmlFor="custom_header">Header Struk (Judul/Slogan)</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Teks judul di bawah nama toko. Bisa dikosongkan jika tidak diperlukan.
                </p>
                <textarea
                  id="custom_header"
                  value={formData.custom_header_text}
                  onChange={(e) => setFormData({ ...formData, custom_header_text: e.target.value })}
                  placeholder="STRUK PEMBELIAN&#10;atau kosongkan jika tidak perlu"
                  rows={2}
                  className="mt-1 w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="custom_address">Alamat Toko (Multi-baris)</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Alamat lengkap toko. Setiap baris terpisah.
                </p>
                <textarea
                  id="custom_address"
                  value={formData.custom_address}
                  onChange={(e) => setFormData({ ...formData, custom_address: e.target.value })}
                  placeholder="Jl. Contoh No. 123&#10;Kelurahan, Kecamatan&#10;Kota, Provinsi 12345"
                  rows={3}
                  className="mt-1 w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="custom_footer">Footer Struk (Multi-baris)</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Bisa untuk: Ucapan terima kasih, Syarat & Ketentuan, dll.
                </p>
                <textarea
                  id="custom_footer"
                  value={formData.custom_footer_text}
                  onChange={(e) => setFormData({ ...formData, custom_footer_text: e.target.value })}
                  placeholder="Terima kasih sudah berbelanja!&#10;Barang yang sudah dibeli tidak dapat ditukar."
                  rows={3}
                  className="mt-1 w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="custom_bank_info">Info Rekening Bank (Multi-baris)</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Untuk transfer bank. Setiap baris = 1 rekening.
                </p>
                <textarea
                  id="custom_bank_info"
                  value={formData.custom_bank_info}
                  onChange={(e) => setFormData({ ...formData, custom_bank_info: e.target.value })}
                  placeholder="Rekening an. Nama Pemilik&#10;BCA 1234567890&#10;BRI 0987654321&#10;Mandiri 1111222233334444"
                  rows={4}
                  className="mt-1 w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="custom_social_media">Social Media & Kontak (Multi-baris)</Label>
                <p className="text-xs text-gray-500 mb-2">
                  WhatsApp, Instagram, Website, dll.
                </p>
                <textarea
                  id="custom_social_media"
                  value={formData.custom_social_media}
                  onChange={(e) => setFormData({ ...formData, custom_social_media: e.target.value })}
                  placeholder="WA: 08123456789&#10;IG: @toko_saya&#10;www.tokosaya.com"
                  rows={3}
                  className="mt-1 w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_promo">Tampilkan Pesan Promo</Label>
                <Switch
                  id="show_promo"
                  checked={formData.show_promo_message}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_promo_message: checked })}
                />
              </div>

              {formData.show_promo_message && (
                <div>
                  <Label htmlFor="promo_message">Pesan Promo</Label>
                  <textarea
                    id="promo_message"
                    value={formData.promo_message}
                    onChange={(e) => setFormData({ ...formData, promo_message: e.target.value })}
                    placeholder="Dapatkan diskon 20% untuk pembelian selanjutnya!"
                    rows={3}
                    className="mt-2 w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              )}
            </div>

            {/* ✅ Sales Channel Configuration */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                🏷️ Konfigurasi Jalur Penjualan
                <Badge variant="outline" className="text-[10px] font-normal">Custom Names</Badge>
              </h3>
              <p className="text-xs text-gray-500">
                Ubah nama tampilan jalur penjualan sesuai kebutuhan bisnis Anda.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'OFFLINE', label: 'Offline Store' },
                  { id: 'SHOPEE', label: 'Shopee' },
                  { id: 'TOKOPEDIA', label: 'Tokopedia' },
                  { id: 'TIKTOK', label: 'TikTok Shop' },
                  { id: 'GRAB', label: 'Grab' },
                  { id: 'GOJEK', label: 'Gojek' },
                  { id: 'WHATSAPP', label: 'WhatsApp' },
                  { id: 'WEBSITE', label: 'Website' },
                  { id: 'ONLINE_DALAM_KOTA', label: 'Online Dalam Kota' },
                  { id: 'ONLINE_LUAR_KOTA', label: 'Online Luar Kota' },
                  { id: 'ONLINE_LUAR_PROVINSI', label: 'Online Luar Provinsi' },
                  { id: 'OTHER', label: 'Lainnya' }
                ].map((channel) => (
                  <div key={channel.id}>
                    <Label htmlFor={`channel_${channel.id}`} className="text-xs text-gray-600 mb-1 block">
                      {channel.label}
                    </Label>
                    <Input
                      id={`channel_${channel.id}`}
                      value={formData.sales_channels_config?.[channel.id] || ''}
                      onChange={(e) => {
                        const newConfig = { ...(formData.sales_channels_config || {}) };
                        newConfig[channel.id] = e.target.value;
                        setFormData({ ...formData, sales_channels_config: newConfig });
                      }}
                      placeholder={`Custom: ${channel.label}`}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto_print_enabled" className="text-blue-600 font-semibold">
                  🖨️ Auto Print Setelah Transaksi
                </Label>
                <Switch
                  id="auto_print_enabled"
                  checked={formData.auto_print_enabled !== false}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_print_enabled: checked })}
                />
              </div>
              <p className="text-xs text-gray-500">
                Jika aktif, struk akan otomatis dicetak setelah konfirmasi pembayaran tanpa menekan tombol print.
              </p>
            </div>

            <Button
              type="button"
              onClick={(e) => handleSave(e)}
              disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Pengaturan
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ✅ LIVE PREVIEW SECTION */}
      <Card className="bg-gray-50 dark:bg-gray-800 border-none shadow-none md:border md:shadow-md sticky top-6 h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="w-5 h-5 text-gray-500" />
            Live Preview (80mm)
          </CardTitle>
          <p className="text-xs text-gray-500 mt-1">
            ✅ Preview ini sama persis dengan hasil print di POS Cashier
          </p>
        </CardHeader>
        <CardContent className="flex justify-center p-6 bg-gray-200 dark:bg-gray-900 rounded-b-xl overflow-hidden min-h-[500px]">
          <div className="transform scale-90 origin-top shadow-xl">
            <ReceiptTemplate
              transaction={{
                ...DUMMY_TRANSACTION,
                customer_name: 'John Doe',
                customer_phone: '08123456789',
                points_earned: 10,
                note: 'Contoh catatan transaksi'
              }}
              settings={{ 
                receipt_settings: {
                  ...formData,
                  business_name: selectedCompany?.name,
                  business_address: selectedCompany?.address,
                  business_phone: selectedCompany?.phone,
                  business_email: selectedCompany?.email
                }
              }}
              companyName={selectedCompany?.name || 'Nama Perusahaan'}
              logoUrl={selectedCompany?.logo_url || selectedCompany?.logo}
            />
          </div>
        </CardContent>
      </Card >
    </div >
  );
}