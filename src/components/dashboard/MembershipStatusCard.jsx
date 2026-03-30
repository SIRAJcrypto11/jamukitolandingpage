import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { differenceInDays, format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Crown,
  Calendar,
  Clock,
  TrendingUp,
  Zap,
  CheckCircle,
  AlertCircle,
  Timer
} from 'lucide-react';

const MEMBERSHIP_LABELS = {
  free: 'Gratis',
  pro: 'Pro',
  business: 'Business',
  advanced: 'Advanced',
  enterprise: 'Enterprise'
};

const MEMBERSHIP_COLORS = {
  free: 'from-gray-600 to-gray-700',
  pro: 'from-blue-600 to-blue-700',
  business: 'from-green-600 to-green-700',
  advanced: 'from-purple-600 to-purple-700',
  enterprise: 'from-yellow-600 to-yellow-700'
};

export default function MembershipStatusCard({ user }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // ✅ UPDATE EVERY MINUTE for accurate countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // ✅ REALTIME SYNC - Listen for admin updates
  useEffect(() => {
    if (!user) return;

    const channel = new BroadcastChannel('snishop_user_updates');

    channel.onmessage = (event) => {
      const { type, userId } = event.data;

      if (type === 'USER_UPDATED' && userId === user.id) {
        console.log('📡 Membership card received update - Will reload via parent');
        // Parent component will handle reload
      }
    };

    return () => channel.close();
  }, [user]);

  if (!user) return null;

  const plan = user.subscription_plan || 'free';
  const isLifetime = user.membership_duration_type === 'lifetime';
  const hasEndDate = user.membership_end_date && !isLifetime;

  // ✅ Calculate days remaining (REAL-TIME with currentTime state)
  const daysRemaining = hasEndDate 
    ? differenceInDays(new Date(user.membership_end_date), currentTime)
    : null;

  // ✅ Calculate hours remaining for more precise countdown
  const hoursRemaining = hasEndDate
    ? Math.floor((new Date(user.membership_end_date) - currentTime) / (1000 * 60 * 60))
    : null;

  // ✅ Calculate progress (if not lifetime)
  const calculateProgress = () => {
    if (!hasEndDate || !user.membership_start_date) return 0;
    
    const totalDays = differenceInDays(
      new Date(user.membership_end_date),
      new Date(user.membership_start_date)
    );
    
    const remainingDays = daysRemaining || 0;
    const elapsedDays = totalDays - remainingDays;
    
    return totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
  };

  const progress = calculateProgress();

  // ✅ Determine status
  const getStatus = () => {
    if (isLifetime) return { label: 'Selamanya', color: 'text-yellow-400', icon: Zap, bgColor: 'bg-yellow-500/20' };
    if (plan === 'free') return { label: 'Free Plan', color: 'text-gray-400', icon: CheckCircle, bgColor: 'bg-gray-500/20' };
    if (!hasEndDate) return { label: 'Aktif', color: 'text-green-400', icon: CheckCircle, bgColor: 'bg-green-500/20' };
    
    if (daysRemaining < 0) return { label: 'Expired', color: 'text-red-400', icon: AlertCircle, bgColor: 'bg-red-500/20' };
    if (daysRemaining === 0) return { label: 'Berakhir Hari Ini!', color: 'text-red-400', icon: AlertCircle, bgColor: 'bg-red-500/20' };
    if (daysRemaining <= 3) return { label: 'Segera Berakhir!', color: 'text-red-400', icon: AlertCircle, bgColor: 'bg-red-500/20' };
    if (daysRemaining <= 7) return { label: 'Akan Berakhir', color: 'text-yellow-400', icon: Clock, bgColor: 'bg-yellow-500/20' };
    if (daysRemaining <= 14) return { label: 'Aktif', color: 'text-blue-400', icon: Clock, bgColor: 'bg-blue-500/20' };
    return { label: 'Aktif', color: 'text-green-400', icon: CheckCircle, bgColor: 'bg-green-500/20' };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <Card className={`bg-gradient-to-br ${MEMBERSHIP_COLORS[plan]} border-none shadow-xl overflow-hidden`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            <span className="text-base sm:text-lg">Membership Anda</span>
          </div>
          <Badge className={`${status.bgColor} text-white border-white/30 ${
            status.label === 'Segera Berakhir!' || status.label === 'Berakhir Hari Ini!' ? 'animate-pulse' : ''
          }`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Name */}
        <div>
          <p className="text-white/70 text-xs mb-1">Paket Saat Ini</p>
          <p className="text-2xl sm:text-3xl font-bold text-white">
            {MEMBERSHIP_LABELS[plan]}
          </p>
        </div>

        {/* Duration Info */}
        {isLifetime ? (
          <div className="p-4 bg-white/20 rounded-lg border-2 border-white/30">
            <div className="flex items-center gap-3 text-white">
              <Zap className="w-6 h-6 animate-pulse" />
              <div>
                <p className="font-bold text-lg">Membership Selamanya</p>
                <p className="text-sm opacity-90">♾️ Tanpa batas waktu - Lifetime access!</p>
              </div>
            </div>
          </div>
        ) : hasEndDate ? (
          <div className="space-y-4">
            {/* ✅ COUNTDOWN - REAL-TIME UPDATING */}
            <div className="p-4 bg-white/10 rounded-lg border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <Timer className="w-5 h-5" />
                  <span className="font-semibold">Sisa Waktu Aktif:</span>
                </div>
              </div>
              
              {/* ✅ BIG COUNTDOWN DISPLAY */}
              <div className="text-center py-3">
                {daysRemaining > 0 ? (
                  <>
                    <p className={`text-4xl sm:text-5xl font-bold ${status.color} ${
                      daysRemaining <= 3 ? 'animate-pulse' : ''
                    }`}>
                      {daysRemaining}
                    </p>
                    <p className="text-white/80 text-sm mt-1">
                      {daysRemaining === 1 ? 'hari lagi' : 'hari lagi'}
                    </p>
                    {/* ✅ Show hours for last 3 days */}
                    {daysRemaining <= 3 && hoursRemaining !== null && (
                      <p className="text-white/60 text-xs mt-1">
                        (≈ {hoursRemaining % 24} jam lagi)
                      </p>
                    )}
                  </>
                ) : daysRemaining === 0 ? (
                  <>
                    <p className="text-4xl font-bold text-red-400 animate-pulse">
                      HARI INI!
                    </p>
                    <p className="text-white/80 text-sm mt-1">Berakhir dalam {hoursRemaining} jam</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-red-400">EXPIRED</p>
                    <p className="text-white/80 text-sm mt-1">{Math.abs(daysRemaining)} hari yang lalu</p>
                  </>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {daysRemaining >= 0 && (
              <div>
                <div className="flex justify-between text-xs text-white/70 mb-1">
                  <span>Waktu Terpakai</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress 
                  value={Math.min(progress, 100)} 
                  className="h-3 bg-white/20"
                />
                <p className="text-xs text-white/70 mt-1 text-right">
                  {Math.round(100 - progress)}% tersisa
                </p>
              </div>
            )}

            {/* Dates - Detailed */}
            <div className="space-y-2 p-3 bg-white/5 rounded-lg">
              {user.membership_start_date && (
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <Calendar className="w-4 h-4 text-green-400" />
                  <span className="font-semibold">Mulai:</span>
                  <span>{format(new Date(user.membership_start_date), 'dd MMMM yyyy', { locale: id })}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Calendar className="w-4 h-4 text-red-400" />
                <span className="font-semibold">Berakhir:</span>
                <span>{format(new Date(user.membership_end_date), 'dd MMMM yyyy', { locale: id })}</span>
              </div>
              
              {/* ✅ Duration Info */}
              <div className="flex items-center gap-2 text-white/80 text-sm pt-2 border-t border-white/10">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="font-semibold">Durasi:</span>
                <span>
                  {user.membership_duration_type === 'monthly' && '1 Bulan'}
                  {user.membership_duration_type === 'yearly' && '1 Tahun'}
                  {user.membership_duration_type === 'custom' && 'Custom Period'}
                </span>
              </div>
            </div>

            {/* ✅ WARNING MESSAGES - Dynamic based on days remaining */}
            {daysRemaining <= 14 && daysRemaining > 0 && (
              <div className={`p-3 rounded-lg border-2 ${
                daysRemaining <= 3 
                  ? 'bg-red-500/20 border-red-500 animate-pulse' 
                  : daysRemaining <= 7 
                  ? 'bg-yellow-500/20 border-yellow-500'
                  : 'bg-blue-500/20 border-blue-500'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                    daysRemaining <= 3 ? 'text-red-300' : 
                    daysRemaining <= 7 ? 'text-yellow-300' : 
                    'text-blue-300'
                  }`} />
                  <div className="text-xs text-white">
                    {daysRemaining <= 3 ? (
                      <>
                        <p className="font-bold text-red-200 mb-1">🚨 SEGERA PERPANJANG!</p>
                        <p>Membership Anda akan berakhir dalam <strong>{daysRemaining} hari</strong>!</p>
                      </>
                    ) : daysRemaining <= 7 ? (
                      <>
                        <p className="font-bold text-yellow-200 mb-1">⚠️ Perpanjang Langganan</p>
                        <p>Membership akan berakhir dalam <strong>{daysRemaining} hari</strong></p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-blue-200 mb-1">⏰ Pengingat</p>
                        <p>Membership akan berakhir dalam <strong>{daysRemaining} hari</strong></p>
                      </>
                    )}
                    <p className="mt-2 opacity-90">
                      ⚠️ Jika tidak perpanjang, akun akan turun ke <strong>Paket Gratis</strong>
                    </p>
                    <p className="mt-1 opacity-90">
                      ✅ Data Anda <strong>tetap aman</strong>, fitur premium akan dikunci
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Expired message */}
            {daysRemaining < 0 && (
              <div className="p-4 bg-red-500/30 border-2 border-red-500 rounded-lg animate-pulse">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-6 h-6 text-red-300 flex-shrink-0" />
                  <div className="text-sm text-white">
                    <p className="font-bold text-red-200 mb-2">🚨 MEMBERSHIP EXPIRED!</p>
                    <p className="mb-2">Membership Anda telah berakhir <strong>{Math.abs(daysRemaining)} hari yang lalu</strong></p>
                    <p className="mb-2">✅ <strong>Data Anda AMAN</strong> - Tasks, Notes, Workspaces tersimpan</p>
                    <p>🔒 Fitur premium dikunci - Upgrade untuk akses kembali</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : plan === 'free' ? (
          <div className="p-4 bg-white/10 rounded-lg">
            <p className="text-white/80 text-sm mb-2">
              ✨ Anda menggunakan <strong>Paket Gratis</strong>
            </p>
            <p className="text-white/70 text-xs">
              Upgrade untuk akses fitur premium & manajemen perusahaan
            </p>
          </div>
        ) : (
          <div className="p-3 bg-white/10 rounded-lg">
            <p className="text-white/80 text-sm">
              ✅ Membership aktif
            </p>
          </div>
        )}

        {/* CTA Button - Dynamic based on urgency */}
        {plan === 'free' || (daysRemaining !== null && daysRemaining <= 14) || daysRemaining < 0 ? (
          <Link to={createPageUrl('Pricing')} className="block">
            <Button 
              className={`w-full bg-white hover:bg-white/90 font-bold ${
                daysRemaining !== null && daysRemaining <= 3 ? 'animate-pulse shadow-lg shadow-red-500/50' : ''
              }`}
              style={{ 
                color: plan === 'free' ? '#3b82f6' : 
                       daysRemaining < 0 ? '#ef4444' :
                       daysRemaining <= 3 ? '#ef4444' : 
                       daysRemaining <= 7 ? '#f59e0b' :
                       '#10b981' 
              }}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {plan === 'free' 
                ? '⚡ Upgrade Sekarang' 
                : daysRemaining < 0
                ? '🚨 Perpanjang untuk Akses Data'
                : daysRemaining <= 3 
                ? '🚨 PERPANJANG SEKARANG!' 
                : daysRemaining <= 7
                ? '⚠️ Perpanjang Segera'
                : '✅ Perpanjang Langganan'}
            </Button>
          </Link>
        ) : null}

        {/* ✅ DATA SAFETY GUARANTEE */}
        {(daysRemaining <= 14 || daysRemaining < 0) && (
          <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg">
            <div className="flex items-start gap-2 text-xs text-green-300">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">🔒 Jaminan Keamanan Data</p>
                <p className="opacity-90">
                  Semua <strong>Tasks, Notes, Workspaces Anda AMAN</strong> dan tidak akan hilang.
                  {daysRemaining < 0 
                    ? ' Perpanjang untuk akses kembali fitur premium.'
                    : ' Perpanjang sebelum berakhir untuk akses tanpa gangguan.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}