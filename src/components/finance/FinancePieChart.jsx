import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function FinancePieChart({ records }) {
  // Generate pie chart data from records
  const { incomeData, expenseData } = React.useMemo(() => {
    if (!records || records.length === 0) {
      return { incomeData: [], expenseData: [] };
    }

    // Group by category for income
    const incomeByCategory = records
      .filter(r => r.type === 'income')
      .reduce((acc, r) => {
        const category = r.category || 'Lainnya';
        acc[category] = (acc[category] || 0) + (r.amount || 0);
        return acc;
      }, {});

    // Group by category for expense
    const expenseByCategory = records
      .filter(r => r.type === 'expense')
      .reduce((acc, r) => {
        const category = r.category || 'Lainnya';
        acc[category] = (acc[category] || 0) + (r.amount || 0);
        return acc;
      }, {});

    return {
      incomeData: Object.entries(incomeByCategory).map(([name, value]) => ({ name, value })),
      expenseData: Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))
    };
  }, [records]);

  // Show the category with more data
  const data = expenseData.length > incomeData.length ? expenseData : incomeData;
  const title = expenseData.length > incomeData.length ? 'Pengeluaran per Kategori' : 'Pemasukan per Kategori';

  if (data.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-white text-sm sm:text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="text-center py-8 text-gray-400 text-sm">
            Belum ada data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-white text-sm sm:text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[250px]">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${((entry.value / data.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `Rp ${Number(value).toLocaleString('id-ID')}`}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}