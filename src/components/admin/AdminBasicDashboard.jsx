import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Bypass entities.js completely to fix export errors
const User = base44.auth;
const {
  ProductOrder,
  WithdrawalRequest,
  Task
} = base44.entities;
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, Award, Target, Zap, Trophy, Users } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const formatCurrency = (amount) => `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;

export default function AdminBasicDashboard({ user }) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    totalEarnings: 0,
    withdrawableBalance: 0,
    thisMonthEarnings: 0,
    rank: 0,
    topAdmins: [],
    assignedTasks: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();

    // Auto refresh tasks every 15s
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const loadStats = async () => {
    try {
      // Get orders processed by this admin
      const allOrders = await ProductOrder.filter({ processed_by_admin: user.email });
      const completedOrders = allOrders.filter(o => o.status === 'completed');

      // Calculate earnings
      const totalEarnings = completedOrders.reduce((sum, o) => sum + (o.admin_commission_amount || 0), 0);
      const unpaidEarnings = completedOrders.filter(o => !o.admin_commission_paid).reduce((sum, o) => sum + (o.admin_commission_amount || 0), 0);

      // This month earnings
      const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const thisMonthOrders = completedOrders.filter(o => new Date(o.completed_at) >= thisMonthStart);
      const thisMonthEarnings = thisMonthOrders.reduce((sum, o) => sum + (o.admin_commission_amount || 0), 0);

      // Get all admins for ranking
      const allUsers = await User.filter({ admin_type: 'basic' });
      const adminStats = await Promise.all(
        allUsers.map(async (admin) => {
          const adminOrders = await ProductOrder.filter({ processed_by_admin: admin.email, status: 'completed' });
          return {
            name: admin.full_name || admin.email,
            email: admin.email,
            orders: adminOrders.length,
            earnings: adminOrders.reduce((sum, o) => sum + (o.admin_commission_amount || 0), 0)
          };
        })
      );

      adminStats.sort((a, b) => b.earnings - a.earnings);
      const myRank = adminStats.findIndex(a => a.email === user.email) + 1;

      // ✅ FETCH ASSIGNED TASKS (POS) - ROBUST
      let myTasks = [];
      try {
        console.log('🔍 Checking tasks for User ID:', user.id);
        const allTasks = await Task.filter({ status: 'todo' }); // Fetch 'todo' tasks first

        // Filter client-side for robust ID matching
        myTasks = allTasks.filter(t => String(t.assigned_to) === String(user.id));

        console.log(`✅ Found ${myTasks.length} tasks for user.`);
      } catch (e) {
        console.warn('Error fetching tasks:', e);
        myTasks = [];
      }

      setStats({
        totalOrders: allOrders.length,
        completedOrders: completedOrders.length,
        totalEarnings,
        withdrawableBalance: user.admin_commission_balance || 0,
        thisMonthEarnings,
        rank: myRank,
        topAdmins: adminStats.slice(0, 5),
        assignedTasks: myTasks || []
      });
    } catch (error) {
      console.error("Error loading admin stats:", error);
      toast.error("Gagal memuat statistik");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (stats.withdrawableBalance < 50000) {
      toast.error("Minimum penarikan Rp 50.000");
      return;
    }

    try {
      await WithdrawalRequest.create({
        user_id: user.id,
        user_email: user.email,
        amount: stats.withdrawableBalance,
        bank_account_id: 'admin_commission', // Special type
        bank_account_details: { note: 'Withdrawal komisi admin basic' },
        status: 'pending'
      });

      toast.success("Permintaan penarikan berhasil diajukan!");
      loadStats();
    } catch (error) {
      toast.error("Gagal mengajukan penarikan");
    }
  };

  const handleTaskComplete = async (task) => {
    try {
      await Task.update(task.id, { status: 'completed' });
      toast.success('✅ Tugas selesai!');
      loadStats();
    } catch (e) {
      toast.error('Gagal update tugas');
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Memuat data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* CTA Banner */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Selamat Datang, Admin! 🎉</h2>
              <p className="opacity-90">Proses lebih banyak transaksi untuk mendapatkan komisi lebih besar!</p>
            </div>
            <Trophy className="w-16 h-16 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* 🔔 POS TASKS NOTIFICATION AREA */}
      {stats.assignedTasks?.length > 0 && (
        <Card className="border-l-4 border-l-orange-500 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg text-orange-700 dark:text-orange-400">
              <Zap className="w-5 h-5" />
              Tugas Masuk (POS)
              <Badge className="bg-orange-600 hover:bg-orange-700 text-white">{stats.assignedTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {stats.assignedTasks.map((task) => (
                <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="mb-3 sm:mb-0">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">{task.title}</h4>
                    <p className="text-sm text-gray-500 whitespace-pre-wrap mt-1">{task.description}</p>
                    <p className="text-xs text-gray-400 mt-2">🕒 {new Date(task.created_date).toLocaleString('id-ID')}</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                    onClick={() => handleTaskComplete(task)}>
                    <Target className="w-4 h-4 mr-2" />
                    Selesai
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Pesanan Diproses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-green-600 mt-1">
                {stats.completedOrders} selesai
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Penghasilan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalEarnings)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Akumulasi dari awal
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Saldo Dapat Ditarik
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.withdrawableBalance)}
              </div>
              <Button
                size="sm"
                onClick={handleWithdraw}
                disabled={stats.withdrawableBalance < 50000}
                className="mt-2 w-full"
              >
                Tarik Saldo
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Penghasilan Bulan Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats.thisMonthEarnings)}
              </div>
              <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                <TrendingUp className="w-3 h-3" />
                Terus tingkatkan!
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Ranking */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Peringkat Anda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                #{stats.rank}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                dari {stats.topAdmins.length} Admin
              </p>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium">
                  💡 Proses lebih banyak transaksi untuk naik peringkat!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Top 5 Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topAdmins.map((admin, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-yellow-400 text-white' :
                      idx === 1 ? 'bg-gray-300 text-gray-800' :
                        idx === 2 ? 'bg-orange-400 text-white' :
                          'bg-blue-100 text-blue-800'
                      }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{admin.name}</p>
                      <p className="text-xs text-gray-500">{admin.orders} transaksi</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-green-600">
                      {formatCurrency(admin.earnings)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Motivational CTA */}
      <Card className="bg-gradient-to-r from-green-500 to-teal-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Zap className="w-12 h-12" />
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">Tingkatkan Performa Anda!</h3>
              <p className="opacity-90 text-sm">
                Setiap transaksi yang diselesaikan = Komisi untuk Anda. Admin terbaik mendapat bonus bulanan!
              </p>
            </div>
            <Button className="bg-white text-green-600 hover:bg-gray-100">
              Lihat Pesanan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}