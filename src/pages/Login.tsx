import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import fas from '@/modules/sales/fas.png';

function GearLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      <style>{`
        @keyframes spinCW {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinCCW {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        .gear-cw { animation: spinCW 1.5s linear infinite; }
        .gear-ccw { animation: spinCCW 1.2s linear infinite; }
        .gear-cw-slow { animation: spinCW 2s linear infinite; }
        .slide-in { animation: slideIn 0.4s ease-out forwards; }
        .progress-fill { animation: progressBar 1.5s ease-in-out forwards; }
      `}</style>

      <div className="relative w-48 h-48 mb-8">
        {/* Large gear - center */}
        <svg className="gear-cw absolute top-4 left-6" width="90" height="90" viewBox="0 0 100 100">
          <path d="M50 10 L54 10 L56 2 L60 2 L62 10 L66 12 L72 6 L76 8 L74 16 L78 20 L86 18 L88 22 L80 26 L82 30 L90 34 L90 38 L82 40 L82 44 L90 48 L90 52 L82 54 L80 58 L88 62 L86 66 L78 64 L74 68 L76 76 L72 78 L66 72 L62 74 L60 82 L56 82 L54 74 L50 74 L46 82 L42 82 L40 74 L36 72 L30 78 L26 76 L28 68 L24 64 L16 66 L14 62 L22 58 L20 54 L12 52 L12 48 L20 46 L20 42 L12 38 L12 34 L20 30 L22 26 L14 22 L16 18 L24 20 L28 16 L26 8 L30 6 L36 12 L40 10 L42 2 L46 2 L48 10Z"
            fill="#1e3a5f" stroke="#0f2844" strokeWidth="1"/>
          <circle cx="50" cy="42" r="16" fill="#ffffff" stroke="#0f2844" strokeWidth="1.5"/>
        </svg>

        {/* Small gear - top right */}
        <svg className="gear-ccw absolute -top-1 right-2" width="55" height="55" viewBox="0 0 100 100">
          <path d="M50 10 L54 10 L56 2 L60 2 L62 10 L66 12 L72 6 L76 8 L74 16 L78 20 L86 18 L88 22 L80 26 L82 30 L90 34 L90 38 L82 40 L82 44 L90 48 L90 52 L82 54 L80 58 L88 62 L86 66 L78 64 L74 68 L76 76 L72 78 L66 72 L62 74 L60 82 L56 82 L54 74 L50 74 L46 82 L42 82 L40 74 L36 72 L30 78 L26 76 L28 68 L24 64 L16 66 L14 62 L22 58 L20 54 L12 52 L12 48 L20 46 L20 42 L12 38 L12 34 L20 30 L22 26 L14 22 L16 18 L24 20 L28 16 L26 8 L30 6 L36 12 L40 10 L42 2 L46 2 L48 10Z"
            fill="#3b82f6" stroke="#2563eb" strokeWidth="1"/>
          <circle cx="50" cy="42" r="16" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5"/>
        </svg>

        {/* Medium gear - bottom right */}
        <svg className="gear-cw-slow absolute bottom-0 right-0" width="65" height="65" viewBox="0 0 100 100">
          <path d="M50 10 L54 10 L56 2 L60 2 L62 10 L66 12 L72 6 L76 8 L74 16 L78 20 L86 18 L88 22 L80 26 L82 30 L90 34 L90 38 L82 40 L82 44 L90 48 L90 52 L82 54 L80 58 L88 62 L86 66 L78 64 L74 68 L76 76 L72 78 L66 72 L62 74 L60 82 L56 82 L54 74 L50 74 L46 82 L42 82 L40 74 L36 72 L30 78 L26 76 L28 68 L24 64 L16 66 L14 62 L22 58 L20 54 L12 52 L12 48 L20 46 L20 42 L12 38 L12 34 L20 30 L22 26 L14 22 L16 18 L24 20 L28 16 L26 8 L30 6 L36 12 L40 10 L42 2 L46 2 L48 10Z"
            fill="#1e40af" stroke="#1e3a8a" strokeWidth="1"/>
          <circle cx="50" cy="42" r="16" fill="#ffffff" stroke="#1e3a8a" strokeWidth="1.5"/>
        </svg>
      </div>

      <div className="slide-in text-center">
        <p className="text-xl font-bold text-gray-800 mb-1">Initializing System</p>
        <p className="text-sm text-gray-500 mb-6">Setting up your workspace...</p>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="progress-fill h-full bg-gradient-to-r from-blue-900 via-blue-600 to-blue-500 rounded-full" />
      </div>
    </div>
  );
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate credentials without calling login() yet (which sets user and triggers redirect)
    const USERS: Record<string, string> = {
      admin: 'admin123', sales: 'sales123', hr: 'hr123',
      accounts: 'accounts123', manager: 'manager123',
      quality: 'quality123', production: 'prod123',
    };

    const isValid = USERS[username] === password;

    if (isValid) {
      setLoading(false);
      setShowLoader(true);
      // After 1.5s loader, actually login (sets user in context) and navigate
      setTimeout(() => {
        login(username, password);
        navigate('/dashboard');
      }, 1500);
    } else {
      toast.error('Invalid username or password');
      setLoading(false);
    }
  };

  if (showLoader) {
    return <GearLoader />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <img src={fas} alt="FAS Logo" className="w-36 h-auto object-contain mx-auto mb-4" />
          <p className="text-gray-500 text-lg mt-1">ERP</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 text-lg mt-1">Sign in to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-base font-semibold text-gray-700">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="pl-11 h-14 text-lg bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-semibold text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-11 pr-12 h-14 text-lg bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold shadow-lg shadow-blue-900/20 transition-all"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-400 text-center mb-3 font-medium uppercase tracking-wider">Demo Credentials</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setUsername('admin'); setPassword('admin123'); }}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left group cursor-pointer"
              >
                <p className="font-semibold text-sm text-blue-900 group-hover:text-blue-700">admin</p>
                <p className="text-xs text-blue-500">All access</p>
              </button>
              <button
                type="button"
                onClick={() => { setUsername('sales'); setPassword('sales123'); }}
                className="p-2.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-left group cursor-pointer"
              >
                <p className="font-semibold text-sm text-emerald-900 group-hover:text-emerald-700">sales</p>
                <p className="text-xs text-emerald-500">Sales only</p>
              </button>
              <button
                type="button"
                onClick={() => { setUsername('hr'); setPassword('hr123'); }}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left group cursor-pointer"
              >
                <p className="font-semibold text-sm text-blue-900 group-hover:text-blue-700">hr</p>
                <p className="text-xs text-blue-500">HR only</p>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          FAS Pvt Ltd &copy; {new Date().getFullYear()}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
