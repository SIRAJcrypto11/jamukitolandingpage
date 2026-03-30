import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PWA Install Prompt - Prompt user untuk install aplikasi sebagai PWA
 * Berfungsi seperti native app di Android & iOS
 */

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    // ✅ Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          window.navigator.standalone === true;
      
      if (isStandalone) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    if (checkInstalled()) {
      return;
    }

    // ✅ Check if dismissed before
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    const dismissedDate = dismissed ? new Date(dismissed) : null;
    const daysSinceDismissed = dismissedDate ? 
      (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24) : 99;

    if (daysSinceDismissed < 7) {
      // Don't show again for 7 days
      return;
    }

    // ✅ Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/android/.test(userAgent)) {
      setPlatform('android');
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else {
      setPlatform('desktop');
    }

    // ✅ Listen for beforeinstallprompt (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 3 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // ✅ For iOS, show manual instructions after 3 seconds
    if (platform === 'ios') {
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [platform]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('✅ PWA installed successfully');
        setIsInstalled(true);
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('PWA install error:', error);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', new Date().toISOString());
    setShowPrompt(false);
  };

  if (isInstalled) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
        >
          <Card className="bg-gradient-to-br from-blue-900 to-indigo-900 border-blue-700 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Install SNISHOP</h3>
                    <p className="text-blue-200 text-xs">Gunakan seperti aplikasi native</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-white h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-200">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Akses cepat dari home screen</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-200">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Berfungsi offline penuh</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-200">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Notifikasi push (segera)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-200">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Performa lebih cepat</span>
                </div>
              </div>

              {platform === 'ios' ? (
                <div className="bg-blue-800/50 rounded-lg p-4 mb-4">
                  <p className="text-xs text-blue-200 mb-2 font-semibold">📱 Cara Install di iOS:</p>
                  <ol className="text-xs text-blue-200 space-y-1 ml-4 list-decimal">
                    <li>Tap tombol <strong>Share</strong> (⎙) di Safari</li>
                    <li>Scroll dan pilih <strong>"Add to Home Screen"</strong></li>
                    <li>Tap <strong>Add</strong></li>
                  </ol>
                </div>
              ) : deferredPrompt ? (
                <Button
                  onClick={handleInstallClick}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install Sekarang
                </Button>
              ) : (
                <div className="bg-blue-800/50 rounded-lg p-4">
                  <p className="text-xs text-blue-200">
                    Buka menu browser (⋮) dan pilih "Add to Home Screen" atau "Install App"
                  </p>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="w-full mt-2 text-gray-400 hover:text-white text-xs"
              >
                Nanti Saja
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}