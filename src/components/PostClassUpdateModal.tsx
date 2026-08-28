import { useState, useMemo } from 'react';
import type { FC, MouseEvent } from 'react';
import type { ClassSession, ClassSchedule, ScheduleType, SessionLog } from '../services/db';
import { 
  X, 
  Check, 
  FlaskConical, 
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Hourglass,
  RotateCcw
} from 'lucide-react';

export type TopicProgressStatus = 'none' | 'completed' | 'in_progress';

export interface LogData {
  sessionType?: ScheduleType;
  topicsCovered: string[];
  partialTopics: string[];
  cutoffNotes?: Record<string, string>;
  allActiveCompletedTopics: string[];
  allActivePartialTopics: string[];
  nextActions: string;
  engagementLevel: string;
}

interface PostClassUpdateModalProps {
  classSession: ClassSession;
  activeSchedule?: ClassSchedule;
  pastLogs?: (SessionLog & { classInfo: ClassSession })[];
  onClose: () => void;
  onSuccess: (data: LogData) => void;
}

export const PostClassUpdateModal: FC<PostClassUpdateModalProps> = ({ 
  classSession, 
  activeSchedule,
  pastLogs = [],
  onClose, 
  onSuccess 
}) => {
  const [sessionType, setSessionType] = useState<ScheduleType>(
    activeSchedule?.type || 'Lecture'
  );

  // 1. Calculate past completed vs partial topics and their prior cut-off notes
  const { initialCompletedSet, initialPartialSet, initialCutoffNotes } = useMemo(() => {
    const completedSet = new Set<string>();
    const partialSet = new Set<string>();
    const cutoffs = new Map<string, string>();

    const courseLogs = pastLogs.filter(
      l => l.classInfo.id === classSession.id || l.classInfo.subjectCode === classSession.subjectCode
    );

    // Read chronological logs
    courseLogs.forEach(log => {
      log.topicsCovered.forEach(topic => {
        const match = log.nextActions?.match(new RegExp(`\\[In Progress: ${topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: - ([^\\]]+))?\\]`));
        if (match) {
          partialSet.add(topic);
          if (match[1]) {
            cutoffs.set(topic, match[1]);
          }
        } else if (log.nextActions?.includes(`[In Progress: ${topic}]`)) {
          partialSet.add(topic);
        } else {
          completedSet.add(topic);
          partialSet.delete(topic);
          cutoffs.delete(topic);
        }
      });
    });

    return {
      initialCompletedSet: completedSet,
      initialPartialSet: partialSet,
      initialCutoffNotes: cutoffs
    };
  }, [classSession, pastLogs]);

  // 2. State of every syllabus topic: 'none' | 'completed' | 'in_progress'
  const [topicStatuses, setTopicStatuses] = useState<Map<string, TopicProgressStatus>>(() => {
    const map = new Map<string, TopicProgressStatus>();
    classSession.masterSyllabus.forEach(topic => {
      if (initialCompletedSet.has(topic)) {
        map.set(topic, 'completed');
      } else if (initialPartialSet.has(topic)) {
        map.set(topic, 'in_progress');
      } else {
        map.set(topic, 'none');
      }
    });
    return map;
  });

  // Track cut-off notes per topic
  const [cutoffNotes, setCutoffNotes] = useState<Map<string, string>>(() => {
    return new Map(initialCutoffNotes);
  });

  // Track which topics were newly touched in this session
  const [sessionSelectedTopics, setSessionSelectedTopics] = useState<Set<string>>(() => {
    const preselected = new Set<string>();
    const firstUnfinished = classSession.masterSyllabus.find(
      t => initialPartialSet.has(t) || !initialCompletedSet.has(t)
    );
    if (firstUnfinished) {
      preselected.add(firstUnfinished);
    }
    return preselected;
  });

  const [nextActions, setNextActions] = useState('');
  const [engagement, setEngagement] = useState<string>('Medium');

  // Find the first uncompleted topic for the "Suggested Next" badge
  const suggestedNextTopic = useMemo(() => {
    return classSession.masterSyllabus.find(t => topicStatuses.get(t) !== 'completed');
  }, [classSession.masterSyllabus, topicStatuses]);

  // Toggle checkbox directly (Allows checking next topic OR unchecking completed topic to fix misclicks)
  const handleToggleTopic = (topic: string) => {
    const currentStatus = topicStatuses.get(topic) || 'none';
    const newMap = new Map(topicStatuses);
    const newSessionSet = new Set(sessionSelectedTopics);

    if (currentStatus === 'none') {
      newMap.set(topic, 'completed');
      newSessionSet.add(topic);
    } else {
      newMap.set(topic, 'none');
      newSessionSet.delete(topic);
    }

    setTopicStatuses(newMap);
    setSessionSelectedTopics(newSessionSet);
  };

  // Change status of a checked topic between Completed vs In Progress
  const handleSetTopicStatus = (topic: string, status: TopicProgressStatus, e: MouseEvent) => {
    e.stopPropagation();
    const newMap = new Map(topicStatuses);
    newMap.set(topic, status);
    setTopicStatuses(newMap);

    const newSessionSet = new Set(sessionSelectedTopics);
    if (status !== 'none') {
      newSessionSet.add(topic);
    }
    setSessionSelectedTopics(newSessionSet);
  };

  // Update cut-off note for a specific in-progress topic
  const handleUpdateCutoffNote = (topic: string, note: string) => {
    const newNotes = new Map(cutoffNotes);
    newNotes.set(topic, note);
    setCutoffNotes(newNotes);
  };

  const handleAppendCutoffChip = (topic: string, text: string) => {
    const existing = cutoffNotes.get(topic) || '';
    const updated = existing.trim() ? `${existing}, ${text}` : text;
    handleUpdateCutoffNote(topic, updated);
  };

  // Reset checklist to initial state
  const handleResetChecklist = () => {
    const map = new Map<string, TopicProgressStatus>();
    classSession.masterSyllabus.forEach(topic => {
      map.set(topic, 'none');
    });
    setTopicStatuses(map);
    setSessionSelectedTopics(new Set());
    setCutoffNotes(new Map());
  };

  const handlePromptChipClick = (text: string) => {
    if (nextActions.trim()) {
      setNextActions((prev) => `${prev}, ${text}`);
    } else {
      setNextActions(text);
    }
  };

  const handleSubmit = () => {
    const allCompleted: string[] = [];
    const allPartial: string[] = [];
    const todayTouched: string[] = [];
    const notesRecord: Record<string, string> = {};

    topicStatuses.forEach((status, topic) => {
      if (status === 'completed') {
        allCompleted.push(topic);
      } else if (status === 'in_progress') {
        allPartial.push(topic);
        const note = cutoffNotes.get(topic)?.trim();
        if (note) {
          notesRecord[topic] = note;
        }
      }
    });

    sessionSelectedTopics.forEach(topic => {
      if (topicStatuses.get(topic) !== 'none') {
        todayTouched.push(topic);
      }
    });

    const effectiveTodayTopics = todayTouched.length > 0 ? todayTouched : allCompleted;

    // Build nextActions summary with partial progress and cut-off points
    let finalNextActions = nextActions.trim();
    if (allPartial.length > 0) {
      const partialDetails = allPartial.map(t => {
        const note = cutoffNotes.get(t)?.trim();
        return note ? `${t} (Cut-off: ${note}) [In Progress: ${t} - ${note}]` : `${t} [In Progress: ${t}]`;
      }).join(' • ');

      finalNextActions = finalNextActions 
        ? `${finalNextActions} • In Progress / Continue Next Class: ${partialDetails}`
        : `In Progress / Continue Next Class: ${partialDetails}`;
    }

    const logPayload: LogData = {
      sessionType,
      topicsCovered: effectiveTodayTopics,
      partialTopics: allPartial,
      cutoffNotes: notesRecord,
      allActiveCompletedTopics: allCompleted,
      allActivePartialTopics: allPartial,
      nextActions: finalNextActions,
      engagementLevel: engagement,
    };

    onSuccess(logPayload);
  };

  const isLab = sessionType === 'Laboratory';

  const completedCount = useMemo(() => {
    let count = 0;
    topicStatuses.forEach(status => {
      if (status === 'completed') count++;
    });
    return count;
  }, [topicStatuses]);

  const quickPrompts = [
    'Prepare Chapter Quiz',
    'Follow up on Lab Activity',
    'Review Problem Set #2',
    'Post Lecture Slides'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="log-session-title">
      <div className="bg-white text-zinc-950 rounded-xl border border-zinc-200 w-full max-w-lg shadow-xl flex flex-col max-h-[90vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Dialog Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 p-5 shrink-0 bg-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 id="log-session-title" className="text-xl font-bold tracking-tight text-zinc-950">
                Log Session — {classSession.subjectCode}
              </h2>
              <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                {classSession.section}
              </span>
            </div>
            <p className="text-sm text-zinc-600">
              {classSession.subjectTitle || 'Check off covered topics, write cut-off notes for unfinished lessons, and set engagement.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-white">
          
          {/* Session Type Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Session Format
            </label>
            <div className="inline-flex h-10 w-full items-center rounded-lg bg-zinc-100 p-1 text-zinc-700">
              <button
                type="button"
                onClick={() => setSessionType('Lecture')}
                className={`flex-1 h-8 inline-flex items-center justify-center gap-1.5 rounded-md px-3 text-xs font-bold transition-all cursor-pointer ${
                  !isLab
                    ? 'bg-white text-zinc-950 shadow-2xs'
                    : 'hover:text-zinc-950'
                }`}
              >
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
                <span>Lecture Session</span>
              </button>
              <button
                type="button"
                onClick={() => setSessionType('Laboratory')}
                className={`flex-1 h-8 inline-flex items-center justify-center gap-1.5 rounded-md px-3 text-xs font-bold transition-all cursor-pointer ${
                  isLab
                    ? 'bg-white text-zinc-950 shadow-2xs'
                    : 'hover:text-zinc-950'
                }`}
              >
                <FlaskConical className="h-4 w-4" aria-hidden="true" />
                <span>Laboratory Session</span>
              </button>
            </div>
          </div>

          {/* Persistent Syllabus Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-zinc-950">
                  Course Syllabus Checklist ({completedCount}/{classSession.masterSyllabus.length} Completed)
                </label>
                <p className="text-xs text-zinc-600">
                  Click any topic to check or uncheck. For unfinished topics, tap "In Progress" to add a cut-off note.
                </p>
              </div>
              
              <button
                type="button"
                onClick={handleResetChecklist}
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-red-700 transition-colors cursor-pointer"
                title="Uncheck all topics"
              >
                <RotateCcw className="h-3 w-3" />
                Uncheck All
              </button>
            </div>

            <div className="space-y-2.5">
              {classSession.masterSyllabus.map((topic, index) => {
                const status = topicStatuses.get(topic) || 'none';
                const isChecked = status !== 'none';
                const isCompleted = status === 'completed';
                const isInProgress = status === 'in_progress';
                const isSuggested = topic === suggestedNextTopic && !isChecked;
                const wasPreviouslyDone = initialCompletedSet.has(topic);
                const priorCutoff = initialCutoffNotes.get(topic);

                return (
                  <div
                    key={topic}
                    onClick={() => handleToggleTopic(topic)}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleToggleTopic(topic);
                      }
                    }}
                    className={`flex flex-col gap-2 rounded-xl border p-3.5 cursor-pointer transition-all ${
                      isCompleted
                        ? 'border-emerald-300 bg-emerald-50/50 text-zinc-950 shadow-2xs'
                        : isInProgress
                        ? 'border-amber-300 bg-amber-50/60 text-zinc-950 shadow-2xs'
                        : isSuggested
                        ? 'border-zinc-400 bg-zinc-50 hover:bg-zinc-100 text-zinc-950'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Checkbox box */}
                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : isInProgress
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'border-zinc-300 bg-white'
                        }`}>
                          {isCompleted && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          {isInProgress && <Hourglass className="h-3 w-3" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold leading-snug ${isCompleted ? 'text-zinc-950' : 'text-zinc-800'}`}>
                              {index + 1}. {topic}
                            </span>
                            
                            {/* Badges */}
                            {wasPreviouslyDone && isCompleted && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                                Completed
                              </span>
                            )}

                            {isInProgress && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                <Hourglass className="h-3 w-3 text-amber-700" />
                                {priorCutoff ? `In Progress: ${priorCutoff}` : 'In Progress'}
                              </span>
                            )}

                            {isSuggested && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900 bg-zinc-200 px-2 py-0.5 rounded-full border border-zinc-300">
                                <Sparkles className="h-3 w-3 text-zinc-700" />
                                Next Topic (Click to check)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Completion Status Selector when checked */}
                    {isChecked && (
                      <div 
                        className="pt-2 border-t border-zinc-200/80 flex flex-col gap-2.5" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-zinc-700">
                            Status for this topic:
                          </span>
                          
                          <div className="inline-flex rounded-lg bg-white border border-zinc-300 p-0.5 text-xs font-bold shadow-2xs">
                            <button
                              type="button"
                              onClick={(e) => handleSetTopicStatus(topic, 'completed', e)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'text-zinc-700 hover:text-zinc-950'
                              }`}
                            >
                              <Check className="h-3 w-3" />
                              Finished
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleSetTopicStatus(topic, 'in_progress', e)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                isInProgress
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'text-zinc-700 hover:text-zinc-950'
                              }`}
                            >
                              <Hourglass className="h-3 w-3" />
                              In Progress (Partial)
                            </button>
                          </div>
                        </div>

                        {/* Cut-off note input when in_progress */}
                        {isInProgress && (
                          <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <label htmlFor={`cutoff-input-${index}`} className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                <Hourglass className="h-3.5 w-3.5 text-amber-700" />
                                Where did you get cut off?
                              </label>
                              <span className="text-[11px] font-semibold text-amber-800">
                                To continue next class
                              </span>
                            </div>

                            <input
                              id={`cutoff-input-${index}`}
                              type="text"
                              placeholder="e.g. Stopped at Slide 24 (Activity Lifecycle), finished Part 1 only..."
                              value={cutoffNotes.get(topic) || ''}
                              onChange={(e) => handleUpdateCutoffNote(topic, e.target.value)}
                              className="w-full h-8 rounded-md border border-amber-300 bg-white px-2.5 text-xs text-zinc-950 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shadow-2xs font-medium"
                            />

                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {['Stopped at Slide #', 'Finished Part 1 only', 'Covered Section A', 'Cut off before Lab Exercise'].map((chip) => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => handleAppendCutoffChip(topic, chip)}
                                  className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                                >
                                  + {chip}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engagement Level */}
          <div className="space-y-2.5">
            <label className="text-sm font-bold text-zinc-950">
              Class Engagement Rating
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'Low', label: 'Low', desc: 'Passive participation' },
                { value: 'Medium', label: 'Medium', desc: 'Average engagement' },
                { value: 'High', label: 'High', desc: 'High interaction' }
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setEngagement(item.value)}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all cursor-pointer ${
                    engagement === item.value
                      ? 'border-zinc-950 bg-zinc-950 text-white font-bold shadow-2xs'
                      : 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800'
                  }`}
                >
                  <span className="text-sm font-bold">{item.label}</span>
                  <span className={`text-xs mt-0.5 ${engagement === item.value ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-2.5">
            <label htmlFor="next-actions" className="text-sm font-bold text-zinc-950">
              Reminders & Next Steps
            </label>
            
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handlePromptChipClick(prompt)}
                  className="inline-flex items-center rounded-md border border-zinc-300 bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  + {prompt}
                </button>
              ))}
            </div>

            <textarea
              id="next-actions"
              rows={3}
              placeholder="E.g., Review problem set #2, continue recursion next class..."
              value={nextActions}
              onChange={(e) => setNextActions(e.target.value)}
              className="flex w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 shadow-2xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            />
          </div>

        </div>

        {/* Dialog Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 p-4 shrink-0 bg-zinc-50">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Save {sessionType} Log ({completedCount} Finished)
          </button>
        </div>

      </div>
    </div>
  );
};
