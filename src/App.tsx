import { useState, useEffect } from 'react';
import { DailyTimetable } from './components/DailyTimetable';
import { PostClassUpdateModal } from './components/PostClassUpdateModal';
import { AddClassModal } from './components/AddClassModal';
import { CourseDetailModal } from './components/CourseDetailModal';
import { ReportModal } from './components/ReportModal';
import { DataTransferModal } from './components/DataTransferModal';
import type { ClassSession, ClassSchedule, SessionLog, ScheduleType } from './services/db';
import { 
  addClass as dbAddClass, 
  updateClass as dbUpdateClass, 
  deleteClass as dbDeleteClass, 
  submitSessionLog 
} from './services/db';
import { 
  requestNotificationPermission, 
  sendLocalNotification, 
  registerServiceWorker 
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

const INITIAL_MOCK_CLASSES: ClassSession[] = [
  {
    id: 'c1',
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
        dayOfWeek: (todayDay + 3) % 7, 
        startTime: '09:00', 
        endTime: '10:30', 
        type: 'Lecture',
        room: 'Room 204' 
      }
    ],
    masterSyllabus: [
      'Mathematics in our World: Patterns and Numbers in Nature',
      'Mathematical Language, Symbols, and Syntax',
      'Problem Solving and Reasoning Strategies',
      'Data Management & Statistical Analysis',
      'Mathematics of Graphs & Network Optimization'
    ]
  },
  {
    id: 'c2',
    instructorId: 'inst1',
    subjectCode: 'CS101',
    subjectTitle: 'Computer Programming & Systems (Lecture & Lab)',
    section: 'BSCS 1-A',
    year: '1st Year',
    room: 'Main Campus',
    schedule: [
      { 
        dayOfWeek: todayDay === 0 || todayDay === 6 ? 1 : todayDay, 
        startTime: '11:00', 
        endTime: '12:00', 
        type: 'Lecture',
        room: 'Lecture Hall 101' 
      },
      { 
        dayOfWeek: (todayDay + 2) % 7, 
        startTime: '13:00', 
        endTime: '16:00', 
        type: 'Laboratory',
        room: 'Computer Lab 3' 
      }
    ],
    masterSyllabus: [
      'Course Overview & Computational Thinking',
      'Asymptotic Notation & Big-O Complexity',
      'Arrays, Memory Layouts & Pointers',
      'Laboratory Experiment 1: Algorithm Benchmarking',
      'Stacks, Queues, and Recursion',
      'Laboratory Experiment 2: Dynamic Linked Structures'
    ]
  },
  {
    id: 'c3',
    instructorId: 'inst1',
    subjectCode: 'ETHICS',
    subjectTitle: 'Ethics & Moral Reasoning (General Education)',
    section: 'BAP 2-A',
    year: '2nd Year',
    room: 'Auditorium B',
    schedule: [
      { 
        dayOfWeek: (todayDay + 1) % 7, 
        startTime: '13:00', 
        endTime: '16:00', 
        type: 'Lecture',
        room: 'Auditorium B' 
      }
    ],
    masterSyllabus: [
      'Fundamental Concepts: Moral vs. Non-Moral Standards',
      'The Moral Agent: Culture and Moral Behavior',
      'The Act: Feelings and Rationality in Decision-Making',
      'Ethical Frameworks: Utilitarianism, Deontology, Virtue Ethics'
    ]
  }
];

const INITIAL_MOCK_LOGS = [
  {
    id: 'l1',
    date: new Date(),
    sessionType: 'Lecture' as ScheduleType,
    topicsCovered: ['Mathematics in our World: Patterns and Numbers in Nature'],
    nextActions: 'Prepare Chapter 1 diagnostic problem set for next meeting',
    engagementLevel: 'High',
    classInfo: INITIAL_MOCK_CLASSES[0]
  },
  {
    id: 'l2',
    date: new Date(Date.now() - 86400000 * 2),
    sessionType: 'Lecture' as ScheduleType,
    topicsCovered: ['Course Overview & Computational Thinking'],
    nextActions: 'Ensure all students have installed the lab compiler toolchain',
    engagementLevel: 'Medium',
    classInfo: INITIAL_MOCK_CLASSES[1]
  }
];

const LOCAL_STORAGE_KEY = 'proftrack_classes_prod_v1';
const LOCAL_STORAGE_LOGS_KEY = 'proftrack_logs_prod_v1';

function App() {
  const [classes, setClasses] = useState<ClassSession[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return [];
  });

  const [logs, setLogs] = useState<(SessionLog & { classInfo: ClassSession })[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          date: new Date(item.date),
        }));
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Modal States
  const [selectedClassForLog, setSelectedClassForLog] = useState<ClassSession | null>(null);
  const [selectedScheduleForLog, setSelectedScheduleForLog] = useState<ClassSchedule | undefined>(undefined);
  const [inspectedCourse, setInspectedCourse] = useState<ClassSession | null>(null);
  const [editingCourse, setEditingCourse] = useState<ClassSession | null>(null);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
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

  // PWA Service Worker & Deep-link / QR Code URL hash init
  useEffect(() => {
    registerServiceWorker();

    // 1. Process QR Code Import from URL Hash (#import=...)
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

          if (importedClasses.length > 0 || importedLogs.length > 0) {
            setClasses(importedClasses);
            setLogs(importedLogs);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(importedClasses));
            localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(importedLogs));
            setQrNotification(`Successfully restored ${importedClasses.length} courses and ${importedLogs.length} session logs from QR Code!`);
            setTimeout(() => setQrNotification(null), 6000);
          }
        }
      } catch (err) {
        console.error('Failed to parse QR code URL payload:', err);
      } finally {
        // Clean URL hash without reload
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    // 2. Process deep-link logClassId
    const urlParams = new URLSearchParams(window.location.search);
    const logClassId = urlParams.get('logClassId');
    if (logClassId) {
      const targetClass = classes.find((c) => c.id === logClassId);
      if (targetClass) {
        setSelectedClassForLog(targetClass);
        setSelectedScheduleForLog(targetClass.schedule[0]);
      }
    }
  }, [classes]);

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
    importedLogs: (SessionLog & { classInfo: ClassSession })[]
  ) => {
    setClasses(importedClasses);
    setLogs(importedLogs);
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

  // Toggle clean state vs sample demo dataset
  const handleResetDemoData = () => {
    if (classes.length > 0) {
      if (window.confirm('Clear all courses and start with a completely clean schedule?')) {
        setClasses([]);
        setLogs([]);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(LOCAL_STORAGE_LOGS_KEY);
      }
    } else {
      if (window.confirm('Load sample demonstration courses and syllabus?')) {
        setClasses(INITIAL_MOCK_CLASSES);
        setLogs(INITIAL_MOCK_LOGS);
      }
    }
  };

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
              <span className="font-bold text-sm sm:text-base tracking-tight text-zinc-950">ProfTrack</span>
              <span className="hidden sm:inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 font-mono">
                PWA
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-4 text-sm font-medium" aria-label="Main Navigation">
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
              title={isOnline ? 'Network Connected • Cloud Sync Active' : 'Offline Mode • Local IndexedDB Active'}
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

            {/* Instructor avatar badge */}
            <div 
              onClick={handleResetDemoData}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-bold text-zinc-800 shrink-0 cursor-pointer hover:bg-zinc-200 transition-colors"
              aria-label="Instructor profile (Click to manage demo data)"
              title="Instructor profile (Click to manage demo data)"
            >
              PD
            </div>
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
      <main className="flex-1">
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
          onClose={() => setIsReportOpen(false)}
        />
      )}

      {/* Data Transfer (Laptop ⇄ Phone) Modal */}
      {isTransferModalOpen && (
        <DataTransferModal
          classes={classes}
          logs={logs}
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
