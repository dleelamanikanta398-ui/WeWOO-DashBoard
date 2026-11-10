import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  LogOut,
  Hospital,
  Activity,
  Layers,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';

export const PendingVerificationView: React.FC = () => {
  const {
    registeredProfile,
    hospitalProfile,
    currentUser,
    logout,
    verifyCurrentHospital,
    setActiveTab,
  } = useHospital();

  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const handleSimulateApproval = async () => {
    setIsVerifying(true);
    try {
      await verifyCurrentHospital('verified');
      setActiveTab('command');
    } catch (err) {
      console.error('Failed to verify hospital:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const name = registeredProfile?.hospitalName || hospitalProfile.name;
  const regNumber = registeredProfile?.registrationNumber || 'REG-PENDING';
  const hospitalType = registeredProfile?.hospitalType || 'Private';
  const adminName = registeredProfile?.administratorName || currentUser?.displayName || 'Administrator';
  const specialities = registeredProfile?.specialities || [];
  const capabilities = registeredProfile?.emergencyCapabilities || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-2xl w-full mx-auto relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mb-3 shadow-lg">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Hospital Registration Under Verification
          </h1>
          <p className="text-xs uppercase tracking-wider text-amber-400 font-semibold mt-1">
            Status: pendingVerification · State Health Authority Review
          </p>
        </div>

        {/* Security Notification Card */}
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="p-4 bg-amber-950/70 border border-amber-800/80 rounded-xl text-xs text-amber-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Operational Access Restricted</span>
            </div>
            <p className="leading-relaxed text-amber-200/90 text-[11px]">
              To protect public patient safety, newly registered facilities cannot modify hospital beds, accept incoming ambulance dispatches, or approve clinical preparation checklists until hospital credentials and licensing are verified by regional healthcare administration.
            </p>
          </div>

          {/* Submitted Hospital Information Summary */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
              Submitted Facility Credentials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Hospital Name</span>
                <div className="font-bold text-white text-sm mt-0.5">{name}</div>
                <div className="text-[11px] text-cyan-400 font-mono mt-0.5">{hospitalType} Healthcare Provider</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">License / Registration</span>
                <div className="font-mono font-bold text-white text-sm mt-0.5">{regNumber}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Admin: {adminName}</div>
              </div>

              {registeredProfile?.address && (
                <div className="sm:col-span-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Facility Location</span>
                  <div className="text-xs text-slate-200 mt-0.5">
                    {registeredProfile.address}, {registeredProfile.city}, {registeredProfile.state} - {registeredProfile.pinCode}
                  </div>
                  <div className="text-[10px] font-mono text-cyan-400 mt-1">
                    GPS: {registeredProfile.latitude.toFixed(5)}°N, {registeredProfile.longitude.toFixed(5)}°E
                  </div>
                </div>
              )}

              {specialities.length > 0 && (
                <div className="sm:col-span-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">
                    Registered Specialities ({specialities.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {specialities.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] bg-slate-900 border border-slate-700 text-slate-300 px-2 py-0.5 rounded"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {capabilities.length > 0 && (
                <div className="sm:col-span-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">
                    Emergency Capabilities ({capabilities.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {capabilities.map((c) => (
                      <span
                        key={c}
                        className="text-[10px] bg-amber-950/60 border border-amber-800/60 text-amber-300 px-2 py-0.5 rounded font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dev / Reviewer Simulation Action */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Evaluation & Testing Authority Override
              </span>
              <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800/50 px-1.5 py-0.5 rounded font-mono">
                SIMULATION
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              In production, state health administrators approve facilities via regulatory dashboard. For rapid evaluation in AI Studio, you may simulate regulatory approval to unlock live emergency command operations.
            </p>
            <button
              type="button"
              onClick={handleSimulateApproval}
              disabled={isVerifying}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simulate Regulatory Approval & Unlock Dashboard</span>
                </>
              )}
            </button>
          </div>

          {/* Logout Action */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-500">Logged in as {currentUser?.email}</span>
            <button
              type="button"
              onClick={logout}
              className="text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
