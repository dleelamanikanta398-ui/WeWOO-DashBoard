import React, { useState } from 'react';
import { AlertCircle, Play, RefreshCw, Zap, ShieldAlert, Check } from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { EmergencyPriority, EmergencyType } from '../../types/emergency';

export const DemoBanner: React.FC = () => {
  const {
    isDemoMode,
    toggleDemoMode,
    simulateNewEmergency,
    resetDemoData,
    connectionStatus,
    connectionError,
    reconnectBackend,
    setActiveTab,
  } = useHospital();

  const [isOpenMenu, setIsOpenMenu] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<EmergencyType>('Cardiac');
  const [selectedPriority, setSelectedPriority] = useState<EmergencyPriority>('P1');

  if (!isDemoMode) {
    if (connectionStatus === 'FIREBASE CONNECTED' || connectionStatus === 'Connected' || connectionStatus === 'BACKEND ONLINE') {
      return (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800/80 px-4 py-1.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 transition-colors">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">FIREBASE CONNECTED</span>
            <span className="text-slate-500 dark:text-slate-400">· Real-time sync with WEWOO Firebase Realtime Database (wewooo)</span>
          </div>
          <button
            onClick={() => toggleDemoMode(true)}
            className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline font-medium cursor-pointer"
          >
            Open Simulation Mode
          </button>
        </div>
      );
    }

    if (connectionStatus === 'FIREBASE RECONNECTING' || connectionStatus === 'RECONNECTING' || connectionStatus === 'CONNECTING' || connectionStatus === 'Connecting') {
      return (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/80 px-4 py-1.5 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <span className="font-semibold text-amber-700 dark:text-amber-400">FIREBASE RECONNECTING...</span>
            <span className="text-slate-500 dark:text-slate-400">· Restoring live connection with Firebase Realtime Database</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => reconnectBackend()}
              className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold underline cursor-pointer"
            >
              Retry Now
            </button>
            <button
              onClick={() => toggleDemoMode(true)}
              className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-medium cursor-pointer"
            >
              Use Simulation Mode
            </button>
          </div>
        </div>
      );
    }

    if (connectionStatus === 'DATABASE PERMISSION DENIED' || connectionStatus === 'Permission Denied') {
      return (
        <div className="bg-rose-50 dark:bg-rose-950/70 border-b border-rose-300 dark:border-rose-800/80 px-4 py-1.5 flex items-center justify-between text-xs text-rose-900 dark:text-rose-200 transition-colors">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="font-semibold text-rose-800 dark:text-rose-300">DATABASE PERMISSION DENIED</span>
            <span className="text-rose-700 dark:text-rose-300/90">
              · Firebase RTDB security rules denied read/write access. Ensure you are logged in.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('login')}
              className="text-[11px] bg-rose-600 hover:bg-rose-500 text-white font-semibold px-2.5 py-0.5 rounded shadow-xs cursor-pointer transition-colors"
            >
              Log In
            </button>
            <button
              onClick={() => toggleDemoMode(true)}
              className="text-[11px] text-rose-700 dark:text-rose-300 hover:underline font-medium cursor-pointer"
            >
              Use Simulation Mode
            </button>
          </div>
        </div>
      );
    }

    if (connectionStatus === 'AUTHENTICATION REQUIRED' || connectionStatus === 'AUTH REQUIRED' || connectionStatus === 'TOKEN EXPIRED') {
      return (
        <div className="bg-amber-50 dark:bg-amber-950/70 border-b border-amber-300 dark:border-amber-800/80 px-4 py-1.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 transition-colors">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-semibold text-amber-800 dark:text-amber-300">AUTHENTICATION REQUIRED</span>
            <span className="text-amber-700 dark:text-amber-300/90">
              · Please log in to synchronize hospital commands with Firebase ({connectionError || 'Session required'}).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('login')}
              className="text-[11px] bg-amber-600 hover:bg-amber-500 text-white font-semibold px-2.5 py-0.5 rounded shadow-xs cursor-pointer transition-colors"
            >
              Log In
            </button>
            <button
              onClick={() => reconnectBackend()}
              className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold underline cursor-pointer"
            >
              Check Connection
            </button>
            <button
              onClick={() => toggleDemoMode(true)}
              className="text-[11px] text-amber-700 dark:text-amber-300 hover:underline font-medium cursor-pointer"
            >
              Use Simulation Mode
            </button>
          </div>
        </div>
      );
    }

    // Disconnected / Offline
    return (
      <div className="bg-rose-50 dark:bg-rose-950/70 border-b border-rose-200 dark:border-rose-900/80 px-4 py-1.5 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300 transition-colors">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="font-semibold text-rose-700 dark:text-rose-400">FIREBASE DISCONNECTED</span>
          <span className="text-rose-600/80 dark:text-rose-300/80">
            · {connectionError || 'Firebase Realtime Database is unreachable. Checking network status...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => reconnectBackend()}
            className="text-[11px] text-rose-800 dark:text-rose-200 font-semibold underline cursor-pointer"
          >
            Reconnect
          </button>
          <button
            onClick={() => toggleDemoMode(true)}
            className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold hover:underline cursor-pointer bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded"
          >
            Use Simulation Mode
          </button>
        </div>
      </div>
    );
  }

  const handleSimulate = () => {
    simulateNewEmergency(selectedType, selectedPriority);
    setIsOpenMenu(false);
  };

  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-950 dark:bg-amber-950/70 dark:border-amber-500/40 dark:text-amber-200 px-4 py-2 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Left: Prominent Disclaimer */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-mono">
                DEMONSTRATION MODE
              </span>
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Simulated Fleet Telemetry Active
              </span>
            </div>
            <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-tight">
              All coordinates, ambulance telemetry, and vitals are simulated for testing. Isolated from live backend operational database.
            </div>
          </div>
        </div>

        {/* Right: Simulation Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button
              onClick={() => setIsOpenMenu(!isOpenMenu)}
              type="button"
              className="px-2.5 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate Dispatch</span>
            </button>

            {/* Quick Dispatch Menu */}
            {isOpenMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                  Generate Simulated Emergency
                </div>

                <div className="space-y-2 mb-3">
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase">
                      Emergency Classification
                    </label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value as EmergencyType)}
                      className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs px-2 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-rose-500"
                    >
                      <option value="Cardiac">Cardiac (STEMI / Arrest)</option>
                      <option value="Trauma">Trauma (High-velocity MVA)</option>
                      <option value="Stroke">Stroke (Acute CVA window)</option>
                      <option value="Respiratory">Severe Respiratory Distress</option>
                      <option value="Pediatric">Pediatric Emergency</option>
                      <option value="Obstetric">Obstetric / Active Delivery</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase">
                      Triage Priority
                    </label>
                    <div className="flex gap-2 mt-1">
                      {(['P1', 'P2', 'P3'] as EmergencyPriority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setSelectedPriority(p)}
                          className={`flex-1 py-1 text-xs font-bold rounded border transition-colors cursor-pointer ${
                            selectedPriority === p
                              ? p === 'P1'
                                ? 'bg-rose-600 border-rose-500 text-white'
                                : p === 'P2'
                                ? 'bg-amber-600 border-amber-500 text-white'
                                : 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSimulate}
                    type="button"
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Send to Command Center
                  </button>
                  <button
                    onClick={() => setIsOpenMenu(false)}
                    type="button"
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={resetDemoData}
            type="button"
            title="Reset ambulance positions and test records"
            className="px-2.5 py-1 text-xs font-medium bg-amber-200/80 hover:bg-amber-300/80 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-400 dark:border-amber-500/50 text-amber-900 dark:text-amber-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Fleet</span>
          </button>

          <button
            onClick={() => toggleDemoMode(false)}
            type="button"
            className="px-2.5 py-1 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Exit Demo (Live Mode)
          </button>
        </div>
      </div>
    </div>
  );
};
