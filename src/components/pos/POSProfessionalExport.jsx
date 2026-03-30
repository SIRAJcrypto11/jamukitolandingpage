import React, { useState } from 'react';
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
import { Download, FileSpreadsheet, FileText, ShoppingCart, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

const SNISHOP_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e711957c86e922f92ad49f/a236b74f4_Logosnishopbirupanjang.png';

export default function POSProfessionalExport({
  transactions,
  products,
  customers,
  selectedCompany,
  period,
  salesChannelFilter = 'ALL',
  locationFilter = 'ALL',
  salesChannelConfig = {},
  locations = [] // List of {id, location_name}
}) {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportPeriod, setExportPeriod] = useState(period || 'all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  const companyName = selectedCompany?.name || 'Toko';
  const companyLogo = selectedCompany?.logo_url || SNISHOP_LOGO;
  const companyAddress = selectedCompany?.address || '';
  const companyPhone = selectedCompany?.phone || '';
  const companyEmail = selectedCompany?.email || '';

  // Helper to resolve Channel Name
  const getChannelName = (id) => {
    if (!id || id === 'OFFLINE') return 'Offline Store';
    const configName = salesChannelConfig[id];
    if (configName) return configName;
    // Fallback to static list if needed, or just ID
    return id;
  };

  // Helper to resolve Location Name
  const getLocationName = (id) => {
    if (!id) return '-';
    const loc = locations.find(l => l.id === id);
    return loc ? loc.location_name : '-';
  };

  const getDateRange = (periodType) => {
    const now = new Date();
    let startDate, endDate;

    switch (periodType) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date();
        break;
      case 'this_week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
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

  const getFilteredTransactions = () => {
    const { startDate, endDate } = getDateRange(exportPeriod);

    // 1. Filter by Status
    let filtered = transactions.filter(t => t.status === 'completed');

    // 2. Filter by Date
    if (startDate && endDate) {
      filtered = filtered.filter(t => {
        const tDate = new Date(t.created_date);
        return tDate >= startDate && tDate <= endDate;
      });
    }

    // 3. Filter by Channel (Strict)
    if (salesChannelFilter !== 'ALL') {
      filtered = filtered.filter(t => (t.sales_channel || 'OFFLINE') === salesChannelFilter);
    }

    // 4. Filter by Location (Strict)
    if (locationFilter !== 'ALL') {
      filtered = filtered.filter(t => {
        const tLocId = t.location_id || t.items?.[0]?.fulfillment_location_id;
        return tLocId === locationFilter;
      });
    }

    return filtered.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  };

  const calculatePOSFinancials = (filteredTrx) => {
    const totalRevenue = filteredTrx.reduce((sum, t) => sum + t.total, 0);
    const totalDiscount = filteredTrx.reduce((sum, t) => sum + (t.discount_amount || 0), 0);
    const totalTax = filteredTrx.reduce((sum, t) => sum + (t.tax_amount || 0), 0);
    const subtotalBeforeDiscount = filteredTrx.reduce((sum, t) => sum + t.subtotal, 0);

    // Calculate COGS
    let totalCOGS = 0;
    filteredTrx.forEach(t => {
      (t.items || []).forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        const unitCost = product?.cost || 0;
        totalCOGS += unitCost * item.quantity;
      });
    });

    const grossProfit = totalRevenue - totalCOGS;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;

    // Sales by payment method
    const byPaymentMethod = {};
    filteredTrx.forEach(t => {
      const method = t.payment_method || 'cash';
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + t.total;
    });

    // Sales by category
    const byCategory = {};
    const categoryQuantity = {};
    filteredTrx.forEach(t => {
      (t.items || []).forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        const category = product?.category || 'Lainnya';
        byCategory[category] = (byCategory[category] || 0) + item.subtotal;
        categoryQuantity[category] = (categoryQuantity[category] || 0) + item.quantity;
      });
    });

    // Product sales
    const productSales = {};
    filteredTrx.forEach(t => {
      (t.items || []).forEach(item => {
        if (!productSales[item.product_id]) {
          const product = products.find(p => p.id === item.product_id);
          productSales[item.product_id] = {
            name: item.product_name,
            sku: item.sku,
            quantity: 0,
            revenue: 0,
            cogs: 0,
            profit: 0,
            unitCost: product?.cost || 0
          };
        }
        productSales[item.product_id].quantity += item.quantity;
        productSales[item.product_id].revenue += item.subtotal;
        const product = products.find(p => p.id === item.product_id);
        const cogs = (product?.cost || 0) * item.quantity;
        productSales[item.product_id].cogs += cogs;
        productSales[item.product_id].profit += (item.subtotal - cogs);
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    // Daily sales
    const dailySales = {};
    filteredTrx.forEach(t => {
      const day = format(new Date(t.created_date), 'yyyy-MM-dd');
      if (!dailySales[day]) {
        dailySales[day] = { revenue: 0, transactions: 0, items: 0 };
      }
      dailySales[day].revenue += t.total;
      dailySales[day].transactions += 1;
      dailySales[day].items += (t.items || []).reduce((sum, item) => sum + item.quantity, 0);
    });

    const productsSold = filteredTrx.reduce((sum, t) => {
      return sum + (t.items || []).reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    const uniqueCustomers = new Set(filteredTrx.filter(t => t.customer_id).map(t => t.customer_id)).size;
    const avgTransaction = filteredTrx.length > 0 ? totalRevenue / filteredTrx.length : 0;
    const avgItemsPerTransaction = filteredTrx.length > 0 ? productsSold / filteredTrx.length : 0;

    return {
      totalRevenue,
      totalCOGS,
      grossProfit,
      profitMargin,
      totalDiscount,
      totalTax,
      subtotalBeforeDiscount,
      transactionCount: filteredTrx.length,
      productsSold,
      uniqueCustomers,
      avgTransaction,
      avgItemsPerTransaction,
      byPaymentMethod,
      byCategory,
      categoryQuantity,
      topProducts,
      dailySales,
      transactions: filteredTrx
    };
  };

  const exportProfessionalCSV = () => {
    const filteredTrx = getFilteredTransactions();
    const financials = calculatePOSFinancials(filteredTrx);
    const { startDate, endDate } = getDateRange(exportPeriod);

    const csvData = [
      [`"LAPORAN PENJUALAN POS ENTERPRISE - ${companyName.toUpperCase()}"`],
      [`"Periode: ${startDate && endDate ? `${format(startDate, 'dd MMMM yyyy', { locale: id })} - ${format(endDate, 'dd MMMM yyyy', { locale: id })}` : 'Semua Waktu'}"`],
      [`"Channel: ${salesChannelFilter === 'ALL' ? 'Semua Channel' : getChannelName(salesChannelFilter)}"`],
      [`"Lokasi: ${locationFilter === 'ALL' ? 'Semua Lokasi' : getLocationName(locationFilter)}"`],
      [`"Dicetak: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })} WIB"`],
      [`"${companyAddress || ''}"`],
      [`"Tel: ${companyPhone || '-'} | Email: ${companyEmail || '-'}"`],
      [`"Powered by SNISHOP.COM - Smart Business Operating System"`],
      [''],
      ['=== RINGKASAN PENJUALAN ==='],
      ['Metrik', 'Nilai', 'Keterangan'],
      ['Total Penjualan (Revenue)', `"Rp ${financials.totalRevenue.toLocaleString('id-ID')}"`, `Omzet kotor`],
      ['Harga Pokok Penjualan (COGS)', `"Rp ${financials.totalCOGS.toLocaleString('id-ID')}"`, `Modal produk terjual`],
      ['Laba Kotor (Gross Profit)', `"Rp ${financials.grossProfit.toLocaleString('id-ID')}"`, `Revenue - COGS`],
      ['Margin Laba Kotor', `${financials.profitMargin.toFixed(2)}%`, `(Gross Profit / Revenue) x 100%`],
      ['Total Diskon Diberikan', `"Rp ${financials.totalDiscount.toLocaleString('id-ID')}"`, `Total potongan harga`],
      ['Total Pajak', `"Rp ${financials.totalTax.toLocaleString('id-ID')}"`, `Pajak terkumpul`],
      ['Total Transaksi', `${financials.transactionCount}`, `Jumlah transaksi completed`],
      ['Total Produk Terjual', `${financials.productsSold}`, `Unit terjual`],
      ['Customer Unik', `${financials.uniqueCustomers}`, `Jumlah customer berbeda`],
      ['Rata-rata Nilai Transaksi', `"Rp ${financials.avgTransaction.toLocaleString('id-ID')}"`, `Revenue / Transaksi`],
      ['Rata-rata Item per Transaksi', `${financials.avgItemsPerTransaction.toFixed(1)}`, `Total items / Transaksi`],
      [''],
      ['=== PENJUALAN PER METODE PEMBAYARAN ==='],
      ['Metode', 'Jumlah Penjualan', 'Persentase (%)', 'Jumlah Transaksi'],
      ...Object.entries(financials.byPaymentMethod)
        .sort(([, a], [, b]) => b - a)
        .map(([method, amount]) => {
          const trxCount = filteredTrx.filter(t => t.payment_method === method).length;
          return [
            method.charAt(0).toUpperCase() + method.slice(1),
            `"Rp ${amount.toLocaleString('id-ID')}"`,
            `${financials.totalRevenue > 0 ? ((amount / financials.totalRevenue) * 100).toFixed(2) : 0}%`,
            trxCount
          ];
        }),
      [''],
      ['=== PENJUALAN PER KATEGORI PRODUK ==='],
      ['Kategori', 'Revenue', 'Persentase (%)', 'Unit Terjual', 'Avg per Unit'],
      ...Object.entries(financials.byCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => [
          cat,
          `"Rp ${amount.toLocaleString('id-ID')}"`,
          `${financials.totalRevenue > 0 ? ((amount / financials.totalRevenue) * 100).toFixed(2) : 0}%`,
          financials.categoryQuantity[cat] || 0,
          `"Rp ${(amount / Math.max(1, financials.categoryQuantity[cat] || 1)).toLocaleString('id-ID')}"`
        ]),
      [''],
      ['=== TOP 20 PRODUK TERLARIS ==='],
      ['Ranking', 'SKU', 'Nama Produk', 'Unit Terjual', 'Revenue', 'COGS', 'Laba Kotor', 'Margin (%)'],
      ...financials.topProducts.map((product, idx) => [
        idx + 1,
        product.sku || '-',
        product.name,
        product.quantity,
        `"Rp ${product.revenue.toLocaleString('id-ID')}"`,
        `"Rp ${product.cogs.toLocaleString('id-ID')}"`,
        `"Rp ${product.profit.toLocaleString('id-ID')}"`,
        `${product.revenue > 0 ? ((product.profit / product.revenue) * 100).toFixed(2) : 0}%`
      ]),
      [''],
      ['=== PENJUALAN HARIAN ==='],
      ['Tanggal', 'Revenue', 'Transaksi', 'Items Terjual', 'Avg per Transaksi'],
      ...Object.entries(financials.dailySales)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([day, data]) => [
          format(new Date(day), 'dd MMMM yyyy (EEEE)', { locale: id }),
          `"Rp ${data.revenue.toLocaleString('id-ID')}"`,
          data.transactions,
          data.items,
          `"Rp ${(data.revenue / data.transactions).toLocaleString('id-ID')}"`
        ]),
      [''],
      ['=== DETAIL TRANSAKSI LENGKAP ==='],
      ['No', 'No. Transaksi', 'Tanggal', 'Waktu', 'Channel', 'Lokasi', 'Customer', 'Kasir', 'Items', 'Subtotal', 'Diskon', 'Tax', 'Total', 'Pembayaran', 'Bayar', 'Kembalian', 'Poin', 'Status'],
      ...financials.transactions.map((trx, idx) => [
        idx + 1,
        trx.transaction_number,
        format(new Date(trx.created_date), 'dd/MM/yyyy', { locale: id }),
        format(new Date(trx.created_date), 'HH:mm', { locale: id }),
        getChannelName(trx.sales_channel),
        trx.location_name || trx.items?.[0]?.fulfillment_location_name || getLocationName(trx.location_id) || '-',
        trx.customer_name || 'Walk-in',
        trx.cashier_name || '-',
        (trx.items || []).length,
        `"Rp ${trx.subtotal.toLocaleString('id-ID')}"`,
        `"Rp ${(trx.discount_amount || 0).toLocaleString('id-ID')}"`,
        `"Rp ${(trx.tax_amount || 0).toLocaleString('id-ID')}"`,
        `"Rp ${trx.total.toLocaleString('id-ID')}"`,
        trx.payment_method,
        `"Rp ${trx.payment_amount.toLocaleString('id-ID')}"`,
        `"Rp ${(trx.change_amount || 0).toLocaleString('id-ID')}"`,
        trx.points_earned || 0,
        trx.status
      ]),
      [''],
      ['=== DETAIL ITEM PER TRANSAKSI ==='],
      ['No. Transaksi', 'Produk', 'SKU', 'Qty', 'Harga Satuan', 'Diskon', 'Subtotal'],
      ...financials.transactions.flatMap(trx =>
        (trx.items || []).map(item => [
          trx.transaction_number,
          item.product_name,
          item.sku || '-',
          item.quantity,
          `"Rp ${item.price.toLocaleString('id-ID')}"`,
          `"Rp ${(item.discount || 0).toLocaleString('id-ID')}"`,
          `"Rp ${item.subtotal.toLocaleString('id-ID')}"`
        ])
      ),
      [''],
      ['=== ANALISA CUSTOMER ==='],
      ['Metrik', 'Nilai'],
      ['Total Customer Unik', financials.uniqueCustomers],
      ['Transaksi per Customer', financials.uniqueCustomers > 0 ? (financials.transactionCount / financials.uniqueCustomers).toFixed(2) : 0],
      ['Revenue per Customer', `"Rp ${(financials.totalRevenue / Math.max(1, financials.uniqueCustomers)).toLocaleString('id-ID')}"`],
      [''],
      ['=== KPI OPERASIONAL ==='],
      ['KPI', 'Nilai', 'Target/Benchmark'],
      ['Average Transaction Value (ATV)', `"Rp ${financials.avgTransaction.toLocaleString('id-ID')}"`, `Target: > Rp 50,000`],
      ['Items per Transaction', `${financials.avgItemsPerTransaction.toFixed(2)}`, `Target: > 2.5 items`],
      ['Conversion Rate', 'N/A', `Perlu data traffic toko`],
      ['Sell-Through Rate', `${financials.productsSold > 0 ? '100%' : '0%'}`, `Produk terjual / Total stock`],
      [''],
      ['=== CATATAN LAPORAN ==='],
      [`"1. Laporan disusun berdasarkan ${financials.transactionCount} transaksi POS dengan status 'completed'"`],
      [`"2. COGS (Harga Pokok Penjualan) dihitung dari harga modal produk yang tercatat di sistem"`],
      [`"3. Laba Kotor = Revenue - COGS (belum termasuk biaya operasional lainnya)"`],
      [`"4. Data customer unik dihitung dari transaksi yang memiliki info customer"`],
      [`"5. Laporan dihasilkan secara otomatis dari sistem SNISHOP pada ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })} WIB"`],
      [''],
      [`"Generated by SNISHOP.COM - Point of Sale Management System"`],
      [`"© ${new Date().getFullYear()} SNISHOP - All Rights Reserved | www.snishop.com"`]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_POS_Enterprise_${companyName}_${exportPeriod}_${Date.now()}.csv`);
    link.click();

    toast.success(`✅ Laporan POS CSV berhasil diexport (${financials.transactionCount} transaksi)`, {
      duration: 4000,
      description: 'File berisi: Penjualan, Laba Kotor, Top Products, Detail Transaksi, KPI'
    });
    setShowExportDialog(false);
  };

  const exportProfessionalPDF = () => {
    const filteredTrx = getFilteredTransactions();
    const financials = calculatePOSFinancials(filteredTrx);
    const { startDate, endDate } = getDateRange(exportPeriod);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Laporan POS Enterprise - ${companyName}</title>
          <style>
            @page { size: A4 landscape; margin: 15mm; }
            @media print {
              body { margin: 0; }
              .page-break { page-break-before: always; }
            }
            
            body {
              font-family: 'Arial', sans-serif;
              font-size: 10px;
              line-height: 1.4;
              color: #1f2937;
            }
            
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 3px double #3b82f6;
            }
            
            .logo-company { max-width: 140px; margin: 0 auto 10px; }
            .company-name { font-size: 18px; font-weight: bold; margin-bottom: 3px; }
            .company-info { font-size: 9px; color: #6b7280; margin-bottom: 2px; }
            .report-title { font-size: 15px; font-weight: bold; color: #3b82f6; margin: 8px 0 4px 0; }
            .period { font-size: 10px; color: #6b7280; }
            
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin: 15px 0;
            }
            
            .kpi-card {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 10px;
              text-align: center;
            }
            
            .kpi-value { font-size: 16px; font-weight: bold; color: #3b82f6; margin: 4px 0; }
            .kpi-label { font-size: 8px; color: #6b7280; text-transform: uppercase; }
            
            .summary-box {
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              color: white;
              padding: 15px;
              border-radius: 8px;
              margin: 15px 0;
            }
            
            .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .summary-item { display: flex; justify-between; margin-bottom: 6px; font-size: 10px; }
            .summary-main { font-size: 14px; font-weight: bold; border-top: 2px solid rgba(255,255,255,0.3); padding-top: 10px; margin-top: 10px; }
            
            .section { margin-bottom: 20px; page-break-inside: avoid; }
            .section-title { font-size: 12px; font-weight: bold; margin-bottom: 10px; padding: 6px 8px; background: linear-gradient(90deg, #f3f4f6 0%, #fff 100%); border-left: 4px solid #3b82f6; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            thead th { background: #f3f4f6; padding: 6px; text-align: left; font-weight: bold; border-bottom: 2px solid #d1d5db; font-size: 9px; }
            tbody td { padding: 5px 6px; border-bottom: 1px solid #e5e7eb; font-size: 9px; }
            .total-row { font-weight: bold; background: #f9fafb; border-top: 2px solid #9ca3af; }
            .profit { color: #10b981; font-weight: bold; }
            .loss { color: #ef4444; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            
            .footer {
              margin-top: 25px;
              padding-top: 15px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
            }
            
            .footer-logo { max-width: 90px; margin: 8px auto; }
            .footer-text { color: #6b7280; font-size: 8px; margin: 2px 0; }
          </style>
        </head>
        <body>
          <!-- HEADER -->
          <div class="header">
            <img src="${companyLogo}" alt="Logo" class="logo-company" onerror="this.style.display='none'" />
            <div class="company-name">${companyName}</div>
            ${companyAddress ? `<div class="company-info">${companyAddress}</div>` : ''}
            ${companyPhone ? `<div class="company-info">Tel: ${companyPhone}${companyEmail ? ' | Email: ' + companyEmail : ''}</div>` : ''}
            <div class="report-title">LAPORAN PENJUALAN POS ENTERPRISE</div>
            <div class="period">
              Periode: ${startDate && endDate ? `${format(startDate, 'dd MMMM yyyy', { locale: id })} - ${format(endDate, 'dd MMMM yyyy', { locale: id })}` : 'Semua Waktu'} <br/>
              Channel: ${salesChannelFilter === 'ALL' ? 'Semua Channel' : getChannelName(salesChannelFilter)} | 
              Lokasi: ${locationFilter === 'ALL' ? 'Semua Lokasi' : getLocationName(locationFilter)}
            </div>
            <div class="period">Dicetak: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })} WIB</div>
          </div>

          <!-- KPI DASHBOARD -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Total Penjualan</div>
              <div class="kpi-value profit">Rp ${(financials.totalRevenue / 1000000).toFixed(1)}M</div>
              <div class="kpi-label">${financials.transactionCount} transaksi</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">COGS</div>
              <div class="kpi-value loss">Rp ${(financials.totalCOGS / 1000000).toFixed(1)}M</div>
              <div class="kpi-label">Harga Pokok</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Laba Kotor</div>
              <div class="kpi-value profit">Rp ${(financials.grossProfit / 1000000).toFixed(1)}M</div>
              <div class="kpi-label">Margin ${financials.profitMargin.toFixed(1)}%</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Produk Terjual</div>
              <div class="kpi-value">${financials.productsSold}</div>
              <div class="kpi-label">${financials.uniqueCustomers} customer</div>
            </div>
          </div>

          <!-- EXECUTIVE SUMMARY -->
          <div class="summary-box">
            <h2 style="margin: 0 0 10px 0; font-size: 13px;">📊 RINGKASAN PENJUALAN</h2>
            <div class="summary-grid">
              <div>
                <div class="summary-item"><span>Total Revenue:</span><span>Rp ${financials.totalRevenue.toLocaleString('id-ID')}</span></div>
                <div class="summary-item"><span>Total COGS:</span><span>Rp ${financials.totalCOGS.toLocaleString('id-ID')}</span></div>
                <div class="summary-item"><span>Total Diskon:</span><span>Rp ${financials.totalDiscount.toLocaleString('id-ID')}</span></div>
              </div>
              <div>
                <div class="summary-item"><span>Total Transaksi:</span><span>${financials.transactionCount}</span></div>
                <div class="summary-item"><span>Customer Unik:</span><span>${financials.uniqueCustomers}</span></div>
                <div class="summary-item"><span>Avg Transaksi:</span><span>Rp ${financials.avgTransaction.toLocaleString('id-ID')}</span></div>
              </div>
            </div>
            <div class="summary-main">
              <div class="summary-item" style="font-size: 16px;">
                <span>LABA KOTOR:</span>
                <span>Rp ${financials.grossProfit.toLocaleString('id-ID')}</span>
              </div>
              <div class="summary-item">
                <span>Profit Margin:</span>
                <span>${financials.profitMargin.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          <!-- SALES BY PAYMENT METHOD -->
          <div class="section">
            <h2 class="section-title">💳 PENJUALAN PER METODE PEMBAYARAN</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 30%;">Metode Pembayaran</th>
                  <th class="text-right" style="width: 30%;">Total Penjualan</th>
                  <th class="text-right" style="width: 20%;">Persentase</th>
                  <th class="text-center" style="width: 20%;">Jumlah Transaksi</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(financials.byPaymentMethod)
        .sort(([, a], [, b]) => b - a)
        .map(([method, amount]) => {
          const trxCount = filteredTrx.filter(t => t.payment_method === method).length;
          return `
                      <tr>
                        <td style="text-transform: capitalize;">${method}</td>
                        <td class="text-right profit">Rp ${amount.toLocaleString('id-ID')}</td>
                        <td class="text-right">${financials.totalRevenue > 0 ? ((amount / financials.totalRevenue) * 100).toFixed(2) : 0}%</td>
                        <td class="text-center">${trxCount}</td>
                      </tr>
                    `;
        }).join('')}
                <tr class="total-row">
                  <td><strong>TOTAL</strong></td>
                  <td class="text-right">Rp ${financials.totalRevenue.toLocaleString('id-ID')}</td>
                  <td class="text-right">100.00%</td>
                  <td class="text-center">${financials.transactionCount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- SALES BY CATEGORY -->
          <div class="section">
            <h2 class="section-title">📦 PENJUALAN PER KATEGORI PRODUK</h2>
            <table>
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th class="text-right">Revenue</th>
                  <th class="text-right">Persentase</th>
                  <th class="text-right">Unit Terjual</th>
                  <th class="text-right">Avg per Unit</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(financials.byCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => `
                    <tr>
                      <td>${cat}</td>
                      <td class="text-right profit">Rp ${amount.toLocaleString('id-ID')}</td>
                      <td class="text-right">${financials.totalRevenue > 0 ? ((amount / financials.totalRevenue) * 100).toFixed(2) : 0}%</td>
                      <td class="text-right">${financials.categoryQuantity[cat] || 0}</td>
                      <td class="text-right">Rp ${(amount / Math.max(1, financials.categoryQuantity[cat] || 1)).toLocaleString('id-ID')}</td>
                    </tr>
                  `).join('')}
                <tr class="total-row">
                  <td><strong>TOTAL</strong></td>
                  <td class="text-right">Rp ${financials.totalRevenue.toLocaleString('id-ID')}</td>
                  <td class="text-right">100.00%</td>
                  <td class="text-right">${financials.productsSold}</td>
                  <td class="text-right">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- PAGE BREAK -->
          <div class="page-break"></div>

          <!-- TOP PRODUCTS -->
          <div class="section">
            <h2 class="section-title">🏆 TOP 20 PRODUK TERLARIS</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 5%;">#</th>
                  <th style="width: 12%;">SKU</th>
                  <th style="width: 28%;">Nama Produk</th>
                  <th class="text-right" style="width: 10%;">Unit</th>
                  <th class="text-right" style="width: 15%;">Revenue</th>
                  <th class="text-right" style="width: 12%;">COGS</th>
                  <th class="text-right" style="width: 13%;">Laba</th>
                  <th class="text-right" style="width: 5%;">Margin</th>
                </tr>
              </thead>
              <tbody>
                ${financials.topProducts.map((product, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${product.sku || '-'}</td>
                    <td>${product.name}</td>
                    <td class="text-right">${product.quantity}</td>
                    <td class="text-right profit">Rp ${product.revenue.toLocaleString('id-ID')}</td>
                    <td class="text-right loss">Rp ${product.cogs.toLocaleString('id-ID')}</td>
                    <td class="text-right profit">Rp ${product.profit.toLocaleString('id-ID')}</td>
                    <td class="text-right">${product.revenue > 0 ? ((product.profit / product.revenue) * 100).toFixed(1) : 0}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- DAILY SALES -->
          ${Object.keys(financials.dailySales).length > 0 ? `
          <div class="section">
            <h2 class="section-title">📅 PENJUALAN HARIAN</h2>
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th class="text-right">Revenue</th>
                  <th class="text-center">Transaksi</th>
                  <th class="text-center">Items</th>
                  <th class="text-right">Avg per Transaksi</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(financials.dailySales)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 30)
          .map(([day, data]) => `
                    <tr>
                      <td>${format(new Date(day), 'dd MMM yyyy (EEEE)', { locale: id })}</td>
                      <td class="text-right profit">Rp ${data.revenue.toLocaleString('id-ID')}</td>
                      <td class="text-center">${data.transactions}</td>
                      <td class="text-center">${data.items}</td>
                      <td class="text-right">Rp ${(data.revenue / data.transactions).toLocaleString('id-ID')}</td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <!-- PAGE BREAK -->
          <div class="page-break"></div>

          <!-- TRANSACTION DETAIL -->
          <div class="section">
            <h2 class="section-title">📋 DETAIL ${Math.min(100, financials.transactionCount)} TRANSAKSI</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 3%;">No</th>
                  <th style="width: 10%;">No. Transaksi</th>
                  <th style="width: 8%;">Tanggal</th>
                  <th style="width: 8%;">Channel</th>
                  <th style="width: 8%;">Lokasi</th>
                  <th style="width: 12%;">Customer</th>
                  <th style="width: 8%;">Kasir</th>
                  <th style="width: 3%;">Item</th>
                  <th class="text-right" style="width: 10%;">Subtotal</th>
                  <th class="text-right" style="width: 8%;">Total</th>
                  <th style="width: 8%;">Payment</th>
                </tr>
              </thead>
              <tbody>
                ${financials.transactions.slice(0, 100).map((trx, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${trx.transaction_number}</td>
                    <td>${format(new Date(trx.created_date), 'dd/MM/yy HH:mm', { locale: id })}</td>
                    <td style="font-size: 8px;">${getChannelName(trx.sales_channel)}</td>
                    <td style="font-size: 8px;">${trx.location_name || trx.items?.[0]?.fulfillment_location_name || getLocationName(trx.location_id) || '-'}</td>
                    <td>${trx.customer_name || 'Walk-in'}</td>
                    <td style="font-size: 8px;">${trx.cashier_name || '-'}</td>
                    <td class="text-center">${(trx.items || []).length}</td>
                    <td class="text-right">Rp ${trx.subtotal.toLocaleString('id-ID')}</td>
                    <td class="text-right profit">Rp ${trx.total.toLocaleString('id-ID')}</td>
                    <td style="font-size: 8px; text-transform: capitalize;">${trx.payment_method}</td>
                  </tr>
                `).join('')}
                ${financials.transactionCount > 100 ? `
                  <tr>
                    <td colspan="11" class="text-center" style="padding: 12px; color: #6b7280; font-style: italic;">
                      ... dan ${financials.transactionCount - 100} transaksi lainnya (total ${financials.transactionCount})
                    </td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>

          <!-- NOTES -->
          <div class="section">
            <h2 class="section-title">📝 CATATAN ATAS LAPORAN</h2>
            <ol style="padding-left: 20px; line-height: 1.8; margin: 0;">
              <li>Laporan disusun berdasarkan <strong>${financials.transactionCount} transaksi</strong> dengan status 'completed'.</li>
              <li><strong>COGS</strong> (Harga Pokok Penjualan) dihitung dari harga modal produk yang tercatat di sistem.</li>
              <li><strong>Laba Kotor</strong> = Revenue - COGS (belum termasuk biaya operasional lainnya seperti gaji, sewa, listrik).</li>
              <li>Data customer unik dihitung dari transaksi yang memiliki info customer terdaftar.</li>
              <li>Laporan dihasilkan secara otomatis dari sistem SNISHOP Point of Sale.</li>
            </ol>
          </div>

          <!-- FOOTER -->
          <div class="footer">
            <img src="${SNISHOP_LOGO}" alt="SNISHOP" class="footer-logo" onerror="this.style.display='none'" />
            <p class="footer-text"><strong>Powered by SNISHOP.COM</strong></p>
            <p class="footer-text">Smart Business Operating System - Point of Sale Management</p>
            <p class="footer-text" style="margin-top: 6px;">
              Laporan dihasilkan pada ${format(new Date(), 'dd MMMM yyyy HH:mm:ss', { locale: id })} WIB
            </p>
            <p class="footer-text">© ${new Date().getFullYear()} SNISHOP - All Rights Reserved | www.snishop.com</p>
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => { window.print(); }, 800);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1400,height=900');
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    toast.success(`✅ Laporan POS PDF Enterprise siap dicetak (${financials.transactionCount} transaksi)`, {
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
        <ShoppingCart className="w-4 h-4 mr-2" />
        Export POS Enterprise
      </Button>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="bg-gray-900 text-white border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-purple-400" />
              Export Laporan POS Enterprise
            </DialogTitle>
            <p className="text-xs text-gray-400 mt-2">
              Format profesional standar bisnis retail
            </p>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Period Selector */}
            <div>
              <Label className="text-gray-300">Periode Laporan</Label>
              <Select value={exportPeriod} onValueChange={setExportPeriod}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">📊 Semua Data</SelectItem>
                  <SelectItem value="today">📅 Hari Ini</SelectItem>
                  <SelectItem value="this_week">📅 Minggu Ini</SelectItem>
                  <SelectItem value="this_month">📅 Bulan Ini</SelectItem>
                  <SelectItem value="last_month">📅 Bulan Lalu</SelectItem>
                  <SelectItem value="this_year">📅 Tahun Ini</SelectItem>
                  <SelectItem value="custom">🎯 Kustom</SelectItem>
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

            {/* Info */}
            <div className="p-4 bg-purple-900/20 border border-purple-700 rounded-lg">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-purple-300">
                  <p className="font-semibold mb-1">Laporan POS Lengkap:</p>
                  <ul className="space-y-1 ml-2">
                    <li>✓ KPI Dashboard (Revenue, COGS, Profit, Margin)</li>
                    <li>✓ Ringkasan Penjualan & Laba Kotor</li>
                    <li>✓ Penjualan per Metode Pembayaran</li>
                    <li>✓ Penjualan per Kategori Produk</li>
                    <li>✓ Top 20 Produk Terlaris + COGS Analysis</li>
                    <li>✓ Tren Penjualan Harian</li>
                    <li>✓ Detail Transaksi Lengkap</li>
                    <li>✓ Analisa Customer & KPI Operasional</li>
                    <li>✓ Logo Perusahaan & SNISHOP Branding</li>
                  </ul>
                  <p className="mt-2 text-purple-200 font-semibold">
                    {getFilteredTransactions().length} transaksi siap diexport
                  </p>
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="grid grid-cols-2 gap-3">
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
              Format enterprise dengan logo & branding SNISHOP
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}