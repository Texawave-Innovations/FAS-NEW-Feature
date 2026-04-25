// src/modules/hr/HRLayout.tsx

import { Outlet, NavLink } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { LiveClock } from '@/components/layout/LiveClock';

import {
  Users,
  CalendarCheck,
  FileText,
  HandCoins,
  FolderOpen,
  CalendarPlus,
  Timer,
  CalendarDays,
  CircleOff,
  UserCircle,
  FileStack,
  LayoutDashboard,
  CheckCircle,
  ShieldCheck,
  ShieldPlus,
  BadgePercent,
  IndianRupee, // ✅ Rupees icon
} from 'lucide-react';

export default function HRLayout() {
  const hrMenuItems = [
    { path: '/hr/dashboard', label: 'Dashboard', icon: LayoutDashboard },

    { path: '/hr/employees', label: 'Employees', icon: Users },
    { path: '/hr/profile', label: 'Profile', icon: UserCircle },

    { path: '/hr/attendance', label: 'Attendance', icon: CalendarCheck },
    { path: '/hr/approval-attendance', label: 'Approval Attendance', icon: CheckCircle },

    // { path: '/hr/leaves', label: 'Leaves', icon: FileText },

    // ✅ Payroll with Rupees symbol
    { path: '/hr/payroll', label: 'Payroll', icon: IndianRupee },

    // ⭐ Compliance
    { path: '/hr/pf', label: 'PF', icon: ShieldCheck },
    { path: '/hr/esi', label: 'ESI', icon: ShieldPlus },

    // ⭐ OT Rate
    { path: '/hr/ot-rate', label: 'OT Rate', icon: BadgePercent },

    { path: '/hr/loans', label: 'Loans', icon: HandCoins },

    { path: '/hr/documents', label: 'Documents', icon: FolderOpen },
    { path: '/hr/other-documents', label: 'Other Documents', icon: FileStack },

    { path: '/hr/holidays', label: 'Holidays', icon: CalendarPlus },
    { path: '/hr/stot', label: 'Staff OT Hours', icon: Timer },

    { path: '/hr/full-month-present', label: 'Full Month Present', icon: CalendarDays },
    { path: '/hr/full-month-absent', label: 'Full Month Absent', icon: CircleOff },

    { path: '/hr/bonus', label: 'Bonus', icon: IndianRupee },
  ];

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">HR Module</h1>
            <p className="text-muted-foreground mt-1">
              Human Resource Management System
            </p>
          </div>
          <LiveClock />
        </div>

        {/* HR Navigation Tabs */}
        <div className="flex overflow-x-auto no-scrollbar gap-1 border-b border-border pb-1">
          {hrMenuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive }) =>
                  `flex items-center gap-2.5 whitespace-nowrap px-5 py-3
                   text-sm font-medium rounded-t-lg transition-all duration-200
                   border-b-2 -mb-px
                   ${
                     isActive
                       ? 'bg-primary/5 border-primary text-primary font-semibold shadow-sm'
                       : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border'
                   }`
                }
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </Layout>
  );
}
