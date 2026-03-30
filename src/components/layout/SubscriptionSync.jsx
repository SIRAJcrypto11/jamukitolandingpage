import { useEffect, useRef } from 'react';
import { User } from '@/entities/User';

/**
 * ✅ SAFE SUBSCRIPTION SYNC - Prevents rate limit errors
 * - Only checks once every 2 minutes minimum
 * - Silent fail on network errors
 * - No auto-polling, only on mount
 */
export default function SubscriptionSync({ currentUser }) {
  const lastCheckRef = useRef(0);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!currentUser || hasCheckedRef.current) return;

    const checkSubscription = async () => {
      // ✅ RATE LIMIT - Only check once per 2 minutes
      const now = Date.now();
      if (now - lastCheckRef.current < 120000) {
        console.log('⏭️ Skipping subscription check (rate limit)');
        return;
      }

      try {
        lastCheckRef.current = now;
        hasCheckedRef.current = true;

        console.log('🔄 Checking subscription status...');
        
        // ✅ SILENT CHECK - Just fetch, don't update UI
        const freshUser = await User.me();
        
        if (freshUser && freshUser.subscription_plan !== currentUser.subscription_plan) {
          console.log('✅ Subscription changed detected - reloading page...');
          
          // Clear cache and reload
          sessionStorage.clear();
          localStorage.removeItem('TODOIT_USER_CACHE');
          
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }

      } catch (error) {
        console.warn('⚠️ Subscription check failed (silent):', error.message);
        // ✅ SILENT FAIL - Don't show error to user
      }
    };

    // ✅ ONLY CHECK ONCE - 5 seconds after mount
    const timer = setTimeout(() => {
      checkSubscription();
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentUser]);

  return null; // No UI
}