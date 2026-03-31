import { useState } from 'react';
import { Workspace } from '@/entities/Workspace';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Save, Settings, Globe, AlertTriangle, Palette, Lock } from 'lucide-react';
import { toast } from 'sonner';

const colors = [
  { hex: '#1f2937', name: 'Slate' },
  { hex: '#3b82f6', name: 'Biru' },
  { hex: '#8b5cf6', name: 'Ungu' },
  { hex: '#10b981', name: 'Hijau' },
  { hex: '#ef4444', name: 'Merah' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#ec4899', name: 'Pink' },
];

const icons = ['🏠', '💼', '🚀', '📈', '🎯', '💡', '🔥', '⚡', '🌟', '🏆', '🎨', '📊'];

export default function WorkspaceSettings({ workspace, userRole, onUpdate }) {
  const [formData, setFormData] = useState({
    name: workspace.name,
    description: workspace.description || '',
    icon: workspace.icon || '🏠',
    color: workspace.color || '#3b82f6',
    settings: {
      allow_public_sharing: workspace.settings?.allow_public_sharing || false,
      default_task_priority: workspace.settings?.default_task_priority || 'medium'
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [activeSection, setActiveSection] = useState('general');

  const canEdit = userRole === 'owner';

  const handleSave = async () => {
    if (!canEdit) { toast.error('Hanya pemilik yang dapat mengubah pengaturan workspace'); return; }
    if (!formData.name.trim()) { toast.error('Nama workspace tidak boleh kosong'); return; }

    setIsSaving(true);
    try {
      await Workspace.update(workspace.id, formData);
      toast.success('Pengaturan workspace berhasil disimpan!');
      onUpdate();
    } catch (error) {
      toast.error('Gagal menyimpan pengaturan workspace');
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!canEdit) { toast.error('Hanya pemilik yang dapat menghapus workspace'); return; }
    if (deleteConfirmText !== workspace.name) {
      toast.error(`Ketik nama workspace "${workspace.name}" dengan benar untuk konfirmasi`);
      return;
    }
    try {
      await Workspace.delete(workspace.id);
      toast.success('Workspace berhasil dihapus');
      window.location.href = '/workspaces';
    } catch (error) {
      toast.error('Gagal menghapus workspace');
    }
  };

  const sections = [
    { id: 'general', label: 'Umum', icon: Settings },
    { id: 'appearance', label: 'Tampilan', icon: Palette },
    { id: 'privacy', label: 'Privasi & Izin', icon: Lock },
    ...(canEdit ? [{ id: 'danger', label: 'Zona Bahaya', icon: AlertTriangle }] : []),
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          Pengaturan Workspace
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Kelola pengaturan dan preferensi workspace</p>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Hanya pemilik workspace yang dapat mengubah pengaturan ini. Anda sedang melihat dalam mode read-only.
          </p>
        </div>
      )}

      {/* Section Navigation */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeSection === id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            } ${id === 'danger' ? 'text-red-600 dark:text-red-400' : ''}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* General Section */}
      {activeSection === 'general' && (
        <Card className="border dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informasi Umum</CardTitle>
            <CardDescription>Nama dan deskripsi workspace Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Workspace <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={!canEdit}
                placeholder="Nama workspace..."
                className={!canEdit ? 'opacity-70 cursor-not-allowed' : ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Deskripsi workspace (opsional)"
                disabled={!canEdit}
                className={`min-h-[80px] resize-none ${!canEdit ? 'opacity-70 cursor-not-allowed' : ''}`}
              />
              <p className="text-xs text-gray-400">{formData.description.length} karakter</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appearance Section */}
      {activeSection === 'appearance' && (
        <Card className="border dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> Tampilan</CardTitle>
            <CardDescription>Ikon dan warna tema workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Icon picker */}
            <div className="space-y-2">
              <Label>Ikon Workspace</Label>
              <div className="flex flex-wrap gap-2">
                {icons.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    disabled={!canEdit}
                    title={icon}
                    className={`w-10 h-10 text-xl rounded-xl border-2 transition-all hover:scale-110 ${
                      formData.icon === icon
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-md scale-110'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => canEdit && setFormData(prev => ({ ...prev, icon }))}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label>Warna Tema</Label>
              <div className="flex flex-wrap gap-3">
                {colors.map(({ hex, name }) => (
                  <button
                    key={hex}
                    type="button"
                    disabled={!canEdit}
                    title={name}
                    className={`relative w-9 h-9 rounded-xl border-3 transition-all hover:scale-110 ${
                      formData.color === hex
                        ? 'ring-2 ring-offset-2 ring-gray-600 dark:ring-gray-300 scale-110 shadow-lg'
                        : 'border-2 border-transparent hover:scale-105'
                    } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{ backgroundColor: hex }}
                    onClick={() => canEdit && setFormData(prev => ({ ...prev, color: hex }))}
                  >
                    {formData.color === hex && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div className="mt-3 p-3 rounded-xl flex items-center gap-3"
                style={{ backgroundColor: formData.color + '22', borderColor: formData.color + '44', border: '1px solid' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold text-white"
                  style={{ backgroundColor: formData.color }}>
                  {formData.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: formData.color }}>{formData.name || 'Nama Workspace'}</p>
                  <p className="text-xs text-gray-500">Preview tampilan workspace</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Section */}
      {activeSection === 'privacy' && (
        <Card className="border dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4" /> Privasi & Izin</CardTitle>
            <CardDescription>Kontrol akses dan visibilitas workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <Label className="text-sm font-semibold">Berbagi Publik</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Izinkan anggota untuk membagikan konten workspace secara publik
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.settings.allow_public_sharing}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev, settings: { ...prev.settings, allow_public_sharing: checked }
                }))}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Prioritas Tugas Default</Label>
              <Select
                value={formData.settings.default_task_priority}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev, settings: { ...prev.settings, default_task_priority: value }
                }))}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Rendah</SelectItem>
                  <SelectItem value="medium">🟡 Sedang</SelectItem>
                  <SelectItem value="high">🟠 Tinggi</SelectItem>
                  <SelectItem value="urgent">🔴 Mendesak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      {activeSection === 'danger' && canEdit && (
        <Card className="border-2 border-red-200 dark:border-red-900">
          <CardHeader className="pb-3 bg-red-50 dark:bg-red-950/30">
            <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4" /> Zona Bahaya
            </CardTitle>
            <CardDescription className="text-red-600/70 dark:text-red-400/70">
              Tindakan di bawah ini bersifat permanen dan tidak dapat dibatalkan
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 space-y-3">
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Hapus Workspace</p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                  Menghapus workspace akan menghapus semua tugas, catatan, dan data terkait secara permanen.
                </p>
              </div>
              {!showDeleteConfirm ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Hapus Workspace Ini
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                    Ketik <strong>"{workspace.name}"</strong> untuk konfirmasi:
                  </p>
                  <Input
                    placeholder={workspace.name}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="border-red-300 dark:border-red-700 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleteConfirmText !== workspace.name}
                      className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Hapus Sekarang
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button (not for danger zone) */}
      {canEdit && activeSection !== 'danger' && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 gap-2 shadow-sm">
            <Save className="w-4 h-4" />
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      )}
    </div>
  );
}