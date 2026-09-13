import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  deleteDoc,
  updateDoc, 
  query, 
  where, 
  serverTimestamp,
  arrayUnion,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AccountSyncSnapshot } from './sync';
import type { UserAccount, AccountStatus } from './auth';

export type ScheduleType = 'Lecture' | 'Laboratory' | 'Tutorial' | 'Discussion';

export interface ClassSchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  type: ScheduleType; // "Lecture" or "Laboratory"
  room?: string;     // e.g. "Room 302" or "ComLab 4"
}

export interface ClassSession {
  id: string;
  instructorId: string;
  subjectCode: string;
  subjectTitle?: string;
  section: string;
  year: string;
  room?: string; // Default room if not specified per schedule
  schedule: ClassSchedule[];
  masterSyllabus: string[];
}

export interface SessionLog {
  id?: string;
  date: Date;
  sessionType?: ScheduleType;
  topicsCovered: string[];
  nextActions: string;
  engagementLevel: string; // "Low", "Medium", "High"
}

export interface InstructorProfile {
  fullName: string;
  position: string;
  department: string;
  institution: string;
  email?: string;
  employeeId?: string;
}

export const DEFAULT_INSTRUCTOR_PROFILE: InstructorProfile = {
  fullName: 'Faculty Member',
  position: 'Faculty Instructor',
  department: 'College of Computer Studies',
  institution: 'North Eastern Mindanao State University',
  email: 'faculty@nemsu.edu.ph',
  employeeId: 'NEMSU-FACULTY'
};

// Timeout helper to prevent hanging when offline or unconfigured
const withTimeout = <T>(promise: Promise<T>, timeoutMs = 8000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timed out, using local offline persistence')), timeoutMs)
    )
  ]);
};

export const saveFCMToken = async (userId: string, token: string): Promise<void> => {
  if (!db) return;
  try {
    const userRef = doc(db, 'users', userId);
    await withTimeout(setDoc(userRef, {
      fcmTokens: arrayUnion(token)
    }, { merge: true }));
  } catch (err) {
    console.warn('FCM token save notice (offline mode):', err);
  }
};

export const addClass = async (classData: Omit<ClassSession, 'id'>): Promise<string> => {
  if (!db) {
    return 'class_' + Date.now();
  }
  const newClassRef = doc(collection(db, 'classes'));
  try {
    await withTimeout(setDoc(newClassRef, classData));
    return newClassRef.id;
  } catch (err) {
    console.warn('Cloud sync deferred (offline local mode):', err);
    return newClassRef.id;
  }
};

export const updateClass = async (classId: string, classData: Partial<Omit<ClassSession, 'id'>>): Promise<void> => {
  if (!db) return;
  try {
    const classRef = doc(db, 'classes', classId);
    await withTimeout(updateDoc(classRef, classData));
  } catch (err) {
    console.warn('Cloud update deferred (offline local mode):', err);
  }
};

export const deleteClass = async (classId: string): Promise<void> => {
  if (!db) return;
  try {
    const classRef = doc(db, 'classes', classId);
    await withTimeout(deleteDoc(classRef));
  } catch (err) {
    console.warn('Cloud delete deferred (offline local mode):', err);
  }
};

export const getAllClasses = async (instructorId: string): Promise<ClassSession[]> => {
  if (!db) return [];
  try {
    const classesRef = collection(db, 'classes');
    const q = query(classesRef, where('instructorId', '==', instructorId));
    const snapshot = await withTimeout(getDocs(q));
    
    const classes: ClassSession[] = [];
    snapshot.forEach(docSnap => {
      classes.push({ id: docSnap.id, ...(docSnap.data() as Omit<ClassSession, 'id'>) });
    });
    return classes;
  } catch (err) {
    console.warn('Failed to fetch classes from cloud, relying on local cache:', err);
    return [];
  }
};

export const getTodayClasses = async (instructorId: string): Promise<ClassSession[]> => {
  if (!db) return [];
  const today = new Date().getDay(); // 0-6
  try {
    const classesRef = collection(db, 'classes');
    const q = query(classesRef, where('instructorId', '==', instructorId));
    const snapshot = await withTimeout(getDocs(q));
    
    const todayClasses: ClassSession[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Omit<ClassSession, 'id'>;
      const hasToday = data.schedule.some(s => s.dayOfWeek === today);
      if (hasToday) {
        todayClasses.push({ id: docSnap.id, ...data });
      }
    });
    return todayClasses;
  } catch (err) {
    console.warn('Failed to fetch today classes from cloud, relying on local cache:', err);
    return [];
  }
};

export const submitSessionLog = async (classId: string, log: Omit<SessionLog, 'date'>): Promise<string> => {
  if (!db) {
    return 'log_' + Date.now();
  }
  const logRef = doc(collection(db, `classes/${classId}/session_logs`));
  try {
    await withTimeout(setDoc(logRef, {
      ...log,
      date: serverTimestamp()
    }));
    return logRef.id;
  } catch (err) {
    console.warn('Session log cloud sync deferred (offline local mode):', err);
    return logRef.id;
  }
};

export const deleteSessionLog = async (classId: string, logId: string): Promise<void> => {
  if (!db) return;
  try {
    const logRef = doc(db, `classes/${classId}/session_logs`, logId);
    await withTimeout(deleteDoc(logRef));
  } catch (err) {
    console.warn('Cloud delete log deferred (offline local mode):', err);
  }
};

export const getMonthlyLogs = async (instructorId: string, year: number, month: number) => {
  if (!db) return [];
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  const logs: (SessionLog & { classInfo: ClassSession })[] = [];

  try {
    const classesRef = collection(db, 'classes');
    const q = query(classesRef, where('instructorId', '==', instructorId));
    const classSnapshot = await withTimeout(getDocs(q));
    
    for (const docSnap of classSnapshot.docs) {
      const classData = { id: docSnap.id, ...docSnap.data() } as ClassSession;
      
      const logsRef = collection(db, `classes/${classData.id}/session_logs`);
      const logsQuery = query(
        logsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      
      const logsSnapshot = await withTimeout(getDocs(logsQuery));
      logsSnapshot.forEach(logSnap => {
        const logData = logSnap.data();
        logs.push({
          id: logSnap.id,
          date: logData.date?.toDate ? logData.date.toDate() : new Date(),
          sessionType: logData.sessionType,
          topicsCovered: logData.topicsCovered || [],
          nextActions: logData.nextActions || '',
          engagementLevel: logData.engagementLevel || 'Medium',
          classInfo: classData,
        });
      });
    }
  } catch (err) {
    console.warn('Failed to retrieve monthly logs from cloud, using offline cache:', err);
  }

  return logs;
};

/**
 * Pushes the complete account state snapshot to Cloud Firestore (if configured).
 */
export const pushAccountSyncToCloud = async (snapshot: AccountSyncSnapshot): Promise<boolean> => {
  if (!db) return false;
  try {
    const syncDocRef = doc(db, 'user_sync', snapshot.userId);
    await withTimeout(setDoc(syncDocRef, {
      ...snapshot,
      cloudSyncedAt: serverTimestamp(),
    }, { merge: true }));
    return true;
  } catch (err) {
    console.warn('Deferred cloud sync (offline local mode):', err);
    return false;
  }
};

/**
 * Fetches the latest cloud snapshot for this user.
 */
export const fetchAccountSyncFromCloud = async (userId: string): Promise<AccountSyncSnapshot | null> => {
  if (!db) return null;
  try {
    const syncDocRef = doc(db, 'user_sync', userId);
    const snap = await withTimeout(getDoc(syncDocRef));
    if (snap.exists()) {
      return snap.data() as AccountSyncSnapshot;
    }
  } catch (err) {
    console.warn('Cloud sync fetch deferred (offline mode):', err);
  }
  return null;
};

/**
 * Subscribes to real-time changes in Firestore for this user account.
 */
export const subscribeToAccountSync = (
  userId: string,
  onRemoteUpdate: (snapshot: AccountSyncSnapshot) => void
): (() => void) => {
  if (!db) return () => {};
  try {
    const syncDocRef = doc(db, 'user_sync', userId);
    const unsubscribe = onSnapshot(syncDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AccountSyncSnapshot;
        onRemoteUpdate(data);
      }
    }, (err) => {
      console.warn('Cloud sync listener inactive (offline mode):', err);
    });
    return unsubscribe;
  } catch {
    return () => {};
  }
};

/**
 * Pushes a user account to Cloud Firestore collection 'users'.
 * Guarded: Refuses to write any account that has been deleted or tombstoned.
 */
export const pushUserToCloud = async (user: UserAccount): Promise<boolean> => {
  if (!db) return false;
  if (user.id === 'usr_martin_dan' || user.username === 'martin.dan') {
    return false;
  }
  try {
    const tombstones = await fetchTombstonesFromCloud();
    if (tombstones.includes(user.id) || tombstones.includes(user.username)) {
      console.warn(`[ProfTrack] Refusing to push tombstoned user ${user.username} to cloud.`);
      return false;
    }
    const userDocRef = doc(db, 'users', user.id);
    await withTimeout(setDoc(userDocRef, {
      ...user,
      cloudSyncedAt: serverTimestamp(),
    }, { merge: true }));
    return true;
  } catch (err) {
    console.warn('User cloud sync deferred (offline local mode):', err);
    return false;
  }
};

/**
 * Updates a user account's status in Cloud Firestore.
 */
export const updateUserStatusInCloud = async (userId: string, status: AccountStatus): Promise<boolean> => {
  if (!db) return false;
  try {
    const userDocRef = doc(db, 'users', userId);
    await withTimeout(setDoc(userDocRef, {
      status,
      cloudSyncedAt: serverTimestamp(),
    }, { merge: true }));
    return true;
  } catch (err) {
    console.warn('Update user status in cloud deferred:', err);
    return false;
  }
};

/**
 * Updates a user account's PIN hash and salt in Cloud Firestore.
 */
export const resetUserPinInCloud = async (userId: string, salt: string, pinHash: string): Promise<boolean> => {
  if (!db) return false;
  try {
    const userDocRef = doc(db, 'users', userId);
    await withTimeout(setDoc(userDocRef, {
      salt,
      pinHash,
      cloudSyncedAt: serverTimestamp(),
    }, { merge: true }));
    return true;
  } catch (err) {
    console.warn('Reset user PIN in cloud deferred:', err);
    return false;
  }
};

/**
 * Records a deletion tombstone in Cloud Firestore so deleted users
 * are permanently prevented from resurrecting on any device.
 */
export const recordTombstoneInCloud = async (userId: string): Promise<boolean> => {
  if (!db) return false;
  try {
    const tombstoneDoc = doc(db, 'tombstones', userId);
    await withTimeout(setDoc(tombstoneDoc, {
      userId,
      deletedAt: new Date().toISOString()
    }));
    return true;
  } catch (err) {
    console.warn('Record tombstone in cloud deferred:', err);
    return false;
  }
};

/**
 * Fetches all deletion tombstones from Cloud Firestore.
 */
export const fetchTombstonesFromCloud = async (): Promise<string[]> => {
  if (!db) return [];
  try {
    const snap = await withTimeout(getDocs(collection(db, 'tombstones')));
    const ids: string[] = [];
    snap.forEach(d => {
      const data = d.data();
      if (data && (data.userId || d.id)) {
        ids.push(data.userId || d.id);
      }
    });
    return ids;
  } catch (err) {
    console.warn('Fetch tombstones from cloud deferred:', err);
    return [];
  }
};

/**
 * Deletes a user account from Cloud Firestore, their user_sync snapshot,
 * and sets a tombstone to prevent resurrection from other syncing devices.
 */
export const deleteUserFromCloud = async (userId: string): Promise<boolean> => {
  if (!db) return false;
  try {
    const userDocRef = doc(db, 'users', userId);
    const syncDocRef = doc(db, 'user_sync', userId);
    await Promise.allSettled([
      withTimeout(deleteDoc(userDocRef)),
      withTimeout(deleteDoc(syncDocRef)),
      recordTombstoneInCloud(userId)
    ]);
    return true;
  } catch (err) {
    console.warn('Delete user from cloud deferred:', err);
    return false;
  }
};

/**
 * Fetches all registered users from Cloud Firestore, strictly filtering against tombstones.
 */
export const fetchUsersFromCloud = async (): Promise<UserAccount[]> => {
  const firestoreDb = db;
  if (!firestoreDb) return [];
  try {
    const [snapshot, tombstones] = await Promise.all([
      withTimeout(getDocs(collection(firestoreDb, 'users'))),
      fetchTombstonesFromCloud()
    ]);
    const tombstoneSet = new Set(tombstones);
    tombstoneSet.add('usr_martin_dan');
    tombstoneSet.add('martin.dan');

    const users: UserAccount[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data && data.username && data.id) {
        if (tombstoneSet.has(data.id) || tombstoneSet.has(data.username)) {
          // Actively purge any zombie doc in Firestore
          deleteDoc(doc(firestoreDb, 'users', docSnap.id)).catch(() => {});
          return;
        }
        users.push({
          id: data.id,
          username: data.username,
          salt: data.salt,
          pinHash: data.pinHash,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          fullName: data.fullName || '',
          department: data.department || '',
          institution: data.institution || '',
          role: data.role || 'instructor',
          status: data.status || 'pending',
          createdAt: data.createdAt || new Date().toISOString(),
          lastLogin: data.lastLogin
        });
      }
    });
    return users;
  } catch (err) {
    console.warn('Fetch users from cloud deferred:', err);
    return [];
  }
};

/**
 * Fetches a single user by username from Cloud Firestore.
 */
export const fetchUserByUsernameFromCloud = async (username: string): Promise<UserAccount | null> => {
  const firestoreDb = db;
  if (!firestoreDb) return null;
  if (username === 'martin.dan') return null;
  try {
    const tombstones = await fetchTombstonesFromCloud();
    if (tombstones.includes(username) || tombstones.includes('usr_martin_dan')) return null;

    const usersRef = collection(firestoreDb, 'users');
    const q = query(usersRef, where('username', '==', username));
    const snap = await withTimeout(getDocs(q));
    if (!snap.empty) {
      const data = snap.docs[0].data();
      if (tombstones.includes(data.id) || tombstones.includes(data.username)) {
        deleteDoc(doc(firestoreDb, 'users', snap.docs[0].id)).catch(() => {});
        return null;
      }
      return {
        id: data.id,
        username: data.username,
        salt: data.salt,
        pinHash: data.pinHash,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        fullName: data.fullName || '',
        department: data.department || '',
        institution: data.institution || '',
        role: data.role || 'instructor',
        status: data.status || 'pending',
        createdAt: data.createdAt || new Date().toISOString(),
        lastLogin: data.lastLogin
      };
    }
  } catch (err) {
    console.warn('Fetch user by username from cloud deferred:', err);
  }
  return null;
};

/**
 * Subscribes to real-time changes in Cloud Firestore 'users' collection.
 */
export const subscribeToUsersCloud = (
  onRemoteUpdate: (users: UserAccount[]) => void
): (() => void) => {
  if (!db) return () => {};
  try {
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const users: UserAccount[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data && data.username && data.id) {
          if (data.id === 'usr_martin_dan' || data.username === 'martin.dan') {
            return;
          }
          users.push({
            id: data.id,
            username: data.username,
            salt: data.salt,
            pinHash: data.pinHash,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            fullName: data.fullName || '',
            department: data.department || '',
            institution: data.institution || '',
            role: data.role || 'instructor',
            status: data.status || 'pending',
            createdAt: data.createdAt || new Date().toISOString(),
            lastLogin: data.lastLogin
          });
        }
      });
      if (users.length > 0) {
        onRemoteUpdate(users);
      }
    }, (err) => {
      console.warn('Users cloud sync listener inactive (offline mode):', err);
    });
    return unsubscribe;
  } catch {
    return () => {};
  }
};


