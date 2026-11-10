import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Search,
  Filter,
  ArrowUpDown,
  Compass,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Eye,
  Check,
  Ban,
  Activity,
  Layers,
  Inbox,
} from 'lucide-react';
import { EmergencyPriority, EmergencyRecord, EmergencyType, HospitalAcceptanceStatus, JourneyStatus } from '../../types/emergency';
import { useHospital } from '../../context/HospitalContext';
import { EmergencyDetailsModal } from './EmergencyDetailsModal';

export const EmergenciesView: React.FC = () => {
  const {
    emergencies,
    selectedEmergencyId,
    setSelectedEmergencyId,
    updateEmergencyStatus,
    markEmergencyReady,
    isDemoMode,
  } = useHospital();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [acceptanceFilter, setAcceptanceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'eta' | 'priority' | 'time'>('eta');

  const [detailsModalEmergency, setDetailsModalEmergency] = useState<EmergencyRecord | null>(null);

  const filteredEmergencies = useMemo(() => {
    return emergencies
      .filter((emg) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            emg.emergencyId.toLowerCase().includes(q) ||
            emg.ambulanceId.toLowerCase().includes(q) ||
            (emg.driverName && emg.driverName.toLowerCase().includes(q)) ||
            emg.emergencyType.toLowerCase().includes(q) ||
            (emg.currentJunction && emg.currentJunction.toLowerCase().includes(q));
          if (!match) return false;
        }

        if (priorityFilter !== 'all' && emg.priority !== priorityFilter) {
          return false;
        }

        if (typeFilter !== 'all' && emg.emergencyType !== typeFilter) {
          return false;
        }

        if (acceptanceFilter !== 'all' && emg.hospitalAcceptanceStatus !== acceptanceFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'eta') {
          return (a.etaMinutes ?? 999) - (b.etaMinutes ?? 999);
        }
        if (sortBy === 'priority') {
          const pOrder = { P1: 1, P2: 2, P3: 3 };
          return pOrder[a.priority] - pOrder[b.priority];
        }
        if (sortBy === 'time') {
          return new Date(b.lastUpdated || b.createdAt).getTime() - new Date(a.lastUpdated || a.createdAt).getTime();
        }
        return 0;
      });
  }, [emergencies, searchQuery, priorityFilter, typeFilter, acceptanceFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Incoming Emergency Queue</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
              {emergencies.length} Dispatches
            </span>
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time ambulance requests, ETA countdowns, pre-arrival status, and hospital decision workflow.
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3 shadow-xs transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ambulance, emergency ID, driver, junction..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
            />
          </div>

          {/* Priority Filter */}
          <div className="md:col-span-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-rose-500"
            >
              <option value="all">All Priorities</option>
              <option value="P1">P1 - Critical (Code Red)</option>
              <option value="P2">P2 - Urgent Care</option>
              <option value="P3">P3 - Moderate</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="md:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-rose-500"
            >
              <option value="all">All Specialties</option>
              <option value="Cardiac">Cardiac</option>
              <option value="Trauma">Trauma</option>
              <option value="Stroke">Stroke</option>
              <option value="Pediatric">Pediatric</option>
              <option value="Obstetric">Obstetric</option>
              <option value="Respiratory">Respiratory</option>
            </select>
          </div>

          {/* Acceptance Filter */}
          <div className="md:col-span-2">
            <select
              value={acceptanceFilter}
              onChange={(e) => setAcceptanceFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-rose-500"
            >
              <option value="all">All Statuses</option>
              <option value="Request Received">Request Received</option>
              <option value="Accepted">Accepted</option>
              <option value="Preparing">Preparing</option>
              <option value="Ready for Arrival">Ready for Arrival</option>
              <option value="Arrived">Arrived</option>
              <option value="Declined">Declined</option>
            </select>
          </div>

          {/* Sort Control */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'eta' | 'priority' | 'time')}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-rose-500"
            >
              <option value="eta">Sort: Lowest ETA</option>
              <option value="priority">Sort: Highest Priority</option>
              <option value="time">Sort: Recent Update</option>
            </select>
          </div>
        </div>
      </div>

      {/* Emergency Cards / Table List */}
      <div className="space-y-3">
        {filteredEmergencies.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
            <Inbox className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No active emergencies
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Waiting for live dispatches from the WEWOO Driver Mobile App via real-time Socket.IO and backend API.
            </p>
          </div>
        ) : (
          filteredEmergencies.map((emg) => {
            const isCritical = emg.priority === 'P1';
            const isUrgent = emg.priority === 'P2';
            const isPendingDecision = emg.hospitalAcceptanceStatus === 'Request Received';

            return (
              <div
                key={emg.emergencyId}
                className={`bg-white dark:bg-slate-900 border rounded-xl p-4 sm:p-5 transition-all shadow-xs ${
                  isCritical
                    ? 'border-rose-300 dark:border-rose-900/60'
                    : isUrgent
                    ? 'border-amber-300 dark:border-amber-900/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Emergency Identity & Patient Telemetry */}
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center flex-wrap gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider ${
                          isCritical
                            ? 'bg-rose-600 text-white'
                            : isUrgent
                            ? 'bg-amber-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {emg.priority} · {emg.emergencyType}
                      </span>

                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {emg.ambulanceId}
                      </span>
                      {emg.callSign && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          ({emg.callSign})
                        </span>
                      )}

                      <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                        ID: {emg.emergencyId}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      {emg.vitals ? (
                        <span>
                          <strong>Chief Complaint:</strong> {emg.vitals.chiefComplaint}
                        </span>
                      ) : (
                        <span>Telemetry active · Awaiting detailed pre-hospital vitals</span>
                      )}
                    </div>

                    {/* Telemetry info row */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      {emg.driverName && (
                        <>
                          <span>Driver: <strong className="text-slate-700 dark:text-slate-300">{emg.driverName}</strong></span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      {typeof emg.speedKmh === 'number' && (
                        <>
                          <span>Speed: <strong className="text-slate-700 dark:text-slate-200">{emg.speedKmh} km/h</strong></span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <span>
                        Junction: <strong className="text-cyan-600 dark:text-cyan-300">{emg.currentJunction || 'Arterial Road'}</strong>
                      </span>
                      {emg.currentLocation && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>GPS: <strong className="font-mono text-slate-600 dark:text-slate-300">{emg.currentLocation.latitude.toFixed(4)}, {emg.currentLocation.longitude.toFixed(4)}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ETA & Distance Metric */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                        Estimated Arrival
                      </div>
                      <div className="text-2xl font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {typeof emg.etaMinutes === 'number' ? `${emg.etaMinutes} min` : '--'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {typeof emg.remainingDistanceKm === 'number' ? `${emg.remainingDistanceKm} km remaining` : 'Calculating distance'}
                      </div>
                    </div>

                    {/* Acceptance & Preparation Badge */}
                    <div className="text-right min-w-[130px]">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                        Command State
                      </div>
                      <div
                        className={`text-xs font-bold mt-0.5 ${
                          emg.hospitalAcceptanceStatus === 'Accepted' ||
                          emg.hospitalAcceptanceStatus === 'Ready for Arrival' ||
                          emg.hospitalAcceptanceStatus === 'Arrived'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : emg.hospitalAcceptanceStatus === 'Declined'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {emg.hospitalAcceptanceStatus}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        Prep: {emg.hospitalPreparationStatus}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
                    {isPendingDecision && (
                      <button
                        type="button"
                        onClick={() => updateEmergencyStatus(emg.emergencyId, 'Accepted', 'Bed and clinical bay allocated')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        Accept
                      </button>
                    )}

                    {emg.hospitalAcceptanceStatus === 'Accepted' && (
                      <button
                        type="button"
                        onClick={() => markEmergencyReady(emg.emergencyId)}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        Mark Ready
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setDetailsModalEmergency(emg)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Details & Triage</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Emergency Details Modal */}
      {detailsModalEmergency && (
        <EmergencyDetailsModal
          emergency={detailsModalEmergency}
          onClose={() => setDetailsModalEmergency(null)}
        />
      )}
    </div>
  );
};
