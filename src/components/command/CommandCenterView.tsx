import React from 'react';
import {
  Activity,
  AlertCircle,
  Bed,
  CheckCircle,
  Compass,
  HeartPulse,
  ShieldAlert,
  Stethoscope,
  Users,
  Clock,
  ArrowRight,
  Flame,
  Radio,
  FileCheck2,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { EmergencyMap } from '../map/EmergencyMap';

export const CommandCenterView: React.FC = () => {
  const {
    hospitalProfile,
    emergencies,
    resources,
    capacity,
    readiness,
    selectedEmergencyId,
    setSelectedEmergencyId,
    setActiveTab,
    settings,
    isDemoMode,
    connectionStatus,
    connectionError,
  } = useHospital();

  const activeAmbulances = emergencies.filter(
    (e) => e.journeyStatus !== 'Handover Completed' && e.hospitalAcceptanceStatus !== 'Declined'
  );

  const incomingCount = activeAmbulances.length;
  const criticalCount = activeAmbulances.filter((e) => e.priority === 'P1').length;
  const pendingAcceptanceCount = activeAmbulances.filter((e) => e.hospitalAcceptanceStatus === 'Request Received').length;

  const pendingPreparationTasks = emergencies.flatMap((e) =>
    (e.preparationChecklist || [])
      .filter((c) => c.status !== 'completed')
      .map((c) => ({
        ...c,
        emergencyId: e.emergencyId,
        emergencyType: e.emergencyType,
        ambulanceId: e.ambulanceId,
      }))
  ).slice(0, 5);

  const emergencyStatus = resources?.emergencyDepartmentStatus || resources?.emergencyStatus || 'Normal Operations';

  return (
    <div className="space-y-6">
      {/* Top Banner & Emergency Operational Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Operational Command Overview
            </h2>
            {resources ? (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${
                  emergencyStatus === 'Normal Operations'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40'
                    : emergencyStatus === 'Elevated Demand'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/40'
                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/40'
                }`}
              >
                {emergencyStatus}
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                Resources Not Configured
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time IoT fleet telemetry, pre-hospital vitals, and bay readiness synchronization.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('emergencies')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Emergency Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Manage Resources
          </button>
        </div>
      </div>

      {/* Permission Denied Warning Banner if active */}
      {(connectionStatus === 'Permission Denied' || connectionStatus === 'DATABASE PERMISSION DENIED') && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Firebase Database Authorization Required</div>
            <p className="mt-0.5 text-rose-700 dark:text-rose-300">
              The WEWOO Firebase Realtime Database rules require authenticated access for hospital administrative records. Please log in with valid credentials.
            </p>
          </div>
        </div>
      )}

      {/* KPI Stat Cards (7 Required Summary Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* 1. Incoming Ambulances */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Incoming</span>
            <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white flex items-baseline gap-1.5">
              <span>{incomingCount}</span>
              {criticalCount > 0 && (
                <span className="text-xs font-mono font-semibold text-rose-600 dark:text-rose-400">
                  ({criticalCount} P1)
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {incomingCount > 0
                ? pendingAcceptanceCount > 0
                  ? `${pendingAcceptanceCount} awaiting decision`
                  : 'All assigned'
                : 'No active dispatches'}
            </div>
          </div>
        </div>

        {/* 2. Active Emergencies */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Active</span>
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400">
              {emergencies.length}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Targeting {hospitalProfile.hospitalId}
            </div>
          </div>
        </div>

        {/* 3. Available General Beds */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Gen Beds</span>
            <Bed className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2">
            {resources ? (
              <>
                <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {resources.availableBeds ?? resources.availableGeneralBeds}
                  <span className="text-xs font-normal text-slate-500">
                    /{resources.totalBeds ?? capacity.totalGeneralBeds}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {(resources.totalBeds ?? capacity.totalGeneralBeds) > 0
                    ? Math.round(
                        ((resources.availableBeds ?? resources.availableGeneralBeds ?? 0) /
                          (resources.totalBeds ?? capacity.totalGeneralBeds)) *
                          100
                      )
                    : 0}
                  % available
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-mono font-bold text-slate-400">--</div>
                <div className="text-[10px] text-slate-500">Not configured</div>
              </>
            )}
          </div>
        </div>

        {/* 4. Available ICU Beds */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">ICU Beds</span>
            <HeartPulse className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2">
            {resources ? (
              <>
                <div className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100">
                  {resources.availableICUBeds ?? resources.availableIcuBeds}
                  <span className="text-xs font-normal text-slate-500">
                    /{resources.totalICUBeds ?? capacity.totalIcuBeds}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {(resources.availableICUBeds ?? resources.availableIcuBeds ?? 0) <= 2 ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">Critical reserve</span>
                  ) : (
                    'Resuscitation Ready'
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-mono font-bold text-slate-400">--</div>
                <div className="text-[10px] text-slate-500">Not configured</div>
              </>
            )}
          </div>
        </div>

        {/* 5. Emergency Doctors Available */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">ER Doctors</span>
            <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2">
            {resources ? (
              <>
                <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
                  {resources.availableEmergencyDoctors ?? resources.availableDoctors}
                  <span className="text-xs font-normal text-slate-500">
                    /{resources.totalEmergencyDoctors ?? capacity.totalDoctors}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Attending on duty
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-mono font-bold text-slate-400">--</div>
                <div className="text-[10px] text-slate-500">Not configured</div>
              </>
            )}
          </div>
        </div>

        {/* 6. Emergency Nurses Available */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">ER Nurses</span>
            <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="mt-2">
            {resources ? (
              <>
                <div className="text-2xl font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {resources.availableNurses}
                  <span className="text-xs font-normal text-slate-500">
                    /{resources.totalNurses ?? capacity.totalNurses}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Triage & bedside
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-mono font-bold text-slate-400">--</div>
                <div className="text-[10px] text-slate-500">Not configured</div>
              </>
            )}
          </div>
        </div>

        {/* 7. Hospital Emergency Readiness Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between shadow-xs transition-colors col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Readiness</span>
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2">
            {readiness && typeof readiness.score === 'number' ? (
              <>
                <div
                  className={`text-2xl font-mono font-bold ${
                    readiness.score >= 70
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : readiness.score >= 50
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {readiness.score}%
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-semibold">
                  {readiness.status}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
                  Insufficient data
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  Awaiting resource records
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Live Map & Incoming Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Map (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Fleet Tactical Map
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Live OSRM road geometry
            </span>
          </div>

          <EmergencyMap
            hospital={hospitalProfile}
            emergencies={activeAmbulances}
            selectedEmergencyId={selectedEmergencyId}
            onSelectEmergency={(id) => setSelectedEmergencyId(id)}
            tileUrl={settings.mapTileUrl}
            tileAttribution={settings.mapAttribution}
            osrmUrl={settings.osrmRoutingUrl}
            height="440px"
            darkMode={settings.darkMode}
          />
        </div>

        {/* Right Column: Incoming Emergency Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Incoming Emergencies ({activeAmbulances.length})
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('emergencies')}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium cursor-pointer"
            >
              View Full Queue &rarr;
            </button>
          </div>

          {/* Cards List or Empty State */}
          <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
            {activeAmbulances.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                <CheckCircle className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2 opacity-80" />
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No active emergencies
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Waiting for live dispatches from Driver App via real-time Socket.IO and backend API.
                </div>
              </div>
            ) : (
              activeAmbulances.map((emg) => {
                const isSelected = emg.emergencyId === selectedEmergencyId;
                const isCrit = emg.priority === 'P1';
                return (
                  <div
                    key={emg.emergencyId}
                    onClick={() => setSelectedEmergencyId(emg.emergencyId)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-slate-800/90 border-cyan-500 dark:border-cyan-500/80 shadow-md ring-1 ring-cyan-500/30'
                        : 'bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isCrit ? 'bg-rose-500 animate-ping' : 'bg-amber-500'
                            }`}
                          />
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {emg.ambulanceId}
                          </span>
                          {emg.callSign && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {emg.callSign}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-rose-600 dark:text-rose-300 mt-1">
                          {emg.priority} · {emg.emergencyType}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          {typeof emg.etaMinutes === 'number' ? `${emg.etaMinutes} min` : '--'}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {typeof emg.remainingDistanceKm === 'number' ? `${emg.remainingDistanceKm} km` : 'En route'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="truncate max-w-[200px]">
                        At: <span className="text-slate-800 dark:text-slate-300">{emg.currentJunction || 'En Route'}</span>
                      </div>
                      <div
                        className={`font-semibold ${
                          emg.hospitalAcceptanceStatus === 'Accepted' ||
                          emg.hospitalAcceptanceStatus === 'Ready for Arrival' ||
                          emg.hospitalAcceptanceStatus === 'Arrived'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {emg.hospitalAcceptanceStatus}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Lower Row: Pending Preparation Tasks & Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Preparation Tasks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Pending Bay & Clinical Preparation Tasks
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('preparation')}
              className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              Open Checklist &rarr;
            </button>
          </div>

          <div className="space-y-2">
            {pendingPreparationTasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No pending pre-arrival preparation tasks.
              </div>
            ) : (
              pendingPreparationTasks.map((task) => (
                <div
                  key={`${task.emergencyId}-${task.id}`}
                  onClick={() => {
                    setSelectedEmergencyId(task.emergencyId);
                    setActiveTab('preparation');
                  }}
                  className="p-2.5 bg-slate-50 dark:bg-slate-950/80 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {task.task}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      For: {task.ambulanceId} ({task.emergencyType}) · Assigned: {task.assignedStaff || task.assignedRole}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800/40 px-2 py-0.5 rounded uppercase">
                    {task.status || 'Pending'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live System Log & Coordination Feed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Recent Emergency Status & IoT Event Feed
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Live Sync
            </span>
          </div>

          <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
            {emergencies.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Waiting for live emergency event updates.
              </div>
            ) : (
              emergencies.slice(0, 4).map((emg) => (
                <div
                  key={emg.emergencyId}
                  className="p-2.5 bg-slate-50 dark:bg-slate-950/80 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs"
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-500 mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {emg.ambulanceId} · {emg.journeyStatus}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(emg.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {emg.currentJunction ? `Crossed ${emg.currentJunction}` : 'Transiting approach corridor'} ·{' '}
                      {typeof emg.etaMinutes === 'number' ? `ETA ${emg.etaMinutes} mins` : 'ETA calculating'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
