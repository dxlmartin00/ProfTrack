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
import type { ClassSession, ClassSchedule, SessionLog, ScheduleType, InstructorProfile } from './services/db';
import { 
  addClass as dbAddClass, 
  updateClass as dbUpdateClass, 
  deleteClass as dbDeleteClass, 
  submitSessionLog,
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
import { 
  initializeAuth, 
  getUserStorageKeys, 
  logoutUser, 
  getStoredUsers, 
  DEFAULT_ADMIN_ACCOUNT 
} from './services/auth';
import type { UserAccount } from './services/auth';
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
  LogOut
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
  const keys = getUserStorageKeys(user.id);
  try {
    const cached = localStorage.getItem(keys.classesKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load user classes:', err);
  }
  if (user.id === DEFAULT_ADMIN_ACCOUNT.id) {
    return OFFICIAL_SEMESTER_COURSES;
  }
  return [];
};

const loadUserLogs = (user: UserAccount | null): (SessionLog & { classInfo: ClassSession })[] => {
  if (!user) return [];
  const keys = getUserStorageKeys(user.id);
  try {
    const cached = localStorage.getItem(keys.logsKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          ...item,
          date: new Date(item.date)
        }));
      }
    }
  } catch (err) {
    console.error('Failed to load user logs:', err);
  }
  if (user.id === DEFAULT_ADMIN_ACCOUNT.id) {
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
    position: user.role === 'admin' ? 'Department Chair / Assistant Professor I' : 'Instructor I',
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
  const [allUsers, setAllUsers] = useState<UserAccount[]>(() => getStoredUsers());

  // 2. User-isolated Data States
  const [profile, setProfile] = useState<InstructorProfile>(() => loadUserProfile(currentUser));
  const [classes, setClasses] = useState<ClassSession[]>(() => loadUserClasses(currentUser));
  const [logs, setLogs] = useState<(SessionLog & { classInfo: ClassSession })[]>(() => loadUserLogs(currentUser));

  // 3. Isolated Storage Auto-Sync
  useEffect(() => {
    if (!currentUser) return;
    const keys = getUserStorageKeys(currentUser.id);
    localStorage.setItem(keys.classesKey, JSON.stringify(classes));
  }, [classes, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const keys = getUserStorageKeys(currentUser.id);
    localStorage.setItem(keys.logsKey, JSON.stringify(logs));
  }, [logs, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const keys = getUserStorageKeys(currentUser.id);
    localStorage.setItem(keys.profileKey, JSON.stringify(profile));
  }, [profile, currentUser]);

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
          const { classes: importedClasses, logs: importedLogs, profile: importedProfile } = unpackTransferPayload(parsed);

          if (importedClasses.length > 0 || importedLogs.length > 0) {
            setClasses(importedClasses);
            setLogs(importedLogs);
            if (importedProfile) {
              setProfile(importedProfile);
            }
            setQrNotification(`Successfully restored ${importedClasses.length} courses, logs, and profile!`);
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
    importedProfile?: InstructorProfile
  ) => {
    setClasses(importedClasses);
    setLogs(importedLogs);
    if (importedProfile) {
      handleSaveProfile(importedProfile);
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
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-xs">
        <div className="max-w-5xl mx-auto flex h-14 sm:h-16 items-center justify-between px-3.5 sm:px-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-zinc-950 text-white shadow-2xs shrink-0">
                <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <span className="font-bold text-sm sm:text-base tracking-tight text-zinc-950">
                ProfTrack
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-5 text-sm">
              <button
                type="button"
                onClick={() => {}}
                className="text-zinc-950 font-semibold transition-colors hover:text-zinc-700 cursor-pointer"
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setIsScanModalOpen(true)}
                className="text-zinc-600 transition-colors hover:text-zinc-950 cursor-pointer flex items-center gap-1.5"
              >
                <Camera className="h-3.5 w-3.5 text-zinc-700" />
                Scan Image
              </button>
              <button
                type="button"
                onClick={() => setIsReportOpen(true)}
                className="text-zinc-600 transition-colors hover:text-zinc-950 cursor-pointer"
              >
                Accomplishment Reports
              </button>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(true)}
                className="text-zinc-600 transition-colors hover:text-zinc-950 cursor-pointer flex items-center gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                Transfer to Phone
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Online / Offline Status Badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full p-1.5 sm:px-3 sm:py-1 text-xs font-semibold border shrink-0 ${
                isOnline
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-amber-300 bg-amber-50 text-amber-900'
              }`}
              title={isOnline ? 'Network Connected • Local Mode Active' : 'Offline Mode • Local Cache Active'}
            >
              {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-700" /> : <WifiOff className="h-3.5 w-3.5 text-amber-700" />}
              <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </span>

            {/* Notification Bell / Test Trigger button */}
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border text-xs sm:text-sm font-medium transition-colors cursor-pointer shrink-0 ${
                notificationGranted
                  ? 'border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700'
                  : 'border-zinc-950 bg-zinc-950 text-white shadow-2xs hover:bg-zinc-800'
              }`}
              aria-label={notificationGranted ? 'Web Push Active' : 'Enable Web Push Reminders'}
              title={notificationGranted ? 'Web Push Active' : 'Enable Web Push Reminders'}
            >
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
              className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer shrink-0"
              title="Refresh / Check for Updates"
              aria-label="Refresh / Check for Updates"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            {/* Admin Console Shortcut (Only visible for Admin martin.dan) */}
            {currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(true)}
                className="inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-950 bg-zinc-950 text-white px-2.5 sm:px-3 text-xs font-bold shadow-2xs hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                title="Administrator Console: Manage and approve instructor accounts"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Admin Console</span>
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
              className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white p-0.5 sm:pr-2.5 sm:pl-0.5 text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50 transition-colors cursor-pointer shrink-0 shadow-2xs group"
              aria-label={`Profile: ${profile.fullName} (${profile.position})`}
              title="View & Edit Instructor Profile"
            >
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-zinc-950 text-white text-xs font-bold shrink-0">
                {userInitials}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-tight pr-1">
                <span className="text-xs font-bold text-zinc-950 group-hover:text-zinc-800 truncate max-w-[130px]">
                  {currentUser?.username || profile.fullName}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[130px]">
                  {currentUser?.role === 'admin' ? 'Administrator' : 'Instructor'}
                </span>
              </div>
            </button>

            {/* Switch Account / Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer shrink-0"
              title="Switch Account / Sign Out"
              aria-label="Switch Account / Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

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
      <main className="flex-1 w-full min-w-0 overflow-x-hidden">
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
        />
      </main>

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
          onClose={() => setIsTransferModalOpen(false)}
          onImportData={handleImportData}
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
        onClose={() => setIsAuthModalOpen(false)}
        allowClose={!!currentUser}
      />

      {/* Administrator Instructor Account Management Console */}
      {isAdminModalOpen && (
        <AdminDashboardModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          onAccountsUpdated={handleAccountsUpdated}
        />
      )}

    </div>
  );
}

export default App;
