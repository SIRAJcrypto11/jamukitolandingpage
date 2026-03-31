import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, FileText, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

export default function FinanceExportActions({ records }) {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  const getDateRange = (period) => {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'this_month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'this_year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'last_year':
        const lastYear = new Date(now.getFullYear() - 1, 0, 1);
        startDate = startOfYear(lastYear);
        endDate = endOfYear(lastYear);
        break;
      case 'custom':
        if (customDateRange.start && customDateRange.end) {
          return {
            startDate: new Date(customDateRange.start),
            endDate: new Date(customDateRange.end)
          };
        }
        return { startDate: null, endDate: null };
      case 'all':
      default:
        return { startDate: null, endDate: null };
    }

    return { startDate, endDate };
  };

  const getFilteredRecords = () => {
    const { startDate, endDate } = getDateRange(exportPeriod);

    if (!startDate || !endDate) {
      // ✅ ALL TIME - Return all records sorted by newest
      return records.sort((a, b) => {
        const dateA = new Date(a.date || a.created_date);
        const dateB = new Date(b.date || b.created_date);
        return dateB - dateA;
      });
    }

    // Filter by date range and sort
    const filtered = records.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startDate && recordDate <= endDate;
    });

    return filtered.sort((a, b) => {
      const dateA = new Date(a.date || a.created_date);
      const dateB = new Date(b.date || b.created_date);
      return dateB - dateA;
    });
  };

  const exportToCSV = () => {
    const filteredRecords = getFilteredRecords();

    if (filteredRecords.length === 0) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }

    const headers = ['Tanggal', 'Jenis', 'Kategori', 'Deskripsi', 'Jumlah'];
    const rows = filteredRecords.map(record => [
      format(new Date(record.date), 'dd/MM/yyyy', { locale: id }),
      record.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      record.category || '-',
      record.description || '-',
      record.amount.toLocaleString('id-ID')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `keuangan_${exportPeriod}_${Date.now()}.csv`);
    link.click();

    toast.success(`✅ ${filteredRecords.length} transaksi berhasil diexport ke CSV`);
    setShowExportDialog(false);
  };

  const exportToExcel = () => {
    const filteredRecords = getFilteredRecords();

    if (filteredRecords.length === 0) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }

    const headers = ['Tanggal', 'Jenis', 'Kategori', 'Deskripsi', 'Jumlah'];
    const rows = filteredRecords.map(record => [
      format(new Date(record.date), 'dd/MM/yyyy', { locale: id }),
      record.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      record.category || '-',
      record.description || '-',
      record.amount.toLocaleString('id-ID')
    ]);

    const csvContent = [
      headers.join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `keuangan_${exportPeriod}_${Date.now()}.xls`);
    link.click();

    toast.success(`✅ ${filteredRecords.length} transaksi berhasil diexport ke Excel`);
    setShowExportDialog(false);
  };

  const exportToPDF = () => {
    const filteredRecords = getFilteredRecords();

    if (filteredRecords.length === 0) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }

    const { startDate, endDate } = getDateRange(exportPeriod);

    const income = filteredRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
    const expense = filteredRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);

    // ✅ Generate HTML for PDF printing
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Laporan Keuangan</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1f2937; margin-bottom: 10px; }
            .period { color: #6b7280; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #3b82f6; color: white; padding: 12px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            tr:hover { background: #f9fafb; }
            .summary { margin-top: 30px; padding: 15px; background: #f3f4f6; border-radius: 8px; }
            .summary-item { display: flex; justify-between; margin-bottom: 10px; }
            .income { color: #10b981; font-weight: bold; }
            .expense { color: #ef4444; font-weight: bold; }
            .net { color: #3b82f6; font-weight: bold; font-size: 18px; }
          </style>
        </head>
        <body>
          <h1>Laporan Keuangan</h1>
          <p class="period">
            ${startDate && endDate 
              ? `Periode: ${format(startDate, 'dd MMM yyyy', { locale: id })} - ${format(endDate, 'dd MMM yyyy', { locale: id })}` 
              : 'Periode: Semua Waktu'}
          </p>

          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th>Kategori</th>
                <th>Deskripsi</th>
                <th style="text-align: right;">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRecords.map(record => `
                <tr>
                  <td>${format(new Date(record.date), 'dd/MM/yyyy', { locale: id })}</td>
                  <td>${record.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td>
                  <td>${record.category || '-'}</td>
                  <td>${record.description || '-'}</td>
                  <td style="text-align: right;" class="${record.type === 'income' ? 'income' : 'expense'}">
                    Rp ${record.amount.toLocaleString('id-ID')}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-item">
              <span>Total Pemasukan:</span>
              <span class="income">Rp ${income.toLocaleString('id-ID')}</span>
            </div>
            <div class="summary-item">
              <span>Total Pengeluaran:</span>
              <span class="expense">Rp ${expense.toLocaleString('id-ID')}</span>
            </div>
            <div class="summary-item" style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #d1d5db;">
              <span><strong>Selisih:</strong></span>
              <span class="net">Rp ${(income - expense).toLocaleString('id-ID')}</span>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    // Open in new window and trigger print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    toast.success(`✅ ${filteredRecords.length} transaksi siap dicetak ke PDF`);
    setShowExportDialog(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowExportDialog(true)}
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        Export
      </Button>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Export Laporan Keuangan
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Periode Aktif</Label>
              <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-sm text-blue-400 font-semibold">
                  {exportPeriod === 'all' && 'Semua Periode'}
                  {exportPeriod === 'this_month' && format(new Date(), 'MMMM yyyy', { locale: id })}
                  {exportPeriod === 'last_month' && format(new Date(new Date().getFullYear(), new Date().getMonth() - 1), 'MMMM yyyy', { locale: id })}
                  {exportPeriod === 'this_year' && format(new Date(), 'yyyy', { locale: id })}
                  {exportPeriod === 'last_year' && format(new Date(new Date().getFullYear() - 1, 0), 'yyyy', { locale: id })}
                  {exportPeriod === 'custom' && customDateRange.start && customDateRange.end && 
                    `${format(new Date(customDateRange.start), 'dd MMM yyyy', { locale: id })} - ${format(new Date(customDateRange.end), 'dd MMM yyyy', { locale: id })}`}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {getFilteredRecords().length} transaksi akan diexport
                </p>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Filter Periode Export</Label>
              <Select value={exportPeriod} onValueChange={setExportPeriod}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-2">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">Semua Data</SelectItem>
                  <SelectItem value="this_month">Bulan Ini</SelectItem>
                  <SelectItem value="last_month">Bulan Lalu</SelectItem>
                  <SelectItem value="this_year">Tahun Ini</SelectItem>
                  <SelectItem value="last_year">Tahun Lalu</SelectItem>
                  <SelectItem value="custom">Kustom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exportPeriod === 'custom' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-300">Tanggal Mulai</Label>
                  <Input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-2"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Tanggal Akhir</Label>
                  <Input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-2"
                  />
                </div>
              </div>
            )}

            <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <p className="text-xs text-blue-300">
                  {exportPeriod === 'all' 
                    ? `✅ Siap mengekspor ${getFilteredRecords().length} transaksi dari semua periode` 
                    : exportPeriod === 'custom' && (!customDateRange.start || !customDateRange.end)
                    ? '⚠️ Atur tanggal mulai dan akhir untuk export custom'
                    : `✅ Siap mengekspor ${getFilteredRecords().length} transaksi`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700"
                disabled={exportPeriod === 'custom' && (!customDateRange.start || !customDateRange.end)}
              >
                CSV ({getFilteredRecords().length})
              </Button>
              <Button
                onClick={exportToExcel}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={exportPeriod === 'custom' && (!customDateRange.start || !customDateRange.end)}
              >
                Excel ({getFilteredRecords().length})
              </Button>
              <Button
                onClick={exportToPDF}
                className="bg-red-600 hover:bg-red-700"
                disabled={exportPeriod === 'custom' && (!customDateRange.start || !customDateRange.end)}
              >
                PDF ({getFilteredRecords().length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}