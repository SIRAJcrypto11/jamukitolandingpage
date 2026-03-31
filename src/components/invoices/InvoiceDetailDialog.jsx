import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { FileText, Calendar, Mail, Phone, MapPin, Printer, CreditCard, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const { Invoice } = base44.entities;

export default function InvoiceDetailDialog({ open, onOpenChange, invoice, company, onUpdate }) {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!invoice) return null;

  const handlePayment = async () => {
    if (!paymentAmount || isProcessing) return;

    try {
      setIsProcessing(true);
      const amount = parseFloat(paymentAmount);
      const newPaidAmount = (invoice.paid_amount || 0) + amount;
      const newStatus = newPaidAmount >= invoice.total ? 'paid' : 'sent';

      await Invoice.update(invoice.id, {
        paid_amount: newPaidAmount,
        status: newStatus,
        paid_date: newStatus === 'paid' ? new Date().toISOString() : invoice.paid_date
      });

      toast.success('Pembayaran berhasil dicatat');
      setIsPaymentOpen(false);
      setPaymentAmount('');

      if (onUpdate) {
        onUpdate({
          ...invoice,
          paid_amount: newPaidAmount,
          status: newStatus
        });
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Gagal mencatat pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDateSafe = (dateString) => {
    try {
      if (!dateString) return '-';
      return format(new Date(dateString), 'dd MMM yyyy', { locale: id });
    } catch (e) {
      return '-';
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price || 0);
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-600',
      sent: 'bg-blue-600',
      paid: 'bg-green-600',
      overdue: 'bg-red-600',
      cancelled: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-600';
  };

  const getTypeColor = (type) => {
    const colors = {
      invoice: 'bg-blue-600',
      quotation: 'bg-purple-600',
      proforma: 'bg-orange-600'
    };
    return colors[type] || 'bg-blue-600';
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600');

    // Create HTML for print
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${invoice.invoice_number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 40px; 
              color: #1a1a1a; 
              line-height: 1.5;
              max-width: 800px;
              margin: 0 auto;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start;
              margin-bottom: 50px; 
              border-bottom: 2px solid #f3f4f6; 
              padding-bottom: 30px; 
            }
            .company-info { display: flex; flex-direction: column; gap: 4px; }
            .logo-container { margin-bottom: 12px; }
            .logo-container img { max-height: 60px; max-width: 200px; object-fit: contain; }
            .company-info h1 { margin: 0; color: #111827; font-size: 20px; font-weight: 700; }
            .company-info p { margin: 0; color: #4b5563; font-size: 13px; }
            
            .invoice-details { text-align: right; }
            .invoice-details h2 { margin: 0 0 10px 0; color: #2563eb; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; }
            .invoice-meta { margin-top: 10px; }
            .invoice-meta p { margin: 4px 0; font-size: 14px; color: #374151; }
            
            .bill-to { margin-bottom: 40px; background: #f9fafb; padding: 20px; border-radius: 8px; }
            .bill-to h3 { margin: 0 0 10px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .bill-to-name { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 4px; }
            
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 40px; }
            th { text-align: left; padding: 12px 16px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; text-transform: uppercase; font-size: 11px; font-weight: 600; color: #6b7280; letter-spacing: 0.5px; }
            th:first-child { border-top-left-radius: 6px; border-bottom-left-radius: 6px; }
            th:last-child { border-top-right-radius: 6px; border-bottom-right-radius: 6px; }
            td { padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; }
            tr:last-child td { border-bottom: none; }
            
            .text-right { text-align: right; }
            .totals { width: 320px; margin-left: auto; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
            .total-final { font-weight: 700; font-size: 18px; border-top: 2px solid #e5e7eb; padding-top: 16px; margin-top: 8px; color: #111827; }
            
            .status-badge { 
              display: inline-block; padding: 6px 12px; border-radius: 9999px; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
              background: ${invoice.status === 'paid' ? '#059669' : invoice.status === 'overdue' ? '#dc2626' : '#6b7280'};
            }
            
            .footer { margin-top: 60px; padding-top: 30px; border-top: 1px solid #f3f4f6; text-align: center; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              ${company?.logo_url ? `<div class="logo-container"><img src="${company.logo_url}" alt="Logo" /></div>` : ''}
              <h1>${company?.name || ''}</h1>
              <p>${company?.address || ''}</p>
              <p>${company?.phone || ''} ${company?.email ? `• ${company?.email}` : ''}</p>
            </div>
            <div class="invoice-details">
              <h2>${invoice.invoice_type?.toUpperCase()}</h2>
              <span class="status-badge">${invoice.status}</span>
              <div class="invoice-meta">
                <p><strong>#${invoice.invoice_number}</strong></p>
                <p>Issue Date: ${format(new Date(invoice.issue_date), 'dd MMM yyyy', { locale: id })}</p>
                <p>Due Date: ${format(new Date(invoice.due_date), 'dd MMM yyyy', { locale: id })}</p>
              </div>
            </div>
          </div>

          <div class="bill-to">
            <h3>Bill To</h3>
            <div class="bill-to-name">${invoice.customer_name}</div>
            ${invoice.customer_address ? `<div style="font-size: 14px; color: #4b5563;">${invoice.customer_address}</div>` : ''}
            ${invoice.customer_phone ? `<div style="font-size: 13px; color: #6b7280; margin-top: 4px;">${invoice.customer_phone}</div>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40%">Description</th>
                <th class="text-right" style="width: 15%">Qty</th>
                <th class="text-right" style="width: 20%">Price</th>
                <th class="text-right" style="width: 25%">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items?.map(item => `
                <tr>
                  <td>
                    <div style="font-weight: 500; color: #111827;">${item.description}</div>
                  </td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${formatPrice(item.unit_price)}</td>
                  <td class="text-right" style="font-weight: 500;">${formatPrice(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span style="color: #6b7280;">Subtotal</span>
              <span style="font-weight: 500;">${formatPrice(invoice.subtotal)}</span>
            </div>
            ${invoice.tax_amount > 0 ? `
            <div class="totals-row">
              <span style="color: #6b7280;">Tax (${invoice.tax_percentage}%)</span>
              <span style="font-weight: 500;">${formatPrice(invoice.tax_amount)}</span>
            </div>
            ` : ''}
            ${invoice.discount_amount > 0 ? `
            <div class="totals-row" style="color: #ef4444;">
              <span>Discount</span>
              <span>-${formatPrice(invoice.discount_amount)}</span>
            </div>
            ` : ''}
            <div class="totals-row total-final">
              <span>Total Due</span>
              <span>${formatPrice(invoice.total)}</span>
            </div>
            ${invoice.paid_amount > 0 ? `
            <div class="totals-row" style="color: #059669; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #e5e7eb;">
              <span>Amount Paid</span>
              <span>-${formatPrice(invoice.paid_amount)}</span>
            </div>
            <div class="totals-row" style="font-weight: 700; color: #b91c1c;">
              <span>Balance Due</span>
              <span>${formatPrice(invoice.total - invoice.paid_amount)}</span>
            </div>
            ` : ''}
          </div>

          ${(invoice.notes || invoice.terms) ? `
          <div style="margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
            ${invoice.notes ? `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Notes</h3>
              <p style="margin: 0; font-size: 13px; color: #4b5563;">${invoice.notes}</p>
            </div>
            ` : ''}
            ${invoice.terms ? `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Terms & Conditions</h3>
              <p style="margin: 0; font-size: 13px; color: #4b5563;">${invoice.terms}</p>
            </div>
            ` : ''}
          </div>
          ` : ''}
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p style="margin-top: 4px;">Powered by SNISHOP System</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Auto-print after loading
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Invoice Detail - #{invoice.invoice_number}
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="bg-green-600/10 text-green-500 hover:bg-green-600/20 border-green-600/50"
                onClick={() => setIsPaymentOpen(!isPaymentOpen)}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Update Pembayaran
              </Button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print / Download PDF
              </button>
            </div>
          </div>
        </DialogHeader>

        {isPaymentOpen && (
          <div className="mx-4 p-4 bg-gray-800 rounded-lg border border-gray-700 animate-in slide-in-from-top-2">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Catat Pembayaran Masuk
            </h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Masukkan jumlah pembayaran..."
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="bg-gray-900 border-gray-600 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Sisa tagihan: {formatPrice(invoice.total - (invoice.paid_amount || 0))}
                </p>
              </div>
              <Button onClick={handlePayment} disabled={isProcessing || !paymentAmount}>
                {isProcessing ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-6 p-4">
          {/* Header Info */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{company?.name}</h2>
              <p className="text-gray-400">{company?.email}</p>
              <p className="text-gray-400">{company?.phone}</p>
              <p className="text-gray-400">{company?.address}</p>
            </div>
            <div className="text-right">
              <div className="flex gap-2 mb-2">
                <Badge className={getTypeColor(invoice.invoice_type)}>
                  {invoice.invoice_type}
                </Badge>
                <Badge className={getStatusColor(invoice.status)}>
                  {invoice.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-400">
                <Calendar className="w-4 h-4 inline mr-1" />
                Issue: {formatDateSafe(invoice.issue_date)}
              </p>
              <p className="text-sm text-gray-400">
                Due: {formatDateSafe(invoice.due_date)}
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <h3 className="font-bold text-white mb-3">Bill To:</h3>
              <div className="space-y-1 text-gray-300">
                <p className="font-semibold text-lg">{invoice.customer_name}</p>
                {invoice.customer_email && (
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {invoice.customer_email}
                  </p>
                )}
                {invoice.customer_phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {invoice.customer_phone}
                  </p>
                )}
                {invoice.customer_address && (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {invoice.customer_address}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left p-3 text-gray-300">Description</th>
                    <th className="text-right p-3 text-gray-300">Qty</th>
                    <th className="text-right p-3 text-gray-300">Unit Price</th>
                    <th className="text-right p-3 text-gray-300">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-700">
                      <td className="p-3 text-white">{item.description}</td>
                      <td className="p-3 text-right text-white">{item.quantity}</td>
                      <td className="p-3 text-right text-white">{formatPrice(item.unit_price)}</td>
                      <td className="p-3 text-right text-white font-semibold">{formatPrice(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatPrice(invoice.subtotal)}</span>
                </div>

                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between text-gray-300">
                    <span>Tax ({invoice.tax_percentage}%):</span>
                    <span className="font-semibold">{formatPrice(invoice.tax_amount)}</span>
                  </div>
                )}

                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Discount ({invoice.discount_percentage}%):</span>
                    <span className="font-semibold">-{formatPrice(invoice.discount_amount)}</span>
                  </div>
                )}

                <div className="border-t border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-white">Total:</span>
                    <span className="text-2xl font-bold text-green-400">
                      {formatPrice(invoice.total)}
                    </span>
                  </div>
                </div>

                {invoice.paid_amount > 0 && (
                  <>
                    <div className="flex justify-between text-yellow-400">
                      <span>Paid:</span>
                      <span className="font-semibold">{formatPrice(invoice.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between text-red-400">
                      <span className="font-bold">Balance Due:</span>
                      <span className="font-bold">{formatPrice(invoice.total - invoice.paid_amount)}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="grid grid-cols-2 gap-4">
              {invoice.notes && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-white mb-2">Notes:</h3>
                    <p className="text-gray-300 text-sm">{invoice.notes}</p>
                  </CardContent>
                </Card>
              )}

              {invoice.terms && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-white mb-2">Terms & Conditions:</h3>
                    <p className="text-gray-300 text-sm">{invoice.terms}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}