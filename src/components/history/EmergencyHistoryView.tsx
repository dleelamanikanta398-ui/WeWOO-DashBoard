import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Eye,
  X,
  FileText,
  Ban,
  Activity,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { EmergencyRecord } from '../../types/emergency';

export const EmergencyHistoryView: React.FC = () => {
  const { history } = useHospital();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<EmergencyRecord | null>(null);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.emergencyId.toLowerCase().includes(q) ||
          item.ambulanceId.toLowerCase().includes(q) ||
          (item.driverName && item.driverName.toLowerCase().includes(q)) ||
          item.emergencyType.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (typeFilter !== 'all' && item.emergencyType !== typeFilter) return false;
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
      return true;
    });
  }, [history, searchQuery, typeFilter, priorityFilter]);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Emergency Mission Archive & Handover Audit</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {history.length} Closed Dispatches
            </span>
          </h2>
          <div className="text-xs text-slate-400 mt-0.5">
            Historical records of completed handovers, preparation checklists, and diversion decisions.
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search historical mission ID, ambulance, driver..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-hidden focus:border-rose-500"
            >
              <option value="all">All Priorities</option>
              <option value="P1">P1 - Critical</option>
              <option value="P2">P2 - Urgent</option>
              <option value="P3">P3 - Moderate</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-hidden focus:border-rose-500"
            >
              <option value="all">All Types</option>
              <option value="Cardiac">Cardiac</option>
              <option value="Trauma">Trauma</option>
              <option value="Stroke">Stroke</option>
              <option value="Obstetric">Obstetric</option>
              <option value="Pediatric">Pediatric</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Emergency ID</th>
                <th className="py-3 px-4">Ambulance</th>
                <th className="py-3 px-4">Type & Priority</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Outcome Status</th>
                <th className="py-3 px-4">Completed Timestamp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No closed emergency records matching criteria.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.emergencyId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {item.emergencyId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{item.ambulanceId}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{item.vehicleNumber}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.priority === 'P1'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                        }`}
                      >
                        {item.priority} · {item.emergencyType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {item.driverName}
                    </td>
                    <td className="py-3 px-4">
                      {item.hospitalAcceptanceStatus === 'Declined' ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <Ban className="w-3.5 h-3.5" />
                          <span>Diverted / Declined</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Handover Completed</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(item.lastUpdated).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedRecord(item)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Audit Log</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Mission Audit: {selectedRecord.emergencyId}</span>
                  <span className="text-xs font-mono text-cyan-400">({selectedRecord.ambulanceId})</span>
                </h3>
                <div className="text-xs text-slate-400">
                  {selectedRecord.priority} · {selectedRecord.emergencyType} · Driver: {selectedRecord.driverName}
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Outcome Box */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Final Disposition & Summary
                </div>
                {selectedRecord.hospitalAcceptanceStatus === 'Declined' ? (
                  <div className="text-rose-300">
                    <strong>Declined & Diverted:</strong> {selectedRecord.declineReason}
                  </div>
                ) : (
                  <div className="text-slate-200">
                    {selectedRecord.vitals?.notes || 'Patient successfully received at emergency receiving bay and transferred to acute care.'}
                  </div>
                )}
              </div>

              {/* Timeline Events */}
              <div>
                <div className="text-[11px] font-bold uppercase text-slate-400 mb-2">
                  Telemetry & Communication Timeline
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {selectedRecord.timeline.length === 0 ? (
                    <div className="text-slate-500 italic">No detailed telemetry events recorded.</div>
                  ) : (
                    selectedRecord.timeline.map((ev) => (
                      <div key={ev.id} className="pb-1.5 border-b border-slate-800/60 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between text-slate-300 font-semibold">
                          <span>[{ev.actor}] {ev.title}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {new Date(ev.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {ev.details && <div className="text-[11px] text-slate-400">{ev.details}</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
