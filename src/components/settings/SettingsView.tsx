import React, { useState } from 'react';
import {
  Settings,
  Hospital,
  Shield,
  KeyRound,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  CheckCircle2,
  AlertCircle,
  Building2,
  Mail,
  User,
  ExternalLink,
  Send,
  Sparkles,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';

interface FaqItem {
  question: string;
  answer: string;
}

export const SettingsView: React.FC = () => {
  const {
    hospitalProfile,
    registeredProfile,
    currentUser,
    theme,
    toggleTheme,
    setTheme,
    resetPassword,
    logout,
    setActiveTab,
    verificationStatus,
    isDemoMode,
  } = useHospital();

  // Reset password states
  const [resetEmail, setResetEmail] = useState<string>(currentUser?.email || '');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // FAQ accordion open/close indices
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes('@')) {
      setResetError('Please enter a valid administrator email address.');
      return;
    }
    setIsResetting(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      await resetPassword(resetEmail);
      setResetSuccess(
        `A password-reset email has been dispatched to ${resetEmail}. Check your inbox to set a new password.`
      );
    } catch (err: unknown) {
      setResetError(
        err instanceof Error ? err.message : 'Failed to send password-reset email.'
      );
    } finally {
      setIsResetting(false);
    }
  };

  const faqs: FaqItem[] = [
    {
      question: '1. How do I update hospital details?',
      answer:
        'Navigate to the "Hospital Details" page from the sidebar. You can review and update official facility details including hospital name, license number, governance type, emergency contact, physical address, and GPS coordinates, then click "Save & Update Hospital Details" to save directly to WEWOO Backend & PostgreSQL database.',
    },
    {
      question: '2. How do I add or update hospital specialities?',
      answer:
        'Specialities can be configured on the "Hospital Details" page or the "Specialities & Capabilities" page. Select any active clinical departments (Cardiology, Trauma, Neurology, General Surgery, etc.) or enter custom specialities under "Other Speciality", and click Save to synchronize them across the dispatch network.',
    },
    {
      question: '3. How are incoming emergencies displayed?',
      answer:
        'Incoming emergencies dispatched towards this facility appear in real time on the "Command Center" and "Incoming Emergencies" queue via real-time Socket.IO events and backend REST APIs. High-priority cases (Code Red / P1) trigger audio chimes and red visual alerts.',
    },
    {
      question: '4. What do Request Received, Accepted, Preparing, and Ready for Arrival mean?',
      answer:
        '• Request Received: An ambulance has been routed to this facility and is awaiting triage review.\n• Accepted: The hospital has confirmed acceptance of the emergency.\n• Preparing: Clinical staff and equipment preparation is actively underway.\n• Ready for Arrival: Trauma bay, ICU bed, and clinical teams are fully prepped and waiting at the ambulance receiving bay.',
    },
    {
      question: '5. How does the Emergency Preparation checklist work?',
      answer:
        'Under the "Emergency Preparation" tab, each emergency has a tailored clinical checklist based on its emergency type (e.g., Cardiac, Trauma, Stroke). Triage staff mark items like "Trauma Bay Reserved", "ECG Monitor Online", or "Cath Lab Alerted". Checking all items updates the readiness status to "Ready for Arrival".',
    },
    {
      question: '6. How are available beds and ICU beds updated?',
      answer:
        'Go to the "Hospital Resources" page. Staff can adjust available general beds, ICU beds, trauma bays, doctors, and nurses on duty, or select an operational status (e.g., Normal Operations, Elevated Demand). Clicking "Save Live Resource Status" persists balanced counts to WEWOO Backend & PostgreSQL and broadcasts via Socket.IO.',
    },
    {
      question: '7. Why is an ambulance not appearing on the map?',
      answer:
        'An ambulance will only appear on the interactive map if its telemetry contains valid GPS latitude and longitude coordinates. If the mobile app or tracker hasn\'t acquired a satellite fix or has concluded its journey, the map indicates "No ambulance location available".',
    },
    {
      question: '8. Why might ambulance location or ETA be unavailable?',
      answer:
        'GPS or ETA may be temporarily unavailable if the ambulance driver device experiences cellular blind spots, loss of satellite fix, or before road routing geometry completes calculation via the OSRM routing gateway. Telemetry older than 60 seconds is automatically flagged as stale.',
    },
    {
      question: '9. How do I reset my password?',
      answer:
        'You can reset your password using the "Forgot Password" option on the Hospital Login page or in the "Account & Security" section below. Enter your registered email address to receive an official password-reset link from the WEWOO Backend API.',
    },
    {
      question: '10. How do I switch between Light Mode and Dark Mode?',
      answer:
        'Click the theme icon (Sun/Moon) in the top navigation header at any time, or toggle the theme selector in "Settings → Appearance" below. Your preference is saved to your browser\'s local storage and persists across reloads.',
    },
    {
      question: '11. Why does a newly registered hospital require verification?',
      answer:
        'In accordance with healthcare emergency safety protocols, new hospital accounts must be verified by healthcare authority administrators before receiving live emergency patient routing to prevent unverified or unauthorized facilities from receiving critical trauma dispatches.',
    },
    {
      question: '12. What should I do if the dashboard reports a backend connection error?',
      answer:
        'Verify that the WEWOO Node.js backend server is running on the configured host and port (default: http://localhost:5000). Check network connectivity. If the connection indicator shows "Disconnected", refresh the page or re-authenticate to renew your JWT session.',
    },
  ];

  const officialName = registeredProfile?.hospitalName || hospitalProfile.name;
  const regNum = registeredProfile?.registrationNumber || 'REG-PENDING';
  const hospType = registeredProfile?.hospitalType || 'Private Healthcare Provider';
  const adminName = registeredProfile?.administratorName || currentUser?.displayName || 'Administrator';
  const contactPhone = registeredProfile?.phone || hospitalProfile.phone || 'Not configured';
  const contactEmail = registeredProfile?.email || currentUser?.email || 'Not configured';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Settings Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white shadow-md">
            <Settings className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Command Center Settings & Preferences
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage facility profile summary, administrator security credentials, display appearance, and system documentation.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION A: Hospital Profile */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Section A · Hospital Profile Summary
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official hospital identity and active facility credentials.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <span>Edit on Hospital Details Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              Official Hospital Name
            </span>
            <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 truncate">
              {officialName}
            </div>
            <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium mt-0.5">
              {hospType}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              Registration / License No.
            </span>
            <div className="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5">
              {regNum}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              ID: <span className="font-mono">{hospitalProfile.hospitalId.slice(0, 14)}...</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              Verification Status
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  verificationStatus === 'verified' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span
                className={`font-semibold ${
                  verificationStatus === 'verified'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {verificationStatus === 'verified' ? 'Verified Facility' : 'Pending Verification'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {hospitalProfile.traumaLevel}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 sm:col-span-2">
            <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              Emergency Contact & Dispatch Channels
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-1 text-slate-700 dark:text-slate-300">
              <div>
                Hotline: <strong className="font-mono text-slate-900 dark:text-white">{contactPhone}</strong>
              </div>
              <span className="hidden sm:inline text-slate-400">·</span>
              <div>
                Official Email: <strong className="text-slate-900 dark:text-white">{contactEmail}</strong>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              Chief Medical Officer
            </span>
            <div className="font-semibold text-slate-900 dark:text-white mt-1">
              {adminName}
            </div>
            <div className="text-[10px] text-slate-500">Authorized Representative</div>
          </div>
        </div>
      </section>

      {/* SECTION B: Account & Security */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs transition-colors">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Section B · Administrator Account & Security
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Logged-in staff account, password recovery, and active session controls.
              </p>
            </div>
          </div>
        </div>

        {/* Administrator Info Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              Authenticated Administrator
            </span>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {currentUser?.displayName || 'Administrator'}
            </div>
            <div className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
              {currentUser?.email}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
              Role: {currentUser?.role || 'Chief Medical Officer'}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                Active Session
              </span>
              <div className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                Authenticated with WEWOO Backend JWT Authentication.
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                UID: {currentUser?.uid.slice(0, 16)}...
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="px-3.5 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer self-start"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out of Command Center</span>
            </button>
          </div>
        </div>

        {/* Password Reset Form */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-xs">
            <KeyRound className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Reset Administrator Password</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            WEWOO Backend Authentication will generate a secure one-time password reset link dispatched directly to your authorized email address.
          </p>

          {resetSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{resetSuccess}</span>
            </div>
          )}

          {resetError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{resetError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordReset} className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <input
              type="email"
              required
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="admin@hospital.org"
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={isResetting}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              {isResetting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Password Reset Email</span>
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* SECTION C: Appearance */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs transition-colors">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Section C · Command Center Appearance & Theme
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Toggle between Light Mode and Dark Mode for high-contrast visibility.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Light Mode Card */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              theme === 'light'
                ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/30 text-slate-900'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <span>Light Mode</span>
                {theme === 'light' && (
                  <span className="text-[10px] font-semibold uppercase bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded">
                    Active
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-[11px] leading-relaxed">
                Clean light workspace with crisp dark typography and high-contrast clinical indicators, ideal for daytime operations.
              </p>
            </div>
          </button>

          {/* Dark Mode Card */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              theme === 'dark'
                ? 'bg-cyan-950/70 border-cyan-500 ring-2 ring-cyan-500/30 text-white'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-slate-800 text-cyan-400 flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <span>Dark Mode</span>
                {theme === 'dark' && (
                  <span className="text-[10px] font-semibold uppercase bg-cyan-900 text-cyan-200 px-1.5 py-0.2 rounded">
                    Active
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-[11px] leading-relaxed">
                Deep navy command-center aesthetic reducing eye strain in low-light emergency monitoring environments.
              </p>
            </div>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
          Theme preference is saved locally in your browser and automatically restored when you return. You can also toggle the theme anytime from the top navigation bar.
        </div>
      </section>

      {/* SECTION D: Dashboard FAQs */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs transition-colors">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Section D · Dashboard FAQs
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Frequently asked operational questions regarding hospital coordination, triage states, and map tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-4 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span>{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-3.5 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 whitespace-pre-line animate-in fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION E: About WEWOO */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs transition-colors">
        <div className="flex items-center gap-2.5">
          <Info className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Section E · About WEWOO
          </h2>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="font-extrabold text-slate-900 dark:text-white text-base">
            WEWOO Hospital Emergency Response Command Center
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            WEWOO coordinates incoming ambulance emergencies, hospital resources, emergency preparation, and live ambulance tracking. Designed as an IoT-based emergency coordination system, it links emergency response vehicles directly to hospital receiving bays, clinical readiness workflows, and multi-facility trauma networks in real time.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <div>Platform Version: <strong className="text-slate-700 dark:text-slate-200">v2.4.0 (Enterprise)</strong></div>
            <span>·</span>
            <div>Database Engine: <strong className="text-slate-700 dark:text-slate-200">PostgreSQL & Socket.IO Engine</strong></div>
            <span>·</span>
            <div>Routing: <strong className="text-slate-700 dark:text-slate-200">OSRM Road Geometry Engine</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
};
