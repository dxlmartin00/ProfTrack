import { getToken } from 'firebase/messaging';
import { messaging } from '../lib/firebase';
import { saveFCMToken } from './db';

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered with scope:', registration.scope);
      return registration;
    } catch (err) {
      console.error('Service Worker registration failed:', err);
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
      console.log('Notification permission granted.');
      
      const msg = await messaging();
      if (msg) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const currentToken = await getToken(msg, { 
            vapidKey: 'YOUR_PUBLIC_VAPID_KEY_HERE',
            serviceWorkerRegistration: registration
          });
          if (currentToken) {
            console.log('FCM Token generated:', currentToken);
            await saveFCMToken(userId, currentToken);
          }
        } catch (err) {
          console.warn('FCM token retrieval notice (offline or unconfigured VAPID):', err);
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
          icon: '/vite.svg',
          badge: '/vite.svg',
          ...options
        });
      });
    } else {
      new Notification(title, {
        icon: '/vite.svg',
        ...options
      });
    }
  }
};
