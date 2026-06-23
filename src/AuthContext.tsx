import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  Auth
} from 'firebase/auth';

// Only import auth if Firebase is configured
let auth: Auth | null = null;
if (import.meta.env.VITE_FIREBASE_API_KEY) {
  import('./firebase').then(mod => {
    auth = mod.auth;
  });
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firebaseAuth, setFirebaseAuth] = useState<Auth | null>(null);

  useEffect(() => {
    // If no Firebase config, skip auth setup
    if (!import.meta.env.VITE_FIREBASE_API_KEY) {
      setLoading(false);
      return;
    }

    // Dynamically import Firebase auth
    import('./firebase').then(mod => {
      setFirebaseAuth(mod.auth);
      const unsubscribe = onAuthStateChanged(mod.auth, (user) => {
        setUser(user);
        setLoading(false);
      });
      return () => unsubscribe();
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!firebaseAuth) throw new Error('Firebase not configured');
    setError(null);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Sign in failed. Please try again.');
      }
      throw err;
    }
  };

  const signOut = async () => {
    if (!firebaseAuth) return;
    setError(null);
    await firebaseSignOut(firebaseAuth);
  };

  const resetPassword = async (email: string) => {
    if (!firebaseAuth) throw new Error('Firebase not configured');
    setError(null);
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
    } catch (err: any) {
      setError('Failed to send password reset email. Please check the email address.');
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, resetPassword, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
