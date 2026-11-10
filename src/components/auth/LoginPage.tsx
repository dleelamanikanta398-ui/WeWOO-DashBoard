import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Hospital,
  Eye,
  EyeOff,
  UserPlus,
  Send,
  X,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { DEMO_STAFF_USERS } from '../../data/mockData';

export const LoginPage: React.FC = () => {
  const { login, resetPassword, isBackendConnected, hospitalProfile, setActiveTab } = useHospital();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide hospital staff email and security password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(email, password);
    } catch (err: unknown) {
      let msg = 'Invalid credentials or connection error.';
      if (err instanceof Error) {
        if (err.message.includes('auth/invalid-credential') || err.message.includes('auth/wrong-password')) {
          msg = 'Invalid hospital login credentials. Please verify your email and password.';
        } else if (err.message.includes('auth/user-not-found')) {
          msg = 'No hospital account found for this email address. Please register your facility.';
        } else if (err.message.includes('auth/too-many-requests')) {
          msg = 'Access temporarily disabled due to multiple failed login attempts. Please reset your password or try again later.';
        } else {
          msg = err.message;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (index: number) => {
    setLoading(true);
    setError(null);
    try {
      await login('', '', index);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes('@')) {
      setResetError('Please enter a valid hospital email address.');
      return;
    }

    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      await resetPassword(resetEmail);
      setResetSuccess(
        `A secure password-reset link has been dispatched to ${resetEmail}. Check your inbox to set a new password.`
      );
    } catch (err: unknown) {
      let msg = 'Failed to send password reset email.';
      if (err instanceof Error) {
        if (err.message.includes('auth/user-not-found')) {
          msg = 'No registered hospital account found with that email address.';
        } else {
          msg = err.message;
        }
      }
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 shadow-xl shadow-rose-950/60 text-white mb-3">
            <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            WEWOO
          </h1>
          <p className="text-xs font-semibold tracking-wider uppercase text-rose-400 mt-0.5">
            Hospital Emergency Response Command Center
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-slate-400">
            <Hospital className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300 font-medium">Hospital Staff & Administrator Access</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Hospital Login Portal
            </span>
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                isBackendConnected
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
              }`}
            >
              {isBackendConnected ? 'Backend API: Online' : 'Backend API: Offline'}
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Hospital Login Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hospital.org"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  Security Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-lg shadow-rose-950 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Command Center</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Link */}
          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">New hospital facility?</span>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Hospital &rarr;</span>
            </button>
          </div>

          {/* Fast Demo Access */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span>Demonstration Quick Access</span>
              <span className="text-[9px] text-amber-400 font-mono">DEV EVAL</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2.5 leading-tight">
              Instant login with authorized clinical personas to evaluate command center workflows:
            </p>

            <div className="space-y-1.5">
              {DEMO_STAFF_USERS.map((usr, idx) => (
                <button
                  key={usr.uid}
                  type="button"
                  onClick={() => handleDemoLogin(idx)}
                  className="w-full py-2 px-3 bg-slate-950/70 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-rose-300">
                      {usr.displayName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {usr.role} · {usr.email}
                    </div>
                  </div>
                  <span className="text-[11px] text-cyan-400 font-medium group-hover:translate-x-0.5 transition-transform">
                    Enter &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-white text-sm">
                    Reset Hospital Staff Password
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Enter your authorized hospital email address. WEWOO Backend Authentication will dispatch a secure password reset link to your verified inbox.
              </p>

              {resetSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              {resetError && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              {!resetSuccess ? (
                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Registered Hospital Email
                    </label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@hospital.org"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {resetLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Password Reset Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setResetSuccess(null);
                    }}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
