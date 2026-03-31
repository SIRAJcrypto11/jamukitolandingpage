import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2, ClipboardList, Send, Users, CheckCircle2, Clock, XCircle,
  AlertCircle, Search, Filter, Calendar, Eye, ChevronDown,
  ChevronUp, RefreshCw, UserCheck, BookOpen, FileText
} from "lucide-react";
import { base44 } from '@/api/base44Client';
import { format, isToday, subDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const ATTENDANCE_OPTIONS = [
  { value: 'hadir', label: 'Hadir (Ontime)', icon: '✅', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'terlambat', label: 'Hadir (Terlambat)', icon: '⏰', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { value: 'sakit', label: 'Sakit', icon: '🤒', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'izin', label: 'Izin', icon: '📋', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  { value: 'alpha', label: 'Alpha', icon: '❌', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
];

function getAttendanceStyle(value) {
  return ATTENDANCE_OPTIONS.find(o => o.value === value) || { label: value, icon: '❓', color: 'bg-gray-100 text-gray-700' };
}

function parseLogContent(content = '') {
  const lines = content.split('\n');
  const get = (prefix) => {
    const line = lines.find(l => l.startsWith(prefix));
    return line ? line.replace(prefix, '').trim() : '';
  };
  const materiIdx = lines.findIndex(l => l === 'Materi Briefing:');
  const catatanIdx = lines.findIndex(l => l === 'Catatan Tambahan:');
  const materi = materiIdx !== -1 ? lines.slice(materiIdx + 1, catatanIdx !== -1 ? catatanIdx : undefined).join('\n').trim() : get('Materi Briefing:');
  const catatan = catatanIdx !== -1 ? lines.slice(catatanIdx + 1).join('\n').trim() : get('Catatan Tambahan:');
  return {
    therapist: get('Therapist:'),
    status: get('Status Kehadiran:'),
    materi,
    catatan,
  };
}

// ──────────────────────────────────────────────────
// SUB-COMPONENT: Stats Bar
// ──────────────────────────────────────────────────
function BriefingStats({ logs }) {
  const todayLogs = logs.filter(l => l.created_date && isToday(new Date(l.created_date)));
  const countByStatus = (status) => logs.filter(l => {
    const p = parseLogContent(l.content);
    return p.status === status;
  }).length;

  const stats = [
    { label: 'Total Log', value: logs.length, icon: FileText, color: 'text-blue-500' },
    { label: 'Hari Ini', value: todayLogs.length, icon: Calendar, color: 'text-indigo-500' },
    { label: 'Hadir', value: countByStatus('hadir') + countByStatus('terlambat'), icon: UserCheck, color: 'text-green-500' },
    { label: 'Absen', value: countByStatus('sakit') + countByStatus('izin') + countByStatus('alpha'), icon: XCircle, color: 'text-red-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="border dark:border-gray-700">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────
// SUB-COMPONENT: Log Card
// ──────────────────────────────────────────────────
function LogCard({ log }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = useMemo(() => parseLogContent(log.content), [log.content]);
  const att = getAttendanceStyle(parsed.status);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 text-sm font-bold text-blue-700 dark:text-blue-300">
            {(parsed.therapist || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
              {parsed.therapist || log.title}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${att.color}`}>
                <span>{att.icon}</span> {att.label}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {log.created_date ? format(new Date(log.created_date), 'dd MMM yyyy · HH:mm', { locale: localeId }) : '-'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={expanded ? 'Tutup' : 'Lihat detail'}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Preview materi (always visible, 1 line) */}
      {!expanded && parsed.materi && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 flex items-start gap-1">
            <BookOpen className="w-3 h-3 flex-shrink-0 mt-0.5" />
            {parsed.materi}
          </p>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          {parsed.materi && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Materi Briefing
              </p>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                {parsed.materi}
              </p>
            </div>
          )}
          {parsed.catatan && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Catatan Tambahan
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                {parsed.catatan}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────
export default function FormBriefing({ workspace, user }) {
  const [loading, setLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('form');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('all'); // all | today | week
  const [formData, setFormData] = useState({
    therapistId: '',
    therapistName: '',
    attendanceStatus: 'hadir',
    briefingMaterial: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadEmployees();
    loadRecentLogs();
  }, [workspace?.company_id, workspace?.id]);

  const loadEmployees = async () => {
    if (!workspace?.company_id) return;
    try {
      const members = await base44.entities.CompanyMember.filter({
        company_id: workspace.company_id,
        status: 'active'
      });
      setEmployees(members || []);
    } catch (e) { console.warn('load employees error:', e); }
  };

  const loadRecentLogs = async () => {
    if (!workspace?.id) return;
    setLoadingLogs(true);
    try {
      const logs = await base44.entities.Task.filter({ workspace_id: workspace.id });
      const briefingLogs = (logs || [])
        .filter(t => t.task_type === 'briefing_log')
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setRecentLogs(briefingLogs);
    } catch (e) {
      console.warn('load logs error:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.therapistName) errs.therapistName = 'Pilih therapist';
    if (!formData.briefingMaterial.trim()) errs.briefingMaterial = 'Materi briefing wajib diisi';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const taskBody = [
        `Therapist: ${formData.therapistName}`,
        `Status Kehadiran: ${formData.attendanceStatus}`,
        '',
        'Materi Briefing:',
        formData.briefingMaterial,
        '',
        'Catatan Tambahan:',
        formData.notes
      ].join('\n');

      await base44.entities.Task.create({
        title: `Briefing: ${formData.therapistName} - ${format(new Date(), 'dd/MM/yyyy', { locale: localeId })}`,
        content: taskBody,
        workspace_id: workspace.id,
        created_by: user?.email,
        company_id: workspace.company_id || null,
        assignee_id: formData.therapistId || null,
        status: 'done',
        priority: 'medium',
        task_type: 'briefing_log'
      });

      toast.success('Data briefing berhasil disimpan! 📋', { description: `${formData.therapistName} - ${getAttendanceStyle(formData.attendanceStatus).label}` });
      setFormData({ therapistId: '', therapistName: '', attendanceStatus: 'hadir', briefingMaterial: '', notes: '' });
      setErrors({});
      loadRecentLogs();
      window.dispatchEvent(new CustomEvent('taskCreated', { detail: { workspaceId: workspace.id } }));
    } catch (error) {
      console.error('Error saving briefing:', error);
      toast.error('Gagal menyimpan data briefing', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered logs ──
  const filteredLogs = useMemo(() => {
    let result = recentLogs;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(log => {
        const p = parseLogContent(log.content);
        return (
          (p.therapist || '').toLowerCase().includes(q) ||
          (p.materi || '').toLowerCase().includes(q) ||
          (log.title || '').toLowerCase().includes(q)
        );
      });
    }

    if (filterStatus !== 'all') {
      result = result.filter(log => {
        const p = parseLogContent(log.content);
        return p.status === filterStatus;
      });
    }

    if (filterDate === 'today') {
      result = result.filter(log => log.created_date && isToday(new Date(log.created_date)));
    } else if (filterDate === 'week') {
      const weekAgo = subDays(new Date(), 7);
      result = result.filter(log => log.created_date && new Date(log.created_date) >= weekAgo);
    }

    return result;
  }, [recentLogs, searchQuery, filterStatus, filterDate]);

  const selectedEmployee = employees.find(m => m.user_id === formData.therapistId || m.id === formData.therapistId);

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-md">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Briefing & Kehadiran</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Catat kehadiran dan materi briefing harian therapist</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadRecentLogs} disabled={loadingLogs} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <BriefingStats logs={recentLogs} />

      {/* Tabs: Form | Log */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="form" className="gap-2">
            <Send className="w-4 h-4" /> Input Briefing
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Eye className="w-4 h-4" /> Riwayat Log
            {recentLogs.length > 0 && (
              <Badge className="ml-1 bg-blue-600 text-white text-xs px-1.5 py-0">{recentLogs.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── FORM TAB ── */}
        <TabsContent value="form">
          <Card className="border dark:border-gray-700 shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Row 1: Therapist + Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      Nama Therapist <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.therapistId}
                      onValueChange={(val) => {
                        const member = employees.find(m => (m.user_id || m.id) === val);
                        setFormData({ ...formData, therapistId: val, therapistName: member?.user_name || member?.user_email || '' });
                        if (errors.therapistName) setErrors({ ...errors, therapistName: '' });
                      }}
                    >
                      <SelectTrigger className={`${errors.therapistName ? 'border-red-500 focus:ring-red-500' : ''}`}>
                        <SelectValue placeholder="-- Pilih Therapist --" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.length === 0 && (
                          <SelectItem value="_empty" disabled>Tidak ada anggota aktif</SelectItem>
                        )}
                        {employees.map(m => (
                          <SelectItem key={m.id} value={m.user_id || m.id}>
                            <span className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {(m.user_name || m.user_email || '?').charAt(0).toUpperCase()}
                              </span>
                              {m.user_name || m.user_email}
                              <span className="text-xs text-gray-400">({m.role})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.therapistName && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.therapistName}</p>}

                    {/* Employee preview chip */}
                    {selectedEmployee && (
                      <div className="flex items-center gap-2 mt-1 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
                        <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                          {(selectedEmployee.user_name || '?').charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">{selectedEmployee.user_name}</p>
                          <p className="text-[10px] text-blue-600 dark:text-blue-400">{selectedEmployee.position || selectedEmployee.role}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Status Kehadiran
                    </Label>
                    <Select
                      value={formData.attendanceStatus}
                      onValueChange={(val) => setFormData({ ...formData, attendanceStatus: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ATTENDANCE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Status preview badge */}
                    {formData.attendanceStatus && (
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium mt-1 ${getAttendanceStyle(formData.attendanceStatus).color}`}>
                        {getAttendanceStyle(formData.attendanceStatus).icon} {getAttendanceStyle(formData.attendanceStatus).label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Materi Briefing */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 font-medium">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    Materi Briefing <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="Tuliskan materi yang dibahas dalam briefing hari ini..."
                    className={`min-h-[120px] resize-none transition-colors ${errors.briefingMaterial ? 'border-red-500 focus:ring-red-500' : ''}`}
                    value={formData.briefingMaterial}
                    onChange={(e) => {
                      setFormData({ ...formData, briefingMaterial: e.target.value });
                      if (errors.briefingMaterial) setErrors({ ...errors, briefingMaterial: '' });
                    }}
                  />
                  <div className="flex items-center justify-between">
                    {errors.briefingMaterial
                      ? <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.briefingMaterial}</p>
                      : <span />
                    }
                    <span className="text-xs text-gray-400 ml-auto">{formData.briefingMaterial.length} karakter</span>
                  </div>
                </div>

                {/* Catatan Tambahan */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 font-medium text-gray-600 dark:text-gray-400">
                    <FileText className="w-3.5 h-3.5" />
                    Catatan Tambahan <span className="text-xs font-normal text-gray-400">(opsional)</span>
                  </Label>
                  <Textarea
                    className="min-h-[80px] resize-none"
                    placeholder="Catatan lain jika ada..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                {/* Submit */}
                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold h-11 shadow-md transition-all hover:shadow-lg"
                  >
                    {loading
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
                      : <><Send className="w-4 h-4 mr-2" /> Simpan Data Briefing</>
                    }
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LOGS TAB ── */}
        <TabsContent value="logs">
          <Card className="border dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="Cari therapist atau materi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm h-9"
                  />
                </div>

                {/* Filter Status */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
                    <Filter className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    {ATTENDANCE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.icon} {o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filter Date */}
                <Select value={filterDate} onValueChange={setFilterDate}>
                  <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Waktu</SelectItem>
                    <SelectItem value="today">Hari Ini</SelectItem>
                    <SelectItem value="week">7 Hari Terakhir</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Result count */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {loadingLogs
                  ? 'Memuat...'
                  : `Menampilkan ${filteredLogs.length} dari ${recentLogs.length} log`
                }
              </p>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                  <span className="text-sm text-gray-500">Memuat log...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-gray-600">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Belum ada log briefing</p>
                  <p className="text-xs mt-1">
                    {searchQuery || filterStatus !== 'all' || filterDate !== 'all'
                      ? 'Coba ubah filter pencarian'
                      : 'Mulai input briefing pertama Anda'
                    }
                  </p>
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