import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { differenceInDays, isAfter } from 'date-fns';
import { toast } from 'sonner';

/**
 * ✅ MEMBERSHIP EXPIRY CHECKER & AUTO-DOWNGRADE
 * - Check membership expiry on mount
 * - Auto-downgrade to free if expired
 * - Show warning if expiring soon (7 days)
 * - Listen for real-time updates from admin
 */
export default function MembershipExpiryChecker({ currentUser, onUserUpdate }) {
  const hasCheckedRef = useRef(false);
  const lastCheckRef = useRef(0);

  // ✅ REALTIME SYNC - Listen for membership updates from admin
  useEffect(() => {
    if (!currentUser) return;

    const channel = new BroadcastChannel('snishop_user_updates');

    channel.onmessage = (event) => {
      const { type, userId, updatedData } = event.data;

      if (type === 'USER_UPDATED' && userId === currentUser.id) {
        console.log('📡 Membership update received for current user!');
        
        // ✅ UPDATE USER DATA IMMEDIATELY
        if (onUserUpdate && updatedData) {
          const newUserData = { ...currentUser, ...updatedData };
          onUserUpdate(newUserData);

          // ✅ Show notification with new membership info
          const daysRemaining = updatedData.membership_end_date 
            ? differenceInDays(new Date(updatedData.membership_end_date), new Date())
            : null;

          const membershipLabels = {
            free: 'Gratis',
            pro: 'Pro',
            business: 'Business',
            advanced: 'Advanced',
            enterprise: 'Enterprise'
          };

          toast.success('✅ Membership Anda diperbarui!', {
            description: `Level: ${membershipLabels[updatedData.subscription_plan]} ${
              daysRemaining !== null && daysRemaining > 0 
                ? `| ${daysRemaining} hari tersisa` 
                : ''
            }`,
            duration: 5000
          });

          // ✅ Force reload untuk update UI semua fitur
          setTimeout(() => {
            sessionStorage.clear();
            window.location.reload();
          }, 1500);
        }
      }
    };

    return () => {
      channel.close();
    };
  }, [currentUser, onUserUpdate]);

  // ✅ CHECK EXPIRY ON MOUNT & PERIODIC
  useEffect(() => {
    if (!currentUser || hasCheckedRef.current) return;

    const checkMembershipExpiry = async () => {
      // ✅ RATE LIMIT - Only check once per 5 minutes
      const now = Date.now();
      if (now - lastCheckRef.current < 300000) {
        console.log('⏭️ Skipping expiry check (rate limit)');
        return;
      }

      try {
        lastCheckRef.current = now;
        hasCheckedRef.current = true;

        console.log('🔍 Checking membership expiry...');

        const userData = currentUser;

        // ✅ CHECK IF HAS MEMBERSHIP END DATE
        if (!userData.membership_end_date) {
          console.log('ℹ️ No membership end date - user is on free plan or lifetime');
          return;
        }

        // ✅ CHECK IF LIFETIME
        if (userData.membership_duration_type === 'lifetime') {
          console.log('♾️ User has lifetime membership - no expiry check needed');
          return;
        }

        const endDate = new Date(userData.membership_end_date);
        const currentDate = new Date();
        const daysRemaining = differenceInDays(endDate, currentDate);

        console.log('📅 Membership End Date:', endDate);
        console.log('⏳ Days Remaining:', daysRemaining);

        // ✅ EXPIRED - Check grace period first (3 days)
        if (isAfter(currentDate, endDate)) {
          const daysSinceExpiry = Math.abs(daysRemaining);
          
          console.log('❌ Membership EXPIRED');
          console.log('   Days since expiry:', daysSinceExpiry);
          
          // ✅ Within grace period (0-3 days) - Enable read-only mode
          if (daysSinceExpiry <= 3) {
            console.log('⚠️ GRACE PERIOD ACTIVE - Enabling read-only mode');
            
            await base44.entities.User.update(userData.id, {
              is_readonly_mode: true
            });
            
            toast.warning(`⚠️ Membership expired! ${3 - daysSinceExpiry} hari tersisa`, {
              description: 'Perpanjang sekarang atau fitur bisnis akan dinonaktifkan.',
              duration: 10000,
              action: {
                label: 'Perpanjang',
                onClick: () => window.location.href = '/pricing'
              }
            });
            
            return;
          }
          
          // ✅ Grace period ended - DOWNGRADE TO FREE
          console.log('❌ GRACE PERIOD ENDED - Downgrading to FREE...');

          const updateData = {
            subscription_plan: 'free',
            membership_duration_type: null,
            membership_start_date: null,
            membership_end_date: null,
            admin_tier: 'none',
            is_readonly_mode: false
          };

          await base44.entities.User.update(userData.id, updateData);

          toast.error('⚠️ Membership Anda telah berakhir!', {
            description: 'Anda otomatis diturunkan ke paket Gratis. Perpanjang langganan untuk akses kembali fitur premium.',
            duration: 10000,
            action: {
              label: 'Upgrade',
              onClick: () => window.location.href = '/pricing'
            }
          });

          // ✅ BROADCAST - Notify admin
          try {
            const channel = new BroadcastChannel('snishop_user_updates');
            channel.postMessage({
              type: 'USER_DOWNGRADED',
              userId: userData.id,
              reason: 'membership_expired',
              timestamp: Date.now()
            });
            channel.close();
          } catch (e) {
            console.warn('BroadcastChannel error:', e);
          }

          // ✅ Force reload untuk apply perubahan
          setTimeout(() => {
            sessionStorage.clear();
            window.location.reload();
          }, 2000);

          return;
        }

        // ✅ EXPIRING SOON - SHOW WARNING (7 days or less)
        if (daysRemaining <= 7 && daysRemaining > 0) {
          console.log(`⚠️ Membership expiring in ${daysRemaining} days!`);

          toast.warning(`⏰ Membership Anda akan berakhir dalam ${daysRemaining} hari!`, {
            description: 'Perpanjang sekarang untuk tetap akses fitur premium tanpa gangguan.',
            duration: 8000,
            action: {
              label: 'Perpanjang',
              onClick: () => window.location.href = '/pricing'
            }
          });
        }

      } catch (error) {
        console.error('❌ Error checking membership expiry:', error);
      }
    };

    // ✅ Check on mount dengan delay
    setTimeout(() => {
      checkMembershipExpiry();
    }, 3000);

    // ✅ PERIODIC CHECK - Every 30 minutes
    const interval = setInterval(() => {
      hasCheckedRef.current = false; // Reset check flag
      checkMembershipExpiry();
    }, 1800000); // 30 minutes

    return () => clearInterval(interval);
  }, [currentUser, onUserUpdate]);

  return null; // No UI - background checker
}