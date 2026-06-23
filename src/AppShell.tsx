import { useAuth } from './AuthContext';
import App from './App';
import LoginPage from './LoginPage';
import { Loader2 } from 'lucide-react';

// In dev mode without Firebase config, skip auth entirely
const isDevBypass = !import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.DEV;

export default function AppShell() {
  const { user, loading } = useAuth();

  // Dev bypass: skip auth when no Firebase config is provided
  if (isDevBypass) {
    return <App />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1B203C] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#6321FF] animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <App />;
}
