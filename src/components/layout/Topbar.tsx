import { useAuth } from '@/context/AuthContext';
import { User } from 'lucide-react';

export const Topbar = () => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-end sticky top-0 z-10">
      {user && (
        <div className="flex items-center gap-2 text-sm">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xs text-muted-foreground">Welcome,</span>
            <span className="font-semibold text-foreground">{user.name}</span>
          </div>
        </div>
      )}
    </header>
  );
};
