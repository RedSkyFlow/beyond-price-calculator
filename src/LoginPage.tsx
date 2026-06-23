import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from './AuthContext';
import { Wifi, Lock, Mail, ArrowRight, Loader2, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const { signIn, resetPassword, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
    } catch {
      // Error is handled in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch {
      // Error is handled in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1B203C] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#6321FF]/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#15ffdf]/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6321FF]/5 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="flex flex-col items-center justify-center mb-6">
            <img 
              src="/beyond-logo.png" 
              alt="Beyond" 
              className="h-10 md:h-11 w-auto object-contain" 
              referrerPolicy="no-referrer" 
            />
            <span className="text-[7.5px] md:text-[8px] text-[#8E9299] font-extrabold uppercase tracking-[0.16em] mt-1.5 text-center w-full block whitespace-nowrap">Preferred Purple Partner</span>
          </div>
          <h1 className="text-white text-xl font-bold mb-2">Purple Price Calculator</h1>
          <p className="text-slate-400 text-sm">Partner access only. Sign in to continue.</p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl"
        >
          {!showReset ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6321FF]/50 focus:border-[#6321FF]/50 transition-all"
                  placeholder="you@company.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6321FF]/50 focus:border-[#6321FF]/50 transition-all"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                >
                  <p className="text-sm text-red-400">{error}</p>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#6321FF] text-white py-3 rounded-xl font-bold hover:bg-[#4E1AD4] transition-all shadow-lg shadow-[#6321FF]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setShowReset(true); setResetSent(false); }}
                className="w-full text-sm text-slate-400 hover:text-white transition-colors py-2"
              >
                Forgot your password?
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="text-center mb-4">
                <KeyRound className="w-10 h-10 text-[#6321FF] mx-auto mb-3" />
                <h3 className="text-white font-bold text-lg">Reset Password</h3>
                <p className="text-slate-400 text-sm mt-1">
                  {resetSent ? "Check your email for a reset link." : "Enter your email to receive a password reset link."}
                </p>
              </div>

              {!resetSent && (
                <>
                  <div className="space-y-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6321FF]/50 focus:border-[#6321FF]/50 transition-all"
                      placeholder="you@company.com"
                    />
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                    >
                      <p className="text-sm text-red-400">{error}</p>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#6321FF] text-white py-3 rounded-xl font-bold hover:bg-[#4E1AD4] transition-all shadow-lg shadow-[#6321FF]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => { setShowReset(false); setResetSent(false); }}
                className="w-full text-sm text-slate-400 hover:text-white transition-colors py-2"
              >
                Back to sign in
              </button>
            </form>
          )}
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img 
              src="/purple-logo-white.svg" 
              alt="Purple" 
              className="h-5 w-auto object-contain opacity-40" 
              referrerPolicy="no-referrer" 
            />
          </div>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
            &copy; 2026 Beyond. Private and Confidential.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
