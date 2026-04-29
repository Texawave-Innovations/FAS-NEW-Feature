// src/pages/Reminders.tsx

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Bell,
  Plus,
  Clock,
  Send,
  Ban,
  Users,
  CalendarClock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Reminder } from '@/types/reminder';
import type { UserRole } from '@/types';
import { createReminder, subscribeReminders, cancelReminder } from '@/services/reminderService';

// All available roles
const ALL_ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'sales', label: 'Sales' },
  { value: 'hr', label: 'HR' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'manager', label: 'Manager' },
  { value: 'quality', label: 'Quality' },
  { value: 'production', label: 'Production' },
];

const STATUS_CONFIG = {
  pending: {
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Clock,
    label: 'Pending',
  },
  sent: {
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
    label: 'Sent',
  },
  cancelled: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    label: 'Cancelled',
  },
};

export default function Reminders() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'cancelled'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderAt, setReminderAt] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [notifySelf, setNotifySelf] = useState(true);

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Subscribe to reminders
  useEffect(() => {
    const unsub = subscribeReminders((data) => {
      if (!user) {
        setReminders([]);
        return;
      }
      const visibleReminders = data.filter((r) => {
        const inNotifyRoles = r.notifyRoles && r.notifyRoles.includes(user.role);
        const isCreator = r.createdBy === user.username;
        return inNotifyRoles || isCreator;
      });
      setReminders(visibleReminders);
    });
    return () => unsub();
  }, [user]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setReminderAt('');
    setSelectedRoles([]);
    setNotifySelf(true);
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!reminderAt) {
      newErrors.reminderAt = 'Date & time is required';
    } else if (new Date(reminderAt).getTime() < Date.now()) {
      newErrors.reminderAt = 'Must be a future date/time';
    }
    if (selectedRoles.length === 0 && !notifySelf) {
      newErrors.roles = 'Select at least one role or enable "Notify Self"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !user) return;

    setIsSubmitting(true);
    try {
      await createReminder({
        title: title.trim(),
        description: description.trim(),
        reminderAt,
        notifyRoles: selectedRoles,
        notifySelf,
        createdBy: user.username,
        createdByRole: user.role,
      });

      toast({
        title: '✅ Reminder Created',
        description: `Will fire at ${new Date(reminderAt).toLocaleString()}`,
      });

      resetForm();
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to create reminder:', err);
      toast({
        title: '❌ Error',
        description: 'Failed to create reminder. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelReminder(id);
      toast({ title: 'Reminder cancelled' });
    } catch (err) {
      console.error('Failed to cancel reminder:', err);
    }
  };

  const toggleRole = (role: UserRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
    // Clear role error when user selects
    if (errors.roles) setErrors((prev) => ({ ...prev, roles: '' }));
  };

  const filteredReminders =
    filter === 'all' ? reminders : reminders.filter((r) => r.status === filter);

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Get min datetime for the input (current time)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const stats = {
    total: reminders.length,
    pending: reminders.filter((r) => r.status === 'pending').length,
    sent: reminders.filter((r) => r.status === 'sent').length,
    cancelled: reminders.filter((r) => r.status === 'cancelled').length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20">
                <Bell className="h-7 w-7 text-violet-600" />
              </div>
              Reminders & Notifications
            </h1>
            <p className="text-muted-foreground mt-1">
              Schedule role-based reminders that automatically notify team members.
            </p>
          </div>

          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button
                id="create-reminder-btn"
                className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30"
              >
                <Plus className="h-4 w-4" />
                New Reminder
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  Create New Reminder
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 py-3">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="reminder-title" className="text-sm font-medium">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reminder-title"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors((p) => ({ ...p, title: '' })); }}
                    placeholder="e.g. Monthly Report Submission"
                    className={cn(errors.title && 'border-red-400 focus:ring-red-400')}
                  />
                  {errors.title && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.title}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="reminder-desc" className="text-sm font-medium">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="reminder-desc"
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); if (errors.description) setErrors((p) => ({ ...p, description: '' })); }}
                    placeholder="Describe what this reminder is about..."
                    rows={3}
                    className={cn(errors.description && 'border-red-400 focus:ring-red-400')}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.description}
                    </p>
                  )}
                </div>

                {/* Date & Time */}
                <div className="space-y-2">
                  <Label htmlFor="reminder-datetime" className="text-sm font-medium">
                    Remind At <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reminder-datetime"
                    type="datetime-local"
                    value={reminderAt}
                    onChange={(e) => { setReminderAt(e.target.value); if (errors.reminderAt) setErrors((p) => ({ ...p, reminderAt: '' })); }}
                    min={getMinDateTime()}
                    className={cn(errors.reminderAt && 'border-red-400 focus:ring-red-400')}
                  />
                  {errors.reminderAt && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.reminderAt}
                    </p>
                  )}
                </div>

                {/* Role Selection (multi-select with chips) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Notify Roles <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_ROLES.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => toggleRole(role.value)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200',
                          selectedRoles.includes(role.value)
                            ? 'bg-violet-100 text-violet-800 border-violet-300 shadow-sm'
                            : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:border-muted-foreground/30'
                        )}
                      >
                        {selectedRoles.includes(role.value) && '✓ '}
                        {role.label}
                      </button>
                    ))}
                  </div>
                  {/* Select All / Clear All */}
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedRoles(ALL_ROLES.map((r) => r.value))}
                      className="text-xs text-primary hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground text-xs">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedRoles([])}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  {errors.roles && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.roles}
                    </p>
                  )}
                </div>

                {/* Notify Self */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="notify-self" className="text-sm cursor-pointer">
                      Also notify me
                    </Label>
                  </div>
                  <Switch
                    id="notify-self"
                    checked={notifySelf}
                    onCheckedChange={setNotifySelf}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  id="submit-reminder-btn"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Create Reminder
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'from-slate-500/10 to-slate-500/5', textColor: 'text-slate-700', icon: CalendarClock },
            { label: 'Pending', value: stats.pending, color: 'from-amber-500/10 to-amber-500/5', textColor: 'text-amber-700', icon: Clock },
            { label: 'Sent', value: stats.sent, color: 'from-emerald-500/10 to-emerald-500/5', textColor: 'text-emerald-700', icon: CheckCircle2 },
            { label: 'Cancelled', value: stats.cancelled, color: 'from-red-500/10 to-red-500/5', textColor: 'text-red-700', icon: XCircle },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className={cn('bg-gradient-to-br', stat.color, 'border-0 shadow-sm')}>
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                      <p className={cn('text-2xl font-bold mt-0.5', stat.textColor)}>{stat.value}</p>
                    </div>
                    <Icon className={cn('h-8 w-8 opacity-30', stat.textColor)} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(['all', 'pending', 'sent', 'cancelled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filter === f
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Reminders List */}
        <div className="space-y-3">
          {filteredReminders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 rounded-full bg-violet-50 mb-4">
                  <Bell className="h-10 w-10 text-violet-300" />
                </div>
                <p className="text-muted-foreground font-medium">No reminders found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first reminder to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredReminders.map((reminder) => {
              const statusConf = STATUS_CONFIG[reminder.status];
              const StatusIcon = statusConf.icon;
              const isPast = new Date(reminder.reminderAt).getTime() < Date.now();

              return (
                <Card
                  key={reminder.id}
                  id={`reminder-card-${reminder.id}`}
                  className={cn(
                    'transition-all duration-300 hover:shadow-md',
                    reminder.status === 'cancelled' && 'opacity-60'
                  )}
                >
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-semibold text-foreground truncate">
                            {reminder.title}
                          </h3>
                          <Badge variant="outline" className={cn('text-[10px] px-2', statusConf.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConf.label}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {reminder.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {formatDateTime(reminder.reminderAt)}
                            {isPast && reminder.status === 'pending' && (
                              <span className="text-amber-600 font-medium">(overdue)</span>
                            )}
                          </span>

                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {reminder.notifyRoles?.length > 0
                              ? reminder.notifyRoles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')
                              : 'No roles'}
                            {reminder.notifySelf && ' + Self'}
                          </span>

                          <span className="text-muted-foreground/60">
                            by {reminder.createdBy}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      {reminder.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(reminder.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 flex-shrink-0 gap-1"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
