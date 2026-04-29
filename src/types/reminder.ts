// src/types/reminder.ts

import { UserRole } from './index';

export type ReminderStatus = 'pending' | 'sent' | 'cancelled';

export interface Reminder {
  id: string;
  title: string;
  description: string;
  reminderAt: string;          // ISO date-time string
  notifyRoles: UserRole[];     // which roles to notify
  notifySelf: boolean;         // also notify the creator
  createdBy: string;           // username of creator
  createdByRole: UserRole;
  status: ReminderStatus;
  createdAt: number;
  updatedAt?: number;
  sentAt?: number;
}

export interface Notification {
  id: string;
  reminderId: string;
  title: string;
  message: string;
  targetUser: string;          // username
  targetRole: UserRole;
  isRead: boolean;
  createdAt: number;
  readAt?: number;
}
