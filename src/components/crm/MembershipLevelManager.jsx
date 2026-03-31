import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Award, Plus, Edit2, Trash2, Save, X, Star, Gift,
  Percent, TrendingUp, Zap, Crown, ChevronRight, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const defaultIcons = ['⭐', '🥈', '🥇', '💎', '👑', '🏆', '🎖️', '💫', '✨', '🌟'];
const defaultColors = [
  '#6B7280', '#94A3B8', '#3B82F6', '#8B5CF6',
  '#EC4899', '#F59E0B', '#10B981', '#06B6D4'
];

export default function MembershipLevelManager({ selectedCompany, onUpdate }) {
  const [levels, setLevels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    level_name: '',
    level_key: '',
    icon: '⭐',
    color: '#3B82F6',
    discount_percentage: 0,
    points_multiplier: 1,
    min_purchase: 0,
    benefits: [],
    priority_support: false,
    free_delivery: false,
    birthday_bonus: 0,
    is_active: true,
    order: 0,
    // ✅ Flexible scheme settings
    scheme_type: 'spending', // 'stamp' | 'points' | 'spending' | 'visits' | 'hybrid'
    stamps_required: 10,
    stamp_per_transaction: 1,
    visits_required: 20,
    points_required: 1000,
    auto_upgrade: true
  });

  const [benefitInput, setBenefitInput] = useState('');

  useEffect(() => {
    if (selectedCompany) {
      loadLevels();
    }
  }, [selectedCompany]);

  const loadLevels = async () => {
    try {
      const data = await base44.entities.CustomerMembership.filter({
        company_id: selectedCompany.id
      });
      setLevels(data?.sort((a, b) => (a.order || 0) - (b.order || 0)) || []);
    } catch (error) {
      console.error('Error loading membership levels:', error);
      toast.error('Gagal memuat level membership');
    }
  };

  const handleOpenForm = (level = null) => {
    if (level) {
      setEditingLevel(level);
      setFormData({
        level_name: level.level_name || '',
        level_key: level.level_key || '',
        icon: level.icon || '⭐',
        color: level.color || '#3B82F6',
        discount_percentage: level.discount_percentage || 0,
        points_multiplier: level.points_multiplier || 1,
        min_purchase: level.min_purchase || 0,
        // ✅ Scheme settings with Robust Fallback (Name or Tag detection)
        scheme_type: level.scheme_type ||
          (level.benefits?.includes('SCHEME:STAMP') ? 'stamp' :
            ((level.level_name?.toLowerCase().includes('stamp') || level.level_name?.toLowerCase().includes('reguler')) ? 'stamp' : 'spending')),

        // Strip SCHEME:STAMP from visible benefits in form
        benefits: (level.benefits || []).filter(b => b !== 'SCHEME:STAMP'),
        stamps_required: level.stamps_required || 10,
        stamp_per_transaction: level.stamp_per_transaction || 1,
        visits_required: level.visits_required || 20,
        points_required: level.points_required || 1000,
        auto_upgrade: level.auto_upgrade !== false,
        order: level.order || 0  // ✅ LOAD ORDER correctly
      });
    } else {
      setEditingLevel(null);
      setFormData({
        level_name: '',
        level_key: '',
        icon: '⭐',
        color: '#3B82F6',
        discount_percentage: 0,
        points_multiplier: 1,
        min_purchase: 0,
        benefits: [],
        priority_support: false,
        free_delivery: false,
        birthday_bonus: 0,
        is_active: true,
        order: levels.length,
        // ✅ Scheme defaults
        scheme_type: 'spending',
        stamps_required: 10,
        stamp_per_transaction: 1,
        visits_required: 20,
        points_required: 1000,
        auto_upgrade: true
      });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.level_name || !formData.level_key) {
      toast.error('Nama dan key level wajib diisi');
      return;
    }

    try {
      setIsLoading(true);

      const levelData = {
        company_id: selectedCompany.id,
        level_name: formData.level_name,
        level_key: formData.level_key.toLowerCase().replace(/\s+/g, '_'),
        icon: formData.icon,
        color: formData.color,
        discount_percentage: Number(formData.discount_percentage) || 0,
        points_multiplier: Number(formData.points_multiplier) || 1,
        min_purchase: Number(formData.min_purchase) || 0,
        // ✅ INJECT SCHEME TAG if Stamp selected (Persistence Hack)
        benefits: formData.scheme_type === 'stamp'
          ? [...formData.benefits.filter(b => b !== 'SCHEME:STAMP'), 'SCHEME:STAMP']
          : formData.benefits.filter(b => b !== 'SCHEME:STAMP'),
        priority_support: formData.priority_support,
        free_delivery: formData.free_delivery,
        birthday_bonus: Number(formData.birthday_bonus) || 0,
        is_active: formData.is_active,
        order: Number(formData.order) || 0,
        // ✅ Scheme settings
        scheme_type: formData.scheme_type,
        stamps_required: Number(formData.stamps_required) || 10,
        stamp_per_transaction: Number(formData.stamp_per_transaction) || 1,
        visits_required: Number(formData.visits_required) || 20,
        points_required: Number(formData.points_required) || 1000,
        auto_upgrade: formData.auto_upgrade
      };

      if (editingLevel) {
        await base44.entities.CustomerMembership.update(editingLevel.id, levelData);
        toast.success('✅ Level membership berhasil diupdate!');
      } else {
        await base44.entities.CustomerMembership.create(levelData);
        toast.success('✅ Level membership berhasil dibuat!');
      }

      setShowForm(false);
      setEditingLevel(null);
      loadLevels();
      if (onUpdate) onUpdate();

    } catch (error) {
      console.error('Error saving membership level:', error);
      toast.error('Gagal menyimpan level membership');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (level) => {
    if (!confirm(`Hapus level "${level.level_name}"?`)) return;

    try {
      await base44.entities.CustomerMembership.delete(level.id);
      toast.success('Level membership berhasil dihapus');
      loadLevels();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting level:', error);
      toast.error('Gagal menghapus level');
    }
  };

  const addBenefit = () => {
    if (!benefitInput.trim()) return;
    setFormData({
      ...formData,
      benefits: [...formData.benefits, benefitInput.trim()]
    });
    setBenefitInput('');
  };

  const removeBenefit = (index) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-500" />
            Membership Levels
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">Kelola tier dan benefit membership pelanggan</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadLevels()}
            className="border-gray-700 hover:bg-gray-800 text-gray-400"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => handleOpenForm()}
            className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Level
          </Button>
        </div>
      </div>

      {/* Levels Grid - Mobile 1 col, Desktop 2-3 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {levels.map((level) => (
          <Card key={level.id} className="bg-gray-900 border-gray-700 hover:border-blue-600 transition-all">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl flex-shrink-0"
                    style={{ backgroundColor: `${level.color}20`, border: `2px solid ${level.color}` }}
                  >
                    {level.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm sm:text-base truncate">{level.level_name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {level.level_key}
                      </Badge>
                      {/* Scheme Type Badge */}
                      <Badge className={`text-xs ${level.scheme_type === 'stamp' ? 'bg-purple-600' :
                        level.scheme_type === 'points' ? 'bg-yellow-600' :
                          level.scheme_type === 'visits' ? 'bg-blue-600' :
                            level.scheme_type === 'hybrid' ? 'bg-pink-600' :
                              'bg-green-600'
                        }`}>
                        {level.scheme_type === 'stamp' ? `🎫 ${level.stamps_required || 10} stamp` :
                          level.scheme_type === 'points' ? `⭐ ${level.points_required || 1000} poin` :
                            level.scheme_type === 'visits' ? `📊 ${level.visits_required || 20} kunjungan` :
                              level.scheme_type === 'hybrid' ? '🔄 Hybrid' :
                                `💰 ${level.min_purchase ? `Rp ${(level.min_purchase / 1000000).toFixed(1)}M` : 'Spending'}`}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleOpenForm(level)}
                    className="h-8 w-8"
                  >
                    <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(level)}
                    className="text-red-400 h-8 w-8"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
              {/* Benefits Overview - Mobile Optimized */}
              <div className="space-y-2">
                {level.discount_percentage > 0 && (
                  <div className="flex items-center gap-2 bg-gray-800 p-2 rounded text-xs sm:text-sm">
                    <Percent className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                    <span className="text-white">Diskon {level.discount_percentage}%</span>
                  </div>
                )}
                {level.points_multiplier > 1 && (
                  <div className="flex items-center gap-2 bg-gray-800 p-2 rounded text-xs sm:text-sm">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 flex-shrink-0" />
                    <span className="text-white">Poin {level.points_multiplier}x</span>
                  </div>
                )}
                {level.free_delivery && (
                  <div className="flex items-center gap-2 bg-gray-800 p-2 rounded text-xs sm:text-sm">
                    <Gift className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-white">Gratis Ongkir</span>
                  </div>
                )}
                {level.priority_support && (
                  <div className="flex items-center gap-2 bg-gray-800 p-2 rounded text-xs sm:text-sm">
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-white">Priority Support</span>
                  </div>
                )}
                {level.birthday_bonus > 0 && (
                  <div className="flex items-center gap-2 bg-gray-800 p-2 rounded text-xs sm:text-sm">
                    <Gift className="w-3 h-3 sm:w-4 sm:h-4 text-pink-500 flex-shrink-0" />
                    <span className="text-white">Birthday Bonus {level.birthday_bonus} poin</span>
                  </div>
                )}
              </div>

              {/* Min Purchase - Mobile Optimized */}
              {level.min_purchase > 0 && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400">Min. Pembelian:</p>
                  <p className="text-sm font-bold text-white">
                    Rp {level.min_purchase.toLocaleString('id-ID')}
                  </p>
                </div>
              )}

              {/* Custom Benefits List - Mobile Optimized */}
              {level.benefits && level.benefits.length > 0 && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Benefit Tambahan:</p>
                  <div className="space-y-1">
                    {level.benefits.filter(b => b !== 'SCHEME:STAMP').map((benefit, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <ChevronRight className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {levels.length === 0 && (
          <Card className="bg-gray-900 border-gray-700 col-span-full">
            <CardContent className="p-8 text-center">
              <Award className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Belum ada level membership</p>
              <Button
                onClick={() => handleOpenForm()}
                variant="outline"
                className="mt-4 text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Buat Level Pertama
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Form Dialog - Mobile Optimized */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-gray-900 text-white border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingLevel ? 'Edit' : 'Tambah'} Membership Level
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid grid-cols-2 bg-gray-800 w-full">
              <TabsTrigger value="basic" className="text-xs sm:text-sm">Info Dasar</TabsTrigger>
              <TabsTrigger value="benefits" className="text-xs sm:text-sm">Benefits</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs sm:text-sm">Nama Level *</Label>
                  <Input
                    value={formData.level_name}
                    onChange={(e) => setFormData({ ...formData, level_name: e.target.value })}
                    placeholder="Silver, Gold, Platinum..."
                    className="bg-gray-800 border-gray-700 text-white mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Key (Unique ID) *</Label>
                  <Input
                    value={formData.level_key}
                    onChange={(e) => setFormData({ ...formData, level_key: e.target.value })}
                    placeholder="silver, gold, platinum..."
                    className="bg-gray-800 border-gray-700 text-white mt-1 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs sm:text-sm">Icon Emoji</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white flex-1 text-sm"
                      maxLength={2}
                    />
                    <div className="flex gap-1 flex-wrap">
                      {defaultIcons.slice(0, 5).map((icon) => (
                        <Button
                          key={icon}
                          size="icon"
                          variant="outline"
                          onClick={() => setFormData({ ...formData, icon })}
                          className="h-8 w-8 text-sm"
                        >
                          {icon}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Warna</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-16 flex-shrink-0"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {defaultColors.slice(0, 4).map((color) => (
                        <button
                          key={color}
                          onClick={() => setFormData({ ...formData, color })}
                          className="h-8 w-8 rounded border-2 border-gray-700 hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs sm:text-sm">Min. Total Pembelian (Rp)</Label>
                <Input
                  type="number"
                  value={formData.min_purchase}
                  onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value })}
                  placeholder="0"
                  className="bg-gray-800 border-gray-700 text-white mt-1 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum total pembelian lifetime untuk mendapat level ini
                </p>
              </div>

              <div>
                <Label className="text-xs sm:text-sm">Urutan Level</Label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white mt-1 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Semakin tinggi angka, semakin premium levelnya
                </p>
              </div>

              {/* ✅ SCHEME TYPE SELECTOR */}
              <div className="pt-4 border-t border-gray-700">
                <Label className="text-xs sm:text-sm flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Skema Naik Level
                </Label>
                <select
                  value={formData.scheme_type}
                  onChange={(e) => setFormData({ ...formData, scheme_type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 text-sm"
                >
                  <option value="spending">💰 Berdasarkan Total Belanja (Spending Tier)</option>
                  <option value="stamp">🎫 Berdasarkan Stamp/Cap (Stamp Card)</option>
                  <option value="points">⭐ Berdasarkan Poin Terkumpul</option>
                  <option value="visits">📊 Berdasarkan Jumlah Kunjungan</option>
                  <option value="hybrid">🔄 Hybrid (Kombinasi)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Pilih bagaimana customer dapat naik ke level ini
                </p>
              </div>

              {/* Conditional Scheme Fields */}
              {formData.scheme_type === 'stamp' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div>
                    <Label className="text-xs">🎫 Stamp Dibutuhkan</Label>
                    <Input
                      type="number"
                      value={formData.stamps_required}
                      onChange={(e) => setFormData({ ...formData, stamps_required: e.target.value })}
                      className="bg-gray-900 border-gray-600 text-white mt-1 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Total stamp untuk naik level</p>
                  </div>
                  <div>
                    <Label className="text-xs">Per Transaksi</Label>
                    <Input
                      type="number"
                      value={formData.stamp_per_transaction}
                      onChange={(e) => setFormData({ ...formData, stamp_per_transaction: e.target.value })}
                      className="bg-gray-900 border-gray-600 text-white mt-1 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Stamp per transaksi</p>
                  </div>
                </div>
              )}

              {formData.scheme_type === 'points' && (
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <Label className="text-xs">⭐ Poin Dibutuhkan</Label>
                  <Input
                    type="number"
                    value={formData.points_required}
                    onChange={(e) => setFormData({ ...formData, points_required: e.target.value })}
                    className="bg-gray-900 border-gray-600 text-white mt-1 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Total poin untuk naik ke level ini</p>
                </div>
              )}

              {formData.scheme_type === 'visits' && (
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <Label className="text-xs">📊 Kunjungan Dibutuhkan</Label>
                  <Input
                    type="number"
                    value={formData.visits_required}
                    onChange={(e) => setFormData({ ...formData, visits_required: e.target.value })}
                    className="bg-gray-900 border-gray-600 text-white mt-1 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Jumlah transaksi untuk naik level</p>
                </div>
              )}

              {formData.scheme_type === 'hybrid' && (
                <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-xs text-yellow-400 mb-2">💡 Hybrid: Customer harus memenuhi SALAH SATU kriteria</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">💰 Min. Belanja (Rp)</Label>
                      <Input
                        type="number"
                        value={formData.min_purchase}
                        onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value })}
                        className="bg-gray-900 border-gray-600 text-white mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">⭐ Atau Poin</Label>
                      <Input
                        type="number"
                        value={formData.points_required}
                        onChange={(e) => setFormData({ ...formData, points_required: e.target.value })}
                        className="bg-gray-900 border-gray-600 text-white mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">📊 Atau Kunjungan</Label>
                      <Input
                        type="number"
                        value={formData.visits_required}
                        onChange={(e) => setFormData({ ...formData, visits_required: e.target.value })}
                        className="bg-gray-900 border-gray-600 text-white mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">🎫 Atau Stamp</Label>
                      <Input
                        type="number"
                        value={formData.stamps_required}
                        onChange={(e) => setFormData({ ...formData, stamps_required: e.target.value })}
                        className="bg-gray-900 border-gray-600 text-white mt-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-Upgrade Toggle */}
              <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-white text-xs sm:text-sm font-medium">Auto-Upgrade</p>
                    <p className="text-gray-400 text-xs">Otomatis naik level saat threshold tercapai</p>
                  </div>
                </div>
                <Switch
                  checked={formData.auto_upgrade}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_upgrade: checked })}
                />
              </div>
            </TabsContent>

            {/* Benefits Tab */}
            <TabsContent value="benefits" className="space-y-4 mt-4">
              {/* Discount Percentage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs sm:text-sm flex items-center gap-2">
                    <Percent className="w-4 h-4 text-green-500" />
                    Diskon Otomatis (%)
                  </Label>
                  <Badge className="bg-green-600 text-white text-xs">
                    {formData.discount_percentage}%
                  </Badge>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Diskon otomatis setiap transaksi di Kasir
                </p>
              </div>

              {/* Points Multiplier (Used as Stamp Count) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs sm:text-sm flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-500" />
                    Output Stamp per Transaksi
                  </Label>
                  <Badge className="bg-purple-600 text-white text-xs">
                    {formData.points_multiplier} Stamp
                  </Badge>
                </div>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.points_multiplier}
                  onChange={(e) => setFormData({ ...formData, points_multiplier: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Jumlah Stamp yang didapat customer per 1x transaksi (Default: 1)
                </p>
              </div>

              {/* Birthday Bonus */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs sm:text-sm flex items-center gap-2">
                    <Gift className="w-4 h-4 text-pink-500" />
                    Bonus Ulang Tahun (Poin)
                  </Label>
                  <Badge className="bg-pink-600 text-white text-xs">
                    +{formData.birthday_bonus} poin
                  </Badge>
                </div>
                <Input
                  type="number"
                  min="0"
                  value={formData.birthday_bonus}
                  onChange={(e) => setFormData({ ...formData, birthday_bonus: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Bonus poin otomatis di hari ulang tahun
                </p>
              </div>

              {/* Toggle Benefits - Mobile Optimized */}
              <div className="space-y-3 pt-3 border-t border-gray-700">
                <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Zap className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs sm:text-sm font-medium">Priority Support</p>
                      <p className="text-gray-400 text-xs">WhatsApp prioritas</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.priority_support}
                    onCheckedChange={(checked) => setFormData({ ...formData, priority_support: checked })}
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <TrendingUp className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs sm:text-sm font-medium">Gratis Ongkir</p>
                      <p className="text-gray-400 text-xs">Free delivery</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.free_delivery}
                    onCheckedChange={(checked) => setFormData({ ...formData, free_delivery: checked })}
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Award className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs sm:text-sm font-medium">Status Aktif</p>
                      <p className="text-gray-400 text-xs">Tampilkan level ini</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>

              {/* Custom Benefits - Mobile Optimized */}
              <div className="pt-3 border-t border-gray-700">
                <Label className="text-xs sm:text-sm mb-2 block">Benefit Kustom</Label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addBenefit()}
                    placeholder="Tulis benefit lalu tekan Enter..."
                    className="bg-gray-800 border-gray-700 text-white flex-1 text-sm"
                  />
                  <Button onClick={addBenefit} size="icon" className="flex-shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-gray-800 p-2 rounded">
                      <ChevronRight className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-white text-xs sm:text-sm flex-1 min-w-0">{benefit}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeBenefit(idx)}
                        className="h-6 w-6 text-red-400 flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons - Mobile Optimized */}
          <div className="flex gap-2 pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              className="flex-1 text-sm"
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
              disabled={isLoading}
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}