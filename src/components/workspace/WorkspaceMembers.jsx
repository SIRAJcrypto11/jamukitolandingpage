import React, { useState, useMemo } from 'react';
import { WorkspaceMember } from '@/entities/WorkspaceMember';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Crown, Shield, User, Eye, Mail, MoreHorizontal, Trash2, Search, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const roleColors = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200 border border-red-300 dark:border-red-700',
  member: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-300 dark:border-blue-700',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-700/60 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
};

const roleNames = { owner: 'Pemilik', admin: 'Admin', member: 'Anggota', viewer: 'Peninjau' };
const roleIcons = { owner: Crown, admin: Shield, member: User, viewer: Eye };
const roleDescriptions = {
  owner: 'Akses penuh, kontrol semua pengaturan',
  admin: 'Akses penuh kecuali pengaturan workspace',
  member: 'Dapat membuat dan mengedit tugas',
  viewer: 'Hanya dapat melihat konten'
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500'
];

function getAvatarColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function WorkspaceMembers({ workspaceId, members, workspace, userRole, onUpdate, companyMembers = [] }) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const canManageMembers = userRole === 'owner' || userRole === 'admin';

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) { toast.error('Email tidak boleh kosong'); return; }
    if (!canManageMembers) { toast.error('Anda tidak memiliki izin'); return; }

    setIsInviting(true);
    try {
      const existingMember = members.find(m => m.user_id === inviteEmail);
      if (existingMember) { toast.error('Pengguna sudah menjadi anggota'); setIsInviting(false); return; }

      const targetWorkspaceId = workspaceId || workspace?.id;
      if (!targetWorkspaceId) { toast.error('ID Workspace tidak ditemukan'); setIsInviting(false); return; }

      await WorkspaceMember.create({
        workspace_id: targetWorkspaceId,
        user_id: inviteEmail,
        role: inviteRole,
        invited_by: workspace.owner_id,
        joined_at: new Date().toISOString(),
        permissions: {
          can_create_tasks: true,
          can_edit_tasks: inviteRole !== 'viewer',
          can_delete_tasks: inviteRole === 'admin' || inviteRole === 'owner',
          can_invite_members: inviteRole === 'admin' || inviteRole === 'owner'
        }
      });

      window.dispatchEvent(new CustomEvent('workspaceMemberAdded', { detail: { workspaceId: targetWorkspaceId, memberEmail: inviteEmail, role: inviteRole } }));
      toast.success(`Undangan berhasil dikirim ke ${inviteEmail}!`);
      setShowInviteForm(false);
      setInviteEmail('');
      setInviteRole('member');
      onUpdate();
    } catch (error) {
      toast.error('Gagal mengundang anggota');
    }
    setIsInviting(false);
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!canManageMembers) { toast.error('Anda tidak memiliki izin'); return; }
    if (confirm(`Hapus ${memberName} dari workspace ini?`)) {
      try {
        await WorkspaceMember.delete(memberId);
        toast.success('Anggota berhasil dihapus');
        onUpdate();
      } catch (error) { toast.error('Gagal menghapus anggota'); }
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    if (userRole !== 'owner') { toast.error('Hanya pemilik yang dapat mengubah peran'); return; }
    try {
      await WorkspaceMember.update(memberId, {
        role: newRole,
        permissions: {
          can_create_tasks: true,
          can_edit_tasks: newRole !== 'viewer',
          can_delete_tasks: newRole === 'admin' || newRole === 'owner',
          can_invite_members: newRole === 'admin' || newRole === 'owner'
        }
      });
      toast.success('Peran anggota berhasil diubah');
      onUpdate();
    } catch (error) { toast.error('Gagal mengubah peran'); }
  };

  // Build member list
  const ownerEntry = { id: 'owner', user_id: workspace.owner_id, role: 'owner', joined_at: workspace.created_date, isOwner: true };
  const seen = new Set([workspace.owner_id]);
  const dedupedMembers = members.filter(m => { if (seen.has(m.user_id)) return false; seen.add(m.user_id); return true; });
  const allMembers = [ownerEntry, ...dedupedMembers];

  // Filter & search
  const filteredMembers = useMemo(() => {
    return allMembers.filter(m => {
      const companyMember = companyMembers.find(cm => cm.user_email === m.user_id || cm.user_id === m.user_id);
      const displayName = companyMember?.user_name || m.user_id || '';
      const matchesSearch = displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.user_id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = filterRole === 'all' || m.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [allMembers, searchQuery, filterRole, companyMembers]);

  const roleCounts = useMemo(() => {
    const counts = {};
    allMembers.forEach(m => { counts[m.role] = (counts[m.role] || 0) + 1; });
    return counts;
  }, [allMembers]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Anggota Workspace
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{allMembers.length} anggota terdaftar</p>
        </div>
        {canManageMembers && (
          <Button onClick={() => setShowInviteForm(!showInviteForm)} className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-sm">
            <UserPlus className="w-4 h-4" />
            Undang Anggota
          </Button>
        )}
      </div>

      {/* Role Summary Pills */}
      <div className="flex flex-wrap gap-2">
        {['all', 'owner', 'admin', 'member', 'viewer'].map(role => {
          const count = role === 'all' ? allMembers.length : (roleCounts[role] || 0);
          if (role !== 'all' && count === 0) return null;
          const RoleIcon = role !== 'all' ? roleIcons[role] : Users;
          return (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filterRole === role
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-indigo-400'
              }`}
            >
              <RoleIcon className="w-3 h-3" />
              {role === 'all' ? 'Semua' : roleNames[role]}
              <span className={`rounded-full px-1.5 text-[10px] ${filterRole === role ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <Card className="border-2 border-indigo-100 dark:border-indigo-900 shadow-sm">
          <CardHeader className="pb-3 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900">
            <CardTitle className="text-base flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
              <UserPlus className="w-4 h-4" /> Undang Anggota Baru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Pengguna</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="email@contoh.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="pl-9"
                    onKeyDown={(e) => e.key === 'Enter' && handleInviteMember()}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Peran</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex flex-col">
                        <span className="font-medium">👁️ Peninjau</span>
                        <span className="text-xs text-gray-500">Hanya dapat melihat</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="member">
                      <div className="flex flex-col">
                        <span className="font-medium">👤 Anggota</span>
                        <span className="text-xs text-gray-500">Dapat membuat & mengedit tugas</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex flex-col">
                        <span className="font-medium">🛡️ Admin</span>
                        <span className="text-xs text-gray-500">Akses penuh kecuali pengaturan</span>
                      </div>
                    </SelectItem>
                    {userRole === 'owner' && (
                      <SelectItem value="owner">
                        <div className="flex flex-col">
                          <span className="font-medium">👑 Pemilik</span>
                          <span className="text-xs text-gray-500">Akses penuh dan kontrol workspace</span>
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowInviteForm(false); setInviteEmail(''); }}>
                Batal
              </Button>
              <Button size="sm" onClick={handleInviteMember} disabled={isInviting} className="bg-indigo-600 hover:bg-indigo-700">
                {isInviting ? 'Mengundang...' : 'Kirim Undangan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      {allMembers.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Cari anggota..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
      )}

      {/* Members Grid */}
      <div className="space-y-2">
        {filteredMembers.map((member) => {
          const RoleIcon = roleIcons[member.role] || User;
          const companyMember = companyMembers.find(cm => cm.user_email === member.user_id || cm.user_id === member.user_id);
          const displayName = companyMember?.user_name || member.user_id;
          const department = companyMember?.department;
          const position = companyMember?.position;
          const avatarColor = getAvatarColor(member.user_id || '');
          const joinedAt = member.joined_at && new Date(member.joined_at).getFullYear() > 1971
            ? format(new Date(member.joined_at), 'dd MMM yyyy', { locale: id })
            : companyMember?.joined_date
              ? format(new Date(companyMember.joined_date), 'dd MMM yyyy', { locale: id })
              : 'Tidak diketahui';

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback className={`${avatarColor} text-white font-bold text-sm`}>
                    {(displayName).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate max-w-[160px]">
                      {displayName}
                    </p>
                    <Badge className={`${roleColors[member.role]} text-xs font-medium px-2 py-0`}>
                      <RoleIcon className="w-2.5 h-2.5 mr-1" />
                      {roleNames[member.role]}
                    </Badge>
                    {member.isOwner && (
                      <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700 text-xs">
                        👑 Pemilik Workspace
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{member.user_id}</p>
                    {department && <Badge variant="outline" className="text-xs px-1.5 py-0">{department}</Badge>}
                    {position && <span className="text-xs text-gray-500 dark:text-gray-400">{position}</span>}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">Bergabung {joinedAt}</p>
                </div>
              </div>

              {!member.isOwner && canManageMembers && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {userRole === 'owner' && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ubah Peran</div>
                        {['owner', 'admin', 'member', 'viewer'].filter(r => r !== member.role).map(role => {
                          const Icon = roleIcons[role];
                          return (
                            <DropdownMenuItem key={role} onClick={() => handleChangeRole(member.id, role)}>
                              <Icon className="w-4 h-4 mr-2" />
                              Jadikan {roleNames[role]}
                            </DropdownMenuItem>
                          );
                        })}
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleRemoveMember(member.id, displayName)}
                      className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/30"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Hapus dari Workspace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}

        {filteredMembers.length === 0 && (
          <div className="text-center py-10 text-gray-400 dark:text-gray-600">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Tidak ada anggota yang cocok</p>
          </div>
        )}
      </div>
    </div>
  );
}