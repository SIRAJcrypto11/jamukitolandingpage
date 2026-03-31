
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';

export default function FinancialReports({ records, accounts = [], startDate, endDate, companyName, mode }) {
  const [selectedReport, setSelectedReport] = useState('income_statement');

  // Logic filter removed (handled in parent)

  // Safe date handling with fallbacks
  const safeStartDate = useMemo(() => {
    if (startDate && startDate instanceof Date && !isNaN(startDate)) {
      return startDate;
    }
    return startOfMonth(new Date());
  }, [startDate]);

  const safeEndDate = useMemo(() => {
    if (endDate && endDate instanceof Date && !isNaN(endDate)) {
      return endDate;
    }
    return endOfMonth(new Date());
  }, [endDate]);

  const financialData = useMemo(() => {
    if (!records || records.length === 0) {
      return {
        totalIncome: 0,
        totalExpense: 0,
        netProfit: 0,
        profitMargin: 0,
        incomeByCategory: {},
        expenseByCategory: {},
        monthlyData: {},
        cashFlow: [],
        recordCount: 0
      };
    }

    const income = records.filter(r => r.type === 'income');
    const expense = records.filter(r => r.type === 'expense');

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
    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome * 100) : 0;

    const monthlyData = {};
    records.forEach(r => {
      try {
        const month = format(new Date(r.date), 'yyyy-MM');
        if (!monthlyData[month]) {
          monthlyData[month] = { income: 0, expense: 0 };
        }
        if (r.type === 'income') {
          monthlyData[month].income += r.amount;
        } else {
          monthlyData[month].expense += r.amount;
        }
      } catch (err) {
        console.warn('Invalid date in record:', r.date);
      }
    });

    let runningBalance = 0;
    const cashFlow = records
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(r => {
        if (r.type === 'income') {
          runningBalance += r.amount;
        } else {
          runningBalance -= r.amount;
        }
        return {
          date: r.date,
          description: r.description,
          category: r.category,
          type: r.type,
          amount: r.amount,
          balance: runningBalance
        };
      });

    return {
      totalIncome,
      totalExpense,
      netProfit,
      profitMargin,
      incomeByCategory,
      expenseByCategory,
      monthlyData,
      cashFlow,
      recordCount: records.length
    };
  }, [records]);

  const arrayToCSV = (data) => {
    return data.map(row =>
      row.map(cell => {
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ).join('\n');
  };

  const downloadCSV = (data, filename) => {
    const csv = arrayToCSV(data);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const safeFormatDate = (date, formatStr = 'dd MMMM yyyy') => {
    try {
      if (!date) return '-';
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return '-';
      return format(dateObj, formatStr, { locale: id });
    } catch (err) {
      console.error('Date formatting error:', err);
      return '-';
    }
  };

  const generateIncomeStatement = () => {
    return [
      ['LAPORAN LABA RUGI (INCOME STATEMENT)'],
      [companyName || 'Personal Finance'],
      [`Periode: ${safeFormatDate(safeStartDate)} - ${safeFormatDate(safeEndDate)}`],
      [''],
      ['PENDAPATAN (REVENUE)'],
      ...Object.entries(financialData.incomeByCategory).map(([cat, amount]) => [
        `  ${cat}`, '', `Rp ${amount.toLocaleString('id-ID')}`
      ]),
      ['', 'Total Pendapatan', `Rp ${financialData.totalIncome.toLocaleString('id-ID')}`],
      [''],
      ['BEBAN OPERASIONAL (OPERATING EXPENSES)'],
      ...Object.entries(financialData.expenseByCategory).map(([cat, amount]) => [
        `  ${cat}`, '', `Rp ${amount.toLocaleString('id-ID')}`
      ]),
      ['', 'Total Beban', `Rp ${financialData.totalExpense.toLocaleString('id-ID')}`],
      [''],
      ['LABA/RUGI BERSIH', '', `Rp ${financialData.netProfit.toLocaleString('id-ID')}`],
      ['Margin Laba', '', `${financialData.profitMargin.toFixed(2)}%`],
      ['Status', '', financialData.netProfit >= 0 ? 'SURPLUS' : 'DEFISIT']
    ];
  };

  const generateBalanceSheet = () => {
    return [
      ['NERACA (BALANCE SHEET)'],
      [companyName || 'Personal Finance'],
      [`Per Tanggal: ${safeFormatDate(safeEndDate)}`],
      [''],
      ['ASET (ASSETS)'],
      ['  Kas dan Setara Kas', '', `Rp ${financialData.netProfit.toLocaleString('id-ID')}`],
      ['Total Aset', '', `Rp ${financialData.netProfit.toLocaleString('id-ID')}`],
      [''],
      ['KEWAJIBAN (LIABILITIES)'],
      ['  Hutang Usaha', '', 'Rp 0'],
      ['Total Kewajiban', '', 'Rp 0'],
      [''],
      ['EKUITAS (EQUITY)'],
      ['  Modal', '', `Rp ${financialData.totalIncome.toLocaleString('id-ID')}`],
      ['  Laba Ditahan', '', `Rp ${financialData.netProfit.toLocaleString('id-ID')}`],
      ['Total Ekuitas', '', `Rp ${(financialData.totalIncome + financialData.netProfit).toLocaleString('id-ID')}`]
    ];
  };

  const generateCashFlow = () => {
    return [
      ['LAPORAN ARUS KAS'],
      [companyName || 'Personal Finance'],
      [`Periode: ${safeFormatDate(safeStartDate)} - ${safeFormatDate(safeEndDate)}`],
      [''],
      ['Kas dari Pendapatan', '', `Rp ${financialData.totalIncome.toLocaleString('id-ID')}`],
      ['Kas untuk Beban', '', `Rp (${financialData.totalExpense.toLocaleString('id-ID')})`],
      ['Kas Bersih Operasi', '', `Rp ${financialData.netProfit.toLocaleString('id-ID')}`]
    ];
  };

  const generateTransactionDetail = () => {
    return [
      ['LAPORAN TRANSAKSI DETAIL'],
      [companyName || 'Personal Finance'],
      [`Periode: ${safeFormatDate(safeStartDate)} - ${safeFormatDate(safeEndDate)}`],
      [''],
      ['Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Jumlah', 'Saldo'],
      ...financialData.cashFlow.map(cf => [
        safeFormatDate(cf.date, 'dd/MM/yyyy'),
        cf.description || '-',
        cf.category || '-',
        cf.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        `Rp ${cf.amount.toLocaleString('id-ID')}`,
        `Rp ${cf.balance.toLocaleString('id-ID')}`
      ])
    ];
  };

  const generateCategoryAnalysis = () => {
    return [
      ['ANALISA PER KATEGORI'],
      [companyName || 'Personal Finance'],
      [`Periode: ${safeFormatDate(safeStartDate)} - ${safeFormatDate(safeEndDate)}`],
      [''],
      ['PENDAPATAN PER KATEGORI'],
      ['Kategori', 'Jumlah', 'Persentase'],
      ...Object.entries(financialData.incomeByCategory).map(([cat, amount]) => [
        cat,
        `Rp ${amount.toLocaleString('id-ID')}`,
        `${financialData.totalIncome > 0 ? ((amount / financialData.totalIncome) * 100).toFixed(2) : 0}%`
      ]),
      [''],
      ['PENGELUARAN PER KATEGORI'],
      ['Kategori', 'Jumlah', 'Persentase'],
      ...Object.entries(financialData.expenseByCategory).map(([cat, amount]) => [
        cat,
        `Rp ${amount.toLocaleString('id-ID')}`,
        `${financialData.totalExpense > 0 ? ((amount / financialData.totalExpense) * 100).toFixed(2) : 0}%`
      ])
    ];
  };

  const generateMonthlyReport = () => {
    return [
      ['LAPORAN BULANAN'],
      [companyName || 'Personal Finance'],
      [`Periode: ${safeFormatDate(safeStartDate)} - ${safeFormatDate(safeEndDate)}`],
      [''],
      ['Bulan', 'Pendapatan', 'Pengeluaran', 'Laba/Rugi', 'Margin'],
      ...Object.entries(financialData.monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => {
          const profit = data.income - data.expense;
          const margin = data.income > 0 ? (profit / data.income * 100) : 0;
          return [
            safeFormatDate(new Date(month + '-01'), 'MMMM yyyy'),
            `Rp ${data.income.toLocaleString('id-ID')}`,
            `Rp ${data.expense.toLocaleString('id-ID')}`,
            `Rp ${profit.toLocaleString('id-ID')}`,
            `${margin.toFixed(2)}%`
          ];
        })
    ];
  };

  const generateTaxReport = () => {
    return [
      ['LAPORAN PAJAK SPT'],
      [companyName || 'Personal Finance'],
      [`Tahun: ${safeFormatDate(safeStartDate, 'yyyy')}`],
      [''],
      ['A. PENGHASILAN BRUTO', '', `Rp ${financialData.totalIncome.toLocaleString('id-ID')}`],
      ['B. PENGURANGAN', '', `Rp ${financialData.totalExpense.toLocaleString('id-ID')}`],
      ['C. PENGHASILAN NETO', '', `Rp ${financialData.netProfit.toLocaleString('id-ID')}`],
      ['D. PTKP', '', 'Rp 54.000.000'],
      ['E. PKP', '', `Rp ${Math.max(0, financialData.netProfit - 54000000).toLocaleString('id-ID')}`],
      ['F. PPh 5%', '', `Rp ${(Math.max(0, financialData.netProfit - 54000000) * 0.05).toLocaleString('id-ID')}`]
    ];
  };

  // ✅ NEW: Calculate movements per account (Income/Expense in selected period)
  const accountMovements = useMemo(() => {
    const movements = {};
    accounts.forEach(acc => {
      movements[acc.id] = { income: 0, expense: 0 };
    });

    records.forEach(record => {
      if (movements[record.account_id]) {
        if (record.type === 'income') {
          movements[record.account_id].income += (record.amount || 0);
        } else if (record.type === 'expense') {
          movements[record.account_id].expense += (record.amount || 0);
        }
      }
    });
    return movements;
  }, [records, accounts]);

  // ✅ NEW: Generate Account Balance Report with Movements
  const generateAccountBalance = () => {
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.calculated_balance || 0), 0);
    const totalIncome = Object.values(accountMovements).reduce((sum, m) => sum + m.income, 0);
    const totalExpense = Object.values(accountMovements).reduce((sum, m) => sum + m.expense, 0);

    return [
      ['LAPORAN SALDO REKENING & MUTASI'],
      [companyName || 'Personal Finance'],
      [`Periode: ${safeFormatDate(startDate)} - ${safeFormatDate(safeEndDate)}`],
      [''],
      ['Nama Rekening', 'Jenis', 'No. Rekening', 'Masuk (Periode)', 'Keluar (Periode)', 'Saldo Akhir', 'Status'],
      ...accounts.map(account => [
        account.name || '-',
        account.type === 'cash' ? 'Kas/Tunai' :
          account.type === 'bank' ? 'Bank' :
            account.type === 'e-wallet' ? 'E-Wallet' : 'Lainnya',
        account.account_number || '-',
        `Rp ${(accountMovements[account.id]?.income || 0).toLocaleString('id-ID')}`,
        `Rp ${(accountMovements[account.id]?.expense || 0).toLocaleString('id-ID')}`,
        `Rp ${(account.calculated_balance || 0).toLocaleString('id-ID')}`,
        account.is_active ? 'Aktif' : 'Nonaktif'
      ]),
      [''],
      ['TOTAL', '', '',
        `Rp ${totalIncome.toLocaleString('id-ID')}`,
        `Rp ${totalExpense.toLocaleString('id-ID')}`,
        `Rp ${totalBalance.toLocaleString('id-ID')}`,
        '']
    ];
  };

  const exportReport = (type) => {
    let data, filename;
    switch (type) {
      case 'income_statement':
        data = generateIncomeStatement();
        filename = 'Laporan_Laba_Rugi';
        break;
      case 'balance_sheet':
        data = generateBalanceSheet();
        filename = 'Neraca';
        break;
      case 'cash_flow':
        data = generateCashFlow();
        filename = 'Arus_Kas';
        break;
      case 'transaction_detail':
        data = generateTransactionDetail();
        filename = 'Detail_Transaksi';
        break;
      case 'category_analysis':
        data = generateCategoryAnalysis();
        filename = 'Analisa_Kategori';
        break;
      case 'monthly_report':
        data = generateMonthlyReport();
        filename = 'Laporan_Bulanan';
        break;
      case 'tax_report':
        data = generateTaxReport();
        filename = 'Laporan_Pajak';
        break;
      case 'account_balance': // ✅ NEW
        data = generateAccountBalance();
        filename = 'Saldo_Rekening';
        break;
      case 'complete':
        const all = [
          ...generateIncomeStatement(), [''], [''],
          ...generateBalanceSheet(), [''], [''],
          ...generateCashFlow(), [''], [''],
          ...generateTransactionDetail(), [''], [''],
          ...generateCategoryAnalysis(), [''], [''],
          ...generateMonthlyReport(), [''], [''],
          ...generateTaxReport(), [''], [''],
          ...generateAccountBalance() // ✅ NEW: Include account balance in complete export
        ];
        downloadCSV(all, 'Laporan_Lengkap');
        return;
    }
    downloadCSV(data, filename);
  };

  const exportPDF = (type) => {
    const win = window.open('', '', 'height=800,width=1000');
    let data, title;

    switch (type) {
      case 'income_statement':
        data = generateIncomeStatement();
        title = 'LAPORAN LABA RUGI';
        break;
      case 'balance_sheet':
        data = generateBalanceSheet();
        title = 'NERACA';
        break;
      case 'cash_flow':
        data = generateCashFlow();
        title = 'LAPORAN ARUS KAS';
        break;
      case 'transaction_detail': // Added for PDF export
        data = generateTransactionDetail();
        title = 'LAPORAN DETAIL TRANSAKSI';
        break;
      case 'category_analysis': // Added for PDF export
        data = generateCategoryAnalysis();
        title = 'ANALISA PER KATEGORI';
        break;
      case 'monthly_report': // Added for PDF export
        data = generateMonthlyReport();
        title = 'LAPORAN BULANAN';
        break;
      case 'tax_report': // Added for PDF export
        data = generateTaxReport();
        title = 'LAPORAN PAJAK SPT';
        break;
      case 'account_balance': // ✅ NEW: Account balance PDF
        data = generateAccountBalance();
        title = 'LAPORAN SALDO REKENING';
        break;
      default:
        data = generateIncomeStatement();
        title = 'LAPORAN';
    }

    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial; padding: 40px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            th { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 18px; font-weight: bold; }
            .amount { text-align: right; font-weight: bold; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${title}</div>
            <div>${companyName || 'Personal Finance'}</div>
            <div>${data[2][0]}</div>
          </div>
          <table>
            ${data.slice(4).map(row => {
      if (row.length === 1 && row[0] === '') return ''; // Skip empty rows used for spacing in CSV
      if (row[0].startsWith('PENDAPATAN') || row[0].startsWith('BEBAN') || row[0].startsWith('LABA/RUGI BERSIH') || row[0].startsWith('ASET') || row[0].startsWith('KEWAJIBAN') || row[0].startsWith('EKUITAS') || row[0].startsWith('Kas dari Pendapatan') || row[0].startsWith('Tanggal') || row[0].startsWith('A. PENGHASILAN BRUTO') || row[0].startsWith('B. PENGURANGAN') || row[0].startsWith('C. PENGHASILAN NETO') || row[0].startsWith('D. PKP') || row[0].startsWith('E. PPh 5%') || row[0].startsWith('Bulan') || row[0].startsWith('Nama Rekening')) {
        // This is likely a header row within the report sections or the transaction detail table header
        if (row[0].startsWith('Tanggal') || row[0].startsWith('Kategori') || row[0].startsWith('Bulan') || row[0].startsWith('Nama Rekening')) { // Specific header for transaction detail, category analysis, monthly report, account balance
          return `<thead><tr>${row.map(cell => `<th class="text-left">${cell || ''}</th>`).join('')}</tr></thead><tbody>`;
        }
        return `<tr><td colspan="${row.length}" style="font-weight: bold; padding-top: 15px; padding-bottom: 5px;">${row[0]}</td></tr>`;
      }
      if (row[1] === 'Total Pendapatan' || row[1] === 'Total Beban' || row[1] === 'Total Aset' || row[1] === 'Total Kewajiban' || row[1] === 'Total Ekuitas' || row[1] === 'Total') {
        // For total rows, align the amounts (usually last columns)
        return `<tr>${row.map((cell, idx) => `<td class="${(cell && cell.toString().includes('Rp')) ? 'amount' : ''}" style="border-top: 1px solid black; font-weight: bold;">${cell || ''}</td>`).join('')}</tr>`;
      }
      return `
                <tr>
                  ${row.map((cell, idx) => {
        let className = '';
        if (typeof cell === 'string' && cell.trim().startsWith('Rp')) className = 'amount'; // Auto-align currency
        else if (idx === row.length - 1 && !isNaN(parseFloat(cell))) className = 'amount'; // Fallback for last column logic only if it looks numeric

        if (row[0].startsWith('  ')) className += ' pl-4'; // Indent sub-items
        if (row[0] === 'LABA/RUGI BERSIH' || row[0] === 'Kas Bersih Operasi' || row[0] === 'C. PENGHASILAN NETO' || row[0] === 'E. PKP') className += ' font-bold';
        return `<td class="${className.trim()}">${cell || ''}</td>`;
      }).join('')}
                </tr>
              `;
    }).join('')}
          </table>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Card - Mobile Optimized */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="w-full sm:w-auto">
              <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                <span>Laporan Keuangan Profesional</span>
              </CardTitle>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Format standar akuntansi (CSV/Excel & PDF)
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {/* Filter removed (in header) */}

              <Button
                onClick={() => exportReport('complete')}
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto min-h-[44px] text-sm">
                <Download className="w-4 h-4 mr-2" />
                Export Semua
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs - Mobile Optimized with Horizontal Scroll */}
      <div className="w-full overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
        <Tabs value={selectedReport} onValueChange={setSelectedReport}>
          <TabsList className="bg-gray-900/50 inline-flex sm:grid sm:grid-cols-8 w-auto sm:w-full min-w-max border-b border-gray-800">
            <TabsTrigger value="income_statement" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
              Laba Rugi
            </TabsTrigger>
            <TabsTrigger value="balance_sheet" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
              Neraca
            </TabsTrigger>
            <TabsTrigger value="cash_flow" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
              Arus Kas
            </TabsTrigger>
            <TabsTrigger value="transaction_detail" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
              Detail
            </TabsTrigger>
            <TabsTrigger value="category_analysis" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
              Kategori
            </TabsTrigger>
            <TabsTrigger value="monthly_report" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
              Bulanan
            </TabsTrigger>
            <TabsTrigger value="tax_report" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
              Pajak
            </TabsTrigger>
            <TabsTrigger value="account_balance" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
              Saldo
            </TabsTrigger>
          </TabsList>

          {/* Income Statement Tab - Mobile Optimized */}
          <TabsContent value="income_statement" className="mt-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <CardTitle className="text-white text-base sm:text-lg">LAPORAN LABA RUGI</CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      onClick={() => exportReport('income_statement')}
                      className="bg-green-600 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />CSV
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => exportPDF('income_statement')}
                      variant="outline"
                      className="border-gray-700 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">PENDAPATAN</h3>
                    <div className="space-y-2">
                      {Object.entries(financialData.incomeByCategory).map(([cat, amount]) => (
                        <div key={cat} className="flex justify-between text-gray-300 pl-4">
                          <span>{cat}</span>
                          <span>Rp {amount.toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-white border-t border-gray-700 pt-2">
                        <span>Total Pendapatan</span>
                        <span className="text-green-400">Rp {financialData.totalIncome.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">BEBAN</h3>
                    <div className="space-y-2">
                      {Object.entries(financialData.expenseByCategory).map(([cat, amount]) => (
                        <div key={cat} className="flex justify-between text-gray-300 pl-4">
                          <span>{cat}</span>
                          <span>Rp {amount.toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-white border-t border-gray-700 pt-2">
                        <span>Total Beban</span>
                        <span className="text-red-400">Rp {financialData.totalExpense.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-white">LABA/RUGI BERSIH</span>
                        <span className={`text-2xl font-bold ${financialData.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          Rp {financialData.netProfit.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Margin</span>
                        <span>{financialData.profitMargin.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white font-semibold">Status</span>
                        <Badge className={financialData.netProfit >= 0 ? 'bg-green-600' : 'bg-red-600'}>
                          {financialData.netProfit >= 0 ? 'SURPLUS' : 'DEFISIT'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Sheet Tab - Mobile Optimized */}
          <TabsContent value="balance_sheet" className="mt-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <CardTitle className="text-white text-base sm:text-lg">NERACA</CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      onClick={() => exportReport('balance_sheet')}
                      className="bg-green-600 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />CSV
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => exportPDF('balance_sheet')}
                      variant="outline"
                      className="border-gray-700 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">ASET</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-gray-300 pl-4">
                        <span>Kas</span>
                        <span>Rp {financialData.netProfit.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between font-bold text-white border-t border-gray-700 pt-2">
                        <span>Total Aset</span>
                        <span className="text-blue-400">Rp {financialData.netProfit.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">KEWAJIBAN & EKUITAS</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-gray-400 mb-2">Ekuitas</div>
                        <div className="flex justify-between text-gray-300 pl-4">
                          <span>Modal</span>
                          <span>Rp {financialData.totalIncome.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-gray-300 pl-4">
                          <span>Laba</span>
                          <span>Rp {financialData.netProfit.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-bold text-white border-t border-gray-700 pt-2">
                        <span>Total</span>
                        <span className="text-blue-400">Rp ${(financialData.totalIncome + financialData.netProfit).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Flow Tab - Mobile Optimized */}
          <TabsContent value="cash_flow" className="mt-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <CardTitle className="text-white text-base sm:text-lg">ARUS KAS</CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button size="sm" onClick={() => exportReport('cash_flow')} className="bg-green-600 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />CSV
                    </Button>
                    <Button size="sm" onClick={() => exportPDF('cash_flow')} variant="outline" className="border-gray-700 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-gray-300 pl-4">
                    <span>Pendapatan</span>
                    <span className="text-green-400">Rp {financialData.totalIncome.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-300 pl-4">
                    <span>Beban</span>
                    <span className="text-red-400">Rp ({financialData.totalExpense.toLocaleString('id-ID')})</span>
                  </div>
                  <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-white">Kas Bersih</span>
                      <span className={`text-2xl font-bold ${financialData.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        Rp {financialData.netProfit.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transaction Detail Tab - Mobile Optimized */}
          <TabsContent value="transaction_detail" className="mt-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <CardTitle className="text-white text-base sm:text-lg">DETAIL TRANSAKSI</CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button size="sm" onClick={() => exportReport('transaction_detail')} className="bg-green-600 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />CSV
                    </Button>
                    <Button size="sm" onClick={() => exportPDF('transaction_detail')} variant="outline" className="border-gray-700 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 py-3 px-4">Tanggal</th>
                        <th className="text-left text-gray-400 py-3 px-4">Deskripsi</th>
                        <th className="text-left text-gray-400 py-3 px-4">Kategori</th>
                        <th className="text-right text-gray-400 py-3 px-4">Jumlah</th>
                        <th className="text-right text-gray-400 py-3 px-4">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialData.cashFlow.map((cf, idx) => (
                        <tr key={idx} className="border-b border-gray-800">
                          <td className="py-3 px-4 text-gray-300">{safeFormatDate(cf.date, 'dd/MM/yyyy')}</td>
                          <td className="py-3 px-4 text-gray-300">{cf.description || '-'}</td>
                          <td className="py-3 px-4 text-gray-300">{cf.category || '-'}</td>
                          <td className="py-3 px-4 text-right text-white">Rp {cf.amount.toLocaleString('id-ID')}</td>
                          <td className="py-3 px-4 text-right text-blue-400">Rp {cf.balance.toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category Analysis Tab - Mobile Optimized */}
          <TabsContent value="category_analysis" className="mt-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <CardTitle className="text-white text-base sm:text-lg">ANALISA KATEGORI</CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button size="sm" onClick={() => exportReport('category_analysis')} className="bg-green-600 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />CSV
                    </Button>
                    <Button size="sm" onClick={() => exportPDF('category_analysis')} variant="outline" className="border-gray-700 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Pendapatan</h3>
                    {Object.entries(financialData.incomeByCategory).map(([cat, amount]) => (
                      <div key={cat} className="space-y-2 mb-3">
                        <div className="flex justify-between text-gray-300">
                          <span>{cat}</span>
                          <span>Rp {amount.toLocaleString('id-ID')} ({financialData.totalIncome > 0 ? ((amount / financialData.totalIncome) * 100).toFixed(1) : 0}%)</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${financialData.totalIncome > 0 ? (amount / financialData.totalIncome) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Pengeluaran</h3>
                    {Object.entries(financialData.expenseByCategory).map(([cat, amount]) => (
                      <div key={cat} className="space-y-2 mb-3">
                        <div className="flex justify-between text-gray-300">
                          <span>{cat}</span>
                          <span>Rp {amount.toLocaleString('id-ID')} ({financialData.totalExpense > 0 ? ((amount / financialData.totalExpense) * 100).toFixed(1) : 0}%)</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: `${financialData.totalExpense > 0 ? (amount / financialData.totalExpense) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly Report Tab - Mobile Optimized */}
          <TabsContent value="monthly_report" className="mt-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <CardTitle className="text-white text-base sm:text-lg">LAPORAN BULANAN</CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button size="sm" onClick={() => exportReport('monthly_report')} className="bg-green-600 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />CSV
                    </Button>
                    <Button size="sm" onClick={() => exportPDF('monthly_report')} variant="outline" className="border-gray-700 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 py-3 px-4">Bulan</th>
                        <th className="text-right text-gray-400 py-3 px-4">Pendapatan</th>
                        <th className="text-right text-gray-400 py-3 px-4">Pengeluaran</th>
                        <th className="text-right text-gray-400 py-3 px-4">Laba/Rugi</th>
                        <th className="text-right text-gray-400 py-3 px-4">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(financialData.monthlyData).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => {
                        const profit = data.income - data.expense;
                        const margin = data.income > 0 ? (profit / data.income * 100) : 0;
                        return (
                          <tr key={month} className="border-b border-gray-800">
                            <td className="py-3 px-4 text-gray-300">{safeFormatDate(new Date(month + '-01'), 'MMMM yyyy')}</td>
                            <td className="py-3 px-4 text-right text-green-400">Rp {data.income.toLocaleString('id-ID')}</td>
                            <td className="py-3 px-4 text-right text-red-400">Rp {data.expense.toLocaleString('id-ID')}</td>
                            <td className={`py-3 px-4 text-right ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              Rp {profit.toLocaleString('id-ID')}
                            </td>
                            <td className="py-3 px-4 text-right text-white">{margin.toFixed(2)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax Report Tab - Mobile Optimized */}
          <TabsContent value="tax_report" className="mt-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <CardTitle className="text-white text-base sm:text-lg">LAPORAN PAJAK (SPT)</CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button size="sm" onClick={() => exportReport('tax_report')} className="bg-green-600 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />CSV
                    </Button>
                    <Button size="sm" onClick={() => exportPDF('tax_report')} variant="outline" className="border-gray-700 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-6">
                  <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-4">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ Konsultasikan dengan akuntan untuk perhitungan akurat
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">A. PENGHASILAN BRUTO</h3>
                      <div className="flex justify-between text-gray-300 pl-4">
                        <span>Total Penghasilan</span>
                        <span>Rp {financialData.totalIncome.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">B. PENGURANGAN</h3>
                      <div className="flex justify-between text-gray-300 pl-4">
                        <span>Biaya Operasional</span>
                        <span>Rp {financialData.totalExpense.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">C. PENGHASILAN NETO</h3>
                      <div className="flex justify-between text-white pl-4 font-semibold">
                        <span>Neto</span>
                        <span>Rp {financialData.netProfit.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">D. PKP</h3>
                      <div className="space-y-2 pl-4">
                        <div className="flex justify-between text-gray-300">
                          <span>PTKP</span>
                          <span>Rp 54.000.000</span>
                        </div>
                        <div className="flex justify-between text-white font-bold border-t border-gray-700 pt-2">
                          <span>PKP</span>
                          <span>Rp {Math.max(0, financialData.netProfit - 54000000).toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                      <h3 className="text-lg font-semibold text-white mb-3">E. PPh TERUTANG</h3>
                      <div className="flex justify-between">
                        <span className="text-gray-300">5% x PKP</span>
                        <span className="text-2xl font-bold text-yellow-400">
                          Rp {(Math.max(0, financialData.netProfit - 54000000) * 0.05).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ✅ NEW: Account Balance Tab */}
          <TabsContent value="account_balance" className="mt-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <CardTitle className="text-white text-base sm:text-lg">SALDO REKENING</CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button size="sm" onClick={() => exportReport('account_balance')} className="bg-green-600 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />CSV
                    </Button>
                    <Button size="sm" onClick={() => exportPDF('account_balance')} variant="outline" className="border-gray-700 flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 py-3 px-4">Rekening</th>
                        <th className="text-left text-gray-400 py-3 px-4">Jenis</th>
                        <th className="text-left text-gray-400 py-3 px-4">No. Rekening</th>
                        <th className="text-right text-gray-400 py-3 px-4">Masuk</th>
                        <th className="text-right text-gray-400 py-3 px-4">Keluar</th>
                        <th className="text-right text-gray-400 py-3 px-4">Saldo Akhir</th>
                        <th className="text-center text-gray-400 py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts && accounts.length > 0 ? (
                        <>
                          {accounts.map(account => (
                            <tr key={account.id} className="border-b border-gray-800">
                              <td className="py-3 px-4 text-white font-medium">
                                {account.icon} {account.name}
                              </td>
                              <td className="py-3 px-4 text-gray-300">
                                {account.type === 'cash' ? 'Kas/Tunai' :
                                  account.type === 'bank' ? 'Bank' :
                                    account.type === 'e-wallet' ? 'E-Wallet' : 'Lainnya'}
                              </td>
                              <td className="py-3 px-4 text-gray-300">
                                {account.account_number || '-'}
                                {account.bank_name && (
                                  <div className="text-xs text-gray-500">{account.bank_name}</div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right text-green-400">
                                Rp {(accountMovements[account.id]?.income || 0).toLocaleString('id-ID')}
                              </td>
                              <td className="py-3 px-4 text-right text-red-400">
                                Rp {(accountMovements[account.id]?.expense || 0).toLocaleString('id-ID')}
                              </td>
                              <td className={`py-3 px-4 text-right font-bold ${(account.calculated_balance || 0) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                Rp {(account.calculated_balance || 0).toLocaleString('id-ID')}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Badge className={account.is_active ? 'bg-green-600' : 'bg-gray-600'}>
                                  {account.is_active ? 'Aktif' : 'Nonaktif'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-gray-600 bg-gray-800/20">
                            <td colSpan="3" className="py-4 px-4 text-white font-bold text-lg text-right">
                              TOTAL
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-lg text-green-400">
                              Rp {Object.values(accountMovements).reduce((sum, m) => sum + m.income, 0).toLocaleString('id-ID')}
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-lg text-red-400">
                              Rp {Object.values(accountMovements).reduce((sum, m) => sum + m.expense, 0).toLocaleString('id-ID')}
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-lg text-blue-400">
                              Rp {accounts.reduce((sum, acc) => sum + (acc.calculated_balance || 0), 0).toLocaleString('id-ID')}
                            </td>
                            <td></td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-gray-400">
                            ⚠️ Belum ada rekening. Buat rekening di tab Rekening.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
