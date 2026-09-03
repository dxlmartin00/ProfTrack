import type { ClassSession, SessionLog, InstructorProfile } from './db';
import { format } from 'date-fns';

export interface AccountSyncSnapshot {
  userId: string;
  username: string;
  updatedAt: number;             // Epoch milliseconds (e.g. 1756943820000)
  updatedAtReadable: string;     // e.g. "Sep 3, 2026, 9:25 PM"
  deviceId: string;              // e.g. "dev_chrome_win_a8f9"
  deviceLabel: string;           // "Laptop (Windows)" or "Phone (Mobile)"
  classes: ClassSession[];
  logs: (SessionLog & { classInfo: ClassSession })[];
  profile: InstructorProfile;
  version: number;
}

const DEVICE_ID_KEY = 'proftrack_device_id';

/**
 * Generates or retrieves a persistent unique Device ID for this browser instance.
 */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      const rand = Math.random().toString(36).substring(2, 8);
      const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      id = `dev_${isMobile ? 'phone' : 'pc'}_${rand}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'dev_unknown_browser';
  }
}

/**
 * Returns a human-friendly description of the current device.
 */
export function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Desktop Device';
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  const isMac = /Macintosh|Mac OS/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isLinux = /Linux/i.test(ua);

  let os = 'Device';
  if (isWindows) os = 'Windows';
  else if (isMac) os = 'Mac';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
  else if (isLinux) os = 'Linux';

  return isMobile ? `Smartphone / Tablet (${os})` : `Laptop / PC (${os})`;
}

/**
 * Retrieves the timestamp of the last update on this device for the user.
 */
export function getUserLastUpdated(userId: string): number {
  try {
    const raw = localStorage.getItem(`proftrack_sync_time_${userId}`);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // Fallback
  }
  return 0;
}

/**
 * Sets the last update timestamp for the user on this device.
 */
export function setUserLastUpdated(userId: string, timestamp = Date.now()): number {
  try {
    localStorage.setItem(`proftrack_sync_time_${userId}`, timestamp.toString());
  } catch (err) {
    console.error('Failed to save user sync timestamp:', err);
  }
  return timestamp;
}

/**
 * Creates a complete snapshot of the user's current data state.
 */
export function createAccountSyncSnapshot(
  userId: string,
  username: string,
  classes: ClassSession[],
  logs: (SessionLog & { classInfo: ClassSession })[],
  profile: InstructorProfile,
  timestamp = Date.now()
): AccountSyncSnapshot {
  return {
    userId,
    username,
    updatedAt: timestamp,
    updatedAtReadable: format(new Date(timestamp), 'MMM d, yyyy h:mm a'),
    deviceId: getDeviceId(),
    deviceLabel: getDeviceLabel(),
    classes,
    logs,
    profile,
    version: 2,
  };
}

/**
 * Evaluates conflict resolution between local data and incoming remote data.
 * Rule: "Latest Updated Device Wins"
 */
export function resolveSyncConflict(
  localSnapshot: AccountSyncSnapshot,
  incomingSnapshot: AccountSyncSnapshot
): {
  winner: AccountSyncSnapshot;
  isIncomingNewer: boolean;
  timeDiffMinutes: number;
  message: string;
} {
  const localTime = localSnapshot.updatedAt || 0;
  const incomingTime = incomingSnapshot.updatedAt || 0;
  const diffMs = incomingTime - localTime;
  const timeDiffMinutes = Math.round(Math.abs(diffMs) / 60000);

  if (diffMs > 1000) {
    // Incoming data from the other device is newer!
    return {
      winner: incomingSnapshot,
      isIncomingNewer: true,
      timeDiffMinutes,
      message: `Updated with latest changes from ${incomingSnapshot.deviceLabel} (${incomingSnapshot.updatedAtReadable}).`,
    };
  } else if (diffMs < -1000) {
    // Current device is newer!
    return {
      winner: localSnapshot,
      isIncomingNewer: false,
      timeDiffMinutes,
      message: `Current device has newer data (${localSnapshot.updatedAtReadable}) than incoming update (${incomingSnapshot.updatedAtReadable}).`,
    };
  }

  // Same timestamp or within 1 second
  return {
    winner: localSnapshot,
    isIncomingNewer: false,
    timeDiffMinutes: 0,
    message: 'Data is already up to date.',
  };
}
