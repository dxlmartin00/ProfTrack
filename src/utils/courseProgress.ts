import type { ClassSession, SessionLog } from '../services/db';

export interface CourseNoteItem {
  id: string;
  date: Date;
  note: string;
  topic?: string;
  isDone: boolean;
}

export interface CourseProgressDetails {
  completedTopics: string[];
  partialTopics: { topic: string; note?: string }[];
  completedCount: number;
  totalTopics: number;
  percent: number;
  currentActiveTopic: string | null;
  nextLessonTopic: string | null;
  isContinuingPartial: boolean;
  latestNote: string | null;
  isLatestNoteDone: boolean;
  latestNoteDate: Date | null;
  notesHistory: CourseNoteItem[];
  lastLogDate: Date | null;
  lastLogSessionType?: string;
  lastLogTopicsCovered: string[];
}

/**
 * Strips internal tracking tags (like [In Progress: ...]) to extract human notes.
 */
export function extractCleanNote(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/\[In Progress:[^\]]+\]/g, '')
    .replace(/•\s*In Progress \/ Continue Next Class:[^•]*/g, '')
    .replace(/In Progress \/ Continue Next Class:[^•]*/g, '')
    .replace(/^[•\s,\-]+|[•\s,\-]+$/g, '')
    .trim();
  return cleaned || null;
}

/**
 * Computes chronological topic progress, active partial state, next lesson, and full notes history.
 * Notes and cut-off records are permanently preserved and never erased across sessions.
 */
export function getCourseProgressDetails(
  classSession: ClassSession,
  allLogs: (SessionLog & { classInfo: ClassSession })[]
): CourseProgressDetails {
  // Filter logs for this specific course and sort chronologically (oldest -> newest)
  const courseLogs = allLogs
    .filter(l => l.classInfo?.id === classSession.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const completedSet = new Set<string>();
  const partialMap = new Map<string, string | undefined>();
  const notesHistory: CourseNoteItem[] = [];

  courseLogs.forEach(log => {
    // 1. Process syllabus topics status chronologically
    log.topicsCovered.forEach(topic => {
      const match = log.nextActions?.match(
        new RegExp(`\\[In Progress: ${topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: - ([^\\]]+))?\\]`)
      );

      if (match) {
        completedSet.delete(topic);
        partialMap.set(topic, match[1]?.trim() || undefined);
      } else if (log.nextActions?.includes(`[In Progress: ${topic}]`)) {
        completedSet.delete(topic);
        partialMap.set(topic, undefined);
      } else {
        // Session log marked this topic as completed!
        completedSet.add(topic);
        partialMap.delete(topic);
      }
    });

    // 2. Extract note history so past notes and reminders are NEVER erased
    const cleanNote = extractCleanNote(log.nextActions);
    if (cleanNote) {
      const isDone = cleanNote.includes('[Note Done]') || cleanNote.includes('[Completed]') || cleanNote.startsWith('✓');
      const displayNote = cleanNote.replace(/\[Note Done\]|\[Completed\]|^✓\s*/g, '').trim();
      if (displayNote) {
        notesHistory.push({
          id: log.id || `note_${new Date(log.date).getTime()}`,
          date: new Date(log.date),
          note: displayNote,
          isDone: isDone,
          topic: log.topicsCovered[0]
        });
      }
    }
  });

  const completedTopics = Array.from(completedSet);
  const partialTopics = Array.from(partialMap.entries()).map(([topic, note]) => ({ topic, note }));
  const completedCount = classSession.masterSyllabus.filter(t => completedSet.has(t)).length;
  const totalTopics = classSession.masterSyllabus.length || 1;
  const percent = Math.min(100, Math.round((completedCount / totalTopics) * 100));

  // Determine current active topic and the next lesson topic
  let currentActiveTopic: string | null = null;
  let nextLessonTopic: string | null = null;
  let isContinuingPartial = false;

  if (partialTopics.length > 0) {
    currentActiveTopic = partialTopics[0].topic;
    isContinuingPartial = true;

    // Find the next lesson in the syllabus immediately following this partial topic
    const partialIdx = classSession.masterSyllabus.indexOf(currentActiveTopic);
    if (partialIdx !== -1 && partialIdx + 1 < classSession.masterSyllabus.length) {
      nextLessonTopic = classSession.masterSyllabus[partialIdx + 1];
    } else {
      nextLessonTopic = classSession.masterSyllabus.find(t => !completedSet.has(t) && t !== currentActiveTopic) || null;
    }
  } else {
    // Find the next uncompleted lesson
    const uncompletedIdx = classSession.masterSyllabus.findIndex(t => !completedSet.has(t));
    if (uncompletedIdx !== -1) {
      currentActiveTopic = classSession.masterSyllabus[uncompletedIdx];
      if (uncompletedIdx + 1 < classSession.masterSyllabus.length) {
        nextLessonTopic = classSession.masterSyllabus[uncompletedIdx + 1];
      }
    }
  }

  // Retrieve most recent note from history (guarantees notes are never erased)
  const mostRecentNoteItem = notesHistory.length > 0 ? notesHistory[notesHistory.length - 1] : null;
  const latestNote = mostRecentNoteItem ? mostRecentNoteItem.note : null;
  const isLatestNoteDone = mostRecentNoteItem ? mostRecentNoteItem.isDone : false;
  const latestNoteDate = mostRecentNoteItem ? mostRecentNoteItem.date : null;

  const newestLog = courseLogs.length > 0 ? courseLogs[courseLogs.length - 1] : null;

  return {
    completedTopics,
    partialTopics,
    completedCount,
    totalTopics,
    percent,
    currentActiveTopic,
    nextLessonTopic,
    isContinuingPartial,
    latestNote,
    isLatestNoteDone,
    latestNoteDate,
    notesHistory,
    lastLogDate: newestLog ? new Date(newestLog.date) : null,
    lastLogSessionType: newestLog?.sessionType,
    lastLogTopicsCovered: newestLog?.topicsCovered || []
  };
}
