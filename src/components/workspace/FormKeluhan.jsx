import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, MessageSquareWarning, Send, Users, UserPlus, Eye, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Clock, Search, Filter, RefreshCw, XCircle } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const COMPLAINT_TYPES = {
  produk: { label: 'Keluhan Produk', icon: '📦', desc: 'Rusak/Tidak Sesuai' },
  pelayanan: { label: 'Keluhan Pelayanan', icon: '👨‍⚕️', desc: 'Lama/Terapis' },
  pengiriman: { label: 'Keluhan Pengiriman', icon: '🚚', desc: '' },
  hasil: { label: 'Keluhan Hasil', icon: '💊', desc: 'Tidak Manjur/Mual' },
  sosmed: { label: 'Keluhan Sosial Media', icon: '📱', desc: '' },
  lainnya: { label: 'Lainnya', icon: '❓', desc: '' },
};

const STATUS_CONFIG = {
  open: { label: 'Open', icon: '🔴', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  in_progress: { label: 'Proses', icon: '🟡', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  resolved: { label: 'Resolved', icon: '🟢', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
};

function parseLog(content = '') {
  const lines = content.split('\n');
  const get = (p) => lines.find(l => l.startsWith(p))?.replace(p, '').trim() || '';
  const detailIdx = lines.findIndex(l => l === 'Detail Keluhan:');
  const solusiIdx = lines.findIndex(l => l === 'Solusi/Tindakan Diberikan:');
  const detail = detailIdx !== -1 ? lines.slice(detailIdx + 1, solusiIdx !== -1 ? solusiIdx : undefined).join('\n').trim() : get('Detail Keluhan:');
  const solusi = solusiIdx !== -1 ? lines.slice(solusiIdx + 1).join('\n').trim() : get('Solusi/Tindakan Diberikan:');
  return { pelanggan: get('Pelanggan:'), phone: get('No Telepon:'), handler: get('Ditangani Oleh:'), kategori: get('Kategori Keluhan:'), statusText: get('Status:'), detail, solusi };
}

function LogCard({ log }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = useMemo(() => parseLog(log.content), [log.content]);
  const isDone = log.status === 'done';
  const isProgress = log.status === 'in_progress';
  const statusCfg = isDone ? STATUS_CONFIG.resolved : isProgress ? STATUS_CONFIG.in_progress : STATUS_CONFIG.open;
  const typeCfg = COMPLAINT_TYPES[parsed.kategori] || { label: parsed.kategori, icon: '❓' };

  return (
    <div className={`border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isDone ? 'border-green-200 dark:border-green-900' : isProgress ? 'border-yellow-200 dark:border-yellow-900' : 'border-red-200 dark:border-red-900'} bg-white dark:bg-gray-800`}>
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
              {statusCfg.icon} {statusCfg.label}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {typeCfg.icon} {typeCfg.label}
            </span>
          </div>
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{log.title}</p>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            {parsed.pelanggan && <span>👤 {parsed.pelanggan}</span>}
            {parsed.phone && parsed.phone !== '-' && <span>📱 {parsed.phone}</span>}
            {parsed.handler && parsed.handler !== '-' && <span>🏥 {parsed.handler}</span>}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">
            {log.created_date ? format(new Date(log.created_date), 'dd MMM yyyy · HH:mm', { locale: localeId }) : ''}
          </span>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {/* Preview */}
      {!expanded && parsed.detail && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-600 dark:text-red-400 line-clamp-1 flex items-start gap-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />{parsed.detail}
          </p>
        </div>
      )}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          {parsed.detail && (
            <div>
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Detail Keluhan
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-red-50 dark:bg-red-950/20 rounded-lg p-3">{parsed.detail}</p>
            </div>
          )}
          {parsed.solusi && (
            <div>
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Solusi / Tindakan
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-green-50 dark:bg-green-950/20 rounded-lg p-3">{parsed.solusi}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FormKeluhan({ workspace, user }) {
  const [loading, setLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [useExistingCustomer, setUseExistingCustomer] = useState(false);
  const [activeTab, setActiveTab] = useState('form');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    customerId: '', customerName: '', phone: '', handledById: '', handledByName: '',
    complaintType: 'produk', complaintDetail: '', solution: '', status: 'open'
  });

  useEffect(() => { loadData(); }, [workspace?.company_id]);

  const loadData = async () => {
    if (!workspace?.company_id) return;
    setLoadingLogs(true);
    try {
      const [custs, members, tasks] = await Promise.all([
        base44.entities.Customer.filter({ company_id: workspace.company_id }),
        base44.entities.CompanyMember.filter({ company_id: workspace.company_id, status: 'active' }),
        base44.entities.Task.filter({ workspace_id: workspace.id })
      ]);
      setCustomers(custs || []);
      setEmployees(members || []);
      setRecentLogs((tasks || []).filter(t => t.task_type === 'complain_log').sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (e) { console.warn('load data error:', e); }
    finally { setLoadingLogs(false); }
  };

  const validate = () => {
    const errs = {};
    if (!formData.customerName) errs.customerName = 'Nama pelanggan wajib diisi';
    if (!formData.complaintDetail.trim()) errs.complaintDetail = 'Detail keluhan wajib diisi';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const taskBody = `Pelanggan: ${formData.customerName}\nNo Telepon: ${formData.phone}\nDitangani Oleh: ${formData.handledByName || '-'}\nKategori Keluhan: ${formData.complaintType}\nStatus: ${formData.status}\n\nDetail Keluhan:\n${formData.complaintDetail}\n\nSolusi/Tindakan Diberikan:\n${formData.solution}`;
      await base44.entities.Task.create({
        title: `Keluhan - ${formData.customerName} (${COMPLAINT_TYPES[formData.complaintType]?.label || formData.complaintType})`,
        content: taskBody, workspace_id: workspace.id, created_by: user?.email,
        company_id: workspace.company_id || null, assignee_id: formData.handledById || null,
        status: formData.status === 'resolved' ? 'done' : 'in_progress', priority: 'high', task_type: 'complain_log'
      });
      toast.success('Data keluhan berhasil disimpan! ⚠️', { description: `${formData.customerName} - ${COMPLAINT_TYPES[formData.complaintType]?.label}` });
      setFormData({ customerId: '', customerName: '', phone: '', handledById: '', handledByName: '', complaintType: 'produk', complaintDetail: '', solution: '', status: 'open' });
      setErrors({});
      setUseExistingCustomer(false);
      loadData();
      window.dispatchEvent(new CustomEvent('taskCreated', { detail: { workspaceId: workspace.id } }));
    } catch (error) {
      toast.error('Gagal menyimpan data keluhan');
    } finally { setLoading(false); }
  };

  // Stats
  const statsData = useMemo(() => ({
    total: recentLogs.length,
    open: recentLogs.filter(l => l.status !== 'done' && l.status !== 'in_progress').length,
    inProgress: recentLogs.filter(l => l.status === 'in_progress').length,
    resolved: recentLogs.filter(l => l.status === 'done').length,
  }), [recentLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let result = recentLogs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => { const p = parseLog(l.content); return (p.pelanggan + l.title).toLowerCase().includes(q); });
    }
    if (filterStatus !== 'all') {
      if (filterStatus === 'open') result = result.filter(l => l.status !== 'done' && l.status !== 'in_progress');
      else if (filterStatus === 'in_progress') result = result.filter(l => l.status === 'in_progress');
      else if (filterStatus === 'resolved') result = result.filter(l => l.status === 'done');
    }
    return result;
  }, [recentLogs, searchQuery, filterStatus]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-md">
            <MessageSquareWarning className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Keluhan Pelanggan</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Catat dan tangani komplain pelanggan</p>
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
          { label: 'Total Keluhan', value: statsData.total, icon: MessageSquareWarning, color: 'text-amber-500' },
          { label: 'Open', value: statsData.open, icon: XCircle, color: 'text-red-500' },
          { label: 'Dalam Proses', value: statsData.inProgress, icon: Clock, color: 'text-yellow-500' },
          { label: 'Resolved', value: statsData.resolved, icon: CheckCircle2, color: 'text-green-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className={`border dark:border-gray-700 ${value > 0 && label === 'Open' ? 'border-red-200 dark:border-red-900' : ''}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${color}`}><Icon className="w-4 h-4" /></div>
              <div><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="form" className="gap-2"><Send className="w-4 h-4" /> Catat Keluhan</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Eye className="w-4 h-4" /> Riwayat Keluhan
            {statsData.open > 0 && <Badge className="ml-1 bg-red-600 text-white text-xs px-1.5 py-0">{statsData.open} open</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="form">
          <Card className="border dark:border-gray-700 shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Customer Section */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant={!useExistingCustomer ? 'default' : 'outline'} onClick={() => setUseExistingCustomer(false)} className="gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" /> Pelanggan Baru
                    </Button>
                    <Button type="button" size="sm" variant={useExistingCustomer ? 'default' : 'outline'} onClick={() => setUseExistingCustomer(true)} className="gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Database ({customers.length})
                    </Button>
                  </div>
                  {useExistingCustomer ? (
                    <Select value={formData.customerId} onValueChange={(val) => {
                      const c = customers.find(x => x.id === val);
                      setFormData({ ...formData, customerId: val, customerName: c?.name || '', phone: c?.phone || '' });
                    }}>
                      <SelectTrigger><SelectValue placeholder="-- Pilih Pelanggan --" /></SelectTrigger>
                      <SelectContent>
                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.phone})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Nama Pelanggan <span className="text-red-500">*</span></Label>
                        <Input placeholder="Nama pelanggan/pasien" value={formData.customerName} onChange={(e) => { setFormData({ ...formData, customerName: e.target.value }); if (errors.customerName) setErrors({ ...errors, customerName: '' }); }} className={errors.customerName ? 'border-red-500' : ''} />
                        {errors.customerName && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.customerName}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">No. Telepon / WA</Label>
                        <Input placeholder="08xxxxxxxxxx" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Handler */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Ditangani Oleh (Terapis/PIC)</Label>
                  <Select value={formData.handledById} onValueChange={(val) => {
                    const m = employees.find(x => x.user_id === val || x.id === val);
                    setFormData({ ...formData, handledById: val, handledByName: m?.user_name || '' });
                  }}>
                    <SelectTrigger><SelectValue placeholder="-- Pilih Penanggung Jawab --" /></SelectTrigger>
                    <SelectContent>
                      {employees.map(m => <SelectItem key={m.id} value={m.user_id || m.id}>{m.user_name || m.user_email} ({m.role})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Kategori + Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Kategori Keluhan</Label>
                    <Select value={formData.complaintType} onValueChange={(val) => setFormData({ ...formData, complaintType: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(COMPLAINT_TYPES).map(([val, cfg]) => (
                          <SelectItem key={val} value={val}>
                            {cfg.icon} {cfg.label} {cfg.desc && <span className="text-gray-400">({cfg.desc})</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.complaintType && (() => {
                      const cfg = COMPLAINT_TYPES[formData.complaintType];
                      return cfg ? <span className="text-xs text-gray-500 dark:text-gray-400">{cfg.icon} {cfg.label}</span> : null;
                    })()}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Status Penanganan</Label>
                    <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                          <SelectItem key={val} value={val}>{cfg.icon} {cfg.label === 'Resolved' ? 'Resolved (Selesai)' : val === 'open' ? 'Open (Belum Ditangani)' : 'Menunggu Tindak Lanjut'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.status && (
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_CONFIG[formData.status]?.color}`}>
                        {STATUS_CONFIG[formData.status]?.icon} {STATUS_CONFIG[formData.status]?.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Detail Keluhan */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Deskripsi Keluhan <span className="text-red-500">*</span></Label>
                  <Textarea
                    className={`min-h-[100px] resize-none ${errors.complaintDetail ? 'border-red-500' : ''}`}
                    placeholder="Tuliskan secara lengkap detail keluhan dari pelanggan..."
                    value={formData.complaintDetail}
                    onChange={(e) => { setFormData({ ...formData, complaintDetail: e.target.value }); if (errors.complaintDetail) setErrors({ ...errors, complaintDetail: '' }); }}
                  />
                  {errors.complaintDetail && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.complaintDetail}</p>}
                </div>

                {/* Solusi */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-gray-600 dark:text-gray-400">Solusi / Tindakan yang Diberikan <span className="text-xs font-normal">(opsional)</span></Label>
                  <Textarea className="min-h-[80px] resize-none" placeholder="Solusi apa yang sudah/akan diberikan?" value={formData.solution} onChange={(e) => setFormData({ ...formData, solution: e.target.value })} />
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold h-11 shadow-md">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : <><Send className="w-4 h-4 mr-2" /> Simpan Data Komplain</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="border dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input placeholder="Cari pelanggan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 text-sm h-9" />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
                    <Filter className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="open">🔴 Open</SelectItem>
                    <SelectItem value="in_progress">🟡 Dalam Proses</SelectItem>
                    <SelectItem value="resolved">🟢 Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-gray-500 mt-2">{loadingLogs ? 'Memuat...' : `Menampilkan ${filteredLogs.length} dari ${recentLogs.length} keluhan`}</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
                  <span className="text-sm text-gray-500">Memuat log...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-gray-600">
                  <MessageSquareWarning className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">{recentLogs.length === 0 ? 'Belum ada log keluhan' : 'Tidak ada keluhan yang cocok'}</p>
                </div>
              ) : (
                filteredLogs.map(log => <LogCard key={log.id} log={log} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}