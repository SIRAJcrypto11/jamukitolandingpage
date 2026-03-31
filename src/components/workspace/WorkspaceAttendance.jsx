import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Download, Users, CheckSquare, XCircle, Clock, TrendingUp, RefreshCw, Loader2, Zap } from 'lucide-react';
import { format, subDays, isToday } from 'date-fns';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  present: { label: 'Hadir', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', icon: '✅' },
  late: { label: 'Terlambat', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300', icon: '⏰' },
  absent: { label: 'Tidak Hadir', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', icon: '❌' },
  sick: { label: 'Sakit', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', icon: '🤒' },
  leave: { label: 'Izin', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', icon: '📋' },
};

function getStatusConfig(status) {
  return STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: '❓' };
}

export default function WorkspaceAttendance({ workspace, user, members = [], companyMembers = [], companyId }) {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({
    employeeId: 'all',
    status: 'all',
    dateRange: { from: subDays(new Date(), 7), to: new Date() }
  });
  const [isLoading, setIsLoading] = useState(true);

  // ✅ FETCH FROM CompanyAttendance (REAL DATA from HR module)
  const fetchAttendanceData = async () => {
    if (!companyId) { setRecords([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const data = await base44.entities.CompanyAttendance.filter({
        company_id: companyId
      });
      setRecords(data || []);
    } catch (error) {
      console.error('Attendance load error:', error);
      toast.error('Gagal memuat data absensi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [companyId]);

  // ✅ Listen for realtime attendance updates from WorkspaceHRSync
  useEffect(() => {
    if (!companyId) return;
    const handler = (e) => {
      if (e.detail?.companyId === companyId) {
        fetchAttendanceData();
      }
    };
    window.addEventListener('hrAttendanceUpdated', handler);
    return () => window.removeEventListener('hrAttendanceUpdated', handler);
  }, [companyId]);

  // ✅ Resolve member name from CompanyAttendance record + companyMembers
  const getMemberName = (record) => {
    // First try the record's own employee_name
    if (record.employee_name) return record.employee_name;
    // Then try matching via companyMembers
    const member = companyMembers.find(m =>
      m.id === record.employee_id ||
      m.user_email === record.employee_email ||
      m.user_email === record.employee_id
    );
    return member?.user_name || record.employee_email || record.employee_id || '-';
  };

  // ✅ Get member initial for avatar
  const getMemberInitial = (record) => {
    const name = getMemberName(record);
    return name.charAt(0).toUpperCase();
  };

  // ✅ Filter records using CompanyAttendance fields
  const filteredRecords = useMemo(() => {
    let result = records;

    // Filter by employee
    if (filters.employeeId !== 'all') {
      result = result.filter(r =>
        r.employee_id === filters.employeeId ||
        r.employee_email === filters.employeeId
      );
    }

    // Filter by status
    if (filters.status !== 'all') {
      result = result.filter(r => r.status === filters.status);
    }

    // Filter by date range
    if (filters.dateRange.from && filters.dateRange.to) {
      const fromStr = format(filters.dateRange.from, 'yyyy-MM-dd');
      const toStr = format(filters.dateRange.to, 'yyyy-MM-dd');
      result = result.filter(r => {
        if (!r.date) return false;
        const dateStr = r.date.substring(0, 10);
        return dateStr >= fromStr && dateStr <= toStr;
      });
    }

    // Sort by date descending
    return [...result].sort((a, b) => {
      const da = a.date || '';
      const db = b.date || '';
      return db.localeCompare(da);
    });
  }, [records, filters]);

  // Stats
  const stats = useMemo(() => ({
    total: filteredRecords.length,
    present: filteredRecords.filter(r => r.status === 'present').length,
    late: filteredRecords.filter(r => r.status === 'late').length,
    absent: filteredRecords.filter(r => r.status === 'absent').length,
    sick: filteredRecords.filter(r => r.status === 'sick').length,
    leave: filteredRecords.filter(r => r.status === 'leave').length,
    avgHours: filteredRecords.filter(r => r.total_hours).length > 0
      ? (filteredRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0) / filteredRecords.filter(r => r.total_hours).length).toFixed(1)
      : '0',
  }), [filteredRecords]);

  const attendanceRate = stats.total > 0 ? Math.round((stats.present + stats.late) / stats.total * 100) : 0;

  // ✅ CSV Export with CompanyAttendance fields
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) { toast.error('Tidak ada data untuk diekspor.'); return; }
    const escape = (f) => {
      if (f == null) return '';
      const s = String(f);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = ['Karyawan', 'Email', 'Tanggal', 'Clock In', 'Clock Out', 'Total Jam', 'Status', 'Catatan'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(r => [
        getMemberName(r),
        r.employee_email || '',
        r.date ? r.date.substring(0, 10) : '',
        r.clock_in_time ? (() => { try { return format(new Date(r.clock_in_time), 'HH:mm:ss'); } catch { return r.clock_in_time; } })() : '',
        r.clock_out_time ? (() => { try { return format(new Date(r.clock_out_time), 'HH:mm:ss'); } catch { return r.clock_out_time; } })() : '',
        r.total_hours ? r.total_hours.toFixed(2) : '',
        r.status || '',
        r.notes || ''
      ].map(escape).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `laporan-absensi-${companyId}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Laporan berhasil diekspor!');
  };

  // ✅ No company check
  if (!companyId) {
    return (
      <Card className="border-dashed border-2 dark:border-gray-700">
        <CardContent className="text-center py-12">
          <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500">Absensi hanya tersedia untuk workspace yang terhubung dengan perusahaan</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-500" />
            Absensi Karyawan
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Data real dari HR — {records.length} total catatan absensi
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAttendanceData} disabled={isLoading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Real data badge */}
      <div className="p-2.5 bg-teal-50 dark:bg-teal-950/30 rounded-lg border border-teal-200 dark:border-teal-800 flex items-center gap-2">
        <Zap className="w-4 h-4 text-teal-500 flex-shrink-0" />
        <p className="text-xs text-teal-700 dark:text-teal-300">
          <strong>Data Real</strong> — Terintegrasi dengan modul HR & Payroll perusahaan. Absensi otomatis tercatat saat karyawan clock in/out.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Record', value: stats.total, icon: Users, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/40' },
          { label: 'Hadir', value: stats.present, icon: CheckSquare, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/30' },
          { label: 'Terlambat', value: stats.late, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
          { label: 'Tidak Hadir', value: stats.absent, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
          { label: 'Kehadiran', value: `${attendanceRate}%`, icon: TrendingUp, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-950/30' },
          { label: 'Rata-rata Jam', value: `${stats.avgHours}h`, icon: Clock, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className={`border dark:border-gray-700 ${bg}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attendance Rate Bar */}
      {stats.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Tingkat Kehadiran</span>
            <span className={`font-bold ${attendanceRate >= 80 ? 'text-green-600' : attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
              {attendanceRate}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${attendanceRate >= 80 ? 'bg-green-500' : attendanceRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="border dark:border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Filter Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Member filter — uses companyMembers */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Anggota</label>
              <Select value={filters.employeeId} onValueChange={(val) => setFilters(f => ({ ...f, employeeId: val }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Semua Anggota" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Anggota</SelectItem>
                  {companyMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.user_name || m.user_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
              <Select value={filters.status} onValueChange={(val) => setFilters(f => ({ ...f, status: val }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                    <SelectItem key={val} value={val}>{cfg.icon} {cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Rentang Tanggal</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-9 text-sm justify-start font-normal">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-gray-400" />
                    <span className="truncate text-xs">
                      {filters.dateRange.from && filters.dateRange.to
                        ? `${format(filters.dateRange.from, 'dd/MM/yy')} - ${format(filters.dateRange.to, 'dd/MM/yy')}`
                        : 'Pilih tanggal'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={filters.dateRange.from}
                    selected={filters.dateRange}
                    onSelect={(val) => val && setFilters(f => ({ ...f, dateRange: val }))}
                    numberOfMonths={1}
                  />
                  {/* Quick date presets */}
                  <div className="p-2 border-t flex flex-wrap gap-1">
                    {[
                      { label: 'Hari ini', from: new Date(), to: new Date() },
                      { label: '7 hari', from: subDays(new Date(), 7), to: new Date() },
                      { label: '30 hari', from: subDays(new Date(), 30), to: new Date() },
                      { label: 'Bulan ini', from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), to: new Date() },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => setFilters(f => ({ ...f, dateRange: { from: preset.from, to: preset.to } }))}
                        className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-gray-600 dark:text-gray-400 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Active filter summary */}
          {(filters.employeeId !== 'all' || filters.status !== 'all') && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Filter aktif:</span>
              {filters.employeeId !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  👤 {companyMembers.find(m => m.id === filters.employeeId)?.user_name || filters.employeeId}
                  <button onClick={() => setFilters(f => ({ ...f, employeeId: 'all' }))} className="ml-1 text-gray-400 hover:text-gray-600">×</button>
                </Badge>
              )}
              {filters.status !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  {getStatusConfig(filters.status).icon} {getStatusConfig(filters.status).label}
                  <button onClick={() => setFilters(f => ({ ...f, status: 'all' }))} className="ml-1 text-gray-400 hover:text-gray-600">×</button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border dark:border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Riwayat Kehadiran</CardTitle>
            <span className="text-xs text-gray-500 dark:text-gray-400">{filteredRecords.length} record</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                  <TableHead className="text-xs font-semibold">Karyawan</TableHead>
                  <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                  <TableHead className="text-xs font-semibold">Clock In</TableHead>
                  <TableHead className="text-xs font-semibold">Clock Out</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Total Jam</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                      <p className="text-sm text-gray-500">Memuat data absensi dari HR...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length > 0 ? (
                  filteredRecords.map(record => {
                    const cfg = getStatusConfig(record.status);
                    const recordDate = record.date ? new Date(record.date + 'T00:00:00') : null;
                    const isRecordToday = recordDate ? isToday(recordDate) : false;
                    return (
                      <TableRow key={record.id} className={isRecordToday ? 'bg-blue-50/30 dark:bg-blue-950/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}>
                        <TableCell className="text-xs md:text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-bold flex-shrink-0">
                              {getMemberInitial(record)}
                            </div>
                            <span className="truncate max-w-[100px] md:max-w-none font-medium">
                              {getMemberName(record)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs md:text-sm">
                          <div className="flex items-center gap-1">
                            {record.date ? record.date.substring(0, 10) : '-'}
                            {isRecordToday && <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1 py-0">Hari ini</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs md:text-sm font-mono">
                          {record.clock_in_time ? (() => {
                            try { return format(new Date(record.clock_in_time), 'HH:mm'); }
                            catch { return record.clock_in_time; }
                          })() : '-'}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm font-mono">
                          {record.clock_out_time ? (() => {
                            try { return format(new Date(record.clock_out_time), 'HH:mm'); }
                            catch { return record.clock_out_time; }
                          })() : <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm hidden md:table-cell">
                          {record.total_hours != null
                            ? <span className="font-semibold">{Number(record.total_hours).toFixed(1)}h</span>
                            : <span className="text-gray-400">-</span>
                          }
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${cfg.color} whitespace-nowrap`}>
                            {cfg.icon} {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500 hidden lg:table-cell max-w-[150px] truncate">
                          {record.notes || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tidak ada data kehadiran</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Coba ubah filter untuk melihat data lainnya</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}