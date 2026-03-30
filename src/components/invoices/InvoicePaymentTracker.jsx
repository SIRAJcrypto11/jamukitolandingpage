import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Invoice } from '@/entities/Invoice';
import { FinancialRecord } from '@/entities/FinancialRecord';
import { User } from '@/entities/User';
import { DollarSign, Plus, CheckCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function InvoicePaymentTracker({ isOpen, onClose, invoice, company, onSuccess }) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMemo, setPaymentMemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadUser();
      // Suggest remaining amount
      if (invoice) {
        const remaining = invoice.total - (invoice.paid_amount || 0);
        setPaymentAmount(remaining.toString());
      }
    }
  }, [isOpen, invoice]);

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Masukkan jumlah pembayaran');
      return;
    }

    const amount = parseFloat(paymentAmount);
    const remaining = invoice.total - (invoice.paid_amount || 0);

    if (amount > remaining) {
      toast.error(`Pembayaran melebihi sisa tagihan (Rp ${remaining.toLocaleString('id-ID')})`);
      return;
    }

    setIsLoading(true);

    try {
      // Update invoice
      const newPaidAmount = (invoice.paid_amount || 0) + amount;
      const newStatus = newPaidAmount >= invoice.total ? 'paid' : 'sent';

      // Add payment to payments array
      const payments = invoice.payments || [];
      payments.push({
        date: paymentDate,
        amount: amount,
        memo: paymentMemo || `Pembayaran ${payments.length + 1}`,
        recorded_by: user.email,
        recorded_at: new Date().toISOString()
      });

      await Invoice.update(invoice.id, {
        paid_amount: newPaidAmount,
        status: newStatus,
        paid_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : invoice.paid_date,
        payments: payments
      });

      // Record to financial
      await FinancialRecord.create({
        user_id: user.id,
        company_id: company.id,
        type: 'income',
        amount: amount,
        category: 'Pembayaran Invoice',
        description: `Pembayaran Invoice #${invoice.invoice_number} - ${invoice.customer_name} - ${paymentMemo || 'Pembayaran parsial'}`,
        date: paymentDate,
        source: 'invoice_payment',
        mode: 'business'
      });

      toast.success('Pembayaran berhasil dicatat!');
      
      if (onSuccess) {
        onSuccess();
      }

      onClose();

    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error('Gagal mencatat pembayaran');
    } finally {
      setIsLoading(false);
    }
  };

  if (!invoice) return null;

  const remaining = invoice.total - (invoice.paid_amount || 0);
  const percentage = ((invoice.paid_amount || 0) / invoice.total) * 100;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            Tracking Pembayaran - Invoice #{invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-400">Customer</p>
                  <p className="text-lg font-bold text-white">{invoice.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Total Invoice</p>
                  <p className="text-2xl font-bold text-white">{formatPrice(invoice.total)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Progress Pembayaran</span>
                  <span className="text-white font-semibold">{percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-600 to-emerald-600 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Sudah Dibayar</p>
                  <p className="text-lg font-bold text-green-400">
                    {formatPrice(invoice.paid_amount || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Sisa Tagihan</p>
                  <p className="text-lg font-bold text-yellow-400">
                    {formatPrice(remaining)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <h3 className="font-bold text-white mb-4">Riwayat Pembayaran</h3>
                <div className="space-y-3">
                  {invoice.payments.map((payment, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-semibold text-white">{formatPrice(payment.amount)}</p>
                        <p className="text-sm text-gray-400">{payment.memo}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(payment.date), 'dd MMMM yyyy', { locale: id })} • 
                          By {payment.recorded_by}
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Payment Form */}
          {remaining > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Tambah Pembayaran
                </h3>

                <div>
                  <Label className="text-gray-300">Jumlah Pembayaran</Label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Sisa tagihan: {formatPrice(remaining)}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-300">Tanggal Pembayaran</Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Memo/Keterangan</Label>
                  <Textarea
                    value={paymentMemo}
                    onChange={(e) => setPaymentMemo(e.target.value)}
                    placeholder="Pembayaran pertama 50%, via transfer BCA..."
                    rows={3}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {remaining === 0 && (
            <Card className="bg-green-900/20 border-green-700">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <h3 className="text-xl font-bold text-green-400 mb-2">
                  Invoice Lunas!
                </h3>
                <p className="text-gray-300">
                  Semua pembayaran telah diterima.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gray-600">
            Tutup
          </Button>
          {remaining > 0 && (
            <Button
              onClick={handleAddPayment}
              disabled={isLoading}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Catat Pembayaran
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}