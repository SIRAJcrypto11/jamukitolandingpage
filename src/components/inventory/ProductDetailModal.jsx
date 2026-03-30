
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MapPin, Store, Globe, ShoppingCart, Package, Edit, TrendingUp } from 'lucide-react';
import StockAllocationForm from './StockAllocationForm';

export default function ProductDetailModal({ product, inventory, companyId, onClose, onUpdate }) {
  const [inventoryList, setInventoryList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllocationForm, setShowAllocationForm] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);

  useEffect(() => {
    if (product && companyId) {
      loadInventoryDetails();
    }
  }, [product, companyId]);

  const loadInventoryDetails = async () => {
    if (!product || !companyId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const productId = product.id || inventory?.product_id;
      
      // ✅ CRITICAL FIX: Filter dengan company_id untuk cegah data leak!
      const inventoryData = await base44.entities.Inventory.filter({
        company_id: companyId,  // ✅ WAJIB!
        product_id: productId
      });
      setInventoryList(inventoryData || []);
    } catch (error) {
      console.error('Error loading inventory details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!product) {
    return null;
  }

  const totalStats = inventoryList.reduce((acc, inv) => {
    const channels = inv.channel_allocations || {};
    const geo = inv.geographic_zones || {};
    
    acc.offline += channels.offline || 0;
    acc.online += channels.online || 0;
    acc.marketplace += channels.marketplace || 0;
    acc.sameCity += geo.same_city || 0;
    acc.otherCities += geo.other_cities || 0;
    
    return acc;
  }, { offline: 0, online: 0, marketplace: 0, sameCity: 0, otherCities: 0 });

  const totalQuantity = inventoryList.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
  const totalReserved = inventoryList.reduce((sum, inv) => sum + (inv.reserved_quantity || 0), 0);
  const totalAvailable = inventoryList.reduce((sum, inv) => sum + (inv.available_quantity || 0), 0);
  const totalValue = inventoryList.reduce((sum, inv) => sum + (inv.total_value || 0), 0);
  const locationCount = inventoryList.length;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
        <Card className="bg-gray-900 border-gray-700 max-w-5xl w-full max-h-[95vh] overflow-y-auto my-4 mx-3 sm:mx-4">
          <CardHeader className="border-b border-gray-800 p-4 sm:p-6 sticky top-0 bg-gray-900 z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-white text-base sm:text-xl truncate">{product.name}</CardTitle>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">SKU: {product.sku}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Product Image - Mobile Optimized */}
            {product.image_url && (
              <div className="flex justify-center">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full sm:w-64 h-48 sm:h-64 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Overall Stats - Mobile Grid 2 Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
              <div className="p-3 sm:p-4 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1 truncate">Total Stock</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{totalQuantity}</p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1 truncate">Reserved</p>
                <p className="text-lg sm:text-xl font-bold text-yellow-400">{totalReserved}</p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1 truncate">Available</p>
                <p className="text-lg sm:text-xl font-bold text-green-400">{totalAvailable}</p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1 truncate">Locations</p>
                <p className="text-lg sm:text-xl font-bold text-purple-400">{locationCount}</p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-800/50 rounded-lg col-span-2 sm:col-span-1">
                <p className="text-xs text-gray-400 mb-1 truncate">Total Value</p>
                <p className="text-base sm:text-lg font-bold text-green-400 truncate">
                  Rp {(totalValue / 1000).toFixed(0)}K
                </p>
              </div>
            </div>

            {/* Channel Distribution - Mobile Optimized */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                Channel Distribution
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-indigo-900/20 border border-indigo-600/30 rounded-lg">
                  <div className="flex items-center justify-between sm:flex-col sm:items-start gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Store className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-400" />
                      <span className="text-xs sm:text-sm text-gray-300">Offline Store</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-white">{totalStats.offline}</p>
                  </div>
                </div>
                <div className="p-3 sm:p-4 bg-cyan-900/20 border border-cyan-600/30 rounded-lg">
                  <div className="flex items-center justify-between sm:flex-col sm:items-start gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
                      <span className="text-xs sm:text-sm text-gray-300">Online Store</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-white">{totalStats.online}</p>
                  </div>
                </div>
                <div className="p-3 sm:p-4 bg-orange-900/20 border border-orange-600/30 rounded-lg">
                  <div className="flex items-center justify-between sm:flex-col sm:items-start gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
                      <span className="text-xs sm:text-sm text-gray-300">Marketplace</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-white">{totalStats.marketplace}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Geographic Distribution - Mobile Optimized */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                Geographic Distribution
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-green-900/20 border border-green-600/30 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs sm:text-sm text-gray-300">📍 Dalam Kota</span>
                      <p className="text-xs text-gray-500 mt-1">Same-day delivery</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-white flex-shrink-0">{totalStats.sameCity}</p>
                  </div>
                </div>
                <div className="p-3 sm:p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs sm:text-sm text-gray-300">🚚 Luar Kota</span>
                      <p className="text-xs text-gray-500 mt-1">1-3 days shipping</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-white flex-shrink-0">{totalStats.otherCities}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-Location Details - Mobile Optimized */}
            <div>
              <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">Stock by Location</h3>
              {inventoryList.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-400">
                  <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs sm:text-sm">Belum ada inventory untuk produk ini</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {inventoryList.map((inv) => (
                    <div key={inv.id} className="p-3 sm:p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      {/* Mobile Layout - Stacked */}
                      <div className="block sm:hidden space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{inv.location_name || 'Unknown Location'}</p>
                            <Badge className={
                              inv.stock_status === 'in_stock' ? 'bg-green-600' :
                              inv.stock_status === 'low_stock' ? 'bg-yellow-600' :
                              'bg-red-600'
                            }>
                              {inv.stock_status || 'unknown'}
                            </Badge>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xl font-bold text-white">{inv.quantity || 0}</p>
                            <p className="text-xs text-gray-400">Avail: {inv.available_quantity || 0}</p>
                          </div>
                        </div>

                        {inv.channel_allocations && (
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-2 bg-indigo-900/20 rounded">
                              <p className="text-gray-400">🏪 Offline</p>
                              <p className="text-white font-semibold">{inv.channel_allocations.offline || 0}</p>
                            </div>
                            <div className="text-center p-2 bg-cyan-900/20 rounded">
                              <p className="text-gray-400">💻 Online</p>
                              <p className="text-white font-semibold">{inv.channel_allocations.online || 0}</p>
                            </div>
                            <div className="text-center p-2 bg-orange-900/20 rounded">
                              <p className="text-gray-400">🛒 Market</p>
                              <p className="text-white font-semibold">{inv.channel_allocations.marketplace || 0}</p>
                            </div>
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInventory(inv);
                            setShowAllocationForm(true);
                          }}
                          className="border-gray-700 w-full text-xs"
                        >
                          <Edit className="w-3 h-3 mr-2" />
                          Edit Allocation
                        </Button>
                      </div>

                      {/* Desktop Layout - Horizontal */}
                      <div className="hidden sm:block">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-white font-medium">{inv.location_name || 'Unknown Location'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={
                                inv.stock_status === 'in_stock' ? 'bg-green-600' :
                                inv.stock_status === 'low_stock' ? 'bg-yellow-600' :
                                'bg-red-600'
                              }>
                                {inv.stock_status || 'unknown'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-white">{inv.quantity || 0}</p>
                            <p className="text-xs text-gray-400">Available: {inv.available_quantity || 0}</p>
                          </div>
                        </div>

                        {inv.channel_allocations && (
                          <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                            <div className="text-center p-2 bg-indigo-900/20 rounded">
                              <p className="text-gray-400">🏪 Offline</p>
                              <p className="text-white font-semibold">{inv.channel_allocations.offline || 0}</p>
                            </div>
                            <div className="text-center p-2 bg-cyan-900/20 rounded">
                              <p className="text-gray-400">💻 Online</p>
                              <p className="text-white font-semibold">{inv.channel_allocations.online || 0}</p>
                            </div>
                            <div className="text-center p-2 bg-orange-900/20 rounded">
                              <p className="text-gray-400">🛒 Market</p>
                              <p className="text-white font-semibold">{inv.channel_allocations.marketplace || 0}</p>
                            </div>
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInventory(inv);
                            setShowAllocationForm(true);
                          }}
                          className="border-gray-700 w-full"
                        >
                          <Edit className="w-3 h-3 mr-2" />
                          Edit Allocation
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {showAllocationForm && selectedInventory && (
        <StockAllocationForm
          productId={product.id || inventory?.product_id}
          productName={product.name}
          locationId={selectedInventory.location_id}
          locationName={selectedInventory.location_name}
          currentStock={selectedInventory.quantity || 0}
          companyId={companyId}
          onSuccess={() => {
            setShowAllocationForm(false);
            loadInventoryDetails();
            if (onUpdate) onUpdate();
          }}
          onClose={() => setShowAllocationForm(false)}
        />
      )}
    </>
  );
}
