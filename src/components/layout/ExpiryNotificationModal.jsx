import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Crown, Calendar, Lock } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ExpiryNotificationModal({ currentUser, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expiryStatus, setExpiryStatus] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    // Check if user has expired or expiring membership
    const checkExpiry = () => {
      const { subscription_plan, membership_end_date, membership_duration_type } = currentUser;
      
      // Skip if free plan or lifetime
      if (subscription_plan === 'free' || membership_duration_type === 'lifetime') {
        return;
      }

      if (!membership_end_date) return;

      const endDate = new Date(membership_end_date);
      const now = new Date();
      const daysLeft = differenceInDays(endDate, now);

      console.log('🔔 EXPIRY CHECK:');
      console.log('   Plan:', subscription_plan);
      console.log('   End Date:', membership_end_date);
      console.log('   Days Left:', daysLeft);

      // ✅ EXPIRED - Show critical warning
      if (daysLeft < 0) {
        const daysSinceExpiry = Math.abs(daysLeft);
        const gracePeriodLeft = Math.max(0, 3 - daysSinceExpiry);
        
        setExpiryStatus({
          type: 'EXPIRED',
          daysLeft: gracePeriodLeft,
          endDate: endDate,
          plan: subscription_plan
        });
        
        // Check if already shown today
        const lastShown = localStorage.getItem('SNISHOP_EXPIRY_NOTICE_SHOWN');
        const today = new Date().toISOString().split('T')[0];
        
        if (lastShown !== today) {
          setIsOpen(true);
          localStorage.setItem('SNISHOP_EXPIRY_NOTICE_SHOWN', today);
        }
        return;
      }

      // ✅ EXPIRING SOON - Show warning (7 days before)
      if (daysLeft <= 7 && daysLeft >= 0) {
        setExpiryStatus({
          type: 'EXPIRING',
          daysLeft: daysLeft,
          endDate: endDate,
          plan: subscription_plan
        });
        
        const lastShown = localStorage.getItem('SNISHOP_EXPIRING_NOTICE_SHOWN');
        const today = new Date().toISOString().split('T')[0];
        
        if (lastShown !== today) {
          setIsOpen(true);
          localStorage.setItem('SNISHOP_EXPIRING_NOTICE_SHOWN', today);
        }
      }
    };

    checkExpiry();
  }, [currentUser]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!expiryStatus) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white dark:bg-gray-900 border-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {expiryStatus.type === 'EXPIRED' ? (
              <>
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <span className="text-red-600">Membership Expired!</span>
              </>
            ) : (
              <>
                <Calendar className="w-6 h-6 text-yellow-600" />
                <span className="text-yellow-600">Membership Akan Berakhir</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {expiryStatus.type === 'EXPIRED' ? (
            <>
              <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  <p className="font-semibold mb-2">Membership Anda Telah Berakhir!</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Plan: <strong>{expiryStatus.plan.toUpperCase()}</strong></li>
                    <li>Berakhir: <strong>{format(expiryStatus.endDate, 'dd MMM yyyy', { locale: id })}</strong></li>
                    <li>Grace Period: <strong>{expiryStatus.daysLeft} hari lagi</strong></li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-8 h-8 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                      ⚠️ AKSES TERBATAS - {expiryStatus.daysLeft} Hari Tersisa
                    </p>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li>✅ Anda masih bisa melihat data bisnis</li>
                      <li>❌ Tidak bisa menambah/edit data baru</li>
                      <li>❌ Kasir & fitur bisnis dinonaktifkan</li>
                      <li>⏰ Dalam {expiryStatus.daysLeft} hari akan kembali ke Free Plan</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-4 text-center">
                <Crown className="w-12 h-12 mx-auto mb-2" />
                <p className="font-bold text-lg mb-1">Perpanjang Sekarang!</p>
                <p className="text-sm opacity-90 mb-3">
                  Perpanjang membership untuk terus menggunakan fitur bisnis premium
                </p>
                <Link to={createPageUrl('Pricing')}>
                  <Button className="w-full bg-white text-blue-600 hover:bg-gray-100 font-bold">
                    <Crown className="w-4 h-4 mr-2" />
                    Perpanjang Membership
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700">
                <Calendar className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  <p className="font-semibold mb-2">Membership Akan Segera Berakhir</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Plan: <strong>{expiryStatus.plan.toUpperCase()}</strong></li>
                    <li>Berakhir: <strong>{format(expiryStatus.endDate, 'dd MMM yyyy', { locale: id })}</strong></li>
                    <li>Sisa Waktu: <strong>{expiryStatus.daysLeft} hari lagi</strong></li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  💡 <strong>Perpanjang sekarang</strong> untuk menghindari gangguan pada fitur bisnis Anda
                </p>
                <Link to={createPageUrl('Pricing')}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Crown className="w-4 h-4 mr-2" />
                    Lihat Paket Perpanjangan
                  </Button>
                </Link>
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Nanti Saja
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}