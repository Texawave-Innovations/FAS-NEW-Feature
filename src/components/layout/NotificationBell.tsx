// src/components/layout/NotificationBell.tsx

import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Clock, X } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';

export const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-xl transition-all duration-300',
          'hover:bg-accent hover:scale-105',
          'focus:outline-none focus:ring-2 focus:ring-primary/30',
          isOpen && 'bg-accent'
        )}
        title="Notifications"
      >
        <Bell
          className={cn(
            'h-5 w-5 transition-colors',
            unreadCount > 0 ? 'text-primary' : 'text-muted-foreground'
          )}
        />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1 animate-pulse shadow-lg shadow-red-500/30">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          id="notification-dropdown"
          className={cn(
            'absolute right-0 top-12 w-96 max-h-[480px] z-50',
            'bg-card border border-border rounded-2xl shadow-2xl shadow-black/10',
            'animate-in fade-in slide-in-from-top-2 duration-200',
            'flex flex-col overflow-hidden'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Read all
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted/50 mb-3">
                  <Bell className="h-8 w-8 opacity-40" />
                </div>
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.slice(0, 50).map((notification) => (
                  <button
                    key={notification.id}
                    id={`notification-item-${notification.id}`}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead(notification.id);
                      }
                    }}
                    className={cn(
                      'w-full text-left px-5 py-3.5 flex gap-3 items-start transition-all duration-200',
                      'hover:bg-accent/50 group',
                      !notification.isRead && 'bg-primary/[0.03]'
                    )}
                  >
                    {/* Unread Dot */}
                    <div className="mt-1.5 flex-shrink-0">
                      <div
                        className={cn(
                          'h-2.5 w-2.5 rounded-full transition-all',
                          notification.isRead
                            ? 'bg-transparent'
                            : 'bg-primary shadow-sm shadow-primary/30'
                        )}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm leading-tight',
                          notification.isRead
                            ? 'text-muted-foreground font-normal'
                            : 'text-foreground font-semibold'
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground/70">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(notification.createdAt)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Showing latest {Math.min(notifications.length, 50)} of {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
