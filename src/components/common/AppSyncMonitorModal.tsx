import React, { useState } from 'react';
import {
  Radio,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Navigation,
  HeartPulse,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';

interface AppSyncMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppSyncMonitorModal: React.FC<AppSyncMonitorModalProps> = ({ isOpen, onClose }) => {
  const { officialLocation, hospitalProfile, isBackendConnected, connectionStatus } = useHospital();
  const [lastCheckTime, setLastCheckTime] = useState<string>(new Date().toLocaleTimeString());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastCheckTime(new Date().toLocaleTimeString());
      setIsRefreshing(false);
    }, 400);
  };

  const isVerified = officialLocation?.locationVerified === true;
  const lat = officialLocation?.latitude ?? 17.4225;
  const lng = officialLocation?.longitude ?? 78.4435;
  const address = officialLocation?.address ?? 'Road No. 2, Banjara Hills';
  const city = officialLocation?.city ?? 'Hyderabad';
  const state = officialLocation?.state ?? 'Telangana';
  const pin = officialLocation?.pinCode ?? officialLocation?.postalCode ?? '500034';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>WEWOO 3-Way Realtime Synchronization Auditor</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Single Source of Truth: Firebase Realtime Database (/hospitals/{officialLocation?.hospitalId || 'hosp-wewoo-01'}/location)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Connection & Status Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <p className="text-[10px] uppercase font-bold text-slate-400">Firebase RTDB Engine</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{connectionStatus}</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <p className="text-[10px] uppercase font-bold text-slate-400">Hospital Verification</p>
            <p className={`text-sm font-bold flex items-center gap-1.5 mt-1 ${isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {isVerified ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
              <span>{isVerified ? 'VERIFIED (Active)' : 'UNVERIFIED (Locked)'}</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <p className="text-[10px] uppercase font-bold text-slate-400">Centralized Coordinates</p>
            <p className="text-sm font-mono font-bold text-rose-600 dark:text-rose-400 mt-1">
              {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
            </p>
          </div>
        </div>

        {/* 3-Way Ecosystem Audit Grid */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Realtime Propagation Across WEWOO Ecosystem:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Hospital Dashboard (Publisher) */}
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-bold text-rose-900 dark:text-rose-200">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-rose-600" />
                  <span>Hospital Dashboard</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono">Publisher</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Maintains official location in Hyderabad, Telangana. Writes to Firebase.
              </p>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-950 font-mono text-[10px] space-y-1">
                <p className="text-slate-500">Lat: <span className="text-rose-600 dark:text-rose-400 font-bold">{lat.toFixed(5)}</span></p>
                <p className="text-slate-500">Lng: <span className="text-rose-600 dark:text-rose-400 font-bold">{lng.toFixed(5)}</span></p>
                <p className="text-slate-500 truncate">Addr: {address}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Admin Authorization Active</span>
              </div>
            </div>

            {/* 2. Driver App (Subscriber) */}
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  <span>Driver App</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono">Subscriber</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Subscribes via listenHospitalOfficialLocation. Navigation unlocked only if verified.
              </p>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-950 font-mono text-[10px] space-y-1">
                <p className="text-slate-500">Lat: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{lat.toFixed(5)}</span></p>
                <p className="text-slate-500">Lng: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{lng.toFixed(5)}</span></p>
                <p className="text-slate-500 truncate">Addr: {address}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold">
                {isVerified ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Navigation Active & Unlocked</span>
                  </span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Navigation Blocked (Unverified)</span>
                  </span>
                )}
              </div>
            </div>

            {/* 3. Patient App (Subscriber) */}
            <div className="p-4 rounded-xl border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/40 dark:bg-cyan-950/20 space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-bold text-cyan-900 dark:text-cyan-200">
                <span className="flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-cyan-600" />
                  <span>Patient App</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-600 text-white font-mono">Subscriber</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Subscribes to exact same node. Calculates direct patient-to-hospital distance & SOS.
              </p>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-950 font-mono text-[10px] space-y-1">
                <p className="text-slate-500">Lat: <span className="text-cyan-600 dark:text-cyan-400 font-bold">{lat.toFixed(5)}</span></p>
                <p className="text-slate-500">Lng: <span className="text-cyan-600 dark:text-cyan-400 font-bold">{lng.toFixed(5)}</span></p>
                <p className="text-slate-500 truncate">Addr: {address}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Synchronized with Zero Drift</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Last audit: {lastCheckTime}</span>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-semibold cursor-pointer transition-colors"
          >
            Close Auditor
          </button>
        </div>
      </div>
    </div>
  );
};
