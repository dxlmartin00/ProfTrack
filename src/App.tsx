import { useState, useEffect } from 'react';
import { DailyTimetable } from './components/DailyTimetable';
import { PostClassUpdateModal } from './components/PostClassUpdateModal';
import { AddClassModal } from './components/AddClassModal';
import { CourseDetailModal } from './components/CourseDetailModal';
import { ReportModal } from './components/ReportModal';
import { DataTransferModal } from './components/DataTransferModal';
import { ProfileModal, getInitials } from './components/ProfileModal';
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
import { decompressPayload } from './utils/codec';
import { 
  Bell, 
  Wifi, 
  WifiOff, 
  GraduationCap,
  RotateCcw,
  Smartphone,
  CheckCircle2
} from 'lucide-react';

const todayDay = new Date().getDay();

export const SEMESTER_COURSES: ClassSession[] = [
  {
    id: 'course_ege1',
    instructorId: 'inst1',
    subjectCode: 'EGE 1',
    subjectTitle: 'Living in the IT Era',
    section: 'BSBA-BE 2D',
    year: '2nd Year',
    room: 'GF003/CL',
    schedule: [
      { 
        dayOfWeek: todayDay, 
        startTime: '07:30', 
        endTime: '09:00', 
        type: 'Lecture',
        room: 'GF003/CL' 
      },
      { 
        dayOfWeek: (todayDay + 2) % 7 === 0 ? 1 : (todayDay + 2) % 7, 
        startTime: '07:30', 
        endTime: '09:00', 
        type: 'Lecture',
        room: 'GF003/CL' 
      }
    ],
    masterSyllabus: [
      'Introduction to Living in the IT Era IT and its role in society',
      'The Evolution of Information and Communications Technology',
      'Computer Systems, Hardware, and Architecture',
      'Software Applications and Operating Systems',
      'The Internet, World Wide Web, and Cloud Computing',
      'Data Privacy, Security, and Cybersecurity Fundamentals',
      'Digital Ethics, Netiquette, and Intellectual Property',
      'Social Media Impact and Digital Footprints',
      'E-Commerce, Digital Economy, and Online Transactions',
      'Emerging Technologies (AI, IoT, Blockchain, and Robotics)',
      'IT in Business, Education, and Healthcare Systems',
      'Green Computing and Environmental Sustainability',
      'Data Analytics and Information Visualization',
      'Mobile Computing and Wireless Technologies',
      'Web Development Fundamentals and Digital Presence',
      'Digital Media, Graphics, and Content Creation',
      'IT Project Life Cycle and Basic Troubleshooting',
      'Future Trends in Information Technology and Society'
    ]
  },
  {
    id: 'course_cs315',
    instructorId: 'inst1',
    subjectCode: 'CS315',
    subjectTitle: 'Application Development and Emerging Technologies',
    section: 'BSCS-3D',
    year: '3rd Year',
    room: '127/IL2',
    schedule: [
      { 
        dayOfWeek: todayDay, 
        startTime: '10:00', 
        endTime: '11:00', 
        type: 'Lecture',
        room: '127/IL2' 
      },
      { 
        dayOfWeek: todayDay, 
        startTime: '11:00', 
        endTime: '12:30', 
        type: 'Laboratory',
        room: '127/IL2' 
      }
    ],
    masterSyllabus: [
      'Introduction to Application Development & Emerging Technologies',
      'Full-Stack Architecture & Microservices Fundamentals',
      'Cross-Platform Mobile Development with React Native / Flutter',
      'Cloud-Native Deployments, Containers, and Docker',
      'Serverless Computing & Cloud Functions',
      'Progressive Web Applications (PWA) and Offline-First Storage',
      'RESTful & GraphQL API Design, Integration, and Security',
      'Real-Time Systems & WebSocket Communication',
      'Artificial Intelligence Integration & Large Language Models APIs',
      'Edge Computing & Internet of Things (IoT) Device Connectors',
      'DevOps, Continuous Integration & Continuous Delivery (CI/CD)',
      'Authentication, OAuth 2.0, and JWT Token Management',
      'Data Persistence with Relational & NoSQL Cloud Databases',
      'Automated Testing, Code Quality & CI Pipeline Actions',
      'Application Monitoring, Performance Metrics & Telemetry',
      'Mobile App Packaging, Code Signing & Store Deployment',
      'Cybersecurity Best Practices & OWASP Vulnerability Mitigation',
      'Capstone Presentation of Full-Stack Emerging Tech Solution'
    ]
  },
  {
    id: 'course_cs314',
    instructorId: 'inst1',
    subjectCode: 'CS314',
    subjectTitle: 'System Fundamentals',
    section: 'BSCS-3D',
    year: '3rd Year',
    room: 'CL2',
    schedule: [
      { 
        dayOfWeek: todayDay, 
        startTime: '14:30', 
        endTime: '16:00', 
        type: 'Laboratory',
        room: 'CL2' 
      }
    ],
    masterSyllabus: [
      'Introduction to Systems Architecture & Computing Foundations',
      'Explain ethical issues and compare SDLC models',
      'Operating System Concepts: Processes, Threads & Concurrency',
      'Memory Management: Virtual Memory, Paging & Segmentation',
      'File Systems, Storage Architecture & I/O Subsystems',
      'Computer Networking Essentials: TCP/IP & Network Topologies',
      'Distributed Systems & Client-Server Architectures',
      'Database Foundations & Data Storage Engines',
      'System Security: Cryptography, Access Control & Firewalls',
      'Virtualization, Hypervisors & Cloud Virtual Machines',
      'System Performance Evaluation & Benchmarking Tools',
      'Kernel Architecture, System Calls & Device Drivers',
      'System Administration, Shell Scripting & Automation',
      'Backup Strategies, Disaster Recovery & High Availability',
      'Modern System Monitoring, Log Aggregation & Diagnostics',
      'Parallel Computing & Multiprocessing Systems',
      'Embedded & Real-Time Operating Systems Fundamentals',
      'Final Comprehensive Systems Architecture Evaluation'
    ]
  },
  {
    id: 'course_it302',
    instructorId: 'inst1',
    subjectCode: 'IT302',
    subjectTitle: 'Web Systems and Technologies 2 (Advanced Full-Stack)',
    section: 'BSIT 3-A',
    year: '3rd Year',
    room: 'ComLab 4',
    schedule: [
      { 
        dayOfWeek: todayDay, 
        startTime: '13:00', 
        endTime: '14:30', 
        type: 'Laboratory',
        room: 'ComLab 4' 
      },
      { 
        dayOfWeek: (todayDay + 3) % 7 === 0 ? 1 : (todayDay + 3) % 7, 
        startTime: '13:00', 
        endTime: '15:00', 
        type: 'Lecture',
        room: 'Room 305' 
      }
    ],
    masterSyllabus: [
      'Modern Web Architecture & RESTful APIs',
      'State Management & Reactive UI Components',
      'Database Modeling & Object-Relational Mapping',
      'Authentication, Authorization & OAuth 2.0',
      'Cloud Deployment & Automated CI/CD Pipelines'
    ]
  },
  {
    id: 'course_ge104',
    instructorId: 'inst1',
    subjectCode: 'GE104',
    subjectTitle: 'Mathematics in the Modern World (General Education)',
    section: 'BSN 1-C',
    year: '1st Year',
    room: 'Room 204',
    schedule: [
      { 
        dayOfWeek: todayDay === 0 || todayDay === 6 ? 1 : todayDay, 
        startTime: '09:00', 
        endTime: '10:30', 
        type: 'Lecture',
        room: 'Room 204' 
      },
      { 
        dayOfWeek: (todayDay + 2) % 7 === 0 ? 1 : (todayDay + 2) % 7, 
        startTime: '09:00', 
        endTime: '10:30', 
        type: 'Lecture',
        room: 'Room 204' 
      }
    ],
    masterSyllabus: [
      'Mathematics in our World (Patterns in Nature)',
      'Mathematical Language and Symbols',
      'Problem Solving and Reasoning',
      'Data Management & Statistical Tools',
      'Apportionment and Voting Theory'
    ]
  },
  {
    id: 'course_cs101',
    instructorId: 'inst1',
    subjectCode: 'CS101',
    subjectTitle: 'Introduction to Computing',
    section: 'BSCS 1-A',
    year: '1st Year',
    room: 'Room 301',
    schedule: [
      { 
        dayOfWeek: (todayDay + 1) % 7 === 0 ? 1 : (todayDay + 1) % 7, 
        startTime: '08:00', 
        endTime: '10:00', 
        type: 'Lecture',
        room: 'Room 301' 
      }
    ],
    masterSyllabus: [
      'History of Computing & Digital Transformations',
      'Algorithm Design & Pseudocode Foundations',
      'Binary Logic & Number Systems',
      'Basics of Programming Languages',
      'Computing Ethics and Society'
    ]
  },
  {
    id: 'course_it201',
    instructorId: 'inst1',
    subjectCode: 'IT201',
    subjectTitle: 'Data Structures and Algorithms',
    section: 'BSIT 2-B',
    year: '2nd Year',
    room: 'ComLab 2',
    schedule: [
      { 
        dayOfWeek: (todayDay + 4) % 7 === 0 ? 1 : (todayDay + 4) % 7, 
        startTime: '10:30', 
        endTime: '13:30', 
        type: 'Laboratory',
        room: 'ComLab 2' 
      }
    ],
    masterSyllabus: [
      'Arrays, Linked Lists, and Memory Allocation',
      'Stacks, Queues, and Priority Structures',
      'Trees, Binary Search Trees & AVL Balancing',
      'Graphs, Breadth-First & Depth-First Search',
      'Sorting Algorithms & Big-O Complexity Analysis'
    ]
  },
  {
    id: 'course_cs322',
    instructorId: 'inst1',
    subjectCode: 'CS322',
    subjectTitle: 'Information Assurance and Security',
    section: 'BSCS 3-B',
    year: '3rd Year',
    room: 'Room 405',
    schedule: [
      { 
        dayOfWeek: (todayDay + 3) % 7 === 0 ? 1 : (todayDay + 3) % 7, 
        startTime: '16:00', 
        endTime: '17:30', 
        type: 'Lecture',
        room: 'Room 405' 
      }
    ],
    masterSyllabus: [
      'Security Principles: Confidentiality, Integrity, Availability',
      'Symmetric & Asymmetric Cryptography',
      'Threat Modeling & Vulnerability Assessments',
      'Network Security Protocols & Firewalls',
      'Incident Response & Forensic Basics'
    ]
  }
];

export const INITIAL_SEMESTER_LOGS: (SessionLog & { classInfo: ClassSession })[] = [
  {
    id: 'log_cs315_recent',
    date: new Date(),
    sessionType: 'Lecture',
    topicsCovered: ['Introduction to Application Development & Emerging Technologies'],
    nextActions: '[In Progress: Introduction to Application Development & Emerging Technologies - Stopped at Slide #20] Completed section 1.',
    engagementLevel: 'High',
    classInfo: SEMESTER_COURSES[1]
  },
  {
    id: 'log_ege1_recent',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000),
    sessionType: 'Lecture',
    topicsCovered: ['Introduction to Living in the IT Era IT and its role in society'],
    nextActions: 'Completed topic 1 orientation. Next meeting start ICT Evolution.',
    engagementLevel: 'High',
    classInfo: SEMESTER_COURSES[0]
  },
  {
    id: 'log_cs314_recent',
    date: new Date(Date.now() - 48 * 60 * 60 * 1000),
    sessionType: 'Laboratory',
    topicsCovered: ['Explain ethical issues and compare SDLC models'],
    nextActions: 'Submitted lab activity 1 on SDLC workflows.',
    engagementLevel: 'High',
    classInfo: SEMESTER_COURSES[2]
  }
];

const LOCAL_STORAGE_KEY = 'proftrack_classes_cache';
const LOCAL_STORAGE_LOGS_KEY = 'proftrack_session_logs';
const LOCAL_STORAGE_PROFILE_KEY = 'proftrack_instructor_profile';

export function App() {
  // Load cached profile or default
  const [profile, setProfile] = useState<InstructorProfile>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return DEFAULT_INSTRUCTOR_PROFILE;
  });

  // Load cached classes or recover semester courses
  const [classes, setClasses] = useState<ClassSession[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return SEMESTER_COURSES;
  });

  // Load cached session logs or recover semester logs
  const [logs, setLogs] = useState<(SessionLog & { classInfo: ClassSession })[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            ...item,
            date: new Date(item.date),
          }));
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_SEMESTER_LOGS;
  });

  // Modal States
  const [selectedClassForLog, setSelectedClassForLog] = useState<ClassSession | null>(null);
  const [selectedScheduleForLog, setSelectedScheduleForLog] = useState<ClassSchedule | undefined>(undefined);
  const [inspectedCourse, setInspectedCourse] = useState<ClassSession | null>(null);
  const [editingCourse, setEditingCourse] = useState<ClassSession | null>(null);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(classes));
    } catch (e) {
      console.error('Failed to save classes to storage', e);
    }
  }, [classes]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save logs to storage', e);
    }
  }, [logs]);

  // Save profile helper
  const handleSaveProfile = (newProfile: InstructorProfile) => {
    setProfile(newProfile);
    try {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(newProfile));
    } catch (e) {
      console.error('Failed to save profile to storage', e);
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
          const importedClasses: ClassSession[] = parsed.classes || parsed.c || [];
          const rawLogs = parsed.logs || parsed.l || [];
          const importedLogs: (SessionLog & { classInfo: ClassSession })[] = rawLogs.map((item: any) => ({
            ...item,
            date: new Date(item.date),
          }));
          const importedProfile: InstructorProfile = parsed.profile || parsed.p;

          if (importedClasses.length > 0 || importedLogs.length > 0) {
            setClasses(importedClasses);
            setLogs(importedLogs);
            if (importedProfile) {
              setProfile(importedProfile);
              localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(importedProfile));
            }
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(importedClasses));
            localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(importedLogs));
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

  // Reset or Restore default courses
  const handleResetDemoData = () => {
    if (classes.length > 0) {
      if (window.confirm('Reset schedule back to all 8 semester courses?')) {
        setClasses(SEMESTER_COURSES);
        setLogs(INITIAL_SEMESTER_LOGS);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEMESTER_COURSES));
        localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(INITIAL_SEMESTER_LOGS));
      }
    } else {
      setClasses(SEMESTER_COURSES);
      setLogs(INITIAL_SEMESTER_LOGS);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEMESTER_COURSES));
      localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(INITIAL_SEMESTER_LOGS));
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
                  {profile.fullName}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[130px]">
                  {profile.position}
                </span>
              </div>
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
        />
      </main>

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

    </div>
  );
}

export default App;
