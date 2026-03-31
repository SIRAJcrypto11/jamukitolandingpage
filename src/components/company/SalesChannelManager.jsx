import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Edit, Trash2, Save, Store, Smartphone,
  Globe, RefreshCw, GripVertical, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Default channels yang sudah ada di sistem
const SYSTEM_CHANNELS = [
  { value: 'OFFLINE', label: 'Offline / Toko Langsung', icon: '🏪', category: 'offline' },
  { value: 'SHOPEE', label: 'Shopee', icon: '🛒', category: 'marketplace' },
  { value: 'TOKOPEDIA', label: 'Tokopedia', icon: '🟢', category: 'marketplace' },
  { value: 'TIKTOK', label: 'TikTok Shop', icon: '🎵', category: 'marketplace' },
  { value: 'GRAB', label: 'GrabFood/Mart', icon: '🟩', category: 'delivery' },
  { value: 'GOJEK', label: 'GoFood/Mart', icon: '🟢', category: 'delivery' },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: '💬', category: 'social' },
  { value: 'WEBSITE', label: 'Website', icon: '🌐', category: 'online' },
  { value: 'ONLINE_DALAM_KOTA', label: 'Online Dalam Kota', icon: '🏙️', category: 'online' },
  { value: 'ONLINE_LUAR_KOTA', label: 'Online Luar Kota', icon: '🏘️', category: 'online' },
  { value: 'ONLINE_LUAR_PROVINSI', label: 'Online Luar Provinsi', icon: '🗾', category: 'online' },
  { value: 'OTHER', label: 'Lainnya', icon: '📦', category: 'other' },
];

const CATEGORY_CONFIG = {
  offline: { label: 'Offline', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  marketplace: { label: 'Marketplace', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  delivery: { label: 'Delivery', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  social: { label: 'Social Media', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  online: { label: 'Online', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  whatsapp_custom: { label: 'WhatsApp Custom', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  other: { label: 'Lainnya', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
};

export default function SalesChannelManager({ companyId, companyName }) {
  const [settings, setSettings] = useState(null);
  const [customChannels, setCustomChannels] = useState([]);
  const [systemChannelLabels, setSystemChannelLabels] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [newChannel, setNewChannel] = useState({
    value: '', label: '', icon: '📦', category: 'other', is_active: true, description: ''
  });

  useEffect(() => {
    if (companyId) loadSettings();
  }, [companyId]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const result = await base44.entities.CompanyPOSSettings.filter({ company_id: companyId });
      const existingSettings = result?.[0];

      if (existingSettings) {
        setSettings(existingSettings);
        const channels = existingSettings.sales_channels_config?.custom_channels || [];
        const labels = existingSettings.sales_channels_config?.system_channel_labels || {};
        setCustomChannels(channels);
        setSystemChannelLabels(labels);
      } else {
        // Create default settings
        const defaultSettings = await base44.entities.CompanyPOSSettings.create({
          company_id: companyId,
          sales_channels_config: {
            custom_channels: [
              // Default custom WA channels sesuai permintaan user
              { value: 'WA_DALAM_KOTA', label: 'WA - Online Dalam Kota', icon: '💬', category: 'whatsapp_custom', is_active: true, description: 'Orderan WA area dalam kota' },
              { value: 'WA_LUAR_KOTA', label: 'WA - Online Luar Kota', icon: '💬', category: 'whatsapp_custom', is_active: true, description: 'Orderan WA area luar kota' },
              { value: 'WA_LUAR_PROVINSI', label: 'WA - Online Luar Provinsi', icon: '💬', category: 'whatsapp_custom', is_active: true, description: 'Orderan WA antar provinsi' },
              { value: 'ONLINE_DALAM_KOTA', label: 'Online Dalam Kota', icon: '🏙️', category: 'online', is_active: true, description: 'Orderan Online area dalam kota' },
              { value: 'ONLINE_LUAR_KOTA', label: 'Online Luar Kota', icon: '🏘️', category: 'online', is_active: true, description: 'Orderan Online area luar kota' },
              { value: 'ONLINE_LUAR_PROVINSI', label: 'Online Luar Provinsi', icon: '🗾', category: 'online', is_active: true, description: 'Orderan Online antar provinsi' },
            ],
            system_channel_labels: {}
          }
        });
        setSettings(defaultSettings);
        setCustomChannels(defaultSettings.sales_channels_config?.custom_channels || []);
        setSystemChannelLabels({});
      }
    } catch (e) {
      console.error('Load settings error:', e);
      toast.error('Gagal memuat pengaturan channel');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (updatedChannels, updatedLabels) => {
    setIsSaving(true);
    try {
      const newConfig = {
        sales_channels_config: {
          custom_channels: updatedChannels ?? customChannels,
          system_channel_labels: updatedLabels ?? systemChannelLabels
        }
      };

      if (settings?.id) {
        await base44.entities.CompanyPOSSettings.update(settings.id, newConfig);
        setSettings({ ...settings, ...newConfig });
      } else {
        const created = await base44.entities.CompanyPOSSettings.create({
          company_id: companyId,
          ...newConfig
        });
        setSettings(created);
      }

      // Broadcast perubahan ke POS
      try {
        const ch = new BroadcastChannel('snishop_pos_updates');
        ch.postMessage({ type: 'SALES_CHANNELS_UPDATED', companyId, timestamp: Date.now() });
        ch.close();
      } catch (e) {}

      toast.success('✅ Pengaturan channel berhasil disimpan!');
    } catch (e) {
      toast.error('Gagal menyimpan: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddChannel = async () => {
    if (!newChannel.value.trim() || !newChannel.label.trim()) {
      toast.error('Kode dan nama channel wajib diisi');
      return;
    }

    // Validasi: value harus uppercase, no space
    const channelValue = newChannel.value.toUpperCase().replace(/\s+/g, '_');

    // Cek duplikat
    const allValues = [
      ...SYSTEM_CHANNELS.map(c => c.value),
      ...customChannels.map(c => c.value)
    ];
    if (allValues.includes(channelValue)) {
      toast.error(`Kode "${channelValue}" sudah digunakan`);
      return;
    }

    const channelToAdd = {
      ...newChannel,
      value: channelValue,
      created_at: new Date().toISOString()
    };

    const updated = [...customChannels, channelToAdd];
    setCustomChannels(updated);
    await saveSettings(updated, systemChannelLabels);
    setNewChannel({ value: '', label: '', icon: '📦', category: 'other', is_active: true, description: '' });
    setShowAddForm(false);
  };

  const handleEditChannel = async (index, updatedData) => {
    const updated = [...customChannels];
    updated[index] = { ...updated[index], ...updatedData };
    setCustomChannels(updated);
    await saveSettings(updated, systemChannelLabels);
    setEditingChannel(null);
  };

  const handleToggleChannel = async (index) => {
    const updated = [...customChannels];
    updated[index] = { ...updated[index], is_active: !updated[index].is_active };
    setCustomChannels(updated);
    await saveSettings(updated, systemChannelLabels);
  };

  const handleDeleteChannel = async (index) => {
    if (!confirm(`Hapus channel "${customChannels[index].label}"? Ini akan mempengaruhi laporan POS.`)) return;
    const updated = customChannels.filter((_, i) => i !== index);
    setCustomChannels(updated);
    await saveSettings(updated, systemChannelLabels);
    toast.success('Channel dihapus');
  };

  const handleUpdateSystemLabel = async (channelValue, newLabel) => {
    const updated = { ...systemChannelLabels, [channelValue]: newLabel };
    setSystemChannelLabels(updated);
    await saveSettings(customChannels, updated);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span className="text-gray-500">Memuat pengaturan channel...</span>
      </div>
    );
  }

  const allChannels = [
    ...SYSTEM_CHANNELS.map(c => ({ ...c, isSystem: true, is_active: true })),
    ...customChannels
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-500" />
            Manajemen Channel Penjualan
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {allChannels.length} channel tersedia untuk {companyName}
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" />
          Tambah Channel
        </Button>
      </div>

      {/* Info Banner */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">Channel terintegrasi dengan POS & Laporan</p>
          <p className="text-xs opacity-80">
            Channel bawaan sistem tidak bisa dihapus, tapi bisa diubah labelnya. Channel custom bisa ditambah, edit, dan hapus sesuai kebutuhan bisnis Anda.
          </p>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-md">
          <CardHeader className="pb-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900">
            <CardTitle className="text-base text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Tambah Channel Baru
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Kode Channel <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Contoh: WA_DALAM_KOTA"
                  value={newChannel.value}
                  onChange={(e) => setNewChannel({ ...newChannel, value: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                  className="font-mono uppercase"
                />
                <p className="text-xs text-gray-400">Huruf kapital, pisahkan dengan underscore _</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Nama Tampilan <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Contoh: WA - Online Dalam Kota"
                  value={newChannel.label}
                  onChange={(e) => setNewChannel({ ...newChannel, label: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Ikon (Emoji)</Label>
                <Input
                  placeholder="💬"
                  value={newChannel.icon}
                  onChange={(e) => setNewChannel({ ...newChannel, icon: e.target.value })}
                  className="text-2xl text-center"
                  maxLength={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Kategori</Label>
                <Select value={newChannel.category} onValueChange={(val) => setNewChannel({ ...newChannel, category: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([val, cfg]) => (
                      <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-sm">Deskripsi (Opsional)</Label>
                <Input
                  placeholder="Keterangan channel ini..."
                  value={newChannel.description}
                  onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowAddForm(false); setNewChannel({ value: '', label: '', icon: '📦', category: 'other', is_active: true, description: '' }); }}>
                Batal
              </Button>
              <Button size="sm" onClick={handleAddChannel} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Channel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Channels */}
      <Card className="border dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-500" />
            Channel Bawaan Sistem
            <Badge variant="outline" className="ml-auto text-xs">{SYSTEM_CHANNELS.length} channel</Badge>
          </CardTitle>
          <CardDescription className="text-xs">Ubah nama tampilan sesuai branding bisnis Anda</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {SYSTEM_CHANNELS.map((channel) => (
              <div key={channel.value} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <span className="text-xl w-8 text-center flex-shrink-0">{channel.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {systemChannelLabels[channel.value] || channel.label}
                    </p>
                    <span className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                      {channel.value}
                    </span>
                    <Badge className={`text-xs ${CATEGORY_CONFIG[channel.category]?.color}`}>
                      {CATEGORY_CONFIG[channel.category]?.label}
                    </Badge>
                  </div>
                </div>
                <div className="flex-shrink-0 w-48">
                  <Input
                    size="sm"
                    placeholder={`Label: ${channel.label}`}
                    value={systemChannelLabels[channel.value] || ''}
                    onChange={(e) => {
                      const updated = { ...systemChannelLabels, [channel.value]: e.target.value };
                      setSystemChannelLabels(updated);
                    }}
                    onBlur={(e) => {
                      if (e.target.value !== (systemChannelLabels[channel.value] || '')) {
                        handleUpdateSystemLabel(channel.value, e.target.value);
                      }
                    }}
                    className="text-xs h-8"
                  />
                </div>
                <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-xs flex-shrink-0">System</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Channels */}
      <Card className="border dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-purple-500" />
            Channel Custom
            <Badge variant="outline" className="ml-auto text-xs">{customChannels.length} channel</Badge>
          </CardTitle>
          <CardDescription className="text-xs">Channel yang Anda buat sendiri, termasuk variasi WhatsApp</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {customChannels.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Smartphone className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Belum ada channel custom</p>
              <Button size="sm" onClick={() => setShowAddForm(true)} variant="outline">
                <Plus className="w-4 h-4 mr-1" /> Tambah Channel
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {customChannels.map((channel, index) => (
                <div key={channel.value} className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!channel.is_active ? 'opacity-50' : ''}`}>
                  {editingChannel === index ? (
                    <EditChannelForm
                      channel={channel}
                      onSave={(data) => handleEditChannel(index, data)}
                      onCancel={() => setEditingChannel(null)}
                      isSaving={isSaving}
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 cursor-grab flex-shrink-0" />
                      <span className="text-xl w-8 text-center flex-shrink-0">{channel.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{channel.label}</p>
                          <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{channel.value}</span>
                          <Badge className={`text-xs ${CATEGORY_CONFIG[channel.category]?.color || CATEGORY_CONFIG.other.color}`}>
                            {CATEGORY_CONFIG[channel.category]?.label || channel.category}
                          </Badge>
                          {!channel.is_active && <Badge className="text-xs bg-gray-200 text-gray-500">Nonaktif</Badge>}
                        </div>
                        {channel.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{channel.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Switch
                          checked={channel.is_active !== false}
                          onCheckedChange={() => handleToggleChannel(index)}
                          className="scale-75"
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingChannel(index)}>
                          <Edit className="w-3.5 h-3.5 text-gray-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteChannel(index)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview - Semua channel aktif */}
      <Card className="border dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Preview Channel di POS</CardTitle>
          <CardDescription className="text-xs">Channel aktif yang akan muncul saat transaksi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              ...SYSTEM_CHANNELS.map(c => ({ ...c, customLabel: systemChannelLabels[c.value] })),
              ...customChannels.filter(c => c.is_active !== false)
            ].map(channel => (
              <div key={channel.value} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                <span>{channel.icon}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {channel.customLabel || channel.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EditChannelForm({ channel, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({ ...channel });

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Ikon</Label>
          <Input value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} className="text-center text-xl h-8 text-sm" maxLength={4} />
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs">Nama Tampilan</Label>
          <Input value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Kategori</Label>
          <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_CONFIG).map(([val, cfg]) => (
                <SelectItem key={val} value={val} className="text-xs">{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-4 space-y-1">
          <Label className="text-xs">Deskripsi</Label>
          <Input value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="h-8 text-sm" placeholder="Keterangan channel..." />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="h-7 text-xs">Batal</Button>
        <Button size="sm" onClick={() => onSave(formData)} disabled={isSaving} className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
          {isSaving ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
          Simpan
        </Button>
      </div>
    </div>
  );
}