import { useEffect, useRef, useCallback } from 'react';
import { Task } from '@/entities/Task';
import { Notification } from '@/entities/Notification';

const NotificationService = ({ user }) => {
  const intervalRef = useRef(null);
  const lastCheckRef = useRef(new Date());
  const notifiedTasksRef = useRef(new Set());

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted');
          // Test notification
          showTestNotification();
        } else {
          console.log('Notification permission denied');
        }
      }
    }
  }, []);

  const showTestNotification = () => {
    if (Notification.permission === 'granted') {
      const notification = new Notification('TODOIT Aktif', {
        body: 'Sistem notifikasi telah diaktifkan. Anda akan menerima pengingat untuk tugas-tugas penting.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'todoit-activated',
        silent: false
      });

      // Auto close after 4 seconds
      setTimeout(() => notification.close(), 4000);
    }
  };

  const checkForDueTasks = async () => {
    try {
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      const checkTime = new Date(now.getTime() + 60 * 60 * 1000); // Next 1 hour

      // Get all tasks assigned to current user that are due soon
      const tasks = await Task.filter({
        $or: [
          { created_by: user.email },
          { assignee_id: user.email }
        ]
      });

      for (const task of tasks) {
        // Skip if task is completed or cancelled
        if (task.status === 'done' || task.status === 'cancelled') continue;
        
        // Skip if already notified
        if (notifiedTasksRef.current.has(task.id)) continue;

        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          const reminderTime = task.reminder_config?.value || 30;
          const reminderUnit = task.reminder_config?.unit || 'minutes';
          
          let reminderMs = 0;
          switch (reminderUnit) {
            case 'minutes': reminderMs = reminderTime * 60 * 1000; break;
            case 'hours': reminderMs = reminderTime * 60 * 60 * 1000; break;
            case 'days': reminderMs = reminderTime * 24 * 60 * 60 * 1000; break;
          }

          const reminderDateTime = new Date(dueDate.getTime() - reminderMs);

          // Check if it's time to send reminder
          if (now >= reminderDateTime && now < dueDate) {
            await sendTaskNotification(task, dueDate, reminderTime, reminderUnit);
            notifiedTasksRef.current.add(task.id);
            
            // Record notification in database
            await Notification.create({
              user_id: user.email,
              title: `Pengingat: ${task.title}`,
              message: `Tugas Anda akan dimulai dalam ${reminderTime} ${reminderUnit}`,
              url: `/tasks?id=${task.id}`
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking for due tasks:', error);
    }
  };

  const startNotificationService = useCallback(() => {
    // Check immediately
    checkForDueTasks();
    
    // Then check every 30 seconds
    intervalRef.current = setInterval(() => {
      checkForDueTasks();
    }, 30000); // 30 seconds
  }, []);

  const sendTaskNotification = async (task, dueDate, reminderTime, reminderUnit) => {
    if (Notification.permission !== 'granted') return;

    // Create notification sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjaG0/DN');
    audio.volume = 0.5;

    const unitText = {
      'minutes': 'menit',
      'hours': 'jam',
      'days': 'hari'
    };

    const notification = new Notification(`🔔 Pengingat Tugas: ${task.title}`, {
      body: `Tugas Anda akan dimulai dalam ${reminderTime} ${unitText[reminderUnit]}!\n\nJadwal: ${dueDate.toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `task-${task.id}`,
      requireInteraction: true, // Keep notification until user interacts
      silent: false,
      actions: [
        {
          action: 'mark-done',
          title: 'Tandai Selesai'
        },
        {
          action: 'snooze',
          title: 'Tunda 10 Menit'
        }
      ]
    });

    // Play sound
    try {
      await audio.play();
    } catch (e) {
      console.log('Could not play notification sound:', e);
    }

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      window.location.href = `/tasks?id=${task.id}`;
      notification.close();
    };

    // Auto close after 30 seconds if user doesn't interact
    setTimeout(() => {
      if (notification) {
        notification.close();
      }
    }, 30000);
  };

  useEffect(() => {
    if (!user) return;

    requestNotificationPermission();
    startNotificationService();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, requestNotificationPermission, startNotificationService]);

  // This component doesn't render anything visible
  return null;
};

export default NotificationService;