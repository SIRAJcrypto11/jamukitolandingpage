import { useState, useEffect } from 'react';
import { Clock, Coffee, Zap, Home, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInMinutes } from 'date-fns';
import { id } from 'date-fns/locale';

export default function LiveWorkTimer({ clockInTime, settings }) {
  const [elapsed, setElapsed] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalMinutes: 0
  });

  useEffect(() => {
    // ✅ VALIDATE clockInTime immediately
    if (!clockInTime) {
      console.warn('LiveWorkTimer: clockInTime is null/undefined');
      setElapsed({ hours: 0, minutes: 0, seconds: 0, totalMinutes: 0 });
      return;
    }

    const start = new Date(clockInTime);
    if (isNaN(start.getTime())) {
      console.error('LiveWorkTimer: Invalid clockInTime format:', clockInTime);
      setElapsed({ hours: 0, minutes: 0, seconds: 0, totalMinutes: 0 });
      return;
    }

    console.log('LiveWorkTimer started with clockInTime:', clockInTime, '| Parsed:', start);

    const interval = setInterval(() => {
      const now = new Date();
      const diff = now - start;

      if (diff < 0) {
        console.warn('LiveWorkTimer: Negative time difference!');
        setElapsed({ hours: 0, minutes: 0, seconds: 0, totalMinutes: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const totalMinutes = Math.floor(diff / (1000 * 60));

      setElapsed({ hours, minutes, seconds, totalMinutes });
    }, 1000);

    return () => clearInterval(interval);
  }, [clockInTime]);

  const getMotivationalMessage = () => {
    const { hours, totalMinutes } = elapsed;
    const workEnd = settings?.working_hours?.end_time || '17:00';
    const [endHour, endMinute] = workEnd.split(':').map(Number);
    const now = new Date();
    const endTime = new Date(now);
    endTime.setHours(endHour, endMinute, 0, 0);

    const minutesUntilEnd = differenceInMinutes(endTime, now);
    const overtimeStart = settings?.overtime_settings?.start_after_hours || 8;

    // Check if in overtime
    if (hours >= overtimeStart) {
      const overtimeHours = hours - overtimeStart;
      return {
        icon: Zap,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-900/20',
        borderColor: 'border-yellow-700',
        message: `🔥 LEMBUR: Sudah ${overtimeHours} jam lembur! Tetap semangat! 💪`,
        subtext: 'Overtime sedang berjalan - istirahat sejenak jika perlu'
      };
    }

    // Almost home time (30 minutes before end)
    if (minutesUntilEnd > 0 && minutesUntilEnd <= 30) {
      return {
        icon: Home,
        color: 'text-green-400',
        bgColor: 'bg-green-900/20',
        borderColor: 'border-green-700',
        message: `🏠 ${minutesUntilEnd} menit lagi pulang! Finish strong! 💪`,
        subtext: 'Sebentar lagi waktu pulang - tutup pekerjaan dengan baik'
      };
    }

    // First hour
    if (hours === 0 && totalMinutes < 60) {
      return {
        icon: Coffee,
        color: 'text-blue-400',
        bgColor: 'bg-blue-900/20',
        borderColor: 'border-blue-700',
        message: '☕ Baru mulai kerja! Semangat untuk hari yang produktif! ✨',
        subtext: 'Mulai dengan tugas terpenting hari ini'
      };
    }

    // Mid-day motivation (4-6 hours)
    if (hours >= 4 && hours < 6) {
      return {
        icon: Star,
        color: 'text-purple-400',
        bgColor: 'bg-purple-900/20',
        borderColor: 'border-purple-700',
        message: '⭐ Sudah setengah hari! Great progress! 🚀',
        subtext: 'Sudah melewati separuh hari kerja - keep going!'
      };
    }

    // Almost done (6-7 hours)
    if (hours >= 6 && hours < overtimeStart) {
      return {
        icon: TrendingUp,
        color: 'text-orange-400',
        bgColor: 'bg-orange-900/20',
        borderColor: 'border-orange-700',
        message: '🎯 Hampir selesai! Sprint terakhir! 💨',
        subtext: 'Tinggal sedikit lagi - finish dengan baik!'
      };
    }

    // Default
    return {
      icon: Clock,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-700',
      message: `💼 Sudah bekerja ${hours} jam! Keep up the good work! 👍`,
      subtext: 'Produktivitas yang konsisten membawa kesuksesan'
    };
  };

  const motivation = getMotivationalMessage();
  const Icon = motivation.icon;

  // ✅ SAFE format for display
  const safeFormatClockIn = () => {
    try {
      if (!clockInTime) return '-';
      const date = new Date(clockInTime);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'HH:mm', { locale: id });
    } catch {
      return '-';
    }
  };

  return (
    <Card className={`${motivation.bgColor} border ${motivation.borderColor}`}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Icon className={`w-6 h-6 md:w-8 md:h-8 ${motivation.color}`} />
            <div>
              <p className={`font-bold text-base md:text-lg ${motivation.color}`}>
                {motivation.message}
              </p>
              <p className="text-xs md:text-sm text-gray-400 mt-1">
                {motivation.subtext}
              </p>
            </div>
          </div>
        </div>

        {/* Live Timer */}
        <div className="text-center p-4 md:p-6 bg-gray-800 rounded-lg">
          <p className="text-xs md:text-sm text-gray-400 mb-2">Durasi Kerja Hari Ini</p>
          <div className="flex items-center justify-center gap-2 md:gap-4">
            <div className="text-center">
              <div className="text-3xl md:text-5xl font-bold text-white font-mono">
                {String(elapsed.hours).padStart(2, '0')}
              </div>
              <div className="text-xs md:text-sm text-gray-500 mt-1">JAM</div>
            </div>
            <div className="text-3xl md:text-5xl font-bold text-gray-600">:</div>
            <div className="text-center">
              <div className="text-3xl md:text-5xl font-bold text-white font-mono">
                {String(elapsed.minutes).padStart(2, '0')}
              </div>
              <div className="text-xs md:text-sm text-gray-500 mt-1">MENIT</div>
            </div>
            <div className="text-3xl md:text-5xl font-bold text-gray-600">:</div>
            <div className="text-center">
              <div className="text-3xl md:text-5xl font-bold text-blue-400 font-mono">
                {String(elapsed.seconds).padStart(2, '0')}
              </div>
              <div className="text-xs md:text-sm text-gray-500 mt-1">DETIK</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-xs md:text-sm text-gray-400 mb-2">
              <span>Mulai: {safeFormatClockIn()}</span>
              <span>Target: {settings?.working_hours?.end_time || '17:00'}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 md:h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 md:h-3 rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min((elapsed.hours / (settings?.overtime_settings?.start_after_hours || 8)) * 100, 100)}%`
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0h</span>
              <span>{settings?.overtime_settings?.start_after_hours || 8}h (Target)</span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-4 flex justify-center gap-2 flex-wrap">
            {elapsed.hours >= (settings?.overtime_settings?.start_after_hours || 8) && (
              <Badge className="bg-yellow-600">
                ⚡ OVERTIME MODE
              </Badge>
            )}
            {elapsed.hours >= 4 && elapsed.hours < 6 && (
              <Badge className="bg-purple-600">
                🌟 HALFWAY THERE
              </Badge>
            )}
            {elapsed.hours >= 6 && elapsed.hours < (settings?.overtime_settings?.start_after_hours || 8) && (
              <Badge className="bg-orange-600">
                🎯 ALMOST DONE
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          <div className="p-3 bg-gray-800 rounded-lg text-center">
            <p className="text-xs text-gray-400">Jam Normal</p>
            <p className="text-lg md:text-xl font-bold text-white">
              {Math.min(elapsed.hours, settings?.overtime_settings?.start_after_hours || 8)}h
            </p>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg text-center">
            <p className="text-xs text-gray-400">Lembur</p>
            <p className="text-lg md:text-xl font-bold text-yellow-400">
              {Math.max(0, elapsed.hours - (settings?.overtime_settings?.start_after_hours || 8))}h
            </p>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg text-center col-span-2 md:col-span-1">
            <p className="text-xs text-gray-400">Break Time</p>
            <p className="text-lg md:text-xl font-bold text-purple-400">
              {settings?.working_hours?.break_duration_minutes || 60}m
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}