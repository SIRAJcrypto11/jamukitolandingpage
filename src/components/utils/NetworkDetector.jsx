import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function NetworkDetector() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        toast.success('✅ Koneksi kembali normal!', {
          description: 'Memuat ulang data...',
          duration: 3000
        });
        
        // Auto-reload data after reconnect
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      toast.error('⚠️ Koneksi internet terputus', {
        description: 'Beberapa fitur mungkin tidak tersedia',
        duration: 5000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 text-sm z-50">
        ⚠️ Tidak ada koneksi internet
      </div>
    );
  }

  return null;
}