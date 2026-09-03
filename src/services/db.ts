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
  fullName: 'Prof. Dan Martin',
  position: 'Assistant Professor I',
  department: 'College of Computer Studies',
  institution: 'University of Makati',
  email: 'dan.martin@university.edu.ph',
  employeeId: 'EMP-2026-089'
};

// Timeout helper to prevent hanging when offline or unconfigured
const withTimeout = <T>(promise: Promise<T>, timeoutMs = 1800): Promise<T> => {
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

