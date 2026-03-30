import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, eachDayOfInterval, subDays } from 'date-fns';

export default function FinanceChart({ records, mode }) {
  // Generate chart data from records
  const chartData = React.useMemo(() => {
    if (!records || records.length === 0) return [];

    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date()
    });

    return last30Days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayRecords = records.filter(r => {
        const recordDate = format(new Date(r.date), 'yyyy-MM-dd');
        return recordDate === dayStr;
      });

      const income = dayRecords
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      
      const expense = dayRecords
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      return {
        date: format(day, 'dd/MM'),
        income,
        expense
      };
    });
  }, [records]);

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-white text-sm sm:text-base">Tren Keuangan (30 Hari Terakhir)</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value) => `Rp ${Number(value).toLocaleString('id-ID')}`}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', fontSize: '12px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="income" stroke="#10b981" name="Pemasukan" strokeWidth={2} />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" name="Pengeluaran" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}