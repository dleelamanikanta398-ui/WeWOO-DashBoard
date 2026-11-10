import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Activity,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Compass,
  Search,
  Navigation,
  Crosshair,
  ShieldCheck,
  ShieldAlert,
  Radio,
  ExternalLink,
  Info,
  Check,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import {
  HospitalDetailsInput,
  STANDARD_SPECIALITIES,
  STANDARD_EMERGENCY_CAPABILITIES,
  HospitalLocation,
} from '../../types/emergency';

// Hyderabad landmark presets for rapid navigation
const HYDERABAD_LANDMARK_PRESETS = [
  {
    name: 'Banjara Hills (Care / Taj Krishna)',
    lat: 17.4225,
    lng: 78.4435,
    address: 'Road No. 2, Banjara Hills',
    pin: '500034',
  },
  {
    name: 'Jubilee Hills (Apollo Hospitals Hub)',
    lat: 17.4319,
    lng: 78.4073,
    address: 'Road No. 72, Opposite Bharatiya Vidya Bhavan, Jubilee Hills',
    pin: '500033',
  },
  {
    name: 'HITEC City (AIG / Cyber Towers)',
    lat: 17.4435,
    lng: 78.3772,
    address: '1-66/A, Mindspace Road, Gachibowli - Hitec City Link',
    pin: '500081',
  },
  {
    name: 'Gachibowli (Continental / Financial Dist)',
    lat: 17.4359,
    lng: 78.3582,
    address: 'IT & Financial District, Nanakramguda, Gachibowli',
    pin: '500032',
  },
  {
    name: 'Secunderabad (Yashoda / Clock Tower)',
    lat: 17.4399,
    lng: 78.4983,
    address: 'Alexander Road, SP Road, Secunderabad',
    pin: '500003',
  },
  {
    name: 'Begumpet (KIMS / Old Airport)',
    lat: 17.4436,
    lng: 78.4729,
    address: '1-8-31/1, Minister Road, Begumpet',
    pin: '500016',
  },
  {
    name: 'LB Nagar (Kamineni Trauma Hub)',
    lat: 17.3457,
    lng: 78.5522,
    address: 'Inner Ring Road, Snehapuri Colony, LB Nagar',
    pin: '500068',
  },
  {
    name: 'Old City (Osmania General / Afzal Gunj)',
    lat: 17.3616,
    lng: 78.4747,
    address: 'Afzal Gunj, Near High Court & Charminar',
    pin: '500012',
  },
];

export const HospitalDetailsView: React.FC = () => {
  const {
    hospitalProfile,
    registeredProfile,
    officialLocation,
    updateHospitalDetails,
    updateHospitalLocation,
    verifyHospitalLocationStatus,
    currentUser,
  } = useHospital();

  const [formData, setFormData] = useState<HospitalDetailsInput>({
    hospitalName: '',
    registrationNumber: '',
    hospitalType: 'Private',
    email: '',
    phone: '',
    address: 'Road No. 2, Banjara Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    pinCode: '500034',
    latitude: 17.4225,
    longitude: 78.4435,
    specialities: [],
    customSpeciality: '',
    emergencyCapabilities: [],
  });

  const [landmarkNote, setLandmarkNote] = useState<string>('Near Care Hospital & Taj Krishna Circle');
  const [isLocationVerified, setIsLocationVerified] = useState<boolean>(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [modalPendingVerification, setModalPendingVerification] = useState<boolean>(true);

  const [otherSelected, setOtherSelected] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // 1. Initialize Leaflet Map centered on Hyderabad, Telangana
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = officialLocation?.latitude ?? formData.latitude ?? 17.4225;
    const initialLng = officialLocation?.longitude ?? formData.longitude ?? 78.4435;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom WEWOO Hospital Icon with pulse
      const pinIcon = L.divIcon({
        className: 'custom-hosp-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-rose-500/30 animate-ping"></span>
            <div class="relative w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 border-2 border-white shadow-xl flex items-center justify-center text-white">
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([initialLat, initialLng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      marker.bindPopup(`
        <div class="p-2 text-xs font-sans">
          <p class="font-bold text-rose-700">Official Hospital Location</p>
          <p class="text-slate-600">Drag this marker or click anywhere on the Hyderabad map to reposition.</p>
        </div>
      `);

      // Drag event
      marker.on('dragend', async (e) => {
        const position = e.target.getLatLng();
        const newLat = parseFloat(position.lat.toFixed(5));
        const newLng = parseFloat(position.lng.toFixed(5));
        setFormData((prev) => ({ ...prev, latitude: newLat, longitude: newLng }));
        setSaveSuccess(false);

        // Reverse geocode to suggest address
        tryReverseGeocode(newLat, newLng);
      });

      // Map click event
      map.on('click', (e) => {
        const newLat = parseFloat(e.latlng.lat.toFixed(5));
        const newLng = parseFloat(e.latlng.lng.toFixed(5));
        setFormData((prev) => ({ ...prev, latitude: newLat, longitude: newLng }));
        marker.setLatLng([newLat, newLng]);
        setSaveSuccess(false);

        // Reverse geocode
        tryReverseGeocode(newLat, newLng);
      });

      markerRef.current = marker;
      mapInstanceRef.current = map;

      return () => {
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (err) {
      console.warn('Failed to initialize Leaflet in HospitalDetailsView:', err);
    }
  }, []);

  // Synchronize map center when coords change
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const lat = formData.latitude;
      const lng = formData.longitude;
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        markerRef.current.setLatLng([lat, lng]);
        mapInstanceRef.current.panTo([lat, lng]);
      }
    }
  }, [formData.latitude, formData.longitude]);

  // Load existing profile & official location
  useEffect(() => {
    const activeLoc = officialLocation;
    const activeProfile = registeredProfile;

    const lat = activeLoc?.latitude ?? activeProfile?.latitude ?? 17.4225;
    const lng = activeLoc?.longitude ?? activeProfile?.longitude ?? 78.4435;
    const addr = activeLoc?.address ?? activeProfile?.address ?? 'Road No. 2, Banjara Hills';
    const city = activeLoc?.city ?? activeProfile?.city ?? 'Hyderabad';
    const state = activeLoc?.state ?? activeProfile?.state ?? 'Telangana';
    const pin = activeLoc?.pinCode ?? activeLoc?.postalCode ?? activeProfile?.pinCode ?? '500034';
    const verified = activeLoc?.locationVerified ?? activeProfile?.locationVerified ?? true;
    const lmark = activeLoc?.landmark ?? 'Near Care Hospital & Taj Krishna Circle';

    setIsLocationVerified(verified);
    setLandmarkNote(lmark);

    if (activeProfile) {
      const specs = activeProfile.specialities || [];
      const hasCustom = specs.some((s) => !STANDARD_SPECIALITIES.includes(s as any));
      const customVal = hasCustom
        ? specs.find((s) => !STANDARD_SPECIALITIES.includes(s as any)) || ''
        : '';

      setFormData({
        hospitalName: activeLoc?.hospitalName || activeProfile.hospitalName || hospitalProfile.name || '',
        registrationNumber: activeProfile.registrationNumber || 'TEL-HYD-MED-2024-8891',
        hospitalType: activeProfile.hospitalType || 'Private',
        email: activeProfile.email || currentUser?.email || 'emergency.response@wewoo-apex.org',
        phone: activeProfile.phone || '+91 40 4966 8000',
        address: addr,
        city: city,
        state: state,
        pinCode: pin,
        latitude: lat,
        longitude: lng,
        specialities: specs.filter((s) => STANDARD_SPECIALITIES.includes(s as any)),
        customSpeciality: customVal,
        emergencyCapabilities: activeProfile.emergencyCapabilities || [
          'Level-1 Trauma Resuscitation',
          'Interventional Cath Lab (24/7 STEMI)',
          'Comprehensive Stroke Center (tPA / Thrombectomy)',
          'Emergency ICU & Ventilator Suite',
          'Blood Bank & Transfusion Unit',
        ],
      });

      if (hasCustom) setOtherSelected(true);
    } else {
      setFormData((prev) => ({
        ...prev,
        hospitalName: activeLoc?.hospitalName || hospitalProfile.name || 'WEWOO Apex Emergency Hospital & Trauma Center',
        phone: hospitalProfile.phone || '+91 40 4966 8000',
        email: currentUser?.email || 'emergency.response@wewoo-apex.org',
        address: addr,
        city: city,
        state: state,
        pinCode: pin,
        latitude: lat,
        longitude: lng,
        registrationNumber: 'TEL-HYD-MED-2024-8891',
      }));
    }
  }, [officialLocation, registeredProfile, hospitalProfile, currentUser]);

  // Reverse geocoding helper via Nominatim
  const tryReverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const street = addr.road || addr.suburb || addr.neighbourhood || addr.pedestrian || '';
        const city = addr.city || addr.town || addr.municipality || 'Hyderabad';
        const state = addr.state || 'Telangana';
        const postCode = addr.postcode || '500034';

        setFormData((prev) => ({
          ...prev,
          address: street ? `${street}, ${addr.suburb || ''}`.trim().replace(/^, |, $/g, '') : prev.address,
          city: city || 'Hyderabad',
          state: state || 'Telangana',
          pinCode: postCode || prev.pinCode,
        }));
      }
    } catch {
      // Nominatim reverse geocode is an assistive helper; silent catch if offline
    }
  };

  // Search Hyderabad map
  const handleMapSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      // Query bounded to Hyderabad, Telangana
      const q = encodeURIComponent(`${searchQuery}, Hyderabad, Telangana`);
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&viewbox=78.20,17.20,78.65,17.60&bounded=1&limit=5`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!res.ok) throw new Error('Geocoding service unavailable');
      const data = await res.json();

      if (data && data.length > 0) {
        setSearchResults(data);
      } else {
        // Fallback search without strict bounding if no results
        const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery + ' Hyderabad')}&format=json&limit=5`;
        const fbRes = await fetch(fallbackUrl);
        const fbData = await fbRes.json();
        if (fbData && fbData.length > 0) {
          setSearchResults(fbData);
        } else {
          setSearchError('No matching location found in Hyderabad. You can also drag the marker directly on the map.');
        }
      }
    } catch (err: any) {
      setSearchError(err.message || 'Search failed. Please try dragging the pin directly.');
    } finally {
      setIsSearching(false);
    }
  };

  // Select Search Result
  const handleSelectSearchResult = (result: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(parseFloat(result.lat).toFixed(5));
    const lng = parseFloat(parseFloat(result.lon).toFixed(5));
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
    setSearchResults([]);
    setSearchQuery('');
    setSaveSuccess(false);

    tryReverseGeocode(lat, lng);
  };

  // Select Landmark Preset
  const handleSelectPreset = (preset: typeof HYDERABAD_LANDMARK_PRESETS[0]) => {
    setFormData((prev) => ({
      ...prev,
      latitude: preset.lat,
      longitude: preset.lng,
      address: preset.address,
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: preset.pin,
    }));
    setLandmarkNote(preset.name);
    setSaveSuccess(false);
  };

  // Recenter to Hyderabad Banjara Hills default
  const handleRecenterHyderabad = () => {
    const lat = 17.4225;
    const lng = 78.4435;
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      city: 'Hyderabad',
      state: 'Telangana',
    }));
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 14);
    }
  };

  // Toggle Speciality Checkbox
  const toggleSpeciality = (speciality: string) => {
    setFormData((prev) => {
      const exists = prev.specialities.includes(speciality);
      const updated = exists
        ? prev.specialities.filter((s) => s !== speciality)
        : [...prev.specialities, speciality];
      return { ...prev, specialities: updated };
    });
    setSaveSuccess(false);
  };

  // Toggle Emergency Capability Checkbox
  const toggleCapability = (cap: string) => {
    setFormData((prev) => {
      const exists = prev.emergencyCapabilities.includes(cap);
      const updated = exists
        ? prev.emergencyCapabilities.filter((c) => c !== cap)
        : [...prev.emergencyCapabilities, cap];
      return { ...prev, emergencyCapabilities: updated };
    });
    setSaveSuccess(false);
  };

  // Field change helper
  const handleChange = (
    field: keyof HospitalDetailsInput,
    value: string | number | string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  // Open confirmation modal for Saving/Updating Location
  const handleOpenLocationConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.hospitalName.trim()) {
      setErrorMessage('Please enter the official hospital name before saving location.');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMessage('Please provide a complete physical street address in Hyderabad.');
      return;
    }
    if (!formData.latitude || !formData.longitude) {
      setErrorMessage('Please pick valid GPS coordinates for the hospital.');
      return;
    }

    setModalPendingVerification(isLocationVerified);
    setShowConfirmModal(true);
  };

  // Execute Save Official Hospital Location to Firebase RTDB
  const handleConfirmSaveLocation = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const locPayload: HospitalLocation = {
        hospitalName: formData.hospitalName,
        address: formData.address,
        city: formData.city || 'Hyderabad',
        state: formData.state || 'Telangana',
        postalCode: formData.pinCode,
        pinCode: formData.pinCode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        locationVerified: modalPendingVerification,
        landmark: landmarkNote,
        hospitalId: officialLocation?.hospitalId || registeredProfile?.hospitalId || hospitalProfile.hospitalId || 'hosp-wewoo-01',
        updatedAt: new Date().toISOString(),
      };

      // 1. Centralized update in Firebase RTDB:
      // Writes to /hospitals/{hospitalId}/location AND /hospitals/{hospitalId}/profile
      await updateHospitalLocation(locPayload);

      // 2. Also update full hospital details record
      await updateHospitalDetails({
        ...formData,
        city: formData.city || 'Hyderabad',
        state: formData.state || 'Telangana',
      });

      setIsLocationVerified(modalPendingVerification);
      setShowConfirmModal(false);
      const latStr = locPayload.latitude != null ? locPayload.latitude.toFixed(5) : '17.42250';
      const lngStr = locPayload.longitude != null ? locPayload.longitude.toFixed(5) : '78.44350';
      setSaveSuccessMessage(
        `Centralized Hospital Location saved & verified in Firebase! WEWOO Driver App and Patient App have been synchronized to: ${latStr}°N, ${lngStr}°E (${locPayload.address}, ${locPayload.city}).`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save hospital location to Firebase Realtime Database.');
    } finally {
      setIsSaving(false);
    }
  };

  // Full form submission (Saves all details)
  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (!formData.hospitalName.trim()) {
      setErrorMessage('Please provide the official hospital name.');
      return;
    }
    if (!formData.registrationNumber.trim()) {
      setErrorMessage('Please enter the hospital license or registration number.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please enter a valid official hospital contact email address.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage('Please enter an official emergency contact phone number.');
      return;
    }
    if (!formData.address.trim() || !formData.city.trim() || !formData.state.trim()) {
      setErrorMessage('Please provide the complete street address, city, and state.');
      return;
    }

    setIsSaving(true);

    try {
      // Save location
      await updateHospitalLocation({
        hospitalName: formData.hospitalName,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postalCode: formData.pinCode,
        pinCode: formData.pinCode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        locationVerified: isLocationVerified,
        landmark: landmarkNote,
      });

      // Save details
      await updateHospitalDetails(formData);

      setSaveSuccess(true);
      setSaveSuccessMessage('Hospital infrastructure and official location successfully synchronized in Firebase RTDB!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to save hospital details. Please check connection and permissions.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shadow-md shadow-rose-950/40">
              <Building2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Hospital Details & Infrastructure
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Centralized hospital registration & verified official location in Hyderabad, Telangana
              </p>
            </div>
          </div>
        </div>

        {/* Live Firebase Sync Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
            <span>Firebase RTDB Synchronized</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${
              isLocationVerified
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isLocationVerified ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>LOCATION VERIFIED</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>UNVERIFIED (NAV DISABLED)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alert Notices */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold">Official Hospital Location Synchronized</p>
            <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">{saveSuccessMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold">Save Error</p>
            <p className="text-rose-700 dark:text-rose-400 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Details Form */}
      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* ================================================================= */}
        {/* SECTION 1: DEDICATED CENTRALIZED HOSPITAL LOCATION (HYDERABAD) */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-900/60 rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg shadow-rose-950/5 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>1 · Official Hospital Location Management (Hyderabad, Telangana)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Shared single source of truth stored in Firebase Realtime Database (/hospitals/{'{'}id{'}'}/location). Consumed by Driver App and Patient App.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenLocationConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-950/30 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Location</span>
              </button>
              <button
                type="button"
                onClick={handleOpenLocationConfirm}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-xs rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Update Location</span>
              </button>
            </div>
          </div>

          {/* Location Verification Status Box */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isLocationVerified
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isLocationVerified ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                <p className="font-bold">
                  {isLocationVerified
                    ? 'Official Location is Verified & Authoritative'
                    : 'Location Unverified — Driver App Navigation Disabled'}
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {isLocationVerified
                    ? 'Ambulance drivers and emergency patients can route directly to these confirmed coordinates in Hyderabad.'
                    : 'Drivers will receive a security warning and navigation will be blocked until the administrator verifies the location.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                const newStatus = !isLocationVerified;
                setIsLocationVerified(newStatus);
                await verifyHospitalLocationStatus(newStatus);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer border transition-all ${
                isLocationVerified
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                  : 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
              }`}
            >
              {isLocationVerified ? 'Mark as Unverified' : 'Verify Location Now'}
            </button>
          </div>

          {/* Map Search Bar Bounded to Hyderabad */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Search className="w-4 h-4 text-rose-500" />
                <span>Search Hyderabad Landmarks or Addresses (Nominatim Bounded)</span>
              </span>
              <button
                type="button"
                onClick={handleRecenterHyderabad}
                className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Recenter on Banjara Hills</span>
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleMapSearch(e);
                    }
                  }}
                  placeholder="e.g., CARE Hospital Banjara Hills, Gachibowli, Cyber Towers, Charminar..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="button"
                onClick={handleMapSearch}
                disabled={isSearching}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {isSearching ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Search</span>
                )}
              </button>
            </div>

            {searchError && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>{searchError}</span>
              </p>
            )}

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 shadow-xl space-y-1 animate-in fade-in">
                <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                  Select matching location in Hyderabad:
                </p>
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs text-slate-800 dark:text-slate-200 cursor-pointer flex items-start gap-2 border border-transparent hover:border-rose-200 dark:hover:border-rose-900"
                  >
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">{item.display_name.split(',')[0]}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{item.display_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Hyderabad Medical Hub Presets */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              <span>Quick Hyderabad Hospital Hub Presets:</span>
              <span className="text-[10px] text-rose-500 font-mono">Telangana Emergency Grid</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {HYDERABAD_LANDMARK_PRESETS.map((preset) => {
                const isSelected =
                  Math.abs(formData.latitude - preset.lat) < 0.001 &&
                  Math.abs(formData.longitude - preset.lng) < 0.001;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2 rounded-lg text-left text-xs cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-400 text-rose-900 dark:text-rose-200 font-semibold'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <p className="font-medium truncate text-[11px]">{preset.name.split('(')[0]}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {preset.lat.toFixed(4)}, {preset.lng.toFixed(4)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Leaflet Interactive Map View */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-rose-500" />
                <span>Interactive Hyderabad Emergency Map (Click map or drag pin to position)</span>
              </span>
              <span className="font-mono text-rose-600 dark:text-rose-400 font-bold text-xs bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                {formData.latitude.toFixed(5)}°N, {formData.longitude.toFixed(5)}°E
              </span>
            </div>
            <div
              ref={mapContainerRef}
              className="w-full h-72 rounded-2xl border border-slate-300 dark:border-slate-800 overflow-hidden shadow-inner z-0"
            />
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Map automatically performs reverse-geocoding when marker is repositioned in Hyderabad.</span>
            </p>
          </div>

          {/* Detailed Location Address Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Official Hospital Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Official Hospital Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.hospitalName}
                onChange={(e) => handleChange('hospitalName', e.target.value)}
                placeholder="e.g. WEWOO Apex Emergency Hospital & Trauma Center"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            {/* Complete Address */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Complete Hospital Physical Street Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="e.g. Road No. 2, Banjara Hills"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Hyderabad"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            {/* State & PIN Code */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  State <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="Telangana"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  PIN Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.pinCode}
                  onChange={(e) => handleChange('pinCode', e.target.value)}
                  placeholder="500034"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
                />
              </div>
            </div>

            {/* GPS Latitude */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                GPS Latitude (°N) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.00001"
                required
                value={formData.latitude}
                onChange={(e) => handleChange('latitude', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-mono text-rose-600 dark:text-rose-400 font-bold focus:outline-hidden focus:border-rose-500"
              />
            </div>

            {/* GPS Longitude */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                GPS Longitude (°E) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.00001"
                required
                value={formData.longitude}
                onChange={(e) => handleChange('longitude', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-mono text-rose-600 dark:text-rose-400 font-bold focus:outline-hidden focus:border-rose-500"
              />
            </div>

            {/* Landmark / Entrance Note */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Emergency Trauma Bay Entrance / Landmark
              </label>
              <input
                type="text"
                value={landmarkNote}
                onChange={(e) => setLandmarkNote(e.target.value)}
                placeholder="e.g. Near Care Hospital & Taj Krishna Circle, Emergency Ramp Gate 2"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SECTION 2: ADMINISTRATIVE CONTACT & CREDENTIALS */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs transition-colors">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Building2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              2 · Hospital Licensing & Emergency Contacts
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Registration Number */}
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Telangana Health Dept License / Reg No. <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.registrationNumber}
                onChange={(e) => handleChange('registrationNumber', e.target.value)}
                placeholder="TEL-HYD-MED-2024-8891"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            {/* Hospital Classification */}
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Facility Classification <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.hospitalType}
                onChange={(e) => handleChange('hospitalType', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:border-rose-500"
              >
                <option value="Government">Government / Public Civil Hospital</option>
                <option value="Private">Private Multi-Speciality Trauma Center</option>
                <option value="Trust">Charitable / Trust Foundation Hospital</option>
                <option value="Military">Military / Cantonment Hospital</option>
              </select>
            </div>

            {/* Official Email */}
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Official Emergency Operations Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="emergency@hospital.org"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Emergency Hotline Telephone */}
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Emergency Hotline Telephone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+91 40 4966 8000"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SECTION 3: HOSPITAL SPECIALITIES */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                3 · Clinical Specialities
              </h2>
            </div>
            <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
              {formData.specialities.length + (otherSelected && formData.customSpeciality ? 1 : 0)} Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {STANDARD_SPECIALITIES.map((spec) => {
              const isChecked = formData.specialities.includes(spec);
              return (
                <label
                  key={spec}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-cyan-50 dark:bg-cyan-950/70 border-cyan-400 dark:border-cyan-500/70 text-cyan-900 dark:text-cyan-200 font-medium'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSpeciality(spec)}
                    className="w-4 h-4 rounded text-cyan-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <span className="text-[11px] leading-tight">{spec}</span>
                </label>
              );
            })}

            {/* Other Checkbox */}
            <label
              className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-colors ${
                otherSelected
                  ? 'bg-cyan-50 dark:bg-cyan-950/70 border-cyan-400 dark:border-cyan-500/70 text-cyan-900 dark:text-cyan-200 font-medium'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={otherSelected}
                onChange={() => setOtherSelected(!otherSelected)}
                className="w-4 h-4 rounded text-cyan-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 cursor-pointer"
              />
              <span className="text-[11px] leading-tight">Other Speciality</span>
            </label>
          </div>

          {otherSelected && (
            <div className="pt-2 animate-in fade-in">
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Specify Additional Speciality Name
              </label>
              <input
                type="text"
                value={formData.customSpeciality || ''}
                onChange={(e) => handleChange('customSpeciality', e.target.value)}
                placeholder="e.g. Hyperbaric Medicine, Nuclear Medicine, Clinical Toxicology"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-hidden focus:border-cyan-500"
              />
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* SECTION 4: EMERGENCY CAPABILITIES */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                4 · Acute Emergency Capabilities
              </h2>
            </div>
            <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
              {formData.emergencyCapabilities.length} Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {STANDARD_EMERGENCY_CAPABILITIES.map((cap) => {
              const isChecked = formData.emergencyCapabilities.includes(cap);
              return (
                <label
                  key={cap}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 dark:border-amber-500/60 text-amber-900 dark:text-amber-200'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCapability(cap)}
                      className="w-4 h-4 rounded text-amber-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                    <span className="font-semibold text-xs">{cap}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                      isChecked
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isChecked ? 'Active' : 'Unavailable'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500">
            Official location and clinical parameters are synchronized across the WEWOO Firebase network.
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-rose-950/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Synchronizing to Firebase Realtime Database...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save All Details to Firebase</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* ================================================================= */}
      {/* CONFIRMATION MODAL BEFORE SAVING LOCATION */}
      {/* ================================================================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Compass className="w-5 h-5" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Confirm Official Hospital Location
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Please review and confirm the intended hospital GPS coordinates. This action writes directly to the centralized Firebase Realtime Database record, which is instantly reflected in both the WEWOO Driver App and Patient App.
            </p>

            {/* Coordinates Summary Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-500">Hospital:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formData.hospitalName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-500">Address:</span>
                <span className="font-semibold text-slate-900 dark:text-white text-right">{formData.address}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-500">City / State:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formData.city}, {formData.state} {formData.pinCode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-500">GPS Coordinates:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formData.latitude.toFixed(5)}°N, {formData.longitude.toFixed(5)}°E
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Firebase RTDB Node:</span>
                <span className="font-mono text-[10px] text-slate-400">/hospitals/{officialLocation?.hospitalId || 'hosp-wewoo-01'}/location</span>
              </div>
            </div>

            {/* Verification Checkbox */}
            <label className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={modalPendingVerification}
                onChange={(e) => setModalPendingVerification(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 mt-0.5 cursor-pointer"
              />
              <div className="text-xs">
                <p className="font-bold text-emerald-900 dark:text-emerald-300">
                  Authorize & Mark as Verified for WEWOO Drivers
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  When checked, ambulance navigation is unlocked and traffic signal priority routes will target these exact coordinates.
                </p>
              </div>
            </label>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveLocation}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving to Firebase...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Publish to Network</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
