
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';

export default function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadNotifications = async () => {
    if (!user || !user.email || isLoading) return;

    try {
      setIsLoading(true);
      setHasError(false);
      
      // ✅ IMPROVED: Add timeout and better error handling
      const data = await Promise.race([
        base44.entities.Notification.filter({
          user_id: user.email,
          is_read: false
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);

      setNotifications(data || []);
      setUnreadCount((data || []).length);
    } catch (error) {
      console.log('⚠️ Could not load notifications:', error?.message || 'Unknown error');
      setHasError(true);
      // Silent fail - don't show error to user
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      // Delayed initial load to prevent blocking
      const timer = setTimeout(() => {
        loadNotifications();
      }, 2000);

      // Refresh only when page becomes visible
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && !isLoading) {
          loadNotifications();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [user]);

  // ✅ LISTEN TO BROADCAST - REALTIME NOTIFICATIONS!
  useEffect(() => {
    if (!user?.email) return;

    console.log('🔔 NotificationBell: Setting up realtime listener for', user.email);

    const channel = new BroadcastChannel('snishop_invitation_updates');

    channel.onmessage = (event) => {
      const { type, invitedEmail } = event.data;

      if (type === 'INVITATION_CREATED' && invitedEmail === user.email) {
        console.log('🔔 New invitation notification received!');
        
        // ✅ RELOAD NOTIFICATIONS INSTANTLY
        setTimeout(() => {
          loadNotifications();
        }, 1000);
      }
    };

    return () => {
      channel.close();
    };
  }, [user, loadNotifications]); // Added loadNotifications to dependencies

  const handleMarkAsRead = async (notificationId) => {
    try {
      await base44.entities.Notification.update(notificationId, { is_read: true });
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.log('⚠️ Could not mark notification as read:', error?.message);
    }
  };

  const handleNotificationClick = async (notification) => {
    await handleMarkAsRead(notification.id);
    if (notification.url) {
      window.location.href = notification.url;
    }
  };

  // Always show bell, even with errors
  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          {unreadCount > 0 && !hasError && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="p-2">
          <h3 className="font-semibold mb-2">Notifikasi</h3>
          {isLoading ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Memuat notifikasi...
            </p>
          ) : hasError ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Tidak dapat memuat notifikasi
            </p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Tidak ada notifikasi baru
            </p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {notification.message}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
