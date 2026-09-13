import { getToken } from 'firebase/messaging';
import { messaging, isFirebaseConfigured } from '../lib/firebase';
import { saveFCMToken } from './db';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

const SOUND_PREF_KEY = 'proftrack_sound_enabled';

export const isNotificationSoundEnabled = (): boolean => {
  try {
    const saved = localStorage.getItem(SOUND_PREF_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
};

export const setNotificationSoundEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(SOUND_PREF_KEY, String(enabled));
  } catch {
    // Ignore localStorage errors
  }
};

/**
 * Synthesizes a clean, pleasant two-tone chime via Web Audio API.
 * Works 100% offline without external audio files or network requests.
 */
export const playNotificationChime = (): void => {
  if (!isNotificationSoundEnabled()) return;

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Tone 2: A5 (880 Hz) harmonic chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.22, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);
  } catch (err) {
    console.debug('Web Audio chime could not play:', err);
  }
};

/**
 * Triggers mobile device haptic vibration if supported.
 */
export const triggerNotificationVibration = (): void => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch {
    // Ignore unsupported
  }
};

/**
 * Returns the current notification permission state.
 */
export const getNotificationPermissionStatus = (): NotificationPermissionState => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
};

/**
 * Registers and returns the active VitePWA service worker.
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      return await navigator.serviceWorker.ready;
    } catch {
      return null;
    }
  }
  return null;
};

export interface PermissionResult {
  granted: boolean;
  status: NotificationPermissionState;
  error?: string;
}

/**
 * Requests browser notification permission with complete diagnostics.
 */
export const requestNotificationPermission = async (userId: string = 'inst1'): Promise<PermissionResult> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      granted: false,
      status: 'unsupported',
      error: 'This browser does not support web notifications.'
    };
  }

  // If already denied, browser will NOT show a prompt again
  if (Notification.permission === 'denied') {
    return {
      granted: false,
      status: 'denied',
      error: 'Notifications are blocked in your browser settings. Please allow notifications in site permissions.'
    };
  }

  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';

    if (granted && isFirebaseConfigured) {
      try {
        const msg = await messaging();
        if (msg) {
          const registration = await navigator.serviceWorker?.ready;
          const currentToken = await getToken(msg, {
            serviceWorkerRegistration: registration
          });
          if (currentToken) {
            await saveFCMToken(userId, currentToken);
          }
        }
      } catch (fcmErr) {
        console.debug('FCM registration skipped or offline:', fcmErr);
      }
    }

    return {
      granted,
      status: permission as NotificationPermissionState
    };
  } catch (err: unknown) {
    console.error('Error requesting notification permission:', err);
    return {
      granted: false,
      status: Notification.permission as NotificationPermissionState,
      error: (err as Error)?.message || 'Failed to request notification permission.'
    };
  }
};

export interface LocalNotificationOptions extends NotificationOptions {
  playChime?: boolean;
  vibrate?: boolean;
}

/**
 * Robust cross-platform local notification dispatcher.
 * Handles desktop, Android (via ServiceWorker to prevent Illegal Constructor errors),
 * and provides audio chime + vibration.
 */
export const sendLocalNotification = async (
  title: string,
  options?: LocalNotificationOptions
): Promise<boolean> => {
  // 1. Play sound chime & vibration
  if (options?.playChime !== false) {
    playNotificationChime();
  }
  if (options?.vibrate !== false) {
    triggerNotificationVibration();
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions: NotificationOptions = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    ...options
  };

  // 2. Primary Method: Use ServiceWorker showNotification.
  // This is required on Android Chrome/Edge (new Notification() throws Illegal Constructor)
  // and is the modern W3C standard for PWAs.
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 800))
      ]);

      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }

      // Check if any registrations are already active
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations && registrations.length > 0) {
        await registrations[0].showNotification(title, notificationOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('ServiceWorker showNotification failed, trying fallback:', swErr);
    }
  }

  // 3. Fallback Method: Desktop new Notification constructor
  try {
    new Notification(title, notificationOptions);
    return true;
  } catch (nativeErr) {
    console.warn('Desktop Notification constructor failed:', nativeErr);
  }

  return false;
};
