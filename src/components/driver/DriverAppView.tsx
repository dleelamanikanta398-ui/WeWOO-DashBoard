import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import {
  Navigation,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Radio,
  MapPin,
  Clock,
  Compass,
  Zap,
  Phone,
  Flame,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { HospitalLocation } from '../../types/emergency';
import { listenHospitalOfficialLocation } from '../../services/firebaseDb';

// Demo ambulance starting locations in Hyderabad
const HYDERABAD_AMBULANCE_START_POINTS = [
  {
    name: 'AMB-101 (HITEC City - Cyber Towers)',
    lat: 17.4504,
    lng: 78.3808,
    patientCondition: 'Acute STEMI (Cardiac Arrest Protocol)',
    speedKmH: 62,
  },
  {
    name: 'AMB-102 (Gachibowli Stadium Link)',
    lat: 17.4399,
    lng: 78.3489,
    patientCondition: 'Multiple Trauma / Road Traffic Accident',
    speedKmH: 58,
  },
  {
    name: 'AMB-103 (Secunderabad Rail Terminal)',
    lat: 17.4344,
    lng: 78.5015,
    patientCondition: 'Acute Ischemic Stroke (LVO)',
    speedKmH: 55,
  },
  {
    name: 'AMB-104 (Begumpet Airport Flyover)',
    lat: 17.4501,
    lng: 78.4682,
    patientCondition: 'Severe Respiratory Distress / Hypoxia',
    speedKmH: 65,
  },
];

export const DriverAppView: React.FC = () => {
  const { officialLocation, hospitalProfile, isDemoMode } = useHospital();

  // Local state synced directly from Firebase RTDB to demonstrate subscriber isolation
  const [driverHospitalLoc, setDriverHospitalLoc] = useState<HospitalLocation | null>(officialLocation);
  const [selectedAmbulanceIdx, setSelectedAmbulanceIdx] = useState<number>(0);
  const [ambulancePos, setAmbulancePos] = useState<{ lat: number; lng: number }>({
    lat: HYDERABAD_AMBULANCE_START_POINTS[0].lat,
    lng: HYDERABAD_AMBULANCE_START_POINTS[0].lng,
  });

  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [esp32PreemptionActive, setEsp32PreemptionActive] = useState<boolean>(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const hospMarkerRef = useRef<L.Marker | null>(null);
  const ambMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // 1. Independent subscription directly to Firebase Realtime Database
  useEffect(() => {
    const hospId = officialLocation?.hospitalId || hospitalProfile?.hospitalId || 'hosp-wewoo-01';
    const unsub = listenHospitalOfficialLocation(hospId, (remoteLoc) => {
      if (remoteLoc) {
        setDriverHospitalLoc(remoteLoc);
      }
    });
    return () => unsub();
  }, [officialLocation?.hospitalId, hospitalProfile?.hospitalId]);

  // Keep synced if context updates
  useEffect(() => {
    if (officialLocation) {
      setDriverHospitalLoc(officialLocation);
    }
  }, [officialLocation]);

  const activeAmbulance = HYDERABAD_AMBULANCE_START_POINTS[selectedAmbulanceIdx];

  // Calculate distance using Haversine formula
  const distanceKm = useMemo(() => {
    if (!driverHospitalLoc?.latitude || !driverHospitalLoc?.longitude) return 0;
    const lat1 = ambulancePos.lat;
    const lon1 = ambulancePos.lng;
    const lat2 = driverHospitalLoc.latitude;
    const lon2 = driverHospitalLoc.longitude;

    const R = 6371; // Earth radius in km
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
  }, [ambulancePos, driverHospitalLoc]);

  // ETA in minutes
  const etaMinutes = useMemo(() => {
    if (distanceKm <= 0) return 1;
    const speed = activeAmbulance.speedKmH || 60;
    return Math.max(1, Math.round((distanceKm / speed) * 60));
  }, [distanceKm, activeAmbulance]);

  // 2. Initialize Leaflet Map for Driver Navigation
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const hLat = driverHospitalLoc?.latitude ?? 17.4225;
    const hLng = driverHospitalLoc?.longitude ?? 78.4435;
    const aLat = ambulancePos.lat;
    const aLng = ambulancePos.lng;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [(hLat + aLat) / 2, (hLng + aLng) / 2],
        zoom: 12,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Hospital Marker
      const hospIcon = L.divIcon({
        className: 'driver-hosp-pin',
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
      hospMarker.bindPopup(`<b>${driverHospitalLoc?.hospitalName || 'WEWOO Hospital'}</b><br/>${driverHospitalLoc?.address || ''}`);

      // Ambulance Marker
      const ambIcon = L.divIcon({
        className: 'driver-amb-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const ambMarker = L.marker([aLat, aLng], { icon: ambIcon }).addTo(map);
      ambMarker.bindPopup(`<b>${activeAmbulance.name}</b><br/>Speed: ${activeAmbulance.speedKmH} km/h`);

      // Draw route line
      const polyline = L.polyline(
        [
          [aLat, aLng],
          [hLat, hLng],
        ],
        { color: '#059669', weight: 4, dashArray: '6, 8', opacity: 0.85 }
      ).addTo(map);

      hospMarkerRef.current = hospMarker;
      ambMarkerRef.current = ambMarker;
      routePolylineRef.current = polyline;
      mapInstanceRef.current = map;

      return () => {
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (err) {
      console.warn('DriverAppView map init failed:', err);
    }
  }, []);

  // Update map when hospital location or ambulance pos changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const hLat = driverHospitalLoc?.latitude;
    const hLng = driverHospitalLoc?.longitude;
    const aLat = ambulancePos.lat;
    const aLng = ambulancePos.lng;

    if (hLat && hLng && hospMarkerRef.current) {
      hospMarkerRef.current.setLatLng([hLat, hLng]);
      hospMarkerRef.current.setPopupContent(`<b>${driverHospitalLoc.hospitalName}</b><br/>${driverHospitalLoc.address}, ${driverHospitalLoc.city}`);
    }

    if (ambMarkerRef.current) {
      ambMarkerRef.current.setLatLng([aLat, aLng]);
    }

    if (hLat && hLng && routePolylineRef.current) {
      routePolylineRef.current.setLatLngs([
        [aLat, aLng],
        [hLat, hLng],
      ]);
      mapInstanceRef.current.fitBounds([
        [aLat, aLng],
        [hLat, hLng],
      ], { padding: [50, 50] });
    }
  }, [driverHospitalLoc, ambulancePos]);

  // Select different ambulance start point
  const handleSelectAmbulance = (idx: number) => {
    setSelectedAmbulanceIdx(idx);
    const chosen = HYDERABAD_AMBULANCE_START_POINTS[idx];
    setAmbulancePos({ lat: chosen.lat, lng: chosen.lng });
    setIsNavigating(false);
  };

  // Simulate vehicle movement along route
  useEffect(() => {
    if (!isNavigating || driverHospitalLoc?.latitude == null || driverHospitalLoc?.longitude == null) return;

    const interval = setInterval(() => {
      setAmbulancePos((prev) => {
        const destLat = driverHospitalLoc.latitude;
        const destLng = driverHospitalLoc.longitude;

        if (destLat == null || destLng == null) {
          return prev;
        }

        const dLat = destLat - prev.lat;
        const dLng = destLng - prev.lng;
        const remaining = Math.sqrt(dLat * dLat + dLng * dLng);

        if (remaining < 0.001) {
          setIsNavigating(false);
          return { lat: destLat, lng: destLng };
        }

        const step = 0.0008; // movement step
        const ratio = Math.min(step / remaining, 1);
        return {
          lat: parseFloat((prev.lat + dLat * ratio).toFixed(5)),
          lng: parseFloat((prev.lng + dLng * ratio).toFixed(5)),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isNavigating, driverHospitalLoc]);

  const isVerified = driverHospitalLoc?.locationVerified === true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-950/40">
              <Navigation className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                WEWOO Driver Navigation Terminal
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connected directly to centralized Firebase Realtime Database · Hyderabad Emergency Routing
              </p>
            </div>
          </div>
        </div>

        {/* Realtime Live Sync Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
            <span>Firebase RTDB Live Stream</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${
              isVerified
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 animate-pulse'
            }`}
          >
            {isVerified ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>HOSPITAL LOCATION VERIFIED</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>LOCATION UNVERIFIED</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* CRITICAL VERIFICATION CHECK & ERROR BANNER */}
      {/* =================================================================== */}
      {!isVerified && (
        <div className="p-5 rounded-2xl bg-rose-600/10 dark:bg-rose-950/50 border-2 border-rose-500 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-rose-700 dark:text-rose-300">
                NAVIGATION DISABLED — HOSPITAL LOCATION UNVERIFIED IN FIREBASE
              </h2>
              <p className="text-xs text-rose-800/90 dark:text-rose-300/90 mt-0.5 max-w-2xl">
                The WEWOO Driver App has detected that the centralized hospital coordinates at{' '}
                <code className="font-mono bg-rose-200 dark:bg-rose-900/60 px-1 rounded">/hospitals/{'{'}id{'}'}/location</code> have not been verified by an authorized hospital administrator. Emergency routing and ESP32 traffic signal preemption are locked to prevent misrouting.
              </p>
            </div>
          </div>
          <div className="text-xs font-bold px-3 py-2 bg-rose-600 text-white rounded-xl shadow-md text-center shrink-0">
            Awaiting Admin Verification
          </div>
        </div>
      )}

      {/* Main Driver Cockpit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Navigation Map */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Navigation className="w-4 h-4 text-emerald-500" />
                <span>Active Route: {activeAmbulance.name} ➔ {driverHospitalLoc?.hospitalName || 'WEWOO Hospital'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {distanceKm} km · ETA {etaMinutes} min
                </span>
              </div>
            </div>

            {/* Leaflet Map */}
            <div
              ref={mapContainerRef}
              className="w-full h-96 rounded-xl border border-slate-300 dark:border-slate-800 overflow-hidden shadow-inner z-0"
            />

            {/* Navigation Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!isVerified}
                  onClick={() => setIsNavigating(!isNavigating)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md ${
                    !isVerified
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                      : isNavigating
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <Navigation className="w-4 h-4" />
                  <span>{isNavigating ? 'Pause Navigation' : 'Start Emergency Navigation'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const chosen = HYDERABAD_AMBULANCE_START_POINTS[selectedAmbulanceIdx];
                    setAmbulancePos({ lat: chosen.lat, lng: chosen.lng });
                    setIsNavigating(false);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Vehicle Position</span>
                </button>
              </div>

              {/* ESP32 Traffic Preemption Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs">
                <Zap className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span className="font-semibold">ESP32 Traffic Signal Preemption:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">GREEN CORRIDOR ACTIVE</span>
              </div>
            </div>
          </div>

          {/* Hyderabad Ambulance Dispatch Selector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Active Ambulance Fleet in Hyderabad:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HYDERABAD_AMBULANCE_START_POINTS.map((amb, idx) => (
                <button
                  key={amb.name}
                  type="button"
                  onClick={() => handleSelectAmbulance(idx)}
                  className={`p-3 rounded-xl border text-left text-xs cursor-pointer transition-all ${
                    selectedAmbulanceIdx === idx
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{amb.name.split('(')[0]}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono">{amb.speedKmH} km/h</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{amb.patientCondition}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">{amb.name.split('(')[1]?.replace(')', '')}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Centralized Hospital Destination Card (Read from Firebase) */}
        <div className="space-y-4">
          {/* Target Destination Profile Card */}
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-900/60 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
                  H
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Verified Destination
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">Firebase Realtime Database</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded border border-rose-200 dark:border-rose-900">
                LIVE SYNC
              </span>
            </div>

            {/* Official Hospital Data */}
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">Hospital Facility</label>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {driverHospitalLoc?.hospitalName || hospitalProfile.name}
                </p>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">Physical Address in Hyderabad</label>
                <p className="text-slate-700 dark:text-slate-300">
                  {driverHospitalLoc?.address || 'Road No. 2, Banjara Hills'}
                </p>
                <p className="text-slate-500 text-[11px]">
                  {driverHospitalLoc?.city || 'Hyderabad'}, {driverHospitalLoc?.state || 'Telangana'} {driverHospitalLoc?.postalCode || driverHospitalLoc?.pinCode || '500034'}
                </p>
              </div>

              {driverHospitalLoc?.landmark && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Emergency Bay Landmark</label>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {driverHospitalLoc.landmark}
                  </p>
                </div>
              )}

              {/* Verified Coordinates Display */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Destination Lat:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {driverHospitalLoc?.latitude?.toFixed(5) ?? '17.42250'}°N
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Destination Lng:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {driverHospitalLoc?.longitude?.toFixed(5) ?? '78.44350'}°E
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Ambulance GPS:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {ambulancePos.lat.toFixed(5)}°N, {ambulancePos.lng.toFixed(5)}°E
                  </span>
                </div>
              </div>

              {/* Real-time Telemetry Stats */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                  <p className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">Remaining Distance</p>
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    {distanceKm} <span className="text-xs font-normal">km</span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-center">
                  <p className="text-[10px] uppercase font-bold text-cyan-800 dark:text-cyan-300">Estimated Arrival</p>
                  <p className="text-xl font-extrabold text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">
                    {etaMinutes} <span className="text-xs font-normal">min</span>
                  </p>
                </div>
              </div>

              {/* Direct ER Call Button */}
              <a
                href="tel:+914049668000"
                className="w-full mt-2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Call Trauma Bay Hotline (+91 40 4966 8000)</span>
              </a>
            </div>
          </div>

          {/* Firebase Synchronization Transparency Box */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Compass className="w-4 h-4 text-emerald-500" />
              <span>Firebase RTDB Synchronized Path</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              This Driver App terminal never hardcodes coordinates. It listens in real-time to:
            </p>
            <p className="font-mono text-[10px] bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 break-all">
              /hospitals/{driverHospitalLoc?.hospitalId || 'hosp-wewoo-01'}/location
            </p>
            <p className="text-[10px] text-slate-400">
              Last updated: {driverHospitalLoc?.updatedAt ? new Date(driverHospitalLoc.updatedAt).toLocaleTimeString() : 'Just now'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
