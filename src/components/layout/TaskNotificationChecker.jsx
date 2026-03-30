import { useEffect, useRef, useCallback } from 'react';
import { Task } from '@/entities/Task';
import { differenceInMinutes, parseISO } from 'date-fns';

const NOTIFICATION_INTERVAL = 60 * 1000; // Check every 60 seconds
const REMINDER_THRESHOLD_MINUTES = 30; // 30 minutes before due date

// A generic notification sound - ensure this URL is stable
const notificationSoundUrl = 'https://cdn.jsdelivr.net/gh/scottschiller/SoundManager2@master/demo/_mp3/blip.mp3';

export default function TaskNotificationChecker({ user }) {
  const audioRef = useRef(null);

  const sendNotification = useCallback((task, minutesUntilDue) => {
    const title = `Pengingat Tugas: ${task.title}`;
    const options = {
      body: `Jatuh tempo dalam ${Math.round(minutesUntilDue)} menit.`,
      icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/688a42916670b89e7b51038c/bf4ff089b_TODOITLOGO.png',
      tag: task.id, // Use task ID as tag to prevent multiple notifications for the same task
      renotify: true, // Allow re-notification if tag is the same
      requireInteraction: true // Keep notification visible until user interacts
    };

    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, options);
      });
    } else {
      // Fallback for environments without a service worker
      new Notification(title, options);
    }

    if (audioRef.current) {
        audioRef.current.play().catch(e => console.error("Error playing sound:", e));
    }
  }, []);

  const checkForUpcomingTasks = useCallback(async () => {
    if (!user) return;
    try {
      const now = new Date();
      // Fetch tasks assigned to the current user that are not done
      const tasks = await Task.filter({ 
        status: { '$ne': 'done' }, 
        assignee_id: user.email 
      });

      tasks.forEach(task => {
        if (task.due_date) {
          const dueDate = parseISO(task.due_date);
          const minutesUntilDue = differenceInMinutes(dueDate, now);

          if (minutesUntilDue > 0 && minutesUntilDue <= REMINDER_THRESHOLD_MINUTES) {
            const reminderSent = task.reminder_sent_at ? parseISO(task.reminder_sent_at) : null;
            
            // Logic to prevent re-notifying for the same due-date instance.
            if (!reminderSent || differenceInMinutes(dueDate, reminderSent) > REMINDER_THRESHOLD_MINUTES) {
              sendNotification(task, minutesUntilDue);
              Task.update(task.id, { reminder_sent_at: now.toISOString() });
            }
          }
        }
      });
    } catch (error) {
      console.error('Error checking for task notifications:', error);
    }
  }, [user, sendNotification]);

  useEffect(() => {
    // Preload audio
    if (typeof Audio !== 'undefined') {
      audioRef.current = new Audio(notificationSoundUrl);
      audioRef.current.volume = 0.5;
    }
    
    // Request permission on component mount if needed
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const intervalId = setInterval(() => {
      if (user && Notification.permission === 'granted') {
        checkForUpcomingTasks();
      }
    }, NOTIFICATION_INTERVAL);

    return () => clearInterval(intervalId);
  }, [user, checkForUpcomingTasks]);

  return null; // This component does not render anything
}