import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Lock, Crown, Users, Loader2, AlertTriangle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { differenceInDays } from 'date-fns';

/**
 * ERPAccessGuard - Component to protect company-specific pages
 * UPDATED: Now checks CompanyMember access for invited members
 * 
 * Usage:
 * <ERPAccessGuard selectedCompany={selectedCompany} currentUser={currentUser}>
 *   <YourCompanyContent />
 * </ERPAccessGuard>
 */
export default function ERPAccessGuard({ children, selectedCompany, currentUser, allowReadOnly = false }) {
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [memberRole, setMemberRole] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);

  useEffect(() => {
    if (currentUser && selectedCompany) {
      checkAccess();
    } else if (!currentUser) {
      setIsChecking(false);
      setHasAccess(false);
    } else if (!selectedCompany) {
      setIsChecking(false);
      setHasAccess(false);
    }
  }, [currentUser, selectedCompany]);

  // ✅ NEW: Listen for realtime permission updates
  useEffect(() => {
    if (!selectedCompany?.id || !currentUser?.email) return;

    const channel = new BroadcastChannel('snishop_member_updates');

    const handleMessage = (event) => {
      const { type, memberEmail, companyId } = event?.data || {};

      // If permission updated for current user, re-check access
      if (type === 'PERMISSIONS_UPDATED' &&
        companyId === selectedCompany.id &&
        memberEmail === currentUser.email) {
        console.log('🔄 ERPAccessGuard: Permission update received - re-checking access...');
        checkAccess();
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [selectedCompany?.id, currentUser?.email]);

  const checkAccess = async () => {
    try {
      setIsChecking(true);

      // ✅ CHECK READ-ONLY MODE (expired membership within grace period)
      const checkReadOnlyStatus = () => {
        const { membership_end_date, membership_duration_type, subscription_plan } = currentUser;

        if (membership_duration_type === 'lifetime' || subscription_plan === 'free') {
          return false;
        }

        if (!membership_end_date) return false;

        const endDate = new Date(membership_end_date);
        const now = new Date();
        const daysLeft = differenceInDays(endDate, now);

        // If expired and within grace period (0 to -3 days)
        if (daysLeft < 0 && daysLeft >= -3) {
          console.log('⚠️ READ-ONLY MODE: Grace period active');
          setIsReadOnlyMode(true);
          return true;
        }

        setIsReadOnlyMode(false);
        return false;
      };

      const isReadOnly = checkReadOnlyStatus();

      // Check if user is the owner
      if (selectedCompany.owner_email === currentUser.email) {
        setHasAccess(true);
        setMemberRole('owner');

        // ✅ Apply read-only restrictions if expired
        const basePermissions = {
          can_view_dashboard: true,
          can_view_tasks: true,
          can_create_tasks: true,
          can_edit_tasks: true,
          can_delete_tasks: true,
          can_view_notes: true,
          can_create_notes: true,
          can_edit_notes: true,
          can_delete_notes: true,
          can_view_hr: true,
          can_edit_hr: true,
          can_view_finance: true,
          can_edit_finance: true,
          can_view_inventory: true,
          can_edit_inventory: true,
          can_view_projects: true,
          can_edit_projects: true,
          can_view_pos: true,
          can_use_pos: true,
          can_view_reports: true,
          can_manage_members: true,
          can_manage_roles: true,
          can_view_settings: true,
          can_edit_settings: true
        };

        if (isReadOnly && !allowReadOnly) {
          setPermissions({
            ...basePermissions,
            can_create_tasks: false,
            can_edit_tasks: false,
            can_delete_tasks: false,
            can_create_notes: false,
            can_edit_notes: false,
            can_delete_notes: false,
            can_edit_hr: false,
            can_edit_finance: false,
            can_edit_inventory: false,
            can_edit_projects: false,
            can_use_pos: false,
            can_edit_settings: false
          });
        } else {
          setPermissions(basePermissions);
        }

        setIsChecking(false);
        return;
      }

      // Check if user is a member
      const memberRecords = await base44.entities.CompanyMember.filter({
        company_id: selectedCompany.id,
        user_email: currentUser.email,
        status: 'active'
      });

      if (memberRecords && memberRecords.length > 0) {
        const member = memberRecords[0];
        setHasAccess(true);
        setMemberRole(member.role);

        let memberPerms = member.permissions || getDefaultPermissions(member.role);

        // ✅ Apply read-only restrictions if expired
        if (isReadOnly && !allowReadOnly) {
          memberPerms = {
            ...memberPerms,
            can_create_tasks: false,
            can_edit_tasks: false,
            can_delete_tasks: false,
            can_create_notes: false,
            can_edit_notes: false,
            can_delete_notes: false,
            can_edit_hr: false,
            can_edit_finance: false,
            can_edit_inventory: false,
            can_edit_projects: false,
            can_use_pos: false,
            can_edit_settings: false
          };
        }

        setPermissions(memberPerms);

        console.log('✅ Member Access Granted:', {
          user: currentUser.email,
          company: selectedCompany.name,
          role: member.role,
          readOnly: isReadOnly,
          permissions: memberPerms
        });
      } else {
        setHasAccess(false);
        console.log('❌ No member access found for:', currentUser.email);
      }

    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    } finally {
      setIsChecking(false);
    }
  };

  const getDefaultPermissions = (role) => {
    // Default permissions based on role
    const defaultPerms = {
      owner: {
        can_view_dashboard: true,
        can_view_tasks: true,
        can_create_tasks: true,
        can_edit_tasks: true,
        can_delete_tasks: true,
        can_view_notes: true,
        can_create_notes: true,
        can_edit_notes: true,
        can_delete_notes: true,
        can_view_hr: true,
        can_edit_hr: true,
        can_view_finance: true,
        can_edit_finance: true,
        can_view_inventory: true,
        can_edit_inventory: true,
        can_view_projects: true,
        can_edit_projects: true,
        can_view_pos: true,
        can_use_pos: true,
        can_edit_pos_transactions: true,
        can_view_reports: true,
        can_manage_members: true,
        can_manage_roles: true,
        can_view_settings: true,
        can_edit_settings: true
      },
      admin: {
        can_view_dashboard: true,
        can_view_tasks: true,
        can_create_tasks: true,
        can_edit_tasks: true,
        can_delete_tasks: true,
        can_view_notes: true,
        can_create_notes: true,
        can_edit_notes: true,
        can_delete_notes: true,
        can_view_hr: true,
        can_edit_hr: true,
        can_view_finance: true,
        can_edit_finance: true,
        can_view_inventory: true,
        can_edit_inventory: true,
        can_view_projects: true,
        can_edit_projects: true,
        can_view_pos: true,
        can_use_pos: true,
        can_edit_pos_transactions: true,
        can_view_reports: true,
        can_manage_members: false,
        can_manage_roles: false,
        can_view_settings: true,
        can_edit_settings: false
      },
      transaction_admin: {
        can_view_dashboard: true,
        can_view_tasks: false,
        can_create_tasks: false,
        can_edit_tasks: false,
        can_delete_tasks: false,
        can_view_notes: false,
        can_create_notes: false,
        can_edit_notes: false,
        can_delete_notes: false,
        can_view_hr: false,
        can_edit_hr: false,
        can_view_finance: false,
        can_edit_finance: false,
        can_view_inventory: true,
        can_edit_inventory: false,
        can_view_projects: false,
        can_edit_projects: false,
        can_view_pos: true,
        can_use_pos: true,
        can_edit_pos_transactions: false,
        can_view_reports: true,
        can_manage_members: false,
        can_manage_roles: false,
        can_view_settings: false,
        can_edit_settings: false
      },
      stock_admin: {
        can_view_dashboard: true,
        can_view_tasks: false,
        can_create_tasks: false,
        can_edit_tasks: false,
        can_delete_tasks: false,
        can_view_notes: false,
        can_create_notes: false,
        can_edit_notes: false,
        can_delete_notes: false,
        can_view_hr: false,
        can_edit_hr: false,
        can_view_finance: false,
        can_edit_finance: false,
        can_view_inventory: true,
        can_edit_inventory: true,
        can_view_projects: false,
        can_edit_projects: false,
        can_view_pos: true,
        can_use_pos: false,
        can_edit_pos_transactions: false,
        can_view_reports: true,
        can_manage_members: false,
        can_manage_roles: false,
        can_view_settings: false,
        can_edit_settings: false
      },
      employee: {
        can_view_dashboard: true,
        can_view_tasks: true,
        can_create_tasks: true,
        can_edit_tasks: true,
        can_delete_tasks: false,
        can_view_notes: true,
        can_create_notes: true,
        can_edit_notes: true,
        can_delete_notes: false,
        can_view_hr: false,
        can_edit_hr: false,
        can_view_finance: false,
        can_edit_finance: false,
        can_view_inventory: false,
        can_edit_inventory: false,
        can_view_projects: false,
        can_edit_projects: false,
        can_view_pos: false,
        can_use_pos: false,
        can_edit_pos_transactions: false,
        can_view_reports: false,
        can_manage_members: false,
        can_manage_roles: false,
        can_view_settings: false,
        can_edit_settings: false
      }
    };

    return defaultPerms[role] || defaultPerms.employee;
  };

  // Check if user is authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <Card className="bg-gray-900 border-gray-700 max-w-md">
          <CardContent className="p-8 text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
            <p className="text-gray-400 mb-6">
              Anda harus login untuk mengakses halaman ini.
            </p>
            <Button
              onClick={() => window.location.href = createPageUrl('Home')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if company context is selected
  if (!selectedCompany) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <Card className="bg-gray-900 border-gray-700 max-w-md">
          <CardContent className="p-8 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white mb-2">Company Required</h2>
            <p className="text-gray-400 mb-6">
              Silakan pilih perusahaan terlebih dahulu menggunakan <strong>Company Switcher</strong> di header.
            </p>
            <div className="space-y-2 text-sm text-gray-400 text-left bg-gray-800 p-4 rounded-lg">
              <p>💡 <strong className="text-white">Tips:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Klik dropdown "Personal" di header</li>
                <li>Pilih perusahaan yang tersedia</li>
                <li>Atau buat perusahaan baru (jika Business+)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Still checking access
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-gray-400">Checking access...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <Card className="bg-gray-900 border-gray-700 max-w-md">
          <CardContent className="p-8 text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-6">
              Anda tidak memiliki akses ke perusahaan <strong className="text-white">{selectedCompany.name}</strong>.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Hubungi owner atau admin perusahaan untuk mendapatkan akses.
            </p>
            <Button
              onClick={() => window.location.href = createPageUrl('Dashboard')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ CRITICAL: Show read-only warning banner if expired (but allow read access)
  if (isReadOnlyMode && !allowReadOnly) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-4xl mx-auto">
          <Alert className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <p className="font-bold text-lg mb-2">⚠️ MEMBERSHIP EXPIRED - MODE READ-ONLY</p>
              <p className="text-sm mb-3">
                Fitur bisnis tidak dapat digunakan. Anda hanya bisa melihat data yang sudah ada.
              </p>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.location.href = createPageUrl('Pricing')}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Perpanjang Sekarang
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.href = createPageUrl('Dashboard')}
                >
                  Kembali
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-8 text-center">
              <Lock className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white mb-2">Fitur Dinonaktifkan</h2>
              <p className="text-gray-400 mb-4">
                Membership Anda telah berakhir. Perpanjang untuk menggunakan fitur ini kembali.
              </p>
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 text-sm text-yellow-200">
                <p>💡 Anda masih bisa melihat data yang sudah dibuat</p>
                <p>❌ Tidak bisa menambah atau edit data baru</p>
                <p>⏰ Dalam 3 hari akan kembali ke Free Plan</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // User has access - pass permissions to children
  return React.cloneElement(children, {
    memberRole,
    permissions,
    isOwner: memberRole === 'owner',
    isReadOnlyMode
  });
}

/**
 * Hook to check specific permission
 */
export function usePermission(permission, selectedCompany, currentUser) {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const checkPerm = async () => {
      if (!selectedCompany || !currentUser) {
        setHasPermission(false);
        return;
      }

      // Owner has all permissions
      if (selectedCompany.owner_email === currentUser.email) {
        setHasPermission(true);
        return;
      }

      // Check member permissions
      try {
        const members = await base44.entities.CompanyMember.filter({
          company_id: selectedCompany.id,
          user_email: currentUser.email,
          status: 'active'
        });

        if (members && members.length > 0) {
          const member = members[0];
          setHasPermission(member.permissions?.[permission] === true);
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      }
    };

    checkPerm();
  }, [permission, selectedCompany, currentUser]);

  return hasPermission;
}