import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, Save, Loader2, CheckCircle2, ExternalLink, Eye, EyeOff, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function SystemWablasTab() {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // ✅ DEFAULT SYSTEM API - HARDCODED
  const DEFAULT_SYSTEM_API = {
    wablas_api_key: 'x7fXtn51jTAqAly5EnQ3gYR65t6eaXyVO9Bf4kLYW0gsxB0U9Qs41sn',
    wablas_secret_key: '2wLnDlp2',
    wablas_domain: 'jogja.wablas.com'
  };

  const [formData, setFormData] = useState({
    wablas_api_key: DEFAULT_SYSTEM_API.wablas_api_key,
    wablas_secret_key: DEFAULT_SYSTEM_API.wablas_secret_key,
    wablas_domain: DEFAULT_SYSTEM_API.wablas_domain
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settingsData = await base44.entities.SystemWablasSettings.list();

      if (settingsData && settingsData.length > 0) {
        const setting = settingsData[0];
        setSettings(setting);
        setFormData({
          wablas_api_key: setting.wablas_api_key || DEFAULT_SYSTEM_API.wablas_api_key,
          wablas_secret_key: setting.wablas_secret_key || DEFAULT_SYSTEM_API.wablas_secret_key,
          wablas_domain: setting.wablas_domain || DEFAULT_SYSTEM_API.wablas_domain
        });
      } else {
        // ✅ No settings found - use default and auto-create
        console.log('📦 No system settings found - using default API');
        setFormData(DEFAULT_SYSTEM_API);
      }
    } catch (error) {
      console.error('Load settings error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.wablas_api_key.trim()) {
      toast.error('Wablas API Key wajib diisi');
      return;
    }

    try {
      setIsSaving(true);
      const user = await base44.auth.me();

      if (settings) {
        await base44.entities.SystemWablasSettings.update(settings.id, {
          ...formData,
          is_active: true,
          created_by: user.email
        });
        toast.success('✅ API Default Sistem berhasil diupdate!');
      } else {
        await base44.entities.SystemWablasSettings.create({
          ...formData,
          is_active: true,
          created_by: user.email
        });
        toast.success('✅ API Default Sistem berhasil disimpan!');
      }

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
    <div className="space-y-6">
      <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <Settings className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
          <strong>API Default Sistem</strong> - Konfigurasi ini akan digunakan oleh semua company yang memilih "Gunakan API Default Sistem" di pengaturan WhatsApp mereka.
        </AlertDescription>
      </Alert>

      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-600" />
            API Wablas Default Sistem
          </CardTitle>
          <CardDescription>
            API Key ini akan digunakan untuk semua company yang memilih menggunakan API default sistem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {settings && (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                ✅ API Default Sistem sudah dikonfigurasi!
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Wablas API Key *
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
                Default: jogja.wablas.com (API Default SNISHOP)
              </p>
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
                  Simpan API Default Sistem
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}