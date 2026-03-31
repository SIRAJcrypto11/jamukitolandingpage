import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, User as UserIcon, Building, Download, Users, CheckSquare, XCircle, Clock } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

export default function AttendanceTab({ attendanceRecords, workspaces, users }) {
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [filters, setFilters] = useState({
    workspaceId: 'all',
    userId: 'all',
    dateRange: {
      from: subDays(new Date(), 7),
      to: new Date()
    }
  });

  useEffect(() => {
    let result = attendanceRecords;

    if (filters.workspaceId !== 'all') {
      result = result.filter(r => r.workspace_id === filters.workspaceId);
    }
    if (filters.userId !== 'all') {
      result = result.filter(r => r.user_id === filters.userId);
    }
    if (filters.dateRange.from && filters.dateRange.to) {
      result = result.filter(r => {
        const recordDate = new Date(r.date);
        const filterFrom = new Date(filters.dateRange.from.setHours(0, 0, 0, 0));
        const filterTo = new Date(filters.dateRange.to.setHours(23, 59, 59, 999));
        return recordDate >= filterFrom && recordDate <= filterTo;
      });
    }

    setFilteredRecords(result);
  }, [filters, attendanceRecords]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getUserFullName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.full_name || email;
  };

  const getWorkspaceName = (id) => {
    const workspace = workspaces.find(w => w.id === id);
    return workspace?.name || 'N/A';
  };
  
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.error('Tidak ada data untuk diekspor.');
      return;
    }

    const escapeCsvField = (field) => {
      if (field === null || field === undefined) return '';
      let stringField = String(field);
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };

    const headers = ['Karyawan', 'Workspace', 'Tanggal', 'Clock In', 'Clock Out', 'Total Jam', 'Status', 'Catatan'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(record => [
        getUserFullName(record.user_id),
        getWorkspaceName(record.workspace_id),
        format(new Date(record.date), 'yyyy-MM-dd'),
        record.clock_in_time ? format(new Date(record.clock_in_time), 'HH:mm:ss') : '',
        record.clock_out_time ? format(new Date(record.clock_out_time), 'HH:mm:ss') : '',
        record.total_hours ? record.total_hours.toFixed(2) : '',
        record.status || '',
        record.notes || ''
      ].map(escapeCsvField).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan-kehadiran-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Laporan berhasil diekspor!');
  };
  
  const presentCount = filteredRecords.filter(r => r.status === 'present').length;
  const lateCount = filteredRecords.filter(r => r.status === 'late').length;
  const absentCount = filteredRecords.filter(r => r.status === 'absent').length;

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Record</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{filteredRecords.length}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Hadir Tepat Waktu</CardTitle>
                    <CheckSquare className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{presentCount}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Terlambat</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{lateCount}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Tidak Hadir</CardTitle>
                    <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{absentCount}</div>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Filter Data Kehadiran</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                <label className="text-sm font-medium">Workspace</label>
                <Select value={filters.workspaceId} onValueChange={(val) => handleFilterChange('workspaceId', val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Semua Workspace</SelectItem>
                    {workspaces.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                </div>
                <div className="flex-1">
                <label className="text-sm font-medium">Karyawan</label>
                <Select value={filters.userId} onValueChange={(val) => handleFilterChange('userId', val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Semua Karyawan</SelectItem>
                    {users.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name || u.email}</SelectItem>)}
                    </SelectContent>
                </Select>
                </div>
                <div className="flex-1">
                <label className="text-sm font-medium">Rentang Tanggal</label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange.from ? (
                        filters.dateRange.to ? (
                            `${format(filters.dateRange.from, 'LLL dd, y')} - ${format(filters.dateRange.to, 'LLL dd, y')}`
                        ) : (
                            format(filters.dateRange.from, 'LLL dd, y')
                        )
                        ) : (
                        <span>Pilih tanggal</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={filters.dateRange.from}
                        selected={filters.dateRange}
                        onSelect={(val) => handleFilterChange('dateRange', val)}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>Riwayat Kehadiran</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto border rounded-lg">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Karyawan</TableHead>
                        <TableHead>Workspace</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Total Jam</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredRecords.length > 0 ? filteredRecords.map(record => (
                        <TableRow key={record.id}>
                        <TableCell>
                            <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-gray-500" />
                            {getUserFullName(record.user_id)}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-500" />
                            {getWorkspaceName(record.workspace_id)}
                            </div>
                        </TableCell>
                        <TableCell>{format(new Date(record.date), 'dd MMM yyyy', { locale: id })}</TableCell>
                        <TableCell>{record.clock_in_time ? format(new Date(record.clock_in_time), 'HH:mm') : '-'}</TableCell>
                        <TableCell>{record.clock_out_time ? format(new Date(record.clock_out_time), 'HH:mm') : '-'}</TableCell>
                        <TableCell>{record.total_hours ? `${record.total_hours.toFixed(2)} jam` : '-'}</TableCell>
                        <TableCell>
                            <Badge variant={
                            record.status === 'present' ? 'default' : 
                            record.status === 'late' ? 'destructive' : 'secondary'
                            }>
                            {record.status}
                            </Badge>
                        </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                            Tidak ada data kehadiran yang cocok dengan filter Anda.
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