import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

import { toast } from 'sonner';
import { invalidateCache } from '@/components/utils/requestManager';

export default function InvitationHandler({ user, onCompanyChange }) {
  const [invitations, setInvitations] = useState([]);
  const [lastCheckTime, setLastCheckTime] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const mountedRef = useRef(false);

  // ✅ REALTIME LISTENER
  useEffect(() => {
    if (!user) return;

    console.log('📡 InvitationHandler: Setting up realtime listener for:', user.email);

    const channel = new BroadcastChannel('snishop_invitation_updates');

    channel.onmessage = (event) => {
      const { type, invitedEmail, invitation } = event.data;

      if (type === 'INVITATION_CREATED' && invitedEmail === user.email) {
        console.log('✅ NEW INVITATION for current user!');

        toast.success(`📬 Undangan Baru!`, {
          description: `${invitation.invited_by_name} mengundang Anda ke ${invitation.company_name}`,
          duration: 5000
        });

        loadInvitations();
      }
    };

    return () => {
      channel.close();
    };
  }, [user]);

  const loadInvitations = async () => {
    if (!user || isLoadingInvitations) return;

    // ✅ OPTIMIZED Rate limiting - max 1 request per 4 seconds (for instant feel)
    const now = Date.now();
    if (now - lastCheckTime < 4000) {
      console.log('⏳ Rate limit - skipping invitation check');
      return;
    }
    setLastCheckTime(now);
    setIsLoadingInvitations(true);

    try {
      console.log('📬 Loading invitations for:', user.email);

      // ✅ TIMEOUT PROTECTION - Abort after 10 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const invitationsPromise = base44.entities.CompanyInvitation.filter({
        invited_email: user.email,
        status: 'pending'
      });

      const data = await Promise.race([invitationsPromise, timeoutPromise]);

      console.log('✅ Invitations loaded:', data?.length || 0);

      setInvitations(data || []);
      setRetryCount(0); // Reset retry count on success

    } catch (error) {
      // ✅ COMPLETELY SILENT ERROR HANDLING
      // Only log to console, don't show to user, don't break app
      const errorMsg = error?.message || String(error);

      // Check if it's a database/network error
      const isDatabaseError = errorMsg.includes('replica set') ||
        errorMsg.includes('timeout') ||
        errorMsg.includes('Timeout') ||
        errorMsg.includes('Network') ||
        errorMsg.includes('ECONNREFUSED');

      if (isDatabaseError) {
        // ✅ EXPONENTIAL BACKOFF - Increase delay on repeated failures
        setRetryCount(prev => prev + 1);

        console.warn(`⚠️ Database temporarily unavailable (attempt ${retryCount + 1})`);

        // Don't spam console with full error
        if (retryCount === 0) {
          console.warn('   InvitationHandler will retry automatically when database is available');
        }
      } else {
        // Other errors - log once
        console.warn('[InvitationHandler] Error loading invitations:', errorMsg);
      }

      // Keep existing invitations if any
      // Don't clear the state or show error to user
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  // ✅ Initial load - with delay
  useEffect(() => {
    if (user && !mountedRef.current) {
      mountedRef.current = true;
      console.log('🏢 InvitationHandler MOUNTED');

      // ✅ FAST initial load (1-2s)
      const delay = Math.min(1000 + (retryCount * 2000), 10000);

      setTimeout(() => {
        loadInvitations();
      }, delay);
    }
  }, [user]);

  // ✅ Periodic check - FAST POLLING (5s)
  useEffect(() => {
    if (!user) return;

    // Fast polling: 5s -> 10s -> max 60s
    const baseInterval = 5000;
    const interval = Math.min(baseInterval * (retryCount + 1), 60000);

    console.log(`⏰ InvitationHandler: Polling every ${interval / 1000}s`);

    const timer = setInterval(() => {
      loadInvitations();
    }, interval);

    // ✅ TRIGGER ON TAB FOCUS
    const handleFocus = () => {
      console.log('👀 Tab focused - checking invitations...');
      loadInvitations();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, retryCount]);

  const handleAccept = async (invitation) => {
    try {
      console.log('✅ ACCEPTING INVITATION:', invitation.company_name);

      await base44.entities.CompanyMember.create({
        company_id: invitation.company_id,
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        role: invitation.role,
        department: invitation.department || '',
        position: invitation.position || '',
        permissions: invitation.permissions || {},
        status: 'active',
        joined_date: new Date().toISOString().split('T')[0],
        invited_by: invitation.invited_by
      });

      await base44.entities.CompanyInvitation.update(invitation.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString()
      });

      // Mark notifications
      try {
        const notifications = await base44.entities.Notification.filter({
          user_id: user.email,
          url: '/dashboard',
          is_read: false
        });

        const relevantNotifs = notifications.filter(n =>
          n.message && n.message.includes(invitation.company_name)
        );

        for (const notif of relevantNotifs) {
          await base44.entities.Notification.update(notif.id, { is_read: true });
        }
      } catch (error) {
        console.log('⚠️ Could not mark notifications:', error.message);
      }

      await base44.auth.updateMe({
        active_company_id: invitation.company_id
      });

      invalidateCache(/Company/);
      invalidateCache(/CompanyMember/);
      invalidateCache(/CompanyInvitation/);

      // Broadcast event
      window.dispatchEvent(new CustomEvent('memberJoinedCompany', {
        detail: {
          userEmail: user.email,
          companyId: invitation.company_id,
          companyName: invitation.company_name,
          role: invitation.role,
          timestamp: Date.now()
        }
      }));

      toast.success(`✅ Bergabung dengan ${invitation.company_name}!`, {
        description: 'Dashboard akan dimuat ulang...',
        duration: 2000
      });

      setTimeout(() => {
        sessionStorage.clear();
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('❌ Error accepting invitation:', error);
      toast.error('Gagal menerima undangan');
    }
  };

  const handleReject = async (invitation) => {
    try {
      await base44.entities.CompanyInvitation.update(invitation.id, {
        status: 'rejected'
      });

      try {
        const notifications = await base44.entities.Notification.filter({
          user_id: user.email,
          url: '/dashboard',
          is_read: false
        });

        const relevantNotifs = notifications.filter(n =>
          n.message && n.message.includes(invitation.company_name)
        );

        for (const notif of relevantNotifs) {
          await base44.entities.Notification.update(notif.id, { is_read: true });
        }
      } catch (error) {
        console.log('Could not mark notifications:', error);
      }

      invalidateCache(/CompanyInvitation/);

      toast.success('Undangan ditolak');

      loadInvitations();

    } catch (error) {
      console.error('Error rejecting invitation:', error);
      toast.error('Gagal menolak undangan');
    }
  };

  // Don't render anything - this is a background service
  return null;
}