import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Bluetooth } from 'lucide-react';
import BluetoothPrinterManager from '@/components/pos/BluetoothPrinterManager';

export default function POSPrinterDialog({ open, onClose, selectedCompany, user, onConnectionChange }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white max-w-4xl mx-4 sm:mx-auto max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Pengaturan Printer Kasir
          </DialogTitle>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Setup sekali, print otomatis untuk semua transaksi
          </p>
        </DialogHeader>

        <div className="p-4 bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600 rounded-xl mb-4">
          <div className="flex items-start gap-3">
            <Bluetooth className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-base text-blue-700 dark:text-blue-300 font-bold mb-2">
                🔗 PERSISTENT CONNECTION - SETUP SEKALI!
              </p>
              <div className="text-sm text-gray-700 dark:text-gray-200 space-y-1">
                <p>✅ Connect sekali, tetap terhubung selama tidak disconnect</p>
                <p>✅ Semua transaksi otomatis print tanpa reconnect</p>
                <p>✅ Settings tersimpan & sync dengan Company Settings</p>
                <p>✅ Driver auto-install untuk printer thermal apapun</p>
              </div>
            </div>
          </div>
        </div>

        <BluetoothPrinterManager
          company={selectedCompany}
          user={user}
          onConnectionChange={onConnectionChange}
        />

        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}