/**
 * WEWOO Hospital Emergency Command Center - Firebase Realtime Database Service
 * High-performance real-time synchronization replacing Node.js REST API and Socket.IO.
 */

import {
  database,
  ref,
  onValue,
  off,
  set,
  get,
  update,
  push,
  serverTimestamp,
} from './firebase';
import {
  HospitalResources,
  RegisteredHospitalProfile,
  HospitalDetailsInput,
  HospitalLocation,
  EmergencyRecord,
  EmergencyType,
  EmergencyPriority,
  HospitalAcceptanceStatus,
  PreparationChecklistItem,
} from '../types/emergency';
import { getDefaultChecklistForType } from '../data/mockData';

export interface LiveTelemetry {
  ambulanceId: string;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  emergencyId?: string | null;
  distanceKm?: number;
  etaMinutes?: number;
  timestamp: string;
}

// ----------------------------------------------------------------------------
// 1. HOSPITAL PROFILE & DETAILS
// ----------------------------------------------------------------------------

export const getHospitalProfile = async (
  hospitalId: string
): Promise<RegisteredHospitalProfile | null> => {
  const snap = await get(ref(database, `hospitals/${hospitalId}`));
  if (!snap.exists()) return null;
  const data = snap.val();
  return {
    hospitalId,
    hospitalName: data.hospitalName || data.name || 'Emergency Hospital',
    registrationNumber: data.registrationNumber || 'REG-ACTIVE',
    hospitalType: data.hospitalType || 'Private',
    email: data.email || '',
    phone: data.phone || data.contact_number || '',
    administratorName: data.administratorName || 'Hospital Administrator',
    address: data.address || '',
    city: data.city || '',
    state: data.state || '',
    pinCode: data.pinCode || data.pincode || '',
    latitude: Number(data.latitude) || 12.9345,
    longitude: Number(data.longitude) || 77.6101,
    specialities: data.specialities || ['Trauma', 'Cardiology', 'ICU'],
    emergencyCapabilities: data.emergencyCapabilities || ['CT Scan', 'ICU', 'Ventilators'],
    verificationStatus: data.verificationStatus || 'verified',
    accountStatus: data.accountStatus || 'active',
    isProfileCompleted: data.isProfileCompleted ?? true,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
};

export const saveHospitalProfile = async (
  hospitalId: string,
  profile: Partial<RegisteredHospitalProfile>
): Promise<void> => {
  const now = new Date().toISOString();
  const payload = {
    ...profile,
    hospitalId,
    updatedAt: now,
  };
  await update(ref(database, `hospitals/${hospitalId}`), payload);

  // If location fields are present, also ensure /hospitals/{hospitalId}/location is updated
  if (profile.address || profile.latitude !== undefined || profile.longitude !== undefined) {
    const locPayload: HospitalLocation = {
      address: profile.address || '',
      city: profile.city || 'Hyderabad',
      state: profile.state || 'Telangana',
      postalCode: profile.pinCode || '500034',
      pinCode: profile.pinCode || '500034',
      latitude: typeof profile.latitude === 'number' ? profile.latitude : null,
      longitude: typeof profile.longitude === 'number' ? profile.longitude : null,
      locationVerified: profile.locationVerified ?? true,
      updatedAt: now,
      hospitalName: profile.hospitalName || '',
      hospitalId,
    };
    await set(ref(database, `hospitals/${hospitalId}/location`), locPayload);
    await update(ref(database, `hospitals/${hospitalId}/profile`), {
      location: locPayload,
      updatedAt: now,
    });
  }
};

/**
 * Save and verify the official hospital location in Firebase Realtime Database
 * Stores at /hospitals/{hospitalId}/location and /hospitals/{hospitalId}/profile/location
 */
export const saveHospitalOfficialLocation = async (
  hospitalId: string,
  locationData: Partial<HospitalLocation>
): Promise<HospitalLocation> => {
  const now = new Date().toISOString();
  const cleanPayload: HospitalLocation = {
    address: locationData.address?.trim() || '',
    city: locationData.city?.trim() || 'Hyderabad',
    state: locationData.state?.trim() || 'Telangana',
    postalCode: locationData.postalCode?.trim() || locationData.pinCode?.trim() || '500034',
    pinCode: locationData.postalCode?.trim() || locationData.pinCode?.trim() || '500034',
    latitude: typeof locationData.latitude === 'number' ? locationData.latitude : null,
    longitude: typeof locationData.longitude === 'number' ? locationData.longitude : null,
    locationVerified: Boolean(locationData.locationVerified),
    updatedAt: now,
    verifiedBy: locationData.verifiedBy || 'Authorized Hospital Administrator',
    landmark: locationData.landmark || '',
    hospitalName: locationData.hospitalName || '',
    hospitalId,
  };

  // 1. Write dedicated location record at /hospitals/{hospitalId}/location
  await set(ref(database, `hospitals/${hospitalId}/location`), cleanPayload);

  // 2. Write location inside /hospitals/{hospitalId}/profile
  await update(ref(database, `hospitals/${hospitalId}/profile`), {
    location: cleanPayload,
    updatedAt: now,
  });

  // 3. Sync top-level fields on /hospitals/{hospitalId} for full backwards & ecosystem compatibility
  await update(ref(database, `hospitals/${hospitalId}`), {
    address: cleanPayload.address,
    city: cleanPayload.city,
    state: cleanPayload.state,
    pinCode: cleanPayload.postalCode,
    postalCode: cleanPayload.postalCode,
    latitude: cleanPayload.latitude,
    longitude: cleanPayload.longitude,
    locationVerified: cleanPayload.locationVerified,
    updatedAt: now,
  });

  return cleanPayload;
};

/**
 * Retrieve official hospital location from Firebase
 */
export const getHospitalOfficialLocation = async (
  hospitalId: string
): Promise<HospitalLocation | null> => {
  const locSnap = await get(ref(database, `hospitals/${hospitalId}/location`));
  if (locSnap.exists()) {
    const val = locSnap.val();
    return {
      address: val.address || '',
      city: val.city || 'Hyderabad',
      state: val.state || 'Telangana',
      postalCode: val.postalCode || val.pinCode || '500034',
      pinCode: val.postalCode || val.pinCode || '500034',
      latitude: typeof val.latitude === 'number' ? val.latitude : null,
      longitude: typeof val.longitude === 'number' ? val.longitude : null,
      locationVerified: Boolean(val.locationVerified),
      updatedAt: val.updatedAt || new Date().toISOString(),
      verifiedBy: val.verifiedBy,
      hospitalName: val.hospitalName,
      hospitalId,
      landmark: val.landmark,
    };
  }

  const rootSnap = await get(ref(database, `hospitals/${hospitalId}`));
  if (rootSnap.exists()) {
    const val = rootSnap.val();
    return {
      address: val.address || '',
      city: val.city || 'Hyderabad',
      state: val.state || 'Telangana',
      postalCode: val.pinCode || val.postalCode || '500034',
      pinCode: val.pinCode || val.postalCode || '500034',
      latitude: typeof val.latitude === 'number' ? val.latitude : null,
      longitude: typeof val.longitude === 'number' ? val.longitude : null,
      locationVerified: Boolean(val.locationVerified),
      updatedAt: val.updatedAt || new Date().toISOString(),
      verifiedBy: val.administratorName,
      hospitalName: val.hospitalName || val.name,
      hospitalId,
    };
  }

  return null;
};

/**
 * Real-time listener for official hospital location in Firebase
 */
export const listenHospitalOfficialLocation = (
  hospitalId: string,
  callback: (location: HospitalLocation | null) => void
): (() => void) => {
  const locRef = ref(database, `hospitals/${hospitalId}/location`);
  const unsubscribe = onValue(locRef, (snap) => {
    if (snap.exists()) {
      const val = snap.val();
      callback({
        address: val.address || '',
        city: val.city || 'Hyderabad',
        state: val.state || 'Telangana',
        postalCode: val.postalCode || val.pinCode || '500034',
        pinCode: val.postalCode || val.pinCode || '500034',
        latitude: typeof val.latitude === 'number' ? val.latitude : null,
        longitude: typeof val.longitude === 'number' ? val.longitude : null,
        locationVerified: Boolean(val.locationVerified),
        updatedAt: val.updatedAt || new Date().toISOString(),
        verifiedBy: val.verifiedBy,
        hospitalName: val.hospitalName,
        hospitalId,
        landmark: val.landmark,
      });
      return;
    }

    // Fallback to checking root hospitals/{hospitalId}
    get(ref(database, `hospitals/${hospitalId}`)).then((rootSnap) => {
      if (rootSnap.exists()) {
        const val = rootSnap.val();
        callback({
          address: val.address || '',
          city: val.city || 'Hyderabad',
          state: val.state || 'Telangana',
          postalCode: val.pinCode || val.postalCode || '500034',
          pinCode: val.pinCode || val.postalCode || '500034',
          latitude: typeof val.latitude === 'number' ? val.latitude : null,
          longitude: typeof val.longitude === 'number' ? val.longitude : null,
          locationVerified: Boolean(val.locationVerified),
          updatedAt: val.updatedAt || new Date().toISOString(),
          verifiedBy: val.administratorName,
          hospitalName: val.hospitalName || val.name,
          hospitalId,
        });
      } else {
        callback(null);
      }
    });
  });

  return () => off(locRef, 'value', unsubscribe);
};

export const verifyHospitalOfficialLocation = async (
  hospitalId: string,
  verified: boolean,
  verifiedBy = 'Authorized Administrator'
): Promise<void> => {
  const now = new Date().toISOString();
  await update(ref(database, `hospitals/${hospitalId}/location`), {
    locationVerified: verified,
    verifiedBy,
    updatedAt: now,
  });
  await update(ref(database, `hospitals/${hospitalId}`), {
    locationVerified: verified,
    updatedAt: now,
  });
};

export const listenHospitalProfile = (
  hospitalId: string,
  callback: (profile: RegisteredHospitalProfile | null) => void
): (() => void) => {
  const hospRef = ref(database, `hospitals/${hospitalId}`);
  const unsubscribe = onValue(hospRef, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.val();
    callback({
      hospitalId,
      hospitalName: data.hospitalName || data.name || 'Emergency Hospital',
      registrationNumber: data.registrationNumber || '',
      hospitalType: data.hospitalType || 'Private',
      email: data.email || '',
      phone: data.phone || data.contact_number || '',
      administratorName: data.administratorName || 'Administrator',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      pinCode: data.pinCode || data.pincode || '',
      latitude: Number(data.latitude) || 12.9345,
      longitude: Number(data.longitude) || 77.6101,
      specialities: data.specialities || [],
      emergencyCapabilities: data.emergencyCapabilities || [],
      verificationStatus: data.verificationStatus || 'verified',
      accountStatus: data.accountStatus || 'active',
      isProfileCompleted: data.isProfileCompleted ?? true,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  });

  return () => off(hospRef, 'value', unsubscribe);
};

export const listenAllHospitals = (
  callback: (hospitals: RegisteredHospitalProfile[]) => void
): (() => void) => {
  const allRef = ref(database, 'hospitals');
  const unsubscribe = onValue(allRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const val = snap.val();
    const list: RegisteredHospitalProfile[] = Object.keys(val).map((k) => {
      const item = val[k];
      return {
        hospitalId: k,
        hospitalName: item.hospitalName || item.name || k,
        registrationNumber: item.registrationNumber || '',
        hospitalType: item.hospitalType || 'Private',
        email: item.email || '',
        phone: item.phone || '',
        administratorName: item.administratorName || '',
        address: item.address || '',
        city: item.city || '',
        state: item.state || '',
        pinCode: item.pinCode || '',
        latitude: Number(item.latitude) || 12.9345,
        longitude: Number(item.longitude) || 77.6101,
        specialities: item.specialities || [],
        emergencyCapabilities: item.emergencyCapabilities || [],
        verificationStatus: item.verificationStatus || 'verified',
        accountStatus: item.accountStatus || 'active',
        isProfileCompleted: item.isProfileCompleted ?? true,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
      };
    });
    callback(list);
  });

  return () => off(allRef, 'value', unsubscribe);
};

// ----------------------------------------------------------------------------
// 2. HOSPITAL RESOURCES & AUTOMATIC RESOURCE BALANCING
// ----------------------------------------------------------------------------

export const balanceResources = (
  base: HospitalResources,
  updates: Partial<HospitalResources>
): HospitalResources => {
  let totalBeds = updates.totalBeds ?? base.totalBeds;
  let availableBeds = updates.availableBeds ?? base.availableBeds;
  let occupiedBeds = updates.occupiedBeds ?? base.occupiedBeds;

  if (updates.availableBeds !== undefined && updates.occupiedBeds === undefined) {
    availableBeds = Math.max(0, Math.min(updates.availableBeds, totalBeds));
    occupiedBeds = Math.max(0, totalBeds - availableBeds);
  } else if (updates.occupiedBeds !== undefined && updates.availableBeds === undefined) {
    occupiedBeds = Math.max(0, Math.min(updates.occupiedBeds, totalBeds));
    availableBeds = Math.max(0, totalBeds - occupiedBeds);
  } else if (updates.totalBeds !== undefined) {
    totalBeds = Math.max(1, updates.totalBeds);
    if (availableBeds > totalBeds) {
      availableBeds = totalBeds;
      occupiedBeds = 0;
    } else {
      occupiedBeds = Math.max(0, totalBeds - availableBeds);
    }
  }

  // ICU Beds balancing
  let totalICUBeds = updates.totalICUBeds ?? base.totalICUBeds;
  let availableICUBeds = updates.availableICUBeds ?? base.availableICUBeds;
  let occupiedICUBeds = updates.occupiedICUBeds ?? base.occupiedICUBeds;

  if (updates.availableICUBeds !== undefined && updates.occupiedICUBeds === undefined) {
    availableICUBeds = Math.max(0, Math.min(updates.availableICUBeds, totalICUBeds));
    occupiedICUBeds = Math.max(0, totalICUBeds - availableICUBeds);
  } else if (updates.occupiedICUBeds !== undefined && updates.availableICUBeds === undefined) {
    occupiedICUBeds = Math.max(0, Math.min(updates.occupiedICUBeds, totalICUBeds));
    availableICUBeds = Math.max(0, totalICUBeds - occupiedICUBeds);
  } else if (updates.totalICUBeds !== undefined) {
    totalICUBeds = Math.max(0, updates.totalICUBeds);
    if (availableICUBeds > totalICUBeds) {
      availableICUBeds = totalICUBeds;
      occupiedICUBeds = 0;
    } else {
      occupiedICUBeds = Math.max(0, totalICUBeds - availableICUBeds);
    }
  }

  // Emergency Doctors balancing
  let totalDoctors = updates.totalEmergencyDoctors ?? base.totalEmergencyDoctors;
  let availableDoctors = updates.availableEmergencyDoctors ?? base.availableEmergencyDoctors;
  let assignedDoctors = updates.assignedEmergencyDoctors ?? base.assignedEmergencyDoctors;

  if (updates.availableEmergencyDoctors !== undefined && updates.assignedEmergencyDoctors === undefined) {
    availableDoctors = Math.max(0, Math.min(updates.availableEmergencyDoctors, totalDoctors));
    assignedDoctors = Math.max(0, totalDoctors - availableDoctors);
  } else if (updates.assignedEmergencyDoctors !== undefined && updates.availableEmergencyDoctors === undefined) {
    assignedDoctors = Math.max(0, Math.min(updates.assignedEmergencyDoctors, totalDoctors));
    availableDoctors = Math.max(0, totalDoctors - assignedDoctors);
  } else if (updates.totalEmergencyDoctors !== undefined) {
    totalDoctors = Math.max(0, updates.totalEmergencyDoctors);
    if (availableDoctors > totalDoctors) {
      availableDoctors = totalDoctors;
      assignedDoctors = 0;
    } else {
      assignedDoctors = Math.max(0, totalDoctors - availableDoctors);
    }
  }

  // Nurses balancing
  let totalNurses = updates.totalNurses ?? base.totalNurses;
  let availableNurses = updates.availableNurses ?? base.availableNurses;
  let assignedNurses = updates.assignedNurses ?? base.assignedNurses;

  if (updates.availableNurses !== undefined && updates.assignedNurses === undefined) {
    availableNurses = Math.max(0, Math.min(updates.availableNurses, totalNurses));
    assignedNurses = Math.max(0, totalNurses - availableNurses);
  } else if (updates.assignedNurses !== undefined && updates.availableNurses === undefined) {
    assignedNurses = Math.max(0, Math.min(updates.assignedNurses, totalNurses));
    availableNurses = Math.max(0, totalNurses - assignedNurses);
  } else if (updates.totalNurses !== undefined) {
    totalNurses = Math.max(0, updates.totalNurses);
    if (availableNurses > totalNurses) {
      availableNurses = totalNurses;
      assignedNurses = 0;
    } else {
      assignedNurses = Math.max(0, totalNurses - availableNurses);
    }
  }

  return {
    ...base,
    totalBeds,
    availableBeds,
    occupiedBeds,
    totalICUBeds,
    availableICUBeds,
    occupiedICUBeds,
    totalEmergencyDoctors: totalDoctors,
    availableEmergencyDoctors: availableDoctors,
    assignedEmergencyDoctors: assignedDoctors,
    totalNurses,
    availableNurses,
    assignedNurses,
    emergencyDepartmentStatus: updates.emergencyDepartmentStatus || base.emergencyDepartmentStatus,
    emergency24x7: updates.emergency24x7 ?? base.emergency24x7,
    availableGeneralBeds: availableBeds,
    availableIcuBeds: availableICUBeds,
    availableDoctors,
    availableTraumaBays: updates.availableTraumaBays ?? base.availableTraumaBays ?? 4,
    emergencyStatus: (updates.emergencyDepartmentStatus || base.emergencyDepartmentStatus) as any,
    lastUpdated: new Date().toISOString(),
    updatedBy: updates.updatedBy || base.updatedBy || 'WEWOO Hospital Staff',
  };
};

export const updateHospitalResources = async (
  hospitalId: string,
  updates: Partial<HospitalResources>,
  base?: HospitalResources
): Promise<HospitalResources> => {
  // If base not passed, fetch current
  let currentBase = base;
  if (!currentBase) {
    const snap = await get(ref(database, `hospitals/${hospitalId}/resources`));
    if (snap.exists()) {
      currentBase = snap.val();
    }
  }

  const initial: HospitalResources = currentBase || {
    hospitalId,
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
    lastUpdated: new Date().toISOString(),
    updatedBy: 'WEWOO System',
    availableGeneralBeds: 35,
    availableIcuBeds: 6,
    availableDoctors: 4,
    availableTraumaBays: 4,
    emergencyStatus: 'Normal Operations',
  };

  const balanced = balanceResources(initial, updates);

  // Write to both compatible paths in Firebase RTDB
  await set(ref(database, `hospitals/${hospitalId}/resources`), balanced);
  await set(ref(database, `hospitalResources/${hospitalId}`), balanced);

  return balanced;
};

export const listenHospitalResources = (
  hospitalId: string,
  callback: (resources: HospitalResources | null) => void
): (() => void) => {
  const resRef = ref(database, `hospitals/${hospitalId}/resources`);
  const unsubscribe = onValue(resRef, (snap) => {
    if (!snap.exists()) {
      // Check fallback path hospitalResources/{hospitalId}
      get(ref(database, `hospitalResources/${hospitalId}`)).then((fallbackSnap) => {
        if (fallbackSnap.exists()) {
          callback(fallbackSnap.val());
        } else {
          callback(null);
        }
      });
      return;
    }
    const data = snap.val();
    // Normalize properties
    const mapped: HospitalResources = {
      hospitalId,
      totalBeds: Number(data.totalBeds ?? (((data.availableGeneralBeds || 0) + (data.occupiedBeds || 0)) || 100)),
      availableBeds: Number(data.availableBeds ?? (data.availableGeneralBeds || 35)),
      occupiedBeds: Number(data.occupiedBeds ?? 65),
      totalICUBeds: Number(data.totalICUBeds ?? 20),
      availableICUBeds: Number(data.availableICUBeds ?? data.availableIcuBeds ?? 6),
      occupiedICUBeds: Number(data.occupiedICUBeds ?? 14),
      totalEmergencyDoctors: Number(data.totalEmergencyDoctors ?? 10),
      availableEmergencyDoctors: Number(data.availableEmergencyDoctors ?? data.availableDoctors ?? 4),
      assignedEmergencyDoctors: Number(data.assignedEmergencyDoctors ?? 6),
      totalNurses: Number(data.totalNurses ?? 30),
      availableNurses: Number(data.availableNurses ?? 12),
      assignedNurses: Number(data.assignedNurses ?? 18),
      emergencyDepartmentStatus: data.emergencyDepartmentStatus || data.emergencyStatus || 'Normal Operations',
      emergency24x7: data.emergency24x7 ?? true,
      lastUpdated: data.lastUpdated || new Date().toISOString(),
      updatedBy: data.updatedBy || 'WEWOO Network',
      availableGeneralBeds: Number(data.availableBeds ?? data.availableGeneralBeds ?? 35),
      availableIcuBeds: Number(data.availableICUBeds ?? data.availableIcuBeds ?? 6),
      availableDoctors: Number(data.availableEmergencyDoctors ?? data.availableDoctors ?? 4),
      availableTraumaBays: Number(data.availableTraumaBays ?? 4),
      emergencyStatus: (data.emergencyDepartmentStatus || data.emergencyStatus || 'Normal Operations') as any,
    };
    callback(mapped);
  });

  return () => off(resRef, 'value', unsubscribe);
};

// ----------------------------------------------------------------------------
// 3. SPECIALITIES & CAPABILITIES
// ----------------------------------------------------------------------------

export const updateHospitalSpecialities = async (
  hospitalId: string,
  specialities: string[]
): Promise<void> => {
  await set(ref(database, `hospitals/${hospitalId}/specialities`), specialities);
  await set(ref(database, `hospitalSpecialities/${hospitalId}`), specialities);
};

export const updateHospitalCapabilities = async (
  hospitalId: string,
  capabilities: string[]
): Promise<void> => {
  await set(ref(database, `hospitals/${hospitalId}/emergencyCapabilities`), capabilities);
  await set(ref(database, `hospitalCapabilities/${hospitalId}`), capabilities);
};

// ----------------------------------------------------------------------------
// 4. REAL-TIME EMERGENCY DISPATCH & COORDINATION
// ----------------------------------------------------------------------------

export const listenActiveEmergencies = (
  hospitalId: string,
  callback: (emergencies: EmergencyRecord[]) => void
): (() => void) => {
  const emgRef = ref(database, 'emergencyRequests');
  const unsubscribe = onValue(emgRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const val = snap.val();
    const list: EmergencyRecord[] = [];

    Object.keys(val).forEach((key) => {
      const e = val[key];
      // Filter for this hospital or broadcast requests
      const destId = e.destinationHospitalId || e.hospitalId || e.hospital_id;
      if (!destId || destId === hospitalId || destId === 'ALL') {
        const record: EmergencyRecord = {
          emergencyId: key,
          ambulanceId: e.ambulanceId || e.ambulance_id || 'AMB-101',
          vehicleNumber: e.vehicleNumber || e.vehicle_number || 'KA-01-EQ-9110',
          driverName: e.driverName || 'EMT Senior Driver',
          driverPhone: e.driverPhone || '+91 98450 11223',
          emergencyType: (e.emergencyType || 'Cardiac') as EmergencyType,
          priority: (e.priority || (e.priorityLevel === 'CODE_YELLOW' ? 'P2' : e.priorityLevel === 'CODE_GREEN' ? 'P3' : 'P1')) as EmergencyPriority,
          vitals: {
            triageCategory: e.vitals?.triageCategory || 'Red',
            chiefComplaint: e.vitals?.chiefComplaint || e.patientChiefComplaint || 'Emergency Dispatch',
            heartRateBpm: Number(e.vitals?.heartRateBpm || 88),
            bloodPressureSystolic: Number(e.vitals?.bloodPressureSystolic || 120),
            bloodPressureDiastolic: Number(e.vitals?.bloodPressureDiastolic || 80),
            spO2Percent: Number(e.vitals?.spO2Percent || 98),
          },
          etaMinutes: Number(e.etaMinutes || e.estimatedEtaMinutes || 12),
          routeDistanceKm: Number(e.routeDistanceKm || e.totalDistanceKm || e.actualDistanceKm || 6.5),
          remainingDistanceKm: Number(e.remainingDistanceKm || e.actualDistanceKm || 6.5),
          journeyStatus: e.journeyStatus || 'En Route to Hospital',
          hospitalAcceptanceStatus: e.hospitalAcceptanceStatus || 'Request Received',
          hospitalPreparationStatus: e.hospitalPreparationStatus || 'In Progress',
          destinationHospitalId: destId || hospitalId,
          currentLocation: {
            latitude: Number(e.currentLocation?.latitude || e.pickupLatitude || 12.9716),
            longitude: Number(e.currentLocation?.longitude || e.pickupLongitude || 77.5946),
          },
          preparationChecklist: Array.isArray(e.preparationChecklist)
            ? e.preparationChecklist
            : getDefaultChecklistForType((e.emergencyType || 'Cardiac') as EmergencyType),
          timeline: Array.isArray(e.timeline) ? e.timeline : [],
          createdAt: e.createdAt || new Date().toISOString(),
          lastUpdated: e.lastUpdated || new Date().toISOString(),
          declineReason: e.declineReason,
        };
        list.push(record);
      }
    });

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  });

  return () => off(emgRef, 'value', unsubscribe);
};

export const updateEmergencyInFirebase = async (
  emergencyId: string,
  updates: Partial<EmergencyRecord>
): Promise<void> => {
  const now = new Date().toISOString();
  await update(ref(database, `emergencyRequests/${emergencyId}`), {
    ...updates,
    lastUpdated: now,
  });
};

export const respondEmergencyInFirebase = async (
  emergencyId: string,
  action: 'ACCEPT' | 'REJECT',
  extras?: { rejectionReason?: string; assignedDoctor?: string; prepInstructions?: string }
): Promise<void> => {
  const now = new Date().toISOString();
  const acceptanceStatus: HospitalAcceptanceStatus = action === 'ACCEPT' ? 'Accepted' : 'Declined';
  await update(ref(database, `emergencyRequests/${emergencyId}`), {
    hospitalAcceptanceStatus: acceptanceStatus,
    declineReason: extras?.rejectionReason || null,
    assignedDoctor: extras?.assignedDoctor || null,
    prepInstructions: extras?.prepInstructions || null,
    lastUpdated: now,
  });
};

export const createEmergencyInFirebase = async (
  payload: Partial<EmergencyRecord>
): Promise<string> => {
  const emgId = payload.emergencyId || `EMG-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();
  const record = {
    ...payload,
    emergencyId: emgId,
    createdAt: now,
    lastUpdated: now,
    hospitalAcceptanceStatus: payload.hospitalAcceptanceStatus || 'Request Received',
    hospitalPreparationStatus: payload.hospitalPreparationStatus || 'In Progress',
  };
  await set(ref(database, `emergencyRequests/${emgId}`), record);
  return emgId;
};

// ----------------------------------------------------------------------------
// 5. LIVE AMBULANCE TELEMETRY & GPS
// ----------------------------------------------------------------------------

export const listenAmbulanceLocations = (
  callback: (telemetryMap: Record<string, LiveTelemetry>) => void
): (() => void) => {
  const ambRef = ref(database, 'ambulanceLocations');
  const unsubscribe = onValue(ambRef, (snap) => {
    if (!snap.exists()) {
      callback({});
      return;
    }
    const val = snap.val();
    callback(val);
  });

  return () => off(ambRef, 'value', unsubscribe);
};

export const updateAmbulanceLocationInFirebase = async (
  ambulanceId: string,
  telemetry: Partial<LiveTelemetry>
): Promise<void> => {
  const now = new Date().toISOString();
  await update(ref(database, `ambulanceLocations/${ambulanceId}`), {
    ...telemetry,
    ambulanceId,
    timestamp: now,
  });
};

// ----------------------------------------------------------------------------
// 6. EMERGENCY PREPARATION TASKS
// ----------------------------------------------------------------------------

export const listenPreparationTasks = (
  hospitalId: string,
  emergencyId: string,
  callback: (tasks: PreparationChecklistItem[]) => void
): (() => void) => {
  const taskRef = ref(database, `preparationTasks/${hospitalId}/${emergencyId}`);
  const unsubscribe = onValue(taskRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const val = snap.val();
    const tasks: PreparationChecklistItem[] = Object.keys(val).map((k) => ({
      id: k,
      ...val[k],
    }));
    callback(tasks);
  });

  return () => off(taskRef, 'value', unsubscribe);
};

export const updatePreparationTaskInFirebase = async (
  hospitalId: string,
  emergencyId: string,
  taskId: string,
  isCompleted: boolean,
  assignedTo?: string
): Promise<void> => {
  const now = new Date().toISOString();
  await update(ref(database, `preparationTasks/${hospitalId}/${emergencyId}/${taskId}`), {
    status: isCompleted ? 'completed' : 'pending',
    assignedStaff: assignedTo || null,
    completedAt: isCompleted ? now : null,
    lastUpdated: now,
  });
};

// ----------------------------------------------------------------------------
// 7. EMERGENCY HISTORY
// ----------------------------------------------------------------------------

export const listenEmergencyHistory = (
  hospitalId: string,
  callback: (history: EmergencyRecord[]) => void
): (() => void) => {
  const histRef = ref(database, `emergencyHistory/${hospitalId}`);
  const unsubscribe = onValue(histRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const val = snap.val();
    const list: EmergencyRecord[] = Object.keys(val).map((k) => ({
      emergencyId: k,
      ...val[k],
    }));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  });

  return () => off(histRef, 'value', unsubscribe);
};

export const saveEmergencyHistoryToFirebase = async (
  hospitalId: string,
  record: EmergencyRecord
): Promise<void> => {
  const recordId = record.emergencyId || `HIST-${Date.now()}`;
  await set(ref(database, `emergencyHistory/${hospitalId}/${recordId}`), record);
};
