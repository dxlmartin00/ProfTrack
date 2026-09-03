import * as LZString from 'lz-string';
import type { ClassSession, SessionLog, InstructorProfile, ClassSchedule, ScheduleType } from '../services/db';
import { safeJsonParse, sanitizeString } from './crypto';

/**
 * Standard course defaults used to hydrate omitted fields and keep QR codes ultra-compact (< 300 bytes)
 */
const DEFAULT_SYLLABI: Record<string, string[]> = {
  'CS 314': [
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
  ],
  'CS 315': [
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
  ],
  'CS 412': [
    'Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System',
    'Overview of Operating Systems & Kernel Architectures',
    'Processes, Threads & CPU Scheduling Algorithms',
    'Process Synchronization & Deadlock Prevention',
    'Main Memory Management & Virtual Memory Paging',
    'File System Storage & Secondary Subsystems',
    'Protection, Security & Virtual Machine Concepts',
    'Final Examination'
  ],
  'eGE 1': [
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
};

/**
 * Packs full classes, logs, and profile into an ultra-compact transit payload (< 400 bytes).
 * Omit redundant default syllabus dictionaries so QR code never overflows.
 */
export function packTransferPayload(
  classes: ClassSession[], 
  logs: (SessionLog & { classInfo: ClassSession })[], 
  profile?: InstructorProfile,
  metadata?: { updatedAt?: number; deviceId?: string; deviceLabel?: string }
): string {
  const compact = {
    v: '3',
    t: metadata?.updatedAt || Date.now(),
    did: metadata?.deviceId,
    dl: metadata?.deviceLabel,
    c: classes.map(c => {
      const defaultSyl = DEFAULT_SYLLABI[c.subjectCode] || DEFAULT_SYLLABI['CS 315'];
      const isCustomSyllabus = JSON.stringify(c.masterSyllabus) !== JSON.stringify(defaultSyl);

      return {
        id: c.id,
        sc: c.subjectCode,
        st: c.subjectTitle,
        sec: c.section,
        yr: c.year,
        rm: c.room,
        sch: c.schedule.map(s => `${s.dayOfWeek}|${s.startTime}|${s.endTime}|${s.type}|${s.room || ''}`),
        // Only include syllabus if customized by user
        syl: isCustomSyllabus ? c.masterSyllabus : undefined
      };
    }),
    l: logs.map(l => ({
      id: l.id,
      cid: l.classInfo?.id || '',
      dt: typeof l.date === 'string' ? (l.date as string).split('T')[0] : (l.date instanceof Date ? l.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      st: l.sessionType === 'Laboratory' ? 'Lab' : 'Lec',
      tc: l.topicsCovered,
      na: l.nextActions || undefined,
      el: l.engagementLevel === 'Medium' ? 'M' : (l.engagementLevel === 'Low' ? 'L' : 'H')
    })),
    p: profile ? {
      fn: profile.fullName,
      pos: profile.position,
      dept: profile.department,
      inst: profile.institution,
      eid: profile.employeeId,
      em: profile.email
    } : undefined
  };

  return JSON.stringify(compact);
}

/**
 * Unpacks any payload (v1 verbose, v2 compact, or v3 ultra-compact) into fully typed ClassSession and SessionLog objects.
 */
export function unpackTransferPayload(parsed: any): {
  classes: ClassSession[];
  logs: (SessionLog & { classInfo: ClassSession })[];
  profile?: InstructorProfile;
  updatedAt?: number;
  deviceId?: string;
  deviceLabel?: string;
} {
  if (!parsed) return { classes: [], logs: [] };

  // 1. Classes unpacking
  const rawClasses = parsed.classes || parsed.c || [];
  const classes: ClassSession[] = rawClasses.map((c: any) => {
    const rawCode = c.subjectCode || c.sc || 'CS 315';
    const subjectCode = sanitizeString(rawCode, 30);
    const defaultSyl = DEFAULT_SYLLABI[subjectCode] || DEFAULT_SYLLABI['CS 315'] || [];

    // Parse schedules (supports pipe-delimited compact string or object)
    let schedule: ClassSchedule[] = [];
    const rawSch = c.schedule || c.sch || [];
    if (Array.isArray(rawSch)) {
      schedule = rawSch.map((s: any) => {
        if (typeof s === 'string') {
          const [d, st, et, t, r] = s.split('|');
          const type: ScheduleType = (t === 'Lab' || t === 'Laboratory') ? 'Laboratory' : 'Lecture';
          return {
            dayOfWeek: Math.max(1, Math.min(7, parseInt(d, 10) || 1)),
            startTime: sanitizeString(st || '08:00', 10),
            endTime: sanitizeString(et || '09:00', 10),
            type: type,
            room: sanitizeString(r || '', 30)
          };
        }
        return {
          dayOfWeek: Math.max(1, Math.min(7, s.dayOfWeek ?? s.d ?? 1)),
          startTime: sanitizeString(s.startTime || s.st || '08:00', 10),
          endTime: sanitizeString(s.endTime || s.et || '09:00', 10),
          type: (s.type === 'Lab' || s.type === 'Laboratory' || s.t === 'Lab') ? 'Laboratory' : 'Lecture',
          room: sanitizeString(s.room || s.r || '', 30)
        };
      });
    }

    const rawSyllabus = Array.isArray(c.masterSyllabus || c.syl) ? (c.masterSyllabus || c.syl) : defaultSyl;
    const sanitizedSyllabus = rawSyllabus.map((topic: unknown) => sanitizeString(topic, 250)).filter(Boolean);

    return {
      id: sanitizeString(c.id || `course_${Date.now()}`, 50),
      instructorId: sanitizeString(c.instructorId || 'inst1', 50),
      subjectCode: subjectCode,
      subjectTitle: sanitizeString(c.subjectTitle || c.st || subjectCode, 150),
      section: sanitizeString(c.section || c.sec || '', 30),
      year: sanitizeString(c.year || c.yr || '3rd Year', 30),
      room: sanitizeString(c.room || c.rm || '', 30),
      schedule: schedule,
      masterSyllabus: sanitizedSyllabus
    };
  });

  const classMap = new Map<string, ClassSession>(classes.map(c => [c.id, c]));

  // 2. Logs unpacking
  const rawLogs = parsed.logs || parsed.l || [];
  const logs: (SessionLog & { classInfo: ClassSession })[] = rawLogs.map((l: any) => {
    const classInfo = l.classInfo || classMap.get(l.cid) || classes[0] || {
      id: sanitizeString(l.cid || 'course_default', 50),
      instructorId: 'inst1',
      subjectCode: 'Class',
      subjectTitle: 'Class',
      section: '',
      year: '',
      room: '',
      schedule: [],
      masterSyllabus: []
    };

    const sessionType: ScheduleType = (l.sessionType === 'Laboratory' || l.st === 'Lab') ? 'Laboratory' : 'Lecture';
    const engagement = l.engagementLevel || (l.el === 'M' ? 'Medium' : (l.el === 'L' ? 'Low' : 'High'));

    const rawTopics = Array.isArray(l.topicsCovered || l.tc) ? (l.topicsCovered || l.tc) : [];
    const sanitizedTopics = rawTopics.map((t: unknown) => sanitizeString(t, 250)).filter(Boolean);

    return {
      id: sanitizeString(l.id || `log_${Date.now()}`, 50),
      date: new Date(l.date || l.dt || Date.now()),
      sessionType: sessionType,
      topicsCovered: sanitizedTopics,
      nextActions: sanitizeString(l.nextActions || l.na || '', 500),
      engagementLevel: engagement,
      classInfo: classInfo
    };
  });

  // 3. Profile unpacking
  let profile: InstructorProfile | undefined = undefined;
  const rawProf = parsed.profile || parsed.p;
  if (rawProf) {
    profile = {
      fullName: sanitizeString(rawProf.fullName || rawProf.fn || '', 100),
      position: sanitizeString(rawProf.position || rawProf.pos || '', 100),
      department: sanitizeString(rawProf.department || rawProf.dept || '', 120),
      institution: sanitizeString(rawProf.institution || rawProf.inst || '', 120),
      employeeId: sanitizeString(rawProf.employeeId || rawProf.eid || '', 50),
      email: sanitizeString(rawProf.email || rawProf.em || '', 100)
    };
  }

  const updatedAt = typeof parsed.t === 'number' ? parsed.t : (typeof parsed.updatedAt === 'number' ? parsed.updatedAt : undefined);
  const deviceId = sanitizeString(parsed.did || parsed.deviceId || '', 80) || undefined;
  const deviceLabel = sanitizeString(parsed.dl || parsed.deviceLabel || '', 80) || undefined;

  return { classes, logs, profile, updatedAt, deviceId, deviceLabel };
}

/**
 * Safely compress any JS object or string into a URL-safe string.
 * Uses lz-string with safe browser base64 fallback.
 */
export function compressPayload(data: any): string {
  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Check various module export styles (CJS, ESM, default, namespace)
    const lz: any = LZString;
    const compressFn = lz?.compressToEncodedURIComponent || lz?.default?.compressToEncodedURIComponent;
    
    if (typeof compressFn === 'function') {
      const compressed = compressFn(jsonStr);
      if (compressed) return compressed;
    }
    
    // Fallback: UTF-8 safe Base64
    return encodeURIComponent(btoa(encodeURIComponent(jsonStr)));
  } catch (err) {
    console.warn('Fallback encoding used:', err);
    try {
      return encodeURIComponent(JSON.stringify(data));
    } catch {
      return '';
    }
  }
}

/**
 * Safely decompress a URL-safe string into the original JS object.
 */
export function decompressPayload<T = any>(encoded: string): T | null {
  // Prevent ReDoS and memory exhaustion attacks from untrusted QR / deep links
  if (!encoded || typeof encoded !== 'string' || encoded.length > 500000) return null;

  try {
    const lz: any = LZString;
    const decompressFn = lz?.decompressFromEncodedURIComponent || lz?.default?.decompressFromEncodedURIComponent;
    
    let jsonStr: string | null = null;

    if (typeof decompressFn === 'function') {
      try {
        jsonStr = decompressFn(encoded);
      } catch {
        // Fall through
      }
    }

    if (!jsonStr) {
      try {
        jsonStr = decodeURIComponent(atob(decodeURIComponent(encoded)));
      } catch {
        try {
          jsonStr = decodeURIComponent(encoded);
        } catch {
          jsonStr = encoded;
        }
      }
    }

    if (!jsonStr) return null;
    return safeJsonParse<T>(jsonStr, null as any);
  } catch (err) {
    console.error('Failed to decompress payload:', err);
    return null;
  }
}
