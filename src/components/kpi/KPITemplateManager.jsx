import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, Save, Loader2, FileText, Sparkles, Edit, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const CALC_METHODS = [
  { value: 'manual', label: 'Manual Input', icon: '✏️' },
  { value: 'auto_from_attendance', label: 'Auto dari Absensi', icon: '🕐' },
  { value: 'auto_from_sales', label: 'Auto dari POS/Sales', icon: '💰' },
  { value: 'auto_from_tasks', label: 'Auto dari Tugas Workspace', icon: '✅' },
  { value: 'auto_from_projects', label: 'Auto dari Projects', icon: '📁' },
];

const PRESET_TEMPLATES = [
  {
    template_name: 'Terapis / Sales',
    applicable_roles: ['Terapis', 'Sales'],
    default_metrics: [
      { metric_name: 'Absensi Harian', unit: '%', default_target: 100, weight: 20, calculation_method: 'auto_from_attendance', description: 'Persentase kehadiran' },
      { metric_name: 'Omset Penjualan', unit: 'Rp', default_target: 5000000, weight: 35, calculation_method: 'auto_from_sales', description: 'Total penjualan dari POS' },
      { metric_name: 'Penyelesaian Tugas', unit: '%', default_target: 100, weight: 25, calculation_method: 'auto_from_tasks', description: 'Tugas workspace diselesaikan' },
      { metric_name: 'Penanganan Keluhan', unit: 'kasus', default_target: 0, weight: 10, calculation_method: 'manual', description: 'Jumlah keluhan ditangani' },
      { metric_name: 'Target Live Streaming', unit: 'sesi', default_target: 8, weight: 10, calculation_method: 'manual', description: 'Jumlah sesi live per bulan' },
    ]
  },
  {
    template_name: 'Admin / Operasional',
    applicable_roles: ['Admin', 'Operasional'],
    default_metrics: [
      { metric_name: 'Absensi Harian', unit: '%', default_target: 100, weight: 25, calculation_method: 'auto_from_attendance', description: 'Persentase kehadiran' },
      { metric_name: 'Penyelesaian Tugas', unit: '%', default_target: 100, weight: 40, calculation_method: 'auto_from_tasks', description: 'Tugas workspace diselesaikan' },
      { metric_name: 'Briefing Bulanan', unit: 'sesi', default_target: 20, weight: 20, calculation_method: 'manual', description: 'Kehadiran briefing harian' },
      { metric_name: 'Kualitas Kerja', unit: '%', default_target: 90, weight: 15, calculation_method: 'manual', description: 'Penilaian kualitas oleh supervisor' },
    ]
  },
  {
    template_name: 'Host Live Streaming',
    applicable_roles: ['Host', 'Content Creator'],
    default_metrics: [
      { metric_name: 'Jumlah Sesi Live', unit: 'sesi', default_target: 10, weight: 20, calculation_method: 'manual', description: 'Jumlah sesi live per bulan' },
      { metric_name: 'Total Penonton', unit: 'viewers', default_target: 500, weight: 20, calculation_method: 'manual', description: 'Rata-rata penonton per sesi' },
      { metric_name: 'Omset Live', unit: 'Rp', default_target: 10000000, weight: 35, calculation_method: 'auto_from_sales', description: 'Total omset dari live streaming' },
      { metric_name: 'Absensi', unit: '%', default_target: 100, weight: 15, calculation_method: 'auto_from_attendance', description: 'Kehadiran harian' },
      { metric_name: 'Penawaran Closing', unit: 'deal', default_target: 10, weight: 10, calculation_method: 'manual', description: 'Jumlah penawaran closing' },
    ]
  }
];

function MetricWeightBar({ metrics }) {
  const total = metrics.reduce((s, m) => s + (Number(m.weight) || 0), 0);
  const isValid = Math.abs(total - 100) < 0.1;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Total Bobot Metrik</span>
        <div className="flex items-center gap-2">
          {isValid
            ? <CheckCircle className="w-4 h-4 text-green-400" />
            : <AlertCircle className="w-4 h-4 text-red-400" />
          }
          <span className={`font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>{total}%</span>
          <span className="text-gray-500 text-xs">/ 100%</span>
        </div>
      </div>
      <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${total > 100 ? 'bg-red-500' : total === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
          style={{ width: `${Math.min(total, 100)}%` }}
        />
      </div>
      {!isValid && (
        <p className="text-xs text-red-400">
          {total < 100 ? `Kurang ${100 - total}% lagi untuk mencapai 100%` : `Melebihi 100% sebesar ${total - 100}%`}
        </p>
      )}
    </div>
  );
}

export default function KPITemplateManager({ companyId, onTemplateCreated }) {
  const [templates, setTemplates] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [dynamicRoles, setDynamicRoles] = useState([]);

  const freshForm = () => ({
    template_name: '',
    applicable_roles: [],
    applicable_departments: [],
    default_metrics: [
      { metric_name: 'Absensi Harian', description: 'Persentase kehadiran', default_target: 100, unit: '%', weight: 30, calculation_method: 'auto_from_attendance' },
      { metric_name: 'Penyelesaian Tugas', description: 'Tugas workspace diselesaikan', default_target: 100, unit: '%', weight: 40, calculation_method: 'auto_from_tasks' },
      { metric_name: 'Pencapaian Sales', description: 'Total penjualan dari POS', default_target: 5000000, unit: 'Rp', weight: 30, calculation_method: 'auto_from_sales' },
    ],
    auto_calculate: true,
    calculation_frequency: 'daily',
    is_active: true
  });

  const [formData, setFormData] = useState(freshForm());

  useEffect(() => {
    if (companyId) {
      loadTemplates();
      loadDynamicRoles();
    }
  }, [companyId]);

  const loadDynamicRoles = async () => {
    try {
      const members = await base44.entities.CompanyMember.filter({ company_id: companyId, status: 'active' });
      const positions = [...new Set((members || []).map(m => m.position).filter(Boolean))];
      const departments = [...new Set((members || []).map(m => m.department).filter(Boolean))];
      const roles = [...new Set((members || []).map(m => m.role).filter(Boolean))];
      // Combine all unique labels for roles dropdown
      const allRoles = [...new Set([...positions, ...roles, ...departments, 'Terapis', 'Sales', 'Kasir', 'Admin', 'Owner', 'Host', 'Manager', 'Supervisor'])];
      setDynamicRoles(allRoles.filter(r => r && r.trim()));
    } catch (e) {
      console.error('Load dynamic roles error:', e);
      setDynamicRoles(['Terapis', 'Sales', 'Kasir', 'Admin', 'Owner', 'Host', 'Manager', 'Supervisor', 'Employee']);
    }
  };

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.KPITemplate.filter({ company_id: companyId });
      setTemplates(data || []);
    } catch (e) {
      console.error('Load templates error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const addMetric = () => {
    setFormData(f => ({
      ...f,
      default_metrics: [...f.default_metrics, {
        metric_name: '', description: '', default_target: 100, unit: '%', weight: 0, calculation_method: 'manual'
      }]
    }));
  };

  const removeMetric = (i) => setFormData(f => ({ ...f, default_metrics: f.default_metrics.filter((_, idx) => idx !== i) }));
  const updateMetric = (i, field, val) => {
    const updated = [...formData.default_metrics];
    updated[i] = { ...updated[i], [field]: val };
    setFormData(f => ({ ...f, default_metrics: updated }));
  };

  const autoDistributeWeights = () => {
    const n = formData.default_metrics.length;
    if (n === 0) return;
    const base = Math.floor(100 / n);
    const remainder = 100 - base * n;
    const updated = formData.default_metrics.map((m, i) => ({
      ...m, weight: base + (i < remainder ? 1 : 0)
    }));
    setFormData(f => ({ ...f, default_metrics: updated }));
    toast.success('Bobot dibagi rata otomatis');
  };

  const handleSave = async () => {
    if (!formData.template_name.trim()) {
      toast.error('Nama template wajib diisi');
      return;
    }
    if (formData.default_metrics.length === 0) {
      toast.error('Tambahkan minimal 1 metric');
      return;
    }
    // Validate each metric has a name
    const emptyMetric = formData.default_metrics.find(m => !m.metric_name.trim());
    if (emptyMetric) {
      toast.error('Semua metric harus memiliki nama');
      return;
    }

    const totalWeight = formData.default_metrics.reduce((s, m) => s + (Number(m.weight) || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.5) {
      toast.error(`Total bobot harus 100%. Saat ini: ${totalWeight}%`);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        company_id: companyId,
        template_name: formData.template_name.trim(),
        applicable_roles: formData.applicable_roles || [],
        applicable_departments: formData.applicable_departments || [],
        default_metrics: formData.default_metrics.map(m => ({
          metric_name: m.metric_name,
          description: m.description || '',
          default_target: Number(m.default_target) || 100,
          unit: m.unit || '%',
          weight: Number(m.weight) || 0,
          calculation_method: m.calculation_method || 'manual'
        })),
        auto_calculate: Boolean(formData.auto_calculate),
        calculation_frequency: formData.calculation_frequency || 'daily',
        is_active: true
      };

      if (editingTemplate) {
        await base44.entities.KPITemplate.update(editingTemplate.id, payload);
        toast.success('✅ Template berhasil diperbarui!');
      } else {
        await base44.entities.KPITemplate.create(payload);
        toast.success('✅ KPI Template berhasil disimpan!');
      }

      setIsOpen(false);
      setEditingTemplate(null);
      setFormData(freshForm());
      loadTemplates();
      if (onTemplateCreated) onTemplateCreated();
    } catch (e) {
      console.error('Save template error:', e);
      toast.error('Gagal menyimpan template: ' + (e.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      applicable_roles: template.applicable_roles || [],
      applicable_departments: template.applicable_departments || [],
      default_metrics: template.default_metrics || [],
      auto_calculate: template.auto_calculate !== false,
      calculation_frequency: template.calculation_frequency || 'daily',
      is_active: template.is_active !== false
    });
    setIsOpen(true);
  };

  const handleDuplicate = async (template) => {
    try {
      await base44.entities.KPITemplate.create({
        ...template,
        id: undefined,
        template_name: template.template_name + ' (Copy)',
        company_id: companyId
      });
      toast.success('Template diduplikat');
      loadTemplates();
    } catch (e) { toast.error('Gagal menduplikat'); }
  };

  const deleteTemplate = async (id) => {
    if (!confirm('Hapus template ini?')) return;
    try {
      await base44.entities.KPITemplate.delete(id);
      toast.success('Template dihapus');
      loadTemplates();
    } catch (e) { toast.error('Gagal menghapus'); }
  };

  const loadPreset = (preset) => {
    setFormData(f => ({
      ...f,
      template_name: preset.template_name,
      applicable_roles: preset.applicable_roles,
      default_metrics: preset.default_metrics
    }));
    toast.success(`Preset "${preset.template_name}" dimuat`);
  };

  const openNew = () => {
    setEditingTemplate(null);
    setFormData(freshForm());
    setIsOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              KPI Templates
              <Badge className="bg-purple-600">{templates.length}</Badge>
            </CardTitle>
            <Button onClick={openNew} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Buat Template
            </Button>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Template menentukan metrik & bobot KPI karyawan. Terintegrasi otomatis dengan Absensi, POS, dan Workspace.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>
          ) : templates.length === 0 ? (
            <div className="text-center py-10 text-gray-400 space-y-3">
              <FileText className="w-12 h-12 mx-auto text-gray-600" />
              <p className="font-medium">Belum ada KPI template</p>
              <p className="text-sm">Buat template atau gunakan preset yang tersedia</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {PRESET_TEMPLATES.map(p => (
                  <Button key={p.template_name} size="sm" variant="outline" className="border-purple-600 text-purple-400"
                    onClick={() => { openNew(); setTimeout(() => loadPreset(p), 100); }}>
                    <Sparkles className="w-3 h-3 mr-1" /> {p.template_name}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-purple-700 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-white">{t.template_name}</h3>
                        {t.is_active !== false
                          ? <Badge className="bg-green-700 text-xs">Aktif</Badge>
                          : <Badge className="bg-gray-600 text-xs">Nonaktif</Badge>
                        }
                        {t.auto_calculate && <Badge className="bg-blue-700 text-xs"><Sparkles className="w-2.5 h-2.5 mr-1" />Auto-Calc</Badge>}
                      </div>
                      <div className="flex gap-1.5 flex-wrap mb-2">
                        {t.applicable_roles?.map((r, i) => <Badge key={i} className="bg-blue-800 text-xs">{r}</Badge>)}
                        {t.applicable_departments?.map((d, i) => <Badge key={i} className="bg-purple-800 text-xs">{d}</Badge>)}
                      </div>
                      <p className="text-xs text-gray-400">{t.default_metrics?.length || 0} metrik · {t.calculation_frequency || 'daily'}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400 hover:bg-blue-900/20" onClick={() => handleEdit(t)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:bg-gray-700" onClick={() => handleDuplicate(t)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:bg-red-900/20" onClick={() => deleteTemplate(t.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {t.default_metrics?.slice(0, 6).map((m, i) => {
                      const calcCfg = CALC_METHODS.find(c => c.value === m.calculation_method);
                      return (
                        <div key={i} className="bg-gray-900 p-2 rounded-lg text-xs">
                          <p className="text-gray-300 font-medium truncate">{m.metric_name}</p>
                          <p className="text-gray-500 mt-0.5">{m.default_target} {m.unit} · <span className="text-purple-400">{m.weight}%</span></p>
                          {calcCfg && <span className="text-[10px] text-blue-400">{calcCfg.icon} {calcCfg.label}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setIsOpen(false); setEditingTemplate(null); setFormData(freshForm()); } else setIsOpen(true); }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              {editingTemplate ? 'Edit KPI Template' : 'Buat KPI Template Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Preset buttons */}
            {!editingTemplate && (
              <div className="bg-gray-800 p-3 rounded-xl">
                <p className="text-xs text-gray-400 mb-2 font-medium">⚡ Muat dari Preset:</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TEMPLATES.map(p => (
                    <Button key={p.template_name} size="sm" variant="outline" className="border-purple-600 text-purple-300 text-xs h-7"
                      onClick={() => loadPreset(p)}>
                      {p.template_name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Nama template */}
            <div>
              <Label className="text-gray-300">Nama Template <span className="text-red-400">*</span></Label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData(f => ({ ...f, template_name: e.target.value }))}
                placeholder="Contoh: KPI Terapis Bulanan"
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

            {/* Roles & Departments */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 mb-2 block text-sm">Berlaku untuk Role / Jabatan</Label>
                <div className="bg-gray-800 p-3 rounded-lg space-y-1.5 max-h-40 overflow-y-auto">
                  {(dynamicRoles.length > 0 ? dynamicRoles : ['Terapis', 'Sales', 'Kasir', 'Admin', 'Owner', 'Host', 'Manager', 'Supervisor', 'Employee']).map(role => (
                    <label key={role} className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white">
                      <Checkbox
                        checked={formData.applicable_roles.includes(role)}
                        onCheckedChange={(c) => setFormData(f => ({
                          ...f,
                          applicable_roles: c ? [...f.applicable_roles, role] : f.applicable_roles.filter(r => r !== role)
                        }))}
                      />
                      {role}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-gray-300 mb-2 block text-sm">Berlaku untuk Departemen</Label>
                <div className="bg-gray-800 p-3 rounded-lg space-y-1.5 max-h-40 overflow-y-auto">
                  {(dynamicRoles.length > 0 ? dynamicRoles : ['Sales', 'Terapis', 'Kasir', 'Admin', 'Marketing', 'Operasional', 'Finance', 'IT', 'HR']).map(dept => (
                    <label key={dept} className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white">
                      <Checkbox
                        checked={formData.applicable_departments.includes(dept)}
                        onCheckedChange={(c) => setFormData(f => ({
                          ...f,
                          applicable_departments: c ? [...f.applicable_departments, dept] : f.applicable_departments.filter(d => d !== dept)
                        }))}
                      />
                      {dept}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-white text-base font-semibold">Metrik KPI</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={autoDistributeWeights} className="border-yellow-600 text-yellow-400 text-xs h-8">
                    ⚖️ Rata-kan Bobot
                  </Button>
                  <Button type="button" size="sm" onClick={addMetric} className="bg-blue-600 h-8 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Tambah Metrik
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {formData.default_metrics.map((metric, index) => (
                  <Card key={index} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-300 text-sm font-semibold">Metrik #{index + 1}</span>
                        {formData.default_metrics.length > 1 && (
                          <Button size="icon" variant="ghost" onClick={() => removeMetric(index)} className="h-7 w-7 text-red-400 hover:bg-red-900/20">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 md:col-span-1 space-y-1">
                          <Label className="text-gray-400 text-xs">Nama Metrik <span className="text-red-400">*</span></Label>
                          <Input value={metric.metric_name} onChange={(e) => updateMetric(index, 'metric_name', e.target.value)}
                            className="bg-gray-900 border-gray-600 text-white h-8 text-sm" placeholder="Contoh: Absensi Harian" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-gray-400 text-xs">Satuan (Unit)</Label>
                          <Input value={metric.unit} onChange={(e) => updateMetric(index, 'unit', e.target.value)}
                            className="bg-gray-900 border-gray-600 text-white h-8 text-sm" placeholder="%, Rp, sesi" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-gray-400 text-xs">Target Default</Label>
                          <Input type="number" value={metric.default_target} onChange={(e) => updateMetric(index, 'default_target', Number(e.target.value))}
                            className="bg-gray-900 border-gray-600 text-white h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-gray-400 text-xs">Bobot (%) <span className="text-red-400">*</span></Label>
                          <Input type="number" min="0" max="100" value={metric.weight} onChange={(e) => updateMetric(index, 'weight', Number(e.target.value))}
                            className="bg-gray-900 border-gray-600 text-white h-8 text-sm" />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-gray-400 text-xs">Metode Kalkulasi</Label>
                          <Select value={metric.calculation_method} onValueChange={(v) => updateMetric(index, 'calculation_method', v)}>
                            <SelectTrigger className="bg-gray-900 border-gray-600 text-white h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700">
                              {CALC_METHODS.map(c => (
                                <SelectItem key={c.value} value={c.value} className="text-sm">{c.icon} {c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {metric.calculation_method !== 'manual' && (
                            <p className="text-xs text-blue-400">⚡ Nilai akan diisi otomatis dari data sistem</p>
                          )}
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-gray-400 text-xs">Deskripsi</Label>
                          <Input value={metric.description || ''} onChange={(e) => updateMetric(index, 'description', e.target.value)}
                            className="bg-gray-900 border-gray-600 text-white h-8 text-sm" placeholder="Penjelasan singkat metrik ini" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-3">
                <MetricWeightBar metrics={formData.default_metrics} />
              </div>
            </div>

            {/* Auto-calculate settings */}
            <div className="bg-gray-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white text-sm font-semibold">Auto-Calculate KPI</Label>
                  <p className="text-xs text-gray-400 mt-0.5">Otomatis update nilai KPI dari data Absensi, POS, dan Workspace</p>
                </div>
                <Switch checked={formData.auto_calculate} onCheckedChange={(c) => setFormData(f => ({ ...f, auto_calculate: c }))} />
              </div>
              {formData.auto_calculate && (
                <div className="space-y-1">
                  <Label className="text-gray-400 text-xs">Frekuensi Kalkulasi</Label>
                  <Select value={formData.calculation_frequency} onValueChange={(v) => setFormData(f => ({ ...f, calculation_frequency: v }))}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="daily">🌅 Daily (Setiap Hari)</SelectItem>
                      <SelectItem value="weekly">📅 Weekly (Setiap Minggu)</SelectItem>
                      <SelectItem value="monthly">🗓️ Monthly (Akhir Bulan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-700">
              <Button variant="outline" onClick={() => { setIsOpen(false); setEditingTemplate(null); setFormData(freshForm()); }}
                className="border-gray-700 text-gray-300" disabled={isSaving}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 min-w-[160px]">
                {isSaving
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
                  : <><Save className="w-4 h-4 mr-2" /> {editingTemplate ? 'Update Template' : 'Simpan Template'}</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}