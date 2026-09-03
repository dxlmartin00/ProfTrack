export type UserRole = 'admin' | 'instructor';
export type AccountStatus = 'approved' | 'pending' | 'rejected';

export interface UserAccount {
  id: string;
  username: string; // formatted as <lastname>.<firstname>
  pin: string;      // 4-digit PIN (default "1234")
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

// Default Dedicated Master Administrator Account (Only job is managing accounts, not classes)
export const DEFAULT_ADMIN_ACCOUNT: UserAccount = {
  id: 'usr_sys_admin',
  username: 'admin.admin',
  pin: '0000',
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
  pin: '1234',
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
 * Retrieves all registered users from storage.
 */
export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
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

  // Ensure master admin account (admin.admin / 0000) exists and is admin
  const adminIdx = users.findIndex(u => u.username === DEFAULT_ADMIN_ACCOUNT.username);
  if (adminIdx === -1) {
    users = [DEFAULT_ADMIN_ACCOUNT, ...users];
  } else {
    users[adminIdx].role = 'admin';
    users[adminIdx].status = 'approved';
    if (!users[adminIdx].pin) users[adminIdx].pin = '0000';
  }

  // Ensure Dan Martin (martin.dan) exists and is a normal instructor account
  const danIdx = users.findIndex(u => u.username === DAN_MARTIN_ACCOUNT.username);
  if (danIdx === -1) {
    users = [...users, DAN_MARTIN_ACCOUNT];
  } else {
    // Explicitly convert Dan Martin to normal instructor account
    users[danIdx].role = 'instructor';
    users[danIdx].status = 'approved';
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
 */
export function authenticateUser(
  username: string,
  pin: string
): { success: boolean; user?: UserAccount; error?: string } {
  const users = getStoredUsers();
  const normalizedUsername = username.toLowerCase().trim();
  const cleanPin = pin.trim();

  const user = users.find(u => u.username === normalizedUsername);
  if (!user) {
    return { success: false, error: `Account "${normalizedUsername}" not found.` };
  }

  if (user.pin !== cleanPin) {
    return { success: false, error: 'Incorrect 4-digit PIN. Please try again.' };
  }

  if (user.status === 'pending') {
    return { 
      success: false, 
      error: 'Your account is currently pending administrator approval. Please ask the administrator to approve your account.' 
    };
  }

  if (user.status === 'rejected') {
    return { 
      success: false, 
      error: 'This account has been deactivated or rejected by the administrator.' 
    };
  }

  // Update last login
  user.lastLogin = new Date().toISOString();
  saveStoredUsers(users);
  localStorage.setItem(CURRENT_USER_SESSION_KEY, user.id);

  return { success: true, user };
}

/**
 * Registers a new instructor account with status "pending".
 */
export function registerInstructor(data: {
  firstName: string;
  lastName: string;
  department?: string;
  institution?: string;
  pin?: string;
}): { success: boolean; user?: UserAccount; error?: string } {
  const users = getStoredUsers();
  const username = formatUsername(data.lastName, data.firstName);
  const pin = (data.pin && data.pin.trim().length === 4) ? data.pin.trim() : '1234';

  if (!data.firstName.trim() || !data.lastName.trim()) {
    return { success: false, error: 'Please enter both your first and last name.' };
  }

  if (users.some(u => u.username === username)) {
    return { 
      success: false, 
      error: `An instructor with the username "${username}" already exists.` 
    };
  }

  const cleanFirstName = data.firstName.trim();
  const cleanLastName = data.lastName.trim();

  const newUser: UserAccount = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username,
    pin,
    firstName: cleanFirstName,
    lastName: cleanLastName,
    fullName: `Prof. ${cleanFirstName} ${cleanLastName}`,
    department: data.department?.trim() || 'College of Computer Studies',
    institution: data.institution?.trim() || 'University of Makati',
    role: 'instructor',
    status: 'pending', // Requires admin approval
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, newUser];
  saveStoredUsers(updatedUsers);

  return { success: true, user: newUser };
}

/**
 * Admin action: Approve, Reject, or set Pending status for an instructor account.
 */
export function updateUserStatus(userId: string, status: AccountStatus): boolean {
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
 */
export function resetUserPin(userId: string, newPin = '1234'): boolean {
  const users = getStoredUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return false;

  users[idx].pin = newPin;
  saveStoredUsers(users);
  return true;
}

/**
 * Admin action: Delete instructor account and clean isolated storage.
 */
export function deleteUser(userId: string): boolean {
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
    const coursesCount = classesRaw ? JSON.parse(classesRaw).length : 0;
    const logsCount = logsRaw ? JSON.parse(logsRaw).length : 0;
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
