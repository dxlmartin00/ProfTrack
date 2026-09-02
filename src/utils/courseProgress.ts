import type { ClassSession, SessionLog } from '../services/db';

export interface CourseProgressDetails {
  completedTopics: string[];
  partialTopics: { topic: string; note?: string }[];
  completedCount: number;
  totalTopics: number;
  percent: number;
  currentActiveTopic: string | null;
  isContinuingPartial: boolean;
  latestNote: string | null;
  lastLogDate: Date | null;
  lastLogSessionType?: string;
  lastLogTopicsCovered: string[];
}

/**
 * Computes chronological topic progress, active partial state, and latest meeting notes for a course.
 * Correctly evaluates state chronologically so subsequent completion cleanly clears previous partial status.
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

  courseLogs.forEach(log => {
    log.topicsCovered.forEach(topic => {
      // Check if this specific log marked this topic as in-progress
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
        // This session log marked this topic as completed!
        completedSet.add(topic);
        partialMap.delete(topic);
      }
    });
  });

  const completedTopics = Array.from(completedSet);
  const partialTopics = Array.from(partialMap.entries()).map(([topic, note]) => ({ topic, note }));
  const completedCount = classSession.masterSyllabus.filter(t => completedSet.has(t)).length;
  const totalTopics = classSession.masterSyllabus.length || 1;
  const percent = Math.min(100, Math.round((completedCount / totalTopics) * 100));

  // Determine current active topic (partial topic to resume, or next uncompleted topic)
  let currentActiveTopic: string | null = null;
  let isContinuingPartial = false;
  if (partialTopics.length > 0) {
    currentActiveTopic = partialTopics[0].topic;
    isContinuingPartial = true;
  } else {
    const nextUncompleted = classSession.masterSyllabus.find(t => !completedSet.has(t));
    currentActiveTopic = nextUncompleted || null;
  }

  // Get clean note and date from the most recent session
  const newestLog = allLogs.find(l => l.classInfo?.id === classSession.id); // allLogs is ordered newest-first in App state
  let latestNote: string | null = null;
  if (newestLog?.nextActions) {
    // Strip internal [In Progress: ...] tags to extract clean instructor notes
    const cleanedNote = newestLog.nextActions
      .replace(/\[In Progress:[^\]]+\]/g, '')
      .replace(/•\s*In Progress \/ Continue Next Class:[^•]*/g, '')
      .replace(/In Progress \/ Continue Next Class:[^•]*/g, '')
      .replace(/^[•\s,\-]+|[•\s,\-]+$/g, '')
      .trim();

    latestNote = cleanedNote || null;
  }

  return {
    completedTopics,
    partialTopics,
    completedCount,
    totalTopics,
    percent,
    currentActiveTopic,
    isContinuingPartial,
    latestNote,
    lastLogDate: newestLog ? new Date(newestLog.date) : null,
    lastLogSessionType: newestLog?.sessionType,
    lastLogTopicsCovered: newestLog?.topicsCovered || []
  };
}
