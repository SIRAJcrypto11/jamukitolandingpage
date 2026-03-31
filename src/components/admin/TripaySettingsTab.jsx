import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard, Save, RefreshCw, CheckCircle, XCircle,
  Copy, AlertTriangle, Loader2, ExternalLink, Server, Eye, EyeOff, Lock
} from 'lucide-react';
import { toast } from 'sonner';

export default function TripaySettingsTab() {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isDetectingIP, setIsDetectingIP] = useState(false);
  const [currentServerIP, setCurrentServerIP] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const [formData, setFormData] = useState({
    api_key: '',
    private_key: '',
    is_active: false,
    mode: 'sandbox',
    merchant_code: '',
    callback_url: '',
    whitelisted_ips: [],
    available_payment_methods: [],
    config_notes: ''
  });

  const [ipInput, setIpInput] = useState('');

  useEffect(() => {
    loadSettings();
    generateCallbackUrl();
  }, []);

  const generateCallbackUrl = () => {
    const origin = window.location.origin;
    const appDomain = origin.replace('https://', '').replace('http://', '');
    const callbackUrl = `https://${appDomain}/api/functions/tripayCallback`;

    setFormData(prev => ({
      ...prev,
      callback_url: callbackUrl
    }));
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);

      const settingsData = await base44.entities.PaymentGatewaySettings.filter({
        gateway_name: 'tripay'
      });

      if (settingsData && settingsData.length > 0) {
        const config = settingsData[0];
        setSettings(config);
        setFormData({
          api_key: config.api_key || '',
          private_key: config.private_key || '',
          is_active: config.is_active || false,
          mode: config.mode || 'sandbox',
          merchant_code: config.merchant_code || '',
          callback_url: config.callback_url || formData.callback_url,
          whitelisted_ips: config.whitelisted_ips || [],
          available_payment_methods: config.available_payment_methods || [],
          config_notes: config.config_notes || ''
        });
      }

    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Gagal memuat konfigurasi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetectServerIP = async () => {
    try {
      setIsDetectingIP(true);
      toast.info('🔍 Mendeteksi IP server saat ini...', { duration: 2000 });

      const { data } = await base44.functions.invoke('getServerIP', {});

      if (data && data.success && data.primaryIP) {
        setCurrentServerIP(data.primaryIP);
        
        toast.success(`✅ IP Server: ${data.primaryIP}`, {
          description: 'Gunakan IP ini untuk whitelist di Tripay',
          duration: 5000
        });
      } else {
        toast.error('❌ Gagal mendeteksi IP', {
          description: data?.message || 'Coba lagi',
          duration: 5000
        });
      }

    } catch (error) {
      console.error('Error detecting IP:', error);
      toast.error('Gagal mendeteksi IP server');
    } finally {
      setIsDetectingIP(false);
    }
  };

  const handleUseDetectedIP = () => {
    if (!currentServerIP) return;

    if (!formData.whitelisted_ips.includes(currentServerIP)) {
      setFormData(prev => ({
        ...prev,
        whitelisted_ips: [currentServerIP]
      }));
      toast.success(`✅ IP ${currentServerIP} digunakan!`);
    } else {
      toast.info('IP ini sudah terdaftar');
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (!formData.merchant_code) {
        toast.error('Merchant Code wajib diisi!');
        return;
      }

      if (!formData.api_key || !formData.private_key) {
        toast.error('API Key dan Private Key wajib diisi!');
        return;
      }

      const saveData = {
        gateway_name: 'tripay',
        ...formData,
        last_verified: formData.is_active ? new Date().toISOString() : null
      };

      if (settings) {
        await base44.entities.PaymentGatewaySettings.update(settings.id, saveData);
        toast.success('✅ Konfigurasi Tripay berhasil diperbarui!');
      } else {
        await base44.entities.PaymentGatewaySettings.create(saveData);
        toast.success('✅ Konfigurasi Tripay berhasil disimpan!');
      }

      loadSettings();

    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Gagal menyimpan konfigurasi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTestingConnection(true);

      const { data } = await base44.functions.invoke('getTripayPaymentMethods', {});

      if (data && data.success) {
        setPaymentMethods(data.data || []);
        toast.success('✅ Koneksi Tripay berhasil!', {
          description: `${data.data?.length || 0} metode pembayaran tersedia`,
          duration: 5000
        });
      } else {
        toast.error('❌ Koneksi gagal!', {
          description: data?.message || 'Periksa API Key dan Private Key',
          duration: 5000
        });
      }

    } catch (error) {
      console.error('Test connection error:', error);
      toast.error('❌ Gagal test koneksi');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('✅ Disalin!');
  };

  const addIpToWhitelist = () => {
    if (!ipInput.trim()) return;

    const ips = ipInput.split(',').map(ip => ip.trim()).filter(ip => ip);

    setFormData(prev => ({
      ...prev,
      whitelisted_ips: [...new Set([...prev.whitelisted_ips, ...ips])]
    }));

    setIpInput('');
    toast.success(`✅ ${ips.length} IP ditambahkan`);
  };

  const removeIp = (ip) => {
    setFormData(prev => ({
      ...prev,
      whitelisted_ips: prev.whitelisted_ips.filter(i => i !== ip)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-500" />
            Tripay Payment Gateway
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Konfigurasi integrasi pembayaran dengan Tripay
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleTestConnection}
            disabled={isTestingConnection || !formData.merchant_code || !formData.api_key}
            variant="outline"
            className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
          >
            {isTestingConnection ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Test Koneksi
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Simpan
          </Button>
        </div>
      </div>

      <Alert className={formData.is_active ? 'bg-green-900/20 border-green-700' : 'bg-gray-800 border-gray-700'}>
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {formData.is_active ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-400 font-semibold">Tripay AKTIF</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-gray-500" />
                <span className="text-gray-400">Tripay NONAKTIF</span>
              </>
            )}
          </div>
          <Badge className={formData.mode === 'production' ? 'bg-red-600' : 'bg-yellow-600'}>
            {formData.mode === 'production' ? 'PRODUCTION' : 'SANDBOX'}
          </Badge>
        </AlertDescription>
      </Alert>

      <Card className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-blue-700 border-2">
        <CardHeader>
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <Lock className="w-6 h-6 text-blue-400" />
            API Credentials - DAPAT DI-EDIT
          </CardTitle>
          <CardDescription className="text-blue-200">
            Masukkan API Key dan Private Key dari dashboard Tripay Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-900/20 border-blue-700">
            <AlertTriangle className="w-4 h-4 text-blue-400" />
            <AlertDescription className="text-blue-300 text-sm">
              <strong>💡 Credential disimpan langsung di database</strong> - Anda dapat mengubahnya kapan saja dari dashboard ini.
              <br />
              Tidak perlu lagi edit Environment Secrets!
            </AlertDescription>
          </Alert>

          <div>
            <Label className="text-white font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              API Key *
            </Label>
            <div className="relative mt-2">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Masukkan API Key dari Tripay"
                className="bg-gray-800 border-gray-700 text-white pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="h-8 w-8 text-gray-400 hover:text-white"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                {formData.api_key && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(formData.api_key)}
                    className="h-8 w-8 text-gray-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Dapatkan dari: Dashboard Tripay → Setting → API Key
            </p>
          </div>

          <div>
            <Label className="text-white font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              Private Key *
            </Label>
            <div className="relative mt-2">
              <Input
                type={showPrivateKey ? 'text' : 'password'}
                value={formData.private_key}
                onChange={(e) => setFormData({ ...formData, private_key: e.target.value })}
                placeholder="Masukkan Private Key dari Tripay"
                className="bg-gray-800 border-gray-700 text-white pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="h-8 w-8 text-gray-400 hover:text-white"
                >
                  {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                {formData.private_key && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(formData.private_key)}
                    className="h-8 w-8 text-gray-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Dapatkan dari: Dashboard Tripay → Setting → API Key
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-700 rounded-lg">
            {formData.api_key && formData.private_key ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-green-300 font-semibold text-sm">✅ Credentials Sudah Diisi</p>
                  <p className="text-green-400 text-xs">Jangan lupa klik "Simpan" setelah mengubah</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-yellow-300 font-semibold text-sm">⚠️ Credentials Belum Lengkap</p>
                  <p className="text-yellow-400 text-xs">Masukkan API Key dan Private Key</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">⚙️ Konfigurasi Dasar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Status</Label>
              <select
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              >
                <option value="inactive">Nonaktif</option>
                <option value="active">Aktif</option>
              </select>
            </div>

            <div>
              <Label className="text-gray-300">Mode</Label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              >
                <option value="sandbox">Sandbox (Testing)</option>
                <option value="production">Production (Live)</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-gray-300">Merchant Code *</Label>
            <Input
              value={formData.merchant_code}
              onChange={(e) => setFormData({ ...formData, merchant_code: e.target.value })}
              placeholder="Contoh: T1234"
              className="mt-2 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">🔗 Callback URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-yellow-900/20 border-yellow-700">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300 text-sm">
              Copy URL ini dan daftarkan di Tripay (Setting → Callback)
            </AlertDescription>
          </Alert>

          <div>
            <div className="flex gap-2 mt-2">
              <Input
                value={formData.callback_url}
                readOnly
                className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
              />
              <Button
                onClick={() => copyToClipboard(formData.callback_url)}
                variant="outline"
                className="border-gray-700"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-600 border-2">
        <CardHeader>
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <Server className="w-6 h-6 text-blue-400" />
            Whitelist IP Server
          </CardTitle>
          <CardDescription className="text-gray-300">
            Deteksi IP server Anda saat ini untuk whitelist di Tripay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          <Alert className="bg-blue-900/40 border-blue-700">
            <AlertTriangle className="w-5 h-5 text-blue-400" />
            <AlertDescription className="text-blue-200">
              <p className="font-bold mb-2">💡 CARA MUDAH:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Klik "Deteksi IP"</li>
                <li>Klik "Gunakan IP Ini"</li>
                <li>Klik "Simpan" di bagian atas</li>
                <li>Copy IP dan whitelist di Tripay</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-blue-200">
                  Deteksi IP Server Saat Ini
                </h3>
                <p className="text-sm text-blue-300 mt-1">
                  IP yang sedang digunakan oleh server Anda
                </p>
              </div>
              <Button
                onClick={handleDetectServerIP}
                disabled={isDetectingIP}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isDetectingIP ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Server className="w-4 h-4 mr-2" />
                )}
                Deteksi IP
              </Button>
            </div>

            {currentServerIP && (
              <div className="space-y-3">
                <Alert className="bg-green-950/50 border-green-800">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <AlertDescription className="text-green-200">
                    <p className="font-bold text-lg mb-2">✅ IP Terdeteksi:</p>
                    <div className="bg-gray-900/50 p-3 rounded border border-gray-700">
                      <p className="font-mono text-2xl text-white font-bold">
                        {currentServerIP}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleUseDetectedIP}
                  className="w-full bg-green-600 hover:bg-green-700 py-4"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Gunakan IP Ini
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label className="text-gray-300 text-base">
              Atau Tambah IP Manual
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                placeholder="Contoh: 34.102.90.198"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Button
                onClick={addIpToWhitelist}
                variant="outline"
                className="border-gray-700"
              >
                Tambah
              </Button>
            </div>
          </div>

          {formData.whitelisted_ips.length > 0 && (
            <div className="mt-6">
              <Label className="text-white font-bold text-xl mb-3 block">
                ✅ IP yang Sudah Terdaftar ({formData.whitelisted_ips.length}):
              </Label>
              <div className="flex flex-wrap gap-3 mt-3">
                {formData.whitelisted_ips.map((ip, idx) => (
                  <Badge key={idx} className="bg-green-900/60 text-green-100 border-2 border-green-600 px-4 py-2 text-base">
                    <Server className="w-4 h-4 mr-2 text-green-400" />
                    <span className="font-mono font-bold">{ip}</span>
                    <button
                      onClick={() => removeIp(ip)}
                      className="ml-3 hover:text-red-400 text-xl font-bold"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>

              <Alert className="bg-yellow-900/40 border-yellow-600 border-2 mt-6">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <AlertDescription className="text-yellow-200">
                  <strong className="text-yellow-100 text-lg block mb-3">
                    🚨 LANGKAH TERAKHIR - WAJIB!
                  </strong>
                  <div className="bg-yellow-950/50 p-4 rounded border border-yellow-700 mt-3">
                    <p className="font-semibold mb-3">
                      Whitelist di Dashboard Tripay:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Login ke <a href="https://tripay.co.id" target="_blank" className="underline font-bold">tripay.co.id</a></li>
                      <li>Menu <strong>Setting → Whitelist IP</strong></li>
                      <li className="bg-yellow-900/50 p-3 rounded border border-yellow-600 my-2">
                        <strong className="block mb-2">Copy IP:</strong>
                        <code className="bg-yellow-900 px-3 py-2 rounded font-mono font-bold text-yellow-100 block break-all">
                          {formData.whitelisted_ips.join(', ')}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(formData.whitelisted_ips.join(', '))}
                          className="mt-2 text-yellow-200 hover:text-yellow-100"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy IP
                        </Button>
                      </li>
                      <li>Paste di Tripay</li>
                      <li><strong>Simpan</strong> di Tripay</li>
                      <li>✅ Test lagi!</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {paymentMethods.length > 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">💳 Metode Pembayaran</CardTitle>
            <CardDescription className="text-gray-400">
              {paymentMethods.length} metode tersedia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paymentMethods.map((method) => (
                <div key={method.code} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {method.icon_url && (
                        <img src={method.icon_url} alt={method.name} className="w-8 h-8 object-contain" />
                      )}
                      <div>
                        <p className="text-white font-semibold text-sm">{method.name}</p>
                        <p className="text-gray-400 text-xs">{method.code}</p>
                      </div>
                    </div>
                    <Badge className={method.active ? 'bg-green-600' : 'bg-gray-600'}>
                      {method.active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">📝 Catatan</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.config_notes}
            onChange={(e) => setFormData({ ...formData, config_notes: e.target.value })}
            placeholder="Catatan internal..."
            className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
          />
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">🔗 Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <a
              href="https://tripay.co.id"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-blue-400" />
              <span className="text-white">Dashboard Tripay</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}