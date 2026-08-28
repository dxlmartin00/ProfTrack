import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

// Check if a real custom Firebase API key is configured
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
export const isFirebaseConfigured = Boolean(apiKey && !apiKey.includes('Placeholder'));

const firebaseConfig = {
  apiKey: apiKey || "AIzaSyPlaceholderKeyForFirebaseApp",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "instructor-pwa-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "instructor-pwa-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "instructor-pwa-demo.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abc123def456ghi789jkl0"
};

// Only initialize Firebase if real credentials are provided
const app = isFirebaseConfigured 
  ? (getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

export const auth = app ? getAuth(app) : null;

// Initialize Firestore only if real config is available
export const db = app ? initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}) : null;

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
