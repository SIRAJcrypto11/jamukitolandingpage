import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import FinanceExportActions from './FinanceExportActions';

const SALES_CHANNELS = [
  { id: 'OFFLINE', name: 'Offline Store', icon: '🏪' },
  { id: 'SHOPEE', name: 'Shopee', icon: '🛒' },
  { id: 'TOKOPEDIA', name: 'Tokopedia', icon: '🟢' },
  { id: 'TIKTOK', name: 'TikTok Shop', icon: '🎵' },
  { id: 'GRAB', name: 'GrabFood/GrabMart', icon: '🚗' },
  { id: 'GOJEK', name: 'GoFood/GoShop', icon: '🛵' },
  { id: 'WHATSAPP', name: 'WhatsApp Order', icon: '📱' },
  { id: 'WEBSITE', name: 'Website', icon: '🌐' },
  { id: 'ONLINE_DALAM_KOTA', name: 'Online Dalam Kota', icon: '🏙️' },
  { id: 'ONLINE_LUAR_KOTA', name: 'Online Luar Kota', icon: '🏘️' },
  { id: 'ONLINE_LUAR_PROVINSI', name: 'Online Luar Provinsi', icon: '🗾' },
  { id: 'OTHER', name: 'Lainnya', icon: '🔹' }
];

export default function FinanceHistory({ records, onEdit, onDelete, canEdit = true, canDelete = true }) {
    const [selectedYear, setSelectedYear] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedChannel, setSelectedChannel] = useState('all'); // ✅ NEW: Sales Channel filter
    const [searchQuery, setSearchQuery] = useState('');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [dateFilterMode, setDateFilterMode] = useState('year');
    // ✅ NEW: Bulk recategorization
    const [selectedRecords, setSelectedRecords] = useState(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [bulkNewCategory, setBulkNewCategory] = useState('');
    const [bulkNewChannel, setBulkNewChannel] = useState('');
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    const availableYears = useMemo(() => {
        const years = new Set();
        records.forEach(record => {
            try {
                const year = new Date(record.date).getFullYear();
                if (!isNaN(year)) {
                    years.add(year.toString());
                }
            } catch (e) {}
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [records]);

    const formatSafeDate = (dateString, formatStr = 'd MMMM yyyy') => {
        try {
            if (!dateString) return '-';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return format(date, formatStr, { locale: id });
        } catch (error) {
            return '-';
        }
    };

    const categories = useMemo(() => {
        return [...new Set(records.map(r => r.category).filter(Boolean))];
    }, [records]);

    const filteredRecords = useMemo(() => {
        const filtered = records.filter(record => {
            try {
                const recordDate = new Date(record.date);
                const recordYear = recordDate.getFullYear().toString();
                
                let matchesDate = true;
                if (dateFilterMode === 'year') {
                    matchesDate = selectedYear === 'all' || recordYear === selectedYear;
                } else if (dateFilterMode === 'custom' && customDateRange.start && customDateRange.end) {
                    const startDate = new Date(customDateRange.start);
                    startDate.setHours(0, 0, 0, 0);
                    const endDate = new Date(customDateRange.end);
                    endDate.setHours(23, 59, 59, 999);
                    matchesDate = recordDate >= startDate && recordDate <= endDate;
                }
                
                const matchesCategory = selectedCategory === 'all' || record.category === selectedCategory;
                const matchesType = selectedType === 'all' || record.type === selectedType;
                const matchesChannel = selectedChannel === 'all' || (record.sales_channel || 'OFFLINE') === selectedChannel;
                const matchesSearch = !searchQuery || 
                    record.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    record.category?.toLowerCase().includes(searchQuery.toLowerCase());

                return matchesDate && matchesCategory && matchesType && matchesChannel && matchesSearch;
            } catch (e) {
                return false;
            }
        });

        return filtered.sort((a, b) => {
            try {
                const dateA = new Date(a.date || a.created_date);
                const dateB = new Date(b.date || b.created_date);
                return dateB - dateA;
            } catch (e) {
                return 0;
            }
        });
    }, [records, selectedYear, selectedCategory, selectedType, selectedChannel, searchQuery, dateFilterMode, customDateRange]);

    // ✅ Bulk recategorize handler
    const handleBulkRecategorize = async () => {
        if (selectedRecords.size === 0) return;
        if (!bulkNewCategory && !bulkNewChannel) {
            return;
        }
        setIsBulkUpdating(true);
        try {
            const { base44 } = await import('@/api/base44Client');
            const { toast } = await import('sonner');
            for (const id of selectedRecords) {
                const updateData = {};
                if (bulkNewCategory) updateData.category = bulkNewCategory;
                if (bulkNewChannel) updateData.sales_channel = bulkNewChannel;
                await base44.entities.FinancialRecord.update(id, updateData);
            }
            toast.success(`✅ ${selectedRecords.size} transaksi berhasil diperbarui`);
            setSelectedRecords(new Set());
            setBulkNewCategory('');
            setBulkNewChannel('');
            setShowBulkActions(false);
        } catch (e) {
            const { toast } = await import('sonner');
            toast.error('Gagal memperbarui: ' + e.message);
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const toggleSelect = (id) => {
        const next = new Set(selectedRecords);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedRecords(next);
    };

    const selectAll = () => {
        if (selectedRecords.size === filteredRecords.length) {
            setSelectedRecords(new Set());
        } else {
            setSelectedRecords(new Set(filteredRecords.map(r => r.id)));
        }
    };

    const stats = useMemo(() => {
        const income = filteredRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + (r.amount || 0), 0);
        const expense = filteredRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + (r.amount || 0), 0);
        return {
            totalIncome: income,
            totalExpense: expense,
            netAmount: income - expense,
            transactionCount: filteredRecords.length
        };
    }, [filteredRecords]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gray-900 border-gray-700">
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600">
                            Rp {stats.totalIncome.toLocaleString('id-ID')}
                        </div>
                        <p className="text-sm text-gray-400">Total Pemasukan</p>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-700">
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-red-600">
                            Rp {stats.totalExpense.toLocaleString('id-ID')}
                        </div>
                        <p className="text-sm text-gray-400">Total Pengeluaran</p>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-700">
                    <CardContent className="p-4">
                        <div className={`text-2xl font-bold ${stats.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Rp {stats.netAmount.toLocaleString('id-ID')}
                        </div>
                        <p className="text-sm text-gray-400">Selisih Bersih</p>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-700">
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-blue-600">
                            {stats.transactionCount}
                        </div>
                        <p className="text-sm text-gray-400">Total Transaksi</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                        <Filter className="text-blue-500" />
                        Filter Riwayat
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block text-gray-300">Filter Tanggal</label>
                            <Select value={dateFilterMode} onValueChange={(v) => {
                                setDateFilterMode(v);
                                if (v === 'year') {
                                    setCustomDateRange({ start: '', end: '' });
                                }
                            }}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    <SelectItem value="year">Per Tahun</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {dateFilterMode === 'year' ? (
                            <div>
                                <label className="text-sm font-medium mb-2 block text-gray-300">Tahun</label>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                        <SelectValue placeholder="Pilih tahun" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700">
                                        <SelectItem value="all">Semua Tahun</SelectItem>
                                        {availableYears.map(year => (
                                            <SelectItem key={year} value={year}>{year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="text-sm font-medium mb-2 block text-gray-300">Dari Tanggal</label>
                                    <Input
                                        type="date"
                                        value={customDateRange.start}
                                        onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block text-gray-300">Sampai Tanggal</label>
                                    <Input
                                        type="date"
                                        value={customDateRange.end}
                                        onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                            </>
                        )}
                        
                        <div className={dateFilterMode === 'custom' ? 'md:col-start-1' : ''}>
                            <label className="text-sm font-medium mb-2 block text-gray-300">Kategori</label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue placeholder="Pilih kategori" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    <SelectItem value="all">Semua Kategori</SelectItem>
                                    {categories.map(category => (
                                        <SelectItem key={category} value={category}>{category}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className={dateFilterMode === 'custom' ? 'md:col-start-1' : ''}>
                            <label className="text-sm font-medium mb-2 block text-gray-300">Jenis</label>
                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue placeholder="Pilih jenis" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    <SelectItem value="all">Semua Jenis</SelectItem>
                                    <SelectItem value="income">Pemasukan</SelectItem>
                                    <SelectItem value="expense">Pengeluaran</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* ✅ NEW: Sales Channel Filter */}
                        <div>
                            <label className="text-sm font-medium mb-2 block text-gray-300">Channel Penjualan</label>
                            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue placeholder="Semua Channel" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    <SelectItem value="all">Semua Channel</SelectItem>
                                    {SALES_CHANNELS.map(ch => (
                                        <SelectItem key={ch.id} value={ch.id} className="text-white">
                                            {ch.icon} {ch.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block text-gray-300">Cari</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Cari transaksi..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ✅ Bulk Actions Bar */}
            {selectedRecords.size > 0 && (
                <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-3 flex flex-wrap items-center gap-3">
                    <span className="text-blue-300 text-sm font-semibold">{selectedRecords.size} dipilih</span>
                    <div className="flex flex-wrap gap-2 flex-1 items-center">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Ganti Kategori</label>
                            <Select value={bulkNewCategory} onValueChange={setBulkNewCategory}>
                                <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-xs h-8 w-44">
                                    <SelectValue placeholder="Pilih kategori" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    {[...new Set(records.map(r => r.category).filter(Boolean))].map(cat => (
                                        <SelectItem key={cat} value={cat} className="text-white text-xs">{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Ganti Channel</label>
                            <Select value={bulkNewChannel} onValueChange={setBulkNewChannel}>
                                <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-xs h-8 w-44">
                                    <SelectValue placeholder="Pilih channel" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    {SALES_CHANNELS.map(ch => (
                                        <SelectItem key={ch.id} value={ch.id} className="text-white text-xs">{ch.icon} {ch.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleBulkRecategorize}
                            disabled={isBulkUpdating || (!bulkNewCategory && !bulkNewChannel)}
                            className="bg-blue-600 hover:bg-blue-700 text-xs h-8 mt-auto">
                            {isBulkUpdating ? '...' : '✅ Terapkan'}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelectedRecords(new Set()); setBulkNewCategory(''); setBulkNewChannel(''); }}
                            className="text-gray-400 text-xs h-8 mt-auto">
                            ✕ Batal
                        </Button>
                    </div>
                </div>
            )}

            <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between flex-wrap gap-2 text-white">
                        <span className="flex items-center gap-2">
                            <Calendar className="text-green-500" />
                            Riwayat Transaksi
                        </span>
                        <div className="flex items-center gap-4">
                            <Button size="sm" variant="outline" onClick={() => setShowBulkActions(!showBulkActions)}
                                className="border-gray-600 text-gray-300 text-xs h-7">
                                ☑️ Pilih
                            </Button>
                            <Badge variant="outline" className="border-gray-600 text-gray-300">
                                {filteredRecords.length} transaksi
                            </Badge>
                            <FinanceExportActions records={filteredRecords} />
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredRecords.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-gray-700 bg-gray-800">
                                        {showBulkActions && <th className="p-3 w-8">
                                            <input type="checkbox"
                                                checked={selectedRecords.size === filteredRecords.length && filteredRecords.length > 0}
                                                onChange={selectAll}
                                                className="w-4 h-4" />
                                        </th>}
                                        <th className="text-left p-3 text-sm font-semibold text-gray-400">Tanggal</th>
                                        <th className="text-left p-3 text-sm font-semibold text-gray-400">Deskripsi</th>
                                        <th className="text-left p-3 text-sm font-semibold text-gray-400">Kategori</th>
                                        <th className="text-left p-3 text-sm font-semibold text-gray-400">Channel</th>
                                        <th className="text-left p-3 text-sm font-semibold text-gray-400">Tipe</th>
                                        <th className="text-right p-3 text-sm font-semibold text-gray-400">Jumlah</th>
                                        {(canEdit || canDelete) && (
                                            <th className="text-right p-3 text-sm font-semibold text-gray-400">Aksi</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecords.map((record) => {
                                        const ch = SALES_CHANNELS.find(c => c.id === record.sales_channel);
                                        return (
                                        <tr key={record.id} className={`border-b border-gray-800 hover:bg-gray-800 ${selectedRecords.has(record.id) ? 'bg-blue-900/20' : ''}`}>
                                            {showBulkActions && <td className="p-3">
                                                <input type="checkbox"
                                                    checked={selectedRecords.has(record.id)}
                                                    onChange={() => toggleSelect(record.id)}
                                                    className="w-4 h-4" />
                                            </td>}
                                            <td className="p-3 text-sm text-gray-300">
                                                {formatSafeDate(record.date, 'dd MMM yyyy')}
                                            </td>
                                            <td className="p-3 text-sm text-gray-300 max-w-[180px] truncate">
                                                {record.description || '-'}
                                            </td>
                                            <td className="p-3">
                                                <Badge className={record.type === 'income' ? 'bg-green-100 text-green-800 text-xs' : 'bg-red-100 text-red-800 text-xs'}>
                                                    {record.category || '-'}
                                                </Badge>
                                            </td>
                                            <td className="p-3">
                                                {ch ? (
                                                    <span className="text-xs text-gray-400">{ch.icon} {ch.name}</span>
                                                ) : (
                                                    <span className="text-xs text-gray-600">-</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                                                    {record.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-right">
                                                <span className={`font-semibold ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {record.type === 'income' ? '+' : '-'}Rp {(record.amount || 0).toLocaleString('id-ID')}
                                                </span>
                                            </td>
                                            {(canEdit || canDelete) && (
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {canEdit && onEdit && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onEdit(record)}
                                                                className="text-gray-400 hover:text-white hover:bg-gray-700 h-8 w-8 p-0">
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        {canDelete && onDelete && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onDelete(record.id)}
                                                                className="text-red-500 hover:text-red-400 hover:bg-gray-700 h-8 w-8 p-0">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2 text-white">Tidak Ada Data</h3>
                            <p className="text-gray-400">
                                Tidak ditemukan transaksi dengan kriteria yang dipilih.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}