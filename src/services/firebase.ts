/**
 * WEWOO Hospital Emergency Command Center - Centralized Firebase Initialization
 * Primary backend providing Firebase Authentication and Firebase Realtime Database.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  Auth,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  onValue,
  off,
  set,
  get,
  update,
  push,
  remove,
  serverTimestamp,
  Database,
} from 'firebase/database';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA1g7eO9dC7yn-gb1NzSeP9eS2c5SiLoAc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'wewooo.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://wewooo-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'wewooo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'wewooo.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '585420940759',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:585420940759:web:6ad2a6d602fc33bc621792',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-6MG26VC812',
};

// Singleton initialization prevents duplicate Firebase initialization
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log('🔥 [WEWOO Firebase] Initialized primary Firebase App:', firebaseConfig.projectId);
} else {
  app = getApp();
  console.log('🔥 [WEWOO Firebase] Reusing existing Firebase App instance:', app.name);
}

export const auth: Auth = getAuth(app);
export const database: Database = getDatabase(app);

// Enable persistent local authentication sessions
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('⚠️ [WEWOO Firebase Auth] Persistence setting error:', err.message);
});

export {
  ref,
  onValue,
  off,
  set,
  get,
  update,
  push,
  remove,
  serverTimestamp,
};

export type FirebaseConnectionState =
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'PERMISSION_DENIED';

/**
 * Monitors genuine Firebase Realtime Database connection state using `.info/connected`
 */
export const subscribeFirebaseConnection = (
  callback: (status: FirebaseConnectionState, error?: string | null) => void
): (() => void) => {
  const connectedRef = ref(database, '.info/connected');
  let hasBeenConnected = false;

  const unsubscribe = onValue(
    connectedRef,
    (snapshot) => {
      const isConnected = snapshot.val() === true;
      if (isConnected) {
        hasBeenConnected = true;
        callback('CONNECTED', null);
      } else {
        if (hasBeenConnected) {
          callback('RECONNECTING', 'Connection to Firebase lost. Attempting to restore...');
        } else {
          callback('DISCONNECTED', 'Connecting to Firebase Realtime Database...');
        }
      }
    },
    (error) => {
      console.error('❌ [WEWOO Firebase] Connection listener error:', error);
      if (error.message.includes('PERMISSION_DENIED') || (error as any).code === 'PERMISSION_DENIED') {
        callback('PERMISSION_DENIED', 'Firebase Database Permission Denied. Check security rules.');
      } else {
        callback('DISCONNECTED', error.message);
      }
    }
  );

  return () => {
    off(connectedRef, 'value', unsubscribe);
  };
};
