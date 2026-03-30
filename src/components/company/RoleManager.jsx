import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { UserPlus, Mail, Loader2, XCircle, Settings, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { invalidateCache } from '@/components/utils/requestManager';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';


const ROLE_TEMPLATES = {
  owner: {
    label: 'Owner',
    description: 'Akses penuh ke semua fitur',
    permissions: {
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
    }
  },
  admin: {
    label: 'Admin',
    description: 'Akses administratif penuh kecuali pengaturan perusahaan',
    permissions: {
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
      can_manage_roles: false,
      can_view_settings: true,
      can_edit_settings: false
    }
  },
  supervisor: {
    label: 'Supervisor',
    description: 'Supervisi tim dan approve requests',
    permissions: {
      can_view_dashboard: true,
      can_view_tasks: true,
      can_create_tasks: true,
      can_edit_tasks: true,
      can_delete_tasks: false,
      can_view_notes: true,
      can_create_notes: true,
      can_edit_notes: true,
      can_delete_notes: false,
      can_view_hr: true,
      can_edit_hr: false,
      can_view_finance: true,
      can_edit_finance: false,
      can_view_inventory: true,
      can_edit_inventory: false,
      can_view_projects: true,
      can_edit_projects: true,
      can_view_pos: true,
      can_use_pos: true,
      can_edit_pos_transactions: false,
      can_view_reports: true,
      can_manage_members: false,
      can_manage_roles: false,
      can_view_settings: false,
      can_edit_settings: false
    }
  },
  employee: {
    label: 'Employee',
    description: 'Karyawan biasa dengan akses terbatas',
    permissions: {
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
  }
};

const PERMISSION_GROUPS = {
  'Dashboard & Tasks': [
    { key: 'can_view_dashboard', label: 'Lihat Dashboard' },
    { key: 'can_view_tasks', label: 'Lihat Tugas' },
    { key: 'can_create_tasks', label: 'Buat Tugas' },
    { key: 'can_edit_tasks', label: 'Edit Tugas' },
    { key: 'can_delete_tasks', label: 'Hapus Tugas' }],

  'Notes': [
    { key: 'can_view_notes', label: 'Lihat Catatan' },
    { key: 'can_create_notes', label: 'Buat Catatan' },
    { key: 'can_edit_notes', label: 'Edit Catatan' },
    { key: 'can_delete_notes', label: 'Hapus Catatan' }],

  'HR & Payroll': [
    { key: 'can_view_hr', label: 'Lihat HR' },
    { key: 'can_edit_hr', label: 'Kelola HR' }],

  'Finance': [
    { key: 'can_view_finance', label: 'Lihat Keuangan' },
    { key: 'can_edit_finance', label: 'Kelola Keuangan' }],

  'Inventory': [
    { key: 'can_view_inventory', label: 'Lihat Inventory' },
    { key: 'can_edit_inventory', label: 'Kelola Inventory' }],

  'Projects': [
    { key: 'can_view_projects', label: 'Lihat Projects' },
    { key: 'can_edit_projects', label: 'Kelola Projects' }],

  'POS / Kasir': [
    { key: 'can_view_pos', label: 'Lihat POS' },
    { key: 'can_use_pos', label: 'Gunakan Kasir' },
    { key: 'can_edit_pos_transactions', label: 'Edit Transaksi POS' }],

  'Reports & Management': [
    { key: 'can_view_reports', label: 'Lihat Laporan' },
    { key: 'can_manage_members', label: 'Kelola Anggota' },
    { key: 'can_manage_roles', label: 'Kelola Role' },
    { key: 'can_view_settings', label: 'Lihat Pengaturan' },
    { key: 'can_edit_settings', label: 'Edit Pengaturan' }]

};

export default function RoleManager({ selectedCompany, currentUser }) {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviteDepartment, setInviteDepartment] = useState('');
  const [invitePosition, setInvitePosition] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [invitePermissions, setInvitePermissions] = useState(ROLE_TEMPLATES.employee.permissions);
  const [customPermissions, setCustomPermissions] = useState(false);

  // ✅ FIX: Check both original owner AND invited owner role
  const isOriginalOwner = selectedCompany && currentUser && selectedCompany.owner_email === currentUser.email;

  // ✅ NEW: State for member permission check (for invited owners/admins)
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [canManageMembers, setCanManageMembers] = useState(false);

  // ✅ FIX: Check user's role in company on mount
  useEffect(() => {
    const checkUserRole = async () => {
      if (!selectedCompany?.id || !currentUser?.email) {
        setCanManageMembers(isOriginalOwner);
        return;
      }

      // Original owner always has full access
      if (isOriginalOwner) {
        setCurrentUserRole('owner');
        setCanManageMembers(true);
        console.log('✅ User is original owner - full access');
        return;
      }

      // Check if user is a member with owner/admin role
      try {
        console.log('🔍 Checking user role in company...');
        let memberData = null;

        // Try to get user's membership
        try {
          const members = await base44.entities.CompanyMember.filter({
            company_id: selectedCompany.id,
            user_email: currentUser.email
          });
          memberData = members?.[0];
        } catch (e) {
          // Fallback to service role
          try {
            const members = await base44.asServiceRole.entities.CompanyMember.filter({
              company_id: selectedCompany.id,
              user_email: currentUser.email
            });
            memberData = members?.[0];
          } catch (e2) {
            console.warn('Could not check membership:', e2);
          }
        }

        if (memberData) {
          setCurrentUserRole(memberData.role);

          // ✅ CRITICAL: Check if role is owner OR has can_manage_members permission
          const hasOwnerRole = memberData.role === 'owner';
          const hasAdminRole = memberData.role === 'admin';
          const hasManagePermission = memberData.permissions?.can_manage_members === true;

          const canManage = hasOwnerRole || hasAdminRole || hasManagePermission;
          setCanManageMembers(canManage);

          console.log('✅ User role:', memberData.role);
          console.log('✅ Can manage members:', canManage);
        } else {
          console.log('⚠️ User is not a member of this company');
          setCanManageMembers(false);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setCanManageMembers(isOriginalOwner);
      }
    };

    checkUserRole();
  }, [selectedCompany?.id, currentUser?.email, isOriginalOwner]);

  // ✅ Backward compatibility: isOwner now includes invited owners
  const isOwner = canManageMembers;

  useEffect(() => {
    if (selectedCompany) {
      loadData();
    }
  }, [selectedCompany]);

  // ROBUST MEMBER LOADING - Multiple fallback strategies
  const loadMembers = async () => {
    if (!selectedCompany) return;

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('👥 ROLE MANAGER - LOADING MEMBERS');
    console.log('═══════════════════════════════════════════');
    console.log('🏢 Company:', selectedCompany.name);
    console.log('🆔 Company ID:', selectedCompany.id);
    console.log('');

    try {
      let membersData = [];
      let loadSuccess = false;

      // STRATEGY 1: Direct filter dengan base44.entities (fresh, no cache)
      console.log('🔹 Strategy 1: Direct filter...');
      try {
        membersData = await base44.entities.CompanyMember.filter({
          company_id: selectedCompany.id
        });

        console.log(`✅ Strategy 1 SUCCESS - Found ${membersData?.length || 0} members`);
        loadSuccess = true;
      } catch (e) {
        console.warn(`❌ Strategy 1 failed:`, e.message);
      }

      // STRATEGY 2: Service role filter (admin privileges)
      if (!loadSuccess || !membersData || membersData.length === 0) {
        console.log('');
        console.log('🔹 Strategy 2: Service role filter...');
        try {
          membersData = await base44.asServiceRole.entities.CompanyMember.filter({
            company_id: selectedCompany.id
          });

          console.log(`✅ Strategy 2 SUCCESS - Found ${membersData?.length || 0} members`);
          loadSuccess = true;
        } catch (e) {
          console.warn(`❌ Strategy 2 failed:`, e.message);
        }
      }

      // STRATEGY 3: List all + manual filter (last resort)
      if (!loadSuccess || !membersData || membersData.length === 0) {
        console.log('');
        console.log('🔹 Strategy 3: List all + manual filter...');
        try {
          const allMembers = await base44.asServiceRole.entities.CompanyMember.list();
          console.log(`   - Total members in DB: ${allMembers?.length || 0}`);

          membersData = (allMembers || []).filter(m =>
            m && m.company_id === selectedCompany.id
          );

          console.log(`✅ Strategy 3 SUCCESS - Found ${membersData.length} members after filter`);
          loadSuccess = true;
        } catch (e) {
          console.warn(`❌ Strategy 3 failed:`, e.message);
        }
      }

      // Final result
      if (!loadSuccess) {
        console.error('❌❌❌ ALL STRATEGIES FAILED - No members loaded');
        membersData = [];
      }

      console.log('');
      console.log('📊 FINAL RESULT:');
      console.log(`   - Members loaded: ${membersData?.length || 0}`);

      if (membersData && membersData.length > 0) {
        membersData.forEach((m, i) => {
          console.log(`   ${i + 1}. ${m.user_name || m.user_email} (${m.role})`);
        });
      } else {
        console.log('   ⚠️ No members found for this company');
      }

      console.log('═══════════════════════════════════════════');
      console.log('');

      setMembers(membersData || []);

    } catch (error) {
      console.error('❌ Critical error loading members:', error);
      toast.error('Gagal memuat daftar anggota');
      setMembers([]);
    }
  };

  const loadInvitations = async () => {
    if (!selectedCompany || !currentUser) return;
    try {
      const data = await base44.entities.CompanyInvitation.filter({
        company_id: selectedCompany.id,
        invited_by: currentUser.email
      });
      const pendingInvitations = (data || []).filter((inv) => inv.status === 'pending');
      setInvitations(pendingInvitations);
    } catch (error) {
      console.error('Error loading invitations:', error);
      setInvitations([]);
    }
  };

  const loadData = async () => {
    if (!selectedCompany) return;
    setIsLoading(true);
    try {
      await loadMembers();
      if (isOwner) {
        await loadInvitations();
      }
    } catch (error) {
      console.error('Error loading company data:', error);
      toast.error('Gagal memuat data perusahaan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (role) => {
    setInviteRole(role);
    if (!customPermissions && ROLE_TEMPLATES[role]) {
      setInvitePermissions(ROLE_TEMPLATES[role].permissions);
    }
  };

  const togglePermission = (key) => {
    setInvitePermissions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleInvite = async (e) => {
    e.preventDefault();

    if (!inviteEmail || !inviteRole) {
      toast.error('Email dan role harus diisi');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Format email tidak valid');
      return;
    }

    try {
      setIsLoading(true);
      toast.loading('Memeriksa undangan...', { id: 'invite-check' });

      // ✅ STEP 1: Check existing invitations
      const existingInvites = await base44.entities.CompanyInvitation.filter({
        company_id: selectedCompany.id,
        invited_email: inviteEmail,
        status: 'pending'
      });

      if (existingInvites && existingInvites.length > 0) {
        toast.error('User ini sudah memiliki undangan pending', { id: 'invite-check' });
        setIsLoading(false);
        return;
      }

      // ✅ STEP 2: Check existing members
      const existingMembers = await base44.entities.CompanyMember.filter({
        company_id: selectedCompany.id,
        user_email: inviteEmail
      });

      if (existingMembers && existingMembers.length > 0) {
        toast.error('User ini sudah menjadi anggota perusahaan', { id: 'invite-check' });
        setIsLoading(false);
        return;
      }

      toast.loading('Mengirim undangan...', { id: 'invite-check' });

      // ✅ STEP 3: Create invitation with expiry (30 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const invitationData = {
        company_id: selectedCompany.id,
        company_name: selectedCompany.name,
        invited_email: inviteEmail,
        invited_by: currentUser.email,
        invited_by_name: currentUser.full_name || currentUser.email,
        role: inviteRole,
        department: inviteDepartment || '',
        position: invitePosition || '',
        permissions: invitePermissions,
        message: inviteMessage || `Bergabunglah dengan ${selectedCompany.name} sebagai ${inviteRole}`,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      };

      const newInvitation = await base44.entities.CompanyInvitation.create(invitationData);

      // ✅ STEP 4: Create notification
      try {
        await base44.entities.Notification.create({
          user_id: inviteEmail,
          title: `Undangan Bergabung dengan ${selectedCompany.name}`,
          message: `${currentUser.full_name || currentUser.email} mengundang Anda untuk bergabung dengan ${selectedCompany.name} sebagai ${inviteRole}`,
          url: '/dashboard',
          is_read: false
        });
      } catch (error) {
        console.log('⚠️ Could not create notification:', error);
      }

      // ✅ STEP 5: Broadcast
      try {
        const channel = new BroadcastChannel('snishop_invitation_updates');
        channel.postMessage({
          type: 'INVITATION_CREATED',
          invitedEmail: inviteEmail,
          invitation: {
            id: newInvitation.id,
            company_id: selectedCompany.id,
            company_name: selectedCompany.name,
            invited_by: currentUser.email,
            invited_by_name: currentUser.full_name || currentUser.email,
            role: inviteRole,
            department: inviteDepartment,
            position: invitePosition,
            permissions: invitePermissions,
            message: inviteMessage
          },
          timestamp: Date.now()
        });
        channel.close();
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }

      toast.success(`✅ Undangan berhasil dikirim ke ${inviteEmail}!`, { id: 'invite-check' });

      // ✅ STEP 6: Reset form
      setInviteEmail('');
      setInviteRole('employee');
      setInviteDepartment('');
      setInvitePosition('');
      setInviteMessage('');
      setInvitePermissions(ROLE_TEMPLATES.employee.permissions);
      setCustomPermissions(false);
      setShowInviteForm(false);

      // ✅ STEP 7: Reload invitations
      invalidateCache(/CompanyInvitation/);
      await loadInvitations();

    } catch (error) {
      console.error('❌ Error sending invitation:', error);
      toast.error(`Gagal mengirim undangan: ${error.message}`, { id: 'invite-check' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan undangan ini?')) return;

    try {
      setIsLoading(true);
      await base44.entities.CompanyInvitation.update(invitationId, {
        status: 'expired'
      });

      toast.success('Undangan dibatalkan');
      invalidateCache(/CompanyInvitation/);
      await loadInvitations();

    } catch (error) {
      console.error('Error canceling invitation:', error);
      toast.error('Gagal membatalkan undangan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendInvitation = async (invitation) => {
    try {
      setIsLoading(true);

      // Re-create notification
      try {
        await base44.entities.Notification.create({
          user_id: invitation.invited_email,
          title: `🔔 Reminder: Undangan Bergabung dengan ${invitation.company_name}`,
          message: `${invitation.invited_by_name} mengirim ulang undangan untuk bergabung dengan ${invitation.company_name} sebagai ${invitation.role}`,
          url: '/dashboard',
          is_read: false
        });
      } catch (error) {
        console.log('⚠️ Could not create notification:', error);
      }

      // Re-broadcast
      try {
        const channel = new BroadcastChannel('snishop_invitation_updates');
        channel.postMessage({
          type: 'INVITATION_CREATED',
          invitedEmail: invitation.invited_email,
          invitation: {
            id: invitation.id,
            company_id: invitation.company_id,
            company_name: invitation.company_name,
            invited_by: invitation.invited_by,
            invited_by_name: invitation.invited_by_name,
            role: invitation.role,
            department: invitation.department,
            position: invitation.position,
            permissions: invitation.permissions,
            message: invitation.message
          },
          timestamp: Date.now()
        });
        channel.close();
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }

      toast.success(`✅ Undangan berhasil dikirim ulang ke ${invitation.invited_email}!`);

    } catch (error) {
      console.error('❌ Error resending invitation:', error);
      toast.error('Gagal mengirim ulang undangan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMember = (member) => {
    setEditingMember({
      ...member,
      selectedRole: member.role,
      customPermissions: { ...(member.permissions || {}) }
    });
    setShowEditForm(true);
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;

    try {
      setIsLoading(true);

      const updateData = {
        role: editingMember.selectedRole,
        permissions: editingMember.customPermissions,
        department: editingMember.department,
        position: editingMember.position
      };

      await base44.entities.CompanyMember.update(editingMember.id, updateData);
      invalidateCache(/CompanyMember/);

      // Broadcast
      try {
        const channel = new BroadcastChannel('snishop_member_updates');
        channel.postMessage({
          type: 'PERMISSIONS_UPDATED',
          memberId: editingMember.id,
          memberEmail: editingMember.user_email,
          companyId: selectedCompany.id,
          timestamp: Date.now()
        });
        channel.close();
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }

      toast.success('✅ Anggota berhasil diperbarui!');

      setShowEditForm(false);
      setEditingMember(null);
      await loadData();

    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('Gagal memperbarui anggota');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChangeForEdit = (role) => {
    if (!editingMember) return;

    const template = ROLE_TEMPLATES[role];

    // ✅ FIX: When changing to owner role, ensure ALL permissions are true
    const newPermissions = template?.permissions || {};

    console.log(`🔄 Role changed to ${role} - syncing permissions:`, newPermissions);

    setEditingMember({
      ...editingMember,
      selectedRole: role,
      customPermissions: { ...newPermissions }
    });
  };

  const handlePermissionToggleForEdit = (permissionKey) => {
    if (!editingMember) return;

    setEditingMember({
      ...editingMember,
      customPermissions: {
        ...editingMember.customPermissions,
        [permissionKey]: !editingMember.customPermissions[permissionKey]
      }
    });
  };

  const handleDeleteMember = async (memberId) => {
    if (!confirm('Yakin ingin menghapus anggota ini?')) return;

    try {
      setIsLoading(true);
      await base44.entities.CompanyMember.delete(memberId);
      invalidateCache(/CompanyMember/);
      toast.success('Anggota berhasil dihapus');
      await loadData();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('Gagal menghapus anggota');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">
          Anda tidak memiliki akses untuk mengelola anggota perusahaan.
        </p>
        <p className="text-gray-400 text-xs mt-2">
          Hanya Owner, Admin, atau user dengan izin "Kelola Anggota" yang dapat mengundang anggota baru.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-semibold truncate">Anggota Tim</h3>
          <p className="text-xs sm:text-sm text-gray-500 truncate">Kelola anggota dan izin akses</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast.info('Memuat ulang data member...');
              loadData();
            }}
            className="min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowInviteForm(true)} className="w-full sm:w-auto min-h-[44px] flex-shrink-0">
            <UserPlus className="w-4 h-4 mr-2" />
            Undang Anggota
          </Button>
        </div>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <div className="w-full overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 pb-2 sm:pb-0">
          <TabsList className="inline-flex sm:grid sm:grid-cols-2 w-auto sm:w-full min-w-max">
            <TabsTrigger value="members" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
              Anggota Aktif ({members.length})
            </TabsTrigger>
            <TabsTrigger value="invitations" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
              Undangan Pending ({invitations.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="members" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-sm sm:text-base">Daftar Anggota Aktif</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm mb-4">Belum ada anggota. Undang anggota baru untuk memulai.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('🔄 Manual refresh clicked');
                      loadData();
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Data
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="bg-gray-950 dark:bg-gray-800 p-3 sm:p-4 rounded-lg"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm sm:text-base truncate">{member.user_name || member.user_email}</div>
                          <div className="text-xs sm:text-sm text-gray-500 truncate">{member.user_email}</div>
                          <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                            <Badge className="bg-purple-600 text-white text-xs">{member.role}</Badge>
                            {member.department && (
                              <Badge variant="secondary" className="text-xs">{member.department}</Badge>
                            )}
                            {member.position && (
                              <Badge variant="outline" className="text-xs">{member.position}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditMember(member)}
                            className="flex-1 sm:flex-none min-h-[36px] text-xs sm:text-sm"
                          >
                            <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Edit
                          </Button>
                          {member.role !== 'owner' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteMember(member.id)}
                              className="text-red-600 hover:text-red-700 min-h-[36px]"
                            >
                              <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <h3 className="text-base sm:text-lg font-semibold">Undangan Pending</h3>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : invitations.length === 0 ? (
            <Card>
              <CardContent className="p-6 sm:p-8 text-center text-gray-500">
                <p className="text-sm">Tidak ada undangan pending</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {invitations.map((invitation) => (
                <Card key={invitation.id} className="border-blue-200">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                          <h4 className="font-semibold text-sm sm:text-base truncate">{invitation.invited_email}</h4>
                        </div>

                        <div className="flex flex-wrap gap-1 sm:gap-2 mb-2">
                          <Badge className="bg-purple-600 text-white text-xs">
                            {invitation.role}
                          </Badge>
                          {invitation.department && (
                            <Badge variant="secondary" className="text-xs">{invitation.department}</Badge>
                          )}
                          {invitation.position && (
                            <Badge variant="outline" className="text-xs">{invitation.position}</Badge>
                          )}
                          <Badge variant="outline" className="text-orange-600 text-xs">
                            Pending
                          </Badge>
                        </div>

                        {invitation.message && (
                          <p className="text-xs sm:text-sm text-gray-600 mt-2 line-clamp-2">"{invitation.message}"</p>
                        )}
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendInvitation(invitation)}
                          disabled={isLoading}
                          className="w-full sm:w-auto min-h-[36px] text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white border-green-600"
                        >
                          <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Kirim Ulang
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                          disabled={isLoading}
                          className="w-full sm:w-auto min-h-[36px] text-xs sm:text-sm"
                        >
                          <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Batalkan
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      <Dialog open={showInviteForm} onOpenChange={setShowInviteForm}>
        <DialogContent className="bg-slate-950 p-4 sm:p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Undang Anggota Baru</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <Label htmlFor="inviteEmail">Email *</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inviteRole">Role *</Label>
                <Select value={inviteRole} onValueChange={handleRoleChange}>
                  <SelectTrigger id="inviteRole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                      <SelectItem key={key} value={key}>
                        {template.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {ROLE_TEMPLATES[inviteRole] && (
                  <p className="text-xs text-gray-500 mt-1">
                    {ROLE_TEMPLATES[inviteRole].description}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="inviteDepartment">Department</Label>
                <Input
                  id="inviteDepartment"
                  value={inviteDepartment}
                  onChange={(e) => setInviteDepartment(e.target.value)}
                  placeholder="Engineering, Sales, etc"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="invitePosition">Position</Label>
              <Input
                id="invitePosition"
                value={invitePosition}
                onChange={(e) => setInvitePosition(e.target.value)}
                placeholder="Software Engineer, Sales Manager, etc"
              />
            </div>

            <div>
              <Label htmlFor="inviteMessage">Pesan (Optional)</Label>
              <Input
                id="inviteMessage"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Pesan untuk yang diundang..."
              />
            </div>

            <div className="bg-gray-950 p-4 rounded-lg flex items-center gap-2">
              <Switch
                id="customPermissionsToggle"
                checked={customPermissions}
                onCheckedChange={setCustomPermissions}
              />
              <div>
                <Label htmlFor="customPermissionsToggle" className="cursor-pointer">Custom Permissions</Label>
                <p className="text-xs text-gray-500">
                  Aktifkan untuk mengatur hak akses secara manual
                </p>
              </div>
            </div>

            {customPermissions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Atur Hak Akses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                      <AccordionItem key={groupName} value={groupName}>
                        <AccordionTrigger>{groupName}</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 p-2">
                            {permissions.map((perm) => (
                              <div key={perm.key} className="flex items-center justify-between">
                                <Label htmlFor={perm.key} className="cursor-pointer">
                                  {perm.label}
                                </Label>
                                <Switch
                                  id={perm.key}
                                  checked={invitePermissions[perm.key]}
                                  onCheckedChange={() => togglePermission(perm.key)}
                                />
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowInviteForm(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Kirim Undangan
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      {showEditForm && editingMember && (
        <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
          <DialogContent className="bg-gray-950 p-4 sm:p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Anggota - {editingMember.user_name || editingMember.user_email}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editDepartment">Department</Label>
                  <Input
                    id="editDepartment"
                    value={editingMember.department || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, department: e.target.value })}
                    placeholder="Department"
                  />
                </div>

                <div>
                  <Label htmlFor="editPosition">Position</Label>
                  <Input
                    id="editPosition"
                    value={editingMember.position || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, position: e.target.value })}
                    placeholder="Position"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editRole">Role Template</Label>
                <Select value={editingMember.selectedRole} onValueChange={handleRoleChangeForEdit}>
                  <SelectTrigger id="editRole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                      <SelectItem key={key} value={key}>
                        <div>
                          <div className="font-medium">{template.label}</div>
                          <div className="text-xs text-gray-500">{template.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Custom Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                      <AccordionItem key={groupName} value={groupName}>
                        <AccordionTrigger className="text-sm font-medium">
                          {groupName}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pl-4">
                            {permissions.map((perm) => (
                              <div key={perm.key} className="flex items-center justify-between py-2">
                                <Label htmlFor={`edit-${perm.key}`} className="text-sm">
                                  {perm.label}
                                </Label>
                                <Switch
                                  id={`edit-${perm.key}`}
                                  checked={editingMember.customPermissions[perm.key] || false}
                                  onCheckedChange={() => handlePermissionToggleForEdit(perm.key)}
                                />
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowEditForm(false); setEditingMember(null); }}>
                  Batal
                </Button>
                <Button onClick={handleUpdateMember} disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Simpan Perubahan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}