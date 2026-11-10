import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { EmergencyRecord, HospitalProfile, RegisteredHospitalProfile } from '../../types/emergency';
import { fetchOsrmRoute, RouteResult } from '../../services/routing';
import { Navigation, Building2, MapPin } from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';

interface EmergencyMapProps {
  hospital: HospitalProfile;
  emergencies: EmergencyRecord[];
  selectedEmergencyId: string | null;
  onSelectEmergency?: (emergencyId: string) => void;
  registeredHospitals?: RegisteredHospitalProfile[];
  tileUrl?: string;
  tileAttribution?: string;
  osrmUrl?: string;
  height?: string;
  interactive?: boolean;
  showLegend?: boolean;
  darkMode?: boolean;
}

export const EmergencyMap: React.FC<EmergencyMapProps> = ({
  hospital,
  emergencies,
  selectedEmergencyId,
  onSelectEmergency,
  registeredHospitals,
  tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  osrmUrl = 'https://router.project-osrm.org/route/v1/driving',
  height = '500px',
  interactive = true,
  showLegend = true,
  darkMode = true,
}) => {
  const { allRegisteredHospitals, registeredProfile, verificationStatus } = useHospital();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const networkHospitalsLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const hospitalMarkerRef = useRef<L.Marker | null>(null);

  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [routeInfo, setRouteInfo] = useState<RouteResult | null>(null);
  const [tileError, setTileError] = useState<string | null>(null);

  // Network hospitals to display (excluding current active hospital if it has same id)
  const displayHospitals = registeredHospitals || allRegisteredHospitals || [];

  const hasValidLocation = (emg: EmergencyRecord): boolean =>
    Boolean(
      emg.currentLocation &&
      typeof emg.currentLocation.latitude === 'number' &&
      !isNaN(emg.currentLocation.latitude) &&
      typeof emg.currentLocation.longitude === 'number' &&
      !isNaN(emg.currentLocation.longitude)
    );

  const locatedEmergencies = emergencies.filter(hasValidLocation);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [hospital.location.latitude, hospital.location.longitude],
        zoom: 13,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
        attributionControl: true,
      });

      const tileLayer = L.tileLayer(tileUrl, {
        attribution: tileAttribution,
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      });

      tileLayer.on('tileerror', () => {
        setTileError('Notice: OpenStreetMap public tile server rate limited. Map continuing with available tiles.');
      });

      tileLayer.addTo(map);

      // Separate layer groups: network hospitals and moving ambulances
      const netHospGroup = L.layerGroup().addTo(map);
      networkHospitalsLayerRef.current = netHospGroup;

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;

      mapInstanceRef.current = map;

      const handleResize = () => map.invalidateSize();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize Leaflet Map:', err);
    }
  }, [tileUrl, tileAttribution, interactive, hospital.location]);

  // Update Active Hospital Primary Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (hospitalMarkerRef.current) {
      hospitalMarkerRef.current.remove();
    }

    const isVerified = verificationStatus === 'verified';
    const regNum = registeredProfile?.registrationNumber || 'REG-ACTIVE';
    const govType = registeredProfile?.hospitalType || 'Hospital Command Facility';
    const caps = registeredProfile?.emergencyCapabilities && registeredProfile.emergencyCapabilities.length > 0
      ? registeredProfile.emergencyCapabilities.join(', ')
      : hospital.traumaLevel || '24/7 Emergency Care, ICU, Trauma';

    const hospitalIcon = L.divIcon({
      className: 'custom-hospital-pin',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute -inset-2.5 bg-emerald-500/30 rounded-full animate-ping"></div>
          <div class="relative z-10 w-10 h-10 bg-slate-950 border-2 border-emerald-400 rounded-xl shadow-2xl flex items-center justify-center text-emerald-400">
            <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
            </svg>
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-emerald-950/95 text-emerald-300 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border border-emerald-500/40 shadow-lg">
            ★ ${hospital.name.slice(0, 14)}
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const marker = L.marker([hospital.location.latitude, hospital.location.longitude], {
      icon: hospitalIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    marker.bindPopup(`
      <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #0f172a; padding: 4px; min-width: 220px; line-height: 1.4;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
          <strong style="color: #059669; font-size: 13px;">${hospital.name}</strong>
          <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 1px 6px; border-radius: 4px; background: #ecfdf5; color: #059669; border: 1px solid #05966950;">
            ACTIVE COMMAND
          </span>
        </div>
        <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
          <strong>Reg Number:</strong> <span style="font-family: monospace;">${regNum}</span>
        </div>
        <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
          <strong>Facility Type:</strong> ${govType}
        </div>
        <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
          <strong>Contact:</strong> <span style="font-family: monospace;">${hospital.emergencyHotline}</span>
        </div>
        <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
          <strong>Verification:</strong> <span style="color: ${isVerified ? '#059669' : '#d97706'}; font-weight: 600;">${isVerified ? 'Verified Facility' : 'Pending Verification'}</span>
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 5px; padding-top: 4px; border-top: 1px solid #e2e8f0;">
          <strong>Emergency Capabilities:</strong> ${caps}
        </div>
      </div>
    `);

    hospitalMarkerRef.current = marker;
  }, [hospital, registeredProfile, verificationStatus]);

  // Update Network Registered Hospitals Markers
  useEffect(() => {
    const netLayer = networkHospitalsLayerRef.current;
    if (!netLayer) return;

    netLayer.clearLayers();

    // Filter out active hospital and invalid coordinates
    const otherHospitals = displayHospitals.filter(
      (h) =>
        h.hospitalId !== hospital.hospitalId &&
        typeof h.latitude === 'number' &&
        !isNaN(h.latitude) &&
        typeof h.longitude === 'number' &&
        !isNaN(h.longitude)
    );

    otherHospitals.forEach((hosp) => {
      const isVerified = hosp.verificationStatus === 'verified';
      const statusColor = isVerified ? '#10b981' : '#f59e0b';
      const statusBg = isVerified ? '#ecfdf5' : '#fffbeb';
      const statusText = isVerified ? 'Verified' : 'Pending Verification';
      const capsSummary = hosp.emergencyCapabilities && hosp.emergencyCapabilities.length > 0
        ? hosp.emergencyCapabilities.slice(0, 3).join(', ') + (hosp.emergencyCapabilities.length > 3 ? ` (+${hosp.emergencyCapabilities.length - 3} more)` : '')
        : 'Emergency Receiving Facility';

      const netIcon = L.divIcon({
        className: 'custom-network-hospital-pin',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="relative z-10 w-7 h-7 bg-slate-900 border-2 border-indigo-400 rounded-lg shadow-lg flex items-center justify-center text-indigo-400 transition-transform group-hover:scale-115">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
              </svg>
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/90 text-indigo-200 text-[9px] font-medium tracking-tight px-1.5 py-0.2 rounded border border-indigo-500/40 shadow-md">
              ${hosp.hospitalName.slice(0, 14)}
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([hosp.latitude, hosp.longitude], {
        icon: netIcon,
        zIndexOffset: 750,
      }).addTo(netLayer);

      marker.bindPopup(`
        <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #0f172a; padding: 4px; min-width: 210px; line-height: 1.4;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <strong style="color: #4338ca; font-size: 13px;">${hosp.hospitalName}</strong>
            <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 1px 5px; border-radius: 4px; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}40;">
              ${statusText}
            </span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            <strong>Reg Number:</strong> <span style="font-family: monospace;">${hosp.registrationNumber || 'N/A'}</span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            <strong>Governance:</strong> ${hosp.hospitalType || 'Private'}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            <strong>Emergency Contact:</strong> <span style="font-family: monospace;">${hosp.phone || 'N/A'}</span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            <strong>Address:</strong> ${hosp.city ? `${hosp.city}, ${hosp.state || ''}` : hosp.address || 'N/A'}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 5px; padding-top: 4px; border-top: 1px solid #e2e8f0;">
            <strong>Capabilities:</strong> ${capsSummary}
          </div>
        </div>
      `);
    });
  }, [displayHospitals, hospital.hospitalId]);

  // Update Ambulance Markers (ONLY when valid coordinates exist)
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();

    locatedEmergencies.forEach((emg) => {
      if (!emg.currentLocation) return;

      const isSelected = emg.emergencyId === selectedEmergencyId;
      const isCritical = emg.priority === 'P1';
      const isUrgent = emg.priority === 'P2';

      const colorClass = isCritical
        ? 'border-rose-500 text-rose-400 bg-rose-950/90'
        : isUrgent
        ? 'border-amber-500 text-amber-400 bg-amber-950/90'
        : 'border-blue-500 text-blue-400 bg-blue-950/90';

      const badgeColor = isCritical
        ? 'bg-rose-600 text-white'
        : isUrgent
        ? 'bg-amber-600 text-white'
        : 'bg-blue-600 text-white';

      const pulseHtml = isCritical
        ? '<div class="absolute -inset-1.5 bg-rose-500/30 rounded-full animate-ping"></div>'
        : '';

      const selectionRing = isSelected
        ? '<div class="absolute -inset-3 border-2 border-dashed border-cyan-400 rounded-full animate-spin"></div>'
        : '';

      const ambulanceIcon = L.divIcon({
        className: 'custom-ambulance-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110">
            ${selectionRing}
            ${pulseHtml}
            <div class="relative z-10 w-8 h-8 rounded-full border-2 ${colorClass} shadow-lg flex items-center justify-center">
              <svg class="w-4 h-4 fill-current transform rotate-[${emg.heading || 0}deg]" viewBox="0 0 24 24">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
              </svg>
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap ${badgeColor} text-[9px] font-bold tracking-tight px-1 py-0.2 rounded shadow">
              ${emg.ambulanceId} ${typeof emg.etaMinutes === 'number' ? `· ${emg.etaMinutes}m` : ''}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([emg.currentLocation.latitude, emg.currentLocation.longitude], {
        icon: ambulanceIcon,
        zIndexOffset: isSelected ? 900 : 500,
      });

      marker.bindPopup(`
        <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #0f172a; padding: 4px; min-width: 190px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <strong style="color: ${isCritical ? '#e11d48' : '#d97706'}; font-size: 13px;">${emg.ambulanceId}</strong>
            <span style="font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: ${isCritical ? '#ffe4e6' : '#fef3c7'}; color: ${isCritical ? '#e11d48' : '#b45309'};">
              ${emg.priority} · ${emg.emergencyType}
            </span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            <strong>Driver:</strong> ${emg.driverName || 'Dispatch Driver'}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            <strong>ETA:</strong> <span style="font-weight: 600; color: #0284c7;">${typeof emg.etaMinutes === 'number' ? `${emg.etaMinutes} mins` : 'Calculating'}</span>
            ${typeof emg.remainingDistanceKm === 'number' ? ` (${emg.remainingDistanceKm} km)` : ''}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            <strong>Status:</strong> ${emg.journeyStatus}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-family: monospace;">
            ${emg.currentLocation.latitude.toFixed(4)}°N, ${emg.currentLocation.longitude.toFixed(4)}°E
          </div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectEmergency) {
          onSelectEmergency(emg.emergencyId);
        }
      });

      marker.addTo(markersGroup);
    });
  }, [locatedEmergencies, selectedEmergencyId, onSelectEmergency]);

  // Recalculate OSRM Road Route
  const updateRoute = useCallback(async () => {
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    if (!selectedEmergencyId) {
      setRouteInfo(null);
      return;
    }

    const target = emergencies.find((e) => e.emergencyId === selectedEmergencyId);
    if (!target || !target.currentLocation) {
      setRouteInfo(null);
      return;
    }

    setIsLoadingRoute(true);

    try {
      const result = await fetchOsrmRoute(
        target.currentLocation,
        hospital.location,
        osrmUrl
      );

      setRouteInfo(result);

      if (result.coordinates && result.coordinates.length > 1 && mapInstanceRef.current) {
        const routeLine = L.polyline(result.coordinates, {
          color: target.priority === 'P1' ? '#f43f5e' : '#f59e0b',
          weight: 5,
          opacity: 0.9,
          lineJoin: 'round',
          dashArray: target.priority === 'P1' ? undefined : '6, 6',
        }).addTo(mapInstanceRef.current);

        routeLayerRef.current = routeLine;
      }
    } catch (err) {
      console.warn('Failed to render OSRM route:', err);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [selectedEmergencyId, emergencies, hospital.location, osrmUrl]);

  useEffect(() => {
    updateRoute();
  }, [updateRoute]);

  const fitToAll = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points: [number, number][] = [
      [hospital.location.latitude, hospital.location.longitude],
      ...locatedEmergencies.map(
        (e) => [e.currentLocation!.latitude, e.currentLocation!.longitude] as [number, number]
      ),
      ...displayHospitals
        .filter((h) => typeof h.latitude === 'number' && !isNaN(h.latitude) && typeof h.longitude === 'number' && !isNaN(h.longitude))
        .map((h) => [h.latitude, h.longitude] as [number, number]),
    ];

    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  };

  const centerOnHospital = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([hospital.location.latitude, hospital.location.longitude], 14, { duration: 0.8 });
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-xs transition-colors">
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        style={{ height }}
        className={`w-full z-0 ${darkMode ? 'dark-map-tiles' : ''}`}
      />

      {/* No Ambulance Location Available Overlay */}
      {locatedEmergencies.length === 0 && (
        <div className="absolute top-3 left-3 z-[400] bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 shadow-md backdrop-blur-xs flex items-center gap-2">
          <Navigation className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>No ambulance location available. Waiting for live GPS telemetry.</span>
        </div>
      )}

      {/* Route Loading / Status Banner */}
      {isLoadingRoute && (
        <div className="absolute top-12 left-3 z-[400] bg-white/90 dark:bg-slate-900/90 text-cyan-700 dark:text-cyan-300 text-xs px-3 py-1.5 rounded-lg border border-cyan-300 dark:border-cyan-500/30 flex items-center gap-2 backdrop-blur-xs shadow-md">
          <div className="w-3.5 h-3.5 border-2 border-cyan-600 dark:border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span>Computing OSRM Road Route...</span>
        </div>
      )}

      {/* Notice / Fallback Message */}
      {routeInfo?.error && (
        <div className="absolute top-3 right-3 z-[400] max-w-sm bg-amber-50 dark:bg-amber-950/90 text-amber-800 dark:text-amber-200 text-[11px] px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-600/40 backdrop-blur-xs shadow-md">
          {routeInfo.error}
        </div>
      )}

      {tileError && (
        <div className="absolute top-12 left-3 z-[400] max-w-md bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 text-[11px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 backdrop-blur-xs shadow-md">
          {tileError}
        </div>
      )}

      {/* Floating Control Toolbar */}
      <div className="absolute bottom-3 right-3 z-[400] flex items-center gap-2">
        <button
          onClick={centerOnHospital}
          type="button"
          title="Center on WEWOO Hospital"
          className="px-2.5 py-1.5 bg-white/95 dark:bg-slate-900/95 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 shadow-md backdrop-blur-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          Hospital
        </button>

        <button
          onClick={fitToAll}
          type="button"
          title="Fit fleet and hospital in view"
          className="px-2.5 py-1.5 bg-white/95 dark:bg-slate-900/95 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 shadow-md backdrop-blur-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
          Fit View
        </button>
      </div>

      {/* Map Legend */}
      {showLegend && (
        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 text-[11px] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 backdrop-blur-xs shadow-lg max-w-[230px]">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Emergency Map Legend
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 ring-2 ring-emerald-400/40 shadow-xs" />
              <span className="font-medium text-emerald-700 dark:text-emerald-300">Active Command Facility</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 shadow-xs" />
              <span>Network Hospitals ({displayHospitals.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
              <span>Priority 1: Code Red</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
              <span>Priority 2: Urgent Care</span>
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[9px] text-slate-500 dark:text-slate-400">
            OpenStreetMap & OSRM Engine
          </div>
        </div>
      )}
    </div>
  );
};
