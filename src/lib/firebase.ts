import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

// Use placeholder configuration for now
const firebaseConfig = {
  apiKey: "AIzaSyPlaceholderKeyForFirebaseApp",
  authDomain: "instructor-pwa-demo.firebaseapp.com",
  projectId: "instructor-pwa-demo",
  storageBucket: "instructor-pwa-demo.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789jkl0"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Initialize Firestore with offline persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Setup Messaging (only works on supported browsers/contexts)
export const messaging = async () => {
  const supported = await isSupported();
  if (supported) {
    return getMessaging(app);
  }
  return null;
};
