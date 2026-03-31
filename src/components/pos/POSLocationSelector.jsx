import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function POSLocationSelector({ open, onClose, locations, selectedLocation, onSelect }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white max-w-md mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Pilih Lokasi Kasir</DialogTitle>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Stok produk akan ditampilkan sesuai lokasi yang dipilih
          </p>
        </DialogHeader>
        <div className="space-y-2">
          {locations.map((location) => (
            <div
              key={location.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedLocation?.id === location.id
                  ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => {
                onSelect(location);
                onClose();
                toast.success(`📍 Lokasi diubah ke: ${location.location_name}`);
              }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{location.location_name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{location.location_type}</p>
                  {location.address && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-1">{location.address}</p>
                  )}
                </div>
                {selectedLocation?.id === location.id && (
                  <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}

          {locations.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">Belum ada lokasi tersedia</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Buat lokasi di menu Inventory</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}