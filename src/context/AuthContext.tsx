import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  hasAccess: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Static user database for demo
const USERS: Record<string, { password: string; role: UserRole; name: string }> = {
  'admin': { password: 'admin123', role: 'admin', name: 'Admin User' },
  'sales': { password: 'sales123', role: 'sales', name: 'Sales Executive' },
  'hr': { password: 'hr123', role: 'hr', name: 'HR Manager' },
  'accounts': { password: 'accounts123', role: 'accountant', name: 'Accountant User' },
  'manager': { password: 'manager123', role: 'manager', name: 'Manager User' },
  'quality': { password: 'quality123', role: 'quality', name: 'Quality Inspector' },
  'production': { password: 'prod123', role: 'production', name: 'Production Head' },
};

// Default role-based access control (fallback if no custom config saved)
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin:      ['dashboard', 'sales', 'hr', 'quality', 'production', 'master', 'settings', 'reports'],
  sales:      ['dashboard', 'sales'],
  hr:         ['dashboard', 'hr'],
  accountant: ['dashboard', 'finance'],
  manager:    ['dashboard', 'production', 'quality'],
  quality:    ['dashboard', 'quality'],
  production: ['dashboard', 'production'],
};

const loadSavedPermissions = (): Record<string, string[]> => {
  try {
    const saved = localStorage.getItem('erp_role_permissions');
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return DEFAULT_ROLE_PERMISSIONS;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(loadSavedPermissions);

  useEffect(() => {
    const savedUser = localStorage.getItem('erp_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    // Re-read permissions (in case Settings page updated them)
    setRolePermissions(loadSavedPermissions());
  }, []);

  // Listen for permission changes saved by Settings page
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'erp_role_permissions') {
        setRolePermissions(loadSavedPermissions());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = (username: string, password: string): boolean => {
    const userData = USERS[username];
    if (userData && userData.password === password) {
      const user: User = {
        username,
        role: userData.role,
        name: userData.name,
      };
      setUser(user);
      localStorage.setItem('erp_user', JSON.stringify(user));
      // Refresh permissions on login
      setRolePermissions(loadSavedPermissions());
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('erp_user');
  };

  const hasAccess = (module: string): boolean => {
    if (!user) return false;
    const perms = rolePermissions[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    return perms.includes(module.toLowerCase());
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
