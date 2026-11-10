import React, { useState } from 'react';
import {
  ShieldAlert,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { AdminAccountRegistrationInput } from '../../types/emergency';

export const HospitalRegistrationPage: React.FC = () => {
  const { registerAccount, setActiveTab, isBackendConnected } = useHospital();

  const [formData, setFormData] = useState<AdminAccountRegistrationInput>({
    administratorName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.administratorName.trim()) {
      setErrorMessage('Please enter the administrator or chief medical officer name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please enter a valid official hospital login email address.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters in length.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await registerAccount(formData);
      setSuccess(true);
    } catch (err: unknown) {
      let msg = 'Account registration failed. Please try again.';
      if (err instanceof Error) {
        if (err.message.includes('auth/email-already-in-use')) {
          msg = 'This email address is already registered. Please sign in or use another email.';
        } else if (err.message.includes('auth/weak-password')) {
          msg = 'The password is too weak. Please use at least 6 characters with mixed letters and numbers.';
        } else if (err.message.includes('auth/invalid-email')) {
          msg = 'Invalid email address format.';
        } else {
          msg = err.message;
        }
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
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
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-medium">Hospital Administrator Registration</span>
          </div>
        </div>

        {/* Success Card */}
        {success ? (
          <div className="bg-slate-900/90 border border-emerald-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-white">Account Created Successfully</h2>
              <p className="text-xs text-emerald-400 font-medium">
                Status: pendingVerification · Awaiting Administrative Review
              </p>
            </div>
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
              <p className="leading-relaxed">
                Your administrator account has been created with secure backend authentication. In compliance with emergency healthcare guidelines, newly registered accounts are set to <strong>pending verification</strong> until approved.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Once approved, you can log in and complete your hospital facility information on the <strong>Hospital Details</strong> page.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-colors cursor-pointer"
              >
                Proceed to Hospital Login &rarr;
              </button>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Create Hospital Account
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

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Administrator Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Administrator Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.administratorName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, administratorName: e.target.value }))
                    }
                    placeholder="Dr. Rajeshwari Sharma, CMO"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Hospital Login Email */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Hospital Login Email <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="cmo@hospital.org"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password (min 6 characters) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 font-mono"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 font-mono"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Account Verification Policy</span>
                </div>
                <p>
                  Newly registered hospital accounts begin with pending verification. After approval, you can fill in hospital details and activate live ambulance routing. Passwords are securely hashed on the backend using bcrypt and never stored in plaintext.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-lg shadow-rose-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Administrator Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Hospital Administrator Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Back to Login Link */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Already registered?</span>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Hospital Login</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
