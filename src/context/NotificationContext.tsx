// src/context/NotificationContext.tsx

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import type { Notification } from '@/types/reminder';
import {
  subscribeNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  processPendingReminders,
} from '@/services/reminderService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to notifications for current user
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const unsub = subscribeNotifications(user.username, (notifs) => {
      setNotifications(notifs);
    });

    return () => unsub();
  }, [user]);

  // Scheduler: runs every 60 seconds to process pending reminders
  useEffect(() => {
    if (!user) return;

    // Only run the scheduler for admin users to avoid duplicate processing
    // from multiple browser tabs/users
    if (user.role !== 'admin') {
      // Non-admin users still check every 2 minutes as a fallback
      schedulerRef.current = setInterval(async () => {
        try {
          await processPendingReminders();
        } catch (err) {
          console.error('[Reminder Scheduler] Error:', err);
        }
      }, 120_000); // 2 min fallback

      return () => {
        if (schedulerRef.current) clearInterval(schedulerRef.current);
      };
    }

    // Admin: process immediately on load, then every 60s
    const runScheduler = async () => {
      try {
        const count = await processPendingReminders();
        if (count > 0) {
          console.log(`[Reminder Scheduler] Processed ${count} reminder(s)`);
        }
      } catch (err) {
        console.error('[Reminder Scheduler] Error:', err);
      }
    };

    runScheduler(); // initial run
    schedulerRef.current = setInterval(runScheduler, 60_000); // every 1 min

    return () => {
      if (schedulerRef.current) clearInterval(schedulerRef.current);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (user) {
      await markAllNotificationsRead(user.username);
    }
  }, [user]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
