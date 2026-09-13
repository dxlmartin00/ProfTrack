import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

// Load Firebase configuration strictly from environment variables (.env)
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || '';
export const isFirebaseConfigured = Boolean(apiKey && !apiKey.includes('Placeholder') && apiKey.length > 10);

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Only initialize Firebase if real credentials are provided
const app = isFirebaseConfigured 
  ? (getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

export const auth = app ? getAuth(app) : null;

// Initialize Firestore
export const db = app ? getFirestore(app) : null;

// Setup Messaging
export const messaging = async () => {
  if (!app) return null;
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch {
    // Unsupported
  }
  return null;
};
