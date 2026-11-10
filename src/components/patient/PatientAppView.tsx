import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import {
  HeartPulse,
  MapPin,
  Navigation,
  ShieldCheck,
  ShieldAlert,
  Phone,
  AlertCircle,
  Radio,
  Clock,
  Compass,
  ArrowRight,
  ExternalLink,
  Activity,
  CheckCircle2,
  Stethoscope,
  Siren,
  Hospital,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { HospitalLocation } from '../../types/emergency';
import { listenHospitalOfficialLocation } from '../../services/firebaseDb';

// Demo patient locations in Hyderabad
const HYDERABAD_PATIENT_LOCATIONS = [
  {
    area: 'Banjara Hills Road No. 12 (Residential)',
    lat: 17.4150,
    lng: 78.4380,
    landmark: 'Near MLA Colony',
  },
  {
    area: 'Madhapur / HITEC City (Office IT Park)',
    lat: 17.4485,
    lng: 78.3908,
    landmark: 'Opposite Inorbit Mall Link',
  },
  {
    area: 'Jubilee Hills Check Post',
    lat: 17.4285,
    lng: 78.4120,
    landmark: 'Road No. 36 Junction',
  },
  {
    area: 'Somajiguda / Panjagutta',
    lat: 17.4265,
    lng: 78.4550,
    landmark: 'Near Raj Bhavan Road',
  },
];

export const PatientAppView: React.FC = () => {
  const { officialLocation, hospitalProfile } = useHospital();

  const [patientHospitalLoc, setPatientHospitalLoc] = useState<HospitalLocation | null>(officialLocation);
  const [selectedPatientLocIdx, setSelectedPatientLocIdx] = useState<number>(0);
  const [sosRequested, setSosRequested] = useState<boolean>(false);
  const [activeTriage, setActiveTriage] = useState<string | null>('Chest Pain / Acute Pressure');

  const currentPatientLoc = HYDERABAD_PATIENT_LOCATIONS[selectedPatientLocIdx];

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const hospMarkerRef = useRef<L.Marker | null>(null);
  const patientMarkerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);

  // Direct Firebase subscription
  useEffect(() => {
    const hospId = officialLocation?.hospitalId || hospitalProfile?.hospitalId || 'hosp-wewoo-01';
    const unsub = listenHospitalOfficialLocation(hospId, (remoteLoc) => {
      if (remoteLoc) {
        setPatientHospitalLoc(remoteLoc);
      }
    });
    return () => unsub();
  }, [officialLocation?.hospitalId, hospitalProfile?.hospitalId]);

  useEffect(() => {
    if (officialLocation) {
      setPatientHospitalLoc(officialLocation);
    }
  }, [officialLocation]);

  // Distance calculation
  const distanceKm = useMemo(() => {
    if (!patientHospitalLoc?.latitude || !patientHospitalLoc?.longitude) return 0;
    const lat1 = currentPatientLoc.lat;
    const lon1 = currentPatientLoc.lng;
    const lat2 = patientHospitalLoc.latitude;
    const lon2 = patientHospitalLoc.longitude;

    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }, [currentPatientLoc, patientHospitalLoc]);

  // Leaflet map initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const hLat = patientHospitalLoc?.latitude ?? 17.4225;
    const hLng = patientHospitalLoc?.longitude ?? 78.4435;
    const pLat = currentPatientLoc.lat;
    const pLng = currentPatientLoc.lng;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [(hLat + pLat) / 2, (hLng + pLng) / 2],
        zoom: 13,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Hospital Marker
      const hospIcon = L.divIcon({
        className: 'pat-hosp-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-rose-500/40 animate-ping"></span>
            <div class="w-8 h-8 rounded-xl bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-bold">
              H
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const hospMarker = L.marker([hLat, hLng], { icon: hospIcon }).addTo(map);
      hospMarker.bindPopup(`<b>${patientHospitalLoc?.hospitalName || 'WEWOO Hospital'}</b><br/>${patientHospitalLoc?.address || ''}`);

      // Patient Marker
      const patIcon = L.divIcon({
        className: 'pat-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-7 h-7 rounded-full bg-cyan-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const patMarker = L.marker([pLat, pLng], { icon: patIcon }).addTo(map);
      patMarker.bindPopup(`<b>Your Current Location</b><br/>${currentPatientLoc.area}`);

      const polyline = L.polyline(
        [
          [pLat, pLng],
          [hLat, hLng],
        ],
        { color: '#0284c7', weight: 4, dashArray: '5, 8', opacity: 0.85 }
      ).addTo(map);

      hospMarkerRef.current = hospMarker;
      patientMarkerRef.current = patMarker;
      lineRef.current = polyline;
      mapInstanceRef.current = map;

      return () => {
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (err) {
      console.warn('PatientAppView map init failed:', err);
    }
  }, []);

  // Sync markers when coordinates or location changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const hLat = patientHospitalLoc?.latitude;
    const hLng = patientHospitalLoc?.longitude;
    const pLat = currentPatientLoc.lat;
    const pLng = currentPatientLoc.lng;

    if (hLat && hLng && hospMarkerRef.current) {
      hospMarkerRef.current.setLatLng([hLat, hLng]);
    }
    if (patientMarkerRef.current) {
      patientMarkerRef.current.setLatLng([pLat, pLng]);
    }
    if (hLat && hLng && lineRef.current) {
      lineRef.current.setLatLngs([
        [pLat, pLng],
        [hLat, hLng],
      ]);
      mapInstanceRef.current.fitBounds([
        [pLat, pLng],
        [hLat, hLng],
      ], { padding: [50, 50] });
    }
  }, [patientHospitalLoc, currentPatientLoc]);

  const isVerified = patientHospitalLoc?.locationVerified === true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-white shadow-md shadow-cyan-950/40">
              <HeartPulse className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                WEWOO Emergency Patient Portal
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connected to Centralized Firebase RTDB · Direct Patient-to-Trauma Facility Routing
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
            <span>Firebase RTDB Live</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${
              isVerified
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isVerified ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>OFFICIAL HOSPITAL VERIFIED</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>HOSPITAL UNVERIFIED</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Unverified Warning Banner if location is not confirmed */}
      {!isVerified && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold">Hospital Location Verification Pending</p>
            <p className="mt-0.5 opacity-90">
              The hospital administrator has not yet verified the GPS coordinates for this facility. Directions may be approximate. For urgent life threats, dial 108 immediately.
            </p>
          </div>
        </div>
      )}

      {/* Main Patient Emergency Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Map & SOS Dispatch */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Route to {patientHospitalLoc?.hospitalName || 'WEWOO Emergency Center'}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                {distanceKm} km away from your location
              </span>
            </div>

            {/* Leaflet Map */}
            <div
              ref={mapContainerRef}
              className="w-full h-80 rounded-xl border border-slate-300 dark:border-slate-800 overflow-hidden shadow-inner z-0"
            />

            {/* Patient Location Switcher */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Simulate Your Location in Hyderabad:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {HYDERABAD_PATIENT_LOCATIONS.map((loc, idx) => (
                  <button
                    key={loc.area}
                    type="button"
                    onClick={() => setSelectedPatientLocIdx(idx)}
                    className={`p-2 rounded-lg text-left text-xs cursor-pointer border transition-all ${
                      selectedPatientLocIdx === idx
                        ? 'bg-cyan-50 dark:bg-cyan-950/70 border-cyan-500 text-cyan-900 dark:text-cyan-200 font-bold'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <p className="truncate text-[11px]">{loc.area.split('(')[0]}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Emergency SOS Trigger Button */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 to-rose-100/60 dark:from-rose-950/40 dark:to-rose-900/20 border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                  <Siren className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-bounce" />
                  <span>Request Emergency WEWOO Ambulance</span>
                </p>
                <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                  Direct GPS dispatch to nearest available paramedic unit with green traffic preemption.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSosRequested(!sosRequested)}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2 ${
                  sosRequested
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/30'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/30 animate-pulse'
                }`}
              >
                {sosRequested ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ambulance Dispatched (ETA 7m)</span>
                  </>
                ) : (
                  <>
                    <HeartPulse className="w-4 h-4" />
                    <span>PRESS FOR SOS DISPATCH</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Verified Hospital Location Details & Triage */}
        <div className="space-y-4">
          {/* Destination Hospital Card */}
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-900/60 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
                  H
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Emergency Destination
                  </h3>
                  <p className="text-[10px] text-slate-500">Official Hospital in Hyderabad</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-200 dark:border-emerald-800">
                ACTIVE ER
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">Hospital Facility</label>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {patientHospitalLoc?.hospitalName || hospitalProfile.name}
                </p>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">Physical Address</label>
                <p className="text-slate-700 dark:text-slate-300">
                  {patientHospitalLoc?.address || 'Road No. 2, Banjara Hills'}
                </p>
                <p className="text-slate-500 text-[11px]">
                  {patientHospitalLoc?.city || 'Hyderabad'}, {patientHospitalLoc?.state || 'Telangana'} {patientHospitalLoc?.postalCode || patientHospitalLoc?.pinCode || '500034'}
                </p>
              </div>

              {patientHospitalLoc?.landmark && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Emergency Bay Entrance</label>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {patientHospitalLoc.landmark}
                  </p>
                </div>
              )}

              {/* Coordinates verification */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Destination Lat:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {patientHospitalLoc?.latitude?.toFixed(5) ?? '17.42250'}°N
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destination Lng:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {patientHospitalLoc?.longitude?.toFixed(5) ?? '78.44350'}°E
                  </span>
                </div>
              </div>

              {/* Action Buttons: Phone & Google Maps */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href="tel:+914049668000"
                  className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Hospital</span>
                </a>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${patientHospitalLoc?.latitude ?? 17.4225},${patientHospitalLoc?.longitude ?? 78.4435}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Maps</span>
                </a>
              </div>

              {/* 108 Emergency Helpline */}
              <a
                href="tel:108"
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Dial 108 Telangana Ambulance Service</span>
              </a>
            </div>
          </div>

          {/* Symptom Quick Triage */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2.5 text-xs">
            <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Patient Symptom Rapid Triage:</span>
            </p>
            <div className="space-y-1">
              {[
                'Chest Pain / Acute Pressure (Cardiac Alert)',
                'Sudden Facial Droop / Arm Weakness (Stroke Alert)',
                'Severe Trauma / Bleeding / Fracture',
                'Severe Breathing Difficulty / Asthma Attack',
              ].map((symptom) => (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => setActiveTriage(symptom)}
                  className={`w-full text-left p-2 rounded-lg cursor-pointer text-xs border transition-colors ${
                    activeTriage === symptom
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-400 text-cyan-900 dark:text-cyan-200 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {symptom}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
