import { 
  hashPinWithSalt, 
  verifyPin, 
  generateSalt, 
  safeJsonParse, 
  sanitizeString 
} from '../utils/crypto';
import { 
  pushUserToCloud, 
  updateUserStatusInCloud, 
  resetUserPinInCloud, 
  deleteUserFromCloud, 
  fetchUsersFromCloud, 
  fetchUserByUsernameFromCloud,
  fetchTombstonesFromCloud,
  recordTombstoneInCloud,
  subscribeToUsersCloud 
} from './db';

export { subscribeToUsersCloud };

export type UserRole = 'admin' | 'instructor';
export type AccountStatus = 'approved' | 'pending' | 'rejected';

export interface UserAccount {
  id: string;
  username: string; // formatted as <lastname>.<firstname>
  pinHash: string;  // Salted SHA-256 cryptographic hash (never plaintext)
  salt: string;     // Cryptographically secure unique salt
  pin?: string;     // Transient field for legacy migration only
  firstName: string;
  lastName: string;
  fullName: string;
  department: string;
  institution: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  lastLogin?: string;
}

const USERS_STORAGE_KEY = 'proftrack_users_registry';
const CURRENT_USER_SESSION_KEY = 'proftrack_active_user_id';
const FAILED_ATTEMPTS_PREFIX = 'proftrack_sec_lockout_';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5-minute temporary security lockout

const ADMIN_INIT_SALT = 'proftrack_admin_salt_2026';
const DAN_INIT_SALT = 'proftrack_dan_salt_2026';

// Default Dedicated Master Administrator Account (Only job is managing accounts, not classes)
export const DEFAULT_ADMIN_ACCOUNT: UserAccount = {
  id: 'usr_sys_admin',
  username: 'admin.admin',
  salt: ADMIN_INIT_SALT,
  pinHash: hashPinWithSalt('0000', ADMIN_INIT_SALT),
  firstName: 'System',
  lastName: 'Admin',
  fullName: 'System Administrator',
  department: 'Academic Affairs & IT Administration',
  institution: 'University of Makati',
  role: 'admin',
  status: 'approved',
  createdAt: new Date('2026-01-01').toISOString(),
};

// Prof. Dan Martin (Normal Instructor Account)
export const DAN_MARTIN_ACCOUNT: UserAccount = {
  id: 'usr_martin_dan',
  username: 'martin.dan',
  salt: DAN_INIT_SALT,
  pinHash: hashPinWithSalt('1234', DAN_INIT_SALT),
  firstName: 'Dan',
  lastName: 'Martin',
  fullName: 'Prof. Dan Martin',
  department: 'College of Computer Studies',
  institution: 'University of Makati',
  role: 'instructor', // Normal instructor account
  status: 'approved',
  createdAt: new Date('2026-01-01').toISOString(),
};

/**
 * Normalizes strings and formats to <lastname>.<firstname> (all lowercase, special chars replaced)
 */
export function formatUsername(lastName: string, firstName: string): string {
  const cleanLast = lastName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

  const cleanFirst = firstName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

  return `${cleanLast || 'instructor'}.${cleanFirst || 'user'}`;
}

/**
 * Returns isolated storage keys for a specific user ID.
 */
export function getUserStorageKeys(userId: string) {
  return {
    classesKey: `proftrack_classes_${userId}`,
    logsKey: `proftrack_session_logs_${userId}`,
    profileKey: `proftrack_profile_${userId}`,
  };
}

export const DELETED_USERS_STORAGE_KEY = 'proftrack_deleted_users';

/**
 * Retrieves the list of user IDs or usernames that have been deleted.
 */
export function getLocalDeletedUsers(): string[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
    const parsed = raw ? safeJsonParse<string[]>(raw, []) : [];
    // Ensure Dan Martin is tracked if marked deleted or previously suppressed
    if (localStorage.getItem('proftrack_dan_martin_deleted') === 'true') {
      if (!parsed.includes('usr_martin_dan')) parsed.push('usr_martin_dan');
      if (!parsed.includes('martin.dan')) parsed.push('martin.dan');
    }
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Adds an identifier to local deleted users tombstone list.
 */
export function addLocalDeletedUser(identifier: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const current = new Set(getLocalDeletedUsers());
    current.add(identifier);
    localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {}
}

/**
 * Retrieves all registered users from storage with prototype-pollution protection and auto-upgrade to salted SHA-256.
 */
export function getStoredUsers(): UserAccount[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      if (raw) {
        const parsed = safeJsonParse<UserAccount[]>(raw, []);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deleted = new Set(getLocalDeletedUsers());
          const filtered = parsed.filter(u => !deleted.has(u.id) && !deleted.has(u.username));
          let upgraded = false;
          for (const u of filtered) {
            // Automatic cryptographic upgrade for legacy plaintext PINs
            if (!u.pinHash || !u.salt) {
              const rawPin = u.pin || (u.role === 'admin' ? '0000' : '1234');
              u.salt = generateSalt();
              u.pinHash = hashPinWithSalt(rawPin, u.salt);
              delete u.pin;
              upgraded = true;
            }
          }
          if (upgraded || filtered.length !== parsed.length) {
            saveStoredUsers(filtered);
          }
          return filtered;
        }
      }
    }
  } catch (err) {
    console.error('Failed to read users registry:', err);
  }
  return [DEFAULT_ADMIN_ACCOUNT];
}

/**
 * Merges two user lists safely, preserving master admin, deduping by user.id,
 * and adopting latest status / activity.
 */
export function mergeUsersRegistry(localUsers: UserAccount[], incomingUsers: UserAccount[]): UserAccount[] {
  const mergedMap = new Map<string, UserAccount>();

  // Ensure master admin is always intact
  mergedMap.set(DEFAULT_ADMIN_ACCOUNT.id, DEFAULT_ADMIN_ACCOUNT);

  for (const u of localUsers) {
    mergedMap.set(u.id, u);
  }

  for (const inc of incomingUsers) {
    if (inc.id === DEFAULT_ADMIN_ACCOUNT.id) continue;
    const existing = mergedMap.get(inc.id);
    if (!existing) {
      mergedMap.set(inc.id, inc);
    } else {
      const existingDate = existing.lastLogin || existing.createdAt || '1970-01-01';
      const incomingDate = inc.lastLogin || inc.createdAt || '1970-01-01';
      if (incomingDate >= existingDate || (existing.status === 'pending' && inc.status !== 'pending')) {
        mergedMap.set(inc.id, { ...existing, ...inc });
      }
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Bidirectionally synchronizes user accounts between local storage and Cloud Firestore.
 * 1. Pushes any local accounts created on this device that are missing in the cloud.
 * 2. Pulls all cloud registered accounts down to local storage.
 */
export async function syncUsersFromCloud(): Promise<UserAccount[]> {
  try {
    const [cloudUsers, cloudTombstones] = await Promise.all([
      fetchUsersFromCloud(),
      fetchTombstonesFromCloud()
    ]);

    // Consolidate tombstones from local storage and Cloud Firestore
    const localDeleted = getLocalDeletedUsers();
    const allTombstones = new Set([...localDeleted, ...cloudTombstones]);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(allTombstones)));
    }

    // Filter both local and remote users against the tombstones
    const currentStored = getStoredUsers().filter(u => !allTombstones.has(u.id) && !allTombstones.has(u.username));
    const validCloudUsers = cloudUsers.filter(u => !allTombstones.has(u.id) && !allTombstones.has(u.username));

    // 1. Two-way push: Any instructor account stored locally on this device that is NOT in Cloud Firestore
    // and is NOT deleted gets pushed to Cloud Firestore
    for (const localUser of currentStored) {
      if (localUser.id === DEFAULT_ADMIN_ACCOUNT.id) continue;
      if (allTombstones.has(localUser.id) || allTombstones.has(localUser.username)) continue;
      
      const inCloud = validCloudUsers.find(cu => cu.id === localUser.id || cu.username === localUser.username);
      if (!inCloud) {
        console.info(`[ProfTrack Sync] Pushing offline local account "${localUser.username}" to Cloud Firestore...`);
        try {
          await pushUserToCloud(localUser);
          validCloudUsers.push(localUser);
        } catch (pushErr) {
          console.warn(`Failed to push local user ${localUser.username} to cloud:`, pushErr);
        }
      }
    }

    // 2. Two-way pull: Merge all valid cloud accounts with local accounts
    const merged = mergeUsersRegistry(currentStored, validCloudUsers)
      .filter(u => !allTombstones.has(u.id) && !allTombstones.has(u.username));
    saveStoredUsers(merged);
    return merged;
  } catch (err) {
    console.debug('Bidirectional cloud users sync deferred:', err);
  }
  return getStoredUsers();
}

/**
 * Saves users registry to storage and broadcasts an update event.
 */
export function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('proftrack_accounts_updated', { detail: { users } }));
    }
  } catch (err) {
    console.error('Failed to save users registry:', err);
  }
}

/**
 * Initializes authentication registry and sets up Master Admin.
 * Note: Demo accounts like Dan Martin are never re-created or re-approved here.
 */
export function initializeAuth(): {
  currentUser: UserAccount | null;
  users: UserAccount[];
} {
  let users = getStoredUsers();

  // Ensure master admin account (admin.admin / 0000) exists and has correct hash
  const adminIdx = users.findIndex(u => u.username === DEFAULT_ADMIN_ACCOUNT.username);
  if (adminIdx === -1) {
    users = [DEFAULT_ADMIN_ACCOUNT, ...users];
  } else {
    users[adminIdx].role = 'admin';
    users[adminIdx].status = 'approved';
    if (!users[adminIdx].pinHash) {
      users[adminIdx].salt = ADMIN_INIT_SALT;
      users[adminIdx].pinHash = hashPinWithSalt('0000', ADMIN_INIT_SALT);
    }
    delete users[adminIdx].pin;
  }

  // Filter out any tombstoned accounts that might still exist in local storage
  const tombstones = new Set(getLocalDeletedUsers());
  if (tombstones.size > 0) {
    users = users.filter(u => !tombstones.has(u.id) && !tombstones.has(u.username));
  }

  saveStoredUsers(users);

  // Seamless zero-data-loss migration ONLY if Prof. Dan Martin is an active (non-deleted) user
  if (users.some(u => u.id === DAN_MARTIN_ACCOUNT.id)) {
    const danKeys = getUserStorageKeys(DAN_MARTIN_ACCOUNT.id);
    const existingClasses = localStorage.getItem('proftrack_classes_cache');
    const existingLogs = localStorage.getItem('proftrack_session_logs');
    const existingProfile = localStorage.getItem('proftrack_instructor_profile');

    if (existingClasses && !localStorage.getItem(danKeys.classesKey)) {
      localStorage.setItem(danKeys.classesKey, existingClasses);
    }
    if (existingLogs && !localStorage.getItem(danKeys.logsKey)) {
      localStorage.setItem(danKeys.logsKey, existingLogs);
    }
    if (existingProfile && !localStorage.getItem(danKeys.profileKey)) {
      localStorage.setItem(danKeys.profileKey, existingProfile);
    }
  }

  // Retrieve active session user
  const activeUserId = localStorage.getItem(CURRENT_USER_SESSION_KEY);
  let currentUser: UserAccount | null = null;
  if (activeUserId) {
    currentUser = users.find(u => u.id === activeUserId && u.status === 'approved') || null;
  }

  // Background Cloud Sync to pull any newly registered users from other devices
  syncUsersFromCloud().catch(err => console.debug('Initial cloud users fetch deferred:', err));

  return { currentUser, users };
}

/**
 * Authenticates an instructor or admin via Username and 4-digit PIN.
 * Features Salted SHA-256 validation, Cloud Firestore lookup fallback, and 5-attempt lockout.
 */
export async function authenticateUser(
  username: string,
  pin: string
): Promise<{ success: boolean; user?: UserAccount; error?: string; accountNotFound?: boolean }> {
  const normalizedUsername = sanitizeString(username, 50).toLowerCase().trim();
  const cleanPin = pin.trim();

  // 1. Check Brute-Force Rate Limiting & Temporary Lockout
  const lockoutKey = `${FAILED_ATTEMPTS_PREFIX}${normalizedUsername}`;
  let lockRecord: { attempts: number; lockedUntil?: number } = { attempts: 0 };
  try {
    const raw = sessionStorage.getItem(lockoutKey);
    if (raw) lockRecord = safeJsonParse(raw, { attempts: 0 });
  } catch {}

  if (lockRecord.lockedUntil && lockRecord.lockedUntil > Date.now()) {
    const waitSec = Math.ceil((lockRecord.lockedUntil - Date.now()) / 1000);
    const waitMin = Math.ceil(waitSec / 60);
    return {
      success: false,
      error: `Security Lockout: Too many failed login attempts. Please wait ${waitMin} minute(s) before trying again.`
    };
  }

  let users = getStoredUsers();
  let user = users.find(u => u.username === normalizedUsername);
  
  // If not found in local storage OR if locally marked as pending, check Cloud Firestore!
  // This enables accounts registered on a phone or approved by an admin to sync instantly.
  if (!user || user.status === 'pending') {
    try {
      const cloudUser = await fetchUserByUsernameFromCloud(normalizedUsername);
      if (cloudUser) {
        users = mergeUsersRegistry(users, [cloudUser]);
        saveStoredUsers(users);
        user = cloudUser;
      }
    } catch (cloudErr) {
      console.debug('Cloud user lookup deferred:', cloudErr);
    }
  }

  // Generic response to prevent user enumeration, but flag accountNotFound so UI can offer registration
  if (!user) {
    return { 
      success: false, 
      error: `Account "${normalizedUsername}" not found. If this is a new instructor, please create an account first.`,
      accountNotFound: true
    };
  }

  // 2. Cryptographic Salted SHA-256 Verification
  let isMatch = false;
  if (user.pinHash && user.salt) {
    isMatch = verifyPin(cleanPin, user.salt, user.pinHash);
  } else if (user.pin) {
    isMatch = user.pin === cleanPin;
    if (isMatch) {
      user.salt = generateSalt();
      user.pinHash = hashPinWithSalt(cleanPin, user.salt);
      delete user.pin;
      saveStoredUsers(users);
    }
  }

  if (!isMatch) {
    lockRecord.attempts = (lockRecord.attempts || 0) + 1;
    if (lockRecord.attempts >= MAX_FAILED_ATTEMPTS) {
      lockRecord.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      try {
        sessionStorage.setItem(lockoutKey, JSON.stringify(lockRecord));
      } catch {}
      return {
        success: false,
        error: 'Security Lockout: 5 failed attempts reached. Account locked for 5 minutes.'
      };
    }
    try {
      sessionStorage.setItem(lockoutKey, JSON.stringify(lockRecord));
    } catch {}
    const remaining = MAX_FAILED_ATTEMPTS - lockRecord.attempts;
    return {
      success: false,
      error: `Incorrect credentials. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout)`
    };
  }

  // Clear failed attempts counter on successful PIN verification
  try {
    sessionStorage.removeItem(lockoutKey);
  } catch {}

  if (user.status === 'pending') {
    return { 
      success: false, 
      error: 'Your instructor account is currently pending administrator approval.' 
    };
  }

  if (user.status === 'rejected') {
    return { 
      success: false, 
      error: 'This instructor account has been deactivated by the administrator.' 
    };
  }

  // Update last login
  user.lastLogin = new Date().toISOString();
  saveStoredUsers(users);
  localStorage.setItem(CURRENT_USER_SESSION_KEY, user.id);

  return { success: true, user };
}

/**
 * Registers a new instructor account with status "pending" and salted SHA-256 hash.
 */
export async function registerInstructor(data: {
  firstName: string;
  lastName: string;
  department?: string;
  institution?: string;
  pin?: string;
}): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const users = getStoredUsers();
  const cleanFirstName = sanitizeString(data.firstName, 40);
  const cleanLastName = sanitizeString(data.lastName, 40);
  const cleanDept = sanitizeString(data.department || 'College of Computer Studies', 80);
  const cleanInst = sanitizeString(data.institution || 'North Eastern Mindanao State University', 80);

  if (!cleanFirstName || !cleanLastName) {
    return { success: false, error: 'Please enter both your first and last name.' };
  }

  const username = formatUsername(cleanLastName, cleanFirstName);
  if (users.some(u => u.username === username)) {
    return { 
      success: false, 
      error: `An instructor with the username "${username}" already exists.` 
    };
  }

  // Clear deletion tombstone if reviving
  if (username === DAN_MARTIN_ACCOUNT.username) {
    localStorage.removeItem('proftrack_dan_martin_deleted');
  }

  const rawPin = (data.pin && data.pin.trim().length === 4) ? data.pin.trim() : '1234';
  const salt = generateSalt();
  const pinHash = hashPinWithSalt(rawPin, salt);

  const newUser: UserAccount = {
    id: `usr_${Date.now()}_${generateSalt(4)}`,
    username,
    salt,
    pinHash,
    firstName: cleanFirstName,
    lastName: cleanLastName,
    fullName: `Prof. ${cleanFirstName} ${cleanLastName}`,
    department: cleanDept,
    institution: cleanInst,
    role: 'instructor',
    status: 'pending', // Requires admin approval
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, newUser];
  saveStoredUsers(updatedUsers);

  // Sync newly registered user to Cloud Firestore
  try {
    await pushUserToCloud(newUser);
  } catch (err) {
    console.debug('Cloud user registration sync deferred:', err);
  }

  return { success: true, user: newUser };
}

/**
 * Verifies that the administrative action is authorized by an approved administrator.
 */
export function verifyAdminSession(callerId?: string): boolean {
  try {
    const users = getStoredUsers();
    // 1. Direct caller verification (from React component holding authenticated user state)
    if (callerId) {
      const caller = users.find(u => u.id === callerId);
      if (caller && caller.role === 'admin' && caller.status === 'approved') {
        return true;
      }
    }
    // 2. Active stored session verification
    const activeUserId = localStorage.getItem(CURRENT_USER_SESSION_KEY);
    if (activeUserId) {
      const current = users.find(u => u.id === activeUserId);
      if (current && current.role === 'admin' && current.status === 'approved') {
        return true;
      }
    }
    // 3. Fallback: if caller matches master admin ID
    if (callerId === DEFAULT_ADMIN_ACCOUNT.id || activeUserId === DEFAULT_ADMIN_ACCOUNT.id) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Admin action: Approve, Reject, or set Pending status for an instructor account.
 */
export async function updateUserStatus(
  userId: string, 
  status: AccountStatus,
  callerId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!verifyAdminSession(callerId)) {
    console.warn('Unauthorized administrative action rejected.');
    return { success: false, error: 'Unauthorized: Administrator permission required.' };
  }

  const users = getStoredUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) {
    return { success: false, error: 'User account not found.' };
  }

  // Protect master admin from being deactivated
  if (users[idx].role === 'admin' && status !== 'approved') {
    return { success: false, error: 'Cannot deactivate the master administrator.' };
  }

  users[idx].status = status;
  saveStoredUsers(users);

  // Sync status update to Cloud Firestore
  try {
    await updateUserStatusInCloud(userId, status);
  } catch (err) {
    console.debug('Cloud user status sync deferred:', err);
  }

  return { success: true };
}

/**
 * Admin action: Reset instructor PIN (defaults back to "1234").
 */
export async function resetUserPin(
  userId: string, 
  newPin = '1234',
  callerId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!verifyAdminSession(callerId)) {
    console.warn('Unauthorized administrative action rejected.');
    return { success: false, error: 'Unauthorized: Administrator permission required.' };
  }

  const users = getStoredUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) {
    return { success: false, error: 'User account not found.' };
  }

  const newSalt = generateSalt();
  const pinHash = hashPinWithSalt(newPin, newSalt);
  users[idx].salt = newSalt;
  users[idx].pinHash = pinHash;
  delete users[idx].pin; // Ensure no plaintext PIN remains

  saveStoredUsers(users);

  // Sync PIN reset to Cloud Firestore
  try {
    await resetUserPinInCloud(userId, newSalt, pinHash);
  } catch (err) {
    console.debug('Cloud PIN reset sync deferred:', err);
  }

  return { success: true };
}

/**
 * Admin action: Delete instructor account and clean isolated storage.
 */
export async function deleteUser(
  userId: string,
  callerId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!verifyAdminSession(callerId)) {
    console.warn('Unauthorized administrative action rejected.');
    return { success: false, error: 'Unauthorized: Administrator permission required.' };
  }

  const users = getStoredUsers();
  const target = users.find(u => u.id === userId);
  if (!target) {
    return { success: false, error: 'Account was not found or has already been removed.' };
  }
  if (target.role === 'admin') {
    return { success: false, error: 'The Master Administrator account cannot be deleted.' };
  }

  const updated = users.filter(u => u.id !== userId);
  saveStoredUsers(updated);

  // Record tombstones locally to immediately prevent resurrection
  addLocalDeletedUser(userId);
  if (target.username) {
    addLocalDeletedUser(target.username);
  }

  // If Dan Martin was explicitly deleted, permanently tombstone all identifiers
  if (target.username === DAN_MARTIN_ACCOUNT.username || userId === DAN_MARTIN_ACCOUNT.id) {
    addLocalDeletedUser('usr_martin_dan');
    addLocalDeletedUser('martin.dan');
    localStorage.setItem('proftrack_dan_martin_deleted', 'true');
  }

  // Sync deletion to Cloud Firestore (removes users doc, user_sync snapshot, and writes cloud tombstone)
  try {
    await deleteUserFromCloud(userId);
    if (target.username && target.username !== userId) {
      await recordTombstoneInCloud(target.username);
    }
  } catch (err) {
    console.debug('Cloud user deletion sync deferred:', err);
  }

  // Clean isolated storage
  const keys = getUserStorageKeys(userId);
  localStorage.removeItem(keys.classesKey);
  localStorage.removeItem(keys.logsKey);
  localStorage.removeItem(keys.profileKey);

  return { success: true };
}

/**
 * Retrieves the count of courses and logs stored for an instructor.
 */
export function getUserDataCounts(userId: string): { coursesCount: number; logsCount: number } {
  try {
    const keys = getUserStorageKeys(userId);
    const classesRaw = localStorage.getItem(keys.classesKey);
    const logsRaw = localStorage.getItem(keys.logsKey);
    const coursesCount = classesRaw ? safeJsonParse<any[]>(classesRaw, []).length : 0;
    const logsCount = logsRaw ? safeJsonParse<any[]>(logsRaw, []).length : 0;
    return { coursesCount, logsCount };
  } catch {
    return { coursesCount: 0, logsCount: 0 };
  }
}

/**
 * Logs out the active user session.
 */
export function logoutUser(): void {
  localStorage.removeItem(CURRENT_USER_SESSION_KEY);
}
