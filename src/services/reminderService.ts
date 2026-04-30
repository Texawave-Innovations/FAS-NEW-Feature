// src/services/reminderService.ts

import { database } from './firebase';
import {
  ref,
  push,
  set,
  update,
  get,
  onValue,
  query,
  orderByChild,
} from 'firebase/database';
import type { Reminder, Notification } from '@/types/reminder';
import type { UserRole } from '@/types';

// Firebase paths
const REMINDERS_PATH = 'reminders';
const NOTIFICATIONS_PATH = 'notifications';

// ── Static user-role map (mirrors AuthContext) ────────────────────────
const USERS_BY_ROLE: Record<UserRole, string[]> = {
  admin:      ['admin'],
  sales:      ['sales'],
  hr:         ['hr'],
  accountant: ['accounts'],
  manager:    ['manager'],
  quality:    ['quality'],
  production: ['production'],
};

// Sanitize helper (strip undefined)
const sanitize = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        clean[key] = sanitize(val);
      }
    }
    return clean;
  }
  return obj;
};

// ── CREATE REMINDER ───────────────────────────────────────────────────
export const createReminder = async (data: Omit<Reminder, 'id' | 'createdAt' | 'status'>): Promise<string | null> => {
  const listRef = ref(database, REMINDERS_PATH);
  const newRef = push(listRef);

  await set(newRef, sanitize({
    ...data,
    id: newRef.key,
    status: 'pending',
    createdAt: Date.now(),
  }));

  return newRef.key;
};

// ── GET ALL REMINDERS ─────────────────────────────────────────────────
export const getAllReminders = async (): Promise<Reminder[]> => {
  const listRef = ref(database, REMINDERS_PATH);
  const snapshot = await get(listRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  return Object.keys(data)
    .map((key) => ({ ...data[key], id: key }) as Reminder)
    .sort((a, b) => b.createdAt - a.createdAt);
};

// ── SUBSCRIBE TO REMINDERS (real-time) ────────────────────────────────
export const subscribeReminders = (callback: (reminders: Reminder[]) => void) => {
  const listRef = ref(database, REMINDERS_PATH);
  return onValue(listRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const reminders = Object.keys(data)
      .map((key) => ({ ...data[key], id: key }) as Reminder)
      .sort((a, b) => b.createdAt - a.createdAt);
    callback(reminders);
  });
};

// ── UPDATE REMINDER STATUS ────────────────────────────────────────────
export const updateReminderStatus = async (id: string, status: Reminder['status']) => {
  const recordRef = ref(database, `${REMINDERS_PATH}/${id}`);
  await update(recordRef, sanitize({
    status,
    updatedAt: Date.now(),
    ...(status === 'sent' ? { sentAt: Date.now() } : {}),
  }));
};

// ── CANCEL REMINDER ───────────────────────────────────────────────────
export const cancelReminder = async (id: string) => {
  await updateReminderStatus(id, 'cancelled');
};

// ── CREATE NOTIFICATION ───────────────────────────────────────────────
export const createNotification = async (data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<string | null> => {
  const listRef = ref(database, NOTIFICATIONS_PATH);
  const newRef = push(listRef);

  await set(newRef, sanitize({
    ...data,
    id: newRef.key,
    isRead: false,
    createdAt: Date.now(),
  }));

  return newRef.key;
};

// ── GET NOTIFICATIONS FOR A USER ──────────────────────────────────────
export const subscribeNotifications = (username: string, callback: (notifications: Notification[]) => void) => {
  const listRef = ref(database, NOTIFICATIONS_PATH);
  return onValue(listRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const notifications = Object.keys(data)
      .map((key) => ({ ...data[key], id: key }) as Notification)
      .filter((n) => n.targetUser === username)
      .sort((a, b) => b.createdAt - a.createdAt);
    callback(notifications);
  });
};

// ── MARK NOTIFICATION AS READ ─────────────────────────────────────────
export const markNotificationRead = async (id: string) => {
  const recordRef = ref(database, `${NOTIFICATIONS_PATH}/${id}`);
  await update(recordRef, {
    isRead: true,
    readAt: Date.now(),
  });
};

// ── MARK ALL NOTIFICATIONS AS READ FOR A USER ─────────────────────────
export const markAllNotificationsRead = async (username: string) => {
  const listRef = ref(database, NOTIFICATIONS_PATH);
  const snapshot = await get(listRef);
  if (!snapshot.exists()) return;

  const data = snapshot.val();
  const updates: Record<string, any> = {};

  Object.keys(data).forEach((key) => {
    if (data[key].targetUser === username && !data[key].isRead) {
      updates[`${NOTIFICATIONS_PATH}/${key}/isRead`] = true;
      updates[`${NOTIFICATIONS_PATH}/${key}/readAt`] = Date.now();
    }
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates);
  }
};

// ── PROCESS PENDING REMINDERS (scheduler tick) ────────────────────────
// This runs on the client side; it processes all pending reminders
// whose reminderAt time has passed. Idempotent — marks as "sent"
// immediately so other tabs/users won't duplicate.
export const processPendingReminders = async (): Promise<number> => {
  const now = new Date().getTime();
  const listRef = ref(database, REMINDERS_PATH);
  const snapshot = await get(listRef);

  if (!snapshot.exists()) return 0;

  const data = snapshot.val();
  let processed = 0;

  for (const key of Object.keys(data)) {
    const reminder = data[key] as Reminder;

    // Skip non-pending or future reminders
    if (reminder.status !== 'pending') continue;
    const reminderTime = new Date(reminder.reminderAt).getTime();
    if (isNaN(reminderTime) || reminderTime > now) continue;

    // Mark as sent FIRST to prevent duplicates from other tabs
    await updateReminderStatus(key, 'sent');

    // Resolve target users from roles
    const targetUsers = new Set<string>();

    if (reminder.notifyRoles && reminder.notifyRoles.length > 0) {
      for (const role of reminder.notifyRoles) {
        const users = USERS_BY_ROLE[role as UserRole] || [];
        users.forEach((u) => targetUsers.add(u));
      }
    }

    // Also notify self if checked
    if (reminder.notifySelf && reminder.createdBy) {
      targetUsers.add(reminder.createdBy);
    }

    // Create one notification per target user
    for (const username of targetUsers) {
      // Determine role for this user
      let userRole: UserRole = 'admin';
      for (const [role, users] of Object.entries(USERS_BY_ROLE)) {
        if (users.includes(username)) {
          userRole = role as UserRole;
          break;
        }
      }

      await createNotification({
        reminderId: key,
        title: reminder.title,
        message: reminder.description,
        targetUser: username,
        targetRole: userRole,
      });
    }

    processed++;
  }

  return processed;
};
