import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CreditCard, Plus, Settings, Eye, EyeOff,
  Save, Trash2, AlertTriangle, Loader2, Copy, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { validateGatewayConfig } from '@/components/utils/paymentGatewayHelper';

const AVAILABLE_GATEWAYS = [
  {
    id: 'tripay',
    name: 'Tripay',
    description: 'Payment Gateway Indonesia dengan berbagai metode pembayaran',
    logo: 'https://tripay.co.id/asset/images/logo.png',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'private_key', label: 'Private Key', type: 'password', required: true },
      { key: 'merchant_code', label: 'Merchant Code', type: 'text', required: true },
      { key: 'callback_url', label: 'Callback URL', type: 'text', required: false }
    ]
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'International payment gateway dengan support global',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg',
    fields: [
      { key: 'publishable_key', label: 'Publishable Key', type: 'text', required: true },
      { key: 'secret_key', label: 'Secret Key', type: 'password', required: true },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false }
    ]
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Global payment platform dengan jutaan pengguna',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'webhook_id', label: 'Webhook ID', type: 'text', required: false }
    ]
  },
  {
    id: 'midtrans',
    name: 'Midtrans',
    description: 'Payment gateway Indonesia by Gojek',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Midtrans_logo.svg',
    fields: [
      { key: 'server_key', label: 'Server Key', type: 'password', required: true },
      { key: 'client_key', label: 'Client Key', type: 'text', required: true },
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', required: true }
    ]
  }
];

export default function PaymentGatewayTab() {
  const [gateways, setGateways] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showFields, setShowFields] = useState({});
  
  const [formData, setFormData] = useState({
    gateway_name: '',
    is_active: false,
    mode: 'sandbox'
  });

  useEffect(() => {
    loadGateways();
  }, []);

  const loadGateways = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.PaymentGatewaySettings.filter({});
      setGateways(data || []);
    } catch (error) {
      console.error('Error loading gateways:', error);
      toast.error('Gagal memuat payment gateways');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGateway = (gatewayTemplate) => {
    const initialData = {
      gateway_name: gatewayTemplate.id,
      is_active: false,
      mode: 'sandbox'
    };

    gatewayTemplate.fields.forEach(field => {
      initialData[field.key] = '';
    });

    setFormData(initialData);
    setSelectedGateway(gatewayTemplate);
    setIsModalOpen(true);
  };

  const handleEditGateway = (gateway) => {
    const template = AVAILABLE_GATEWAYS.find(g => g.id === gateway.gateway_name);
    setSelectedGateway(template);
    setFormData(gateway);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedGateway) return;

    const validation = validateGatewayConfig(selectedGateway.id, formData);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    setIsSaving(true);
    try {
      if (formData.id) {
        await base44.entities.PaymentGatewaySettings.update(formData.id, formData);
        toast.success(`${selectedGateway.name} berhasil diperbarui!`);
      } else {
        await base44.entities.PaymentGatewaySettings.create(formData);
        toast.success(`${selectedGateway.name} berhasil ditambahkan!`);
      }

      setIsModalOpen(false);
      setSelectedGateway(null);
      loadGateways();
    } catch (error) {
      console.error('Error saving gateway:', error);
      toast.error('Gagal menyimpan konfigurasi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (gateway) => {
    if (!confirm(`Hapus konfigurasi ${gateway.gateway_name}?`)) return;

    try {
      await base44.entities.PaymentGatewaySettings.delete(gateway.id);
      toast.success('Gateway berhasil dihapus');
      loadGateways();
    } catch (error) {
      console.error('Error deleting gateway:', error);
      toast.error('Gagal menghapus gateway');
    }
  };

  const toggleFieldVisibility = (fieldKey) => {
    setShowFields(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Disalin!');
  };

  const getConfiguredGateways = () => {
    return gateways.filter(g => g.is_active).length;
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
            Payment Gateways
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Kelola integrasi payment gateway - {getConfiguredGateways()} aktif
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {AVAILABLE_GATEWAYS.map((gatewayTemplate) => {
          const existingGateway = gateways.find(g => g.gateway_name === gatewayTemplate.id);
          const isConfigured = !!existingGateway;
          const isActive = existingGateway?.is_active;

          return (
            <Card key={gatewayTemplate.id} className="bg-gray-900 border-gray-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-lg p-2 flex items-center justify-center">
                      <img
                        src={gatewayTemplate.logo}
                        alt={gatewayTemplate.name}
                        className="w-full h-full object-contain"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{gatewayTemplate.name}</CardTitle>
                      <CardDescription className="text-gray-400 text-sm">
                        {gatewayTemplate.description}
                      </CardDescription>
                    </div>
                  </div>
                  {isConfigured && (
                    <Badge className={isActive ? 'bg-green-600' : 'bg-gray-600'}>
                      {isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {isConfigured ? (
                    <>
                      <Button
                        onClick={() => handleEditGateway(existingGateway)}
                        variant="outline"
                        className="flex-1 border-gray-700"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Kelola
                      </Button>
                      <Button
                        onClick={() => handleDelete(existingGateway)}
                        variant="outline"
                        className="border-red-700 text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => handleAddGateway(gatewayTemplate)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Gateway
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              Konfigurasi {selectedGateway?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedGateway && (
            <div className="space-y-4">
              <Alert className="bg-blue-900/20 border-blue-700">
                <AlertTriangle className="w-4 h-4 text-blue-400" />
                <AlertDescription className="text-blue-300 text-sm">
                  Semua credential akan disimpan dengan aman di database
                </AlertDescription>
              </Alert>

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

              {selectedGateway.fields.map((field) => (
                <div key={field.key}>
                  <Label className="text-gray-300 flex items-center gap-2">
                    {field.type === 'password' && <Lock className="w-4 h-4 text-blue-400" />}
                    {field.label} {field.required && <span className="text-red-400">*</span>}
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      type={field.type === 'password' && !showFields[field.key] ? 'password' : 'text'}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      placeholder={`Masukkan ${field.label}`}
                      className="bg-gray-800 border-gray-700 text-white pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      {field.type === 'password' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFieldVisibility(field.key)}
                          className="h-8 w-8 text-gray-400 hover:text-white"
                        >
                          {showFields[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      )}
                      {formData[field.key] && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(formData[field.key])}
                          className="h-8 w-8 text-gray-400 hover:text-white"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="border-gray-700"
                >
                  Batal
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}