import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Radio, Send, Users, Eye, ChevronDown, ChevronUp, TrendingUp, Clock, DollarSign, RefreshCw, AlertCircle, Link as LinkIcon } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { format, isToday } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const PLATFORMS = [
  { value: 'TikTok Live', icon: '🎵', color: 'bg-black text-white' },
  { value: 'Shopee Live', icon: '🛒', color: 'bg-orange-500 text-white' },
  { value: 'Instagram Live', icon: '📸', color: 'bg-pink-500 text-white' },
  { value: 'YouTube Live', icon: '▶️', color: 'bg-red-600 text-white' },
  { value: 'Facebook Live', icon: '👥', color: 'bg-blue-600 text-white' },
  { value: 'Lazada Live', icon: '🛍️', color: 'bg-blue-700 text-white' },
];

function parseLog(content = '') {
  const lines = content.split('\n');
  const get = (p) => lines.find(l => l.startsWith(p))?.replace(p, '').trim() || '';
  const catatanIdx = lines.findIndex(l => l === 'Catatan:');
  const catatan = catatanIdx !== -1 ? lines.slice(catatanIdx + 1).join('\n').trim() : get('Catatan:');
  return { platform: get('Platform:'), host: get('Host:'), durasi: get('Durasi:'), penonton: get('Penonton:'), omset: get('Omset:'), link: get('Link Live:'), catatan };
}

function LogCard({ log }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = useMemo(() => parseLog(log.content), [log.content]);
  const platformCfg = PLATFORMS.find(p => p.value === parsed.platform);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 p-4">
        {platformCfg && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${platformCfg.color}`}>
            {platformCfg.icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{log.title}</p>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            {parsed.host && <span>🎙️ {parsed.host}</span>}
            {parsed.durasi && <span>⏱️ {parsed.durasi}</span>}
            {parsed.penonton && <span>👥 {parsed.penonton}</span>}
            {parsed.omset && <span className="font-semibold text-green-600 dark:text-green-400">💰 {parsed.omset}</span>}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">
            {log.created_date ? format(new Date(log.created_date), 'dd MMM yyyy · HH:mm', { locale: localeId }) : ''}
          </span>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {expanded && parsed.catatan && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Evaluasi</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">{parsed.catatan}</p>
          {parsed.link && parsed.link !== '-' && (
            <a href={parsed.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-500 hover:underline mt-2">
              <LinkIcon className="w-3 h-3" /> {parsed.link}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function FormLiveStreaming({ workspace, user }) {
  const [loading, setLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('form');
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    platform: '', hostId: '', hostName: '', liveLink: '',
    duration: '', viewers: '', turnover: '', notes: ''
  });

  useEffect(() => { loadData(); }, [workspace?.company_id]);

  const loadData = async () => {
    if (!workspace?.company_id) return;
    setLoadingLogs(true);
    try {
      const [members, tasks] = await Promise.all([
        base44.entities.CompanyMember.filter({ company_id: workspace.company_id, status: 'active' }),
        base44.entities.Task.filter({ workspace_id: workspace.id })
      ]);
      setEmployees(members || []);
      setRecentLogs((tasks || []).filter(t => t.task_type === 'live_streaming_log').sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (e) { console.warn('load data error:', e); }
    finally { setLoadingLogs(false); }
  };

  const validate = () => {
    const errs = {};
    if (!formData.platform) errs.platform = 'Platform wajib dipilih';
    if (!formData.hostId) errs.hostId = 'Host wajib dipilih';
    if (!formData.duration) errs.duration = 'Durasi wajib diisi';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const omsetFormatted = formData.turnover ? `Rp ${Number(formData.turnover).toLocaleString('id-ID')}` : 'Rp 0';
      const taskBody = `Platform: ${formData.platform}\nHost: ${formData.hostName}\nLink Live: ${formData.liveLink || '-'}\nDurasi: ${formData.duration} Jam\nPenonton: ${formData.viewers} Views\nOmset: ${omsetFormatted}\n\nCatatan:\n${formData.notes}`;
      await base44.entities.Task.create({
        title: `Live (${formData.platform}) - ${formData.hostName} - ${format(new Date(), 'dd/MM/yyyy', { locale: localeId })}`,
        content: taskBody, workspace_id: workspace.id, created_by: user?.email,
        company_id: workspace.company_id || null, assignee_id: formData.hostId || null,
        status: 'done', priority: 'medium', task_type: 'live_streaming_log'
      });
      toast.success('Data Live Streaming berhasil disimpan! 🔴', { description: `${formData.platform} · ${formData.hostName}` });
      setFormData({ platform: '', hostId: '', hostName: '', liveLink: '', duration: '', viewers: '', turnover: '', notes: '' });
      setErrors({});
      loadData();
      window.dispatchEvent(new CustomEvent('taskCreated', { detail: { workspaceId: workspace.id } }));
    } catch (error) {
      toast.error('Gagal menyimpan data live streaming');
    } finally { setLoading(false); }
  };

  // Stats
  const statsData = useMemo(() => {
    const totalOmset = recentLogs.reduce((sum, l) => {
      const p = parseLog(l.content);
      const cleaned = (p.omset || '').replace(/[^0-9]/g, '');
      return sum + (parseInt(cleaned) || 0);
    }, 0);
    return {
      total: recentLogs.length,
      today: recentLogs.filter(l => l.created_date && isToday(new Date(l.created_date))).length,
      totalOmset,
      avgViewers: recentLogs.length > 0 ? Math.round(recentLogs.reduce((sum, l) => {
        const p = parseLog(l.content);
        return sum + (parseInt(p.penonton) || 0);
      }, 0) / recentLogs.length) : 0,
    };
  }, [recentLogs]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-xl shadow-md">
            <div className="animate-pulse"><Radio className="w-5 h-5" /></div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Live Streaming</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Rekap performa sesi live streaming</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loadingLogs} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Sesi', value: statsData.total, icon: Radio, color: 'text-red-500' },
          { label: 'Hari Ini', value: statsData.today, icon: Clock, color: 'text-indigo-500' },
          { label: 'Total Omset', value: statsData.totalOmset > 0 ? `Rp ${(statsData.totalOmset / 1000000).toFixed(1)}jt` : 'Rp 0', icon: DollarSign, color: 'text-green-500' },
          { label: 'Rata Penonton', value: statsData.avgViewers, icon: Users, color: 'text-blue-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border dark:border-gray-700">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${color}`}><Icon className="w-4 h-4" /></div>
              <div><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="form" className="gap-2"><Send className="w-4 h-4" /> Input Laporan Live</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Eye className="w-4 h-4" /> Riwayat Log
            {recentLogs.length > 0 && <Badge className="ml-1 bg-red-600 text-white text-xs px-1.5 py-0">{recentLogs.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="form">
          <Card className="border dark:border-gray-700 shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Platform + Host */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Platform <span className="text-red-500">*</span></Label>
                    <Select value={formData.platform} onValueChange={(val) => { setFormData({ ...formData, platform: val }); if (errors.platform) setErrors({ ...errors, platform: '' }); }}>
                      <SelectTrigger className={errors.platform ? 'border-red-500' : ''}><SelectValue placeholder="-- Pilih Platform --" /></SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.icon} {p.value}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.platform && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.platform}</p>}
                    {/* Platform preview */}
                    {formData.platform && (() => {
                      const p = PLATFORMS.find(x => x.value === formData.platform);
                      return p ? (
                        <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${p.color}`}>
                          {p.icon} {p.value}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Nama Host <span className="text-red-500">*</span></Label>
                    <Select value={formData.hostId} onValueChange={(val) => {
                      const m = employees.find(x => x.user_id === val || x.id === val);
                      setFormData({ ...formData, hostId: val, hostName: m?.user_name || val });
                      if (errors.hostId) setErrors({ ...errors, hostId: '' });
                    }}>
                      <SelectTrigger className={errors.hostId ? 'border-red-500' : ''}><SelectValue placeholder="-- Pilih Host --" /></SelectTrigger>
                      <SelectContent>
                        {employees.map(m => <SelectItem key={m.id} value={m.user_id || m.id}>{m.user_name || m.user_email}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.hostId && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.hostId}</p>}
                  </div>
                </div>

                {/* Link */}
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5 text-blue-500" /> Link Live / Bukti Streaming</Label>
                  <Input placeholder="https://..." value={formData.liveLink} onChange={(e) => setFormData({ ...formData, liveLink: e.target.value })} />
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Durasi (Jam) <span className="text-red-500">*</span></Label>
                    <Input type="number" min="0" step="0.5" placeholder="Contoh: 2" value={formData.duration} onChange={(e) => { setFormData({ ...formData, duration: e.target.value }); if (errors.duration) setErrors({ ...errors, duration: '' }); }} className={errors.duration ? 'border-red-500' : ''} />
                    {errors.duration && <p className="text-xs text-red-500">{errors.duration}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-500" /> Total Penonton</Label>
                    <Input type="number" min="0" placeholder="0" value={formData.viewers} onChange={(e) => setFormData({ ...formData, viewers: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-green-500" /> Total Omset (Rp)</Label>
                    <Input type="number" min="0" placeholder="500000" value={formData.turnover} onChange={(e) => setFormData({ ...formData, turnover: e.target.value })} />
                    {formData.turnover && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                        Rp {Number(formData.turnover).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Catatan */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Catatan Performa / Evaluasi</Label>
                  <Textarea className="min-h-[90px] resize-none" placeholder="Evaluasi performa live (kendala, produk terlaris, masukan penonton)..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold h-11 shadow-md">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : <><Send className="w-4 h-4 mr-2" /> Simpan Laporan Live</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="border dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-3">
              <p className="text-xs text-gray-500">{loadingLogs ? 'Memuat...' : `${recentLogs.length} sesi live streaming`}</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-red-500 mr-2" />
                  <span className="text-sm text-gray-500">Memuat log...</span>
                </div>
              ) : recentLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-gray-600">
                  <Radio className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Belum ada log live streaming</p>
                </div>
              ) : (
                recentLogs.map(log => <LogCard key={log.id} log={log} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}