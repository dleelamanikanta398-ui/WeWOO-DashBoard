import React from 'react';
import {
  FileCheck2,
  CheckCircle2,
  Activity,
  Layers,
  Inbox,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';

export const PreparationView: React.FC = () => {
  const {
    emergencies,
    selectedEmergencyId,
    setSelectedEmergencyId,
    toggleChecklistItem,
    markEmergencyReady,
    resources,
  } = useHospital();

  const activeAmbulances = emergencies.filter(
    (e) => e.journeyStatus !== 'Handover Completed' && e.hospitalAcceptanceStatus !== 'Declined'
  );

  const selectedEmergency =
    emergencies.find((e) => e.emergencyId === selectedEmergencyId) ||
    activeAmbulances[0] ||
    null;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Emergency-Specific Preparation & Bay Readiness</span>
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Structured clinical checklists for incoming Code Red dispatches. Confirm staffing, bays, and pharmaceuticals before arrival.
          </div>
        </div>

        {selectedEmergency && (
          <button
            onClick={() => markEmergencyReady(selectedEmergency.emergencyId)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark {selectedEmergency.ambulanceId} Ready for Arrival</span>
          </button>
        )}
      </div>

      {/* Ambulance Switcher Strip */}
      {activeAmbulances.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {activeAmbulances.map((emg) => {
            const isSelected = emg.emergencyId === selectedEmergency?.emergencyId;
            const completedCount = (emg.preparationChecklist || []).filter(
              (c) => c.status === 'completed'
            ).length;
            const totalCount = (emg.preparationChecklist || []).length;

            return (
              <button
                key={emg.emergencyId}
                onClick={() => setSelectedEmergencyId(emg.emergencyId)}
                className={`px-3.5 py-2 rounded-xl text-left border transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-50 dark:bg-slate-800 border-cyan-500 dark:border-rose-500 shadow-md ring-1 ring-cyan-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      emg.priority === 'P1' ? 'bg-rose-500 animate-ping' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {emg.ambulanceId}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                    {typeof emg.etaMinutes === 'number' ? `${emg.etaMinutes}m ETA` : '--'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {emg.emergencyType} · {completedCount}/{totalCount} tasks
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedEmergency ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Checklist Card (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedEmergency.emergencyType} Emergency Preparation Protocol
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Target Ambulance: {selectedEmergency.ambulanceId} ({selectedEmergency.callSign || 'Assigned'})
                  </div>
                </div>
              </div>

              <span
                className={`text-xs font-bold px-2.5 py-1 rounded uppercase ${
                  selectedEmergency.hospitalPreparationStatus === 'Ready for Arrival'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60'
                }`}
              >
                Status: {selectedEmergency.hospitalPreparationStatus}
              </span>
            </div>

            {/* Checklist items */}
            <div className="space-y-2">
              {(selectedEmergency.preparationChecklist || []).map((item) => {
                const isItemDone = item.status === 'completed';
                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      toggleChecklistItem(selectedEmergency.emergencyId, item.id, !isItemDone)
                    }
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isItemDone
                        ? 'bg-slate-50 dark:bg-slate-950/60 border-emerald-300 dark:border-emerald-900/40 text-slate-500 dark:text-slate-400'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isItemDone}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-rose-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 cursor-pointer"
                      />
                      <div>
                        <div
                          className={`text-xs font-semibold ${
                            isItemDone
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {item.task}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex flex-wrap gap-2">
                          <span>
                            Role: <strong>{item.assignedRole}</strong>
                          </span>
                          {item.completedBy && <span>· Confirmed by {item.completedBy}</span>}
                          {item.completedAt && (
                            <span> at {new Date(item.completedAt).toLocaleTimeString()}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        isItemDone
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {isItemDone ? 'Ready' : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Operational Integrity Note:
              </span>{' '}
              Staff must only check off items when physical equipment, bed reservations, and clinical personnel are in position. Updates are transmitted directly to the ambulance dashboard.
            </div>
          </div>

          {/* Clinical Context & Facility Resources (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Relevant Hospital Capacity */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-xs transition-colors">
              <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Relevant Hospital Inventory
              </div>

              {resources ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Available ICU Beds:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {resources.availableIcuBeds}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Open Trauma Bays:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {resources.availableTraumaBays}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">ER Physicians Active:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {resources.availableDoctors}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Trauma / Code Team:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Active On-Site
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
                  Hospital resources not configured.
                </div>
              )}
            </div>

            {/* Patient Context Snapshot */}
            {selectedEmergency.vitals && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-xs transition-colors">
                <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Patient Summary
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-700 dark:text-slate-300">
                    <strong>Age/Gender:</strong> {selectedEmergency.vitals.age ?? '--'} y/o{' '}
                    {selectedEmergency.vitals.gender ?? ''}
                  </div>
                  <div className="text-slate-700 dark:text-slate-300">
                    <strong>SPO2:</strong>{' '}
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                      {selectedEmergency.vitals.spO2Percent ?? '--'}%
                    </span>{' '}
                    · <strong>BP:</strong>{' '}
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {selectedEmergency.vitals.bloodPressureSystolic}/
                      {selectedEmergency.vitals.bloodPressureDiastolic}
                    </span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] pt-1">
                    {selectedEmergency.vitals.chiefComplaint}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
          <Inbox className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2 opacity-80" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No active emergencies
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Waiting for live incoming ambulance dispatches via real-time Socket.IO and backend API.
          </p>
        </div>
      )}
    </div>
  );
};
