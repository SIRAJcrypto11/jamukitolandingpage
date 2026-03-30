import React, { useState } from 'react';
import { Commission } from '@/entities/Commission';
import { User } from '@/entities/User';
import { Notification } from '@/entities/Notification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, DollarSign, User as UserIcon, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

export default function CommissionsTab({ commissions, onUpdateCommission }) {
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [action, setAction] = useState(null); // 'approve' or 'reject'

  const handleOpenDialog = (commission, actionType) => {
    setSelectedCommission(commission);
    setAction(actionType);
    setShowDialog(true);
  };

  const handleProcessCommission = async () => {
    if (!selectedCommission || !action) return;
    setIsProcessing(true);

    try {
      if (action === 'approve') {
        // Update commission status
        await Commission.update(selectedCommission.id, {
          status: 'paid_to_balance'
        });

        // Get referrer and update balance
        const referrers = await User.filter({ id: selectedCommission.referrer_id });
        if (referrers.length > 0) {
          const referrer = referrers[0];
          const newBalance = (referrer.balance || 0) + selectedCommission.commission_amount;
          const newTotalEarnings = (referrer.total_earnings || 0) + selectedCommission.commission_amount;

          await User.update(referrer.id, {
            balance: newBalance,
            total_earnings: newTotalEarnings
          });

          // Notify referrer
          await Notification.create({
            user_id: referrer.email,
            title: "💰 Komisi Dibayarkan!",
            message: `Selamat! Komisi Rp ${selectedCommission.commission_amount.toLocaleString('id-ID')} telah masuk ke saldo Anda.`,
            url: '/referral'
          });

          toast.success(`Komisi Rp ${selectedCommission.commission_amount.toLocaleString('id-ID')} berhasil dibayarkan!`);
        }
      } else if (action === 'reject') {
        // Update commission status to rejected
        await Commission.update(selectedCommission.id, {
          status: 'rejected'
        });

        toast.success('Komisi berhasil ditolak');
      }

      setShowDialog(false);
      setSelectedCommission(null);
      setAction(null);
      onUpdateCommission();
    } catch (error) {
      console.error('Error processing commission:', error);
      toast.error('Gagal memproses komisi');
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingCommissions = commissions.filter(c => c.status === 'unpaid');
  const paidCommissions = commissions.filter(c => c.status === 'paid_to_balance');
  const totalPending = pendingCommissions.reduce((sum, c) => sum + c.commission_amount, 0);
  const totalPaid = paidCommissions.reduce((sum, c) => sum + c.commission_amount, 0);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Pending</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              Rp {totalPending.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-gray-400">{pendingCommissions.length} komisi menunggu</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Dibayar</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              Rp {totalPaid.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-gray-400">{paidCommissions.length} komisi terbayar</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Komisi</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {commissions.length}
            </div>
            <p className="text-xs text-gray-400">Semua transaksi komisi</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Daftar Komisi Referral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg border-gray-700">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Tanggal</TableHead>
                  <TableHead className="text-gray-300">Referrer</TableHead>
                  <TableHead className="text-gray-300">Referee</TableHead>
                  <TableHead className="text-gray-300">Paket</TableHead>
                  <TableHead className="text-gray-300">Tipe</TableHead>
                  <TableHead className="text-gray-300">Pembelian</TableHead>
                  <TableHead className="text-gray-300">Rate</TableHead>
                  <TableHead className="text-gray-300">Komisi</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id} className="border-gray-700 hover:bg-gray-700/50">
                    <TableCell className="text-gray-300">
                      {format(new Date(commission.created_date), 'dd MMM yyyy', { locale: id })}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-blue-400" />
                        {commission.referrer_id}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {commission.referee_id}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-blue-600 text-white">
                        {commission.plan_purchased.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-gray-300">
                        {commission.purchase_type === 'first_time' ? 'Pertama' : 'Perpanjangan'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      Rp {commission.purchase_amount.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {(commission.commission_rate * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-green-400 font-bold">
                      Rp {commission.commission_amount.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell>
                      {commission.status === 'paid_to_balance' && (
                        <Badge className="bg-green-600 text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Dibayar
                        </Badge>
                      )}
                      {commission.status === 'unpaid' && (
                        <Badge className="bg-yellow-600 text-white">
                          Pending
                        </Badge>
                      )}
                      {commission.status === 'rejected' && (
                        <Badge className="bg-red-600 text-white">
                          <XCircle className="w-3 h-3 mr-1" />
                          Ditolak
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {commission.status === 'unpaid' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleOpenDialog(commission, 'approve')}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => handleOpenDialog(commission, 'reject')}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {commissions.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Belum ada komisi referral.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {action === 'approve' ? 'Bayar Komisi?' : 'Tolak Komisi?'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCommission && (
              <div className="bg-gray-700 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Jumlah Komisi:</span>
                  <span className="text-white font-bold">
                    Rp {selectedCommission.commission_amount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Paket:</span>
                  <span className="text-white font-semibold">
                    {selectedCommission.plan_purchased.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Tipe:</span>
                  <span className="text-white font-semibold">
                    {selectedCommission.purchase_type === 'first_time' ? 'Pembelian Pertama' : 'Perpanjangan'}
                  </span>
                </div>
              </div>
            )}
            
            {action === 'approve' ? (
              <p className="text-gray-300">
                Komisi akan langsung masuk ke saldo referrer dan mereka akan menerima notifikasi.
              </p>
            ) : (
              <p className="text-gray-300">
                Komisi ini akan ditandai sebagai ditolak dan tidak akan dibayarkan.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isProcessing}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Batal
            </Button>
            <Button
              onClick={handleProcessCommission}
              disabled={isProcessing}
              className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Memproses...
                </>
              ) : action === 'approve' ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Bayar Komisi
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Tolak Komisi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}