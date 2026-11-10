/**
 * WEWOO Hospital Emergency Command Center - Firebase Authentication Service
 * Secure authentication for hospital staff, Chief Medical Officers, and Emergency Coordinators.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth, database, ref, set, get } from './firebase';
import { StaffUser } from '../types/emergency';

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  hospitalId: string;
  createdAt: string;
}

const normalizeStaffRole = (rawRole?: string): StaffUser['role'] => {
  if (
    rawRole === 'Chief Medical Officer' ||
    rawRole === 'Emergency Coordinator' ||
    rawRole === 'Staff Attending' ||
    rawRole === 'Triage Nurse'
  ) {
    return rawRole;
  }
  if (rawRole?.includes('Admin') || rawRole?.includes('Chief')) return 'Chief Medical Officer';
  if (rawRole?.includes('Nurse')) return 'Triage Nurse';
  return 'Emergency Coordinator';
};

/**
 * Log in a hospital administrator or clinical staff member
 */
export const loginHospital = async (email: string, pass: string): Promise<StaffUser> => {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const user = credential.user;

  // Retrieve user record from Firebase RTDB (checking staffUsers/{uid} first, then users/{uid})
  let staffProfile: FirebaseUserProfile | null = null;
  try {
    const staffSnap = await get(ref(database, `staffUsers/${user.uid}`));
    if (staffSnap.exists()) {
      staffProfile = staffSnap.val();
    } else {
      const userSnap = await get(ref(database, `users/${user.uid}`));
      if (userSnap.exists()) {
        staffProfile = userSnap.val();
      }
    }
  } catch (err: any) {
    console.warn('⚠️ [WEWOO Firebase Auth] Could not fetch remote user profile:', err.message);
  }

  const hospitalId = staffProfile?.hospitalId || user.photoURL || 'hosp-wewoo-01';
  const role = normalizeStaffRole(staffProfile?.role);
  const displayName = staffProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Hospital Staff';

  const staffUser: StaffUser = {
    uid: user.uid,
    email: user.email || email,
    displayName,
    role,
    hospitalId,
    isDemoUser: false,
  };

  localStorage.setItem('wewoo_user', JSON.stringify(staffUser));
  return staffUser;
};

/**
 * Register a new hospital administrator account with associated hospital ID
 */
export const registerHospitalAccount = async (
  email: string,
  pass: string,
  administratorName: string,
  hospitalId: string,
  role = 'Chief Medical Officer'
): Promise<StaffUser> => {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  const user = credential.user;

  // Set displayName
  await updateProfile(user, {
    displayName: administratorName,
  });

  const now = new Date().toISOString();
  const profileRecord: FirebaseUserProfile = {
    uid: user.uid,
    email: user.email || email,
    displayName: administratorName,
    role,
    hospitalId,
    createdAt: now,
  };

  // Persist user record in both staffUsers and users paths for multi-client compatibility
  await set(ref(database, `staffUsers/${user.uid}`), profileRecord);
  await set(ref(database, `users/${user.uid}`), profileRecord);

  const staffUser: StaffUser = {
    uid: user.uid,
    email: user.email || email,
    displayName: administratorName,
    role: normalizeStaffRole(role),
    hospitalId,
    isDemoUser: false,
  };

  localStorage.setItem('wewoo_user', JSON.stringify(staffUser));
  return staffUser;
};

/**
 * Reset password via Firebase Auth
 */
export const sendHospitalPasswordReset = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email.trim());
};

/**
 * Log out current hospital user
 */
export const logoutHospital = async (): Promise<void> => {
  await signOut(auth);
  localStorage.removeItem('wewoo_user');
  localStorage.removeItem('wewoo_registered_profile');
};

/**
 * Subscribe to Firebase Auth state changes
 */
export const subscribeAuthState = (
  callback: (user: StaffUser | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (!user) {
      callback(null);
      return;
    }

    // Load user role & hospital association
    let hospitalId = 'hosp-wewoo-01';
    let role = 'Chief Medical Officer';
    let displayName = user.displayName || user.email?.split('@')[0] || 'Hospital Staff';

    try {
      const snap = await get(ref(database, `staffUsers/${user.uid}`));
      if (snap.exists()) {
        const val = snap.val();
        hospitalId = val.hospitalId || hospitalId;
        role = val.role || role;
        displayName = val.displayName || displayName;
      }
    } catch {
      // fallback to cached or default
      const cached = localStorage.getItem('wewoo_user');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          hospitalId = parsed.hospitalId || hospitalId;
          role = parsed.role || role;
        } catch {
          // ignore
        }
      }
    }

    const staffUser: StaffUser = {
      uid: user.uid,
      email: user.email || '',
      displayName,
      role: normalizeStaffRole(role),
      hospitalId,
      isDemoUser: false,
    };

    localStorage.setItem('wewoo_user', JSON.stringify(staffUser));
    callback(staffUser);
  });
};
