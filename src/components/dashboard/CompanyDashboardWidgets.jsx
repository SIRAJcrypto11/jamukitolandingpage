import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users,
    Package, AlertTriangle, Activity, Zap, ArrowUp, ArrowDown,
    RefreshCw, Clock, UserCheck, BarChart3, PieChart as PieChartIcon,
    CheckCircle2, XCircle, Minus, Star
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, isToday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatRupiah } from '@/components/utils/currencyFormatter';
import globalCache from '@/components/utils/globalDataCache';

// ─── Color Palette ────────────────────────────────────────────────────────────
const PALETTE = {
    blue: '#3b82f6',
    emerald: '#10b981',
    red: '#ef4444',
    amber: '#f59e0b',
    purple: '#8b5cf6',
    cyan: '#06b6d4',
    pink: '#ec4899',
    indigo: '#6366f1',
};
const PIE_COLORS = Object.values(PALETTE);

// ─── Mini Sparkline ────────────────────────────────────────────────────────────
function Sparkline({ data = [], color = PALETTE.blue, height = 40 }) {
    if (!data || data.length < 2) return null;
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="v"
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#sg-${color.replace('#', '')})`}
                    dot={false}
                    isAnimationActive={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// ─── Shimmer Skeleton ──────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
    return (
        <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
    );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ title, value, subtitle, change, changeLabel, icon: Icon, color, sparkData, loading }) {
    const isPositive = change >= 0;
    return (
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-7 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                ) : (
                    <>
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{title}</p>
                                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-0.5 truncate">{value}</p>
                                {subtitle && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>
                                )}
                            </div>
                            <div className={`p-2 rounded-lg flex-shrink-0 ml-2`} style={{ backgroundColor: color + '20' }}>
                                <Icon className="w-4 h-4" style={{ color }} />
                            </div>
                        </div>
                        {sparkData && sparkData.length >= 2 && (
                            <div className="mt-2">
                                <Sparkline data={sparkData} color={color} height={36} />
                            </div>
                        )}
                        {change !== undefined && (
                            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                <span>{Math.abs(change).toFixed(1)}%</span>
                                {changeLabel && <span className="text-gray-400 font-normal ml-0.5">{changeLabel}</span>}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, isCurrency = true }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-lg text-xs">
            <p className="text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="font-semibold" style={{ color: p.color || p.stroke }}>
                    {p.name}: {isCurrency ? formatRupiah(p.value) : p.value}
                </p>
            ))}
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CompanyDashboardWidgets({ selectedCompany, currentUser, hasPermission, isCompanyOwner }) {
    const [loading, setLoading] = useState(true);
    const [financeData, setFinanceData] = useState([]);
    const [posTransactions, setPosTransactions] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [inventoryData, setInventoryData] = useState([]);
    const [stockAlerts, setStockAlerts] = useState([]);
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const cacheKey = `company_dashboard_widgets_${selectedCompany?.id}`;
    const isMountedRef = useRef(true);

    // ─── Data Fetching ─────────────────────────────────────────────────────────
    const fetchData = useCallback(async (silent = false) => {
        if (!selectedCompany?.id) return;
        if (!silent) setLoading(true);
        else setIsRefreshing(true);

        // ── Cache-first: instant display ─────────
        const cached = globalCache.get(cacheKey);
        if (cached && !silent) {
            setFinanceData(cached.finance || []);
            setPosTransactions(cached.pos || []);
            setAttendanceData(cached.attendance || []);
            setInventoryData(cached.inventory || []);
            setStockAlerts(cached.alerts || []);
            setLoading(false);
        }

        try {
            const threeMonthsAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');

            const [finance, pos, attendance, inventory, alerts] = await Promise.all([
                base44.entities.FinancialRecord.filter({ company_id: selectedCompany.id }).catch(() => []),
                base44.entities.CompanyPOSTransaction.filter({
                    company_id: selectedCompany.id,
                    status: 'completed'
                }).catch(() => []),
                base44.entities.CompanyAttendance.filter({ company_id: selectedCompany.id }).catch(() => []),
                base44.entities.Inventory.filter({ company_id: selectedCompany.id }).catch(() => []),
                base44.entities.StockAlert.filter({ company_id: selectedCompany.id, status: 'active' }).catch(() => []),
            ]);

            if (!isMountedRef.current) return;

            setFinanceData(finance || []);
            setPosTransactions(pos || []);
            setAttendanceData(attendance || []);
            setInventoryData(inventory || []);
            setStockAlerts(alerts || []);
            setLastRefreshed(new Date());

            // Update cache
            globalCache.set(cacheKey, {
                finance: finance || [],
                pos: pos || [],
                attendance: attendance || [],
                inventory: inventory || [],
                alerts: alerts || [],
            });
        } catch (err) {
            console.error('CompanyDashboardWidgets fetch error:', err);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
                setIsRefreshing(false);
            }
        }
    }, [selectedCompany?.id, cacheKey]);

    // ─── Mount & BroadcastChannel real-time sync ───────────────────────────────
    useEffect(() => {
        isMountedRef.current = true;
        fetchData(false);

        const channels = [
            new BroadcastChannel('snishop_pos_updates'),
            new BroadcastChannel('snishop_inventory_updates'),
            new BroadcastChannel('snishop_reports_updates'),
        ];

        const handleSync = (e) => {
            if (e.data?.companyId === selectedCompany?.id) {
                fetchData(true); // silent background refresh
            }
        };

        channels.forEach(ch => { ch.onmessage = handleSync; });

        // Auto-refresh every 5 minutes
        const interval = setInterval(() => fetchData(true), 300000);

        return () => {
            isMountedRef.current = false;
            channels.forEach(ch => ch.close());
            clearInterval(interval);
        };
    }, [fetchData, selectedCompany?.id]);

    // ─── Computed: Finance ──────────────────────────────────────────────────────
    const financeStats = useMemo(() => {
        const now = new Date();
        const thisMonthStart = startOfMonth(now);
        const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        const lastMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

        const thisMonth = financeData.filter(r => {
            const d = new Date(r.transaction_date || r.created_date || r.date || r.created_at);
            return d >= thisMonthStart && d <= now;
        });
        const lastMonth = financeData.filter(r => {
            const d = new Date(r.transaction_date || r.created_date || r.date || r.created_at);
            return d >= lastMonthStart && d <= lastMonthEnd;
        });

        const income = thisMonth.filter(r => r.type === 'income' || r.transaction_type === 'income').reduce((s, r) => s + (r.amount || 0), 0);
        const expense = thisMonth.filter(r => r.type === 'expense' || r.transaction_type === 'expense').reduce((s, r) => s + (r.amount || 0), 0);
        const lastIncome = lastMonth.filter(r => r.type === 'income' || r.transaction_type === 'income').reduce((s, r) => s + (r.amount || 0), 0);
        const lastExpense = lastMonth.filter(r => r.type === 'expense' || r.transaction_type === 'expense').reduce((s, r) => s + (r.amount || 0), 0);

        const incomeChange = lastIncome > 0 ? ((income - lastIncome) / lastIncome) * 100 : 0;
        const expenseChange = lastExpense > 0 ? ((expense - lastExpense) / lastExpense) * 100 : 0;

        return { income, expense, net: income - expense, incomeChange, expenseChange };
    }, [financeData]);

    // ─── Computed: Finance Sparkline (last 7 days income) ──────────────────────
    const incomeSparkData = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const day = subDays(new Date(), 6 - i);
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);
            const v = financeData
                .filter(r => {
                    const d = new Date(r.transaction_date || r.created_date || r.date || r.created_at);
                    return (r.type === 'income' || r.transaction_type === 'income') && d >= dayStart && d <= dayEnd;
                })
                .reduce((s, r) => s + (r.amount || 0), 0);
            return { label: format(day, 'dd/MM'), v };
        });
    }, [financeData]);

    const expenseSparkData = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const day = subDays(new Date(), 6 - i);
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);
            const v = financeData
                .filter(r => {
                    const d = new Date(r.transaction_date || r.created_date || r.date || r.created_at);
                    return (r.type === 'expense' || r.transaction_type === 'expense') && d >= dayStart && d <= dayEnd;
                })
                .reduce((s, r) => s + (r.amount || 0), 0);
            return { label: format(day, 'dd/MM'), v };
        });
    }, [financeData]);

    // ─── Computed: POS Today ────────────────────────────────────────────────────
    const posToday = useMemo(() => {
        const todayTx = posTransactions.filter(tx => {
            const d = new Date(tx.created_date || tx.transaction_date || tx.created_at);
            return isToday(d);
        });
        return {
            count: todayTx.length,
            revenue: todayTx.reduce((s, tx) => s + (tx.total_amount || tx.grand_total || tx.final_amount || 0), 0),
            transactions: todayTx.slice(0, 10),
        };
    }, [posTransactions]);

    // ─── Computed: 7-day Sales Trend ────────────────────────────────────────────
    const salesTrend7Days = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const day = subDays(new Date(), 6 - i);
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);
            const dayTx = posTransactions.filter(tx => {
                const d = new Date(tx.created_date || tx.transaction_date || tx.created_at);
                return d >= dayStart && d <= dayEnd;
            });
            return {
                label: format(day, 'EEE', { locale: idLocale }),
                revenue: dayTx.reduce((s, tx) => s + (tx.total_amount || tx.grand_total || tx.final_amount || 0), 0),
                transaksi: dayTx.length,
            };
        });
    }, [posTransactions]);

    // ─── Computed: Top Products ─────────────────────────────────────────────────
    const topProducts = useMemo(() => {
        const productMap = {};
        posTransactions.forEach(tx => {
            const items = tx.items || tx.cart_items || [];
            items.forEach(item => {
                const name = item.product_name || item.name || 'Unknown';
                if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 };
                productMap[name].qty += item.quantity || 1;
                productMap[name].revenue += (item.subtotal || (item.price * (item.quantity || 1))) || 0;
            });
        });
        return Object.values(productMap)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
    }, [posTransactions]);

    // ─── Computed: Finance Pie (by category) ───────────────────────────────────
    const financePieData = useMemo(() => {
        const catMap = {};
        financeData
            .filter(r => r.type === 'income' || r.transaction_type === 'income')
            .forEach(r => {
                const cat = r.category || r.transaction_category || 'Lainnya';
                catMap[cat] = (catMap[cat] || 0) + (r.amount || 0);
            });
        return Object.entries(catMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [financeData]);

    // ─── Computed: Attendance Today ─────────────────────────────────────────────
    const attendanceToday = useMemo(() => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayRecords = attendanceData.filter(a => {
            const d = a.date || a.attendance_date || format(new Date(a.created_at || Date.now()), 'yyyy-MM-dd');
            return d === today;
        });
        return {
            hadir: todayRecords.filter(a => a.status === 'hadir' || a.status === 'present' || a.clock_in).length,
            terlambat: todayRecords.filter(a => a.status === 'terlambat' || a.status === 'late').length,
            absen: todayRecords.filter(a => a.status === 'absen' || a.status === 'absent').length,
            total: todayRecords.length,
            records: todayRecords.slice(0, 8),
        };
    }, [attendanceData]);

    const attendancePie = useMemo(() => [
        { name: 'Hadir', value: attendanceToday.hadir, color: PALETTE.emerald },
        { name: 'Terlambat', value: attendanceToday.terlambat, color: PALETTE.amber },
        { name: 'Absen', value: attendanceToday.absen, color: PALETTE.red },
    ].filter(d => d.value > 0), [attendanceToday]);

    // ─── Computed: Low Stock ────────────────────────────────────────────────────
    const lowStockItems = useMemo(() => {
        return inventoryData
            .filter(i => i.stock_status === 'low_stock' || i.stock_status === 'out_of_stock')
            .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
            .slice(0, 8);
    }, [inventoryData]);

    // ─── Computed: Active Cashiers Today ───────────────────────────────────────
    const activeCashiers = useMemo(() => {
        const cashierMap = {};
        posToday.transactions.forEach(tx => {
            const cashier = tx.cashier_name || tx.cashier_email || 'Kasir';
            if (!cashierMap[cashier]) cashierMap[cashier] = { name: cashier, count: 0, revenue: 0 };
            cashierMap[cashier].count++;
            cashierMap[cashier].revenue += tx.total_amount || tx.grand_total || tx.final_amount || 0;
        });
        return Object.values(cashierMap).sort((a, b) => b.revenue - a.revenue);
    }, [posToday]);

    // ─── Operational Health Score ───────────────────────────────────────────────
    const healthScore = useMemo(() => {
        let score = 0;
        let factors = [];

        // Revenue trend (25): positive trend = full points
        const lastIncome = financeStats.income;
        const incomeScore = lastIncome > 0 ? Math.min(25, 25) : 10;
        score += incomeScore;
        factors.push({ label: 'Keuangan', score: incomeScore, max: 25, ok: lastIncome > 0 });

        // Stock health (25): lower low-stock = better
        const totalInventory = inventoryData.length;
        const lowPct = totalInventory > 0 ? lowStockItems.length / totalInventory : 0;
        const stockScore = Math.round(25 * (1 - lowPct));
        score += stockScore;
        factors.push({ label: 'Stok', score: stockScore, max: 25, ok: stockScore >= 15 });

        // POS activity today (25): at least 1 transaction = good
        const posScore = posToday.count > 0 ? Math.min(25, 10 + posToday.count) : 0;
        score += Math.min(25, posScore);
        factors.push({ label: 'Penjualan', score: Math.min(25, posScore), max: 25, ok: posToday.count > 0 });

        // Attendance (25): full attendance = good
        const attRate = attendanceToday.total > 0 ? attendanceToday.hadir / attendanceToday.total : 0;
        const attScore = Math.round(25 * attRate);
        score += attScore;
        factors.push({ label: 'Kehadiran', score: attScore, max: 25, ok: attScore >= 18 });

        return { score: Math.min(100, score), factors };
    }, [financeStats, inventoryData, lowStockItems, posToday, attendanceToday]);

    const healthColor = healthScore.score >= 80 ? 'text-emerald-500' : healthScore.score >= 60 ? 'text-amber-500' : 'text-red-500';
    const healthBg = healthScore.score >= 80 ? 'bg-emerald-500' : healthScore.score >= 60 ? 'bg-amber-500' : 'bg-red-500';
    const healthLabel = healthScore.score >= 80 ? 'Sangat Baik' : healthScore.score >= 60 ? 'Perlu Perhatian' : 'Kritis';

    if (!selectedCompany) return null;

    return (
        <div className="space-y-4">
            {/* ── Section Header ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">Business Intelligence</h2>
                    <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs border-0">Live</Badge>
                </div>
                <div className="flex items-center gap-2">
                    {lastRefreshed && (
                        <span className="text-xs text-gray-400 hidden sm:block">
                            {format(lastRefreshed, 'HH:mm:ss')}
                        </span>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchData(false)}
                        disabled={isRefreshing || loading}
                        className="h-7 px-2 text-xs text-gray-500 dark:text-gray-400"
                    >
                        <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* ── Row 1: KPI Cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <KPICard
                    title="Pendapatan Bulan Ini"
                    value={loading ? '—' : formatRupiah(financeStats.income)}
                    change={financeStats.incomeChange}
                    changeLabel="vs bln lalu"
                    icon={DollarSign}
                    color={PALETTE.emerald}
                    sparkData={incomeSparkData}
                    loading={loading}
                />
                <KPICard
                    title="Pengeluaran Bulan Ini"
                    value={loading ? '—' : formatRupiah(financeStats.expense)}
                    change={financeStats.expenseChange}
                    changeLabel="vs bln lalu"
                    icon={TrendingDown}
                    color={PALETTE.red}
                    sparkData={expenseSparkData}
                    loading={loading}
                />
                <KPICard
                    title="Penjualan Kasir Hari Ini"
                    value={loading ? '—' : formatRupiah(posToday.revenue)}
                    subtitle={`${posToday.count} transaksi`}
                    icon={ShoppingCart}
                    color={PALETTE.blue}
                    loading={loading}
                />
                <KPICard
                    title="Laba Bersih Bulan Ini"
                    value={loading ? '—' : formatRupiah(financeStats.net)}
                    subtitle={financeStats.income > 0
                        ? `Margin ${((financeStats.net / financeStats.income) * 100).toFixed(1)}%`
                        : 'Belum ada pemasukan'}
                    icon={TrendingUp}
                    color={financeStats.net >= 0 ? PALETTE.emerald : PALETTE.red}
                    loading={loading}
                />
            </div>

            {/* ── Row 2: Charts ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* 7-day Sales Trend */}
                <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <CardHeader className="p-3 sm:p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                            <BarChart3 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            Tren Penjualan 7 Hari
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        {loading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-[160px] w-full" />
                            </div>
                        ) : salesTrend7Days.every(d => d.revenue === 0) ? (
                            <div className="flex flex-col items-center justify-center h-[160px] text-gray-400 dark:text-gray-500">
                                <ShoppingCart className="w-8 h-8 mb-2 opacity-40" />
                                <p className="text-xs">Belum ada transaksi</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={160}>
                                <AreaChart data={salesTrend7Days} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={PALETTE.blue} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={PALETTE.blue} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false}
                                        tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : v} />
                                    <Tooltip content={<CustomTooltip isCurrency={true} />} />
                                    <Area type="monotone" dataKey="revenue" name="Pendapatan" stroke={PALETTE.blue} strokeWidth={2} fill="url(#salesGrad)" dot={{ r: 3, fill: PALETTE.blue }} activeDot={{ r: 4 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Finance Pie */}
                <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <CardHeader className="p-3 sm:p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                            <PieChartIcon className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            Alokasi Pendapatan (Kategori)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        {loading ? (
                            <Skeleton className="h-[160px] w-full" />
                        ) : financePieData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[160px] text-gray-400 dark:text-gray-500">
                                <DollarSign className="w-8 h-8 mb-2 opacity-40" />
                                <p className="text-xs">Belum ada data keuangan</p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <ResponsiveContainer width="50%" height={160}>
                                    <PieChart>
                                        <Pie data={financePieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                                            {financePieData.map((_, i) => (
                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v) => formatRupiah(v)} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-1.5 overflow-hidden">
                                    {financePieData.map((d, i) => (
                                        <div key={d.name} className="flex items-center gap-2 min-w-0">
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{d.name}</span>
                                            <span className="text-xs font-semibold text-gray-900 dark:text-white flex-shrink-0">
                                                {financeStats.income > 0 ? `${((d.value / financeStats.income) * 100).toFixed(0)}%` : '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Row 3: Operational Intelligence ─────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Top Products */}
                <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <CardHeader className="p-3 sm:p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                            <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            Produk Terlaris
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        {loading ? (
                            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
                        ) : topProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[120px] text-gray-400 dark:text-gray-500">
                                <Package className="w-6 h-6 mb-2 opacity-40" />
                                <p className="text-xs">Belum ada data penjualan</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {topProducts.map((p, i) => {
                                    const maxQty = topProducts[0]?.qty || 1;
                                    const pct = (p.qty / maxQty) * 100;
                                    return (
                                        <div key={p.name}>
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">
                                                    <span className="text-gray-400 mr-1">#{i + 1}</span>{p.name}
                                                </span>
                                                <span className="text-xs font-semibold text-gray-900 dark:text-white flex-shrink-0">{p.qty} unit</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                                                <div
                                                    className="h-1.5 rounded-full transition-all duration-500"
                                                    style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Low Stock Alerts */}
                <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <CardHeader className="p-3 sm:p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            Stok Menipis
                            {lowStockItems.length > 0 && (
                                <Badge className="ml-auto text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-0">
                                    {lowStockItems.length}
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        {loading ? (
                            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
                        ) : lowStockItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[120px] text-gray-400 dark:text-gray-500">
                                <CheckCircle2 className="w-6 h-6 mb-2 text-emerald-500 opacity-70" />
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Semua stok aman</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5 max-h-[148px] overflow-y-auto pr-1">
                                {lowStockItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between gap-2 py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                        <p className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{item.product_name}</p>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <span className={`text-xs font-bold ${item.stock_status === 'out_of_stock' ? 'text-red-500' : 'text-amber-500'}`}>
                                                {item.quantity ?? 0}
                                            </span>
                                            <Badge className={`text-xs border-0 ${item.stock_status === 'out_of_stock' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                                                {item.stock_status === 'out_of_stock' ? 'Habis' : 'Rendah'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Attendance Today */}
                <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <CardHeader className="p-3 sm:p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                            <Users className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            Absensi Hari Ini
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        {loading ? (
                            <Skeleton className="h-[148px] w-full" />
                        ) : attendanceToday.total === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[120px] text-gray-400 dark:text-gray-500">
                                <UserCheck className="w-6 h-6 mb-2 opacity-40" />
                                <p className="text-xs">Belum ada data absensi</p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                {attendancePie.length > 0 ? (
                                    <ResponsiveContainer width="55%" height={120}>
                                        <PieChart>
                                            <Pie data={attendancePie} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3}>
                                                {attendancePie.map((d, i) => <Cell key={i} fill={d.color} />)}
                                            </Pie>
                                            <Tooltip formatter={(v, n) => [v, n]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : null}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE.emerald }} />
                                        <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">Hadir</span>
                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{attendanceToday.hadir}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE.amber }} />
                                        <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">Terlambat</span>
                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{attendanceToday.terlambat}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE.red }} />
                                        <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">Absen</span>
                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{attendanceToday.absen}</span>
                                    </div>
                                    <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
                                        <p className="text-xs text-gray-400">Total: <span className="font-bold text-gray-900 dark:text-white">{attendanceToday.total}</span></p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Row 4: Activity Feed ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Recent Transactions */}
                <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <CardHeader className="p-3 sm:p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                            <Activity className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                            Transaksi Terbaru Hari Ini
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        {loading ? (
                            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                        ) : posToday.transactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[120px] text-gray-400 dark:text-gray-500">
                                <ShoppingCart className="w-6 h-6 mb-2 opacity-40" />
                                <p className="text-xs">Belum ada transaksi hari ini</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                                {posToday.transactions.map((tx, i) => {
                                    const txTime = new Date(tx.created_date || tx.transaction_date || tx.created_at);
                                    const channel = tx.sales_channel || tx.channel || 'OFFLINE';
                                    const channelColors = {
                                        OFFLINE: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
                                        SHOPEE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
                                        TOKOPEDIA: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                                        TIKTOK: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
                                        WHATSAPP: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                                    };
                                    const chClass = channelColors[channel] || channelColors.OFFLINE;
                                    return (
                                        <div key={tx.id || i} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                                    <ShoppingCart className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                                        {tx.cashier_name || tx.cashier_email || 'Kasir'}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {!isNaN(txTime) ? format(txTime, 'HH:mm') : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <Badge className={`text-[10px] border-0 ${chClass}`}>{channel}</Badge>
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                    {formatRupiah(tx.total_amount || tx.grand_total || tx.final_amount || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Active Cashiers + Operational Health */}
                <div className="space-y-3">
                    {/* Active Cashiers */}
                    <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                        <CardHeader className="p-3 sm:p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                                <UserCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                Kasir Aktif Hari Ini
                                {activeCashiers.length > 0 && (
                                    <Badge className="ml-auto text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-0">
                                        {activeCashiers.length}
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 pt-0">
                            {loading ? (
                                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
                            ) : activeCashiers.length === 0 ? (
                                <div className="flex items-center gap-2 py-2 text-gray-400">
                                    <XCircle className="w-4 h-4" />
                                    <p className="text-xs">Tidak ada kasir aktif</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {activeCashiers.map((c, i) => (
                                        <div key={c.name} className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}>
                                                    {c.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{c.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-xs text-gray-400">{c.count}x</span>
                                                <span className="text-xs font-semibold text-gray-900 dark:text-white">{formatRupiah(c.revenue)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Operational Health Score */}
                    <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                        <CardHeader className="p-3 sm:p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                                <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                Skor Kesehatan Operasional
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 pt-0">
                            {loading ? (
                                <Skeleton className="h-16 w-full" />
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-2xl font-black ${healthColor}`}>{healthScore.score}</span>
                                        <Badge className={`${healthScore.score >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : healthScore.score >= 60 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'} border-0 text-xs`}>
                                            {healthLabel}
                                        </Badge>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                        <div className={`h-2 rounded-full transition-all duration-700 ${healthBg}`} style={{ width: `${healthScore.score}%` }} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                                        {healthScore.factors.map(f => (
                                            <div key={f.label} className="flex items-center gap-1">
                                                {f.ok
                                                    ? <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                                    : <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                                }
                                                <span className="text-xs text-gray-600 dark:text-gray-400">{f.label}</span>
                                                <span className={`text-xs font-semibold ml-auto ${f.ok ? 'text-emerald-600' : 'text-amber-600'}`}>{f.score}/{f.max}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
