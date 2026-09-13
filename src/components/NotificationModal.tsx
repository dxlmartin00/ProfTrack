import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { 
  Bell, 
  X, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  Trash2,
  HelpCircle
} from 'lucide-react';
import type { ClassSession } from '../services/db';
import { 
  getNotificationPermissionStatus, 
  requestNotificationPermission, 
  sendLocalNotification, 
  playNotificationChime,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  type NotificationPermissionState
} from '../services/pwa';
import { 
  getTodayScheduledReminders, 
  getNotificationHistory, 
  clearNotificationHistory, 
  addNotificationToHistory,
  type DispatchedNotification,
  type ScheduledReminderPreview 
} from '../services/notificationService';
import { useToast } from '../context/ToastContext';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassSession[];
  onPermissionChanged?: (granted: boolean) => void;
}

export const NotificationModal: FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  classes,
  onPermissionChanged
}) => {
  const { showToast } = useToast();
  const [permission, setPermission] = useState<NotificationPermissionState>(getNotificationPermissionStatus());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(isNotificationSoundEnabled());
  const [history, setHistory] = useState<DispatchedNotification[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledReminderPreview[]>([]);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermissionStatus());
      setSoundEnabled(isNotificationSoundEnabled());
      setHistory(getNotificationHistory());
      setScheduled(getTodayScheduledReminders(classes));
    }
  }, [isOpen, classes]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result.status);
      if (onPermissionChanged) {
        onPermissionChanged(result.granted);
      }

      if (result.granted) {
        showToast('Notifications enabled! System alerts are now active.', 'success');
        // Send initial confirmation
        await sendLocalNotification('ProfTrack • Notifications Active', {
          body: 'Automated class reminders and session logs are now active.',
          tag: 'proftrack-welcome'
        });
      } else if (result.status === 'denied') {
        showToast('Notifications are blocked in your browser settings.', 'error');
      }
    } catch {
      showToast('Could not request notification permission.', 'error');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSendTestNotification = async () => {
    const testNotif: DispatchedNotification = {
      id: `${Date.now()}-test`,
      timestamp: Date.now(),
      title: 'ProfTrack • Test Class Reminder',
      body: 'Your notification system is working! You will receive upcoming class alerts and log reminders.',
      type: 'test'
    };

    addNotificationToHistory(testNotif);
    setHistory(getNotificationHistory());

    const dispatched = await sendLocalNotification(testNotif.title, {
      body: testNotif.body,
      tag: 'test-reminder'
    });

    if (dispatched) {
      showToast('🔔 Test notification sent! Check your system tray or lock screen.', 'success');
    } else {
      showToast('🔔 In-app alert triggered! (System notifications are disabled or muted by OS)', 'info');
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setNotificationSoundEnabled(next);
    if (next) {
      playNotificationChime();
      showToast('Sound chime enabled.', 'success');
    } else {
      showToast('Sound chime muted.', 'info');
    }
  };

  const handleClearHistory = () => {
    clearNotificationHistory();
    setHistory([]);
    showToast('Notification history cleared.', 'info');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 id="notification-modal-title" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Notifications & Reminders
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Class schedule alerts and timetable reminders
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Permission Status Banner */}
          {permission === 'granted' && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/30 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    System Push Notifications Active
                  </span>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                  Ready
                </span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
                You will automatically receive alerts 10 minutes before each class and reminders to log attendance when your session ends.
              </p>
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Send Test Reminder</span>
                </button>
              </div>
            </div>
          )}

          {permission === 'default' && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/80 dark:bg-blue-950/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  Enable Class Reminders
                </span>
              </div>
              <p className="text-xs text-blue-800 dark:text-blue-300/90 leading-relaxed">
                Get notified before your lectures start so you never miss a schedule, plus automatic reminders to log syllabus progress.
              </p>
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span>{isRequesting ? 'Requesting Permission...' : 'Allow Push Notifications'}</span>
              </button>
            </div>
          )}

          {permission === 'denied' && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Notifications Blocked in Browser
                  </h3>
                  <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    Your browser has notifications disabled for this site. To unblock:
                  </p>
                  <ol className="list-decimal list-inside text-xs text-amber-800 dark:text-amber-300/90 space-y-1 pl-1 pt-1 font-medium">
                    <li>Click the lock icon (🔒) or site settings icon next to the URL address bar.</li>
                    <li>Toggle <strong>Notifications</strong> to <strong>Allow</strong>.</li>
                    <li>Reload the page to activate system reminders.</li>
                  </ol>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/40 flex items-center justify-between">
                <span className="text-[11px] text-amber-700 dark:text-amber-400">
                  In-app toasts will continue to work.
                </span>
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 dark:text-amber-200 hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Test In-App Alert</span>
                </button>
              </div>
            </div>
          )}

          {/* Sound & Audio Setting */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Audio Chime Alert
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Plays an offline synthesized chime when an alert arrives
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => playNotificationChime()}
                className="px-2.5 py-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                title="Preview Chime Sound"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={handleToggleSound}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  soundEnabled ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
                role="switch"
                aria-checked={soundEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-900 shadow-sm ring-0 transition duration-200 ease-in-out ${
                    soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Today's Scheduled Reminders */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Today's Automated Reminders ({scheduled.length})</span>
              </h3>
            </div>

            {scheduled.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500 dark:text-zinc-400">
                No class schedules detected for today.
              </div>
            ) : (
              <div className="space-y-2">
                {scheduled.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {item.subjectCode}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px] text-zinc-600 dark:text-zinc-300">
                          {item.section}
                        </span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {item.room}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {item.reminderType === '10m-before' 
                          ? `10m warning before ${item.targetTimeStr}`
                          : `Session end & syllabus log reminder`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right font-mono font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                      {item.scheduledTimeStr}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notification History */}
          {history.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Recent Alerts ({history.length})
                </h3>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-[11px] text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {history.map((h) => (
                  <div 
                    key={h.id}
                    className="p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850/50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {h.title}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 font-mono">
                        {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-tight">
                      {h.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Reminders check continuously in background</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
