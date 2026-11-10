import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  AppSettings,
  ConnectionStatus,
  EmergencyPriority,
  EmergencyRecord,
  EmergencyType,
  HospitalAcceptanceStatus,
  HospitalCapacity,
  HospitalProfile,
  HospitalReadiness,
  HospitalRegistrationInput,
  AdminAccountRegistrationInput,
  HospitalDetailsInput,
  HospitalResources,
  HospitalVerificationStatus,
  RegisteredHospitalProfile,
  StaffUser,
  PreparationChecklistItem,
  HospitalLocation,
} from '../types/emergency';
import {
  DEMO_STAFF_USERS,
  INITIAL_DEMO_EMERGENCIES,
  INITIAL_DEMO_HISTORY,
  INITIAL_HOSPITAL_CAPACITY,
  INITIAL_HOSPITAL_PROFILE,
  INITIAL_HOSPITAL_RESOURCES,
  INITIAL_READINESS_WEIGHTS,
  getDefaultChecklistForType,
} from '../data/mockData';
import { calculateHospitalReadiness } from '../services/readiness';
import { soundAlertService } from '../services/audio';
import { subscribeFirebaseConnection, auth, database, ref, get } from '../services/firebase';
import {
  loginHospital,
  registerHospitalAccount,
  sendHospitalPasswordReset,
  logoutHospital,
  subscribeAuthState,
} from '../services/firebaseAuth';
import {
  getHospitalProfile,
  saveHospitalProfile,
  saveHospitalOfficialLocation,
  getHospitalOfficialLocation,
  listenHospitalOfficialLocation,
  verifyHospitalOfficialLocation,
  listenHospitalProfile,
  listenAllHospitals,
  updateHospitalResources,
  listenHospitalResources,
  updateHospitalSpecialities,
  updateHospitalCapabilities,
  listenActiveEmergencies,
  updateEmergencyInFirebase,
  respondEmergencyInFirebase,
  createEmergencyInFirebase,
  listenAmbulanceLocations,
  updatePreparationTaskInFirebase,
  listenEmergencyHistory,
  saveEmergencyHistoryToFirebase,
  LiveTelemetry,
} from '../services/firebaseDb';

export interface NotificationItem {
  id: string;
  time: string;
  title: string;
  details?: string;
  priority: EmergencyPriority | 'info';
  read: boolean;
  emergencyId?: string;
}

export type NavigationTab =
  | 'login'
  | 'register'
  | 'command'
  | 'emergencies'
  | 'tracking'
  | 'resources'
  | 'details'
  | 'specialities'
  | 'preparation'
  | 'history'
  | 'settings'
  | 'driver-app'
  | 'patient-app';

interface HospitalContextType {
  currentUser: StaffUser | null;
  isAuthenticated: boolean;
  isBackendConnected: boolean;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  isDemoMode: boolean;
  hospitalProfile: HospitalProfile;
  registeredProfile: RegisteredHospitalProfile | null;
  officialLocation: HospitalLocation | null;
  allRegisteredHospitals: RegisteredHospitalProfile[];
  verificationStatus: HospitalVerificationStatus;
  incompleteProfile: RegisteredHospitalProfile | null;
  capacity: HospitalCapacity;
  resources: HospitalResources | null;
  readiness: HospitalReadiness | null;
  emergencies: EmergencyRecord[];
  history: EmergencyRecord[];
  selectedEmergencyId: string | null;
  selectedEmergency: EmergencyRecord | null;
  activeTab: NavigationTab;
  settings: AppSettings;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  theme: 'dark' | 'light';
  login: (email: string, pass: string, demoUserIndex?: number) => Promise<void>;
  registerAccount: (data: AdminAccountRegistrationInput) => Promise<StaffUser>;
  registerHospital: (data: HospitalRegistrationInput) => Promise<RegisteredHospitalProfile>;
  updateHospitalDetails: (data: HospitalDetailsInput) => Promise<RegisteredHospitalProfile>;
  updateHospitalLocation: (locationData: Partial<HospitalLocation>) => Promise<HospitalLocation>;
  verifyHospitalLocationStatus: (verified: boolean) => Promise<void>;
  retryProfileSave: (profile: RegisteredHospitalProfile) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateSpecialitiesAndCapabilities: (specialities: string[], capabilities: string[]) => Promise<void>;
  verifyCurrentHospital: (status: HospitalVerificationStatus) => Promise<void>;
  reconnectBackend: () => Promise<void>;
  logout: () => Promise<void>;
  updateResources: (updates: Partial<HospitalResources>) => Promise<void>;
  seedInitialHospitalResources: () => Promise<void>;
  updateEmergencyStatus: (
    emergencyId: string,
    status: HospitalAcceptanceStatus,
    details?: string
  ) => Promise<void>;
  declineEmergency: (emergencyId: string, reason: string) => Promise<void>;
  updateChecklistTask: (
    emergencyId: string,
    taskId: string,
    updates: Partial<PreparationChecklistItem>
  ) => Promise<void>;
  toggleChecklistItem: (
    emergencyId: string,
    itemId: string,
    completed: boolean
  ) => Promise<void>;
  markEmergencyReady: (emergencyId: string) => Promise<void>;
  completeEmergencyHandover: (emergencyId: string) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  toggleDemoMode: (enabled: boolean) => void;
  simulateNewEmergency: (type?: EmergencyType, priority?: EmergencyPriority) => void;
  resetDemoData: () => void;
  setSelectedEmergencyId: (id: string | null) => void;
  setActiveTab: (tab: NavigationTab) => void;
  markNotificationsRead: () => void;
  toggleSound: () => void;
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

export const HospitalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('wewoo_theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('wewoo_theme', theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Mode: default to Live Backend Mode (false)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('wewoo_demo_mode');
    return saved === 'true';
  });

  // Current authenticated staff user
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    const saved = localStorage.getItem('wewoo_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return DEMO_STAFF_USERS[0];
  });

  const [registeredProfile, setRegisteredProfile] = useState<RegisteredHospitalProfile | null>(() => {
    const saved = localStorage.getItem('wewoo_registered_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [verificationStatus, setVerificationStatus] = useState<HospitalVerificationStatus>(() => {
    const saved = localStorage.getItem('wewoo_verification_status');
    if (saved === 'pendingVerification' || saved === 'verified' || saved === 'rejected') {
      return saved as HospitalVerificationStatus;
    }
    return 'verified';
  });

  const [allRegisteredHospitals, setAllRegisteredHospitals] = useState<RegisteredHospitalProfile[]>([]);
  const [incompleteProfile, setIncompleteProfile] = useState<RegisteredHospitalProfile | null>(null);

  // Centralized Official Hospital Location in Hyderabad, Telangana
  const [officialLocation, setOfficialLocation] = useState<HospitalLocation | null>(() => {
    const saved = localStorage.getItem('wewoo_official_location');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      address: 'Road No. 2, Banjara Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500034',
      pinCode: '500034',
      latitude: 17.4225,
      longitude: 78.4435,
      locationVerified: true,
      updatedAt: new Date().toISOString(),
      hospitalName: 'WEWOO Apex Emergency Hospital & Trauma Center',
      hospitalId: 'hosp-wewoo-01',
      landmark: 'Near Care Hospital & Taj Krishna Circle',
    };
  });

  const [activeTab, setActiveTab] = useState<NavigationTab>('command');
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string | null>(null);

  // Hospital Profile definition
  const [hospitalProfile, setHospitalProfile] = useState<HospitalProfile>(() => {
    const envName = import.meta.env.VITE_DEFAULT_HOSPITAL_NAME;
    const envId = import.meta.env.VITE_DEFAULT_HOSPITAL_ID || 'HOSP-001';
    return {
      ...INITIAL_HOSPITAL_PROFILE,
      name: envName || 'WEWOO Apex Emergency Hospital & Trauma Center',
      hospitalId: envId,
    };
  });

  const [capacity, setCapacity] = useState<HospitalCapacity>(INITIAL_HOSPITAL_CAPACITY);

  // Live operational resources (PostgreSQL backed with auto-balancing)
  const [resources, setResources] = useState<HospitalResources | null>(() => {
    const defaultId = hospitalProfile.hospitalId || 'HOSP-001';
    const cached = localStorage.getItem(`wewoo_resources_${defaultId}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    return isDemoMode ? INITIAL_HOSPITAL_RESOURCES : null;
  });

  const [emergencies, setEmergencies] = useState<EmergencyRecord[]>(() => {
    return isDemoMode ? INITIAL_DEMO_EMERGENCIES : [];
  });

  const [history, setHistory] = useState<EmergencyRecord[]>(() => {
    return isDemoMode ? INITIAL_DEMO_HISTORY : [];
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Real-time backend connection status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('Connecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // App Settings
  const [settings, setSettings] = useState<AppSettings>(() => ({
    hospitalProfile,
    capacity: INITIAL_HOSPITAL_CAPACITY,
    readinessWeights: INITIAL_READINESS_WEIGHTS,
    mapTileUrl: import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    mapAttribution: import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors',
    osrmRoutingUrl: import.meta.env.VITE_OSRM_ROUTING_URL || 'https://router.project-osrm.org/route/v1/driving',
    soundAlertsEnabled: true,
    soundVolume: 0.6,
    autoRefreshIntervalSeconds: 3,
    isDemoMode,
    darkMode: theme === 'dark',
  }));

  useEffect(() => {
    soundAlertService.setEnabled(settings.soundAlertsEnabled);
    soundAlertService.setVolume(settings.soundVolume);
  }, [settings.soundAlertsEnabled, settings.soundVolume]);

  const readiness = useMemo(() => {
    if (!resources) return null;
    return calculateHospitalReadiness(resources, capacity, settings.readinessWeights);
  }, [resources, capacity, settings.readinessWeights]);

  const selectedEmergency = useMemo(() => {
    if (!selectedEmergencyId) return emergencies[0] || null;
    return emergencies.find((e) => e.emergencyId === selectedEmergencyId) || emergencies[0] || null;
  }, [emergencies, selectedEmergencyId]);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // --------------------------------------------------------------------------
  // PRIMARY FIREBASE BACKEND & REAL-TIME LISTENERS
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (isDemoMode) {
      setConnectionStatus('FIREBASE CONNECTED');
      setConnectionError(null);
      return;
    }

    const targetHospitalId =
      registeredProfile?.hospitalId ||
      currentUser?.hospitalId ||
      hospitalProfile.hospitalId ||
      'hosp-wewoo-01';

    let isMounted = true;

    // 1. Genuine Firebase Connection Status via .info/connected
    const unsubConnection = subscribeFirebaseConnection((status, err) => {
      if (!isMounted) return;
      if (status === 'CONNECTED') {
        setConnectionStatus('FIREBASE CONNECTED');
        setConnectionError(null);
      } else if (status === 'RECONNECTING') {
        setConnectionStatus('FIREBASE RECONNECTING');
        setConnectionError(err || 'Connection to Firebase lost. Attempting to restore...');
      } else if (status === 'PERMISSION_DENIED') {
        setConnectionStatus('DATABASE PERMISSION DENIED');
        setConnectionError(err || 'Firebase Database Permission Denied. Check security rules.');
      } else {
        setConnectionStatus('FIREBASE DISCONNECTED');
        setConnectionError(err || 'Disconnected from Firebase Realtime Database.');
      }
    });

    // 2. Firebase Auth State Listener
    const unsubAuth = subscribeAuthState((staffUser) => {
      if (!isMounted) return;
      if (staffUser) {
        setCurrentUser(staffUser);
      }
    });

    // 3. Listen to Hospital Profile
    const unsubProfile = listenHospitalProfile(targetHospitalId, (remoteProfile) => {
      if (!isMounted || !remoteProfile) return;
      setHospitalProfile((prev) => ({
        ...prev,
        name: remoteProfile.hospitalName || prev.name,
        hospitalId: remoteProfile.hospitalId || prev.hospitalId,
        address: remoteProfile.address || prev.address,
        phone: remoteProfile.phone || prev.phone,
        emergencyHotline: remoteProfile.phone || prev.emergencyHotline,
        location: {
          latitude: remoteProfile.latitude ?? prev.location.latitude,
          longitude: remoteProfile.longitude ?? prev.location.longitude,
        },
      }));
      setRegisteredProfile((prev) => ({
        ...(prev || remoteProfile),
        ...remoteProfile,
      }));
    });

    // 3.B Listen to Centralized Hospital Location in Hyderabad
    const unsubLocation = listenHospitalOfficialLocation(targetHospitalId, (remoteLoc) => {
      if (!isMounted || !remoteLoc) return;
      setOfficialLocation(remoteLoc);
      localStorage.setItem('wewoo_official_location', JSON.stringify(remoteLoc));
      if (remoteLoc.latitude !== null && remoteLoc.longitude !== null) {
        setHospitalProfile((prev) => ({
          ...prev,
          location: { latitude: remoteLoc.latitude!, longitude: remoteLoc.longitude! },
          address: remoteLoc.address || prev.address,
        }));
      }
    });

    // 4. Listen to Hospital Resources with auto-balancing
    const unsubResources = listenHospitalResources(targetHospitalId, (remoteRes) => {
      if (!isMounted || !remoteRes) return;
      setResources(remoteRes);
      localStorage.setItem(`wewoo_resources_${targetHospitalId}`, JSON.stringify(remoteRes));
    });

    // 5. Listen to Active Emergency Requests
    const unsubEmergencies = listenActiveEmergencies(targetHospitalId, (remoteEmergencies) => {
      if (!isMounted) return;

      setEmergencies((prev) => {
        // Check for newly added emergencies to trigger sound alerts & notifications
        remoteEmergencies.forEach((newEmg) => {
          const existed = prev.some((e) => e.emergencyId === newEmg.emergencyId);
          if (!existed) {
            soundAlertService.playWarningAlert();
            setNotifications((nPrev) => [
              {
                id: `notif-${newEmg.emergencyId}-${Date.now()}`,
                time: 'Just now',
                title: `🚨 ${newEmg.priority} Emergency: ${newEmg.ambulanceId}`,
                details: `${newEmg.vitals?.chiefComplaint || 'Incoming emergency'} (ETA: ${newEmg.etaMinutes || 12} mins)`,
                priority: newEmg.priority,
                read: false,
                emergencyId: newEmg.emergencyId,
              },
              ...nPrev,
            ]);
          }
        });
        return remoteEmergencies;
      });
    });

    // 6. Listen to Live Ambulance GPS Locations
    const unsubLocations = listenAmbulanceLocations((telemetryMap) => {
      if (!isMounted || !telemetryMap) return;

      setEmergencies((prev) =>
        prev.map((e) => {
          const telem = telemetryMap[e.ambulanceId];
          if (telem) {
            return {
              ...e,
              currentLocation: {
                latitude: telem.latitude ?? e.currentLocation?.latitude ?? 17.4225,
                longitude: telem.longitude ?? e.currentLocation?.longitude ?? 78.4435,
              },
              etaMinutes: telem.etaMinutes !== undefined ? telem.etaMinutes : e.etaMinutes,
              remainingDistanceKm:
                telem.distanceKm !== undefined ? telem.distanceKm : e.remainingDistanceKm,
              lastUpdated: telem.timestamp || new Date().toISOString(),
            };
          }
          return e;
        })
      );
    });

    // 7. Listen to Emergency History
    const unsubHistory = listenEmergencyHistory(targetHospitalId, (remoteHistory) => {
      if (!isMounted) return;
      setHistory(remoteHistory);
    });

    // 8. Listen to All Registered Hospitals across WEWOO Network
    const unsubAllHospitals = listenAllHospitals((allHosp) => {
      if (!isMounted) return;
      setAllRegisteredHospitals(allHosp);
    });

    return () => {
      isMounted = false;
      unsubConnection();
      unsubAuth();
      unsubProfile();
      unsubLocation();
      unsubResources();
      unsubEmergencies();
      unsubLocations();
      unsubHistory();
      unsubAllHospitals();
    };
  }, [isDemoMode, hospitalProfile.hospitalId, registeredProfile?.hospitalId, currentUser?.hospitalId]);

  // --------------------------------------------------------------------------
  // AUTHENTICATION METHODS (FIREBASE AUTHENTICATION)
  // --------------------------------------------------------------------------
  const login = async (email: string, pass: string, demoUserIndex?: number) => {
    if (demoUserIndex !== undefined) {
      const demoUser = DEMO_STAFF_USERS[demoUserIndex] || DEMO_STAFF_USERS[0];
      setCurrentUser(demoUser);
      localStorage.setItem('wewoo_user', JSON.stringify(demoUser));
      setActiveTab('command');
      return;
    }

    try {
      const staffUser = await loginHospital(email, pass);
      setCurrentUser(staffUser);
      setConnectionStatus('FIREBASE CONNECTED');
      setConnectionError(null);
      setActiveTab('command');
    } catch (err: any) {
      console.error('[WEWOO Firebase Login Error]', err);
      let userFriendlyMessage = err.message || 'Firebase authentication failed.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        userFriendlyMessage = 'Invalid email or password. Please verify your credentials.';
      } else if (err.code === 'auth/too-many-requests') {
        userFriendlyMessage = 'Access temporarily disabled due to too many failed login attempts. Try again later.';
      }
      throw new Error(userFriendlyMessage);
    }
  };

  const registerAccount = async (data: AdminAccountRegistrationInput): Promise<StaffUser> => {
    try {
      const hospId = registeredProfile?.hospitalId || hospitalProfile.hospitalId || 'hosp-wewoo-01';
      const staff = await registerHospitalAccount(
        data.email,
        data.password,
        data.administratorName,
        hospId,
        'Chief Medical Officer'
      );
      setCurrentUser(staff);
      return staff;
    } catch (err: any) {
      console.error('[WEWOO Firebase Register Error]', err);
      let msg = err.message || 'Registration failed.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists in Firebase.';
      }
      throw new Error(msg);
    }
  };

  const registerHospital = async (data: HospitalRegistrationInput): Promise<RegisteredHospitalProfile> => {
    const hospId = `hosp-${data.hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15)}-${Date.now().toString().slice(-4)}`;

    const regResult = await registerAccount({
      administratorName: data.administratorName,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
    });

    const now = new Date().toISOString();
    const newProfile: RegisteredHospitalProfile = {
      hospitalId: hospId,
      hospitalName: data.hospitalName,
      registrationNumber: data.registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
      hospitalType: data.hospitalType,
      email: data.email,
      phone: data.phone,
      administratorName: data.administratorName,
      address: data.address,
      city: data.city,
      state: data.state,
      pinCode: data.pinCode,
      latitude: Number(data.latitude) || 12.9345,
      longitude: Number(data.longitude) || 77.6101,
      specialities: data.specialities,
      emergencyCapabilities: data.emergencyCapabilities,
      verificationStatus: 'verified',
      accountStatus: 'active',
      isProfileCompleted: true,
      createdAt: now,
      updatedAt: now,
    };

    // Save profile to Firebase Realtime Database
    await saveHospitalProfile(hospId, newProfile);

    // Seed initial operational resources in Firebase RTDB
    await updateHospitalResources(hospId, INITIAL_HOSPITAL_RESOURCES);

    // Save specialities and capabilities
    await updateHospitalSpecialities(hospId, data.specialities);
    await updateHospitalCapabilities(hospId, data.emergencyCapabilities);

    setRegisteredProfile(newProfile);
    localStorage.setItem('wewoo_registered_profile', JSON.stringify(newProfile));

    setHospitalProfile((prev) => ({
      ...prev,
      hospitalId: hospId,
      name: newProfile.hospitalName,
      location: { latitude: newProfile.latitude, longitude: newProfile.longitude },
      address: newProfile.address,
      phone: newProfile.phone,
      emergencyHotline: newProfile.phone,
    }));

    return newProfile;
  };

  const updateHospitalDetails = async (data: HospitalDetailsInput): Promise<RegisteredHospitalProfile> => {
    const hospId = registeredProfile?.hospitalId || currentUser?.hospitalId || hospitalProfile.hospitalId || 'hosp-wewoo-01';
    const now = new Date().toISOString();

    const updatedProfile: RegisteredHospitalProfile = {
      ...(registeredProfile || {}),
      hospitalId: hospId,
      hospitalName: data.hospitalName,
      registrationNumber: data.registrationNumber,
      hospitalType: data.hospitalType,
      email: data.email,
      phone: data.phone,
      administratorName: registeredProfile?.administratorName || currentUser?.displayName || 'Administrator',
      address: data.address,
      city: data.city,
      state: data.state,
      pinCode: data.pinCode,
      latitude: Number(data.latitude) || 12.9345,
      longitude: Number(data.longitude) || 77.6101,
      specialities: data.specialities,
      emergencyCapabilities: data.emergencyCapabilities,
      verificationStatus,
      accountStatus: 'active',
      isProfileCompleted: true,
      updatedAt: now,
      createdAt: registeredProfile?.createdAt || now,
    };

    // Persist directly to Firebase Realtime Database
    await saveHospitalProfile(hospId, updatedProfile);

    setRegisteredProfile(updatedProfile);
    localStorage.setItem('wewoo_registered_profile', JSON.stringify(updatedProfile));

    setHospitalProfile((prev) => ({
      ...prev,
      hospitalId: hospId,
      name: updatedProfile.hospitalName,
      location: { latitude: updatedProfile.latitude, longitude: updatedProfile.longitude },
      address: updatedProfile.address,
      phone: updatedProfile.phone,
      emergencyHotline: updatedProfile.phone,
    }));

    return updatedProfile;
  };

  const updateHospitalLocation = async (locationData: Partial<HospitalLocation>): Promise<HospitalLocation> => {
    const hospId =
      locationData.hospitalId ||
      officialLocation?.hospitalId ||
      registeredProfile?.hospitalId ||
      currentUser?.hospitalId ||
      hospitalProfile.hospitalId ||
      'hosp-wewoo-01';

    const merged: HospitalLocation = {
      address: locationData.address ?? officialLocation?.address ?? 'Road No. 2, Banjara Hills',
      city: locationData.city ?? officialLocation?.city ?? 'Hyderabad',
      state: locationData.state ?? officialLocation?.state ?? 'Telangana',
      postalCode: locationData.postalCode ?? locationData.pinCode ?? officialLocation?.postalCode ?? '500034',
      pinCode: locationData.pinCode ?? locationData.postalCode ?? officialLocation?.pinCode ?? '500034',
      latitude: locationData.latitude ?? officialLocation?.latitude ?? 17.4225,
      longitude: locationData.longitude ?? officialLocation?.longitude ?? 78.4435,
      locationVerified: locationData.locationVerified !== undefined ? locationData.locationVerified : (officialLocation?.locationVerified ?? true),
      updatedAt: new Date().toISOString(),
      hospitalName: locationData.hospitalName ?? officialLocation?.hospitalName ?? hospitalProfile.name,
      hospitalId: hospId,
      landmark: locationData.landmark ?? officialLocation?.landmark ?? 'Near Care Hospital & Taj Krishna Circle',
    };

    // 1. Write to Firebase Realtime Database
    await saveHospitalOfficialLocation(hospId, merged);

    // 2. Update local state
    setOfficialLocation(merged);
    localStorage.setItem('wewoo_official_location', JSON.stringify(merged));

    // 3. Keep registeredProfile synchronized
    setRegisteredProfile((prev) => {
      if (!prev) return prev;
      const updated: RegisteredHospitalProfile = {
        ...prev,
        address: merged.address,
        city: merged.city,
        state: merged.state,
        pinCode: merged.pinCode || merged.postalCode,
        latitude: merged.latitude ?? prev.latitude ?? 17.4225,
        longitude: merged.longitude ?? prev.longitude ?? 78.4435,
        locationVerified: merged.locationVerified,
        officialLocation: merged,
        updatedAt: merged.updatedAt,
      };
      localStorage.setItem('wewoo_registered_profile', JSON.stringify(updated));
      return updated;
    });

    // 4. Keep hospitalProfile in sync
    setHospitalProfile((prev) => ({
      ...prev,
      name: merged.hospitalName || prev.name,
      address: `${merged.address}, ${merged.city}, ${merged.state} ${merged.pinCode || merged.postalCode}`,
      location: {
        latitude: merged.latitude ?? prev.location.latitude ?? 17.4225,
        longitude: merged.longitude ?? prev.location.longitude ?? 78.4435,
      },
    }));

    return merged;
  };

  const verifyHospitalLocationStatus = async (verified: boolean): Promise<void> => {
    const hospId =
      officialLocation?.hospitalId ||
      registeredProfile?.hospitalId ||
      currentUser?.hospitalId ||
      hospitalProfile.hospitalId ||
      'hosp-wewoo-01';

    await verifyHospitalOfficialLocation(hospId, verified);

    if (officialLocation) {
      const updated: HospitalLocation = {
        ...officialLocation,
        locationVerified: verified,
        updatedAt: new Date().toISOString(),
      };
      setOfficialLocation(updated);
      localStorage.setItem('wewoo_official_location', JSON.stringify(updated));
    }
  };

  const retryProfileSave = async (profile: RegisteredHospitalProfile) => {
    await updateHospitalDetails({
      hospitalName: profile.hospitalName,
      registrationNumber: profile.registrationNumber,
      hospitalType: profile.hospitalType,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      pinCode: profile.pinCode,
      latitude: profile.latitude,
      longitude: profile.longitude,
      specialities: profile.specialities,
      emergencyCapabilities: profile.emergencyCapabilities,
    });
    setIncompleteProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendHospitalPasswordReset(email);
    console.log('📧 [WEWOO Firebase Auth] Password reset email dispatched for:', email);
  };

  const updateSpecialitiesAndCapabilities = async (specialities: string[], capabilities: string[]) => {
    const hospId = registeredProfile?.hospitalId || hospitalProfile.hospitalId || 'hosp-wewoo-01';

    await updateHospitalSpecialities(hospId, specialities);
    await updateHospitalCapabilities(hospId, capabilities);

    if (registeredProfile) {
      const updated = {
        ...registeredProfile,
        specialities,
        emergencyCapabilities: capabilities,
        updatedAt: new Date().toISOString(),
      };
      setRegisteredProfile(updated);
      localStorage.setItem('wewoo_registered_profile', JSON.stringify(updated));
    }
  };

  const verifyCurrentHospital = async (status: HospitalVerificationStatus) => {
    setVerificationStatus(status);
    localStorage.setItem('wewoo_verification_status', status);
    const hospId = registeredProfile?.hospitalId || hospitalProfile.hospitalId;
    if (hospId) {
      saveHospitalProfile(hospId, { verificationStatus: status }).catch(() => null);
    }
  };

  const logout = async () => {
    await logoutHospital();
    setCurrentUser(null);
    setRegisteredProfile(null);
    localStorage.removeItem('wewoo_user');
    localStorage.removeItem('wewoo_registered_profile');
    setActiveTab('login');
  };

  // --------------------------------------------------------------------------
  // RESOURCE MANAGEMENT (FIREBASE REALTIME DATABASE + AUTOMATIC BALANCING)
  // --------------------------------------------------------------------------
  const updateResources = async (updates: Partial<HospitalResources>) => {
    const targetHospitalId =
      registeredProfile?.hospitalId ||
      currentUser?.hospitalId ||
      hospitalProfile.hospitalId ||
      'hosp-wewoo-01';

    // Persist to Firebase Realtime Database with automatic balancing:
    // totalBeds = availableBeds + occupiedBeds
    const balanced = await updateHospitalResources(targetHospitalId, updates, resources || undefined);

    setResources(balanced);
    localStorage.setItem(`wewoo_resources_${targetHospitalId}`, JSON.stringify(balanced));
  };

  const seedInitialHospitalResources = async () => {
    await updateResources({
      totalBeds: 100,
      availableBeds: 35,
      occupiedBeds: 65,
      totalICUBeds: 20,
      availableICUBeds: 6,
      occupiedICUBeds: 14,
      totalEmergencyDoctors: 10,
      availableEmergencyDoctors: 4,
      assignedEmergencyDoctors: 6,
      totalNurses: 30,
      availableNurses: 12,
      assignedNurses: 18,
      emergencyDepartmentStatus: 'Normal Operations',
      emergency24x7: true,
    });
  };

  // --------------------------------------------------------------------------
  // EMERGENCY ACTIONS (FIREBASE REALTIME DATABASE TO DRIVER APP & COMMAND CENTER)
  // --------------------------------------------------------------------------
  const updateEmergencyStatus = async (
    emergencyId: string,
    status: HospitalAcceptanceStatus,
    details?: string
  ) => {
    const time = new Date().toISOString();

    setEmergencies((prev) =>
      prev.map((e) =>
        e.emergencyId === emergencyId
          ? {
              ...e,
              hospitalAcceptanceStatus: status,
              lastUpdated: time,
              timeline: [
                ...(e.timeline || []),
                {
                  id: `ev-${Date.now()}`,
                  timestamp: time,
                  actor: 'Hospital',
                  title: `Status set to ${status}`,
                  details: details || `Hospital staff marked emergency as ${status}`,
                  statusChange: status,
                },
              ],
            }
          : e
      )
    );

    // Write to Firebase Realtime Database
    await updateEmergencyInFirebase(emergencyId, {
      hospitalAcceptanceStatus: status,
      lastUpdated: time,
    });

    if (status === 'Accepted') {
      soundAlertService.playWarningAlert();
      await respondEmergencyInFirebase(emergencyId, 'ACCEPT', {
        assignedDoctor: currentUser?.displayName,
        prepInstructions: details,
      });
    } else if (status === 'Ready for Arrival') {
      soundAlertService.playArrivalChime();
    }
  };

  const declineEmergency = async (emergencyId: string, reason: string) => {
    const time = new Date().toISOString();

    setEmergencies((prev) =>
      prev.map((e) =>
        e.emergencyId === emergencyId
          ? {
              ...e,
              hospitalAcceptanceStatus: 'Declined',
              declineReason: reason,
              lastUpdated: time,
            }
          : e
      )
    );

    await respondEmergencyInFirebase(emergencyId, 'REJECT', { rejectionReason: reason });
  };

  const updateChecklistTask = async (
    emergencyId: string,
    taskId: string,
    updates: Partial<PreparationChecklistItem>
  ) => {
    const targetHospitalId =
      registeredProfile?.hospitalId ||
      currentUser?.hospitalId ||
      hospitalProfile.hospitalId ||
      'hosp-wewoo-01';

    const time = new Date().toISOString();
    const isCompleted = updates.status === 'completed';

    let updatedChecklist: PreparationChecklistItem[] = [];

    setEmergencies((prev) =>
      prev.map((e) => {
        if (e.emergencyId === emergencyId) {
          const list = (e.preparationChecklist || []).map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  ...updates,
                  lastUpdated: time,
                  completedAt: isCompleted ? time : item.completedAt,
                  completedBy: isCompleted ? currentUser?.displayName || 'Clinical Staff' : item.completedBy,
                }
              : item
          );
          updatedChecklist = list;
          return { ...e, preparationChecklist: list, lastUpdated: time };
        }
        return e;
      })
    );

    // Write preparation task status to Firebase Realtime Database
    await updatePreparationTaskInFirebase(
      targetHospitalId,
      emergencyId,
      taskId,
      isCompleted,
      currentUser?.displayName
    );

    // Also update checklist array in emergencyRequests/{emergencyId}
    if (updatedChecklist.length > 0) {
      await updateEmergencyInFirebase(emergencyId, {
        preparationChecklist: updatedChecklist,
      });
    }
  };

  const toggleChecklistItem = async (emergencyId: string, itemId: string, completed: boolean) => {
    await updateChecklistTask(emergencyId, itemId, {
      status: completed ? 'completed' : 'pending',
    });
  };

  const markEmergencyReady = async (emergencyId: string) => {
    soundAlertService.playArrivalChime();

    setEmergencies((prev) =>
      prev.map((e) =>
        e.emergencyId === emergencyId
          ? {
              ...e,
              hospitalPreparationStatus: 'Ready for Arrival',
              hospitalAcceptanceStatus: 'Ready for Arrival',
              lastUpdated: new Date().toISOString(),
            }
          : e
      )
    );

    await updateEmergencyInFirebase(emergencyId, {
      hospitalPreparationStatus: 'Ready for Arrival',
      hospitalAcceptanceStatus: 'Ready for Arrival',
    });
  };

  const completeEmergencyHandover = async (emergencyId: string) => {
    const targetHospitalId =
      registeredProfile?.hospitalId ||
      currentUser?.hospitalId ||
      hospitalProfile.hospitalId ||
      'hosp-wewoo-01';

    const target = emergencies.find((e) => e.emergencyId === emergencyId);
    if (!target) return;

    const completedRecord: EmergencyRecord = {
      ...target,
      journeyStatus: 'Handover Completed',
      hospitalAcceptanceStatus: 'Completed',
      lastUpdated: new Date().toISOString(),
    };

    // Save to Firebase emergencyHistory/{hospitalId}/{emergencyId}
    await saveEmergencyHistoryToFirebase(targetHospitalId, completedRecord);

    // Update status in emergencyRequests/{emergencyId}
    await updateEmergencyInFirebase(emergencyId, {
      journeyStatus: 'Handover Completed',
      hospitalAcceptanceStatus: 'Completed',
    });

    setHistory((prev) => [completedRecord, ...prev]);
    setEmergencies((prev) => prev.filter((e) => e.emergencyId !== emergencyId));
    if (selectedEmergencyId === emergencyId) setSelectedEmergencyId(null);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const toggleDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    localStorage.setItem('wewoo_demo_mode', String(enabled));
  };

  const simulateNewEmergency = (type?: EmergencyType, priority?: EmergencyPriority) => {
    const newId = `EMG-SIM-${Date.now().toString().slice(-4)}`;
    const sim: EmergencyRecord = {
      emergencyId: newId,
      ambulanceId: 'AMB-101',
      vehicleNumber: 'KA-01-EQ-9110',
      driverName: 'Kiran Kumar (EMT Driver)',
      driverPhone: '+91 98450 11223',
      emergencyType: type || 'Cardiac',
      priority: priority || 'P1',
      vitals: {
        triageCategory: 'Red',
        chiefComplaint: 'Acute Myocardial Infarction with ST elevation',
        heartRateBpm: 114,
        bloodPressureSystolic: 85,
        bloodPressureDiastolic: 55,
        spO2Percent: 91,
      },
      etaMinutes: 14,
      remainingDistanceKm: 8.5,
      journeyStatus: 'En Route to Hospital',
      hospitalAcceptanceStatus: 'Request Received',
      hospitalPreparationStatus: 'In Progress',
      destinationHospitalId: hospitalProfile.hospitalId,
      currentLocation: {
        latitude: hospitalProfile.location.latitude + 0.02,
        longitude: hospitalProfile.location.longitude + 0.02,
      },
      preparationChecklist: getDefaultChecklistForType(type || 'Cardiac'),
      timeline: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    setEmergencies((prev) => [sim, ...prev]);
    soundAlertService.playWarningAlert();
  };

  const resetDemoData = () => {
    setEmergencies(INITIAL_DEMO_EMERGENCIES);
    setHistory(INITIAL_DEMO_HISTORY);
    setResources(INITIAL_HOSPITAL_RESOURCES);
  };

  const markNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleSound = () => {
    setSettings((prev) => ({ ...prev, soundAlertsEnabled: !prev.soundAlertsEnabled }));
  };

  const reconnectBackend = async () => {
    setConnectionStatus('Connecting');
    try {
      // Test read to Firebase RTDB .info/connected
      const snap = await get(ref(database, '.info/connected'));
      if (snap.val() === true) {
        setConnectionStatus('FIREBASE CONNECTED');
        setConnectionError(null);
      } else {
        setConnectionStatus('FIREBASE RECONNECTING');
        setConnectionError('Connecting to Firebase Realtime Database...');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('PERMISSION_DENIED')) {
        setConnectionStatus('DATABASE PERMISSION DENIED');
        setConnectionError('Permission denied. Please verify Firebase Authentication or security rules.');
      } else {
        setConnectionStatus('FIREBASE DISCONNECTED');
        setConnectionError(err.message || 'Cannot connect to Firebase Realtime Database.');
      }
    }
  };

  return (
    <HospitalContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isBackendConnected:
          connectionStatus === 'FIREBASE CONNECTED' ||
          connectionStatus === 'Connected' ||
          connectionStatus === 'BACKEND ONLINE',
        connectionStatus,
        connectionError,
        reconnectBackend,
        isDemoMode,
        hospitalProfile,
        registeredProfile,
        officialLocation,
        allRegisteredHospitals,
        verificationStatus,
        incompleteProfile,
        capacity,
        resources,
        readiness,
        emergencies,
        history,
        selectedEmergencyId,
        selectedEmergency,
        activeTab,
        settings,
        notifications,
        unreadNotificationCount,
        theme,
        login,
        registerAccount,
        registerHospital,
        updateHospitalDetails,
        updateHospitalLocation,
        verifyHospitalLocationStatus,
        retryProfileSave,
        resetPassword,
        updateSpecialitiesAndCapabilities,
        verifyCurrentHospital,
        logout,
        updateResources,
        seedInitialHospitalResources,
        updateEmergencyStatus,
        declineEmergency,
        updateChecklistTask,
        toggleChecklistItem,
        markEmergencyReady,
        completeEmergencyHandover,
        updateSettings,
        toggleDemoMode,
        simulateNewEmergency,
        resetDemoData,
        setSelectedEmergencyId,
        setActiveTab,
        markNotificationsRead,
        toggleSound,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </HospitalContext.Provider>
  );
};

export const useHospital = () => {
  const context = useContext(HospitalContext);
  if (!context) {
    throw new Error('useHospital must be used within a HospitalProvider');
  }
  return context;
};
