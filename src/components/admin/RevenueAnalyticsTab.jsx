
import { useState, useEffect } from 'react';
import { UpgradeRequest } from '@/entities/UpgradeRequest';
import { Commission } from '@/entities/Commission';
import { AddonRequest } from '@/entities/AddonRequest';
import { ProductOrder } from '@/entities/ProductOrder';
import { User } from '@/entities/User';
import { DigitalProduct } from '@/entities/DigitalProduct';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Award, ShoppingCart, Trophy, Package, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const formatCurrency = (amount) => `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;

export default function RevenueAnalyticsTab({ upgradeRequests, orders }) { // Modified component signature
  const [period, setPeriod] = useState('all');
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    shopRevenue: 0,
    membershipRevenue: 0,
    totalCommissions: 0,
    adminCommissions: 0,
    netRevenue: 0,
    totalOrders: 0,
    transactions: [],
    monthlyRevenue: [],
    topAdmins: [],
    topProducts: [],
    worstProducts: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const [
        allUpgrades,
        allAddons,
        allCommissions,
        allOrders,
        allAdmins,
        allProducts] =
        await Promise.all([
          UpgradeRequest.filter({ status: 'approved' }),
          AddonRequest.filter({ status: 'approved' }),
          Commission.filter({ status: 'paid_to_balance' }),
          ProductOrder.filter({ status: 'completed' }),
          User.filter({ admin_type: 'basic' }),
          DigitalProduct.list()]
        );

      let filteredUpgrades = allUpgrades;
      let filteredAddons = allAddons;
      let filteredCommissions = allCommissions;
      let filteredOrders = allOrders;

      const now = new Date();
      if (period === 'month') {
        const startDate = startOfMonth(now);
        const endDate = endOfMonth(now);
        filteredUpgrades = allUpgrades.filter((u) => {
          const date = new Date(u.created_date);
          return date >= startDate && date <= endDate;
        });
        filteredAddons = allAddons.filter((a) => {
          const date = new Date(a.created_date);
          return date >= startDate && date <= endDate;
        });
        filteredCommissions = allCommissions.filter((c) => {
          const date = new Date(c.created_date);
          return date >= startDate && date <= endDate;
        });
        filteredOrders = allOrders.filter((o) => {
          const date = new Date(o.completed_at);
          return date >= startDate && date <= endDate;
        });
      } else if (period === 'year') {
        const startDate = startOfYear(now);
        const endDate = endOfYear(now);
        filteredUpgrades = allUpgrades.filter((u) => {
          const date = new Date(u.created_date);
          return date >= startDate && date <= endDate;
        });
        filteredAddons = allAddons.filter((a) => {
          const date = new Date(a.created_date);
          return date >= startDate && date <= endDate;
        });
        filteredCommissions = allCommissions.filter((c) => {
          const date = new Date(c.created_date);
          return date >= startDate && date <= endDate;
        });
        filteredOrders = allOrders.filter((o) => {
          const date = new Date(o.completed_at);
          return date >= startDate && date <= endDate;
        });
      }

      // Calculate revenues
      const membershipRevenue = filteredUpgrades.reduce((sum, u) => sum + (u.price_paid || 0), 0) +
        filteredAddons.reduce((sum, a) => sum + (a.price_paid || 0), 0);

      const shopRevenue = filteredOrders.reduce((sum, o) => sum + (o.final_price || 0), 0);

      const totalRevenue = membershipRevenue + shopRevenue;

      const totalCommissions = filteredCommissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);

      const adminCommissions = filteredOrders.reduce((sum, o) => sum + (o.admin_commission_amount || 0), 0);

      const netRevenue = totalRevenue - totalCommissions - adminCommissions;

      // Monthly revenue for last 6 months
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));

        const monthUpgrades = allUpgrades.filter((u) => {
          const date = new Date(u.created_date);
          return date >= monthStart && date <= monthEnd;
        });

        const monthAddons = allAddons.filter((a) => {
          const date = new Date(a.created_date);
          return date >= monthStart && date <= monthEnd;
        });

        const monthOrders = allOrders.filter((o) => {
          const date = new Date(o.completed_at);
          return date >= monthStart && date <= monthEnd;
        });

        const revenue = monthUpgrades.reduce((sum, u) => sum + (u.price_paid || 0), 0) +
          monthAddons.reduce((sum, a) => sum + (a.price_paid || 0), 0) +
          monthOrders.reduce((sum, o) => sum + (o.final_price || 0), 0);

        monthlyData.push({
          month: format(monthStart, 'MMM', { locale: id }),
          revenue: revenue
        });
      }

      // Top Admins Stats
      const adminStats = await Promise.all(
        allAdmins.map(async (admin) => {
          const adminOrders = filteredOrders.filter((o) => o.processed_by_admin === admin.email);
          const earnings = adminOrders.reduce((sum, o) => sum + (o.admin_commission_amount || 0), 0);
          return {
            name: admin.full_name || admin.email,
            email: admin.email,
            orders: adminOrders.length,
            commission: earnings // Renamed earnings to commission
          };
        })
      );

      const topAdmins = adminStats.
        filter((a) => a.orders > 0).
        sort((a, b) => b.commission - a.commission). // Sorted by commission
        slice(0, 10);

      // Product Statistics
      const productStats = allProducts.map((product) => {
        const productOrders = filteredOrders.filter((o) => o.product_id === product.id);
        const revenue = productOrders.reduce((sum, o) => sum + (o.final_price || 0), 0);
        return {
          id: product.id,
          name: product.name,
          category: product.category,
          orders: productOrders.length,
          revenue: revenue
        };
      });

      const topProducts = productStats.
        filter((p) => p.orders > 0).
        sort((a, b) => b.revenue - a.revenue).
        slice(0, 10);

      const worstProducts = productStats.
        filter((p) => p.orders === 0 || p.revenue < 100000).
        sort((a, b) => a.orders - b.orders).
        slice(0, 10);

      // Combine all transactions
      const transactions = [
        ...filteredUpgrades.map((u) => ({
          type: 'membership',
          date: u.created_date,
          user: u.user_full_name || 'Unknown',
          item: u.requested_plan || 'unknown',
          amount: u.price_paid || 0
        })),
        ...filteredOrders.map((o) => ({
          type: 'shop',
          date: o.completed_at,
          user: o.customer_name || 'Unknown',
          item: o.product_name || 'unknown',
          amount: o.final_price || 0
        }))].
        sort((a, b) => new Date(b.date) - new Date(a.date));

      setAnalytics({
        totalRevenue,
        shopRevenue,
        membershipRevenue,
        totalCommissions,
        adminCommissions,
        netRevenue,
        totalOrders: filteredOrders.length,
        transactions,
        monthlyRevenue: monthlyData,
        topAdmins,
        topProducts,
        worstProducts
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analisa Pendapatan</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Waktu</SelectItem>
            <SelectItem value="month">Bulan Ini</SelectItem>
            <SelectItem value="year">Tahun Ini</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border-blue-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendapatan Kotor</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(analytics.totalRevenue || 0)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Membership: {formatCurrency(analytics.membershipRevenue || 0)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Toko: {formatCurrency(analytics.shopRevenue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-600/20 to-red-700/20 border-red-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Komisi Dibayarkan</CardTitle>
            <Award className="h-5 w-5 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency((analytics.totalCommissions || 0) + (analytics.adminCommissions || 0))}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Komisi Referral: {formatCurrency(analytics.totalCommissions || 0)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Komisi Admin: {formatCurrency(analytics.adminCommissions || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600/20 to-green-700/20 border-green-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendapatan Bersih</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(analytics.netRevenue || 0)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Margin: {(analytics.netRevenue / (analytics.totalRevenue || 1) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border-purple-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Order Toko</CardTitle>
            <ShoppingCart className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics.totalOrders || 0}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Pesanan selesai
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tren Pendapatan 6 Bulan Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#fff' }} />

              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Pendapatan" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Admins & Products */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Admins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"> {/* Added flex for icon */}
              <Trophy className="w-5 h-5 text-yellow-500" />
              Top Admin (Berdasarkan Komisi) {/* Modified title */}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topAdmins.map((admin, idx) =>
                <div key={idx} className="bg-slate-900 p-3 flex items-center justify-between rounded-lg"> {/* Modified bg class */}
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      idx === 0 ? 'bg-yellow-400 text-white' :
                        idx === 1 ? 'bg-gray-300 text-gray-800' :
                          idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600'}`}> {/* Modified default color class */}
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{admin.name}</p> {/* Removed text-sm */}
                      <p className="text-xs text-gray-500">{admin.email}</p> {/* Added admin email */}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{formatCurrency(admin.commission)}</p> {/* Modified to commission, font-semibold */}
                    <p className="text-xs text-gray-500">{admin.orders} pesanan</p> {/* Modified text from 'transaksi' to 'pesanan' */}
                  </div>
                </div>
              )}
              {analytics.topAdmins.length === 0 &&
                <p className="text-center text-gray-500 py-8">Belum ada data admin</p>
              }
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"> {/* Added flex for icon */}
              <Package className="w-5 h-5 text-green-500" />
              Produk Terlaris {/* Modified title */}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topProducts.map((product, idx) =>
                <div key={idx} className="bg-slate-900 p-3 flex items-center justify-between rounded-lg"> {/* Modified bg class */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p> {/* Removed text-sm */}
                      <p className="text-xs text-gray-500">{product.orders} pesanan</p> {/* Modified text from 'terjual' to 'pesanan' */}
                    </div>
                  </div>
                  <p className="font-semibold text-green-600">{formatCurrency(product.revenue)}</p> {/* Modified font-bold to font-semibold */}
                </div>
              )}
              {analytics.topProducts.length === 0 &&
                <p className="text-center text-gray-500 py-8">Belum ada data produk</p>
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Worst Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-red-500" />
            Produk Kurang Laku (Perlu Perhatian)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {analytics.worstProducts.map((product, idx) =>
              <div key={idx} className="bg-slate-950 p-3 flex items-center justify-between dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{product.name}</p>
                  <p className="text-xs text-gray-500">
                    {product.orders} terjual • {formatCurrency(product.revenue)}
                  </p>
                </div>
                <Badge variant="destructive" className="text-xs">
                  {product.orders === 0 ? 'Belum Terjual' : 'Kurang Laku'}
                </Badge>
              </div>
            )}
            {analytics.worstProducts.length === 0 &&
              <p className="text-center text-gray-500 py-8 col-span-2">Semua produk laris!</p>
            }
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.transactions.slice(0, 20).map((transaction, index) =>
                  <TableRow key={index}>
                    <TableCell>
                      {format(new Date(transaction.date), 'dd MMM yyyy HH:mm', { locale: id })}
                    </TableCell>
                    <TableCell>{transaction.user}</TableCell>
                    <TableCell>
                      <Badge className={transaction.type === 'membership' ? 'bg-blue-600' : 'bg-green-600'}>
                        {transaction.type === 'membership' ? 'Membership' : 'Toko'}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.item}</TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      {formatCurrency(transaction.amount || 0)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>);
}
