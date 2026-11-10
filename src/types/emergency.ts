/**
 * WEWOO Hospital Emergency Response Command Center - Type Definitions
 * Strictly hospital-side coordination and telemetry models.
 */

export type EmergencyPriority = 'P1' | 'P2' | 'P3';

export type EmergencyType =
  | 'Cardiac'
  | 'Trauma'
  | 'Stroke'
  | 'Respiratory'
  | 'Obstetric'
  | 'Pediatric'
  | 'Burn'
  | 'General';

export type JourneyStatus =
  | 'En Route to Scene'
  | 'Patient Loaded'
  | 'En Route to Hospital'
  | 'Approaching Hospital'
  | 'Arrived at ER'
  | 'Handover Completed';

export type HospitalAcceptanceStatus =
  | 'Request Received'
  | 'Accepted'
  | 'Preparing'
  | 'Ready for Arrival'
  | 'Arrived'
  | 'Completed'
  | 'Declined';

export type HospitalEmergencyStatus =
  | 'Normal Operations'
  | 'Elevated Demand'
  | 'Mass Casualty Protocol'
  | 'Emergency Divert';

export type ConnectionStatus =
  | 'FIREBASE CONNECTED'
  | 'FIREBASE RECONNECTING'
  | 'FIREBASE DISCONNECTED'
  | 'AUTHENTICATION REQUIRED'
  | 'DATABASE PERMISSION DENIED'
  | 'Connected'
  | 'Connecting'
  | 'Disconnected'
  | 'Permission Denied'
  | 'BACKEND ONLINE'
  | 'BACKEND OFFLINE'
  | 'RECONNECTING'
  | 'CONNECTING'
  | 'AUTH REQUIRED'
  | 'TOKEN EXPIRED'
  | 'DATABASE ERROR';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface HospitalLocation {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  pinCode?: string;
  latitude: number | null;
  longitude: number | null;
  locationVerified: boolean;
  updatedAt: string;
  verifiedBy?: string;
  hospitalName?: string;
  hospitalId?: string;
  landmark?: string;
}

export interface AmbulanceTelemetry {
  ambulanceId: string;
  vehicleNumber?: string;
  callSign?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  currentLocation?: GeoPoint;
  heading?: number; // degrees 0-360
  speedKmh?: number;
  lastGpsUpdate?: string; // ISO string
  isStale?: boolean;
}

export interface PatientVitalsSummary {
  triageCategory: 'Red' | 'Yellow' | 'Green';
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  chiefComplaint: string;
  heartRateBpm?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  spO2Percent?: number;
  glasgowComaScale?: number;
  notes?: string;
}

export interface PreparationChecklistItem {
  id: string;
  task: string;
  category: 'clinical' | 'equipment' | 'space' | 'admin';
  status: 'pending' | 'in_progress' | 'completed';
  assignedRole: string;
  assignedStaff?: string;
  notes?: string;
  completedAt?: string;
  completedBy?: string;
  lastUpdated?: string;
}

export interface EmergencyTimelineEvent {
  id: string;
  timestamp: string;
  actor: 'Driver' | 'Hospital' | 'IoT System';
  title: string;
  details?: string;
  statusChange?: string;
}

export interface EmergencyRecord {
  emergencyId: string;
  ambulanceId: string;
  vehicleNumber?: string;
  callSign?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  emergencyType: EmergencyType;
  priority: EmergencyPriority;
  patientPickupLocation?: GeoPoint & { address?: string };
  currentLocation?: GeoPoint;
  heading?: number;
  speedKmh?: number;
  destinationHospitalId: string;
  routeDistanceKm?: number;
  remainingDistanceKm?: number;
  etaMinutes?: number;
  etaSeconds?: number;
  currentJunction?: string;
  nextJunction?: string;
  journeyStatus: JourneyStatus;
  hospitalAcceptanceStatus: HospitalAcceptanceStatus;
  hospitalPreparationStatus: 'Not Started' | 'In Progress' | 'Ready for Arrival';
  declineReason?: string;
  createdAt: string;
  lastUpdated: string;
  vitals?: PatientVitalsSummary;
  preparationChecklist: PreparationChecklistItem[];
  timeline: EmergencyTimelineEvent[];
  routeCoordinates?: [number, number][]; // [lat, lng]
}

export interface HospitalProfile {
  hospitalId: string;
  name: string;
  location: GeoPoint;
  address: string;
  phone: string;
  emergencyHotline: string;
  traumaLevel: 'Level 1 Trauma Center' | 'Level 2 Trauma Center' | 'Level 3 Emergency Care';
  chiefOfficer: string;
}

export interface HospitalCapacity {
  totalGeneralBeds: number;
  totalIcuBeds: number;
  totalDoctors: number;
  totalNurses: number;
  totalTraumaBays: number;
}

export interface HospitalResources {
  hospitalId: string;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  totalICUBeds: number;
  availableICUBeds: number;
  occupiedICUBeds: number;
  totalEmergencyDoctors: number;
  availableEmergencyDoctors: number;
  assignedEmergencyDoctors?: number;
  totalNurses: number;
  availableNurses: number;
  assignedNurses?: number;
  emergencyDepartmentStatus: string;
  emergency24x7: boolean;
  lastUpdated: string;
  updatedBy?: string;

  // Backward compatibility properties
  availableGeneralBeds?: number;
  availableIcuBeds?: number;
  availableDoctors?: number;
  availableTraumaBays?: number;
  emergencyStatus?: HospitalEmergencyStatus;
}

export interface ReadinessWeights {
  generalBedWeight: number; // default: 0.20
  icuBedWeight: number;     // default: 0.40
  doctorWeight: number;     // default: 0.25
  nurseWeight: number;      // default: 0.15
}

export interface HospitalReadiness {
  score: number | null; // 0 - 100 or null if data is insufficient
  status: 'Optimal' | 'Adequate' | 'Constrained' | 'Critical / Divert' | 'Insufficient data to calculate readiness';
  isEstimate: boolean; // Flag marking score as prototype estimate
  formulaWeights: ReadinessWeights;
  lastCalculated: string;
  insufficientReason?: string;
}

export interface AppSettings {
  hospitalProfile: HospitalProfile;
  capacity: HospitalCapacity;
  readinessWeights: ReadinessWeights;
  mapTileUrl: string;
  mapAttribution: string;
  osrmRoutingUrl: string;
  soundAlertsEnabled: boolean;
  soundVolume: number; // 0 to 1
  autoRefreshIntervalSeconds: number;
  isDemoMode: boolean;
  darkMode: boolean;
}

export interface StaffUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'Chief Medical Officer' | 'Emergency Coordinator' | 'Triage Nurse' | 'Staff Attending';
  hospitalId: string;
  isDemoUser?: boolean;
}

export type HospitalType = 'Government' | 'Private' | 'Trust/Charitable';

export const STANDARD_SPECIALITIES = [
  'Cardiology',
  'Neurology',
  'Neurosurgery',
  'Orthopedics',
  'Trauma and Emergency Medicine',
  'General Surgery',
  'Cardiothoracic Surgery',
  'Obstetrics and Gynecology',
  'Pediatrics',
  'Neonatology',
  'Oncology',
  'Nephrology',
  'Urology',
  'Respiratory Medicine',
  'Burns and Plastic Surgery',
  'Psychiatry',
  'General Medicine',
] as const;

export type StandardSpeciality = (typeof STANDARD_SPECIALITIES)[number];

export const STANDARD_EMERGENCY_CAPABILITIES = [
  '24/7 Emergency Department',
  'ICU',
  'Cardiac Emergency Care',
  'Trauma Center',
  'Operating Theatre',
  'Maternity Emergency Care',
  'Pediatric Emergency Care',
  'Neonatal ICU',
  'Blood Bank',
  'Ambulance Receiving Availability',
] as const;

export type StandardEmergencyCapability = (typeof STANDARD_EMERGENCY_CAPABILITIES)[number];

export type HospitalVerificationStatus = 'pendingVerification' | 'verified' | 'rejected';
export type HospitalAccountStatus = 'active' | 'suspended' | 'pending';

export interface RegisteredHospitalProfile {
  hospitalId: string; // Registered hospital identifier
  hospitalName: string;
  registrationNumber: string;
  hospitalType: HospitalType;
  email: string;
  phone: string;
  administratorName: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  latitude: number;
  longitude: number;
  specialities: string[];
  emergencyCapabilities: string[];
  verificationStatus: HospitalVerificationStatus;
  accountStatus: HospitalAccountStatus;
  createdAt: string;
  updatedAt: string;
  isProfileCompleted?: boolean;
  locationVerified?: boolean;
  officialLocation?: HospitalLocation;
  resources?: HospitalResources;
  readiness?: HospitalReadiness;
}

export interface AdminAccountRegistrationInput {
  administratorName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface HospitalDetailsInput {
  hospitalName: string;
  registrationNumber: string;
  hospitalType: HospitalType;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  latitude: number;
  longitude: number;
  locationVerified?: boolean;
  officialLocation?: HospitalLocation;
  specialities: string[];
  customSpeciality?: string;
  emergencyCapabilities: string[];
}

export interface HospitalRegistrationInput {
  hospitalName: string;
  registrationNumber: string;
  hospitalType: HospitalType;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  latitude: number;
  longitude: number;
  specialities: string[];
  customSpeciality?: string;
  emergencyCapabilities: string[];
  administratorName: string;
  password: string;
  confirmPassword: string;
}

