import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, CloudUpload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function OfflineIndicator({ isOnline, pendingCount, isSyncing }) {
  const [showDetails, setShowDetails] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (!isOnline || pendingCount > 0) {
      setPulseKey(prev => prev + 1);
    }
  }, [isOnline, pendingCount]);

  const handleManualSync = () => {
    if (isOnline && pendingCount > 0) {
      window.dispatchEvent(new Event('triggerOfflineSync'));
    }
  };

  return (
    <Popover open={showDetails} onOpenChange={setShowDetails}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 px-2 gap-2 ${!isOnline ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30' : pendingCount > 0 ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' : 'text-green-400 hover:bg-green-600/20'}`}
        >
          <AnimatePresence mode="wait">
            {isSyncing ? (
              <motion.div
                key="syncing"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <Loader2 className="w-4 h-4 animate-spin" />
              </motion.div>
            ) : !isOnline ? (
              <motion.div
                key="offline"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <WifiOff className="w-4 h-4" />
              </motion.div>
            ) : pendingCount > 0 ? (
              <motion.div
                key={`pending-${pulseKey}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <CloudUpload className="w-4 h-4 animate-pulse" />
              </motion.div>
            ) : (
              <motion.div
                key="online"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <Wifi className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>

          <span className="text-xs font-medium hidden sm:inline">
            {isSyncing ? 'Syncing...' : !isOnline ? 'Offline' : pendingCount > 0 ? `${pendingCount} pending` : 'Online'}
          </span>

          {pendingCount > 0 && !isSyncing && (
            <Badge className="bg-blue-600 text-white text-xs h-4 px-1.5 ml-1">
              {pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 bg-gray-900 border-gray-700 text-white" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Status Koneksi</h3>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Online</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-yellow-400 font-medium">Offline</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Pending Sync</span>
              <span className="text-lg font-bold text-blue-400">{pendingCount}</span>
            </div>
            
            {isSyncing && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Menyinkronkan data...</span>
              </div>
            )}

            {!isOnline && pendingCount > 0 && (
              <div className="mt-2 p-2 bg-yellow-600/20 border border-yellow-600/30 rounded text-xs text-yellow-300">
                💡 Data akan otomatis tersinkron saat koneksi kembali
              </div>
            )}

            {isOnline && pendingCount > 0 && !isSyncing && (
              <Button
                onClick={handleManualSync}
                size="sm"
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                <CloudUpload className="w-3 h-3 mr-2" />
                Sync Sekarang
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-400 space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span>Mode: {isOnline ? 'Online' : 'Offline'}</span>
            </div>
            
            {!isOnline && (
              <div className="mt-2 p-2 bg-gray-800 border border-gray-700 rounded">
                <p className="text-xs text-gray-300 mb-1">📵 Mode Offline Aktif</p>
                <ul className="text-xs text-gray-400 space-y-1 ml-4">
                  <li>✓ Semua fitur tetap berfungsi</li>
                  <li>✓ Data tersimpan di browser</li>
                  <li>✓ Auto-sync saat online</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}