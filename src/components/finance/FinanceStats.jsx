import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

export default function FinanceStats({ records, isLoading }) {
  // ✅ NEW FORMAT: Rp 21.424.000 (full number with thousand separator)
  const formatCurrency = (amount) => {
    return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;
  };

  // Calculate stats from records
  const stats = React.useMemo(() => {
    if (!records || records.length === 0) {
      return {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        totalTransactions: 0
      };
    }

    const income = records.filter(r => r.type === 'income').reduce((sum, r) => sum + (r.amount || 0), 0);
    const expense = records.filter(r => r.type === 'expense').reduce((sum, r) => sum + (r.amount || 0), 0);

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      totalTransactions: records.length
    };
  }, [records]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-400 text-xs sm:text-sm truncate">Total Pemasukan</p>
              <p className="text-base sm:text-2xl font-bold text-green-600 mt-1 truncate">
                {formatCurrency(stats.totalIncome)}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 sm:w-10 sm:h-10 text-green-500 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-400 text-xs sm:text-sm truncate">Total Pengeluaran</p>
              <p className="text-base sm:text-2xl font-bold text-red-600 mt-1 truncate">
                {formatCurrency(stats.totalExpense)}
              </p>
            </div>
            <TrendingDown className="w-6 h-6 sm:w-10 sm:h-10 text-red-500 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-400 text-xs sm:text-sm truncate">Saldo Bersih</p>
              <p className={`text-base sm:text-2xl font-bold mt-1 truncate ${stats.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(stats.balance)}
              </p>
            </div>
            <Wallet className="w-6 h-6 sm:w-10 sm:h-10 text-blue-500 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-400 text-xs sm:text-sm truncate">Total Transaksi</p>
              <p className="text-base sm:text-2xl font-bold text-white mt-1">{stats.totalTransactions}</p>
            </div>
            <DollarSign className="w-6 h-6 sm:w-10 sm:h-10 text-purple-500 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}