import { 
  hashPinWithSalt, 
  verifyPin, 
  generateSalt, 
  safeJsonParse, 
  sanitizeString 
} from '../utils/crypto';

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

/**
 * Retrieves all registered users from storage with prototype-pollution protection and auto-upgrade to salted SHA-256.
 */
export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = safeJsonParse<UserAccount[]>(raw, []);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let upgraded = false;
        for (const u of parsed) {
          // Automatic cryptographic upgrade for legacy plaintext PINs
          if (!u.pinHash || !u.salt) {
            const rawPin = u.pin || (u.role === 'admin' ? '0000' : '1234');
            u.salt = generateSalt();
            u.pinHash = hashPinWithSalt(rawPin, u.salt);
            delete u.pin;
            upgraded = true;
          }
        }
        if (upgraded) {
          saveStoredUsers(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read users registry:', err);
  }
  return [DEFAULT_ADMIN_ACCOUNT, DAN_MARTIN_ACCOUNT];
}

/**
 * Saves users registry to storage.
 */
export function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users registry:', err);
  }
}

/**
 * Initializes authentication registry and performs zero-data-loss migration for Dan Martin and System Admin.
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

  // Ensure Dan Martin (martin.dan) exists and is a normal instructor account
  const danIdx = users.findIndex(u => u.username === DAN_MARTIN_ACCOUNT.username);
  if (danIdx === -1) {
    users = [...users, DAN_MARTIN_ACCOUNT];
  } else {
    // Explicitly convert Dan Martin to normal instructor account
    users[danIdx].role = 'instructor';
    users[danIdx].status = 'approved';
    if (!users[danIdx].pinHash) {
      users[danIdx].salt = DAN_INIT_SALT;
      users[danIdx].pinHash = hashPinWithSalt('1234', DAN_INIT_SALT);
    }
    delete users[danIdx].pin;
  }

  saveStoredUsers(users);

  // Seamless zero-data-loss migration for Prof. Dan Martin's existing data
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

  // Retrieve active session user
  const activeUserId = localStorage.getItem(CURRENT_USER_SESSION_KEY);
  let currentUser: UserAccount | null = null;
  if (activeUserId) {
    currentUser = users.find(u => u.id === activeUserId && u.status === 'approved') || null;
  }

  // If initial run or no session, default to Dan Martin (Instructor) so timetable displays immediately
  if (!currentUser && !localStorage.getItem('proftrack_auth_initialized_flag_v2')) {
    currentUser = DAN_MARTIN_ACCOUNT;
    localStorage.setItem(CURRENT_USER_SESSION_KEY, DAN_MARTIN_ACCOUNT.id);
    localStorage.setItem('proftrack_auth_initialized_flag_v2', 'true');
  }

  return { currentUser, users };
}

/**
 * Authenticates an instructor or admin via Username and 4-digit PIN.
 * Features Salted SHA-256 validation and 5-attempt brute-force lockout protection.
 */
export function authenticateUser(
  username: string,
  pin: string
): { success: boolean; user?: UserAccount; error?: string } {
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

  const users = getStoredUsers();
  const user = users.find(u => u.username === normalizedUsername);
  
  // Generic response to prevent user enumeration
  if (!user) {
    return { success: false, error: 'Invalid username or 4-digit PIN.' };
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
      error: `Invalid credentials. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout)`
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
export function registerInstructor(data: {
  firstName: string;
  lastName: string;
  department?: string;
  institution?: string;
  pin?: string;
}): { success: boolean; user?: UserAccount; error?: string } {
  const users = getStoredUsers();
  const cleanFirstName = sanitizeString(data.firstName, 40);
  const cleanLastName = sanitizeString(data.lastName, 40);
  const cleanDept = sanitizeString(data.department || 'College of Computer Studies', 80);
  const cleanInst = sanitizeString(data.institution || 'University of Makati', 80);

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

  return { success: true, user: newUser };
}

/**
 * Verifies that the currently active session belongs to an approved administrator.
 */
export function verifyAdminSession(): boolean {
  try {
    const activeUserId = localStorage.getItem(CURRENT_USER_SESSION_KEY);
    if (!activeUserId) return false;
    const users = getStoredUsers();
    const current = users.find(u => u.id === activeUserId);
    return !!current && current.role === 'admin' && current.status === 'approved';
  } catch {
    return false;
  }
}

/**
 * Admin action: Approve, Reject, or set Pending status for an instructor account.
 * Requires an active approved administrator session.
 */
export function updateUserStatus(userId: string, status: AccountStatus): boolean {
  if (!verifyAdminSession()) {
    console.warn('Unauthorized administrative action rejected.');
    return false;
  }

  const users = getStoredUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return false;

  // Protect master admin from being deactivated
  if (users[idx].role === 'admin' && status !== 'approved') {
    return false;
  }

  users[idx].status = status;
  saveStoredUsers(users);
  return true;
}

/**
 * Admin action: Reset instructor PIN (defaults back to "1234").
 * Hashes the new PIN with a new unique cryptographic salt.
 */
export function resetUserPin(userId: string, newPin = '1234'): boolean {
  if (!verifyAdminSession()) {
    console.warn('Unauthorized administrative action rejected.');
    return false;
  }

  const users = getStoredUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return false;

  const newSalt = generateSalt();
  users[idx].salt = newSalt;
  users[idx].pinHash = hashPinWithSalt(newPin, newSalt);
  delete users[idx].pin; // Ensure no plaintext PIN remains

  saveStoredUsers(users);
  return true;
}

/**
 * Admin action: Delete instructor account and clean isolated storage.
 */
export function deleteUser(userId: string): boolean {
  if (!verifyAdminSession()) {
    console.warn('Unauthorized administrative action rejected.');
    return false;
  }

  const users = getStoredUsers();
  const target = users.find(u => u.id === userId);
  if (!target || target.role === 'admin') return false; // Never delete master admin

  const updated = users.filter(u => u.id !== userId);
  saveStoredUsers(updated);

  // Clean isolated storage
  const keys = getUserStorageKeys(userId);
  localStorage.removeItem(keys.classesKey);
  localStorage.removeItem(keys.logsKey);
  localStorage.removeItem(keys.profileKey);

  return true;
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
