import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function AuthRecovery({ onUserLoaded }) {
  const [authError, setAuthError] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    checkAuthHealth();
  }, []);

  const checkAuthHealth = async () => {
    try {
      // ✅ Test if localStorage is accessible
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch (e) {
      setAuthError('storage_blocked');
      return;
    }

    // ✅ Test if cookies are enabled
    if (!navigator.cookieEnabled) {
      setAuthError('cookies_disabled');
      return;
    }

    setAuthError(null);
  };

  const handleClearAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    } catch (e) {
      window.location.reload();
    }
  };

  const handleForceRefresh = () => {
    setIsRecovering(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  if (authError === 'storage_blocked') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Storage Diblokir
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Browser Anda memblokir penyimpanan lokal. Aplikasi memerlukan akses ini untuk berfungsi.
          </p>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Solusi:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Nonaktifkan mode incognito/private</li>
              <li>Izinkan cookies untuk domain ini</li>
              <li>Periksa pengaturan browser Anda</li>
            </ul>
          </div>
          <Button 
            onClick={handleForceRefresh}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
          >
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  if (authError === 'cookies_disabled') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Cookies Dinonaktifkan
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Aplikasi memerlukan cookies untuk login. Silakan aktifkan cookies di browser Anda.
          </p>
          <Button 
            onClick={handleForceRefresh}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
          >
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return null;
}