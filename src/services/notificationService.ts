import type { ClassSession, SessionLog } from './db';
import { sendLocalNotification } from './pwa';

export interface DispatchedNotification {
  id: string;
  timestamp: number;
  title: string;
  body: string;
  type: 'upcoming' | 'started' | 'ended' | 'test';
  subjectCode?: string;
  section?: string;
}

export interface ScheduledReminderPreview {
  id: string;
  subjectCode: string;
  subjectTitle?: string;
  section: string;
  room: string;
  reminderType: '10m-before' | 'start' | 'end';
  scheduledTimeStr: string;
  targetTimeStr: string;
}

const HISTORY_KEY = 'proftrack_notification_history';
const FIRED_PREFIX = 'proftrack_alert_fired_';

export const getNotificationHistory = (): DispatchedNotification[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addNotificationToHistory = (notif: DispatchedNotification): void => {
  try {
    const history = getNotificationHistory();
    const updated = [notif, ...history.filter(h => h.id !== notif.id)].slice(0, 30);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota
  }
};

export const clearNotificationHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Ignore
  }
};

const formatTime12 = (time24: string): string => {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
};

/**
 * Returns a list of all automated reminders scheduled to run for today.
 */
export const getTodayScheduledReminders = (classes: ClassSession[]): ScheduledReminderPreview[] => {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const reminders: ScheduledReminderPreview[] = [];

  classes.forEach((cls) => {
    cls.schedule.forEach((sch) => {
      if (sch.dayOfWeek === currentDay) {
        const [startH, startM] = sch.startTime.split(':').map(Number);

        // 10 minutes prior
        let warnH = startH;
        let warnM = startM - 10;
        if (warnM < 0) {
          warnM += 60;
          warnH -= 1;
        }
        const warnTimeStr = `${warnH.toString().padStart(2, '0')}:${warnM.toString().padStart(2, '0')}`;

        reminders.push({
          id: `${cls.id}-${sch.startTime}-10m`,
          subjectCode: cls.subjectCode,
          subjectTitle: cls.subjectTitle,
          section: cls.section,
          room: sch.room || cls.room || 'CL',
          reminderType: '10m-before',
          scheduledTimeStr: formatTime12(warnTimeStr),
          targetTimeStr: formatTime12(sch.startTime)
        });

        reminders.push({
          id: `${cls.id}-${sch.endTime}-end`,
          subjectCode: cls.subjectCode,
          subjectTitle: cls.subjectTitle,
          section: cls.section,
          room: sch.room || cls.room || 'CL',
          reminderType: 'end',
          scheduledTimeStr: formatTime12(sch.endTime),
          targetTimeStr: formatTime12(sch.endTime)
        });
      }
    });
  });

  return reminders.sort((a, b) => a.scheduledTimeStr.localeCompare(b.scheduledTimeStr));
};

/**
 * Core periodic check to trigger upcoming class reminders and session end log reminders.
 */
export const checkScheduledClassReminders = async (
  classes: ClassSession[],
  logs: Array<SessionLog & { classInfo?: ClassSession }> | Record<string, SessionLog[]>,
  onInAppAlert?: (title: string, body: string, type: 'upcoming' | 'started' | 'ended') => void
): Promise<void> => {
  const now = new Date();
  const currentDay = now.getDay();
  const dateKey = now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const cls of classes) {
    for (const sch of cls.schedule) {
      if (sch.dayOfWeek !== currentDay) continue;

      const [startH, startM] = sch.startTime.split(':').map(Number);
      const [endH, endM] = sch.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      const diffToStart = startMinutes - nowMinutes;
      const diffToEnd = endMinutes - nowMinutes;

      // 1. Upcoming reminder (Between 10 and 1 minutes before start)
      if (diffToStart >= 1 && diffToStart <= 15) {
        const key = `${FIRED_PREFIX}${dateKey}_${cls.id}_${sch.startTime}_upcoming`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, 'true');
          const title = `🔔 Upcoming: ${cls.subjectCode} (${cls.section})`;
          const body = `Starts in ${diffToStart}m at ${formatTime12(sch.startTime)} in ${sch.room || cls.room || 'CL'}.`;
          
          await sendLocalNotification(title, {
            body,
            tag: `upcoming-${cls.id}`
          });

          addNotificationToHistory({
            id: `${Date.now()}-upcoming`,
            timestamp: Date.now(),
            title,
            body,
            type: 'upcoming',
            subjectCode: cls.subjectCode,
            section: cls.section
          });

          if (onInAppAlert) {
            onInAppAlert(title, body, 'upcoming');
          }
        }
      }

      // 2. Class session ended reminder (Within 30 minutes after end)
      if (diffToEnd <= 0 && Math.abs(diffToEnd) <= 30) {
        const key = `${FIRED_PREFIX}${dateKey}_${cls.id}_${sch.endTime}_ended`;
        if (!localStorage.getItem(key)) {
          // Check if session was already logged today
          const isLoggedToday = Array.isArray(logs)
            ? logs.some((l) => {
                const isMatchingClass = l.classInfo?.id === cls.id;
                const logD = new Date(l.date);
                return isMatchingClass && logD.toISOString().slice(0, 10) === dateKey;
              })
            : (logs[cls.id] || []).some((l) => {
                const logD = new Date(l.date);
                return logD.toISOString().slice(0, 10) === dateKey;
              });

          if (!isLoggedToday) {
            localStorage.setItem(key, 'true');
            const title = `📝 Class Ended: ${cls.subjectCode} (${cls.section})`;
            const body = `Session finished. Tap to record topics covered and attendance.`;

            await sendLocalNotification(title, {
              body,
              tag: `ended-${cls.id}`
            });

            addNotificationToHistory({
              id: `${Date.now()}-ended`,
              timestamp: Date.now(),
              title,
              body,
              type: 'ended',
              subjectCode: cls.subjectCode,
              section: cls.section
            });

            if (onInAppAlert) {
              onInAppAlert(title, body, 'ended');
            }
          }
        }
      }
    }
  }
};
