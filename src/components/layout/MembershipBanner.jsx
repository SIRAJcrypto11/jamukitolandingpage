import React, { useState, useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  AlertCircle,
  Clock,
  Crown,
  X,
  Zap,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MEMBERSHIP_LABELS = {
  free: 'Gratis',
  pro: 'Pro',
  business: 'Business',
  advanced: 'Advanced',
  enterprise: 'Enterprise'
};

export default function MembershipBanner({ user }) {
  const [isVisible, setIsVisible] = useState(true);
  const [membershipInfo, setMembershipInfo] = useState(null);

  useEffect(() => {
    if (!user) return;

    // ✅ Calculate membership status
    const calculateStatus = () => {
      // Skip for free or lifetime users
      if (user.subscription_plan === 'free' || user.membership_duration_type === 'lifetime') {
        setMembershipInfo(null);
        return;
      }

      // Skip if no end date
      if (!user.membership_end_date) {
        setMembershipInfo(null);
        return;
      }

      const endDate = new Date(user.membership_end_date);
      const now = new Date();
      const daysRemaining = differenceInDays(endDate, now);

      // ✅ Show banner if expiring in 14 days or less
      if (daysRemaining <= 14 && daysRemaining >= 0) {
        setMembershipInfo({
          daysRemaining,
          endDate: format(endDate, 'dd MMMM yyyy', { locale: id }),
          plan: MEMBERSHIP_LABELS[user.subscription_plan],
          urgency: daysRemaining <= 3 ? 'critical' : daysRemaining <= 7 ? 'high' : 'medium'
        });
      } else {
        setMembershipInfo(null);
      }
    };

    calculateStatus();

    // ✅ Re-check every minute for accurate countdown
    const interval = setInterval(calculateStatus, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // ✅ Listen for membership updates
  useEffect(() => {
    if (!user) return;

    const channel = new BroadcastChannel('snishop_user_updates');

    channel.onmessage = (event) => {
      const { type, userId } = event.data;

      if (type === 'USER_UPDATED' && userId === user.id) {
        console.log('📡 Membership update received - Recalculating banner...');
        // Will be handled by parent component reload
      }
    };

    return () => channel.close();
  }, [user]);

  if (!membershipInfo || !isVisible) {
    return null;
  }

  // ✅ Determine banner style based on urgency
  const getBannerStyle = () => {
    if (membershipInfo.urgency === 'critical') {
      return {
        bg: 'bg-red-900/30',
        border: 'border-red-600',
        text: 'text-red-300',
        icon: 'text-red-400'
      };
    } else if (membershipInfo.urgency === 'high') {
      return {
        bg: 'bg-yellow-900/30',
        border: 'border-yellow-600',
        text: 'text-yellow-300',
        icon: 'text-yellow-400'
      };
    } else {
      return {
        bg: 'bg-blue-900/30',
        border: 'border-blue-600',
        text: 'text-blue-300',
        icon: 'text-blue-400'
      };
    }
  };

  const style = getBannerStyle();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Alert className={`${style.bg} border-2 ${style.border} mb-4 sm:mb-6 relative`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-opacity-20 ${style.bg} flex-shrink-0`}>
              {membershipInfo.urgency === 'critical' ? (
                <AlertCircle className={`w-5 h-5 sm:w-6 sm:h-6 ${style.icon} animate-pulse`} />
              ) : (
                <Clock className={`w-5 h-5 sm:w-6 sm:h-6 ${style.icon}`} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <AlertDescription className={`${style.text} space-y-2`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <p className="font-bold text-sm sm:text-base">
                    {membershipInfo.urgency === 'critical' && '🚨 SEGERA PERPANJANG!'}
                    {membershipInfo.urgency === 'high' && '⚠️ Membership Akan Berakhir'}
                    {membershipInfo.urgency === 'medium' && '⏰ Pengingat Perpanjangan'}
                  </p>
                  <Badge className={`${
                    membershipInfo.urgency === 'critical' ? 'bg-red-600' :
                    membershipInfo.urgency === 'high' ? 'bg-yellow-600' :
                    'bg-blue-600'
                  } text-white text-xs w-fit`}>
                    <Crown className="w-3 h-3 mr-1" />
                    {membershipInfo.plan}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs sm:text-sm">
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <strong>Sisa waktu: {membershipInfo.daysRemaining} hari lagi</strong>
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Berakhir: {membershipInfo.endDate}
                  </p>
                  <p className="text-xs opacity-90 mt-2">
                    ⚠️ Jika tidak diperpanjang, akun akan otomatis turun ke <strong>Paket Gratis</strong>.
                    <br />
                    ✅ Data Anda akan <strong>tetap aman</strong>, namun fitur premium akan <strong>dikunci</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <Link to={createPageUrl('Pricing')}>
                    <Button 
                      size="sm" 
                      className={`${
                        membershipInfo.urgency === 'critical' ? 'bg-red-600 hover:bg-red-700 animate-pulse' :
                        membershipInfo.urgency === 'high' ? 'bg-yellow-600 hover:bg-yellow-700' :
                        'bg-blue-600 hover:bg-blue-700'
                      } text-white text-xs sm:text-sm`}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Perpanjang Sekarang
                    </Button>
                  </Link>
                </div>
              </AlertDescription>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsVisible(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white h-6 w-6"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}