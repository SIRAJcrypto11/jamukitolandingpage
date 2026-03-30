import React from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const formatCurrency = (amount) => `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;

/**
 * Professional POS Transaction Report Component
 * For Export to PDF/Excel with company branding
 */
export default function POSTransactionReport({ 
  transactions, 
  stats, 
  company, 
  dateRange,
  location,
  startDate,
  endDate 
}) {
  const now = new Date();

  return (
    <div className="bg-white p-8 text-black" style={{ minWidth: '800px', fontFamily: 'Arial, sans-serif' }}>
      {/* Company Header */}
      <div className="border-b-4 border-blue-600 pb-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {company?.logo_url && (
              <img src={company.logo_url} alt="Logo" className="h-16 mb-3" />
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{company?.name || 'PERUSAHAAN'}</h1>
            {company?.address && <p className="text-sm text-gray-600">{company.address}</p>}
            {company?.phone && <p className="text-sm text-gray-600">Telp: {company.phone}</p>}
            {company?.email && <p className="text-sm text-gray-600">Email: {company.email}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-blue-600 mb-2">LAPORAN TRANSAKSI POS</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Tanggal Cetak: {format(now, 'dd MMMM yyyy HH:mm', { locale: id })}</p>
              <p>Periode: {dateRange === 'custom' 
                ? `${format(startDate, 'dd MMM yyyy', { locale: id })} - ${format(endDate, 'dd MMM yyyy', { locale: id })}`
                : dateRange === 'today' ? 'Hari Ini'
                : dateRange === 'week' ? 'Minggu Ini'
                : dateRange === 'month' ? 'Bulan Ini'
                : 'Tahun Ini'
              }</p>
              {location && location !== 'all' && <p>Lokasi: {location}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-300">
          <div className="text-green-700 text-sm font-medium mb-1">Total Pendapatan</div>
          <div className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalRevenue)}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-300">
          <div className="text-blue-700 text-sm font-medium mb-1">Total Transaksi</div>
          <div className="text-2xl font-bold text-blue-900">{stats.totalTransactions}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-300">
          <div className="text-purple-700 text-sm font-medium mb-1">Rata-rata Transaksi</div>
          <div className="text-2xl font-bold text-purple-900">{formatCurrency(stats.avgTransaction)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-300">
          <div className="text-orange-700 text-sm font-medium mb-1">Total Profit</div>
          <div className="text-2xl font-bold text-orange-900">{formatCurrency(stats.totalProfit)}</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-300">
          <div className="text-indigo-700 text-sm font-medium mb-1">Margin Profit</div>
          <div className="text-2xl font-bold text-indigo-900">{stats.profitMargin.toFixed(1)}%</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-lg border border-cyan-300">
          <div className="text-cyan-700 text-sm font-medium mb-1">Total Item</div>
          <div className="text-2xl font-bold text-cyan-900">{stats.totalItems}</div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">
          Detail Transaksi ({transactions.length} transaksi)
        </h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="border border-blue-700 p-2 text-left">No</th>
              <th className="border border-blue-700 p-2 text-left">No. Transaksi</th>
              <th className="border border-blue-700 p-2 text-left">Tanggal & Waktu</th>
              <th className="border border-blue-700 p-2 text-left">Kasir</th>
              <th className="border border-blue-700 p-2 text-left">Lokasi</th>
              <th className="border border-blue-700 p-2 text-center">Items</th>
              <th className="border border-blue-700 p-2 text-left">Metode</th>
              <th className="border border-blue-700 p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, index) => (
              <tr key={t.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="border border-gray-300 p-2">{index + 1}</td>
                <td className="border border-gray-300 p-2 font-mono text-xs">{t.transaction_number}</td>
                <td className="border border-gray-300 p-2">{format(new Date(t.created_date), 'dd/MM/yyyy HH:mm')}</td>
                <td className="border border-gray-300 p-2">{t.cashier_name || 'N/A'}</td>
                <td className="border border-gray-300 p-2">{t.location_name || 'N/A'}</td>
                <td className="border border-gray-300 p-2 text-center">{t.items?.length || 0}</td>
                <td className="border border-gray-300 p-2">{t.payment_method?.toUpperCase() || 'N/A'}</td>
                <td className="border border-gray-300 p-2 text-right font-semibold">{formatCurrency(t.total)}</td>
              </tr>
            ))}
            <tr className="bg-blue-100 font-bold">
              <td colSpan="7" className="border border-blue-300 p-2 text-right">TOTAL</td>
              <td className="border border-blue-300 p-2 text-right text-blue-900">
                {formatCurrency(stats.totalRevenue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-300 pt-6 mt-8">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-600">
            <p>Dokumen ini dibuat secara otomatis oleh sistem</p>
            <p>Untuk pertanyaan, hubungi: {company?.email || '-'}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-600 mb-2">Powered by</div>
            <div className="text-lg font-bold text-blue-600">SNISHOP.COM</div>
            <div className="text-xs text-gray-500">Smart Business Operating System</div>
          </div>
        </div>
      </div>

      {/* Page Break for Print */}
      <style jsx>{`
        @media print {
          .page-break {
            page-break-after: always;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}

// Export utilities
export const exportToExcel = (transactions, stats, company, dateRange, location, startDate, endDate) => {
  // Create CSV content
  const now = new Date();
  const periodText = dateRange === 'custom' 
    ? `${format(startDate, 'dd MMM yyyy', { locale: id })} - ${format(endDate, 'dd MMM yyyy', { locale: id })}`
    : dateRange === 'today' ? 'Hari Ini'
    : dateRange === 'week' ? 'Minggu Ini'
    : dateRange === 'month' ? 'Bulan Ini'
    : 'Tahun Ini';

  const csvLines = [
    [`LAPORAN TRANSAKSI POS - ${company?.name || 'PERUSAHAAN'}`],
    [],
    [`Periode: ${periodText}`],
    [`Lokasi: ${location && location !== 'all' ? location : 'Semua Lokasi'}`],
    [`Tanggal Cetak: ${format(now, 'dd MMMM yyyy HH:mm', { locale: id })}`],
    [],
    ['RINGKASAN'],
    ['Total Pendapatan', formatCurrency(stats.totalRevenue)],
    ['Total Transaksi', stats.totalTransactions],
    ['Rata-rata Transaksi', formatCurrency(stats.avgTransaction)],
    ['Total Profit', formatCurrency(stats.totalProfit)],
    ['Margin Profit', `${stats.profitMargin.toFixed(1)}%`],
    ['Total Item', stats.totalItems],
    [],
    ['DETAIL TRANSAKSI'],
    ['No', 'No. Transaksi', 'Tanggal & Waktu', 'Kasir', 'Lokasi', 'Items', 'Metode Pembayaran', 'Total'],
    ...transactions.map((t, index) => [
      index + 1,
      t.transaction_number,
      format(new Date(t.created_date), 'dd/MM/yyyy HH:mm'),
      t.cashier_name || 'N/A',
      t.location_name || 'N/A',
      t.items?.length || 0,
      t.payment_method?.toUpperCase() || 'N/A',
      t.total
    ]),
    [],
    ['TOTAL', '', '', '', '', '', '', stats.totalRevenue],
    [],
    ['Powered by SNISHOP.COM - Smart Business Operating System']
  ];

  const csvContent = csvLines.map(row => row.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Laporan-POS-${company?.name || 'Company'}-${format(now, 'yyyy-MM-dd-HHmm')}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const exportToPDF = () => {
  window.print();
};