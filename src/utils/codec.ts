import * as LZString from 'lz-string';
import type { ClassSession, SessionLog, InstructorProfile } from '../services/db';

/**
 * Packs full classes, logs, and profile into a lightweight transit payload.
 * Abbreviates keys to drastically reduce payload size for instant QR scanning.
 */
export function packTransferPayload(
  classes: ClassSession[], 
  logs: (SessionLog & { classInfo: ClassSession })[], 
  profile?: InstructorProfile
): string {
  const compact = {
    v: '2',
    c: classes.map(c => ({
      id: c.id,
      sc: c.subjectCode,
      st: c.subjectTitle,
      sec: c.section,
      yr: c.year,
      rm: c.room,
      sch: c.schedule.map(s => ({
        d: s.dayOfWeek,
        st: s.startTime,
        et: s.endTime,
        t: s.type,
        r: s.room
      })),
      syl: c.masterSyllabus
    })),
    l: logs.map(l => ({
      id: l.id,
      cid: l.classInfo?.id,
      dt: typeof l.date === 'string' ? l.date : (l.date instanceof Date ? l.date.toISOString() : new Date().toISOString()),
      st: l.sessionType,
      tc: l.topicsCovered,
      na: l.nextActions,
      el: l.engagementLevel
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
 * Unpacks any payload (v1 verbose or v2 compact) into fully typed ClassSession and SessionLog objects.
 */
export function unpackTransferPayload(parsed: any): {
  classes: ClassSession[];
  logs: (SessionLog & { classInfo: ClassSession })[];
  profile?: InstructorProfile;
} {
  if (!parsed) return { classes: [], logs: [] };

  // 1. Classes unpacking
  const rawClasses = parsed.classes || parsed.c || [];
  const classes: ClassSession[] = rawClasses.map((c: any) => ({
    id: c.id,
    instructorId: c.instructorId || 'inst1',
    subjectCode: c.subjectCode || c.sc || '',
    subjectTitle: c.subjectTitle || c.st || '',
    section: c.section || c.sec || '',
    year: c.year || c.yr || '',
    room: c.room || c.rm || '',
    schedule: (c.schedule || c.sch || []).map((s: any) => ({
      dayOfWeek: s.dayOfWeek ?? s.d ?? 1,
      startTime: s.startTime || s.st || '08:00',
      endTime: s.endTime || s.et || '09:00',
      type: s.type || s.t || 'Lecture',
      room: s.room || s.r || ''
    })),
    masterSyllabus: c.masterSyllabus || c.syl || []
  }));

  const classMap = new Map<string, ClassSession>(classes.map(c => [c.id, c]));

  // 2. Logs unpacking
  const rawLogs = parsed.logs || parsed.l || [];
  const logs: (SessionLog & { classInfo: ClassSession })[] = rawLogs.map((l: any) => {
    const classInfo = l.classInfo || classMap.get(l.cid) || classes[0] || {
      id: l.cid || 'course_default',
      instructorId: 'inst1',
      subjectCode: 'Class',
      subjectTitle: 'Class',
      section: '',
      year: '',
      room: '',
      schedule: [],
      masterSyllabus: []
    };

    return {
      id: l.id || `log_${Date.now()}`,
      date: new Date(l.date || l.dt || Date.now()),
      sessionType: l.sessionType || l.st || 'Lecture',
      topicsCovered: l.topicsCovered || l.tc || [],
      partialTopics: l.partialTopics || l.pt || [],
      nextActions: l.nextActions || l.na || '',
      engagementLevel: l.engagementLevel || l.el || 'High',
      classInfo: classInfo
    };
  });

  // 3. Profile unpacking
  let profile: InstructorProfile | undefined = undefined;
  const rawProf = parsed.profile || parsed.p;
  if (rawProf) {
    profile = {
      fullName: rawProf.fullName || rawProf.fn || '',
      position: rawProf.position || rawProf.pos || '',
      department: rawProf.department || rawProf.dept || '',
      institution: rawProf.institution || rawProf.inst || '',
      employeeId: rawProf.employeeId || rawProf.eid || '',
      email: rawProf.email || rawProf.em || ''
    };
  }

  return { classes, logs, profile };
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
  if (!encoded || typeof encoded !== 'string') return null;

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
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    console.error('Failed to decompress payload:', err);
    return null;
  }
}
