import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { formatRupiah } from '@/components/utils/currencyFormatter';

export default function AccountTransfer({ accounts, user, mode, companyId = null, onSuccess }) {
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transferData, setTransferData] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: 0,
    transfer_fee: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const activeAccounts = accounts.filter(a => a.is_active);

  const fromAccount = activeAccounts.find(a => a.id === transferData.from_account_id);
  const toAccount = activeAccounts.find(a => a.id === transferData.to_account_id);

  const handleTransfer = async (e) => {
    e.preventDefault();

    if (!transferData.from_account_id || !transferData.to_account_id) {
      toast.error('Pilih rekening asal dan tujuan');
      return;
    }

    if (transferData.from_account_id === transferData.to_account_id) {
      toast.error('Rekening asal dan tujuan harus berbeda');
      return;
    }

    if (transferData.amount <= 0) {
      toast.error('Jumlah transfer harus lebih dari 0');
      return;
    }

    const totalDeduction = transferData.amount + (transferData.transfer_fee || 0);
    if (fromAccount && fromAccount.calculated_balance < totalDeduction) {
      toast.error(`Saldo ${fromAccount.name} tidak cukup`);
      return;
    }

    setIsLoading(true);
    try {
      // Create transfer record
      await base44.entities.FinancialRecord.create({
        user_id: user.id,
        company_id: companyId,
        account_id: transferData.from_account_id,
        transfer_to_account_id: transferData.to_account_id,
        type: 'transfer',
        amount: transferData.amount,
        transfer_fee: transferData.transfer_fee || 0,
        category: 'Transfer',
        description: transferData.description || `Transfer dari ${fromAccount?.name} ke ${toAccount?.name}`,
        date: new Date(transferData.date).toISOString(),
        mode: mode,
        source: 'manual'
      });

      // Broadcast update
      try {
        const channel = new BroadcastChannel('snishop_finance_updates');
        channel.postMessage({
          type: 'TRANSFER_CREATED',
          companyId: companyId || null,
          mode: mode,
          timestamp: Date.now()
        });
        channel.close();
      } catch (e) {}

      toast.success(`✅ Transfer ${formatRupiah(transferData.amount)} berhasil!`);
      setShowDialog(false);
      setTransferData({
        from_account_id: '',
        to_account_id: '',
        amount: 0,
        transfer_fee: 0,
        description: '',
        date: new Date().toISOString().split('T')[0]
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error('Gagal melakukan transfer');
    }
    setIsLoading(false);
  };

  return (
    <>
      <Button 
        onClick={() => setShowDialog(true)}
        variant="outline"
        className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
      >
        <ArrowRightLeft className="w-4 h-4 mr-2" />
        Transfer Antar Rekening
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              Transfer Antar Rekening
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <Label htmlFor="fromAccount">Dari Rekening *</Label>
              <Select
                value={transferData.from_account_id}
                onValueChange={(value) => setTransferData({ ...transferData, from_account_id: value })}
              >
                <SelectTrigger id="fromAccount">
                  <SelectValue placeholder="Pilih rekening sumber" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.icon} {acc.name} - {formatRupiah(acc.calculated_balance || 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="toAccount">Ke Rekening *</Label>
              <Select
                value={transferData.to_account_id}
                onValueChange={(value) => setTransferData({ ...transferData, to_account_id: value })}
              >
                <SelectTrigger id="toAccount">
                  <SelectValue placeholder="Pilih rekening tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts
                    .filter(acc => acc.id !== transferData.from_account_id)
                    .map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.icon} {acc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Jumlah Transfer *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={transferData.amount || ''}
                  onChange={(e) => setTransferData({ ...transferData, amount: Number(e.target.value) })}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <Label htmlFor="transferFee">Biaya Transfer</Label>
                <Input
                  id="transferFee"
                  type="number"
                  value={transferData.transfer_fee || 0}
                  onChange={(e) => setTransferData({ ...transferData, transfer_fee: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="transferDate">Tanggal</Label>
              <Input
                id="transferDate"
                type="date"
                value={transferData.date}
                onChange={(e) => setTransferData({ ...transferData, date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Keterangan</Label>
              <Input
                id="description"
                value={transferData.description || ''}
                onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                placeholder="Keterangan transfer (optional)"
              />
            </div>

            {fromAccount && toAccount && transferData.amount > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg space-y-2">
                <p className="font-semibold text-sm">Ringkasan Transfer:</p>
                <div className="text-xs space-y-1">
                  <p>📤 Dari: {fromAccount.name} ({formatRupiah(fromAccount.calculated_balance)})</p>
                  <p>📥 Ke: {toAccount.name}</p>
                  <p>💰 Jumlah: {formatRupiah(transferData.amount)}</p>
                  {transferData.transfer_fee > 0 && (
                    <p>💳 Biaya: {formatRupiah(transferData.transfer_fee)}</p>
                  )}
                  <p className="font-semibold pt-2 border-t">
                    Total Dipotong: {formatRupiah(transferData.amount + (transferData.transfer_fee || 0))}
                  </p>
                  <p className="text-muted-foreground">
                    Saldo {fromAccount.name} setelah transfer: {formatRupiah(fromAccount.calculated_balance - transferData.amount - (transferData.transfer_fee || 0))}
                  </p>
                </div>
                
                {fromAccount.calculated_balance < (transferData.amount + (transferData.transfer_fee || 0)) && (
                  <div className="flex items-center gap-2 text-red-600 text-xs mt-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Saldo tidak cukup!</span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Batal
              </Button>
              <Button 
                onClick={handleTransfer}
                disabled={isLoading || !transferData.from_account_id || !transferData.to_account_id}
              >
                {isLoading ? 'Memproses...' : 'Transfer Sekarang'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}