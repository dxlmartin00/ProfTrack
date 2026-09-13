import { useState, useEffect } from 'react';
import { DailyTimetable } from './components/DailyTimetable';
import { PostClassUpdateModal } from './components/PostClassUpdateModal';
import { AddClassModal } from './components/AddClassModal';
import { CourseDetailModal } from './components/CourseDetailModal';
import { ReportModal } from './components/ReportModal';
import { DataTransferModal } from './components/DataTransferModal';
import { ProfileModal, getInitials } from './components/ProfileModal';
import { ScheduleUploadModal } from './components/ScheduleUploadModal';
import { SyllabusUploadModal } from './components/SyllabusUploadModal';
import { DeviceSyncModal } from './components/DeviceSyncModal';
import type { ClassSession, ClassSchedule, SessionLog, ScheduleType, InstructorProfile } from './services/db';
import { 
  addClass as dbAddClass, 
  updateClass as dbUpdateClass, 
  deleteClass as dbDeleteClass, 
  submitSessionLog,
  pushAccountSyncToCloud,
  fetchAccountSyncFromCloud,
  subscribeToAccountSync,
  DEFAULT_INSTRUCTOR_PROFILE
} from './services/db';
import { 
  requestNotificationPermission, 
  sendLocalNotification 
} from './services/pwa';
import { decompressPayload, unpackTransferPayload } from './utils/codec';
import { getCourseProgressDetails } from './utils/courseProgress';
import { AuthModal } from './components/AuthModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { AdminAccountManagementView } from './components/AdminAccountManagementView';
import { CalendarView } from './components/CalendarView';
import { AccessibilityModal } from './components/AccessibilityModal';
import { 
  getStoredTheme, 
  setStoredTheme, 
  getStoredA11y, 
  setStoredA11y, 
  applyThemeAndA11y 
} from './services/theme';
import type { ThemeMode, AccessibilitySettings } from './services/theme';
import { 
  initializeAuth, 
  getUserStorageKeys, 
  logoutUser, 
  getStoredUsers, 
  DAN_MARTIN_ACCOUNT
} from './services/auth';
import type { UserAccount } from './services/auth';
import { 
  getUserLastUpdated, 
  setUserLastUpdated, 
  createAccountSyncSnapshot 
} from './services/sync';
import { 
  Bell, 
  Wifi, 
  WifiOff, 
  GraduationCap,
  RotateCcw,
  Smartphone,
  CheckCircle2,
  Camera,
  ShieldCheck,
  LogOut,
  ArrowRightLeft,
  Calendar,
  Clock,
  Sun,
  Moon,
  Eye,
  Menu,
  X,
  Plus,
  FileDown,
  Sliders,
  ChevronRight
} from 'lucide-react';

export const OFFICIAL_SEMESTER_COURSES: ClassSession[] = [
  // 1. CS 314 - CS Elective 1 (Section 3D)
  {
    id: 'course_cs314_3d',
    instructorId: 'inst1',
    subjectCode: 'CS 314',
    subjectTitle: 'CS Elective 1',
    section: '3D',
    year: '3rd Year',
    room: 'CL2',
    schedule: [
      { dayOfWeek: 1, startTime: '13:00', endTime: '14:00', type: 'Lecture', room: 'CL2' },
      { dayOfWeek: 4, startTime: '13:00', endTime: '14:00', type: 'Lecture', room: 'CL2' },
      { dayOfWeek: 2, startTime: '14:30', endTime: '16:00', type: 'Laboratory', room: 'CL2' },
      { dayOfWeek: 5, startTime: '14:30', endTime: '16:00', type: 'Laboratory', room: 'CL2' }
    ],
    masterSyllabus: [
      'Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System',
      'Introduction to Systems Architecture & SDLC Models',
      'Operating System Concepts & Concurrency Management',
      'Memory Management: Paging & Virtual Storage Subsystems',
      'File Systems & Secondary Storage Architecture',
      'Computer Networking & Distributed Client-Server Systems',
      'System Security, Cryptography & Access Control',
      'Virtualization, Hypervisors & Cloud Virtual Machines',
      'System Performance Benchmarking & Diagnostics Evaluation',
      'Final Examination'
    ]
  },

  // 2. CS 315 - Application Development & Emerging Tech (Section 3B)
  {
    id: 'course_cs315_3b',
    instructorId: 'inst1',
    subjectCode: 'CS 315',
    subjectTitle: 'Application Development & Emerging Technologies',
    section: '3B',
    year: '3rd Year',
    room: '128 / CL2',
    schedule: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '09:00', type: 'Lecture', room: '128' },
      { dayOfWeek: 4, startTime: '08:00', endTime: '09:00', type: 'Lecture', room: '128' },
      { dayOfWeek: 1, startTime: '14:30', endTime: '16:00', type: 'Laboratory', room: 'CL2' },
      { dayOfWeek: 4, startTime: '14:30', endTime: '16:00', type: 'Laboratory', room: 'CL2' }
    ],
    masterSyllabus: [
      'Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System',
      'Introduction to Application Development & Emerging Technologies',
      'Ethical and Legal Considerations of App Development',
      'Mobile App Architecture & Design Patterns',
      'Modern Frontend Frameworks & State Management',
      'Backend API Development & Microservices',
      'Cloud Services & Serverless Computing',
      'UI/UX Principles',
      'Midterm Exam',
      'Introduction to Java & Android Studio Setup',
      'Android Activities & XML Layouts',
      'Event Handling & User Interaction',
      'Data Storage in Android and CRUD Operations (Java + SQLite)',
      'Connecting Apps to APIs',
      'Testing the Mobile App',
      'Deployment & App Launch + App Enhancement',
      'Final Project Defense',
      'Final Exam'
    ]
  },

  // 3. CS 315 - Application Development & Emerging Tech (Section 3D)
  {
    id: 'course_cs315_3d',
    instructorId: 'inst1',
    subjectCode: 'CS 315',
    subjectTitle: 'Application Development & Emerging Technologies',
    section: '3D',
    year: '3rd Year',
    room: '127 / IL2',
    schedule: [
      { dayOfWeek: 2, startTime: '10:00', endTime: '11:00', type: 'Lecture', room: '127' },
      { dayOfWeek: 5, startTime: '10:00', endTime: '11:00', type: 'Lecture', room: '127' },
      { dayOfWeek: 2, startTime: '11:00', endTime: '12:30', type: 'Laboratory', room: 'IL2' },
      { dayOfWeek: 5, startTime: '11:00', endTime: '12:30', type: 'Laboratory', room: 'IL2' }
    ],
    masterSyllabus: [
      'Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System',
      'Introduction to Application Development & Emerging Technologies',
      'Ethical and Legal Considerations of App Development',
      'Mobile App Architecture & Design Patterns',
      'Modern Frontend Frameworks & State Management',
      'Backend API Development & Microservices',
      'Cloud Services & Serverless Computing',
      'UI/UX Principles',
      'Midterm Exam',
      'Introduction to Java & Android Studio Setup',
      'Android Activities & XML Layouts',
      'Event Handling & User Interaction',
      'Data Storage in Android and CRUD Operations (Java + SQLite)',
      'Connecting Apps to APIs',
      'Testing the Mobile App',
      'Deployment & App Launch + App Enhancement',
      'Final Project Defense',
      'Final Exam'
    ]
  },

  // 4. CS 412 - Operating Systems (Section 4A)
  {
    id: 'course_cs412_4a',
    instructorId: 'inst1',
    subjectCode: 'CS 412',
    subjectTitle: 'Operating Systems',
    section: '4A',
    year: '4th Year',
    room: '127 / IL2',
    schedule: [
      { dayOfWeek: 1, startTime: '11:00', endTime: '12:00', type: 'Lecture', room: '127' },
      { dayOfWeek: 4, startTime: '11:00', endTime: '12:00', type: 'Lecture', room: '127' },
      { dayOfWeek: 3, startTime: '13:00', endTime: '16:00', type: 'Laboratory', room: 'IL2' }
    ],
    masterSyllabus: [
      'Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System',
      'Overview of Operating Systems & Kernel Architectures',
      'Processes, Threads & CPU Scheduling Algorithms',
      'Process Synchronization & Deadlock Prevention',
      'Main Memory Management & Virtual Memory Paging',
      'File System Storage & Secondary Subsystems',
      'Protection, Security & Virtual Machine Concepts',
      'Final Examination'
    ]
  },

  // 5. CS 412 - Operating Systems (Section 4B)
  {
    id: 'course_cs412_4b',
    instructorId: 'inst1',
    subjectCode: 'CS 412',
    subjectTitle: 'Operating Systems',
    section: '4B',
    year: '4th Year',
    room: '129 / IL2',
    schedule: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '10:00', type: 'Lecture', room: '129' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '10:00', type: 'Lecture', room: '129' },
      { dayOfWeek: 2, startTime: '16:00', endTime: '17:30', type: 'Laboratory', room: 'IL2' },
      { dayOfWeek: 5, startTime: '16:00', endTime: '17:30', type: 'Laboratory', room: 'IL2' }
    ],
    masterSyllabus: [
      'Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System',
      'Overview of Operating Systems & Kernel Architectures',
      'Processes, Threads & CPU Scheduling Algorithms',
      'Process Synchronization & Deadlock Prevention',
      'Main Memory Management & Virtual Memory Paging',
      'File System Storage & Secondary Subsystems',
      'Protection, Security & Virtual Machine Concepts',
      'Final Examination'
    ]
  },

  // 6. eGE 1 - Living in the IT Era (Section 2D - BE)
  {
    id: 'course_ege1_2d_be',
    instructorId: 'inst1',
    subjectCode: 'eGE 1',
    subjectTitle: 'Living in the IT Era',
    section: '2D (BE)',
    year: '2nd Year',
    room: 'GF003',
    schedule: [
      { dayOfWeek: 2, startTime: '07:30', endTime: '09:00', type: 'Lecture', room: 'GF003' },
      { dayOfWeek: 5, startTime: '07:30', endTime: '09:00', type: 'Lecture', room: 'GF003' }
    ],
    masterSyllabus: [
      'Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System',
      'Introduction to Living in the IT Era & ICT in Society',
      'Evolution of ICT & Computing Systems',
      'Internet, World Wide Web & Cloud Platforms',
      'Data Privacy, Security & Cybersecurity Fundamentals',
      'Digital Ethics, Netiquette & Intellectual Property',
      'Emerging Technologies (AI, IoT, Blockchain & Robotics)',
      'Future Trends in Information Technology',
      'Final Examination'
    ]
  },

  // 7. eGE 1 - Living in the IT Era (Section 2D - FM)
  {
    id: 'course_ege1_2d_fm',
    instructorId: 'inst1',
    subjectCode: 'eGE 1',
    subjectTitle: 'Living in the IT Era',
    section: '2D (FM)',
    year: '2nd Year',
    room: '122',
    schedule: [
      { dayOfWeek: 1, startTime: '16:00', endTime: '17:30', type: 'Lecture', room: '122' },
      { dayOfWeek: 4, startTime: '16:00', endTime: '17:30', type: 'Lecture', room: '122' }
    ],
    masterSyllabus: [
      'Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System',
      'Introduction to Living in the IT Era & ICT in Society',
      'Evolution of ICT & Computing Systems',
      'Internet, World Wide Web & Cloud Platforms',
      'Data Privacy, Security & Cybersecurity Fundamentals',
      'Digital Ethics, Netiquette & Intellectual Property',
      'Emerging Technologies (AI, IoT, Blockchain & Robotics)',
      'Future Trends in Information Technology',
      'Final Examination'
    ]
  },

  // 8. eGE 1 - Living in the IT Era (Section 2H - FM)
  {
    id: 'course_ege1_2h_fm',
    instructorId: 'inst1',
    subjectCode: 'eGE 1',
    subjectTitle: 'Living in the IT Era',
    section: '2H (FM)',
    year: '2nd Year',
    room: '130',
    schedule: [
      { dayOfWeek: 3, startTime: '08:00', endTime: '11:00', type: 'Lecture', room: '130' }
    ],
    masterSyllabus: [
      'Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System',
      'Introduction to Living in the IT Era & ICT in Society',
      'Evolution of ICT & Computing Systems',
      'Internet, World Wide Web & Cloud Platforms',
      'Data Privacy, Security & Cybersecurity Fundamentals',
      'Digital Ethics, Netiquette & Intellectual Property',
      'Emerging Technologies (AI, IoT, Blockchain & Robotics)',
      'Future Trends in Information Technology',
      'Final Examination'
    ]
  }
];

export const INITIAL_OFFICIAL_LOGS: (SessionLog & { classInfo: ClassSession })[] = [
  {
    id: 'log_cs315_recent',
    date: new Date(),
    sessionType: 'Lecture',
    topicsCovered: ['Introduction to Application Development & Emerging Technologies'],
    nextActions: '[In Progress: Introduction to Application Development & Emerging Technologies - Stopped at Slide #20] Completed section 1.',
    engagementLevel: 'High',
    classInfo: OFFICIAL_SEMESTER_COURSES[2] // CS315 3D
  },
  {
    id: 'log_ege1_recent',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000),
    sessionType: 'Lecture',
    topicsCovered: ['Introduction to Living in the IT Era & ICT in Society'],
    nextActions: 'Completed topic 1 orientation. Next meeting start ICT Evolution.',
    engagementLevel: 'High',
    classInfo: OFFICIAL_SEMESTER_COURSES[5] // eGE 1 2D (BE)
  },
  {
    id: 'log_cs314_recent',
    date: new Date(Date.now() - 48 * 60 * 60 * 1000),
    sessionType: 'Laboratory',
    topicsCovered: ['Introduction to Systems Architecture & SDLC Models'],
    nextActions: 'Submitted lab activity 1 on SDLC workflows.',
    engagementLevel: 'High',
    classInfo: OFFICIAL_SEMESTER_COURSES[0] // CS 314 3D
  }
];

// User-isolated data loading helpers
const loadUserClasses = (user: UserAccount | null): ClassSession[] => {
  if (!user) return [];
  // Dedicated Admin account only manages accounts, never classes
  if (user.role === 'admin' || user.username === 'admin.admin') {
    return [];
  }
  const keys = getUserStorageKeys(user.id);
  try {
    const cached = localStorage.getItem(keys.classesKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load user classes:', err);
  }
  // Prof. Dan Martin's 8 official semester courses
  if (user.id === DAN_MARTIN_ACCOUNT.id || user.username === 'martin.dan') {
    return OFFICIAL_SEMESTER_COURSES;
  }
  return [];
};

const loadUserLogs = (user: UserAccount | null): (SessionLog & { classInfo: ClassSession })[] => {
  if (!user) return [];
  // Dedicated Admin account only manages accounts, never classes
  if (user.role === 'admin' || user.username === 'admin.admin') {
    return [];
  }
  const keys = getUserStorageKeys(user.id);
  try {
    const cached = localStorage.getItem(keys.logsKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => ({
          ...item,
          date: new Date(item.date)
        }));
      }
    }
  } catch (err) {
    console.error('Failed to load user logs:', err);
  }
  // Prof. Dan Martin's initial official logs
  if (user.id === DAN_MARTIN_ACCOUNT.id || user.username === 'martin.dan') {
    return INITIAL_OFFICIAL_LOGS;
  }
  return [];
};

const loadUserProfile = (user: UserAccount | null): InstructorProfile => {
  if (!user) return DEFAULT_INSTRUCTOR_PROFILE;
  const keys = getUserStorageKeys(user.id);
  try {
    const saved = localStorage.getItem(keys.profileKey);
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.error('Failed to load user profile:', err);
  }
  return {
    fullName: user.fullName || DEFAULT_INSTRUCTOR_PROFILE.fullName,
    position: user.role === 'admin' ? 'System Administrator' : 'Assistant Professor I',
    department: user.department || DEFAULT_INSTRUCTOR_PROFILE.department,
    institution: user.institution || DEFAULT_INSTRUCTOR_PROFILE.institution,
    email: `${user.username}@university.edu.ph`,
    employeeId: user.id
  };
};

export function App() {
  // 1. Multi-Tenant User & Session State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const { currentUser: initialUser } = initializeAuth();
    return initialUser;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(!currentUser);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isDeviceSyncModalOpen, setIsDeviceSyncModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserAccount[]>(() => getStoredUsers());
  const [viewMode, setViewMode] = useState<'daily' | 'calendar'>('daily');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredTheme());
  const [a11ySettings, setA11ySettings] = useState<AccessibilitySettings>(() => getStoredA11y());
  const [isA11yModalOpen, setIsA11yModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Apply Theme & Accessibility configuration to document root
  useEffect(() => {
    applyThemeAndA11y(themeMode, a11ySettings);
  }, [themeMode, a11ySettings]);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setThemeMode(newTheme);
    setStoredTheme(newTheme);
  };

  const handleA11yChange = (newSettings: AccessibilitySettings) => {
    setA11ySettings(newSettings);
    setStoredA11y(newSettings);
  };

  // Listen to accounts updates across tabs and modals
  useEffect(() => {
    const handleSync = () => {
      setAllUsers(getStoredUsers());
    };
    window.addEventListener('proftrack_accounts_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('proftrack_accounts_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // 2. User-isolated Data States
  const [profile, setProfile] = useState<InstructorProfile>(() => loadUserProfile(currentUser));
  const [classes, setClasses] = useState<ClassSession[]>(() => loadUserClasses(currentUser));
  const [logs, setLogs] = useState<(SessionLog & { classInfo: ClassSession })[]>(() => loadUserLogs(currentUser));
  const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState<number>(() => {
    return currentUser ? getUserLastUpdated(currentUser.id) : Date.now();
  });

  // 3. Isolated Storage & Cloud Auto-Sync with Timestamp
  useEffect(() => {
    if (!currentUser) return;
    const keys = getUserStorageKeys(currentUser.id);
    localStorage.setItem(keys.classesKey, JSON.stringify(classes));
    localStorage.setItem(keys.logsKey, JSON.stringify(logs));
    localStorage.setItem(keys.profileKey, JSON.stringify(profile));

    const now = Date.now();
    setLastUpdatedTimestamp(now);
    setUserLastUpdated(currentUser.id, now);

    // Push state snapshot to cloud Firestore if available
    const snapshot = createAccountSyncSnapshot(
      currentUser.id,
      currentUser.username,
      classes,
      logs,
      profile,
      now
    );
    pushAccountSyncToCloud(snapshot).catch(err => {
      console.warn('Deferred cloud sync:', err);
    });
  }, [classes, logs, profile, currentUser]);

  // 4. Cross-Device Cloud Sync Listener ("Latest Device Wins")
  useEffect(() => {
    if (!currentUser) return;

    // Check Cloud for newer snapshot on login or device resume
    fetchAccountSyncFromCloud(currentUser.id).then(cloudSnapshot => {
      if (cloudSnapshot && cloudSnapshot.updatedAt) {
        const localTime = getUserLastUpdated(currentUser.id);
        if (cloudSnapshot.updatedAt > localTime + 2000) {
          // Cloud has newer update from another device!
          setClasses(cloudSnapshot.classes);
          setLogs(cloudSnapshot.logs);
          if (cloudSnapshot.profile) setProfile(cloudSnapshot.profile);
          setLastUpdatedTimestamp(cloudSnapshot.updatedAt);
          setUserLastUpdated(currentUser.id, cloudSnapshot.updatedAt);
          setQrNotification(`🔄 Synced with latest updates from ${cloudSnapshot.deviceLabel || 'your other device'}!`);
          setTimeout(() => setQrNotification(null), 5000);
        } else if (localTime > (cloudSnapshot.updatedAt || 0) + 2000) {
          // This device is newer, push to cloud so other devices get it
          const localSnapshot = createAccountSyncSnapshot(
            currentUser.id,
            currentUser.username,
            classes,
            logs,
            profile,
            localTime
          );
          pushAccountSyncToCloud(localSnapshot);
        }
      }
    });

    // Subscribe to live changes if Firestore is active
    const unsubscribe = subscribeToAccountSync(currentUser.id, (remoteSnapshot) => {
      if (!remoteSnapshot || !remoteSnapshot.updatedAt) return;
      const localTime = getUserLastUpdated(currentUser.id);
      if (remoteSnapshot.updatedAt > localTime + 2000) {
        setClasses(remoteSnapshot.classes);
        setLogs(remoteSnapshot.logs);
        if (remoteSnapshot.profile) setProfile(remoteSnapshot.profile);
        setLastUpdatedTimestamp(remoteSnapshot.updatedAt);
        setUserLastUpdated(currentUser.id, remoteSnapshot.updatedAt);
        setQrNotification(`🔄 Live update received from ${remoteSnapshot.deviceLabel}!`);
        setTimeout(() => setQrNotification(null), 4000);
      }
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Modal States
  const [selectedClassForLog, setSelectedClassForLog] = useState<ClassSession | null>(null);
  const [selectedScheduleForLog, setSelectedScheduleForLog] = useState<ClassSchedule | undefined>(undefined);
  const [inspectedCourse, setInspectedCourse] = useState<ClassSession | null>(null);
  const [editingCourse, setEditingCourse] = useState<ClassSession | null>(null);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
  const [activeSyllabusCourseId, setActiveSyllabusCourseId] = useState<string | undefined>(undefined);
  const [qrNotification, setQrNotification] = useState<string | null>(null);

  // Network & Push states
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notificationGranted, setNotificationGranted] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  // Online / Offline monitor
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save profile helper
  const handleSaveProfile = (newProfile: InstructorProfile) => {
    setProfile(newProfile);
    if (currentUser) {
      const keys = getUserStorageKeys(currentUser.id);
      try {
        localStorage.setItem(keys.profileKey, JSON.stringify(newProfile));
      } catch (e) {
        console.error('Failed to save profile to storage', e);
      }
    }
  };

  // Deep-link & QR Code URL hash init (Run once on mount)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#import=')) {
      try {
        const rawEncoded = hash.replace('#import=', '');
        const parsed = decompressPayload(rawEncoded);
        if (parsed) {
          const { classes: importedClasses, logs: importedLogs, profile: importedProfile, updatedAt: incomingTime, deviceLabel: incomingDevice } = unpackTransferPayload(parsed);

          if (importedClasses.length > 0 || importedLogs.length > 0) {
            setClasses(importedClasses);
            setLogs(importedLogs);
            if (importedProfile) {
              setProfile(importedProfile);
            }
            const finalTime = incomingTime || Date.now();
            setLastUpdatedTimestamp(finalTime);
            if (currentUser) {
              setUserLastUpdated(currentUser.id, finalTime);
            }
            const devInfo = incomingDevice ? ` from ${incomingDevice}` : '';
            setQrNotification(`✅ Synced latest updates${devInfo}! (${importedClasses.length} courses)`);
            setTimeout(() => setQrNotification(null), 6000);
          }
        }
      } catch (err) {
        console.error('Failed to parse QR code URL payload:', err);
      } finally {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  // Create or Update Course Handler (Optimistic & Instant)
  const handleSaveCourse = (courseData: Omit<ClassSession, 'id'>, existingId?: string) => {
    if (existingId) {
      setClasses(prev => prev.map(c => c.id === existingId ? { ...courseData, id: existingId } : c));
      setLogs(prev => prev.map(l => l.classInfo.id === existingId ? { ...l, classInfo: { ...courseData, id: existingId } } : l));

      if (inspectedCourse?.id === existingId) {
        setInspectedCourse({ ...courseData, id: existingId });
      }

      dbUpdateClass(existingId, courseData).catch(err => {
        console.warn('Updated course locally (offline cache active):', err);
      });
    } else {
      const tempId = 'class_' + Date.now();
      const newClass: ClassSession = { ...courseData, id: tempId };
      setClasses(prev => [newClass, ...prev]);

      dbAddClass(courseData).then(firestoreId => {
        if (firestoreId && firestoreId !== tempId) {
          setClasses(prev => prev.map(c => c.id === tempId ? { ...c, id: firestoreId } : c));
        }
      }).catch(err => {
        console.warn('Saved new course locally (offline cache active):', err);
      });
    }

    setEditingCourse(null);
    setIsAddClassOpen(false);
  };

  // Delete Course Handler
  const handleDeleteCourse = (classId: string) => {
    setClasses(prev => prev.filter(c => c.id !== classId));
    setLogs(prev => prev.filter(l => l.classInfo.id !== classId));
    if (inspectedCourse?.id === classId) {
      setInspectedCourse(null);
    }

    dbDeleteClass(classId).catch(err => {
      console.warn('Deleted course locally:', err);
    });
  };

  // Import courses parsed from Screenshot Scanner
  const handleImportParsedCourses = (imported: ClassSession[]) => {
    setClasses(imported);
    setQrNotification(`Successfully loaded ${imported.length} courses from schedule image!`);
    setTimeout(() => setQrNotification(null), 5000);
  };

  // Update Syllabus for a specific course (via Word .docx upload or manual edit)
  const handleUpdateCourseSyllabus = (courseId: string, topics: string[]) => {
    setClasses(prev => prev.map(c => c.id === courseId ? { ...c, masterSyllabus: topics } : c));
    if (inspectedCourse?.id === courseId) {
      setInspectedCourse(prev => prev ? { ...prev, masterSyllabus: topics } : null);
    }
    setQrNotification(`Successfully updated syllabus with ${topics.length} topics!`);
    setTimeout(() => setQrNotification(null), 4000);
  };

  // Session Log Success Handler (Optimistic, Persistent, Misclick-Aware)
  const handleLogSuccess = (loggedData: {
    sessionType?: ScheduleType;
    topicsCovered: string[];
    partialTopics?: string[];
    allActiveCompletedTopics?: string[];
    allActivePartialTopics?: string[];
    nextActions: string;
    engagementLevel: string;
  }) => {
    if (selectedClassForLog) {
      const activeSet = new Set([
        ...(loggedData.allActiveCompletedTopics || loggedData.topicsCovered),
        ...(loggedData.partialTopics || [])
      ]);

      // If user unchecked a topic to fix a misclick, clean older logs strictly for this specific course
      const cleanedPrevLogs = logs.map(l => {
        if (l.classInfo.id === selectedClassForLog.id) {
          return {
            ...l,
            topicsCovered: l.topicsCovered.filter(t => activeSet.has(t))
          };
        }
        return l;
      });

      const newLog: SessionLog & { classInfo: ClassSession } = {
        id: 'log_' + Date.now(),
        date: new Date(),
        sessionType: loggedData.sessionType || selectedScheduleForLog?.type || 'Lecture',
        topicsCovered: loggedData.topicsCovered,
        nextActions: loggedData.nextActions,
        engagementLevel: loggedData.engagementLevel,
        classInfo: selectedClassForLog,
      };

      setLogs([newLog, ...cleanedPrevLogs]);

      submitSessionLog(selectedClassForLog.id, loggedData).catch(err => {
        console.warn('Session log cached offline:', err);
      });
    }

    setSelectedClassForLog(null);
    setSelectedScheduleForLog(undefined);
  };

  // 1-Click Action: Mark Partial Lesson as Done & Proceed to Next Lesson directly from Timetable (Preserving Notes)
  const handleQuickAdvanceLesson = (cls: ClassSession) => {
    const progress = getCourseProgressDetails(cls, logs);
    const partialTopic = progress.currentActiveTopic;
    if (!partialTopic) return;

    const nextTopic = progress.nextLessonTopic;
    const cutoff = progress.partialTopics[0]?.note;
    
    // Preserve past notes and cut-off records so they are NEVER erased
    const noteSummaryParts: string[] = [];
    if (cutoff) noteSummaryParts.push(`✓ Finished cut-off: "${cutoff}"`);
    if (progress.latestNote) noteSummaryParts.push(progress.latestNote);

    const actionSummary = noteSummaryParts.length > 0
      ? noteSummaryParts.join(' • ')
      : `Completed: ${partialTopic}`;

    const newLog: SessionLog & { classInfo: ClassSession } = {
      id: 'log_' + Date.now(),
      date: new Date(),
      sessionType: 'Lecture',
      topicsCovered: [partialTopic],
      nextActions: actionSummary,
      engagementLevel: 'High',
      classInfo: cls,
    };

    setLogs(prev => [newLog, ...prev]);

    submitSessionLog(cls.id, {
      sessionType: 'Lecture',
      topicsCovered: [partialTopic],
      nextActions: actionSummary,
      engagementLevel: 'High'
    }).catch(err => console.warn('Cached offline:', err));

    setQrNotification(`✅ Marked "${partialTopic}" as completed! Advancing to "${nextTopic || 'next lesson'}". Notes preserved.`);
    setTimeout(() => setQrNotification(null), 5000);
  };

  // Restore imported data from phone or backup file
  const handleImportData = (
    importedClasses: ClassSession[], 
    importedLogs: (SessionLog & { classInfo: ClassSession })[],
    importedProfile?: InstructorProfile,
    updatedAt?: number
  ) => {
    setClasses(importedClasses);
    setLogs(importedLogs);
    if (importedProfile) {
      handleSaveProfile(importedProfile);
    }
    const finalTime = updatedAt || Date.now();
    setLastUpdatedTimestamp(finalTime);
    if (currentUser) {
      setUserLastUpdated(currentUser.id, finalTime);
    }
  };

  // Web Push Permission & Test Trigger
  const handleToggleNotifications = async () => {
    const granted = await requestNotificationPermission('inst1');
    if (granted || (typeof Notification !== 'undefined' && Notification.permission === 'granted')) {
      setNotificationGranted(true);
      sendLocalNotification('ProfTrack • Class Session Ending', {
        body: 'Your class session has ended. Tap here to log topics covered and student engagement.',
        tag: 'class-end-reminder'
      });
    }
  };

  // Auth & Multi-tenant Action Handlers
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setClasses(loadUserClasses(user));
    setLogs(loadUserLogs(user));
    setProfile(loadUserProfile(user));
    setIsAuthModalOpen(false);
    setAllUsers(getStoredUsers());
    setQrNotification(`Welcome back, ${user.fullName}!`);
    setTimeout(() => setQrNotification(null), 4000);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  const handleAccountsUpdated = () => {
    setAllUsers(getStoredUsers());
  };

  const pendingCount = allUsers.filter(u => u.status === 'pending').length;

  // Reset or Restore official courses
  const handleResetDemoData = () => {
    if (window.confirm('Reset schedule back to all 8 official semester courses?')) {
      setClasses(OFFICIAL_SEMESTER_COURSES);
      setLogs(INITIAL_OFFICIAL_LOGS);
    }
  };

  const userInitials = getInitials(profile.fullName);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs transition-colors">
        <div className="max-w-7xl mx-auto flex h-14 sm:h-16 items-center justify-between px-3.5 sm:px-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-zinc-950 dark:bg-zinc-800 text-white shadow-2xs shrink-0">
                <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <span className="font-bold text-sm sm:text-base tracking-tight text-zinc-950 dark:text-white">
                ProfTrack
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-5 text-sm">
              {currentUser?.role === 'admin' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Administrator Account Portal
                </span>
              ) : (
                <>
                  <div className="inline-flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('daily')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        viewMode === 'daily'
                          ? 'bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-2xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Daily</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('calendar')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        viewMode === 'calendar'
                          ? 'bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-2xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Weekly Time-Grid</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScanModalOpen(true)}
                    className="text-zinc-600 dark:text-zinc-400 transition-colors hover:text-zinc-950 dark:hover:text-white cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                    Scan Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReportOpen(true)}
                    className="text-zinc-600 dark:text-zinc-400 transition-colors hover:text-zinc-950 dark:hover:text-white cursor-pointer"
                  >
                    Accomplishment Reports
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(true)}
                    className="text-zinc-600 dark:text-zinc-400 transition-colors hover:text-zinc-950 dark:hover:text-white cursor-pointer flex items-center gap-1.5"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    Transfer to Phone
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Desktop Actions Toolbar */}
          <div className="hidden md:flex items-center gap-2 sm:gap-2.5">
            {/* Online / Offline Status Badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border shrink-0 ${
                isOnline
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
                  : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200'
              }`}
              title={isOnline ? 'Network Connected • Local Mode Active' : 'Offline Mode • Local Cache Active'}
            >
              {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </span>

            {/* Live Device Sync Pill */}
            <button
              type="button"
              onClick={() => setIsDeviceSyncModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Device & Account Sync: Tap to view connected devices and synchronization status"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>Sync</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            {/* Display & Accessibility Preferences Toggle */}
            <button
              type="button"
              onClick={() => setIsA11yModalOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title={`Theme: ${themeMode.toUpperCase()} • Display & Accessibility Preferences`}
              aria-label="Display and Accessibility Preferences"
            >
              {themeMode === 'light' ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : themeMode === 'dark' ? (
                <Moon className="h-4 w-4 text-zinc-300" />
              ) : (
                <Eye className="h-4 w-4 text-amber-400" />
              )}
            </button>

            {/* Notification Bell / Test Trigger button */}
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-xs sm:text-sm font-medium transition-colors cursor-pointer shrink-0 ${
                notificationGranted
                  ? 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  : 'border-zinc-950 bg-zinc-950 text-white shadow-2xs hover:bg-zinc-800'
              }`}
              aria-label={notificationGranted ? 'Web Push Active' : 'Enable Web Push Reminders'}
              title={notificationGranted ? 'Web Push Active' : 'Enable Web Push Reminders'}
            >
              <Bell className="h-4 w-4" />
            </button>

            {/* Refresh / Reload App Button */}
            <button
              type="button"
              onClick={() => {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(regs => {
                    regs.forEach(r => r.update());
                  });
                }
                window.location.reload();
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer shrink-0"
              title="Refresh / Check for Updates"
              aria-label="Refresh / Check for Updates"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Admin Console Shortcut (Only visible for Admin martin.dan) */}
            {currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(true)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-950 bg-zinc-950 text-white px-3 text-xs font-bold shadow-2xs hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                title="Administrator Console: Manage and approve instructor accounts"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Admin Console</span>
                {pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center bg-amber-500 text-white rounded-full h-4 min-w-[16px] px-1 text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}

            {/* Instructor Profile Avatar Badge */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5 pr-2.5 pl-0.5 text-zinc-900 dark:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer shrink-0 shadow-2xs group"
              aria-label={`Profile: ${profile.fullName} (${profile.position})`}
              title="View & Edit Instructor Profile"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 dark:bg-zinc-700 text-white text-xs font-bold shrink-0">
                {userInitials}
              </div>
              <div className="flex flex-col text-left leading-tight pr-1">
                <span className="text-xs font-bold text-zinc-950 dark:text-zinc-100 group-hover:text-zinc-800 dark:group-hover:text-white truncate max-w-[130px]">
                  {currentUser?.username || profile.fullName}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-300 font-medium truncate max-w-[130px]">
                  {currentUser?.role === 'admin' ? 'Administrator' : 'Instructor'}
                </span>
              </div>
            </button>

            {/* Switch Account / Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer shrink-0"
              title="Switch Account / Sign Out"
              aria-label="Switch Account / Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile Actions Toolbar: Minimal 3 items, 100% immune to overflow */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            {/* Online / Offline Compact Status Dot */}
            <button
              type="button"
              onClick={() => setIsDeviceSyncModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 px-2 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-2xs cursor-pointer shrink-0"
              title={isOnline ? 'Online • Tap for Sync status' : 'Offline Mode Active'}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-[11px] font-bold">{isOnline ? 'Sync' : 'Off'}</span>
            </button>

            {/* Theme & Display Preferences Quick Toggle */}
            <button
              type="button"
              onClick={() => setIsA11yModalOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title={`Theme: ${themeMode.toUpperCase()}`}
              aria-label="Display and Accessibility"
            >
              {themeMode === 'light' ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : themeMode === 'dark' ? (
                <Moon className="h-4 w-4 text-zinc-300" />
              ) : (
                <Eye className="h-4 w-4 text-amber-400" />
              )}
            </button>

            {/* Mobile Menu & Profile Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-950 dark:bg-zinc-800 p-0.5 pr-2 text-white hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-all cursor-pointer shrink-0 shadow-2xs"
              aria-label="Open Mobile Menu and Profile"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 dark:bg-zinc-700 text-white text-xs font-bold shrink-0">
                {userInitials}
              </div>
              <Menu className="w-3.5 h-3.5 text-zinc-300" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation and User Menu"
        >
          {/* Backdrop dismiss click area */}
          <div 
            className="flex-1" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <div className="w-full max-w-xs sm:max-w-sm bg-white dark:bg-[#12141a] night:bg-[#0b0d11] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 p-4">
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 dark:bg-zinc-800 text-white shadow-2xs shrink-0">
                    <GraduationCap className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-sm tracking-tight text-zinc-950 dark:text-white">
                    ProfTrack Menu
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                    title="Sign Out / Switch Account"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* User Profile Card */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3.5 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-950 dark:bg-zinc-700 text-white text-base font-bold shrink-0 shadow-sm">
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 truncate">
                      {profile.fullName || currentUser?.fullName}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-300 font-mono truncate">
                      @{currentUser?.username}
                    </p>
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                      {currentUser?.role === 'admin' ? 'System Administrator' : profile.position || 'Faculty Member'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate">
                  {profile.department}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsProfileOpen(true);
                    }}
                    className="flex-1 inline-flex h-8 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="inline-flex h-8 items-center justify-center px-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs font-bold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer shadow-2xs"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Section: Academic Schedule Views */}
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider px-1">
                  Schedule Views
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('daily');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'daily'
                        ? 'border-zinc-950 dark:border-white bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Daily Timetable</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('calendar');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'calendar'
                        ? 'border-zinc-950 dark:border-white bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Weekly Grid</span>
                  </button>
                </div>
              </div>

              {/* Section: Faculty Tools */}
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider px-1">
                  Faculty Tools
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setEditingCourse(null);
                      setIsAddClassOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Add Course Session</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-300" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsScanModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                      <span>Scan Faculty Loading Image</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-300" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsReportOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileDown className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                      <span>Accomplishment Reports</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-300" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsTransferModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                      <span>Transfer to Phone / QR Code</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-300" />
                  </button>
                </div>
              </div>

              {/* Section: System & Settings */}
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider px-1">
                  System & Preferences
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsDeviceSyncModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                      <span>Device & Cloud Sync</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsA11yModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                      <span>Display & Eye Care Themes</span>
                    </div>
                    <span className="capitalize text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      {themeMode}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleNotifications}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                      <span>Class Push Reminders</span>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      {notificationGranted ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then(regs => {
                          regs.forEach(r => r.update());
                        });
                      }
                      window.location.reload();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                      <span>Check for Updates / Reload</span>
                    </div>
                  </button>

                  {currentUser?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsAdminModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-950 dark:border-zinc-700 bg-zinc-950 dark:bg-zinc-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Administrator Console</span>
                      </div>
                      {pendingCount > 0 && (
                        <span className="bg-amber-500 text-white rounded-full h-4 px-1.5 text-[10px]">
                          {pendingCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Prominent Mobile Sign Out Button - 100% immune to overflow */}
            <div className="pt-3 mt-4 border-t border-zinc-200 dark:border-zinc-800 night:border-zinc-800/80 sticky bottom-0 bg-white dark:bg-[#12141a] night:bg-[#0b0d11]">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-bold text-sm border border-red-200 dark:border-red-900/60 transition-colors cursor-pointer shadow-2xs"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out / Switch Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Deep-link Import Success Toast Banner */}
      {qrNotification && (
        <div className="bg-emerald-600 text-white px-4 py-3 shadow-md flex items-center justify-between text-xs sm:text-sm font-semibold animate-in slide-in-from-top-4 duration-200">
          <div className="max-w-5xl mx-auto flex items-center justify-between w-full">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
              {qrNotification}
            </span>
            <button
              type="button"
              onClick={() => setQrNotification(null)}
              className="rounded p-1 hover:bg-emerald-700 transition-colors ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full min-w-0 overflow-x-hidden pb-20 md:pb-8">
        {currentUser?.role === 'admin' ? (
          <AdminAccountManagementView
            currentUser={currentUser}
            usersList={allUsers}
            onLogout={handleLogout}
            onAccountsUpdated={handleAccountsUpdated}
          />
        ) : viewMode === 'calendar' ? (
          <CalendarView
            classes={classes}
            logs={logs}
            profile={profile}
            onClassClick={(cls, sch) => {
              setSelectedClassForLog(cls);
              setSelectedScheduleForLog(sch);
            }}
            onSwitchToDaily={() => setViewMode('daily')}
            onAddClassClick={() => {
              setEditingCourse(null);
              setIsAddClassOpen(true);
            }}
          />
        ) : (
          <DailyTimetable
            classes={classes}
            logs={logs}
            onClassClick={(cls, sch) => {
              setSelectedClassForLog(cls);
              setSelectedScheduleForLog(sch);
            }}
            onManageCourse={(cls) => {
              setInspectedCourse(cls);
            }}
            onAddClassClick={() => {
              setEditingCourse(null);
              setIsAddClassOpen(true);
            }}
            onOpenReports={() => setIsReportOpen(true)}
            onOpenTransfer={() => setIsTransferModalOpen(true)}
            onOpenScanModal={() => setIsScanModalOpen(true)}
            onQuickAdvanceLesson={handleQuickAdvanceLesson}
            onSwitchToCalendar={() => setViewMode('calendar')}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar: Floating 1-tap thumb navigation */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 dark:border-zinc-800 night:border-zinc-800/80 bg-white/95 dark:bg-[#12141a]/95 night:bg-[#0b0d11]/95 backdrop-blur-md px-3 py-1.5 flex items-center justify-around shadow-lg transition-colors"
        aria-label="Mobile Navigation"
      >
        <button
          type="button"
          onClick={() => setViewMode('daily')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            viewMode === 'daily'
              ? 'text-zinc-950 dark:text-white'
              : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${viewMode === 'daily' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs' : ''}`}>
            <Clock className="w-4 h-4" />
          </div>
          <span>Daily</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('calendar')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            viewMode === 'calendar'
              ? 'text-zinc-950 dark:text-white'
              : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${viewMode === 'calendar' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs' : ''}`}>
            <Calendar className="w-4 h-4" />
          </div>
          <span>Weekly</span>
        </button>

        {/* Center Quick Add Course Pill */}
        <button
          type="button"
          onClick={() => {
            setEditingCourse(null);
            setIsAddClassOpen(true);
          }}
          className="flex flex-col items-center justify-center -mt-3 p-2.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-lg border-2 border-white dark:border-zinc-900 transition-transform active:scale-95 cursor-pointer"
          title="Add New Course Session"
          aria-label="Add Course"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setIsReportOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer"
        >
          <div className="p-1.5">
            <FileDown className="w-4 h-4" />
          </div>
          <span>Reports</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer"
        >
          <div className="p-1.5 relative">
            <Menu className="w-4 h-4" />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500" />
            )}
          </div>
          <span>Menu</span>
        </button>
      </nav>

      {/* Schedule Screenshot Scanner Modal */}
      {isScanModalOpen && (
        <ScheduleUploadModal
          onClose={() => setIsScanModalOpen(false)}
          onImportParsedCourses={handleImportParsedCourses}
        />
      )}

      {/* Instructor Profile Modal */}
      {isProfileOpen && (
        <ProfileModal
          profile={profile}
          onClose={() => setIsProfileOpen(false)}
          onSaveProfile={handleSaveProfile}
          onResetData={handleResetDemoData}
          hasCourses={classes.length > 0}
        />
      )}

      {/* Course Detail & Syllabus Inspector Modal */}
      {inspectedCourse && (
        <CourseDetailModal
          classSession={inspectedCourse}
          courseLogs={logs.filter(l => l.classInfo.id === inspectedCourse.id)}
          onClose={() => setInspectedCourse(null)}
          onEdit={(cls) => {
            setEditingCourse(cls);
            setInspectedCourse(null);
            setIsAddClassOpen(true);
          }}
          onDelete={handleDeleteCourse}
          onLogNewSession={(cls) => {
            setInspectedCourse(null);
            setSelectedClassForLog(cls);
            setSelectedScheduleForLog(cls.schedule[0]);
          }}
          onOpenSyllabusUpload={(courseId) => {
            setActiveSyllabusCourseId(courseId);
            setIsSyllabusModalOpen(true);
          }}
        />
      )}

      {/* Word Document (.docx) Syllabus Upload Modal */}
      {isSyllabusModalOpen && (
        <SyllabusUploadModal
          courses={classes}
          initialCourseId={activeSyllabusCourseId}
          onClose={() => setIsSyllabusModalOpen(false)}
          onUpdateSyllabus={handleUpdateCourseSyllabus}
        />
      )}

      {/* Add or Edit Course Modal */}
      {isAddClassOpen && (
        <AddClassModal
          initialClass={editingCourse}
          onClose={() => {
            setIsAddClassOpen(false);
            setEditingCourse(null);
          }}
          onSave={handleSaveCourse}
        />
      )}

      {/* Monthly Accomplishment Report Modal */}
      {isReportOpen && (
        <ReportModal
          logs={logs}
          classes={classes}
          profile={profile}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      {/* Data Transfer (Laptop ⇄ Phone) Modal */}
      {isTransferModalOpen && (
        <DataTransferModal
          classes={classes}
          logs={logs}
          profile={profile}
          lastUpdatedTimestamp={lastUpdatedTimestamp}
          onClose={() => setIsTransferModalOpen(false)}
          onImportData={handleImportData}
        />
      )}

      {/* Device & Cross-Device Account Sync Modal */}
      {isDeviceSyncModalOpen && (
        <DeviceSyncModal
          isOpen={isDeviceSyncModalOpen}
          currentUser={currentUser}
          coursesCount={classes.length}
          logsCount={logs.length}
          lastUpdatedTimestamp={lastUpdatedTimestamp}
          onClose={() => setIsDeviceSyncModalOpen(false)}
          onOpenTransfer={() => {
            setIsDeviceSyncModalOpen(false);
            setIsTransferModalOpen(true);
          }}
          onForceCheckSync={() => {
            if (currentUser) {
              fetchAccountSyncFromCloud(currentUser.id).then(cloudSnapshot => {
                if (cloudSnapshot && cloudSnapshot.updatedAt) {
                  const localTime = getUserLastUpdated(currentUser.id);
                  if (cloudSnapshot.updatedAt > localTime) {
                    setClasses(cloudSnapshot.classes);
                    setLogs(cloudSnapshot.logs);
                    if (cloudSnapshot.profile) setProfile(cloudSnapshot.profile);
                    setLastUpdatedTimestamp(cloudSnapshot.updatedAt);
                    setUserLastUpdated(currentUser.id, cloudSnapshot.updatedAt);
                    setQrNotification(`🔄 Successfully updated from ${cloudSnapshot.deviceLabel}!`);
                    setTimeout(() => setQrNotification(null), 4000);
                  } else {
                    setQrNotification('✅ This device is already up to date with the latest changes.');
                    setTimeout(() => setQrNotification(null), 4000);
                  }
                } else {
                  setQrNotification('✅ Local data is up to date.');
                  setTimeout(() => setQrNotification(null), 4000);
                }
              });
            }
          }}
        />
      )}

      {/* Post-Class Topic Logging Modal */}
      {selectedClassForLog && (
        <PostClassUpdateModal
          classSession={selectedClassForLog}
          activeSchedule={selectedScheduleForLog}
          pastLogs={logs.filter(l => l.classInfo.id === selectedClassForLog.id)}
          onClose={() => {
            setSelectedClassForLog(null);
            setSelectedScheduleForLog(undefined);
          }}
          onSuccess={handleLogSuccess}
        />
      )}

      {/* Multi-Tenant Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen || !currentUser}
        onLoginSuccess={handleLoginSuccess}
        onAccountsUpdated={handleAccountsUpdated}
        onClose={() => setIsAuthModalOpen(false)}
        allowClose={!!currentUser}
      />

      {/* Administrator Instructor Account Management Console */}
      {isAdminModalOpen && (
        <AdminDashboardModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          onAccountsUpdated={handleAccountsUpdated}
          callerId={currentUser?.id}
        />
      )}

      {/* Display & Accessibility Preferences Modal */}
      <AccessibilityModal
        isOpen={isA11yModalOpen}
        onClose={() => setIsA11yModalOpen(false)}
        currentTheme={themeMode}
        onThemeChange={handleThemeChange}
        a11ySettings={a11ySettings}
        onA11yChange={handleA11yChange}
      />

    </div>
  );
}

export default App;
