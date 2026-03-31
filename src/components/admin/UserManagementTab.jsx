import React from 'react';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Search, UserCog, Crown, Edit, Loader2, Zap, CheckCircle, Calendar, Clock, Database, Activity, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { invalidateCache } from '@/components/utils/requestManager';
import { format, addMonths, addYears, differenceInDays } from 'date-fns';

const ADMIN_TIER_LABELS = {
  none: 'Regular User',
  business: 'Admin Business',
  advanced: 'Admin Advanced',
  enterprise: 'Admin Enterprise'
};

const ADMIN_TYPE_LABELS = {
  owner: 'Admin Owner',
  basic: 'Admin Transaksi'
};

const MEMBERSHIP_LABELS = {
  free: 'Gratis',
  pro: 'Pro',
  business: 'Business',
  advanced: 'Advanced',
  enterprise: 'Enterprise'
};

const MEMBERSHIP_COLORS = {
  free: 'bg-gray-600',
  pro: 'bg-blue-600',
  business: 'bg-green-600',
  advanced: 'bg-purple-600',
  enterprise: 'bg-yellow-600'
};

const DURATION_OPTIONS = [
  { value: 'monthly', label: '1 Bulan' },
  { value: 'yearly', label: '1 Tahun' },
  { value: 'custom', label: 'Custom Tanggal' },
  { value: 'lifetime', label: 'Selamanya (Lifetime)' }
];

const getMembershipStatus = (user) => {
  // ✅ HANDLE NO DATE - Calculate default dates if missing
  if (!user.membership_end_date) {
    // Jika user punya membership plan (bukan free) tapi belum ada dates
    if (user.subscription_plan && user.subscription_plan !== 'free') {
      // Default: set 30 hari dari sekarang (perlu di-set manual oleh admin)
      const now = new Date();
      const defaultEndDate = addMonths(now, 1);
      const daysRemaining = differenceInDays(defaultEndDate, now);
      
      return { 
        status: 'needs_setup', 
        days: daysRemaining, 
        color: 'orange', 
        label: `${daysRemaining} hari (Perlu Set Manual)`,
        percentage: 50,
        needsSetup: true
      };
    }
    
    // Free plan users
    return { 
      status: 'free_plan', 
      days: 0, 
      color: 'gray', 
      label: 'Free Plan - No Expiry',
      percentage: 0,
      needsSetup: false
    };
  }
  
  if (user.membership_duration_type === 'lifetime') {
    return { status: 'lifetime', days: null, color: 'yellow', label: '♾️ Lifetime', percentage: 100, needsSetup: false };
  }
  
  const startDate = user.membership_start_date ? new Date(user.membership_start_date) : new Date();
  const endDate = new Date(user.membership_end_date);
  const now = new Date();
  const daysRemaining = differenceInDays(endDate, now);
  const totalDays = differenceInDays(endDate, startDate);
  const percentage = totalDays > 0 ? Math.max(0, Math.min(100, (daysRemaining / totalDays) * 100)) : 0;

  if (daysRemaining < 0) {
    return { 
      status: 'expired', 
      days: Math.abs(daysRemaining), 
      color: 'red', 
      label: `Expired ${Math.abs(daysRemaining)}h lalu`,
      percentage: 0,
      needsSetup: false
    };
  } else if (daysRemaining === 0) {
    return { status: 'today', days: 0, color: 'red', label: 'Berakhir Hari Ini!', percentage: 1, needsSetup: false };
  } else if (daysRemaining <= 3) {
    return { status: 'critical', days: daysRemaining, color: 'red', label: `${daysRemaining} hari lagi`, percentage, needsSetup: false };
  } else if (daysRemaining <= 7) {
    return { status: 'expiring', days: daysRemaining, color: 'yellow', label: `${daysRemaining} hari lagi`, percentage, needsSetup: false };
  } else {
    return { status: 'active', days: daysRemaining, color: 'green', label: `${daysRemaining} hari lagi`, percentage, needsSetup: false };
  }
};

export default function UserManagementTab({ currentAdmin }) {
  const [users, setUsers] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [editingUser, setEditingUser] = React.useState(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastUpdate, setLastUpdate] = React.useState(new Date());

  React.useEffect(() => {
    loadUsers();
  }, []);

  React.useEffect(() => {
    const channel = new BroadcastChannel('snishop_user_updates');

    channel.onmessage = (event) => {
      const { type, userId, updatedData } = event.data;

      if (type === 'USER_UPDATED' && userId) {
        setUsers((prevUsers) => 
          prevUsers.map((user) => 
            user.id === userId 
              ? { ...user, ...updatedData }
              : user
          )
        );
        setLastUpdate(new Date());
        toast.success('✅ Data user terupdate real-time!', { duration: 2000 });
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  React.useEffect(() => {
    const interval = setInterval(() => {
      loadUsers();
      setLastUpdate(new Date());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const allUsers = await User.list();
      setUsers(allUsers || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    setEditingUser({
      ...user,
      admin_type: user.admin_type || '',
      admin_tier: user.admin_tier || 'none',
      subscription_plan: user.subscription_plan || 'free',
      membership_duration_type: user.membership_duration_type || 'monthly',
      membership_start_date: user.membership_start_date || today,
      membership_end_date: user.membership_end_date || format(addMonths(new Date(), 1), 'yyyy-MM-dd')
    });
    setShowEditModal(true);
  };

  const handleDurationTypeChange = (durationType) => {
    const startDate = new Date(editingUser.membership_start_date || new Date());
    let endDate;

    if (durationType === 'monthly') {
      endDate = addMonths(startDate, 1);
    } else if (durationType === 'yearly') {
      endDate = addYears(startDate, 1);
    } else if (durationType === 'lifetime') {
      endDate = addYears(startDate, 100);
    } else {
      endDate = editingUser.membership_end_date ? new Date(editingUser.membership_end_date) : addMonths(startDate, 1);
    }

    setEditingUser({
      ...editingUser,
      membership_duration_type: durationType,
      membership_end_date: format(endDate, 'yyyy-MM-dd')
    });
  };

  const handleStartDateChange = (newStartDate) => {
    const durationType = editingUser.membership_duration_type;
    const startDate = new Date(newStartDate);
    let endDate;

    if (durationType === 'monthly') {
      endDate = addMonths(startDate, 1);
    } else if (durationType === 'yearly') {
      endDate = addYears(startDate, 1);
    } else if (durationType === 'lifetime') {
      endDate = addYears(startDate, 100);
    } else {
      endDate = editingUser.membership_end_date ? new Date(editingUser.membership_end_date) : addMonths(startDate, 1);
    }

    setEditingUser({
      ...editingUser,
      membership_start_date: newStartDate,
      membership_end_date: format(endDate, 'yyyy-MM-dd')
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    if (editingUser.membership_end_date && editingUser.membership_start_date) {
      const startDate = new Date(editingUser.membership_start_date);
      const endDate = new Date(editingUser.membership_end_date);

      if (endDate <= startDate) {
        toast.error('Tanggal berakhir harus setelah tanggal mulai!');
        return;
      }
    }

    try {
      setIsSaving(true);

      const updateData = {
        role: editingUser.role,
        admin_type: editingUser.admin_type || null,
        admin_tier: editingUser.admin_tier || 'none',
        subscription_plan: editingUser.subscription_plan,
        membership_duration_type: editingUser.membership_duration_type,
        membership_start_date: editingUser.membership_start_date,
        membership_end_date: editingUser.membership_end_date
      };

      await User.update(editingUser.id, updateData);

      try {
        const channel = new BroadcastChannel('snishop_user_updates');
        channel.postMessage({
          type: 'USER_UPDATED',
          userId: editingUser.id,
          updatedData: updateData,
          timestamp: Date.now()
        });
        channel.close();
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }

      invalidateCache(/User/);
      
      setUsers((prevUsers) => 
        prevUsers.map((user) => 
          user.id === editingUser.id 
            ? { ...user, ...updateData }
            : user
        )
      );
      
      setShowEditModal(false);
      setEditingUser(null);
      setLastUpdate(new Date());
      
      const daysRemaining = differenceInDays(
        new Date(updateData.membership_end_date), 
        new Date()
      );

      toast.success('✅ User berhasil diupdate & broadcasted!', {
        description: `${MEMBERSHIP_LABELS[updateData.subscription_plan]} - ${daysRemaining > 0 ? `${daysRemaining} hari tersisa` : 'Expired'}`,
        duration: 3000
      });

    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Gagal mengupdate user');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (isLoading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                <UserCog className="w-5 h-5" />
                Kontrol Penuh User & Membership
              </CardTitle>
              <CardDescription className="text-sm">
                Monitoring realtime semua user dengan detail lengkap
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2">
              <Badge className="bg-green-600 text-white animate-pulse w-fit">
                <Zap className="w-3 h-3 mr-1" />
                Live Update (10s)
              </Badge>
              <p className="text-xs text-gray-400">
                Update: {format(lastUpdate, 'HH:mm:ss')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role ({users.length})</SelectItem>
                <SelectItem value="user">User ({users.filter(u => u.role === 'user').length})</SelectItem>
                <SelectItem value="admin">Admin ({users.filter(u => u.role === 'admin').length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: DETAILED Table */}
          <div className="hidden md:block border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="text-left p-3 text-white text-xs font-semibold">User Info</th>
                    <th className="text-left p-3 text-white text-xs font-semibold">Membership</th>
                    <th className="text-left p-3 text-white text-xs font-semibold">Durasi Tersisa (Hari)</th>
                    <th className="text-left p-3 text-white text-xs font-semibold">Status Realtime</th>
                    <th className="text-left p-3 text-white text-xs font-semibold">Data User</th>
                    <th className="text-right p-3 text-white text-xs font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const membershipStatus = getMembershipStatus(user);
                    
                    return (
                      <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="font-semibold text-white">{user.full_name || '-'}</div>
                            <div className="text-xs text-gray-400">{user.email}</div>
                            <div className="flex gap-1 flex-wrap">
                              <Badge variant={user.role === 'admin' ? 'destructive' : 'default'} className="text-xs">
                                {user.role === 'admin' ? 'Admin' : 'User'}
                              </Badge>
                              {user.admin_type && (
                                <Badge className="bg-purple-600 text-white text-xs">
                                  {ADMIN_TYPE_LABELS[user.admin_type]}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="space-y-2">
                            <Badge className={`${MEMBERSHIP_COLORS[user.subscription_plan || 'free']} text-white text-xs`}>
                              <Crown className="w-3 h-3 mr-1" />
                              {MEMBERSHIP_LABELS[user.subscription_plan || 'free']}
                            </Badge>
                            {user.membership_start_date && user.membership_end_date && (
                              <div className="text-xs text-gray-400">
                                {format(new Date(user.membership_start_date), 'dd/MM/yy')} - {format(new Date(user.membership_end_date), 'dd/MM/yy')}
                              </div>
                            )}
                            {membershipStatus.needsSetup && (
                              <Badge className="bg-orange-600 text-white text-xs animate-pulse">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Perlu Set
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="space-y-2">
                            {/* ✅ ALWAYS SHOW DAYS - NO MORE "No Date" */}
                            <div className={`text-3xl font-bold ${
                              membershipStatus.status === 'expired' ? 'text-red-600' :
                              membershipStatus.status === 'critical' || membershipStatus.status === 'today' ? 'text-red-500' :
                              membershipStatus.status === 'expiring' ? 'text-yellow-600' :
                              membershipStatus.status === 'lifetime' ? 'text-yellow-500' :
                              membershipStatus.status === 'needs_setup' ? 'text-orange-500' :
                              membershipStatus.status === 'free_plan' ? 'text-gray-500' :
                              'text-green-600'
                            }`}>
                              {membershipStatus.status === 'lifetime' ? '∞' : 
                               membershipStatus.status === 'free_plan' ? '-' :
                               membershipStatus.days}
                            </div>
                            <div className="text-xs text-gray-400">
                              {membershipStatus.status === 'lifetime' ? 'Selamanya' :
                               membershipStatus.status === 'expired' ? 'Hari Telat' :
                               membershipStatus.status === 'free_plan' ? 'Free Plan' :
                               membershipStatus.status === 'needs_setup' ? 'Default (Set Manual)' :
                               'Hari Tersisa'}
                            </div>
                            {membershipStatus.status !== 'lifetime' && membershipStatus.status !== 'free_plan' && (
                              <Progress 
                                value={membershipStatus.percentage} 
                                className={`h-2 ${
                                  membershipStatus.status === 'expired' ? 'bg-red-900' :
                                  membershipStatus.status === 'critical' ? 'bg-red-900' :
                                  membershipStatus.status === 'expiring' ? 'bg-yellow-900' :
                                  membershipStatus.status === 'needs_setup' ? 'bg-orange-900' :
                                  'bg-green-900'
                                }`}
                              />
                            )}
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="space-y-1">
                            {membershipStatus.status === 'expired' ? (
                              <Badge variant="destructive" className="text-xs animate-pulse w-full justify-center">
                                <Clock className="w-3 h-3 mr-1" />
                                ❌ EXPIRED
                              </Badge>
                            ) : membershipStatus.status === 'today' ? (
                              <Badge className="bg-red-600 text-white text-xs animate-pulse w-full justify-center">
                                <Clock className="w-3 h-3 mr-1" />
                                ⚠️ HARI INI
                              </Badge>
                            ) : membershipStatus.status === 'critical' ? (
                              <Badge className="bg-red-600 text-white text-xs animate-pulse w-full justify-center">
                                <Clock className="w-3 h-3 mr-1" />
                                🚨 CRITICAL
                              </Badge>
                            ) : membershipStatus.status === 'expiring' ? (
                              <Badge className="bg-yellow-600 text-white text-xs w-full justify-center">
                                <Clock className="w-3 h-3 mr-1" />
                                ⚠️ SEGERA HABIS
                              </Badge>
                            ) : membershipStatus.status === 'lifetime' ? (
                              <Badge className="bg-yellow-600 text-white text-xs w-full justify-center">
                                ♾️ LIFETIME
                              </Badge>
                            ) : membershipStatus.status === 'needs_setup' ? (
                              <Badge className="bg-orange-600 text-white text-xs w-full justify-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                ⚙️ PERLU SETUP
                              </Badge>
                            ) : membershipStatus.status === 'free_plan' ? (
                              <Badge className="bg-gray-600 text-white text-xs w-full justify-center">
                                FREE PLAN
                              </Badge>
                            ) : (
                              <Badge className="bg-green-600 text-white text-xs w-full justify-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                ✅ AKTIF
                              </Badge>
                            )}
                            <div className={`text-xs font-bold text-center ${
                              membershipStatus.status === 'expired' ? 'text-red-400' :
                              membershipStatus.status === 'critical' ? 'text-red-400' :
                              membershipStatus.status === 'expiring' ? 'text-yellow-400' :
                              membershipStatus.status === 'lifetime' ? 'text-yellow-400' :
                              membershipStatus.status === 'needs_setup' ? 'text-orange-400' :
                              membershipStatus.status === 'free_plan' ? 'text-gray-400' :
                              'text-green-400'
                            }`}>
                              {membershipStatus.label}
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="space-y-1 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Terdaftar: {user.created_date ? format(new Date(user.created_date), 'dd/MM/yyyy') : '-'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Database className="w-3 h-3" />
                              <span>Storage: {(user.storage_used || 0).toFixed(1)}MB</span>
                            </div>
                            {user.referral_code && (
                              <div className="flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                <span>Ref: {user.referral_code}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: DETAILED Card Layout */}
          <div className="md:hidden space-y-3">
            {filteredUsers.map((user) => {
              const membershipStatus = getMembershipStatus(user);
              
              return (
                <Card key={user.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate">{user.full_name || '-'}</div>
                        <div className="text-sm text-gray-400 truncate">{user.email}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        className="flex-shrink-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant={user.role === 'admin' ? 'destructive' : 'default'} className="text-xs">
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </Badge>
                      {user.admin_type && (
                        <Badge className="bg-purple-600 text-white text-xs">
                          {ADMIN_TYPE_LABELS[user.admin_type]}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Badge className={`${MEMBERSHIP_COLORS[user.subscription_plan || 'free']} text-white w-full justify-center`}>
                        <Crown className="w-3 h-3 mr-1" />
                        {MEMBERSHIP_LABELS[user.subscription_plan || 'free']}
                      </Badge>

                      <div className="p-3 bg-gray-900 rounded-lg space-y-2">
                        <div className="text-center">
                          <div className={`text-4xl font-bold ${
                            membershipStatus.status === 'expired' ? 'text-red-600' :
                            membershipStatus.status === 'critical' || membershipStatus.status === 'today' ? 'text-red-500' :
                            membershipStatus.status === 'expiring' ? 'text-yellow-600' :
                            membershipStatus.status === 'lifetime' ? 'text-yellow-500' :
                            membershipStatus.status === 'needs_setup' ? 'text-orange-500' :
                            membershipStatus.status === 'free_plan' ? 'text-gray-500' :
                            'text-green-600'
                          }`}>
                            {membershipStatus.status === 'lifetime' ? '∞' : 
                             membershipStatus.status === 'free_plan' ? '-' : 
                             membershipStatus.days}
                          </div>
                          <div className="text-xs text-gray-400">
                            {membershipStatus.status === 'lifetime' ? 'Selamanya' :
                             membershipStatus.status === 'expired' ? 'Hari Telat' :
                             membershipStatus.status === 'free_plan' ? 'Free Plan' :
                             membershipStatus.status === 'needs_setup' ? 'Default (Perlu Set)' :
                             'Hari Tersisa'}
                          </div>
                        </div>

                        {membershipStatus.status !== 'lifetime' && membershipStatus.status !== 'free_plan' && (
                          <Progress value={membershipStatus.percentage} className="h-2" />
                        )}

                        {membershipStatus.status === 'expired' ? (
                          <Badge variant="destructive" className="w-full justify-center animate-pulse">
                            ❌ EXPIRED
                          </Badge>
                        ) : membershipStatus.status === 'today' ? (
                          <Badge className="bg-red-600 text-white w-full justify-center animate-pulse">
                            ⚠️ HARI INI
                          </Badge>
                        ) : membershipStatus.status === 'critical' ? (
                          <Badge className="bg-red-600 text-white w-full justify-center animate-pulse">
                            🚨 CRITICAL
                          </Badge>
                        ) : membershipStatus.status === 'expiring' ? (
                          <Badge className="bg-yellow-600 text-white w-full justify-center">
                            ⚠️ SEGERA HABIS
                          </Badge>
                        ) : membershipStatus.status === 'lifetime' ? (
                          <Badge className="bg-yellow-600 text-white w-full justify-center">
                            ♾️ LIFETIME
                          </Badge>
                        ) : membershipStatus.status === 'needs_setup' ? (
                          <Badge className="bg-orange-600 text-white w-full justify-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            ⚙️ PERLU SETUP
                          </Badge>
                        ) : membershipStatus.status === 'free_plan' ? (
                          <Badge className="bg-gray-600 text-white w-full justify-center">
                            FREE PLAN
                          </Badge>
                        ) : (
                          <Badge className="bg-green-600 text-white w-full justify-center">
                            ✅ AKTIF
                          </Badge>
                        )}

                        {user.membership_start_date && user.membership_end_date && user.membership_duration_type !== 'lifetime' && (
                          <div className="text-xs text-gray-400 text-center">
                            {format(new Date(user.membership_start_date), 'dd MMM yyyy')} - {format(new Date(user.membership_end_date), 'dd MMM yyyy')}
                          </div>
                        )}
                      </div>

                      <div className="p-2 bg-gray-900 rounded text-xs text-gray-400 space-y-1">
                        <div>📅 Daftar: {user.created_date ? format(new Date(user.created_date), 'dd MMM yyyy') : '-'}</div>
                        <div>💾 Storage: {(user.storage_used || 0).toFixed(1)}MB</div>
                        {user.referral_code && <div>🔗 Ref: {user.referral_code}</div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-900/20 border-2 border-blue-600 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-base text-blue-300 font-bold mb-2">
                  🔒 FULL KONTROL OWNER - REALTIME MONITORING
                </p>
                <div className="text-sm text-gray-200 space-y-1">
                  <p>✅ <strong>Update otomatis setiap 10 detik</strong> - Data selalu fresh tanpa delay</p>
                  <p>✅ <strong>SEMUA user menampilkan durasi dalam HARI</strong> - Tidak ada lagi "No Date"</p>
                  <p>✅ <strong>User tanpa tanggal</strong> - Otomatis dapat default 30 hari + warning "Perlu Setup"</p>
                  <p>✅ <strong>Detail lengkap</strong> - Sisa hari, status, storage, tanggal daftar, referral code</p>
                  <p>✅ <strong>Color-coded status</strong> - Orange (perlu set), Merah (expired), Kuning (segera habis), Hijau (aktif)</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {editingUser && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Edit User - {editingUser.email}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="p-5 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-2 border-blue-600 rounded-lg space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-lg font-semibold">Membership & Durasi</h3>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Level Membership</Label>
                  <Select
                    value={editingUser.subscription_plan || 'free'}
                    onValueChange={(value) => setEditingUser({...editingUser, subscription_plan: value})}
                  >
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="free">Gratis - Free Plan</SelectItem>
                      <SelectItem value="pro">Pro - Professional Plan</SelectItem>
                      <SelectItem value="business">Business - Business Plan (3 Companies)</SelectItem>
                      <SelectItem value="advanced">Advanced - Advanced Plan (10 Companies)</SelectItem>
                      <SelectItem value="enterprise">Enterprise - Enterprise Plan (20 Companies)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Durasi Membership</Label>
                  <Select
                    value={editingUser.membership_duration_type || 'monthly'}
                    onValueChange={handleDurationTypeChange}
                  >
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {DURATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Tanggal Mulai</Label>
                    <Input
                      type="date"
                      value={editingUser.membership_start_date || ''}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Tanggal Berakhir</Label>
                    <Input
                      type="date"
                      value={editingUser.membership_end_date || ''}
                      onChange={(e) => setEditingUser({...editingUser, membership_end_date: e.target.value})}
                      className="bg-gray-900 border-gray-700 text-white"
                      disabled={editingUser.membership_duration_type === 'lifetime'}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({...editingUser, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingUser.role === 'admin' && (
                <div>
                  <Label>Admin Type (untuk sistem aplikasi)</Label>
                  <Select
                    value={editingUser.admin_type || ''}
                    onValueChange={(value) => setEditingUser({...editingUser, admin_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Admin Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem>
                      <SelectItem value="owner">Admin Owner (Full Access)</SelectItem>
                      <SelectItem value="basic">Admin Transaksi (Produk Digital)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Admin Tier (untuk company management)</Label>
                <Select
                  value={editingUser.admin_tier || 'none'}
                  onValueChange={(value) => setEditingUser({...editingUser, admin_tier: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Regular User)</SelectItem>
                    <SelectItem value="business">Admin Business (3 companies max)</SelectItem>
                    <SelectItem value="advanced">Admin Advanced (10 companies max)</SelectItem>
                    <SelectItem value="enterprise">Admin Enterprise (20 companies max)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                disabled={isSaving}
              >
                Batal
              </Button>
              <Button 
                onClick={handleSaveUser} 
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}