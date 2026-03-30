import React, { useState, useEffect } from 'react';

export default function POSTransferDropdown({ item, locations, selectedLocation, getProductStock, getStockAtLocation, updateCartItemTransferLocation }) {
  const [availableLocs, setAvailableLocs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentStock = getProductStock(item.product_id);
  const needsTransfer = currentStock < item.quantity;

  useEffect(() => {
    const fetchStocks = async () => {
      if (!needsTransfer) { setIsLoading(false); return; }
      setIsLoading(true);
      try {
        const locationChecks = await Promise.all(
          locations
            .filter(loc => loc.id !== selectedLocation?.id)
            .map(async (loc) => {
              const stock = await getStockAtLocation(item.product_id, loc.id);
              return { ...loc, stock };
            })
        );
        setAvailableLocs(locationChecks.filter(loc => loc.stock > 0));
      } catch (e) { console.error('Error fetching stocks:', e); }
      setIsLoading(false);
    };
    fetchStocks();
  }, [item.product_id, needsTransfer, locations, selectedLocation]);

  if (!needsTransfer) return null;

  if (isLoading) {
    return (
      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded">
        <p className="text-xs text-blue-800 dark:text-blue-200">🔍 Mengecek stok di lokasi lain...</p>
      </div>
    );
  }

  if (availableLocs.length === 0) {
    return (
      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded">
        <p className="text-xs text-red-800 dark:text-red-200 font-medium">❌ Stok habis di semua lokasi!</p>
      </div>
    );
  }

  return (
    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded">
      <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-1 font-medium">
        ⚠️ Stok habis di {selectedLocation?.location_name}
      </p>
      <select
        value={item.selected_transfer_location || availableLocs[0]?.id || ''}
        onChange={(e) => updateCartItemTransferLocation(item.product_id, e.target.value)}
        className="w-full text-xs p-1.5 border border-yellow-300 dark:border-yellow-700 bg-white dark:bg-gray-800 rounded focus:ring-2 focus:ring-yellow-500">
        <option value="">-- Pilih Lokasi Transfer --</option>
        {availableLocs.map(loc => (
          <option key={loc.id} value={loc.id}>
            📍 {loc.location_name} ({loc.stock} tersedia)
          </option>
        ))}
      </select>
      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
        🔄 Transfer {Math.min(item.quantity - currentStock, availableLocs.find(l => l.id === (item.selected_transfer_location || availableLocs[0]?.id))?.stock || 0)} unit
      </p>
    </div>
  );
}