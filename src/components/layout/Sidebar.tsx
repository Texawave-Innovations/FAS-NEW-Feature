import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  ClipboardCheck,
  Archive,
  Server,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'sales', label: 'Sales', icon: ShoppingCart, path: '/sales' },
  { id: 'hr', label: 'HR', icon: Users, path: '/hr/dashboard' },
    { id: 'production', label: 'Production', icon: Archive, path: '/production' },
  { id: 'quality', label: 'Quality', icon: ClipboardCheck, path: '/quality' },
  { id: 'master', label: 'Master Lists', icon: Server, path: '/master' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, hasAccess } = useAuth();

  const filteredMenuItems = menuItems.filter(item => hasAccess(item.id));

  return (
    <aside
      className={cn(
        'h-screen bg-card border-r border-border flex flex-col transition-all duration-300 sticky top-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header with Logo */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img
              src="https://i.postimg.cc/HxQtB69t/fas.jpg"
              alt="Logo"
              className="h-8 w-auto object-contain rounded"
            />
            <div>
              <h1 className="font-bold text-sm text-foreground">FAS ERP</h1>
              <p className="text-xs text-muted-foreground">Pvt Ltd</p>
            </div>
          </div>
        )}

        {collapsed && (
          <img
            src="https://i.postimg.cc/HxQtB69t/fas.jpg"
            alt="Logo"
            className="h-8 w-8 object-contain rounded"
          />
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground ml-auto"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* User Info */}
      {!collapsed && user && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-sm">
                {user.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground'
                    )
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-border">
        <button
          onClick={logout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
            'text-destructive hover:bg-destructive/10 transition-colors'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
