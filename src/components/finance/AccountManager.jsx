import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Wallet, CreditCard, Smartphone, DollarSign, TrendingUp, TrendingDown, History } from 'lucide-react';
import { formatRupiah } from '@/components/utils/currencyFormatter';

const accountTypeIcons = {
  cash: '💵',
  bank: '🏦',
  'e-wallet': '📱',
  other: '💰'
};

const accountTypeLabels = {
  cash: 'Kas/Tunai',
  bank: 'Bank',
  'e-wallet': 'E-Wallet',
  other: 'Lainnya'
};

const colorOptions = [
  { value: '#3B82F6', label: 'Biru' },
  { value: '#10B981', label: 'Hijau' },
  { value: '#F59E0B', label: 'Kuning' },
  { value: '#EF4444', label: 'Merah' },
  { value: '#8B5CF6', label: 'Ungu' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#6B7280', label: 'Abu-abu' }
];

export default function AccountManager({ accounts, records, user, mode, companyId = null, onUpdate }) {
  const [editingAccount, setEditingAccount] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedAccountHistory, setSelectedAccountHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate balances for each account
  const accountsWithBalance = useMemo(() => {
    return accounts.map(account => {
      const accountRecords = records.filter(r =>
        r.account_id === account.id || r.transfer_to_account_id === account.id
      );

      let balance = account.initial_balance || 0;
      let totalIncome = 0;
      let totalExpense = 0;
      let transferIn = 0;
      let transferOut = 0;

      accountRecords.forEach(record => {
        if (record.type === 'income' && record.account_id === account.id) {
          balance += record.amount;
          totalIncome += record.amount;
        } else if (record.type === 'expense' && record.account_id === account.id) {
          balance -= record.amount;
          totalExpense += record.amount;
        } else if (record.type === 'transfer') {
          if (record.account_id === account.id) {
            // Transfer keluar
            balance -= (record.amount + (record.transfer_fee || 0));
            transferOut += record.amount;
          } else if (record.transfer_to_account_id === account.id) {
            // Transfer masuk
            balance += record.amount;
            transferIn += record.amount;
          }
        }
      });

      return {
        ...account,
        calculated_balance: balance,
        total_income: totalIncome,
        total_expense: totalExpense,
        transfer_in: transferIn,
        transfer_out: transferOut,
        transaction_count: accountRecords.length
      };
    });
  }, [accounts, records]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    console.log('💳 AccountManager: Saving account...');
    console.log('📝 User:', user);
    console.log('📝 Mode:', mode);
    console.log('📝 CompanyId:', companyId);
    console.log('📝 EditingAccount:', editingAccount);

    try {
      if (!user?.id) {
        toast.error('User tidak teridentifikasi. Silakan login ulang.');
        setIsLoading(false);
        return;
      }

      if (!editingAccount?.name) {
        toast.error('Nama rekening wajib diisi');
        setIsLoading(false);
        return;
      }

      const dataToSave = {
        name: editingAccount.name,
        type: editingAccount.type || 'cash',
        account_number: editingAccount.account_number || '',
        bank_name: editingAccount.bank_name || '',
        initial_balance: Number(editingAccount.initial_balance) || 0,
        current_balance: Number(editingAccount.initial_balance) || 0,
        icon: editingAccount.icon || '💰',
        color: editingAccount.color || '#3B82F6',
        is_active: editingAccount.is_active !== false,
        notes: editingAccount.notes || '',
        user_id: user.id,
        mode: mode,
        company_id: companyId || null
      };

      console.log('📤 Data to save:', dataToSave);

      if (editingAccount.id) {
        console.log('🔄 Updating existing account:', editingAccount.id);
        await base44.entities.Account.update(editingAccount.id, dataToSave);
        toast.success('✅ Rekening berhasil diperbarui');
      } else {
        console.log('➕ Creating new account...');
        const result = await base44.entities.Account.create(dataToSave);
        console.log('✅ Account created:', result);
        toast.success('✅ Rekening berhasil ditambahkan');
      }

      setShowDialog(false);
      setEditingAccount(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('❌ Error saving account:', error);
      console.error('❌ Error details:', error.message, error.response);

      // More detailed error message
      const errorMsg = error?.message || error?.response?.data?.message || 'Unknown error';
      toast.error(`Gagal menyimpan rekening: ${errorMsg}`);
    }
    setIsLoading(false);
  };

  const handleDelete = async (accountId) => {
    if (!confirm('Yakin ingin menghapus rekening ini? Data transaksi terkait tidak akan dihapus.')) return;

    try {
      await base44.entities.Account.delete(accountId);
      toast.success('Rekening berhasil dihapus');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Gagal menghapus rekening');
      console.error('Failed to delete account:', error);
    }
  };

  const showHistory = (account) => {
    setSelectedAccountHistory(account);
    setShowHistoryDialog(true);
  };

  const AccountCard = ({ accountData }) => (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      style={{ borderLeft: `4px solid ${accountData.color}` }}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{accountData.icon}</span>
            <div>
              <CardTitle className="text-lg">{accountData.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{accountTypeLabels[accountData.type]}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => showHistory(accountData)}>
              <History className="w-4 h-4 text-blue-500" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => {
              setEditingAccount(accountData);
              setShowDialog(true);
            }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(accountData.id)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center py-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Saldo Saat Ini</p>
          <p className="text-2xl font-bold" style={{ color: accountData.color }}>
            {formatRupiah(accountData.calculated_balance)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <TrendingUp className="w-3 h-3" />
              <span className="font-semibold">Masuk</span>
            </div>
            <p className="font-semibold">{formatRupiah(accountData.total_income + accountData.transfer_in)}</p>
          </div>
          <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
            <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
              <TrendingDown className="w-3 h-3" />
              <span className="font-semibold">Keluar</span>
            </div>
            <p className="font-semibold">{formatRupiah(accountData.total_expense + accountData.transfer_out)}</p>
          </div>
        </div>

        {accountData.account_number && (
          <div className="text-xs text-muted-foreground">
            <p>No. Rek: {accountData.account_number}</p>
          </div>
        )}

        <Badge variant="outline" className="text-xs">
          {accountData.transaction_count} transaksi
        </Badge>
      </CardContent>
    </Card>
  );

  const totalBalance = accountsWithBalance.reduce((sum, acc) => sum + acc.calculated_balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Manajemen Rekening & Kantong</h2>
          <p className="text-sm text-gray-400">Kelola rekening, lacak saldo, dan monitor transaksi</p>
        </div>
        <Button onClick={() => {
          setEditingAccount({
            name: '',
            type: 'cash',
            account_number: '',
            bank_name: '',
            initial_balance: 0,
            icon: '💰',
            color: '#3B82F6',
            is_active: true,
            notes: ''
          });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Rekening
        </Button>
      </div>

      <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-purple-700">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">Total Saldo Semua Rekening</p>
            <p className="text-4xl font-bold text-white">{formatRupiah(totalBalance)}</p>
            <p className="text-xs text-gray-400 mt-2">{accountsWithBalance.length} rekening aktif</p>
          </div>
        </CardContent>
      </Card>

      {accountsWithBalance.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accountsWithBalance.map(account => (
            <AccountCard key={account.id} accountData={account} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Wallet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Belum ada rekening. Buat rekening pertama Anda!</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog Tambah/Edit Rekening */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAccount?.id ? 'Edit Rekening' : 'Tambah Rekening Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accountName">Nama Rekening *</Label>
                <Input
                  id="accountName"
                  value={editingAccount?.name || ''}
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                  placeholder="Contoh: Kas Toko, BCA, GoPay"
                  required
                />
              </div>
              <div>
                <Label htmlFor="accountType">Jenis Rekening *</Label>
                <Select
                  value={editingAccount?.type || 'cash'}
                  onValueChange={(value) => setEditingAccount({ ...editingAccount, type: value })}
                >
                  <SelectTrigger id="accountType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{accountTypeIcons.cash} Kas/Tunai</SelectItem>
                    <SelectItem value="bank">{accountTypeIcons.bank} Bank</SelectItem>
                    <SelectItem value="e-wallet">{accountTypeIcons['e-wallet']} E-Wallet</SelectItem>
                    <SelectItem value="other">{accountTypeIcons.other} Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingAccount?.type === 'bank' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bankName">Nama Bank</Label>
                  <Input
                    id="bankName"
                    value={editingAccount?.bank_name || ''}
                    onChange={(e) => setEditingAccount({ ...editingAccount, bank_name: e.target.value })}
                    placeholder="Contoh: Bank BCA, Mandiri"
                  />
                </div>
                <div>
                  <Label htmlFor="accountNumber">Nomor Rekening</Label>
                  <Input
                    id="accountNumber"
                    value={editingAccount?.account_number || ''}
                    onChange={(e) => setEditingAccount({ ...editingAccount, account_number: e.target.value })}
                    placeholder="1234567890"
                  />
                </div>
              </div>
            )}

            {editingAccount?.type === 'e-wallet' && (
              <div>
                <Label htmlFor="accountNumber">Nomor HP/ID E-Wallet</Label>
                <Input
                  id="accountNumber"
                  value={editingAccount?.account_number || ''}
                  onChange={(e) => setEditingAccount({ ...editingAccount, account_number: e.target.value })}
                  placeholder="08123456789"
                />
              </div>
            )}

            <div>
              <Label htmlFor="initialBalance">Saldo Awal</Label>
              <Input
                id="initialBalance"
                type="number"
                value={editingAccount?.initial_balance || 0}
                onChange={(e) => setEditingAccount({ ...editingAccount, initial_balance: Number(e.target.value) })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">Masukkan saldo awal rekening ini</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accountIcon">Icon</Label>
                <Input
                  id="accountIcon"
                  value={editingAccount?.icon || '💰'}
                  onChange={(e) => setEditingAccount({ ...editingAccount, icon: e.target.value })}
                  placeholder="💰"
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="accountColor">Warna</Label>
                <Select
                  value={editingAccount?.color || '#3B82F6'}
                  onValueChange={(value) => setEditingAccount({ ...editingAccount, color: value })}
                >
                  <SelectTrigger id="accountColor">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: opt.value }} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Catatan</Label>
              <Input
                id="notes"
                value={editingAccount?.notes || ''}
                onChange={(e) => setEditingAccount({ ...editingAccount, notes: e.target.value })}
                placeholder="Catatan tambahan (optional)"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog History Rekening */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Riwayat Transaksi - {selectedAccountHistory?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAccountHistory && (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Saldo Saat Ini</p>
                        <p className="text-xl font-bold">{formatRupiah(selectedAccountHistory.calculated_balance)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-600 mb-1">Total Masuk</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatRupiah(selectedAccountHistory.total_income + selectedAccountHistory.transfer_in)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-red-600 mb-1">Total Keluar</p>
                        <p className="text-xl font-bold text-red-600">
                          {formatRupiah(selectedAccountHistory.total_expense + selectedAccountHistory.transfer_out)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <h4 className="font-semibold">Transaksi Terakhir</h4>
                  {records
                    .filter(r => r.account_id === selectedAccountHistory.id || r.transfer_to_account_id === selectedAccountHistory.id)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 10)
                    .map(record => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{record.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.date).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${record.type === 'income' || record.transfer_to_account_id === selectedAccountHistory.id
                              ? 'text-green-600'
                              : 'text-red-600'
                            }`}>
                            {record.type === 'income' || record.transfer_to_account_id === selectedAccountHistory.id ? '+' : '-'}
                            {formatRupiah(record.amount)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {record.type === 'transfer' ? 'Transfer' : record.category}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}