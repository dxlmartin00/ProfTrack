import { getToken } from 'firebase/messaging';
import { messaging } from '../lib/firebase';
import { saveFCMToken } from './db';

// ProfTrack uses VitePWA's /sw.js. No competing service workers.
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      return registration;
    } catch {
      return null;
    }
  }
  return null;
};

export const requestNotificationPermission = async (userId: string = 'inst1'): Promise<boolean> => {
  if (!('Notification' in window)) {
    alert('This browser does not support desktop notifications.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const msg = await messaging();
      if (msg) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const currentToken = await getToken(msg, { 
            vapidKey: 'YOUR_PUBLIC_VAPID_KEY_HERE',
            serviceWorkerRegistration: registration
          });
          if (currentToken) {
            await saveFCMToken(userId, currentToken);
          }
        } catch {
          // Offline / local notice
        }
      }
      return true;
    }
  } catch (err) {
    console.error('Error requesting notification permission:', err);
  }
  return false;
};

export const sendLocalNotification = (title: string, options?: NotificationOptions) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          ...options
        });
      });
    } else {
      new Notification(title, {
        icon: '/favicon.svg',
        ...options
      });
    }
  }
};
