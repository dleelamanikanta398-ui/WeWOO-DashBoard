import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  User,
  Activity,
  Heart,
  Droplets,
  Wind,
  Brain,
  ShieldAlert,
  ArrowRight,
  Send,
  Navigation,
  FileCheck,
  Ban,
  Check,
  MessageSquare,
} from 'lucide-react';
import { EmergencyRecord, HospitalAcceptanceStatus, PreparationChecklistItem } from '../../types/emergency';
import { useHospital } from '../../context/HospitalContext';

interface EmergencyDetailsModalProps {
  emergency: EmergencyRecord;
  onClose: () => void;
}

export const EmergencyDetailsModal: React.FC<EmergencyDetailsModalProps> = ({
  emergency,
  onClose,
}) => {
  const {
    updateEmergencyStatus,
    declineEmergency,
    updateChecklistTask,
    markEmergencyReady,
    completeEmergencyHandover,
    resources,
  } = useHospital();

  const [showDeclineModal, setShowDeclineModal] = useState<boolean>(false);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [declineError, setDeclineError] = useState<string | null>(null);

  const [editingNotesTaskId, setEditingNotesTaskId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState<string>('');

  const isCritical = emergency.priority === 'P1';
  const isUrgent = emergency.priority === 'P2';

  const checklist = emergency.preparationChecklist || [];
  const completedChecklistCount = checklist.filter((c) => c.status === 'completed').length;
  const totalChecklistCount = checklist.length;

  const handleDeclineSubmit = async () => {
    if (!declineReason.trim()) {
      setDeclineError('A mandatory clinical or operational reason is required before declining.');
      return;
    }
    await declineEmergency(emergency.emergencyId, declineReason);
    setShowDeclineModal(false);
  };

  const handleSaveNotes = (taskId: string) => {
    updateChecklistTask(emergency.emergencyId, taskId, { notes: tempNotes });
    setEditingNotesTaskId(null);
    setTempNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200 transition-colors">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c1429] flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                isCritical
                  ? 'bg-rose-500 animate-ping'
                  : isUrgent
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
              }`}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {emergency.emergencyId}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    isCritical
                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60'
                      : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60'
                  }`}
                >
                  {emergency.priority} · {emergency.emergencyType}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {emergency.ambulanceId} {emergency.callSign ? `(${emergency.callSign})` : ''}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                {emergency.driverName && (
                  <>
                    <span>Driver: <strong className="text-slate-700 dark:text-slate-300">{emergency.driverName}</strong></span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span>{emergency.driverPhone || 'Radio Connected'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-200 text-sm">
          {/* Telemetry & Route Progress Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Estimated Arrival
              </div>
              <div className="text-xl font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                {typeof emergency.etaMinutes === 'number' ? `${emergency.etaMinutes} min` : '--'}
              </div>
              <div className="text-[10px] text-slate-500">
                {typeof emergency.remainingDistanceKm === 'number' ? `${emergency.remainingDistanceKm} km remaining` : 'Distance syncing'}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Current Junction
              </div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1 truncate">
                {emergency.currentJunction || 'En route via arterial road'}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                Next: {emergency.nextJunction || 'Hospital access avenue'}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Speed & Orientation
              </div>
              <div className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                {typeof emergency.speedKmh === 'number' ? `${emergency.speedKmh} km/h` : '--'} · {emergency.heading ?? 0}°
              </div>
              <div className="text-[10px] text-slate-500">
                Fix: {new Date(emergency.lastUpdated || emergency.createdAt).toLocaleTimeString()}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Hospital Acceptance
              </div>
              <div
                className={`text-xs font-bold mt-1 ${
                  emergency.hospitalAcceptanceStatus === 'Accepted' ||
                  emergency.hospitalAcceptanceStatus === 'Ready for Arrival' ||
                  emergency.hospitalAcceptanceStatus === 'Arrived'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : emergency.hospitalAcceptanceStatus === 'Declined'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {emergency.hospitalAcceptanceStatus}
              </div>
              <div className="text-[10px] text-slate-500">
                Prep: {emergency.hospitalPreparationStatus}
              </div>
            </div>
          </div>

          {/* Action Decision Control Bar */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Command Acceptance & Readiness Controls</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 lowercase italic">
                *Synchronized in real-time to Driver App via Socket.IO
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => updateEmergencyStatus(emergency.emergencyId, 'Request Received', 'Receipt acknowledged by hospital command center')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  emergency.hospitalAcceptanceStatus === 'Request Received'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                Request Received
              </button>

              <button
                type="button"
                onClick={() => updateEmergencyStatus(emergency.emergencyId, 'Accepted', 'Bed and clinical bay reserved')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  emergency.hospitalAcceptanceStatus === 'Accepted'
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs font-bold'
                    : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                Accept Emergency
              </button>

              <button
                type="button"
                onClick={() => updateEmergencyStatus(emergency.emergencyId, 'Preparing', 'Clinical team actively preparing bay')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  emergency.hospitalAcceptanceStatus === 'Preparing'
                    ? 'bg-blue-600 border-blue-500 text-white font-bold'
                    : 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                Mark Preparing
              </button>

              <button
                type="button"
                onClick={() => markEmergencyReady(emergency.emergencyId)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  emergency.hospitalAcceptanceStatus === 'Ready for Arrival'
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs font-bold'
                    : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                Ready for Arrival
              </button>

              {emergency.journeyStatus === 'Arrived at ER' && (
                <button
                  type="button"
                  onClick={() => completeEmergencyHandover(emergency.emergencyId)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Complete Patient Handover</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowDeclineModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900/80 border border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 transition-colors ml-auto cursor-pointer"
              >
                Decline Request...
              </button>
            </div>
          </div>

          {/* Decline Reason Banner if declined */}
          {emergency.hospitalAcceptanceStatus === 'Declined' && emergency.declineReason && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-700 dark:text-rose-300">
                <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Emergency Request Declined by Hospital</span>
              </div>
              <p className="text-rose-800 dark:text-rose-300 mb-1">
                Reason: {emergency.declineReason}
              </p>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80">
                The driver has been informed and must coordinate an alternative facility with regional dispatch.
              </p>
            </div>
          )}

          {/* Patient Vitals & Clinical Context */}
          {emergency.vitals && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Patient Telemetry & Pre-Hospital Assessment</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 transition-colors">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Triage Cat</div>
                    <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                      {emergency.vitals.triageCategory} Category
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Heart Rate</div>
                    <div className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {emergency.vitals.heartRateBpm ?? '--'} bpm
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Blood Pressure</div>
                    <div className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {emergency.vitals.bloodPressureSystolic ?? '--'}/{emergency.vitals.bloodPressureDiastolic ?? '--'} mmHg
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">SpO2 Saturation</div>
                    <div className="text-sm font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                      {emergency.vitals.spO2Percent ?? '--'}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">GCS Score</div>
                    <div className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      {emergency.vitals.glasgowComaScale ?? '--'} / 15
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Chief Complaint / Assessment:
                  </div>
                  <div className="text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800">
                    {emergency.vitals.chiefComplaint}
                  </div>
                </div>

                {emergency.vitals.notes && (
                  <div>
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Paramedic En-Route Notes:
                    </div>
                    <div className="text-xs bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-lg text-slate-700 dark:text-slate-300 font-mono border border-slate-200 dark:border-slate-800">
                      {emergency.vitals.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Emergency Preparation Checklist (Requirement 6) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {emergency.emergencyType} Readiness Checklist ({completedChecklistCount}/{totalChecklistCount})
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Authorized staff verification required
              </span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 overflow-hidden shadow-xs transition-colors">
              {checklist.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No preparation checklist items configured for this emergency type.
                </div>
              ) : (
                checklist.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Status Select */}
                        <select
                          value={item.status || 'pending'}
                          onChange={(e) =>
                            updateChecklistTask(emergency.emergencyId, item.id, {
                              status: e.target.value as PreparationChecklistItem['status'],
                            })
                          }
                          className={`text-[10px] font-bold uppercase px-2 py-1 rounded border cursor-pointer mt-0.5 ${
                            item.status === 'completed'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : item.status === 'in_progress'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>

                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-xs font-semibold ${
                              item.status === 'completed'
                                ? 'text-slate-500 dark:text-slate-400 line-through'
                                : 'text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            {item.task}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex flex-wrap gap-2">
                            <span>Role: <strong>{item.assignedRole}</strong></span>
                            {item.assignedStaff && <span>Staff: <strong>{item.assignedStaff}</strong></span>}
                            {item.completedBy && <span>Verified: <strong>{item.completedBy}</strong></span>}
                            {item.notes && <span className="text-cyan-600 dark:text-cyan-400 italic">Note: "{item.notes}"</span>}
                          </div>
                        </div>
                      </div>

                      {/* Notes button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNotesTaskId(item.id);
                          setTempNotes(item.notes || '');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Add task note"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Inline Task Note Form */}
                    {editingNotesTaskId === item.id && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <input
                          type="text"
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          placeholder="Add clinical or equipment preparation notes..."
                          className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNotes(item.id)}
                          className="px-2.5 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-medium"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNotesTaskId(null)}
                          className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Timeline Audit Log */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Driver–Hospital Coordination Audit Trail</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 max-h-48 overflow-y-auto transition-colors">
              {(emergency.timeline || []).length === 0 ? (
                <div className="text-xs text-slate-500 italic py-2">
                  No recorded timeline events for this emergency.
                </div>
              ) : (
                emergency.timeline.map((event) => (
                  <div key={event.id} className="text-xs flex items-start gap-2.5 pb-2 border-b border-slate-200/60 dark:border-slate-800/60 last:border-0 last:pb-0">
                    <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 shrink-0">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        [{event.actor}] {event.title}
                      </div>
                      {event.details && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {event.details}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Decline Modal Dialog */}
        {showDeclineModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl p-5 shadow-2xl">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-2 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Mandatory Reason for Declining Emergency</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                Emergency protocol requires documenting the operational cause (e.g. ICU at full capacity, CT inoperable). The driver will be notified in real-time to coordinate diversion via regional dispatch.
              </p>

              {declineError && (
                <div className="mb-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {declineError}
                </div>
              )}

              <textarea
                value={declineReason}
                onChange={(e) => {
                  setDeclineReason(e.target.value);
                  setDeclineError(null);
                }}
                rows={3}
                placeholder="Example: All Trauma bays occupied. Diverting to regional tertiary trauma center."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
              />

              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeclineSubmit}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-md cursor-pointer"
                >
                  Confirm Decline & Notify Driver
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
