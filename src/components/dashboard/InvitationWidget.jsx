import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, X, Loader2, Users, Briefcase, Mail, RefreshCw, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function InvitationWidget({ user, onAccept }) {
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const lastCheckRef = useRef(0);

  // ✅ REALTIME LISTENER - INSTANT UPDATES!
  useEffect(() => {
    if (!user?.email) return;

    console.log('📡 [InvitationWidget] Setting up realtime listener for', user.email);

    const channel = new BroadcastChannel('snishop_invitation_updates');

    channel.onmessage = (event) => {
      const { type, invitedEmail, invitation } = event.data;

      console.log('📡 [InvitationWidget] Broadcast received:', type, '| For:', invitedEmail);

      if (type === 'INVITATION_CREATED' && invitedEmail === user.email) {
        console.log('🎯 [InvitationWidget] NEW INVITATION - Reloading instantly!');
        
        // ✅ INSTANT NOTIFICATION
        toast.success('📧 Undangan Baru di Dashboard!', {
          description: `${invitation.company_name || 'Perusahaan'} mengundang Anda`,
          duration: 8000
        });

        // ✅ RELOAD INSTANTLY
        setTimeout(() => loadInvitations(), 300);
        setTimeout(() => loadInvitations(), 1500);
      }
    };

    return () => {
      channel.close();
    };
  }, [user]);

  // ✅ INITIAL LOAD
  useEffect(() => {
    if (user?.email) {
      // Small delay to prevent rate limit
      setTimeout(() => {
        loadInvitations();
      }, 2000);
    }
  }, [user]);

  const loadInvitations = async () => {
    if (!user?.email) return;

    // ✅ RATE LIMIT - Max once per 15 seconds
    const now = Date.now();
    if (now - lastCheckRef.current < 15000) {
      console.log('⏭️ [InvitationWidget] Skipping load (rate limit)');
      return;
    }

    try {
      lastCheckRef.current = now;
      setIsLoading(true);

      console.log('📥 [InvitationWidget] Loading invitations...');

      const data = await base44.entities.CompanyInvitation.filter({
        invited_email: user.email,
        status: 'pending'
      });

      const validInvitations = (data || []).filter(inv => inv && inv.company_id);

      console.log('✅ [InvitationWidget] Loaded:', validInvitations.length, 'invitations');
      setInvitations(validInvitations);

    } catch (error) {
      console.error('[InvitationWidget] Error loading invitations:', error);
      
      // Silent fail for rate limit errors
      if (error?.message?.includes('Rate limit') || error?.message?.includes('429')) {
        console.warn('⚠️ Rate limit - will retry later');
        return;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (invitation) => {
    if (!invitation?.id || !invitation?.company_id) return;

    setProcessingId(invitation.id);

    try {
      console.log('✅ [InvitationWidget] Accepting invitation:', invitation.company_name);

      // ✅ STEP 1: Create Member
      await base44.entities.CompanyMember.create({
        company_id: invitation.company_id,
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        role: invitation.role || 'employee',
        department: invitation.department,
        position: invitation.position,
        permissions: invitation.permissions || {},
        status: 'active',
        joined_date: new Date().toISOString().split('T')[0],
        invited_by: invitation.invited_by
      });
      console.log('✅ Member created');

      // ✅ STEP 2: Update Invitation
      await base44.entities.CompanyInvitation.update(invitation.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString()
      });
      console.log('✅ Invitation accepted');

      // ✅ STEP 3: Set Active Company
      await base44.auth.updateMe({ 
        active_company_id: invitation.company_id 
      });
      console.log('✅ Active company set');

      // ✅ STEP 4: Mark Notifications as Read
      try {
        const notifications = await base44.entities.Notification.filter({
          user_id: user.email,
          message: { $ilike: `%${invitation.company_name}%` },
          is_read: false
        });

        for (const notif of notifications) {
          await base44.entities.Notification.update(notif.id, { is_read: true });
          await new Promise(r => setTimeout(r, 300));
        }
      } catch (e) {
        console.warn('Could not mark notifications:', e);
      }

      // ✅ STEP 5: Clear Caches
      sessionStorage.clear();
      localStorage.removeItem('TODOIT_USER_CACHE');
      localStorage.removeItem('TODOIT_DATA_CACHE');

      // ✅ STEP 6: Broadcast Company Change
      window.dispatchEvent(new CustomEvent('companyChanged', {
        detail: { 
          company: {
            id: invitation.company_id,
            name: invitation.company_name
          }
        }
      }));

      toast.success(`✅ Bergabung dengan ${invitation.company_name}!`, {
        duration: 3000,
        description: 'Halaman akan dimuat ulang...'
      });

      // ✅ STEP 7: Callback & Reload
      if (onAccept) {
        onAccept(invitation);
      }

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);

    } catch (error) {
      console.error('❌ [InvitationWidget] Error accepting:', error);
      toast.error('Gagal menerima undangan');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (invitation) => {
    if (!invitation?.id) return;

    setProcessingId(invitation.id);

    try {
      await base44.entities.CompanyInvitation.update(invitation.id, {
        status: 'rejected'
      });

      // Mark notifications as read
      try {
        const notifications = await base44.entities.Notification.filter({
          user_id: user.email,
          message: { $ilike: `%${invitation.company_name}%` },
          is_read: false
        });

        for (const notif of notifications) {
          await base44.entities.Notification.update(notif.id, { is_read: true });
          await new Promise(r => setTimeout(r, 300));
        }
      } catch (e) {}

      toast.success('Undangan ditolak');

      // Remove from list
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));

    } catch (error) {
      console.error('Error rejecting invitation:', error);
      toast.error('Gagal menolak undangan');
    } finally {
      setProcessingId(null);
    }
  };

  if (invitations.length === 0) {
    return null; // Don't show widget if no invitations
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/30 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400 animate-pulse" />
              Undangan Perusahaan
              <Badge className="bg-blue-600 text-white ml-2 animate-pulse">
                {invitations.length} Baru
              </Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadInvitations}
              disabled={isLoading}
              className="text-gray-300 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <AnimatePresence>
            {invitations.map((invitation, index) => (
              <motion.div
                key={invitation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-600/20 rounded-lg flex-shrink-0">
                        <Building2 className="w-5 h-5 text-blue-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">
                          {invitation.company_name || 'Perusahaan'}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Dari: {invitation.invited_by_name || invitation.invited_by}
                        </p>

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">
                            <Briefcase className="w-3 h-3 mr-1" />
                            {invitation.role || 'employee'}
                          </Badge>

                          {invitation.department && (
                            <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30 text-xs">
                              {invitation.department}
                            </Badge>
                          )}

                          {invitation.position && (
                            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs">
                              {invitation.position}
                            </Badge>
                          )}
                        </div>

                        {invitation.message && (
                          <p className="text-xs text-gray-300 mt-2 p-2 bg-gray-700/50 rounded italic line-clamp-2">
                            "{invitation.message}"
                          </p>
                        )}

                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => handleAccept(invitation)}
                            disabled={processingId === invitation.id}
                            className="bg-green-600 hover:bg-green-700 text-white flex-1"
                          >
                            {processingId === invitation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Terima
                              </>
                            )}
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleReject(invitation)}
                            disabled={processingId === invitation.id}
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700 flex-1"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Tolak
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="text-center text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
            💡 Undangan juga tersedia di popup & notifikasi
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}