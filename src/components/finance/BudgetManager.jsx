import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Plus, Edit, Trash2, AlertTriangle, TrendingUp, Wallet,
    ArrowUpRight, ArrowDownLeft, Target, Briefcase, CheckCircle, Clock
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { id } from 'date-fns/locale';
import { withRetry } from '@/components/utils/apiHelpers';
import { formatCurrency } from '@/components/utils/currencyFormatter';

export default function BudgetManager({ budgets, records, allRecords = [], categories, user, mode, companyId = null, onUpdate }) {
    const [editingBudget, setEditingBudget] = useState(null);
    const [showDialog, setShowDialog] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [viewDetail, setViewDetail] = useState(null); // 'receivable', 'debt', 'investment'

    // ✅ FINANCIAL POSITION METRICS (Using allRecords for historical data)
    const { receivables, debts, investments, totalReceivable, totalDebt, totalInvestment } = useMemo(() => {
        // Unpaid Receivables (Piutang)
        const receivableList = allRecords
            .filter(r => r.type === 'receivable' && r.status === 'unpaid')
            .sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest first

        // Unpaid Debts (Hutang)
        const debtList = allRecords
            .filter(r => r.type === 'debt' && r.status === 'unpaid')
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Total Investments
        const investmentList = allRecords
            .filter(r => r.type === 'investment')
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first

        return {
            receivables: receivableList,
            debts: debtList,
            investments: investmentList,
            totalReceivable: receivableList.reduce((sum, r) => sum + (r.amount || 0), 0),
            totalDebt: debtList.reduce((sum, r) => sum + (r.amount || 0), 0),
            totalInvestment: investmentList.reduce((sum, r) => sum + (r.amount || 0), 0)
        };
    }, [allRecords]);


    // ✅ BUDGET LOGIC (Using filtered 'records' prop)
    const expenseCategories = useMemo(() => {
        return (categories || []).filter(c => c.type === 'expense');
    }, [categories]);

    const calculateSpending = (budget) => {
        const now = new Date();
        let startDate, endDate;

        if (budget.period === 'monthly') {
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
        } else {
            startDate = startOfYear(now);
            endDate = endOfYear(now);
        }

        const spending = records
            .filter(r => {
                if (r.type !== 'expense') return false;
                const categoryMatch = r.category === budget.category ||
                    r.category?.toLowerCase() === budget.category?.toLowerCase();
                if (!categoryMatch) return false;
                const rDate = new Date(r.date);
                return rDate >= startDate && rDate <= endDate;
            })
            .reduce((sum, r) => sum + (r.amount || 0), 0);

        return spending;
    };

    const budgetAnalysis = useMemo(() => {
        return budgets.map(budget => {
            const spent = calculateSpending(budget);
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            const remaining = budget.amount - spent;
            const isOverBudget = spent > budget.amount;
            const isNearLimit = percentage >= budget.alert_threshold;

            return {
                ...budget,
                spent,
                percentage: Math.min(percentage, 100),
                remaining,
                isOverBudget,
                isNearLimit
            };
        });
    }, [budgets, records]);

    // ✅ HANDLERS
    const handleSaveBudget = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const dataToSave = { ...editingBudget, user_id: user.id, mode: mode, company_id: companyId };
            if (editingBudget.id) {
                await withRetry(() => base44.entities.Budget.update(editingBudget.id, dataToSave));
            } else {
                await withRetry(() => base44.entities.Budget.create(dataToSave));
            }
            toast.success('Anggaran berhasil disimpan');
            setShowDialog(false);
            setEditingBudget(null);
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Gagal menyimpan anggaran');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteBudget = async (budgetId) => {
        if (!confirm('Hapus anggaran ini?')) return;
        try {
            await withRetry(() => base44.entities.Budget.delete(budgetId));
            toast.success('Anggaran dihapus');
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Gagal menghapus');
        }
    };

    const handleMarkAsPaid = async (record) => {
        if (!confirm(`Tandai ${record.type === 'debt' ? 'hutang' : 'piutang'} senilai ${formatCurrency(record.amount)} sebagai LUNAS?`)) return;

        setProcessingId(record.id);
        try {
            await withRetry(() => base44.entities.FinancialRecord.update(record.id, {
                status: 'paid',
                updated_at: new Date().toISOString()
            }));
            toast.success('Status berhasil diperbarui! 🎉');
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Gagal memperbarui status');
            console.error(error);
        } finally {
            setProcessingId(null);
        }
    };

    // ✅ SUB-COMPONENTS
    const TransactionList = ({ items, type }) => (
        <div className="space-y-2 mt-2">
            {items.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-2">Tidak ada data {type === 'receivable' ? 'piutang' : type === 'debt' ? 'hutang' : 'investasi'} aktif.</p>
            ) : (
                items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${type === 'receivable' ? 'bg-green-900/30 text-green-400' : type === 'debt' ? 'bg-red-900/30 text-red-400' : 'bg-purple-900/30 text-purple-400'}`}>
                                {type === 'receivable' ? <ArrowUpRight className="w-4 h-4" /> :
                                    type === 'debt' ? <ArrowDownLeft className="w-4 h-4" /> :
                                        <TrendingUp className="w-4 h-4" />}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">{item.contact_name || 'Tanpa Nama'}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    <span>{format(new Date(item.date), 'dd MMM yyyy', { locale: id })}</span>
                                    <span>•</span>
                                    <span>{item.description}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-sm font-bold text-white">{formatCurrency(item.amount)}</span>
                            {type !== 'investment' && (
                                <Button
                                    size="xs"
                                    variant="outline"
                                    disabled={processingId === item.id}
                                    onClick={() => handleMarkAsPaid(item)}
                                    className="h-6 text-[10px] bg-gray-800 border-gray-700 hover:bg-green-900/50 hover:text-green-400 hover:border-green-700"
                                >
                                    {processingId === item.id ? '...' : 'Tandai Lunas'}
                                </Button>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="space-y-6">

            {/* === SECTION 1: FINANCIAL POSITION DASHBOARD === */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-400" />
                    Posisi Keuangan & Aset
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* CARD 1: PIUTANG (Receivables) */}
                    <Card className="bg-gray-900 border-gray-800 hover:border-green-800 transition-all cursor-pointer" onClick={() => setViewDetail(viewDetail === 'receivable' ? null : 'receivable')}>
                        <CardHeader className="pb-2">
                            <p className="text-xs font-medium text-gray-400 mb-1">Total Piutang (Belum Lunas)</p>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl text-green-500">{formatCurrency(totalReceivable)}</CardTitle>
                                <ArrowUpRight className="w-5 h-5 text-green-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>{receivables.length} Customer</span>
                                <span className="text-blue-400 hover:underline">Lihat Detail {viewDetail === 'receivable' ? '▲' : '▼'}</span>
                            </div>
                            {viewDetail === 'receivable' && <TransactionList items={receivables} type="receivable" />}
                        </CardContent>
                    </Card>

                    {/* CARD 2: HUTANG (Debt) */}
                    <Card className="bg-gray-900 border-gray-800 hover:border-red-800 transition-all cursor-pointer" onClick={() => setViewDetail(viewDetail === 'debt' ? null : 'debt')}>
                        <CardHeader className="pb-2">
                            <p className="text-xs font-medium text-gray-400 mb-1">Total Hutang (Belum Lunas)</p>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl text-red-500">{formatCurrency(totalDebt)}</CardTitle>
                                <ArrowDownLeft className="w-5 h-5 text-red-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>{debts.length} Invoice</span>
                                <span className="text-blue-400 hover:underline">Lihat Detail {viewDetail === 'debt' ? '▲' : '▼'}</span>
                            </div>
                            {viewDetail === 'debt' && <TransactionList items={debts} type="debt" />}
                        </CardContent>
                    </Card>

                    {/* CARD 3: INVESTASI (Investment) */}
                    <Card className="bg-gray-900 border-gray-800 hover:border-purple-800 transition-all cursor-pointer" onClick={() => setViewDetail(viewDetail === 'investment' ? null : 'investment')}>
                        <CardHeader className="pb-2">
                            <p className="text-xs font-medium text-gray-400 mb-1">Total Investasi</p>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl text-purple-500">{formatCurrency(totalInvestment)}</CardTitle>
                                <TrendingUp className="w-5 h-5 text-purple-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>{investments.length} Portofolio</span>
                                <span className="text-blue-400 hover:underline">Lihat Detail {viewDetail === 'investment' ? '▲' : '▼'}</span>
                            </div>
                            {viewDetail === 'investment' && <TransactionList items={investments} type="investment" />}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="border-t border-gray-800 my-6"></div>

            {/* === SECTION 2: BUDGET MANAGEMENT (Existing) === */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-yellow-400" />
                        Target Anggaran (Budgeting)
                    </h2>
                    <Button
                        size="sm"
                        onClick={() => {
                            setEditingBudget({
                                name: '', category: '', amount: 0, period: 'monthly', alert_threshold: 80
                            });
                            setShowDialog(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-xs"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Buat Anggaran
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {budgetAnalysis.map(budget => (
                        <Card key={budget.id} className={`bg-gray-900 border-gray-700 ${budget.isOverBudget ? 'border-red-900/50 bg-red-900/10' : budget.isNearLimit ? 'border-yellow-900/50 bg-yellow-900/10' : ''}`}>
                            <CardHeader className="pb-2 p-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-sm font-bold text-white">{budget.name}</CardTitle>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Badge variant="outline" className="text-[10px] h-5 px-1 bg-gray-800 border-gray-600 text-gray-300">
                                                {budget.category}
                                            </Badge>
                                            <span className="text-[10px] text-gray-500">{budget.period === 'monthly' ? 'Bulanan' : 'Tahunan'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={() => { setEditingBudget(budget); setShowDialog(true); }}>
                                            <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-400" onClick={() => handleDeleteBudget(budget.id)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-gray-300">
                                        <span>Terpakai</span>
                                        <span className="font-semibold">{formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}</span>
                                    </div>
                                    <Progress value={budget.percentage} className={`h-1.5 bg-gray-700 ${budget.isOverBudget ? '[&>div]:bg-red-500' : budget.isNearLimit ? '[&>div]:bg-yellow-500' : '[&>div]:bg-blue-500'}`} />
                                    <div className="flex justify-between items-center pt-1">
                                        <span className="text-[10px] text-gray-500">{budget.percentage.toFixed(0)}% digunakan</span>
                                        <span className={`text-xs font-semibold ${budget.remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                            {budget.remaining < 0 ? 'Over' : 'Sisa'} {formatCurrency(Math.abs(budget.remaining))}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {budgetAnalysis.length === 0 && (
                        <div className="col-span-full text-center py-8 bg-gray-900 border border-gray-800 rounded-lg border-dashed">
                            <Wallet className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                            <p className="text-gray-500 text-sm">Belum ada anggaran yang dibuat.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* === DIALOG EDITOR === */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingBudget?.id ? 'Edit Anggaran' : 'Buat Anggaran Baru'}</DialogTitle>
                        <CardDescription className="text-gray-400">Atur batas pengeluaran untuk kategori tertentu.</CardDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveBudget} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="budgetName" className="text-xs">Nama Anggaran</Label>
                            <Input id="budgetName" className="bg-gray-800 border-gray-700" value={editingBudget?.name || ''} onChange={(e) => setEditingBudget({ ...editingBudget, name: e.target.value })} placeholder="Contoh: Operasional Harian" required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="budgetCategory" className="text-xs">Kategori Pengeluaran</Label>
                            <Select value={editingBudget?.category || ''} onValueChange={(value) => setEditingBudget({ ...editingBudget, category: value })}>
                                <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                    {expenseCategories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="amount" className="text-xs">Nominal (Rp)</Label>
                                <Input id="amount" type="number" className="bg-gray-800 border-gray-700" value={editingBudget?.amount || ''} onChange={(e) => setEditingBudget({ ...editingBudget, amount: Number(e.target.value) })} required />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="period" className="text-xs">Periode</Label>
                                <Select value={editingBudget?.period || 'monthly'} onValueChange={(value) => setEditingBudget({ ...editingBudget, period: value })}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                        <SelectItem value="monthly">Bulanan</SelectItem>
                                        <SelectItem value="yearly">Tahunan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowDialog(false)} className="text-gray-400">Batal</Button>
                            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">Simpan</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}