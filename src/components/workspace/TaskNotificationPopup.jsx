import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '@/entities/Task';
import { Bell, X, MapPin, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const priorityColors = {
  low: 'from-green-500 to-teal-500',
  medium: 'from-yellow-500 to-orange-400',
  high: 'from-orange-500 to-red-500',
  urgent: 'from-red-600 to-rose-700'
};

const priorityLabels = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi', urgent: '🚨 MENDESAK' };

export default function TaskNotificationPopup({ currentUser, onOpenTask }) {
  const [notifications, setNotifications] = useState([]);
  const [seenTaskIds, setSeenTaskIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('seen_task_notifs') || '[]')); }
    catch { return new Set(); }
  });

  const requestBrowserPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) { /* audio not available */ }
  };

  const sendBrowserNotification = (task) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification('📋 Tugas Baru Ditugaskan!', {
        body: `${task.title}\n${task.due_date ? 'Deadline: ' + format(new Date(task.due_date), 'd MMM yyyy HH:mm', { locale: idLocale }) : ''}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: task.id,
        requireInteraction: true
      });
      notif.onclick = () => {
        window.focus();
        onOpenTask && onOpenTask(task);
        notif.close();
      };
    }
  };

  const checkNewTasks = async () => {
    if (!currentUser) return;
    try {
      const assignedTasks = await Task.filter({
        assignee_id: currentUser.email,
        status: 'todo'
      });

      const newTasks = (assignedTasks || []).filter(t => {
        if (seenTaskIds.has(t.id)) return false;
        const createdAt = new Date(t.created_date || 0);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return createdAt > fiveMinutesAgo;
      });

      if (newTasks.length > 0) {
        setNotifications(prev => [...newTasks, ...prev].slice(0, 5));
        newTasks.forEach(task => {
          sendBrowserNotification(task);
          setSeenTaskIds(prev => {
            const next = new Set(prev);
            next.add(task.id);
            localStorage.setItem('seen_task_notifs', JSON.stringify([...next].slice(-100)));
            return next;
          });
        });
        playNotificationSound();
      }
    } catch (e) { /* silent */ }
  };

  useEffect(() => {
    if (!currentUser) return;
    requestBrowserPermission();
    checkNewTasks();
    const interval = setInterval(checkNewTasks, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [currentUser]);

  // Also listen to taskAssigned events (real-time from same browser)
  useEffect(() => {
    const handler = async (e) => {
      const { taskId, assigneeEmail, taskTitle } = e.detail || {};
      if (!currentUser || assigneeEmail !== currentUser.email) return;
      try {
        const task = await Task.get(taskId);
        if (!task) return;
        setNotifications(prev => [task, ...prev].slice(0, 5));
        sendBrowserNotification(task);
        playNotificationSound();
      } catch (e) { /* silent */ }
    };
    window.addEventListener('taskAssigned', handler);
    return () => window.removeEventListener('taskAssigned', handler);
  }, [currentUser]);

  const dismiss = (taskId) => {
    setNotifications(prev => prev.filter(n => n.id !== taskId));
    setSeenTaskIds(prev => {
      const next = new Set(prev);
      next.add(taskId);
      localStorage.setItem('seen_task_notifs', JSON.stringify([...next].slice(-100)));
      return next;
    });
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full">
      <AnimatePresence>
        {notifications.map(task => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
          >
            {/* Top gradient strip */}
            <div className={`h-1.5 bg-gradient-to-r ${priorityColors[task.priority] || 'from-blue-500 to-indigo-500'}`} />

            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Tugas Baru!</p>
                    <Badge className={`text-[10px] px-1.5 py-0 ${task.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {priorityLabels[task.priority]}
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(task.due_date), 'd MMM HH:mm', { locale: idLocale })}
                      </span>
                    )}
                    {task.location_pin && (
                      <span className="flex items-center gap-1 text-red-500">
                        <MapPin className="w-3 h-3" />
                        Ada Lokasi
                      </span>
                    )}
                    {task.estimated_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimated_time} mnt
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => dismiss(task.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1"
                  onClick={() => { onOpenTask && onOpenTask(task); dismiss(task.id); }}
                >
                  Lihat Detail <ChevronRight className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => dismiss(task.id)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}