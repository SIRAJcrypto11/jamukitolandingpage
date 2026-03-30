import React, { useState, useEffect } from 'react';
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
  Copy, AlertTriangle, Loader2, ExternalLink, Eye, EyeOff, Lock, Webhook
} from 'lucide-react';
import { toast } from 'sonner';

export default function StripeSettingsTab() {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showPublishableKey, setShowPublishableKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const [formData, setFormData] = useState({
    publishable_key: '',
    secret_key: '',
    webhook_secret: '',
    webhook_url: '',
    is_active: false,
    mode: 'sandbox',
    allowed_payment_methods: ['card'],
    currency: 'usd',
    config_notes: ''
  });

  useEffect(() => {
    loadSettings();
    generateWebhookUrl();
  }, []);

  const generateWebhookUrl = () => {
    const origin = window.location.origin;
    const appDomain = origin.replace('https://', '').replace('http://localhost:3000', '');
    const webhookUrl = `https://${appDomain}/api/functions/stripeWebhook`;
    
    setFormData(prev => ({
      ...prev,
      webhook_url: webhookUrl
    }));
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settingsData = await base44.entities.PaymentGatewaySettings.filter({
        gateway_name: 'stripe'
      });

      if (settingsData && settingsData.length > 0) {
        const config = settingsData[0];
        setSettings(config);
        setFormData({
          publishable_key: config.publishable_key || '',
          secret_key: config.secret_key || '',
          webhook_secret: config.webhook_secret || '',
          webhook_url: config.webhook_url || formData.webhook_url,
          is_active: config.is_active || false,
          mode: config.mode || 'sandbox',
          allowed_payment_methods: config.allowed_payment_methods || ['card'],
          currency: config.currency || 'usd',
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

  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (!formData.publishable_key || !formData.secret_key) {
        toast.error('Publishable Key dan Secret Key wajib diisi!');
        return;
      }

      const saveData = {
        gateway_name: 'stripe',
        ...formData,
        last_verified: formData.is_active ? new Date().toISOString() : null
      };

      if (settings) {
        await base44.entities.PaymentGatewaySettings.update(settings.id, saveData);
        toast.success('✅ Konfigurasi Stripe berhasil diperbarui!');
      } else {
        await base44.entities.PaymentGatewaySettings.create(saveData);
        toast.success('✅ Konfigurasi Stripe berhasil disimpan!');
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

      const { data } = await base44.functions.invoke('testStripeConnection', {});

      if (data && data.success) {
        toast.success('✅ Koneksi Stripe berhasil!', {
          description: 'API keys valid dan aktif',
          duration: 5000
        });
      } else {
        toast.error('❌ Koneksi gagal!', {
          description: data?.message || 'Periksa API keys',
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
            <CreditCard className="w-6 h-6 text-purple-500" />
            Stripe Payment Gateway
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Konfigurasi integrasi pembayaran dengan Stripe
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleTestConnection}
            disabled={isTestingConnection || !formData.secret_key}
            variant="outline"
            className="border-purple-600 text-purple-400 hover:bg-purple-600/10"
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
            className="bg-purple-600 hover:bg-purple-700"
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
                <span className="text-green-400 font-semibold">Stripe AKTIF</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-gray-500" />
                <span className="text-gray-400">Stripe NONAKTIF</span>
              </>
            )}
          </div>
          <Badge className={formData.mode === 'production' ? 'bg-red-600' : 'bg-yellow-600'}>
            {formData.mode === 'production' ? 'PRODUCTION' : 'TEST MODE'}
          </Badge>
        </AlertDescription>
      </Alert>

      <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-purple-700 border-2">
        <CardHeader>
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <Lock className="w-6 h-6 text-purple-400" />
            API Credentials
          </CardTitle>
          <CardDescription className="text-purple-200">
            Masukkan API Keys dari Stripe Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-purple-900/20 border-purple-700">
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            <AlertDescription className="text-purple-300 text-sm">
              <strong>💡 Credential disimpan langsung di database</strong> - Dapat diubah kapan saja.
            </AlertDescription>
          </Alert>

          <div>
            <Label className="text-white font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" />
              Publishable Key *
            </Label>
            <div className="relative mt-2">
              <Input
                type={showPublishableKey ? 'text' : 'password'}
                value={formData.publishable_key}
                onChange={(e) => setFormData({ ...formData, publishable_key: e.target.value })}
                placeholder="pk_test_... atau pk_live_..."
                className="bg-gray-800 border-gray-700 text-white pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPublishableKey(!showPublishableKey)}
                  className="h-8 w-8 text-gray-400 hover:text-white"
                >
                  {showPublishableKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                {formData.publishable_key && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(formData.publishable_key)}
                    className="h-8 w-8 text-gray-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Dapatkan dari: Dashboard Stripe → Developers → API Keys
            </p>
          </div>

          <div>
            <Label className="text-white font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" />
              Secret Key *
            </Label>
            <div className="relative mt-2">
              <Input
                type={showSecretKey ? 'text' : 'password'}
                value={formData.secret_key}
                onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                placeholder="sk_test_... atau sk_live_..."
                className="bg-gray-800 border-gray-700 text-white pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="h-8 w-8 text-gray-400 hover:text-white"
                >
                  {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                {formData.secret_key && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(formData.secret_key)}
                    className="h-8 w-8 text-gray-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Dapatkan dari: Dashboard Stripe → Developers → API Keys
            </p>
          </div>

          <div>
            <Label className="text-white font-semibold flex items-center gap-2">
              <Webhook className="w-4 h-4 text-purple-400" />
              Webhook Signing Secret
            </Label>
            <div className="relative mt-2">
              <Input
                type={showWebhookSecret ? 'text' : 'password'}
                value={formData.webhook_secret}
                onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
                placeholder="whsec_..."
                className="bg-gray-800 border-gray-700 text-white pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="h-8 w-8 text-gray-400 hover:text-white"
                >
                  {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                {formData.webhook_secret && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(formData.webhook_secret)}
                    className="h-8 w-8 text-gray-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Dapatkan dari: Dashboard Stripe → Developers → Webhooks
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-700 rounded-lg">
            {formData.publishable_key && formData.secret_key ? (
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
                  <p className="text-yellow-400 text-xs">Masukkan Publishable Key dan Secret Key</p>
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
                <option value="sandbox">Test Mode</option>
                <option value="production">Production (Live)</option>
              </select>
            </div>

            <div>
              <Label className="text-gray-300">Default Currency</Label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              >
                <option value="usd">USD - US Dollar</option>
                <option value="idr">IDR - Indonesian Rupiah</option>
                <option value="eur">EUR - Euro</option>
                <option value="sgd">SGD - Singapore Dollar</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Webhook className="w-5 h-5 text-purple-400" />
            Webhook Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-yellow-900/20 border-yellow-700">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300 text-sm">
              Copy URL ini dan daftarkan di Stripe Dashboard → Developers → Webhooks
            </AlertDescription>
          </Alert>

          <div>
            <Label className="text-gray-300">Webhook Endpoint URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={formData.webhook_url}
                readOnly
                className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
              />
              <Button
                onClick={() => copyToClipboard(formData.webhook_url)}
                variant="outline"
                className="border-gray-700"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Alert className="bg-blue-900/20 border-blue-700">
            <AlertDescription className="text-blue-300 text-sm">
              <p className="font-bold mb-2">Events yang perlu di-listen:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>checkout.session.completed</li>
                <li>payment_intent.succeeded</li>
                <li>payment_intent.payment_failed</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

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
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-purple-400" />
              <span className="text-white">Dashboard Stripe</span>
            </a>
            <a
              href="https://stripe.com/docs/api"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-purple-400" />
              <span className="text-white">Dokumentasi API Stripe</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}