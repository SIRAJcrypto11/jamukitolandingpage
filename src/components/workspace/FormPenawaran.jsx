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
import { Loader2, Send, Tag, Users, UserPlus, Package, Search, Filter, Eye, ChevronDown, ChevronUp, TrendingUp, CheckCircle2, Clock, RefreshCw, AlertCircle } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { format, isToday } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const STATUS_CONFIG = {
  follow_up: { label: 'Perlu Follow Up', icon: '🔄', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  menunggu_jawaban: { label: 'Menunggu Jawaban', icon: '⏳', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  closing: { label: 'Closing', icon: '✅', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  gagal: { label: 'Gagal/Ditolak', icon: '❌', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

function parseLog(content = '') {
  const lines = content.split('\n');
  const get = (p) => lines.find(l => l.startsWith(p))?.replace(p, '').trim() || '';
  const catatanIdx = lines.findIndex(l => l === 'Catatan:');
  const catatan = catatanIdx !== -1 ? lines.slice(catatanIdx + 1).join('\n').trim() : get('Catatan:');
  return { klien: get('Nama Klien:'), wa: get('No Whatsapp:'), pic: get('PIC:'), produk: get('Produk Ditawarkan:'), status: get('Status:'), catatan };
}

function LogCard({ log }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = useMemo(() => parseLog(log.content), [log.content]);
  const cfg = STATUS_CONFIG[parsed.status] || { label: parsed.status, icon: '❓', color: 'bg-gray-100 text-gray-700' };
  const isDone = log.status === 'done';

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDone ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'}`}>
              {isDone ? '✅ Closing' : '🔄 Proses'}
            </span>
            {parsed.status && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.icon} {cfg.label}</span>}
          </div>
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{log.title}</p>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            {parsed.klien && <span>👤 {parsed.klien}</span>}
            {parsed.wa && parsed.wa !== '-' && <span>📱 {parsed.wa}</span>}
            {parsed.pic && parsed.pic !== '-' && <span>🏷️ {parsed.pic}</span>}
            {parsed.produk && <span>📦 {parsed.produk}</span>}
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
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Catatan</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">{parsed.catatan}</p>
        </div>
      )}
    </div>
  );
}

export default function FormPenawaran({ workspace, user }) {
  const [loading, setLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [useExistingCustomer, setUseExistingCustomer] = useState(false);
  const [activeTab, setActiveTab] = useState('form');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    customerId: '', clientName: '', phone: '', picId: '', picName: '',
    productOffered: '', productId: '', status: 'follow_up', notes: ''
  });

  useEffect(() => { loadData(); }, [workspace?.company_id]);

  const loadData = async () => {
    if (!workspace?.company_id) return;
    setLoadingLogs(true);
    try {
      const [custs, prods, members, tasks] = await Promise.all([
        base44.entities.Customer.filter({ company_id: workspace.company_id }),
        base44.entities.CompanyPOSProduct.filter({ company_id: workspace.company_id, is_active: true }),
        base44.entities.CompanyMember.filter({ company_id: workspace.company_id, status: 'active' }),
        base44.entities.Task.filter({ workspace_id: workspace.id })
      ]);
      setCustomers(custs || []);
      setProducts(prods || []);
      setEmployees(members || []);
      setRecentLogs((tasks || []).filter(t => t.task_type === 'penawaran_log').sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (e) { console.warn('load data error:', e); }
    finally { setLoadingLogs(false); }
  };

  const validate = () => {
    const errs = {};
    if (!formData.clientName) errs.clientName = 'Nama klien wajib diisi';
    if (!formData.notes.trim()) errs.notes = 'Catatan hasil penawaran wajib diisi';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (!useExistingCustomer && formData.clientName && formData.phone) {
        const existing = customers.find(c => c.phone === formData.phone);
        if (!existing) {
          await base44.entities.Customer.create({ company_id: workspace.company_id, name: formData.clientName, phone: formData.phone, whatsapp_number: formData.phone, status: 'prospect', total_orders: 0 });
          toast.info(`${formData.clientName} ditambahkan ke database pelanggan`);
        }
      }
      const taskBody = `Nama Klien: ${formData.clientName}\nNo Whatsapp: ${formData.phone}\nPIC: ${formData.picName || '-'}\nProduk Ditawarkan: ${formData.productOffered}\nStatus: ${formData.status}\n\nCatatan:\n${formData.notes}`;
      await base44.entities.Task.create({
        title: `Penawaran: ${formData.clientName} - ${formData.productOffered || 'Produk'}`,
        content: taskBody, workspace_id: workspace.id, created_by: user?.email,
        company_id: workspace.company_id || null, assignee_id: formData.picId || null,
        status: formData.status === 'closing' ? 'done' : 'in_progress', priority: 'high', task_type: 'penawaran_log'
      });
      toast.success('Data penawaran berhasil disimpan! 🤝', { description: `${formData.clientName} - ${STATUS_CONFIG[formData.status]?.label}` });
      setFormData({ customerId: '', clientName: '', phone: '', picId: '', picName: '', productOffered: '', productId: '', status: 'follow_up', notes: '' });
      setErrors({});
      setUseExistingCustomer(false);
      loadData();
      window.dispatchEvent(new CustomEvent('taskCreated', { detail: { workspaceId: workspace.id } }));
    } catch (error) {
      toast.error('Gagal menyimpan data penawaran');
    } finally { setLoading(false); }
  };

  // Stats
  const statsData = useMemo(() => ({
    total: recentLogs.length,
    closing: recentLogs.filter(l => { const p = parseLog(l.content); return p.status === 'closing'; }).length,
    followUp: recentLogs.filter(l => { const p = parseLog(l.content); return p.status === 'follow_up'; }).length,
    today: recentLogs.filter(l => l.created_date && isToday(new Date(l.created_date))).length,
  }), [recentLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let result = recentLogs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => { const p = parseLog(l.content); return (p.klien + p.produk + l.title).toLowerCase().includes(q); });
    }
    if (filterStatus !== 'all') {
      result = result.filter(l => { const p = parseLog(l.content); return p.status === filterStatus; });
    }
    return result;
  }, [recentLogs, searchQuery, filterStatus]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-md">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Penawaran Produk</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Catat dan pantau penawaran ke klien</p>
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
          { label: 'Total Log', value: statsData.total, icon: Tag, color: 'text-emerald-500' },
          { label: 'Hari Ini', value: statsData.today, icon: Clock, color: 'text-indigo-500' },
          { label: 'Closing', value: statsData.closing, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Follow Up', value: statsData.followUp, icon: TrendingUp, color: 'text-yellow-500' },
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
          <TabsTrigger value="form" className="gap-2"><Send className="w-4 h-4" /> Input Penawaran</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Eye className="w-4 h-4" /> Riwayat Log
            {recentLogs.length > 0 && <Badge className="ml-1 bg-emerald-600 text-white text-xs px-1.5 py-0">{recentLogs.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="form">
          <Card className="border dark:border-gray-700 shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Customer toggle */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant={!useExistingCustomer ? 'default' : 'outline'} onClick={() => setUseExistingCustomer(false)} className="gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" /> Klien Baru
                    </Button>
                    <Button type="button" size="sm" variant={useExistingCustomer ? 'default' : 'outline'} onClick={() => setUseExistingCustomer(true)} className="gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Database ({customers.length})
                    </Button>
                  </div>
                  {useExistingCustomer ? (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Pilih Klien dari Database</Label>
                      <Select value={formData.customerId} onValueChange={(val) => {
                        const c = customers.find(x => x.id === val);
                        setFormData({ ...formData, customerId: val, clientName: c?.name || '', phone: c?.phone || '' });
                      }}>
                        <SelectTrigger><SelectValue placeholder="-- Pilih Pelanggan --" /></SelectTrigger>
                        <SelectContent>
                          {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.phone})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Nama Klien <span className="text-red-500">*</span></Label>
                        <Input placeholder="Nama klien/target" value={formData.clientName} onChange={(e) => { setFormData({ ...formData, clientName: e.target.value }); if (errors.clientName) setErrors({ ...errors, clientName: '' }); }} className={errors.clientName ? 'border-red-500' : ''} />
                        {errors.clientName && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.clientName}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">No. WA / Telepon</Label>
                        <Input placeholder="08xxxxxxxxxx" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-teal-500" /> Produk Ditawarkan</Label>
                    <Select value={formData.productId} onValueChange={(val) => {
                      const p = products.find(x => x.id === val);
                      setFormData({ ...formData, productId: val, productOffered: p?.name || '' });
                    }}>
                      <SelectTrigger><SelectValue placeholder="-- Pilih Produk --" /></SelectTrigger>
                      <SelectContent>
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        <SelectItem value="manual">+ Ketik Manual</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.productId === 'manual' && (
                      <Input placeholder="Nama produk..." value={formData.productOffered} onChange={(e) => setFormData({ ...formData, productOffered: e.target.value })} />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">PIC / Petugas Penawaran</Label>
                    <Select value={formData.picId} onValueChange={(val) => {
                      const m = employees.find(x => x.user_id === val || x.id === val);
                      setFormData({ ...formData, picId: val, picName: m?.user_name || '' });
                    }}>
                      <SelectTrigger><SelectValue placeholder="-- Pilih PIC --" /></SelectTrigger>
                      <SelectContent>
                        {employees.map(m => <SelectItem key={m.id} value={m.user_id || m.id}>{m.user_name || m.user_email}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Status Penawaran</Label>
                  <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                        <SelectItem key={val} value={val}>{cfg.icon} {cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.status && (
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_CONFIG[formData.status]?.color}`}>
                      {STATUS_CONFIG[formData.status]?.icon} {STATUS_CONFIG[formData.status]?.label}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Catatan Hasil Penawaran <span className="text-red-500">*</span></Label>
                  <Textarea
                    className={`min-h-[100px] resize-none ${errors.notes ? 'border-red-500' : ''}`}
                    placeholder="Respon klien, alasan menolak, atau catatan keberhasilan..."
                    value={formData.notes}
                    onChange={(e) => { setFormData({ ...formData, notes: e.target.value }); if (errors.notes) setErrors({ ...errors, notes: '' }); }}
                  />
                  {errors.notes && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.notes}</p>}
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold h-11 shadow-md">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : <><Send className="w-4 h-4 mr-2" /> Simpan Data Penawaran</>}
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
                  <Input placeholder="Cari klien atau produk..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 text-sm h-9" />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
                    <Filter className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                      <SelectItem key={val} value={val}>{cfg.icon} {cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-gray-500 mt-2">{loadingLogs ? 'Memuat...' : `Menampilkan ${filteredLogs.length} dari ${recentLogs.length} log`}</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-2" />
                  <span className="text-sm text-gray-500">Memuat log...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-gray-600">
                  <Tag className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Belum ada log penawaran</p>
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