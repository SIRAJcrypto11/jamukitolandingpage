import React, { useState, useEffect } from 'react';
import { PricingPlan } from '@/entities/PricingPlan';
import { AddonPackage } from '@/entities/AddonPackage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { PlusCircle, Edit, Loader2, Plus, Trash2, X, Save, Info, DollarSign, Zap, Building2 } from 'lucide-react';

export default function PricingSettingsTab() {
  const [plans, setPlans] = useState([]);
  const [addons, setAddons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showAddonForm, setShowAddonForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingAddon, setEditingAddon] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [planFormData, setPlanFormData] = useState({
    planKey: '',
    name: '',
    description: '',
    price: 0,
    yearlyPrice: 0,
    features: [],
    limitations: [],
    color: 'from-blue-600 to-indigo-600',
    popular: false,
    isActive: true,
    order: 0,
    ai_credits_per_month: 10,
    max_tasks: 0,
    max_notes: 0,
    max_workspaces: 0,
    max_storage_mb: 100,
    max_team_members: 0,
    max_companies: 0,
    company_slots: 0
  });

  const [newFeature, setNewFeature] = useState('');
  const [newLimitation, setNewLimitation] = useState('');

  const [addonFormData, setAddonFormData] = useState({
    key: '',
    name: '',
    requests: 0,
    price: 0,
    popular: false,
    isActive: true,
    order: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [plansData, addonsData] = await Promise.all([
        PricingPlan.filter({ isActive: true }, '-order'),
        AddonPackage.filter({ isActive: true }, '-order')
      ]);
      setPlans(plansData || []);
      setAddons(addonsData || []);
    } catch (error) {
      console.error('Error loading pricing:', error);
      toast.error('Gagal memuat data pricing');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const dataToSave = {
        ...planFormData,
        price: parseInt(planFormData.price) || 0,
        yearlyPrice: parseInt(planFormData.yearlyPrice) || 0,
        ai_credits_per_month: parseInt(planFormData.ai_credits_per_month) || 0,
        max_tasks: parseInt(planFormData.max_tasks) || 0,
        max_notes: parseInt(planFormData.max_notes) || 0,
        max_workspaces: parseInt(planFormData.max_workspaces) || 0,
        max_storage_mb: parseInt(planFormData.max_storage_mb) || 0,
        max_team_members: parseInt(planFormData.max_team_members) || 0,
        max_companies: parseInt(planFormData.max_companies) || 0,
        company_slots: parseInt(planFormData.company_slots) || 0,
        features: planFormData.features.filter(f => f.trim()),
        limitations: planFormData.limitations.filter(l => l.trim())
      };

      if (editingPlan) {
        await PricingPlan.update(editingPlan.id, dataToSave);
        toast.success('✅ Paket berhasil diupdate! Perubahan langsung berlaku di halaman Pricing', {
          duration: 3000
        });
      } else {
        await PricingPlan.create(dataToSave);
        toast.success('✅ Paket berhasil ditambahkan!');
      }

      setShowPlanForm(false);
      setEditingPlan(null);
      resetPlanForm();
      await loadData();
      
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Gagal menyimpan paket');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddonSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const dataToSave = {
        ...addonFormData,
        requests: parseInt(addonFormData.requests) || 0,
        price: parseInt(addonFormData.price) || 0
      };

      if (editingAddon) {
        await AddonPackage.update(editingAddon.id, dataToSave);
        toast.success('✅ Addon berhasil diupdate!');
      } else {
        await AddonPackage.create(dataToSave);
        toast.success('✅ Addon berhasil ditambahkan!');
      }

      setShowAddonForm(false);
      setEditingAddon(null);
      resetAddonForm();
      await loadData();
      
    } catch (error) {
      console.error('Error saving addon:', error);
      toast.error('Gagal menyimpan addon');
    } finally {
      setIsSaving(false);
    }
  };

  const resetPlanForm = () => {
    setPlanFormData({
      planKey: '',
      name: '',
      description: '',
      price: 0,
      yearlyPrice: 0,
      features: [],
      limitations: [],
      color: 'from-blue-600 to-indigo-600',
      popular: false,
      isActive: true,
      order: 0,
      ai_credits_per_month: 10,
      max_tasks: 0,
      max_notes: 0,
      max_workspaces: 0,
      max_storage_mb: 100,
      max_team_members: 0,
      max_companies: 0,
      company_slots: 0
    });
    setNewFeature('');
    setNewLimitation('');
  };

  const resetAddonForm = () => {
    setAddonFormData({
      key: '',
      name: '',
      requests: 0,
      price: 0,
      popular: false,
      isActive: true,
      order: 0
    });
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanFormData({
      planKey: plan.planKey || '',
      name: plan.name || '',
      description: plan.description || '',
      price: plan.price || 0,
      yearlyPrice: plan.yearlyPrice || 0,
      features: plan.features || [],
      limitations: plan.limitations || [],
      color: plan.color || 'from-blue-600 to-indigo-600',
      popular: plan.popular || false,
      isActive: plan.isActive !== false,
      order: plan.order || 0,
      ai_credits_per_month: plan.ai_credits_per_month || 10,
      max_tasks: plan.max_tasks || 0,
      max_notes: plan.max_notes || 0,
      max_workspaces: plan.max_workspaces || 0,
      max_storage_mb: plan.max_storage_mb || 100,
      max_team_members: plan.max_team_members || 0,
      max_companies: plan.max_companies || 0,
      company_slots: plan.company_slots || 0
    });
    setShowPlanForm(true);
  };

  const handleEditAddon = (addon) => {
    setEditingAddon(addon);
    setAddonFormData({
      key: addon.key || '',
      name: addon.name || '',
      requests: addon.requests || 0,
      price: addon.price || 0,
      popular: addon.popular || false,
      isActive: addon.isActive !== false,
      order: addon.order || 0
    });
    setShowAddonForm(true);
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm('⚠️ Yakin ingin menghapus paket ini? Tindakan tidak dapat dibatalkan!')) return;
    try {
      await PricingPlan.delete(planId);
      toast.success('Paket berhasil dihapus');
      await loadData();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Gagal menghapus paket');
    }
  };

  const handleDeleteAddon = async (addonId) => {
    if (!confirm('⚠️ Yakin ingin menghapus addon ini?')) return;
    try {
      await AddonPackage.delete(addonId);
      toast.success('Addon berhasil dihapus');
      await loadData();
    } catch (error) {
      console.error('Error deleting addon:', error);
      toast.error('Gagal menghapus addon');
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setPlanFormData({
        ...planFormData,
        features: [...planFormData.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setPlanFormData({
      ...planFormData,
      features: planFormData.features.filter((_, i) => i !== index)
    });
  };

  const addLimitation = () => {
    if (newLimitation.trim()) {
      setPlanFormData({
        ...planFormData,
        limitations: [...planFormData.limitations, newLimitation.trim()]
      });
      setNewLimitation('');
    }
  };

  const removeLimitation = (index) => {
    setPlanFormData({
      ...planFormData,
      limitations: planFormData.limitations.filter((_, i) => i !== index)
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-400">Memuat data pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-900/20 border-blue-700">
        <Info className="h-5 w-5 text-blue-400" />
        <AlertDescription className="text-blue-200">
          <p className="font-semibold mb-2">💡 Pengaturan Real-time:</p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>Perubahan harga, fitur, dan kuota <strong>langsung berlaku</strong> di halaman Pricing</li>
            <li>Company slots, AI credits, storage yang diubah akan <strong>otomatis diterapkan</strong> ke sistem</li>
            <li>Contoh: Business 3 slot → ubah jadi 5 slot = user langsung bisa buat 5 company</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="bg-gray-800">
          <TabsTrigger value="plans" className="data-[state=active]:bg-blue-600">
            <DollarSign className="w-4 h-4 mr-2" />
            Paket Langganan
          </TabsTrigger>
          <TabsTrigger value="addons" className="data-[state=active]:bg-purple-600">
            <Zap className="w-4 h-4 mr-2" />
            Addon AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Kelola Paket Langganan ({plans.length})</h3>
            <Button onClick={() => {
              resetPlanForm();
              setEditingPlan(null);
              setShowPlanForm(true);
            }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Paket
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <Card key={plan.id} className={`bg-gray-800 border-gray-700 ${!plan.isActive ? 'opacity-50' : ''}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    <span>{plan.name}</span>
                    {plan.popular && (
                      <Badge className="bg-yellow-500 text-white">⭐ Popular</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold text-white">
                      Rp {(plan.price || 0).toLocaleString('id-ID')}
                      <span className="text-sm text-gray-400">/bulan</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Rp {(plan.yearlyPrice || 0).toLocaleString('id-ID')}/tahun
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-700 p-2 rounded">
                      <p className="text-gray-400">AI Credits</p>
                      <p className="text-white font-bold">{plan.ai_credits_per_month || 0}/bln</p>
                    </div>
                    <div className="bg-gray-700 p-2 rounded">
                      <p className="text-gray-400">Storage</p>
                      <p className="text-white font-bold">{plan.max_storage_mb || 0}MB</p>
                    </div>
                    <div className="bg-gray-700 p-2 rounded">
                      <p className="text-gray-400">Company Slots</p>
                      <p className="text-white font-bold">{plan.company_slots || 0}</p>
                    </div>
                    <div className="bg-gray-700 p-2 rounded">
                      <p className="text-gray-400">Workspaces</p>
                      <p className="text-white font-bold">{plan.max_workspaces || 0 === 0 ? '∞' : plan.max_workspaces}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-300">Fitur ({(plan.features || []).length}):</p>
                    <ul className="text-sm space-y-1">
                      {(plan.features || []).slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-300">
                          <span className="text-green-500">✓</span>
                          <span className="line-clamp-1">{feature}</span>
                        </li>
                      ))}
                      {(plan.features || []).length > 3 && (
                        <li className="text-gray-500 text-xs">
                          +{(plan.features || []).length - 3} fitur lainnya
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPlan(plan)}
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePlan(plan.id)}
                      className="text-red-400 border-red-600 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {plans.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada paket langganan</p>
              <Button onClick={() => setShowPlanForm(true)} className="mt-4 bg-blue-600 hover:bg-blue-700">
                Tambah Paket Pertama
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="addons" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Kelola Addon AI ({addons.length})</h3>
            <Button onClick={() => {
              resetAddonForm();
              setEditingAddon(null);
              setShowAddonForm(true);
            }} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Addon
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {addons.map((addon) => (
              <Card key={addon.id} className={`bg-gray-800 border-gray-700 ${!addon.isActive ? 'opacity-50' : ''}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    <span>{addon.name}</span>
                    {addon.popular && (
                      <Badge className="bg-yellow-500 text-white">⭐ Popular</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold text-purple-400">
                      {(addon.requests || 0).toLocaleString('id-ID')}
                      <span className="text-sm text-gray-400 ml-2">AI Requests</span>
                    </div>
                    <div className="text-2xl font-semibold text-green-400 mt-2">
                      Rp {(addon.price || 0).toLocaleString('id-ID')}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditAddon(addon)}
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAddon(addon.id)}
                      className="text-red-400 border-red-600 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {addons.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada addon AI</p>
              <Button onClick={() => setShowAddonForm(true)} className="mt-4 bg-purple-600 hover:bg-purple-700">
                Tambah Addon Pertama
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Plan Form Dialog */}
      <Dialog open={showPlanForm} onOpenChange={(open) => {
        if (!open) {
          setShowPlanForm(false);
          setEditingPlan(null);
          resetPlanForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              {editingPlan ? `✏️ Edit Paket: ${editingPlan.name}` : '➕ Tambah Paket Baru'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePlanSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Plan Key * <span className="text-xs text-gray-500">(unique identifier)</span></Label>
                <Input
                  value={planFormData.planKey}
                  onChange={(e) => setPlanFormData({...planFormData, planKey: e.target.value.toLowerCase()})}
                  placeholder="pro, business, enterprise"
                  required
                  disabled={!!editingPlan}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Nama Paket *</Label>
                <Input
                  value={planFormData.name}
                  onChange={(e) => setPlanFormData({...planFormData, name: e.target.value})}
                  placeholder="Pro, Business, Enterprise"
                  required
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Deskripsi</Label>
              <Textarea
                value={planFormData.description}
                onChange={(e) => setPlanFormData({...planFormData, description: e.target.value})}
                placeholder="Untuk professional dan freelancer"
                className="bg-gray-800 border-gray-600 text-white"
                rows={2}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">💰 Harga Bulanan (Rp) *</Label>
                <Input
                  type="number"
                  value={planFormData.price}
                  onChange={(e) => setPlanFormData({...planFormData, price: e.target.value})}
                  required
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">💰 Harga Tahunan (Rp) *</Label>
                <Input
                  type="number"
                  value={planFormData.yearlyPrice}
                  onChange={(e) => setPlanFormData({...planFormData, yearlyPrice: e.target.value})}
                  required
                  className="bg-gray-800 border-gray-600 text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Saran diskon 2 bulan: Rp {((planFormData.price || 0) * 10).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Kuota & Limit Sistem (0 = Unlimited)
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-300">🤖 AI Credits/Bulan</Label>
                  <Input
                    type="number"
                    value={planFormData.ai_credits_per_month}
                    onChange={(e) => setPlanFormData({...planFormData, ai_credits_per_month: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">💾 Storage (MB)</Label>
                  <Input
                    type="number"
                    value={planFormData.max_storage_mb}
                    onChange={(e) => setPlanFormData({...planFormData, max_storage_mb: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">🏢 Company Slots</Label>
                  <Input
                    type="number"
                    value={planFormData.company_slots}
                    onChange={(e) => setPlanFormData({...planFormData, company_slots: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Jumlah company yang bisa dibuat</p>
                </div>

                <div>
                  <Label className="text-gray-300">📝 Max Tasks</Label>
                  <Input
                    type="number"
                    value={planFormData.max_tasks}
                    onChange={(e) => setPlanFormData({...planFormData, max_tasks: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">📄 Max Notes</Label>
                  <Input
                    type="number"
                    value={planFormData.max_notes}
                    onChange={(e) => setPlanFormData({...planFormData, max_notes: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">🏠 Max Workspaces</Label>
                  <Input
                    type="number"
                    value={planFormData.max_workspaces}
                    onChange={(e) => setPlanFormData({...planFormData, max_workspaces: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">✨ Fitur-fitur</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Contoh: Unlimited Tugas"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  className="bg-gray-800 border-gray-600 text-white"
                />
                <Button type="button" onClick={addFeature} size="sm" className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {planFormData.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-800 border border-gray-700 rounded">
                    <span className="flex-1 text-sm text-gray-300">{feature}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeature(idx)}
                      className="text-red-400 hover:bg-red-900/20"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-gray-300">⚠️ Limitasi (opsional)</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newLimitation}
                  onChange={(e) => setNewLimitation(e.target.value)}
                  placeholder="Contoh: Tidak ada fitur Company/ERP"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLimitation())}
                  className="bg-gray-800 border-gray-600 text-white"
                />
                <Button type="button" onClick={addLimitation} size="sm" className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {planFormData.limitations.map((limitation, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-800 border border-gray-700 rounded">
                    <span className="flex-1 text-sm text-gray-300">{limitation}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLimitation(idx)}
                      className="text-red-400 hover:bg-red-900/20"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-300">🎨 Gradient Color</Label>
                <Input
                  value={planFormData.color}
                  onChange={(e) => setPlanFormData({...planFormData, color: e.target.value})}
                  placeholder="from-blue-600 to-indigo-600"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">🔢 Urutan Tampilan</Label>
                <Input
                  type="number"
                  value={planFormData.order}
                  onChange={(e) => setPlanFormData({...planFormData, order: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={planFormData.popular}
                      onChange={(e) => setPlanFormData({...planFormData, popular: e.target.checked})}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Popular</span>
                  </label>
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={planFormData.isActive}
                      onChange={(e) => setPlanFormData({...planFormData, isActive: e.target.checked})}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Aktif</span>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowPlanForm(false)} disabled={isSaving} className="border-gray-600 text-gray-300">
                Batal
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingPlan ? 'Update' : 'Tambah'} Paket
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Addon Form Dialog */}
      <Dialog open={showAddonForm} onOpenChange={(open) => {
        if (!open) {
          setShowAddonForm(false);
          setEditingAddon(null);
          resetAddonForm();
        }
      }}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingAddon ? `✏️ Edit Addon: ${editingAddon.name}` : '➕ Tambah Addon Baru'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddonSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-300">Addon Key * <span className="text-xs text-gray-500">(unique)</span></Label>
              <Input
                value={addonFormData.key}
                onChange={(e) => setAddonFormData({...addonFormData, key: e.target.value})}
                placeholder="500_requests, 1000_requests"
                required
                disabled={!!editingAddon}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Nama Addon *</Label>
              <Input
                value={addonFormData.name}
                onChange={(e) => setAddonFormData({...addonFormData, name: e.target.value})}
                placeholder="500 AI Requests"
                required
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">🤖 Jumlah AI Requests *</Label>
                <Input
                  type="number"
                  value={addonFormData.requests}
                  onChange={(e) => setAddonFormData({...addonFormData, requests: e.target.value})}
                  required
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">💰 Harga (Rp) *</Label>
                <Input
                  type="number"
                  value={addonFormData.price}
                  onChange={(e) => setAddonFormData({...addonFormData, price: e.target.value})}
                  required
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">🔢 Urutan Tampilan</Label>
                <Input
                  type="number"
                  value={addonFormData.order}
                  onChange={(e) => setAddonFormData({...addonFormData, order: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={addonFormData.popular}
                      onChange={(e) => setAddonFormData({...addonFormData, popular: e.target.checked})}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Popular</span>
                  </label>
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={addonFormData.isActive}
                      onChange={(e) => setAddonFormData({...addonFormData, isActive: e.target.checked})}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Aktif</span>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddonForm(false)} disabled={isSaving} className="border-gray-600 text-gray-300">
                Batal
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingAddon ? 'Update' : 'Tambah'} Addon
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}