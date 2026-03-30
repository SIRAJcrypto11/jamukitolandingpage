import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

/**
 * PayrollPDFGenerator - Generate PDF payslip
 * Uses browser print API for PDF generation
 */
export default function PayrollPDFGenerator({ payroll, company, config }) {
  
  const generatePDF = () => {
    try {
      // Create printable HTML
      const printWindow = window.open('', '_blank');
      
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Slip Gaji - ${payroll.employee_name} - ${format(new Date(payroll.period), 'MMMM yyyy', { locale: id })}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
      .no-print { display: none !important; }
    }
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #000;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
    }
    .document-title {
      font-size: 20px;
      font-weight: bold;
      margin-top: 10px;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding: 15px;
      background: #f3f4f6;
      border-radius: 8px;
    }
    .info-block {
      flex: 1;
    }
    .info-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 14px;
      font-weight: bold;
      color: #111827;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #3b82f6;
      color: white;
      padding: 12px;
      text-align: left;
      font-size: 14px;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .amount {
      text-align: right;
      font-weight: bold;
    }
    .total-section {
      background: #dbeafe;
      border: 2px solid #3b82f6;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 16px;
    }
    .total-row.grand {
      border-top: 2px solid #3b82f6;
      margin-top: 10px;
      padding-top: 15px;
      font-size: 20px;
      font-weight: bold;
      color: #1e40af;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #6b7280;
      text-align: center;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
      margin-bottom: 30px;
    }
    .signature-box {
      text-align: center;
      width: 200px;
    }
    .signature-line {
      border-top: 1px solid #000;
      margin-top: 80px;
      padding-top: 5px;
    }
    .no-print {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 10px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 10px;">
      Print / Save as PDF
    </button>
    <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">
      Close
    </button>
  </div>

  <div class="header">
    ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.name}" style="max-height: 60px; margin-bottom: 10px;">` : ''}
    <div class="company-name">${company.name}</div>
    ${company.address ? `<div style="font-size: 12px; color: #6b7280;">${company.address}</div>` : ''}
    ${company.phone ? `<div style="font-size: 12px; color: #6b7280;">Tel: ${company.phone}</div>` : ''}
    <div class="document-title">SLIP GAJI</div>
    <div style="font-size: 14px; color: #6b7280; margin-top: 10px;">
      Periode: ${format(new Date(payroll.period), 'MMMM yyyy', { locale: id })}
    </div>
  </div>

  <div class="info-section">
    <div class="info-block">
      <div class="info-label">Nama Karyawan</div>
      <div class="info-value">${payroll.employee_name}</div>
    </div>
    <div class="info-block">
      <div class="info-label">Periode</div>
      <div class="info-value">${format(new Date(payroll.period), 'MMMM yyyy', { locale: id })}</div>
    </div>
    <div class="info-block">
      <div class="info-label">Tanggal Cetak</div>
      <div class="info-value">${format(new Date(), 'dd MMMM yyyy', { locale: id })}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th colspan="2">PENDAPATAN</th>
        <th class="amount">JUMLAH (Rp)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td colspan="2">Gaji Pokok</td>
        <td class="amount">${(payroll.basic_salary || 0).toLocaleString('id-ID')}</td>
      </tr>
      ${payroll.overtime_hours > 0 ? `
      <tr>
        <td colspan="2">Lembur (${payroll.overtime_hours} jam @ ${config?.overtime_rate || 1.5}x)</td>
        <td class="amount">${(payroll.overtime_pay || 0).toLocaleString('id-ID')}</td>
      </tr>
      ` : ''}
      ${payroll.kpi_bonus > 0 ? `
      <tr>
        <td colspan="2">Bonus KPI (Score: ${payroll.kpi_score || 0})</td>
        <td class="amount">${(payroll.kpi_bonus || 0).toLocaleString('id-ID')}</td>
      </tr>
      ` : ''}
      ${payroll.allowances?.map(a => `
      <tr>
        <td colspan="2">${a.name}</td>
        <td class="amount">${(a.amount || 0).toLocaleString('id-ID')}</td>
      </tr>
      `).join('') || ''}
      <tr style="background: #e0f2fe;">
        <td colspan="2"><strong>GROSS SALARY</strong></td>
        <td class="amount"><strong>${(payroll.gross_salary || 0).toLocaleString('id-ID')}</strong></td>
      </tr>
    </tbody>
  </table>

  <table>
    <thead>
      <tr>
        <th colspan="2">POTONGAN</th>
        <th class="amount">JUMLAH (Rp)</th>
      </tr>
    </thead>
    <tbody>
      ${payroll.deductions?.map(d => `
      <tr>
        <td colspan="2">${d.name}</td>
        <td class="amount">${(d.amount || 0).toLocaleString('id-ID')}</td>
      </tr>
      `).join('') || ''}
      ${payroll.late_count > 0 && config?.late_penalty_per_minute > 0 ? `
      <tr>
        <td colspan="2">Penalty Terlambat (${payroll.late_count} hari)</td>
        <td class="amount">${(payroll.late_count * config.late_penalty_per_minute * 60).toLocaleString('id-ID')}</td>
      </tr>
      ` : ''}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-row">
      <span>Gross Salary:</span>
      <span>Rp ${(payroll.gross_salary || 0).toLocaleString('id-ID')}</span>
    </div>
    <div class="total-row">
      <span>Total Potongan:</span>
      <span>Rp ${((payroll.deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0)).toLocaleString('id-ID')}</span>
    </div>
    <div class="total-row grand">
      <span>NET SALARY (Take Home Pay):</span>
      <span>Rp ${(payroll.net_salary || 0).toLocaleString('id-ID')}</span>
    </div>
  </div>

  ${payroll.attendance_days ? `
  <div style="margin-top: 30px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
    <h3 style="margin-bottom: 10px; color: #1e40af;">Ringkasan Kehadiran</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
      <div>
        <div class="info-label">Hari Hadir</div>
        <div class="info-value">${payroll.attendance_days} / ${payroll.working_days || config?.working_days_per_month || 22}</div>
      </div>
      <div>
        <div class="info-label">Terlambat</div>
        <div class="info-value">${payroll.late_count || 0} hari</div>
      </div>
      <div>
        <div class="info-label">Lembur</div>
        <div class="info-value">${payroll.overtime_hours || 0} jam</div>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="signature-section">
    <div class="signature-box">
      <div>Yang Menerima,</div>
      <div class="signature-line">${payroll.employee_name}</div>
    </div>
    <div class="signature-box">
      <div>Hormat Kami,</div>
      <div class="signature-line">Finance Manager</div>
    </div>
  </div>

  <div class="footer">
    <p>Dokumen ini dibuat secara otomatis oleh sistem SNISHOP ERP</p>
    <p>Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}</p>
    <p style="margin-top: 10px; font-style: italic;">
      Dokumen ini adalah bukti pembayaran yang sah. Harap disimpan dengan baik.
    </p>
  </div>
</body>
</html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      
      // Auto print after load
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 250);
      };

      toast.success('✅ PDF Generator dibuka!');

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gagal generate PDF');
    }
  };

  const generateBulkPDF = (payrolls) => {
    try {
      const printWindow = window.open('', '_blank');
      
      const payrollsHTML = payrolls.map(p => `
        <div style="page-break-after: always;">
          <!-- Same structure as single payroll but for each payroll -->
          <div class="header">
            ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.name}" style="max-height: 60px;">` : ''}
            <div class="company-name">${company.name}</div>
            <div class="document-title">SLIP GAJI</div>
            <div style="font-size: 14px; color: #6b7280;">
              Periode: ${format(new Date(p.period), 'MMMM yyyy', { locale: id })}
            </div>
          </div>
          <div class="info-section">
            <div class="info-block">
              <div class="info-label">Nama Karyawan</div>
              <div class="info-value">${p.employee_name}</div>
            </div>
          </div>
          <table>
            <tr><th colspan="2">PENDAPATAN</th><th class="amount">JUMLAH</th></tr>
            <tr><td colspan="2">Gaji Pokok</td><td class="amount">Rp ${(p.basic_salary || 0).toLocaleString('id-ID')}</td></tr>
            <tr style="background: #e0f2fe;"><td colspan="2"><strong>GROSS</strong></td><td class="amount"><strong>Rp ${(p.gross_salary || 0).toLocaleString('id-ID')}</strong></td></tr>
          </table>
          <div class="total-section">
            <div class="total-row grand">
              <span>NET SALARY:</span>
              <span>Rp ${(p.net_salary || 0).toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      `).join('');

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bulk Payslips - ${format(new Date(payrolls[0].period), 'MMMM yyyy', { locale: id })}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
    .company-name { font-size: 24px; font-weight: bold; color: #1e40af; }
    .document-title { font-size: 20px; font-weight: bold; margin-top: 10px; }
    .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; padding: 15px; background: #f3f4f6; border-radius: 8px; }
    .info-block { flex: 1; }
    .info-label { font-size: 12px; color: #6b7280; margin-bottom: 5px; }
    .info-value { font-size: 14px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #3b82f6; color: white; padding: 12px; text-align: left; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    .amount { text-align: right; font-weight: bold; }
    .total-section { background: #dbeafe; border: 2px solid #3b82f6; padding: 15px; border-radius: 8px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .total-row.grand { border-top: 2px solid #3b82f6; margin-top: 10px; padding-top: 15px; font-size: 20px; font-weight: bold; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
      Print All
    </button>
  </div>
  ${payrollsHTML}
</body>
</html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      
      toast.success(`✅ ${payrolls.length} slip gaji siap di-print!`);

    } catch (error) {
      console.error('Error generating bulk PDF:', error);
      toast.error('Gagal generate bulk PDF');
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={generatePDF}
        variant="outline"
        size="sm"
        className="border-green-600 text-green-400 hover:bg-green-600/20"
      >
        <Download className="w-4 h-4 mr-2" />
        Download PDF
      </Button>
    </div>
  );
}

// Export bulk function as named export
export function BulkPayrollPDFButton({ payrolls, company, config }) {
  const generateBulkPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      
      const payrollsHTML = payrolls.map((p, idx) => `
        <div style="page-break-after: ${idx < payrolls.length - 1 ? 'always' : 'auto'};">
          <div class="header">
            ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.name}" style="max-height: 60px;">` : ''}
            <div class="company-name">${company.name}</div>
            <div class="document-title">SLIP GAJI</div>
          </div>
          <div class="employee-info">
            <strong>${p.employee_name}</strong> - ${format(new Date(p.period), 'MMMM yyyy', { locale: id })}
          </div>
          <table>
            <tr><th colspan="2">PENDAPATAN</th><th>JUMLAH</th></tr>
            <tr><td colspan="2">Gaji Pokok</td><td class="amount">Rp ${(p.basic_salary || 0).toLocaleString('id-ID')}</td></tr>
            ${p.overtime_pay > 0 ? `<tr><td colspan="2">Lembur ${p.overtime_hours}h</td><td class="amount">Rp ${(p.overtime_pay || 0).toLocaleString('id-ID')}</td></tr>` : ''}
            ${p.kpi_bonus > 0 ? `<tr><td colspan="2">Bonus KPI</td><td class="amount">Rp ${(p.kpi_bonus || 0).toLocaleString('id-ID')}</td></tr>` : ''}
            <tr style="background: #e0f2fe;"><td colspan="2"><strong>GROSS</strong></td><td class="amount"><strong>Rp ${(p.gross_salary || 0).toLocaleString('id-ID')}</strong></td></tr>
          </table>
          <table>
            <tr><th colspan="2">POTONGAN</th><th>JUMLAH</th></tr>
            ${(p.deductions || []).map(d => `<tr><td colspan="2">${d.name}</td><td class="amount">Rp ${(d.amount || 0).toLocaleString('id-ID')}</td></tr>`).join('')}
          </table>
          <div class="total-section">
            <div class="total-row grand">
              <span>NET SALARY:</span>
              <span>Rp ${(p.net_salary || 0).toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      `).join('');

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bulk Payslips</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 20px; }
    .company-name { font-size: 24px; font-weight: bold; color: #1e40af; }
    .document-title { font-size: 20px; font-weight: bold; margin-top: 10px; }
    .employee-info { margin: 20px 0; font-size: 16px; padding: 10px; background: #f3f4f6; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th { background: #3b82f6; color: white; padding: 10px; text-align: left; }
    td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
    .amount { text-align: right; font-weight: bold; }
    .total-section { background: #dbeafe; border: 2px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .total-row { display: flex; justify-content: space-between; }
    .total-row.grand { font-size: 18px; font-weight: bold; color: #1e40af; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 20px;">
      Print All Payslips
    </button>
  </div>
  ${payrollsHTML}
</body>
</html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      
      toast.success(`✅ ${payrolls.length} slip gaji siap di-print!`);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal generate bulk PDF');
    }
  };

  return (
    <Button
      onClick={generateBulkPDF}
      variant="outline"
      className="border-blue-600 text-blue-400 hover:bg-blue-600/20"
    >
      <FileText className="w-4 h-4 mr-2" />
      Download All PDFs ({payrolls.length})
    </Button>
  );
}