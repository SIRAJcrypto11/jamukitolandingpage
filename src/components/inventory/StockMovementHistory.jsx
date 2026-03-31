import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  History, Search, Download, ArrowUpCircle, ArrowDownCircle, 
  ArrowRightCircle, RotateCcw, Loader2, Calendar, User, MapPin,
  Package, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah } from '@/components/utils/currencyFormatter';

export default function StockMovementHistory({ 
  companyId, 
  productId = null, 
  locationId = null,
  isOpen,
  onClose 
}) {
  const [movements, setMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (isOpen && companyId) {
      loadMovements();
    }
  }, [isOpen, companyId, productId, locationId]);

  const loadMovements = async () => {
    setIsLoading(true);
    try {
      const filter = { company_id: companyId };
      
      if (productId) {
        filter.product_id = productId;
      }
      
      if (locationId) {
        filter.location_id = locationId;
      }

      const data = await base44.entities.StockMovement.filter(filter, '-created_date', 500);
      setMovements(data || []);
    } catch (error) {
      console.error('Error loading movements:', error);
      setMovements([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getMovementIcon = (type) => {
    switch (type) {
      case 'in': return <ArrowDownCircle className="w-5 h-5 text-green-500" />;
      case 'out': return <ArrowUpCircle className="w-5 h-5 text-red-500" />;
      case 'transfer': return <ArrowRightCircle className="w-5 h-5 text-blue-500" />;
      case 'adjustment': return <RotateCcw className="w-5 h-5 text-purple-500" />;
      case 'return': return <ArrowDownCircle className="w-5 h-5 text-yellow-500" />;
      case 'damaged': return <X className="w-5 h-5 text-red-600" />;
      default: return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  const getMovementLabel = (type) => {
    const labels = {
      'in': 'Masuk',
      'out': 'Keluar',
      'transfer': 'Transfer',
      'adjustment': 'Penyesuaian',
      'return': 'Return',
      'damaged': 'Rusak'
    };
    return labels[type] || type;
  };

  const getMovementColor = (type) => {
    const colors = {
      'in': 'bg-green-600',
      'out': 'bg-red-600',
      'transfer': 'bg-blue-600',
      'adjustment': 'bg-purple-600',
      'return': 'bg-yellow-600',
      'damaged': 'bg-red-700'
    };
    return colors[type] || 'bg-gray-600';
  };

  const getReferenceLabel = (type) => {
    const labels = {
      'purchase': 'Pembelian',
      'sale': 'Penjualan',
      'transfer': 'Transfer',
      'adjustment': 'Penyesuaian',
      'return': 'Return',
      'manual': 'Manual'
    };
    return labels[type] || type;
  };

  const filteredMovements = movements.filter(m => {
    const matchesSearch = !searchQuery || 
      m.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.performed_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.reason?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'all' || m.movement_type === filterType;

    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(m.created_date) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(m.created_date) <= new Date(dateTo + 'T23:59:59');
    }

    return matchesSearch && matchesType && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
  const paginatedMovements = filteredMovements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToCSV = () => {
    const headers = ['Tanggal', 'Produk', 'Lokasi', 'Tipe', 'Qty', 'Stok Sebelum', 'Stok Sesudah', 'Referensi', 'Alasan', 'Dilakukan Oleh', 'Catatan'];
    const rows = filteredMovements.map(m => [
      format(new Date(m.created_date), 'dd/MM/yyyy HH:mm'),
      m.product_name,
      m.location_name,
      getMovementLabel(m.movement_type),
      m.quantity,
      m.stock_before,
      m.stock_after,
      getReferenceLabel(m.reference_type),
      m.reason || '-',
      m.performed_by_name || m.performed_by,
      m.notes || '-'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stock_movement_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <History className="w-5 h-5 text-blue-500" />
            Riwayat Pergerakan Stok
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-120px)] p-1">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari produk, lokasi, atau user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="all">Semua Tipe</option>
              <option value="in">Masuk</option>
              <option value="out">Keluar</option>
              <option value="transfer">Transfer</option>
              <option value="adjustment">Penyesuaian</option>
              <option value="return">Return</option>
              <option value="damaged">Rusak</option>
            </select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              placeholder="Dari"
            />

            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              placeholder="Sampai"
            />

            <Button
              variant="outline"
              onClick={exportToCSV}
              className="border-gray-300 dark:border-gray-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-green-600 dark:text-green-400">Total Masuk</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">
                  {filteredMovements.filter(m => m.movement_type === 'in').reduce((sum, m) => sum + (m.quantity || 0), 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-red-600 dark:text-red-400">Total Keluar</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-300">
                  {filteredMovements.filter(m => m.movement_type === 'out').reduce((sum, m) => sum + (m.quantity || 0), 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-blue-600 dark:text-blue-400">Total Transfer</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {filteredMovements.filter(m => m.movement_type === 'transfer').length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-purple-600 dark:text-purple-400">Penyesuaian</p>
                <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                  {filteredMovements.filter(m => m.movement_type === 'adjustment').length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Movement List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : paginatedMovements.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">Belum ada riwayat pergerakan stok</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedMovements.map((movement) => (
                <Card key={movement.id} className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        {getMovementIcon(movement.movement_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                              {movement.product_name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge className={getMovementColor(movement.movement_type)}>
                                {getMovementLabel(movement.movement_type)}
                              </Badge>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {getReferenceLabel(movement.reference_type)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-lg font-bold ${
                              movement.movement_type === 'in' || movement.movement_type === 'return' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {movement.movement_type === 'in' || movement.movement_type === 'return' ? '+' : '-'}
                              {movement.quantity}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {movement.stock_before} → {movement.stock_after}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{movement.location_name}</span>
                          </div>
                          {movement.movement_type === 'transfer' && movement.to_location_id && (
                            <div className="flex items-center gap-1">
                              <ArrowRightCircle className="w-3 h-3" />
                              <span className="truncate">→ Lokasi Tujuan</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span className="truncate">{movement.performed_by_name || movement.performed_by}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(movement.created_date), 'dd MMM yyyy HH:mm', { locale: id })}</span>
                          </div>
                        </div>

                        {(movement.reason || movement.notes) && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            {movement.reason && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                <strong>Alasan:</strong> {movement.reason}
                              </p>
                            )}
                            {movement.notes && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                <strong>Catatan:</strong> {movement.notes}
                              </p>
                            )}
                          </div>
                        )}

                        {movement.unit_cost > 0 && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Nilai: {formatRupiah(movement.total_value || 0)} ({formatRupiah(movement.unit_cost)}/unit)
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Menampilkan {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredMovements.length)} dari {filteredMovements.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}