import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReferralSetting } from '@/entities/ReferralSetting';
import { toast } from 'sonner';
import { Loader2, DollarSign, Save, Edit, Settings, Plus, Info } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DEFAULT_PLANS = ['free', 'pro', 'business', 'advanced', 'enterprise'];

export default function ReferralSettingsTab() {
  const [settings, setSettings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await ReferralSetting.list();
      
      // ✅ Ensure all plans have settings
      const existingPlanKeys = data.map(s => s.plan_key);
      const missingPlans = DEFAULT_PLANS.filter(p => !existingPlanKeys.includes(p));
      
      // Create missing plan settings
      for (const planKey of missingPlans) {
        await ReferralSetting.create({
          plan_key: planKey,
          first_purchase_commission_rate: 0.50, // 50% default
          renewal_commission_rate: 0.15 // 15% default
        });
      }
      
      // Reload after creating missing
      const refreshedData = await ReferralSetting.list();
      setSettings(refreshedData.sort((a, b) => {
        const order = { free: 0, pro: 1, business: 2, advanced: 3, enterprise: 4 };
        return (order[a.plan_key] || 99) - (order[b.plan_key] || 99);
      }));
      
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Gagal memuat pengaturan referral');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleEdit = (setting) => {
    setEditingId(setting.id);
    setFormData({
      first_purchase_commission_rate: setting.first_purchase_commission_rate,
      renewal_commission_rate: setting.renewal_commission_rate
    });
  };

  const handleSave = async (settingId) => {
    if (!formData.first_purchase_commission_rate || !formData.renewal_commission_rate) {
      toast.error('Semua field harus diisi!');
      return;
    }

    if (formData.first_purchase_commission_rate < 0 || formData.first_purchase_commission_rate > 1) {
      toast.error('Rate harus antara 0 dan 1 (0% - 100%)');
      return;
    }

    if (formData.renewal_commission_rate < 0 || formData.renewal_commission_rate > 1) {
      toast.error('Rate harus antara 0 dan 1 (0% - 100%)');
      return;
    }

    setIsSaving(true);
    try {
      await ReferralSetting.update(settingId, {
        first_purchase_commission_rate: parseFloat(formData.first_purchase_commission_rate),
        renewal_commission_rate: parseFloat(formData.renewal_commission_rate)
      });
      
      toast.success('✅ Pengaturan komisi berhasil diperbarui!', {
        description: 'Perubahan langsung berlaku untuk transaksi berikutnya'
      });
      
      setEditingId(null);
      setFormData({});
      await loadSettings();
      
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Gagal memperbarui pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-400">Memuat pengaturan referral...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <DollarSign className="w-6 h-6 text-green-500" />
            Pengaturan Komisi Referral
          </CardTitle>
          <CardDescription className="text-gray-400">
            Atur persentase komisi untuk setiap paket langganan. Perubahan langsung berlaku untuk transaksi berikutnya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">Belum ada pengaturan komisi</p>
              <Button onClick={loadSettings} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Buat Pengaturan Default
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Paket</TableHead>
                    <TableHead className="text-gray-300">Komisi Pembelian Pertama</TableHead>
                    <TableHead className="text-gray-300">Komisi Renewal/Perpanjangan</TableHead>
                    <TableHead className="text-right text-gray-300">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.map((setting) => (
                    <TableRow key={setting.id} className="border-gray-700">
                      <TableCell className="font-semibold text-white capitalize">
                        <Badge className="bg-blue-600 text-white">
                          {setting.plan_key.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {editingId === setting.id ? (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={formData.first_purchase_commission_rate}
                              onChange={(e) => setFormData({
                                ...formData,
                                first_purchase_commission_rate: e.target.value
                              })}
                              className="w-32 bg-gray-700 border-gray-600 text-white"
                              placeholder="0.50"
                            />
                            <p className="text-xs text-gray-400">
                              {(parseFloat(formData.first_purchase_commission_rate || 0) * 100).toFixed(0)}%
                            </p>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/10 border-green-500 text-green-400 font-bold text-base">
                            {(setting.first_purchase_commission_rate * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === setting.id ? (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={formData.renewal_commission_rate}
                              onChange={(e) => setFormData({
                                ...formData,
                                renewal_commission_rate: e.target.value
                              })}
                              className="w-32 bg-gray-700 border-gray-600 text-white"
                              placeholder="0.15"
                            />
                            <p className="text-xs text-gray-400">
                              {(parseFloat(formData.renewal_commission_rate || 0) * 100).toFixed(0)}%
                            </p>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-blue-500/10 border-blue-500 text-blue-400 font-bold text-base">
                            {(setting.renewal_commission_rate * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === setting.id ? (
                          <div className="flex gap-2 justify-end">
                            <Button 
                              size="sm" 
                              onClick={() => handleSave(setting.id)} 
                              disabled={isSaving}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Menyimpan...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-1" />
                                  Simpan
                                </>
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={handleCancel} 
                              disabled={isSaving}
                              className="border-gray-600 text-gray-300"
                            >
                              Batal
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleEdit(setting)}
                            className="text-gray-300 hover:bg-gray-700"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert className="bg-blue-900/20 border-blue-700">
        <Info className="h-5 w-5 text-blue-400" />
        <AlertDescription className="text-blue-200">
          <div className="space-y-2">
            <p className="font-semibold text-blue-100">💡 Cara Kerja Komisi:</p>
            <ul className="space-y-1 ml-4 list-disc text-sm">
              <li><strong>Pembelian Pertama:</strong> Komisi diberikan saat referee melakukan pembelian pertama kali (hitung dari harga final setelah voucher)</li>
              <li><strong>Renewal:</strong> Komisi diberikan saat referee memperpanjang subscription (pembelian kedua dan seterusnya)</li>
              <li><strong>Otomatis:</strong> Komisi langsung masuk ke Saldo Komisi referrer saat admin approve upgrade request</li>
              <li><strong>Anti-Double:</strong> Sistem otomatis mencegah komisi ganda untuk transaksi yang sama</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      <Card className="bg-yellow-900/20 border-yellow-700">
        <CardContent className="p-6">
          <h3 className="font-semibold text-yellow-100 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-yellow-400" />
            Contoh Perhitungan Komisi
          </h3>
          <div className="space-y-3 text-sm text-yellow-100">
            <div className="bg-gray-800 p-3 rounded-lg">
              <p className="font-semibold mb-2">📊 Scenario 1: Pembelian Business Tahunan</p>
              <ul className="space-y-1 ml-4 text-gray-300">
                <li>• Harga asli: Rp 3.690.000 (setelah diskon tahunan)</li>
                <li>• Voucher 25%: -Rp 922.500</li>
                <li>• Harga final yang dibayar: Rp 2.767.500</li>
                <li>• Komisi 50% (pembelian pertama): <strong className="text-green-400">Rp 1.383.750</strong></li>
              </ul>
            </div>
            
            <div className="bg-gray-800 p-3 rounded-lg">
              <p className="font-semibold mb-2">📊 Scenario 2: Perpanjangan Pro Bulanan</p>
              <ul className="space-y-1 ml-4 text-gray-300">
                <li>• Harga asli: Rp 149.000</li>
                <li>• Tanpa voucher</li>
                <li>• Harga final: Rp 149.000</li>
                <li>• Komisi 15% (renewal): <strong className="text-green-400">Rp 22.350</strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}