import React, { useState } from 'react';
import {
  Compass,
  AlertTriangle,
  Clock,
  Navigation,
  Activity,
  Layers,
  Radio,
  Eye,
  CheckCircle,
  ExternalLink,
  MapPinOff,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { EmergencyMap } from '../map/EmergencyMap';
import { EmergencyDetailsModal } from '../emergencies/EmergencyDetailsModal';
import { EmergencyRecord } from '../../types/emergency';

export const LiveTrackingView: React.FC = () => {
  const {
    hospitalProfile,
    emergencies,
    selectedEmergencyId,
    setSelectedEmergencyId,
    settings,
  } = useHospital();

  const [inspectModalEmergency, setInspectModalEmergency] = useState<EmergencyRecord | null>(null);

  const activeAmbulances = emergencies.filter(
    (e) => e.journeyStatus !== 'Handover Completed' && e.hospitalAcceptanceStatus !== 'Declined'
  );

  const selectedAmbulance = emergencies.find((e) => e.emergencyId === selectedEmergencyId) || activeAmbulances[0] || null;

  // Check if telemetry is stale (>60s)
  const isStaleLocation = (isoTimestamp?: string) => {
    if (!isoTimestamp) return true;
    const ageMs = Date.now() - new Date(isoTimestamp).getTime();
    return ageMs > 60000;
  };

  const hasCoords = selectedAmbulance?.currentLocation &&
    typeof selectedAmbulance.currentLocation.latitude === 'number' &&
    typeof selectedAmbulance.currentLocation.longitude === 'number';

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Live Ambulance Tracking & Junction Monitor</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
              {activeAmbulances.length} Active Vehicles
            </span>
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time GPS telemetry from ambulance IoT gateways, junction sensors, and OSRM road trajectories.
          </div>
        </div>

        {selectedAmbulance && (
          <button
            onClick={() => setInspectModalEmergency(selectedAmbulance)}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open {selectedAmbulance.ambulanceId} Triage Bay</span>
          </button>
        )}
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Large Map Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <EmergencyMap
            hospital={hospitalProfile}
            emergencies={activeAmbulances}
            selectedEmergencyId={selectedAmbulance?.emergencyId || null}
            onSelectEmergency={(id) => setSelectedEmergencyId(id)}
            tileUrl={settings.mapTileUrl}
            tileAttribution={settings.mapAttribution}
            osrmUrl={settings.osrmRoutingUrl}
            height="560px"
            darkMode={settings.darkMode}
          />
        </div>

        {/* Live Telemetry Sidebar (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedAmbulance ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs transition-colors">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {selectedAmbulance.ambulanceId}
                    </span>
                    {selectedAmbulance.vehicleNumber && (
                      <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                        {selectedAmbulance.vehicleNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Call Sign: <strong className="text-slate-800 dark:text-slate-200">{selectedAmbulance.callSign || 'Assigned'}</strong>
                  </div>
                </div>

                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                    selectedAmbulance.priority === 'P1'
                      ? 'bg-rose-600 text-white'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  {selectedAmbulance.priority} · {selectedAmbulance.emergencyType}
                </span>
              </div>

              {/* Stale Telemetry Warning */}
              {isStaleLocation(selectedAmbulance.lastUpdated) && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Notice: Telemetry last updated &gt;60s ago. Telemetry may be delayed by cellular coverage.
                  </span>
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                    ETA to ER
                  </div>
                  <div className="text-xl font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                    {typeof selectedAmbulance.etaMinutes === 'number' ? `${selectedAmbulance.etaMinutes} min` : '--'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {typeof selectedAmbulance.remainingDistanceKm === 'number' ? `${selectedAmbulance.remainingDistanceKm} km remaining` : 'Calculating route'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                    Telemetry Speed
                  </div>
                  <div className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {typeof selectedAmbulance.speedKmh === 'number' ? selectedAmbulance.speedKmh : '--'} <span className="text-xs font-normal text-slate-500">km/h</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Heading {selectedAmbulance.heading ?? 0}°
                  </div>
                </div>
              </div>

              {/* Junction Telemetry */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  IoT Junction Sensor Feed
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Current Junction Beacon:
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white font-mono mt-0.5">
                    {selectedAmbulance.currentJunction || 'En Route via arterial road'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Next Approaching Junction:
                  </div>
                  <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 font-mono mt-0.5">
                    {selectedAmbulance.nextJunction || 'Hospital Approach Corridor'}
                  </div>
                </div>
              </div>

              {/* Driver and Coordination */}
              <div className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Authorized Driver:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedAmbulance.driverName || 'Driver in transit'}</span>
                </div>
                {selectedAmbulance.driverPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Direct Phone:</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400">{selectedAmbulance.driverPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Journey Status:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{selectedAmbulance.journeyStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Coordinates:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    {hasCoords
                      ? `${selectedAmbulance.currentLocation!.latitude.toFixed(5)}, ${selectedAmbulance.currentLocation!.longitude.toFixed(5)}`
                      : 'No GPS fix'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-colors">
              <Compass className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-300">
                No active ambulances in transit
              </div>
              <p className="text-xs text-slate-500 mt-1">
                When ambulances are dispatched towards {hospitalProfile.name}, live positions will appear here in real time.
              </p>
            </div>
          )}

          {/* Fleet Vehicles Quick Switcher */}
          {activeAmbulances.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-xs transition-colors">
              <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                Fleet in Transit ({activeAmbulances.length})
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {activeAmbulances.map((a) => (
                  <button
                    key={a.emergencyId}
                    onClick={() => setSelectedEmergencyId(a.emergencyId)}
                    className={`w-full p-2 rounded-lg text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      a.emergencyId === selectedAmbulance?.emergencyId
                        ? 'bg-cyan-50 dark:bg-slate-800 border border-cyan-400 dark:border-cyan-500/50 text-slate-900 dark:text-white font-medium'
                        : 'bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          a.priority === 'P1' ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                      />
                      <span>{a.ambulanceId} ({a.emergencyType})</span>
                    </div>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                      {typeof a.etaMinutes === 'number' ? `${a.etaMinutes}m` : '--'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inspect Modal */}
      {inspectModalEmergency && (
        <EmergencyDetailsModal
          emergency={inspectModalEmergency}
          onClose={() => setInspectModalEmergency(null)}
        />
      )}
    </div>
  );
};
