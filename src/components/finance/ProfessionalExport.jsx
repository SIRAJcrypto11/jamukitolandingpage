import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileSpreadsheet, FileText, Building2, Calendar, TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const SNISHOP_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e711957c86e922f92ad49f/a236b74f4_Logosnishopbirupanjang.png';

export default function ProfessionalExport({ records, accounts = [], selectedCompany, mode, filterCashiers }) {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [includeAccountDetails, setIncludeAccountDetails] = useState(true);

  const companyName = selectedCompany?.name || 'Keuangan Pribadi';
  const companyLogo = selectedCompany?.logo_url || SNISHOP_LOGO;
  const companyAddress = selectedCompany?.address || '';
  const companyPhone = selectedCompany?.phone || '';
  const companyEmail = selectedCompany?.email || '';

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
      return records.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    const filtered = records.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startDate && recordDate <= endDate;
    });

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // ✅ Logic extracted to helper function to fix scope/structure
  const filteredRecords = getFilteredRecords();
  const financials = calculateFinancials(filteredRecords);

  // ⬇️ COMPONENT CONTINUES (Fixed premature closure)

  const exportProfessionalCSV = async () => {
    const filteredRecords = getFilteredRecords();
    const financials = calculateFinancials(filteredRecords);
    const { startDate, endDate } = getDateRange(exportPeriod);

    // ACCOUNT MOVEMENTS LOGIC
    let accountSection = [];
    if (includeAccountDetails) {
      const movements = {};
      accounts.forEach(acc => {
        movements[acc.id] = { name: acc.name, type: acc.type, number: acc.account_number, income: 0, expense: 0, balance: acc.calculated_balance, is_virtual: false };
      });
      const KAS_BESAR_ID = 'virtual_kas_besar';

      filteredRecords.forEach(r => {
        let accId = r.account_id;
        if (!accId || !movements[accId]) {
          if (!movements[KAS_BESAR_ID]) {
            movements[KAS_BESAR_ID] = { name: 'KAS BESAR PERUSAHAAN (Default)', type: 'KAS UTAMA', number: 'MAIN-CASH', income: 0, expense: 0, balance: 0, is_virtual: true };
          }
          accId = KAS_BESAR_ID;
        }

        // Update Movement Counters (Income = Income + Debt, Expense = Expense + Receivable + Investment)
        if (r.type === 'income' || r.type === 'debt') movements[accId].income += r.amount;
        if (r.type === 'expense' || r.type === 'receivable' || r.type === 'investment') movements[accId].expense += r.amount;

        // Balance update for Virtual Account logic
        if (accId === KAS_BESAR_ID) {
          if (r.type === 'income' || r.type === 'debt') movements[accId].balance += r.amount;
          if (r.type === 'expense' || r.type === 'receivable' || r.type === 'investment') movements[accId].balance -= r.amount;
        }
      });

      accountSection = [
        [''], ['DETAIL SALDO DAN MUTASI REKENING'],
        ['Nama Rekening', 'Jenis', 'No. Rekening', 'Masuk (Periode)', 'Keluar (Periode)', 'Saldo Akhir / Estimasi'],
        ...Object.values(movements).filter(m => m.income > 0 || m.expense > 0 || m.balance > 0 || !m.is_virtual).map(m => [
          m.name,
          m.type.toUpperCase(),
          `'${m.number}`, // Force string for excel
          m.income,
          m.expense,
          m.balance
        ]),
        ['TOTAL', '', '',
          Object.values(movements).filter(m => m.income > 0 || m.expense > 0 || m.balance > 0 || !m.is_virtual).reduce((a, b) => a + b.income, 0),
          Object.values(movements).filter(m => m.income > 0 || m.expense > 0 || m.balance > 0 || !m.is_virtual).reduce((a, b) => a + b.expense, 0),
          Object.values(movements).filter(m => m.income > 0 || m.expense > 0 || m.balance > 0 || !m.is_virtual).reduce((a, b) => a + b.balance, 0)
        ]
      ];
    }

    // 🚀 NEW: Fetch Transaction Details first
    const loadingToast = toast.loading('Memproses detail item transaksi...');
    let itemDetails = [];

    // Find all records that are POS transactions
    const transactionIds = filteredRecords
      .filter(r => r.reference_id && r.reference_id.startsWith('TRX'))
      .map(r => r.reference_id);

    // Fetch them if any
    let transactionDataMap = new Map();
    if (transactionIds.length > 0) {
      try {
        // Fetch in chunks or all (assuming not too many for now, or just limit)
        // Note: base44 list limit might be 50 or 100.
        const { data } = await base44.entities.CompanyPOSTransaction.list({
          filters: [{ field: 'id', operator: 'in', value: transactionIds }]
        });
        if (data) {
          data.forEach(t => transactionDataMap.set(t.id, t));
        }
      } catch (err) {
        console.error("Failed to fetch export details", err);
      }
    }

    toast.dismiss(loadingToast);

    // Build Detailed Item Rows
    const detailedRows = [];
    filteredRecords.forEach((r, idx) => {
      // Basic Record Row
      const dateStr = format(new Date(r.date), 'dd/MM/yyyy HH:mm', { locale: id });

      // If linked transaction, show header then items
      if (r.reference_id && transactionDataMap.has(r.reference_id)) {
        const trx = transactionDataMap.get(r.reference_id);
        const items = trx.items || [];

        // Header Row for Transaction
        detailedRows.push([
          idx + 1,
          dateStr,
          `TRANSAKSI #${trx.transaction_number || trx.invoice_number} (${r.description})`,
          'Total',
          `"Rp ${r.amount.toLocaleString('id-ID')}"`, // Jual
          `"Rp -${(trx.total_cost || 0).toLocaleString('id-ID')}"`, // HPP (Approximated if not calculated in `r`, ideally fetch from `hppMap` logic but here we use saved trx)
          `"Rp ${(r.amount - (trx.total_cost || 0)).toLocaleString('id-ID')}"` // Profit
        ]);

        // Items
        items.forEach(item => {
          let cost = item.total_cost || 0;
          if (!cost && item.unit_cost) cost = item.unit_cost * item.quantity;

          const sellingPrice = item.subtotal || (item.price * item.quantity);
          const profit = sellingPrice - cost;

          detailedRows.push([
            '', // No ID
            '', // Date ditto
            `  - ${item.product_name} (${item.quantity} x @${(item.price || 0).toLocaleString('id-ID')})`,
            'Item',
            `"Rp ${sellingPrice.toLocaleString('id-ID')}"`,
            `"Rp -${cost.toLocaleString('id-ID')}"`,
            `"Rp ${profit.toLocaleString('id-ID')}"`
          ]);
        });

        // Shipping/Fees
        if (trx.shipping_cost > 0) {
          detailedRows.push(['', '', '  + Ongkos Kirim', 'Jasa', `"Rp ${Number(trx.shipping_cost).toLocaleString('id-ID')}"`, '-', '-']);
        }
        if (trx.discount_amount > 0) {
          detailedRows.push(['', '', '  - Diskon', 'Potongan', `"Rp -${Number(trx.discount_amount).toLocaleString('id-ID')}"`, '-', '-']);
        }

      } else {
        // Normal Finance Record
        detailedRows.push([
          idx + 1,
          dateStr,
          r.description || r.category,
          r.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
          `"${r.type === 'income' ? '+' : '-'}Rp ${r.amount.toLocaleString('id-ID')}"`,
          '-',
          '-'
        ]);
      }
    });

    const financialData = [
      [`"LAPORAN KEUANGAN ENTERPRISE - ${companyName.toUpperCase()}"`],
      [`"Periode: ${startDate && endDate ? `${format(startDate, 'dd MMMM yyyy', { locale: id })} - ${format(endDate, 'dd MMMM yyyy', { locale: id })}` : 'Semua Waktu'}"`],
      [`"Dicetak: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })} WIB"`],
      [`"${companyAddress || ''}"`],
      [`"Tel: ${companyPhone || '-'} | Email: ${companyEmail || '-'}"`],
      [`"Powered by SNISHOP.COM - Smart Business Operating System"`],
      [''],
      ['=== RINGKASAN EKSEKUTIF ==='],
      ['Metrik', 'Nilai', 'Persentase'],
      ['Total Pendapatan', `"Rp ${financials.totalIncome.toLocaleString('id-ID')}"`, `${financials.totalIncome > 0 ? '100.00%' : '0.00%'}`],
      ['Total Pengeluaran', `"Rp ${financials.totalExpense.toLocaleString('id-ID')}"`, `${financials.totalIncome > 0 ? ((financials.totalExpense / financials.totalIncome) * 100).toFixed(2) : '0.00'}%`],
      ['Laba/Rugi Bersih', `"Rp ${financials.netProfit.toLocaleString('id-ID')}"`, `${financials.profitMargin.toFixed(2)}%`],
      ['Status', `${financials.netProfit >= 0 ? 'SURPLUS' : 'DEFISIT'}`, ``],
      ['Total Transaksi', `${financials.recordCount}`, ``],
      ['- Transaksi Pemasukan', `${financials.incomeCount}`, ``],
      ['- Transaksi Pengeluaran', `${financials.expenseCount}`, ``],
      [''],
      ['=== LAPORAN LABA RUGI (INCOME STATEMENT) ==='],
      ['Keterangan', 'Jumlah (Rp)', 'Persentase (%)', 'Kontribusi'],
      [''],
      ['A. PENDAPATAN'],
      ...Object.entries(financials.incomeByCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => [
          `  ${cat}`,
          `"Rp ${amount.toLocaleString('id-ID')}"`,
          `${financials.totalIncome > 0 ? ((amount / financials.totalIncome) * 100).toFixed(2) : 0}%`,
          `${financials.totalIncome > 0 ? (amount / financials.totalIncome * 100).toFixed(1) : 0}% dari total pendapatan`
        ]),
      ['TOTAL PENDAPATAN', `"Rp ${financials.totalIncome.toLocaleString('id-ID')}"`, `100.00%`, ``],
      [''],
      ['B. BEBAN OPERASIONAL'],
      ...Object.entries(financials.expenseByCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => [
          `  ${cat}`,
          `"Rp ${amount.toLocaleString('id-ID')}"`,
          `${financials.totalExpense > 0 ? ((amount / financials.totalExpense) * 100).toFixed(2) : 0}%`,
          `${financials.totalExpense > 0 ? (amount / financials.totalExpense * 100).toFixed(1) : 0}% dari total beban`
        ]),
      ['TOTAL BEBAN OPERASIONAL', `"Rp ${financials.totalExpense.toLocaleString('id-ID')}"`, `100.00%`, ``],
      [''],
      ['C. LABA/RUGI BERSIH'],
      ['Pendapatan', `"Rp ${financials.totalIncome.toLocaleString('id-ID')}"`, ``],
      ['Beban', `"Rp (${financials.totalExpense.toLocaleString('id-ID')})"`, ''],
      ['LABA/RUGI BERSIH', `"Rp ${financials.netProfit.toLocaleString('id-ID')}"`, `${financials.profitMargin.toFixed(2)}%`],
      [''],
      ['=== NERACA (BALANCE SHEET) ==='],
      ['Pos', 'Jumlah (Rp)'],
      [''],
      ['ASET'],
      ['  Kas dan Setara Kas', `"Rp ${financials.netProfit.toLocaleString('id-ID')}"`],
      ['  Piutang Usaha', 'Rp 0'],
      ['  Persediaan', 'Rp 0'],
      ['TOTAL ASET', `"Rp ${financials.netProfit.toLocaleString('id-ID')}"`],
      [''],
      ['KEWAJIBAN'],
      ['  Hutang Usaha', 'Rp 0'],
      ['  Hutang Jangka Panjang', 'Rp 0'],
      ['TOTAL KEWAJIBAN', 'Rp 0'],
      [''],
      ['EKUITAS'],
      ['  Modal', `"Rp ${financials.totalIncome.toLocaleString('id-ID')}"`],
      ['  Laba Ditahan', `"Rp ${financials.netProfit.toLocaleString('id-ID')}"`],
      ['TOTAL EKUITAS', `"Rp ${(financials.totalIncome + financials.netProfit).toLocaleString('id-ID')}"`],
      [''],
      ['=== LAPORAN ARUS KAS (CASH FLOW STATEMENT) ==='],
      ['Aktivitas', 'Jumlah (Rp)'],
      [''],
      ['ARUS KAS DARI AKTIVITAS OPERASI'],
      ['  Penerimaan dari Pelanggan', `"Rp ${financials.totalIncome.toLocaleString('id-ID')}"`],
      ['  Pembayaran kepada Pemasok', `"Rp (${financials.totalExpense.toLocaleString('id-ID')})"`],
      ['KAS BERSIH DARI AKTIVITAS OPERASI', `"Rp ${financials.netProfit.toLocaleString('id-ID')}"`],
      [''],
      ['ARUS KAS DARI AKTIVITAS INVESTASI', 'Rp 0'],
      ['ARUS KAS DARI AKTIVITAS PENDANAAN', 'Rp 0'],
      [''],
      ['KENAIKAN (PENURUNAN) KAS', `"Rp ${financials.netProfit.toLocaleString('id-ID')}"`],
      ['KAS AWAL PERIODE', 'Rp 0'],
      ['KAS AKHIR PERIODE', `"Rp ${financials.netProfit.toLocaleString('id-ID')}"`],
      [''],
      ['=== LAPORAN BULANAN (MONTHLY ANALYSIS) ==='],
      ['Bulan', 'Pendapatan', 'Pengeluaran', 'Laba/Rugi', 'Margin (%)', 'Jumlah Transaksi', 'Growth (%)'],
      ...Object.entries(financials.monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data], idx, arr) => {
          const profit = data.income - data.expense;
          const margin = data.income > 0 ? (profit / data.income * 100) : 0;
          const prevData = idx > 0 ? arr[idx - 1][1] : null;
          const growth = prevData && prevData.income > 0
            ? ((data.income - prevData.income) / prevData.income * 100).toFixed(2)
            : '0.00';
          return [
            format(new Date(month + '-01'), 'MMMM yyyy', { locale: id }),
            `"Rp ${data.income.toLocaleString('id-ID')}"`,
            `"Rp ${data.expense.toLocaleString('id-ID')}"`,
            `"Rp ${profit.toLocaleString('id-ID')}"`,
            `${margin.toFixed(2)}%`,
            data.transactions,
            `${growth}%`
          ];
        }),
      [''],
      ['=== ANALISA PER KATEGORI (CATEGORY BREAKDOWN) ==='],
      [''],
      ['KATEGORI PENDAPATAN'],
      ['Kategori', 'Jumlah', 'Persentase', 'Rata-rata per Bulan'],
      ...Object.entries(financials.incomeByCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => [
          cat,
          `"Rp ${amount.toLocaleString('id-ID')}"`,
          `${financials.totalIncome > 0 ? ((amount / financials.totalIncome) * 100).toFixed(2) : 0}%`,
          `"Rp ${(amount / Math.max(1, Object.keys(financials.monthlyData).length)).toLocaleString('id-ID')}"`
        ]),
      [''],
      ['KATEGORI PENGELUARAN'],
      ['Kategori', 'Jumlah', 'Persentase', 'Rata-rata per Bulan'],
      ...Object.entries(financials.expenseByCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => [
          cat,
          `"Rp ${amount.toLocaleString('id-ID')}"`,
          `${financials.totalExpense > 0 ? ((amount / financials.totalExpense) * 100).toFixed(2) : 0}%`,
          `"Rp ${(amount / Math.max(1, Object.keys(financials.monthlyData).length)).toLocaleString('id-ID')}"`
        ]),
      [''],
      [''],
      ['=== DETAIL TRANSAKSI LENGKAP + ITEM (DETAILED TRANSACTION LOG) ==='],
      ['No', 'Tanggal', 'Deskripsi / Item', 'Tipe', 'Harga Jual / Masuk', 'HPP / Modal', 'Profit'],
      ...detailedRows,
      [''],
      ['=== RINGKASAN SALDO (CASH FLOW LOG) ==='],
      ['No', 'Tanggal', 'Waktu', 'Kategori', 'Deskripsi', 'Tipe', 'Jumlah', 'Saldo Berjalan', 'Sumber'],
      ...financials.cashFlowData.map((r, idx) => [
        idx + 1,
        format(new Date(r.date), 'dd/MM/yyyy', { locale: id }),
        format(new Date(r.date), 'HH:mm', { locale: id }),
        r.category || '-',
        r.description || '-',
        r.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        `"${r.type === 'income' ? '+' : '-'}Rp ${r.amount.toLocaleString('id-ID')}"`,
        `"Rp ${r.runningBalance.toLocaleString('id-ID')}"`,
        r.source || 'manual'
      ]),
      [''],
      ['=== LAPORAN PAJAK PENGHASILAN (TAX REPORT) ==='],
      ['Komponen', 'Jumlah (Rp)'],
      [''],
      ['A. PENGHASILAN BRUTO'],
      ['  Total Pendapatan', `"Rp ${financials.totalIncome.toLocaleString('id-ID')}"`],
      [''],
      ['B. PENGURANGAN'],
      ['  Biaya Operasional', `"Rp ${financials.totalExpense.toLocaleString('id-ID')}"`],
      [''],
      ['C. PENGHASILAN NETO (A - B)', `"Rp ${financials.netProfit.toLocaleString('id-ID')}"`],
      [''],
      ['D. PENGHASILAN TIDAK KENA PAJAK (PTKP)'],
      ['  PTKP (TK/0)', `"Rp 54.000.000"`],
      [''],
      ['E. PENGHASILAN KENA PAJAK (PKP)', `"Rp ${Math.max(0, financials.netProfit - 54000000).toLocaleString('id-ID')}"`],
      [''],
      ['F. PAJAK PENGHASILAN PASAL 21'],
      ['  Tarif Lapisan I (5%)', `"Rp ${(Math.min(60000000, Math.max(0, financials.netProfit - 54000000)) * 0.05).toLocaleString('id-ID')}"`],
      ['  Tarif Lapisan II (15%)', `"Rp ${(Math.min(190000000, Math.max(0, financials.netProfit - 114000000)) * 0.15).toLocaleString('id-ID')}"`],
      ['PPh 21 TERUTANG', `"Rp ${calculateTotalTax(financials.netProfit).toLocaleString('id-ID')}"`],
      [''],
      ['=== RASIO KEUANGAN (FINANCIAL RATIOS) ==='],
      ['Rasio', 'Nilai', 'Keterangan'],
      ['Profit Margin', `${financials.profitMargin.toFixed(2)}%`, `${financials.profitMargin > 20 ? 'Sangat Baik' : financials.profitMargin > 10 ? 'Baik' : financials.profitMargin > 0 ? 'Cukup' : 'Rugi'}`],
      ['Expense Ratio', `${financials.totalIncome > 0 ? ((financials.totalExpense / financials.totalIncome) * 100).toFixed(2) : 0}%`, `${financials.totalIncome > 0 && (financials.totalExpense / financials.totalIncome) < 0.5 ? 'Efisien' : 'Perlu Perbaikan'}`],
      ['Operating Cash Flow', `"Rp ${financials.netProfit.toLocaleString('id-ID')}"`, `${financials.netProfit > 0 ? 'Positif' : 'Negatif'}`],
      ['Average Transaction', `"Rp ${(financials.totalIncome / Math.max(1, financials.incomeCount)).toLocaleString('id-ID')}"`, `Rata-rata pemasukan`],
      ['Burn Rate (Monthly)', `"Rp ${(financials.totalExpense / Math.max(1, Object.keys(financials.monthlyData).length)).toLocaleString('id-ID')}"`, `Rata-rata pengeluaran per bulan`],
      [''],
      ['=== CATATAN LAPORAN ==='],
      [`"1. Laporan ini disusun berdasarkan ${financials.recordCount} transaksi yang tercatat dalam sistem"`],
      [`"2. Perhitungan pajak bersifat estimasi, konsultasikan dengan konsultan pajak untuk akurasi"`],
      [`"3. Laporan menggunakan metode pencatatan berbasis kas (cash basis)"`],
      [`"4. Data dihasilkan secara otomatis dari sistem SNISHOP pada ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })} WIB"`],
      [''],
      [`"Generated by SNISHOP.COM - Smart Business Operating System"`],
      [`"© ${new Date().getFullYear()} SNISHOP - All Rights Reserved"`]
    ];

    const csvContent = [
      ...financialData,
      ...accountSection
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Keuangan_Enterprise_${companyName}_${exportPeriod}_${Date.now()}.csv`);
    link.click();

    toast.success(`✅ Laporan Enterprise CSV berhasil diexport (${financials.recordCount} transaksi)`, {
      duration: 4000,
      description: 'File berisi: Laba Rugi, Neraca, Arus Kas, Detail, Bulanan, Kategori, Pajak, Rasio'
    });
    setShowExportDialog(false);
  };

  const calculateTotalTax = (netProfit) => {
    const pkp = Math.max(0, netProfit - 54000000);
    let tax = 0;

    // Layer 1: 0 - 60jt = 5%
    if (pkp > 0) {
      tax += Math.min(60000000, pkp) * 0.05;
    }

    // Layer 2: 60jt - 250jt = 15%
    if (pkp > 60000000) {
      tax += Math.min(190000000, pkp - 60000000) * 0.15;
    }

    // Layer 3: 250jt - 500jt = 25%
    if (pkp > 250000000) {
      tax += Math.min(250000000, pkp - 250000000) * 0.25;
    }

    // Layer 4: > 500jt = 30%
    if (pkp > 500000000) {
      tax += (pkp - 500000000) * 0.30;
    }

    return tax;
  };

  const exportProfessionalPDF = () => {
    const filteredRecords = getFilteredRecords();
    const financials = calculateFinancials(filteredRecords);
    const { startDate, endDate } = getDateRange(exportPeriod);

    // PDF Account Section Generator
    let accountPdfHtml = '';
    if (includeAccountDetails) {
      const movements = {};
      accounts.forEach(acc => {
        movements[acc.id] = { name: acc.name, type: acc.type, number: acc.account_number, income: 0, expense: 0, balance: acc.calculated_balance, is_virtual: false };
      });
      const KAS_BESAR_ID = 'virtual_kas_besar';
      filteredRecords.forEach(r => {
        let accId = r.account_id;
        if (!accId || !movements[accId]) {
          if (!movements[KAS_BESAR_ID]) {
            movements[KAS_BESAR_ID] = { name: 'KAS BESAR PERUSAHAAN (Default)', type: 'KAS UTAMA', number: 'MAIN', income: 0, expense: 0, balance: 0, is_virtual: true };
          }
          accId = KAS_BESAR_ID;
        }
        if (r.type === 'income') movements[accId].income += r.amount;
        if (r.type === 'expense') movements[accId].expense += r.amount;
        if (accId === KAS_BESAR_ID) {
          if (r.type === 'income') movements[accId].balance += r.amount;
          if (r.type === 'expense') movements[accId].balance -= r.amount;
        }
      });

      const activeAccounts = Object.values(movements).filter(m => m.income > 0 || m.expense > 0 || m.balance > 0 || !m.is_virtual);

      accountPdfHtml = `
           <!-- ACCOUNT DETAIL -->
           <div class="section">
             <h2 class="section-title">🏦 DETAIL MUTASI & SALDO REKENING</h2>
             <table>
               <thead>
                 <tr>
                   <th>Nama Rekening</th>
                   <th>Jenis</th>
                   <th class="text-right">Masuk</th>
                   <th class="text-right">Keluar</th>
                   <th class="text-right">Saldo Akhir</th>
                 </tr>
               </thead>
               <tbody>
                 ${activeAccounts.map(m => `
                   <tr>
                     <td>
                       <strong>${m.name}</strong><br/>
                       <span style="font-size:9px; color:#666;">${m.number}</span>
                     </td>
                     <td><span class="badge badge-success">${m.type.toUpperCase()}</span></td>
                     <td class="text-right profit">Rp ${m.income.toLocaleString('id-ID')}</td>
                     <td class="text-right loss">Rp ${m.expense.toLocaleString('id-ID')}</td>
                     <td class="text-right" style="font-weight:bold;">Rp ${m.balance.toLocaleString('id-ID')}</td>
                   </tr>
                 `).join('')}
               </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td colspan="2" class="text-right">TOTAL KESELURUHAN</td>
                    <td class="text-right profit">Rp ${activeAccounts.reduce((sum, m) => sum + m.income, 0).toLocaleString('id-ID')}</td>
                    <td class="text-right loss">Rp ${activeAccounts.reduce((sum, m) => sum + m.expense, 0).toLocaleString('id-ID')}</td>
                    <td class="text-right" style="font-weight:bold; color:#1f2937;">Rp ${activeAccounts.reduce((sum, m) => sum + m.balance, 0).toLocaleString('id-ID')}</td>
                  </tr>
                </tfoot>
              </table>
             <p style="font-size:10px; color:#666; margin-top:5px;">* Saldo Akhir mencerminkan saldo saat ini (Realtime). Masuk/Keluar adalah mutasi periode ini.</p>
           </div>
           <div class="page-break"></div>
       `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Laporan Keuangan Enterprise - ${companyName}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
              .page-break { page-break-before: always; }
            }
            
            body {
              font-family: 'Arial', 'Segoe UI', sans-serif;
              padding: 0;
              margin: 0;
              font-size: 10px;
              line-height: 1.4;
              color: #1f2937;
            }
            
            .header {
              text-align: center;
              margin-bottom: 25px;
              padding-bottom: 15px;
              border-bottom: 3px double #3b82f6;
            }
            
            .logo-company {
              max-width: 160px;
              height: auto;
              margin: 0 auto 12px;
            }
            
            .company-name {
              font-size: 20px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 4px;
            }
            
            .company-info {
              font-size: 9px;
              color: #6b7280;
              margin-bottom: 3px;
            }
            
            .report-title {
              font-size: 16px;
              font-weight: bold;
              color: #3b82f6;
              margin: 10px 0 5px 0;
            }
            
            .period {
              font-size: 11px;
              color: #6b7280;
            }
            
            .section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            
            .section-title {
              font-size: 13px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 12px;
              padding: 8px 10px;
              background: linear-gradient(90deg, #f3f4f6 0%, #ffffff 100%);
              border-left: 4px solid #3b82f6;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
            }
            
            thead th {
              background: #f3f4f6;
              padding: 8px;
              text-align: left;
              font-weight: bold;
              border-bottom: 2px solid #d1d5db;
              font-size: 10px;
              color: #374151;
            }
            
            tbody td {
              padding: 6px 8px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 10px;
            }
            
            .indent {
              padding-left: 25px;
              color: #4b5563;
            }
            
            .total-row {
              font-weight: bold;
              background: #f9fafb;
              border-top: 2px solid #9ca3af;
              border-bottom: 2px solid #9ca3af;
            }
            
            .summary-box {
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              color: white;
              padding: 18px;
              border-radius: 8px;
              margin: 15px 0;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              margin-bottom: 15px;
            }
            
            .summary-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 11px;
            }
            
            .summary-main {
              font-size: 16px;
              font-weight: bold;
              border-top: 2px solid rgba(255,255,255,0.3);
              padding-top: 12px;
              margin-top: 12px;
            }
            
            .profit { color: #10b981; font-weight: bold; }
            .loss { color: #ef4444; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin: 15px 0;
            }
            
            .kpi-card {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 12px;
              text-align: center;
            }
            
            .kpi-value {
              font-size: 18px;
              font-weight: bold;
              color: #3b82f6;
              margin: 5px 0;
            }
            
            .kpi-label {
              font-size: 9px;
              color: #6b7280;
              text-transform: uppercase;
            }
            
            .chart-placeholder {
              background: #f9fafb;
              border: 1px dashed #d1d5db;
              border-radius: 6px;
              padding: 20px;
              text-align: center;
              color: #9ca3af;
              margin: 15px 0;
            }
            
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
            }
            
            .footer-logo {
              max-width: 100px;
              margin: 8px auto;
            }
            
            .footer-text {
              color: #6b7280;
              font-size: 9px;
              margin: 3px 0;
            }
            
            .badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 9px;
              font-weight: bold;
            }
            
            .badge-success {
              background: #d1fae5;
              color: #065f46;
            }
            
            .badge-danger {
              background: #fee2e2;
              color: #991b1b;
            }
            
            .highlight-box {
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
              padding: 12px;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <!-- HEADER -->
          <div class="header">
            <img src="${companyLogo}" alt="Company Logo" class="logo-company" onerror="this.style.display='none'" />
            <div class="company-name">${companyName}</div>
            ${companyAddress ? `<div class="company-info">${companyAddress}</div>` : ''}
            ${companyPhone ? `<div class="company-info">Tel: ${companyPhone}${companyEmail ? ' | Email: ' + companyEmail : ''}</div>` : ''}
            <div class="report-title">LAPORAN KEUANGAN ENTERPRISE</div>
            <div class="period">
              Periode: ${startDate && endDate ? `${format(startDate, 'dd MMMM yyyy', { locale: id })} - ${format(endDate, 'dd MMMM yyyy', { locale: id })}` : 'Semua Waktu'}
            </div>
            <div class="period">
              Dicetak: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })} WIB
            </div>
          </div>

          <!-- KPI DASHBOARD -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Total Pendapatan</div>
              <div class="kpi-value profit">Rp ${financials.totalIncome.toLocaleString('id-ID')}</div>
              <div class="kpi-label">${financials.incomeCount} transaksi</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Pengeluaran</div>
              <div class="kpi-value loss">Rp ${financials.totalExpense.toLocaleString('id-ID')}</div>
              <div class="kpi-label">${financials.expenseCount} transaksi</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Laba Bersih</div>
              <div class="kpi-value ${financials.netProfit >= 0 ? 'profit' : 'loss'}">
                Rp ${Math.abs(financials.netProfit).toLocaleString('id-ID')}
              </div>
              <div class="kpi-label">Margin ${financials.profitMargin.toFixed(1)}%</div>
            </div>
          </div>

          <!-- EXECUTIVE SUMMARY -->
          <div class="summary-box">
            <h2 style="margin: 0 0 12px 0; font-size: 14px;">📊 RINGKASAN EKSEKUTIF</h2>
            <div class="summary-grid">
              <div>
                <div class="summary-item">
                  <span>Total Pendapatan:</span>
                  <span>Rp ${financials.totalIncome.toLocaleString('id-ID')}</span>
                </div>
                <div class="summary-item">
                  <span>Total Pengeluaran:</span>
                  <span>Rp ${financials.totalExpense.toLocaleString('id-ID')}</span>
                </div>
                <div class="summary-item">
                  <span>Total Transaksi:</span>
                  <span>${financials.recordCount} transaksi</span>
                </div>
              </div>
              <div>
                <div class="summary-item">
                  <span>Pemasukan:</span>
                  <span>${financials.incomeCount} transaksi</span>
                </div>
                <div class="summary-item">
                  <span>Pengeluaran:</span>
                  <span>${financials.expenseCount} transaksi</span>
                </div>
                <div class="summary-item">
                  <span>Periode:</span>
                  <span>${Object.keys(financials.monthlyData).length} bulan</span>
                </div>
              </div>
            </div>
            <div class="summary-main">
              <div class="summary-item" style="font-size: 18px;">
                <span>LABA/RUGI BERSIH:</span>
                <span>Rp ${financials.netProfit.toLocaleString('id-ID')}</span>
              </div>
              <div class="summary-item" style="font-size: 13px;">
                <span>Posisi Piutang (Assets):</span>
                <span style="color: #10b981;">Rp ${financials.totalReceivable.toLocaleString('id-ID')}</span>
              </div>
              <div class="summary-item" style="font-size: 13px;">
                <span>Posisi Hutang (Liabilities):</span>
                <span style="color: #ef4444;">Rp ${financials.totalDebt.toLocaleString('id-ID')}</span>
              </div>
              <div class="summary-item" style="font-size: 13px;">
                <span>Profit Margin:</span>
                <span>${financials.profitMargin.toFixed(2)}%</span>
              </div>
              <div class="summary-item" style="font-size: 13px;">
                <span>Status Operasional:</span>
                <span style="background: ${financials.netProfit >= 0 ? '#10b981' : '#ef4444'}; padding: 4px 12px; border-radius: 4px;">
                  ${financials.netProfit >= 0 ? '✓ SURPLUS' : '⚠ DEFISIT'}
                </span>
              </div>
            </div>
          </div>

          <!-- PAGE 1: INCOME STATEMENT -->
          <div class="section">
            <h2 class="section-title">📈 LAPORAN LABA RUGI (Income Statement)</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">Keterangan</th>
                  <th class="text-right" style="width: 30%;">Jumlah (Rp)</th>
                  <th class="text-right" style="width: 20%;">Persentase</th>
                </tr>
              </thead>
              <tbody>
                <tr style="background: #f3f4f6; font-weight: bold;">
                  <td colspan="3">A. PENDAPATAN</td>
                </tr>
                ${Object.entries(financials.incomeByCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => `
                    <tr>
                      <td class="indent">${cat}</td>
                      <td class="text-right">Rp ${amount.toLocaleString('id-ID')}</td>
                      <td class="text-right">${financials.totalIncome > 0 ? ((amount / financials.totalIncome) * 100).toFixed(2) : 0}%</td>
                    </tr>
                  `).join('')}
                <tr class="total-row">
                  <td><strong>TOTAL PENDAPATAN</strong></td>
                  <td class="text-right profit">Rp ${financials.totalIncome.toLocaleString('id-ID')}</td>
                  <td class="text-right">100.00%</td>
                </tr>
                <tr><td colspan="3" style="height: 15px;"></td></tr>
                <tr style="background: #f3f4f6; font-weight: bold;">
                  <td colspan="3">B. BEBAN OPERASIONAL</td>
                </tr>
                ${Object.entries(financials.expenseByCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => `
                    <tr>
                      <td class="indent">${cat}</td>
                      <td class="text-right">Rp ${amount.toLocaleString('id-ID')}</td>
                      <td class="text-right">${financials.totalExpense > 0 ? ((amount / financials.totalExpense) * 100).toFixed(2) : 0}%</td>
                    </tr>
                  `).join('')}
                <tr class="total-row">
                  <td><strong>TOTAL BEBAN</strong></td>
                  <td class="text-right loss">Rp ${financials.totalExpense.toLocaleString('id-ID')}</td>
                  <td class="text-right">100.00%</td>
                </tr>
                <tr><td colspan="3" style="height: 15px;"></td></tr>
                <tr style="background: ${financials.netProfit >= 0 ? '#d1fae5' : '#fee2e2'}; font-weight: bold; font-size: 12px;">
                  <td style="padding: 12px 10px;"><strong>C. LABA/RUGI BERSIH</strong></td>
                  <td class="text-right ${financials.netProfit >= 0 ? 'profit' : 'loss'}" style="padding: 12px 10px; font-size: 13px;">
                    Rp ${financials.netProfit.toLocaleString('id-ID')}
                  </td>
                  <td class="text-right" style="padding: 12px 10px;">
                    ${financials.profitMargin.toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- BALANCE SHEET -->
          <div class="section">
            <h2 class="section-title">💼 NERACA (Balance Sheet)</h2>
            <table>
              <thead>
                <tr>
                  <th>Pos</th>
                  <th class="text-right">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="background: #f3f4f6; font-weight: bold;">
                  <td colspan="2">ASET</td>
                </tr>
                <tr>
                  <td class="indent">Kas dan Setara Kas</td>
                  <td class="text-right">Rp ${financials.netProfit.toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td class="indent">Piutang Usaha (Receivable)</td>
                  <td class="text-right">Rp ${financials.totalReceivable.toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td class="indent">Investasi</td>
                  <td class="text-right">Rp ${financials.totalInvestment.toLocaleString('id-ID')}</td>
                </tr>
                <tr class="total-row">
                  <td><strong>TOTAL ASET</strong></td>
                  <td class="text-right profit">Rp ${(financials.netProfit + financials.totalReceivable + financials.totalInvestment).toLocaleString('id-ID')}</td>
                </tr>
                <tr><td colspan="2" style="height: 15px;"></td></tr>
                <tr style="background: #f3f4f6; font-weight: bold;">
                  <td colspan="2">KEWAJIBAN</td>
                </tr>
                <tr>
                  <td class="indent">Hutang Usaha (Debt)</td>
                  <td class="text-right">Rp ${financials.totalDebt.toLocaleString('id-ID')}</td>
                </tr>
                <tr class="total-row">
                  <td><strong>TOTAL KEWAJIBAN</strong></td>
                  <td class="text-right loss">Rp ${financials.totalDebt.toLocaleString('id-ID')}</td>
                </tr>
                <tr><td colspan="2" style="height: 15px;"></td></tr>
                <tr style="background: #f3f4f6; font-weight: bold;">
                  <td colspan="2">EKUITAS</td>
                </tr>
                <tr>
                  <td class="indent">Laba Ditahan</td>
                  <td class="text-right">Rp ${financials.netProfit.toLocaleString('id-ID')}</td>
                </tr>
                <tr class="total-row">
                  <td><strong>EKUITAS BERSIH (Aset - Kewajiban)</strong></td>
                  <td class="text-right profit">Rp ${(financials.netProfit + financials.totalReceivable + financials.totalInvestment - financials.totalDebt).toLocaleString('id-ID')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- PAGE BREAK -->
          <div class="page-break"></div>

          <!-- CASH FLOW -->
          <div class="section">
            <h2 class="section-title">💰 LAPORAN ARUS KAS (Cash Flow Statement)</h2>
            <table>
              <thead>
                <tr>
                  <th>Aktivitas</th>
                  <th class="text-right">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="background: #f3f4f6; font-weight: bold;">
                  <td colspan="2">ARUS KAS DARI AKTIVITAS OPERASI</td>
                </tr>
                <tr>
                  <td class="indent">Penerimaan dari Pendapatan</td>
                  <td class="text-right profit">Rp ${financials.totalIncome.toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td class="indent">Pembayaran Beban Operasional</td>
                  <td class="text-right loss">Rp (${financials.totalExpense.toLocaleString('id-ID')})</td>
                </tr>
                <tr class="total-row">
                  <td><strong>KAS BERSIH DARI AKTIVITAS OPERASI</strong></td>
                  <td class="text-right ${financials.netProfit >= 0 ? 'profit' : 'loss'}">
                    Rp ${financials.netProfit.toLocaleString('id-ID')}
                  </td>
                </tr>
                <tr><td colspan="2" style="height: 10px;"></td></tr>
                <tr>
                  <td><strong>ARUS KAS DARI AKTIVITAS INVESTASI</strong></td>
                  <td class="text-right">Rp 0</td>
                </tr>
                <tr>
                  <td><strong>ARUS KAS DARI AKTIVITAS PENDANAAN</strong></td>
                  <td class="text-right">Rp 0</td>
                </tr>
                <tr><td colspan="2" style="height: 10px;"></td></tr>
                <tr class="total-row" style="background: ${financials.netProfit >= 0 ? '#d1fae5' : '#fee2e2'};">
                  <td><strong>KENAIKAN (PENURUNAN) KAS BERSIH</strong></td>
                  <td class="text-right ${financials.netProfit >= 0 ? 'profit' : 'loss'}" style="font-size: 12px;">
                    Rp ${financials.netProfit.toLocaleString('id-ID')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- MONTHLY TREND -->
          ${Object.keys(financials.monthlyData).length > 0 ? `
          <div class="section">
            <h2 class="section-title">📅 TREN BULANAN (Monthly Trend)</h2>
            <table>
              <thead>
                <tr>
                  <th>Bulan</th>
                  <th class="text-right">Pendapatan</th>
                  <th class="text-right">Pengeluaran</th>
                  <th class="text-right">Laba/Rugi</th>
                  <th class="text-right">Margin</th>
                  <th class="text-center">Transaksi</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(financials.monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => {
            const profit = data.income - data.expense;
            const margin = data.income > 0 ? (profit / data.income * 100) : 0;
            return `
                      <tr>
                        <td>${format(new Date(month + '-01'), 'MMMM yyyy', { locale: id })}</td>
                        <td class="text-right profit">Rp ${data.income.toLocaleString('id-ID')}</td>
                        <td class="text-right loss">Rp ${data.expense.toLocaleString('id-ID')}</td>
                        <td class="text-right ${profit >= 0 ? 'profit' : 'loss'}">Rp ${profit.toLocaleString('id-ID')}</td>
                        <td class="text-right">${margin.toFixed(2)}%</td>
                        <td class="text-center">${data.transactions}</td>
                      </tr>
                    `;
          }).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <!-- PAGE BREAK -->
          <div class="page-break"></div>

          <!-- CATEGORY ANALYSIS -->
          <div class="section">
            <h2 class="section-title">🎯 ANALISA PER KATEGORI</h2>
            
            <h3 style="font-size: 12px; font-weight: bold; margin: 15px 0 10px 0; color: #10b981;">Breakdown Pendapatan</h3>
            <table>
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th class="text-right">Jumlah</th>
                  <th class="text-right">Persentase</th>
                  <th class="text-right">Rata-rata/Bulan</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(financials.incomeByCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => `
                    <tr>
                      <td>${cat}</td>
                      <td class="text-right">Rp ${amount.toLocaleString('id-ID')}</td>
                      <td class="text-right">${financials.totalIncome > 0 ? ((amount / financials.totalIncome) * 100).toFixed(2) : 0}%</td>
                      <td class="text-right">Rp ${(amount / Math.max(1, Object.keys(financials.monthlyData).length)).toLocaleString('id-ID')}</td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>

            <h3 style="font-size: 12px; font-weight: bold; margin: 20px 0 10px 0; color: #ef4444;">Breakdown Pengeluaran</h3>
            <table>
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th class="text-right">Jumlah</th>
                  <th class="text-right">Persentase</th>
                  <th class="text-right">Rata-rata/Bulan</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(financials.expenseByCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => `
                    <tr>
                      <td>${cat}</td>
                      <td class="text-right">Rp ${amount.toLocaleString('id-ID')}</td>
                      <td class="text-right">${financials.totalExpense > 0 ? ((amount / financials.totalExpense) * 100).toFixed(2) : 0}%</td>
                      <td class="text-right">Rp ${(amount / Math.max(1, Object.keys(financials.monthlyData).length)).toLocaleString('id-ID')}</td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
          </div>

          <!-- PAGE BREAK -->
          <div class="page-break"></div>

          <!-- TRANSACTION DETAIL -->
          <div class="section">
            <h2 class="section-title">📋 DETAIL TRANSAKSI (${financials.recordCount} Transaksi)</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 5%;">No</th>
                  <th style="width: 12%;">Tanggal</th>
                  <th style="width: 15%;">Kategori</th>
                  <th style="width: 33%;">Deskripsi</th>
                  <th style="width: 10%;">Tipe</th>
                  <th class="text-right" style="width: 15%;">Jumlah</th>
                  <th class="text-right" style="width: 10%;">Saldo</th>
                </tr>
              </thead>
              <tbody>
                ${financials.cashFlowData.slice(0, 1000).map((r, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${format(new Date(r.date), 'dd/MM/yy HH:mm', { locale: id })}</td>
                    <td>${r.category || '-'}</td>
                    <td style="font-size: 9px;">${r.description || '-'}</td>
                    <td>
                      <span class="badge ${r.type === 'income' ? 'badge-success' : 'badge-danger'}">
                        ${r.type === 'income' ? 'IN' : 'OUT'}
                      </span>
                    </td>
                    <td class="text-right ${r.type === 'income' ? 'profit' : 'loss'}">
                      ${r.type === 'income' ? '+' : '-'}Rp ${r.amount.toLocaleString('id-ID')}
                    </td>
                    <td class="text-right" style="font-size: 9px;">Rp ${r.runningBalance.toLocaleString('id-ID')}</td>
                  </tr>
                `).join('')}
                ${financials.recordCount > 1000 ? `
                  <tr>
                    <td colspan="7" class="text-center" style="padding: 15px; color: #6b7280; font-style: italic;">
                      ... dan ${financials.recordCount - 1000} transaksi lainnya (total ${financials.recordCount} transaksi)
                    </td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>

          <!-- PAGE BREAK -->
          <div class="page-break"></div>

          <!-- TAX REPORT -->
          <div class="section">
            <h2 class="section-title">💵 LAPORAN PAJAK PENGHASILAN (PPh 21)</h2>
            <div class="highlight-box">
              <p style="margin: 0; font-size: 10px;">
                ⚠️ <strong>Catatan:</strong> Perhitungan pajak bersifat estimasi. Konsultasikan dengan konsultan pajak untuk akurasi.
              </p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Komponen</th>
                  <th class="text-right">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="background: #f3f4f6; font-weight: bold;">
                  <td>A. PENGHASILAN BRUTO</td>
                  <td class="text-right profit">Rp ${financials.totalIncome.toLocaleString('id-ID')}</td>
                </tr>
                <tr><td colspan="2" style="height: 8px;"></td></tr>
                <tr style="background: #f3f4f6; font-weight: bold;">
                  <td>B. PENGURANGAN (Biaya Operasional)</td>
                  <td class="text-right loss">Rp ${financials.totalExpense.toLocaleString('id-ID')}</td>
                </tr>
                <tr><td colspan="2" style="height: 8px;"></td></tr>
                <tr class="total-row">
                  <td><strong>C. PENGHASILAN NETO (A - B)</strong></td>
                  <td class="text-right">Rp ${financials.netProfit.toLocaleString('id-ID')}</td>
                </tr>
                <tr><td colspan="2" style="height: 8px;"></td></tr>
                <tr>
                  <td>D. PTKP (Penghasilan Tidak Kena Pajak)</td>
                  <td class="text-right">Rp 54.000.000</td>
                </tr>
                <tr><td colspan="2" style="height: 8px;"></td></tr>
                <tr class="total-row">
                  <td><strong>E. PKP (Penghasilan Kena Pajak)</strong></td>
                  <td class="text-right">Rp ${Math.max(0, financials.netProfit - 54000000).toLocaleString('id-ID')}</td>
                </tr>
                <tr><td colspan="2" style="height: 12px;"></td></tr>
                <tr style="background: #f3f4f6; font-weight: bold;">
                  <td colspan="2">F. PERHITUNGAN PPh 21</td>
                </tr>
                <tr>
                  <td class="indent">Lapisan I (0 - 60jt @ 5%)</td>
                  <td class="text-right">Rp ${(Math.min(60000000, Math.max(0, financials.netProfit - 54000000)) * 0.05).toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td class="indent">Lapisan II (60jt - 250jt @ 15%)</td>
                  <td class="text-right">Rp ${(Math.min(190000000, Math.max(0, financials.netProfit - 114000000)) * 0.15).toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td class="indent">Lapisan III (250jt - 500jt @ 25%)</td>
                  <td class="text-right">Rp ${(Math.min(250000000, Math.max(0, financials.netProfit - 304000000)) * 0.25).toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td class="indent">Lapisan IV (> 500jt @ 30%)</td>
                  <td class="text-right">Rp ${(Math.max(0, financials.netProfit - 554000000) * 0.30).toLocaleString('id-ID')}</td>
                </tr>
                <tr class="total-row" style="background: #fef3c7;">
                  <td style="font-size: 12px;"><strong>TOTAL PPh 21 TERUTANG</strong></td>
                  <td class="text-right" style="color: #d97706; font-size: 13px; font-weight: bold;">
                    Rp ${calculateTotalTax(financials.netProfit).toLocaleString('id-ID')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          ${accountPdfHtml} 

          <!-- FINANCIAL RATIOS -->
          <div class="section">
            <h2 class="section-title">📊 RASIO KEUANGAN (Financial Ratios)</h2>
            <table>
              <thead>
                <tr>
                  <th>Rasio</th>
                  <th class="text-right">Nilai</th>
                  <th>Interpretasi</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Profit Margin Ratio</strong></td>
                  <td class="text-right">${financials.profitMargin.toFixed(2)}%</td>
                  <td>
                    <span class="badge ${financials.profitMargin > 20 ? 'badge-success' : financials.profitMargin > 10 ? 'badge-success' : financials.profitMargin > 0 ? 'badge-danger' : 'badge-danger'}">
                      ${financials.profitMargin > 20 ? 'Sangat Baik' : financials.profitMargin > 10 ? 'Baik' : financials.profitMargin > 0 ? 'Cukup' : 'Rugi'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td><strong>Expense Ratio</strong></td>
                  <td class="text-right">${financials.totalIncome > 0 ? ((financials.totalExpense / financials.totalIncome) * 100).toFixed(2) : 0}%</td>
                  <td>
                    <span class="badge ${financials.totalIncome > 0 && (financials.totalExpense / financials.totalIncome) < 0.5 ? 'badge-success' : 'badge-danger'}">
                      ${financials.totalIncome > 0 && (financials.totalExpense / financials.totalIncome) < 0.5 ? 'Efisien' : 'Perlu Perbaikan'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td><strong>Operating Cash Flow</strong></td>
                  <td class="text-right">Rp ${financials.netProfit.toLocaleString('id-ID')}</td>
                  <td>
                    <span class="badge ${financials.netProfit > 0 ? 'badge-success' : 'badge-danger'}">
                      ${financials.netProfit > 0 ? 'Positif' : 'Negatif'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td><strong>Rata-rata Transaksi Masuk</strong></td>
                  <td class="text-right">Rp ${(financials.totalIncome / Math.max(1, financials.incomeCount)).toLocaleString('id-ID')}</td>
                  <td>Per transaksi pemasukan</td>
                </tr>
                <tr>
                  <td><strong>Burn Rate (Bulanan)</strong></td>
                  <td class="text-right">Rp ${(financials.totalExpense / Math.max(1, Object.keys(financials.monthlyData).length)).toLocaleString('id-ID')}</td>
                  <td>Rata-rata pengeluaran per bulan</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- NOTES -->
          <div class="section">
            <h2 class="section-title">📝 CATATAN ATAS LAPORAN KEUANGAN</h2>
            <ol style="padding-left: 20px; margin: 0; line-height: 1.8;">
              <li>Laporan keuangan ini disusun berdasarkan <strong>${financials.recordCount} transaksi</strong> yang tercatat dalam sistem SNISHOP periode ${startDate && endDate ? `${format(startDate, 'dd MMMM yyyy', { locale: id })} sampai ${format(endDate, 'dd MMMM yyyy', { locale: id })}` : 'semua waktu'}.</li>
              <li>Metode pencatatan menggunakan <strong>cash basis</strong> (pencatatan berbasis kas).</li>
              <li>Perhitungan pajak penghasilan (PPh 21) bersifat <strong>estimasi</strong> dan perlu dikonsultasikan dengan konsultan pajak untuk keakuratan.</li>
              <li>Neraca disusun berdasarkan akumulasi laba/rugi bersih periode berjalan.</li>
              <li>Laporan arus kas menggunakan metode <strong>direct method</strong>.</li>
              <li>Semua nilai dalam mata uang <strong>Rupiah (IDR)</strong>.</li>
              <li>Data dihasilkan secara otomatis dari sistem SNISHOP Smart Business Operating System.</li>
            </ol>
          </div>

          <!-- FOOTER -->
          <div class="footer">
            <img src="${SNISHOP_LOGO}" alt="SNISHOP Logo" class="footer-logo" onerror="this.style.display='none'" />
            <p class="footer-text"><strong>Powered by SNISHOP.COM</strong></p>
            <p class="footer-text">Smart Business Operating System - Solusi Manajemen Keuangan Enterprise</p>
            <p class="footer-text" style="margin-top: 8px; font-size: 8px; color: #9ca3af;">
              Laporan ini dihasilkan secara otomatis oleh sistem SNISHOP pada ${format(new Date(), 'dd MMMM yyyy HH:mm:ss', { locale: id })} WIB
            </p>
            <p class="footer-text" style="font-size: 8px; color: #9ca3af;">
              © ${new Date().getFullYear()} SNISHOP - All Rights Reserved | www.snishop.com
            </p>
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 800);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    toast.success(`✅ Laporan PDF Enterprise siap dicetak (${financials.recordCount} transaksi)`, {
      duration: 4000,
      description: 'Lengkap dengan logo perusahaan & SNISHOP branding'
    });
    setShowExportDialog(false);
  };

  return (
    <>
      <Button
        onClick={() => setShowExportDialog(true)}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
      >
        <TrendingUp className="w-4 h-4 mr-2" />
        Laporan Enterprise
      </Button>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="bg-gray-900 text-white border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-6 h-6 text-purple-400" />
              Export Laporan Enterprise
            </DialogTitle>
            <p className="text-xs text-gray-400 mt-2">
              Format profesional standar akuntansi internasional
            </p>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Period Selector */}
            <div>
              <Label className="text-gray-300">Periode Laporan</Label>
              <Select value={exportPeriod} onValueChange={setExportPeriod}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-2">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">📊 Semua Data</SelectItem>
                  <SelectItem value="this_month">📅 Bulan Ini</SelectItem>
                  <SelectItem value="last_month">📅 Bulan Lalu</SelectItem>
                  <SelectItem value="this_year">📅 Tahun Ini</SelectItem>
                  <SelectItem value="last_year">📅 Tahun Lalu</SelectItem>
                  <SelectItem value="custom">🎯 Kustom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
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

            <div className="flex items-center space-x-2 pt-2 pb-2">
              <Checkbox
                id="include-accounts"
                checked={includeAccountDetails}
                onCheckedChange={setIncludeAccountDetails}
                className="border-gray-500 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
              />
              <Label htmlFor="include-accounts" className="text-sm text-gray-300 cursor-pointer">
                Sertakan Detail Saldo Rekening
              </Label>
            </div>

            {/* Info Badge */}
            <div className="p-4 bg-purple-900/20 border border-purple-700 rounded-lg">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-purple-300">
                  <p className="font-semibold mb-2">Laporan Enterprise Lengkap:</p>
                  <ul className="space-y-1 ml-2">
                    <li>✓ Logo Perusahaan & Info Kontak</li>
                    <li>✓ KPI Dashboard & Ringkasan Eksekutif</li>
                    <li>✓ Laporan Laba Rugi (Income Statement)</li>
                    <li>✓ Neraca (Balance Sheet)</li>
                    <li>✓ Laporan Arus Kas (Cash Flow)</li>
                    <li>✓ Tren & Analisa Bulanan</li>
                    <li>✓ Breakdown per Kategori</li>
                    <li>✓ Detail Transaksi + Saldo Berjalan</li>
                    <li>✓ Laporan Pajak (PPh 21)</li>
                    <li>✓ Rasio Keuangan & KPI</li>
                    <li>✓ Catatan Atas Laporan</li>
                    <li>✓ SNISHOP Branding & Footer</li>
                  </ul>
                  <p className="mt-3 text-purple-200 font-semibold">
                    📊 {getFilteredRecords().length} transaksi siap diexport
                  </p>
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                onClick={exportProfessionalCSV}
                className="bg-green-600 hover:bg-green-700"
                disabled={exportPeriod === 'custom' && (!customDateRange.start || !customDateRange.end)}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                CSV/Excel
              </Button>
              <Button
                onClick={exportProfessionalPDF}
                className="bg-red-600 hover:bg-red-700"
                disabled={exportPeriod === 'custom' && (!customDateRange.start || !customDateRange.end)}
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF Pro
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500 mt-2">
              Format enterprise-level dengan logo perusahaan & SNISHOP branding
            </p>
          </div>
        </DialogContent>
      </Dialog >
    </>
  );
}

// ✅ Extracted Helper Function
// ✅ Extracted Helper Function
function calculateFinancials(filteredRecords) {
  const income = filteredRecords.filter(r => r.type === 'income');
  const expense = filteredRecords.filter(r => r.type === 'expense');
  const debt = filteredRecords.filter(r => r.type === 'debt'); // Liabilities (Dana Masuk)
  const receivable = filteredRecords.filter(r => r.type === 'receivable'); // Assets (Dana Keluar)
  const investment = filteredRecords.filter(r => r.type === 'investment'); // Assets

  const incomeByCategory = {};
  income.forEach(r => {
    const cat = r.category || 'Lainnya';
    incomeByCategory[cat] = (incomeByCategory[cat] || 0) + r.amount;
  });

  const expenseByCategory = {};
  expense.forEach(r => {
    const cat = r.category || 'Lainnya';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + r.amount;
  });

  const totalIncome = income.reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = expense.reduce((sum, r) => sum + r.amount, 0);
  const totalDebt = debt.reduce((sum, r) => sum + r.amount, 0); // Total Hutang (Liability)
  const totalReceivable = receivable.reduce((sum, r) => sum + r.amount, 0); // Total Piutang (Asset)
  const totalInvestment = investment.reduce((sum, r) => sum + r.amount, 0);

  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome * 100) : 0;

  const monthlyData = {};
  filteredRecords.forEach(r => {
    try {
      if (!r.date) return;
      const date = new Date(r.date);
      if (isNaN(date.getTime())) return;

      const month = format(date, 'yyyy-MM'); // Ensure 'format' is imported/available
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0, transactions: 0 };
      }

      if (r.type === 'income') monthlyData[month].income += r.amount;
      else if (r.type === 'expense') monthlyData[month].expense += r.amount;

      monthlyData[month].transactions++;
    } catch (err) { }
  });

  // Cash Flow Running Balance
  let runningBalance = 0;
  const cashFlowData = filteredRecords
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(r => {
      let change = 0;
      if (r.type === 'income' || r.type === 'debt') change = r.amount; // Cash In
      else if (r.type === 'expense' || r.type === 'receivable' || r.type === 'investment') change = -r.amount; // Cash Out

      runningBalance += change;
      return { ...r, runningBalance, cashChange: change };
    });

  return {
    totalIncome,
    totalExpense,
    totalDebt,
    totalReceivable,
    totalInvestment,
    netProfit,
    profitMargin,
    incomeByCategory,
    expenseByCategory,
    monthlyData,
    cashFlowData,
    recordCount: filteredRecords.length
  };
}