import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, Save, Loader2, CheckCircle2, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function WablasSettingsForm({ selectedCompany }) {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // ✅ PERSISTENT DEFAULT - Load from localStorage first
  const STORAGE_KEY = `SNISHOP_WABLAS_SETTINGS_${selectedCompany?.id}`;
  
  const [formData, setFormData] = useState(() => {
    // Try to load from localStorage for instant state
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    
    return {
      use_system_api: true,
      wablas_api_key: '',
      wablas_secret_key: '',
      wablas_domain: 'jogja.wablas.com',
      auto_send_receipt: false,
      receipt_message_template: 'Terima kasih telah berbelanja di {company_name}!\n\n📋 *Detail Transaksi*\nNo: {transaction_id}\nTanggal: {date}\nTotal: {total}\n\nKami tunggu kunjungan berikutnya! 🙏'
    };
  });

  useEffect(() => {
    if (selectedCompany) {
      loadSettings();
    }
  }, [selectedCompany]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settingsData = await base44.entities.CompanyWablasSettings.filter({
        company_id: selectedCompany.id
      });

      if (settingsData && settingsData.length > 0) {
        const setting = settingsData[0];
        setSettings(setting);
        const loadedData = {
          use_system_api: setting.use_system_api !== undefined ? setting.use_system_api : true,
          wablas_api_key: setting.wablas_api_key || '',
          wablas_secret_key: setting.wablas_secret_key || '',
          wablas_domain: setting.wablas_domain || 'jogja.wablas.com',
          auto_send_receipt: setting.auto_send_receipt || false,
          receipt_message_template: setting.receipt_message_template || 'Terima kasih telah berbelanja di {company_name}!\n\n📋 *Detail Transaksi*\nNo: {transaction_id}\nTanggal: {date}\nTotal: {total}\n\nKami tunggu kunjungan berikutnya! 🙏'
        };
        setFormData(loadedData);
        
        // ✅ PERSIST to localStorage for instant load next time
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedData));
        } catch (e) {}
      }
    } catch (error) {
      console.error('Load settings error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.use_system_api && !formData.wablas_api_key.trim()) {
      toast.error('Wablas API Key wajib diisi jika tidak menggunakan API sistem');
      return;
    }

    try {
      setIsSaving(true);

      if (settings) {
        await base44.entities.CompanyWablasSettings.update(settings.id, {
          ...formData,
          company_id: selectedCompany.id,
          is_active: true
        });
        toast.success('✅ Settings berhasil diupdate!');
      } else {
        await base44.entities.CompanyWablasSettings.create({
          ...formData,
          company_id: selectedCompany.id,
          is_active: true
        });
        toast.success('✅ Settings berhasil disimpan!');
      }

      // ✅ PERSIST to localStorage immediately
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      } catch (e) {}

      loadSettings();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Gagal menyimpan: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-green-600" />
          Integrasi Wablas WhatsApp
        </CardTitle>
        <CardDescription>
          Input API Key & Secret Key Wablas Anda untuk mengaktifkan fitur WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {settings && (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-300">
              ✅ Wablas sudah terkonfigurasi! Anda bisa langsung connect device.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Gunakan API Default Sistem</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">API Wablas yang dikonfigurasi oleh Admin Owner</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.use_system_api}
                onChange={(e) => setFormData({ ...formData, use_system_api: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {!formData.use_system_api && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Wablas API Key Sendiri *
                </label>
            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                value={formData.wablas_api_key}
                onChange={(e) => setFormData({ ...formData, wablas_api_key: e.target.value })}
                placeholder="Masukkan API Key dari dashboard Wablas"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dapatkan di: <a href="https://solo.wablas.com/setting" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                Wablas Dashboard → Settings → API Keys <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Wablas Secret Key (Opsional)
            </label>
            <div className="relative">
              <Input
                type={showSecretKey ? "text" : "password"}
                value={formData.wablas_secret_key}
                onChange={(e) => setFormData({ ...formData, wablas_secret_key: e.target.value })}
                placeholder="Masukkan Secret Key (jika ada)"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Domain Wablas Server
            </label>
            <Input
              value={formData.wablas_domain}
              onChange={(e) => setFormData({ ...formData, wablas_domain: e.target.value })}
              placeholder="solo.wablas.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default: jogja.wablas.com
            </p>
          </div>
            </>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">🔔 Auto Blast Struk</h3>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Kirim Struk Otomatis</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Kirim detail transaksi ke customer via WhatsApp</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_send_receipt}
                  onChange={(e) => setFormData({ ...formData, auto_send_receipt: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            {formData.auto_send_receipt && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Template Pesan Struk
                </label>
                <textarea
                  value={formData.receipt_message_template}
                  onChange={(e) => setFormData({ ...formData, receipt_message_template: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  placeholder="Template pesan..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Variabel tersedia: {'{company_name}'}, {'{transaction_id}'}, {'{date}'}, {'{total}'}, {'{items}'}, {'{customer_name}'}
                </p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan Konfigurasi
              </>
            )}
          </Button>
        </form>

        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
          <AlertDescription className="text-sm space-y-2">
            <p className="font-semibold">📱 Cara Setup:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
              <li>Daftar/Login ke <a href="https://wablas.com" target="_blank" className="text-blue-600 hover:underline">Wablas.com</a></li>
              <li>Buka Dashboard → Settings → API Keys</li>
              <li>Copy API Key Anda dan paste di form ini</li>
              <li>Connect device WhatsApp di dashboard Wablas</li>
              <li>Selesai! Kembali ke halaman WhatsApp Web untuk mulai kirim pesan</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}