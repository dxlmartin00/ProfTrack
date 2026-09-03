import { useState, useMemo } from 'react';
import type { FC, MouseEvent } from 'react';
import type { ClassSession, ClassSchedule, ScheduleType, SessionLog } from '../services/db';
import { getCourseProgressDetails } from '../utils/courseProgress';
import { format } from 'date-fns';
import { 
  X, 
  Check, 
  FlaskConical, 
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Hourglass,
  RotateCcw,
  FileText
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

  // 1. Calculate chronological completed vs partial topics, next lesson, and preserved notes
  const courseProgress = useMemo(() => {
    return getCourseProgressDetails(classSession, pastLogs);
  }, [classSession, pastLogs]);

  const initialCompletedSet = useMemo(() => {
    return new Set(courseProgress.completedTopics);
  }, [courseProgress.completedTopics]);

  const initialPartialMap = useMemo(() => {
    const map = new Map<string, string>();
    courseProgress.partialTopics.forEach(p => {
      if (p.note) map.set(p.topic, p.note);
    });
    return map;
  }, [courseProgress.partialTopics]);

  // 2. State of every syllabus topic: 'none' | 'completed' | 'in_progress'
  const [topicStatuses, setTopicStatuses] = useState<Map<string, TopicProgressStatus>>(() => {
    const map = new Map<string, TopicProgressStatus>();
    classSession.masterSyllabus.forEach(topic => {
      if (initialCompletedSet.has(topic)) {
        map.set(topic, 'completed');
      } else if (courseProgress.partialTopics.some(p => p.topic === topic)) {
        map.set(topic, 'in_progress');
      } else {
        map.set(topic, 'none');
      }
    });
    return map;
  });

  // Track cut-off notes per topic
  const [cutoffNotes, setCutoffNotes] = useState<Map<string, string>>(() => {
    return new Map(initialPartialMap);
  });

  // Track which topics were newly touched in this session
  const [sessionSelectedTopics, setSessionSelectedTopics] = useState<Set<string>>(() => {
    const preselected = new Set<string>();
    if (courseProgress.currentActiveTopic) {
      preselected.add(courseProgress.currentActiveTopic);
    }
    return preselected;
  });

  const [nextActions, setNextActions] = useState('');
  const [isNoteDone, setIsNoteDone] = useState<boolean>(courseProgress.isLatestNoteDone);
  const [engagement, setEngagement] = useState<string>('Medium');

  // Find the first uncompleted topic for the "Suggested Next" badge
  const suggestedNextTopic = useMemo(() => {
    return classSession.masterSyllabus.find(t => topicStatuses.get(t) !== 'completed');
  }, [classSession.masterSyllabus, topicStatuses]);

  // 1-Click Action: Mark Partial Lesson as Done & Proceed to Next Lesson
  const handleMarkPartialDoneAndProceed = () => {
    const partialTopic = courseProgress.currentActiveTopic;
    if (!partialTopic) return;

    const newMap = new Map(topicStatuses);
    const newSelected = new Set(sessionSelectedTopics);

    // 1. Mark partial lesson as Completed
    newMap.set(partialTopic, 'completed');
    newSelected.add(partialTopic);

    // 2. Proceed to next lesson in syllabus
    const nextTopic = courseProgress.nextLessonTopic;
    if (nextTopic) {
      newMap.set(nextTopic, 'completed');
      newSelected.add(nextTopic);
    }

    // 3. Clear from active cut-off list, but preserve in notes
    const prevCutoff = cutoffNotes.get(partialTopic);
    const newCutoff = new Map(cutoffNotes);
    newCutoff.delete(partialTopic);

    setTopicStatuses(newMap);
    setSessionSelectedTopics(newSelected);
    setCutoffNotes(newCutoff);

    // 4. Preserve notes so they are NOT erased
    if (!nextActions.trim()) {
      const parts: string[] = [];
      if (prevCutoff) parts.push(`✓ Finished cut-off: "${prevCutoff}"`);
      if (courseProgress.latestNote) parts.push(courseProgress.latestNote);
      if (parts.length > 0) {
        setNextActions(parts.join(' • '));
      }
    }
  };

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

  // Reset checklist to initial clean state
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

    // Build nextActions summary with partial progress, cut-off points, and preserved notes
    let finalNextActions = nextActions.trim();

    // Preserve previous notes if no new note was typed (GUARANTEES NOTES ARE NEVER ERASED)
    if (!finalNextActions && courseProgress.latestNote) {
      finalNextActions = isNoteDone 
        ? `[Note Done] ${courseProgress.latestNote}` 
        : courseProgress.latestNote;
    } else if (finalNextActions && isNoteDone && !finalNextActions.includes('[Note Done]')) {
      finalNextActions = `[Note Done] ${finalNextActions}`;
    }

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
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-white">
          
          {/* Quick Action: Mark Partial Lesson as Done & Proceed to Next Lesson */}
          {courseProgress.isContinuingPartial && courseProgress.currentActiveTopic && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 space-y-3 shadow-2xs animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-950 uppercase tracking-wider">
                      <Hourglass className="h-3 w-3 text-amber-800" />
                      Unfinished Lesson From Last Meeting
                    </span>
                  </div>
                  <p className="font-bold text-zinc-950 text-sm leading-snug break-words">
                    {courseProgress.currentActiveTopic}
                  </p>
                  {courseProgress.partialTopics[0]?.note && (
                    <p className="text-xs text-amber-900 font-medium break-words">
                      📍 Cut-off point: "{courseProgress.partialTopics[0].note}"
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleMarkPartialDoneAndProceed}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3.5 text-xs font-bold text-white shadow-sm transition-all shrink-0 cursor-pointer w-full sm:w-auto"
                  title="Mark this partial lesson completed and advance to the next syllabus topic"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Mark Done & Proceed to Next Lesson →</span>
                </button>
              </div>

              {courseProgress.nextLessonTopic && (
                <div className="pt-2 border-t border-amber-200/80 flex items-center gap-1.5 text-xs text-zinc-700">
                  <span className="text-zinc-500 font-medium">Next topic in line:</span>
                  <span className="font-bold text-zinc-950">{courseProgress.nextLessonTopic}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes from Previous Meeting Banner (Preserved & Never Erased) */}
          {courseProgress.latestNote && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/90 p-3.5 text-xs text-sky-950 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sky-900">
                  <FileText className="h-4 w-4 text-sky-700 shrink-0" />
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    Notes from Last Class {courseProgress.latestNoteDate && `(${format(courseProgress.latestNoteDate, 'MMM d')})`}:
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNoteDone(prev => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                    isNoteDone
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-white text-sky-800 border-sky-300 hover:bg-sky-100'
                  }`}
                  title="Toggle whether this note's action item was fulfilled"
                >
                  <Check className="h-3 w-3" />
                  {isNoteDone ? 'Note Done ✓' : 'Mark Note as Done'}
                </button>
              </div>

              <p className={`text-xs font-medium pl-6 leading-relaxed break-words ${isNoteDone ? 'line-through text-zinc-600' : 'text-zinc-900'}`}>
                {courseProgress.latestNote}
              </p>

              <div className="pl-6 pt-0.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (courseProgress.latestNote) {
                      setNextActions(prev => prev ? `${prev} • ${courseProgress.latestNote}` : (courseProgress.latestNote || ''));
                    }
                  }}
                  className="text-[10px] font-semibold text-sky-800 hover:text-sky-950 underline cursor-pointer"
                >
                  + Keep / Copy note into today's log
                </button>
              </div>
            </div>
          )}

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
                  Click any topic to check or mark finished. Tap "In Progress" to record a cut-off point.
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
                const priorCutoff = initialPartialMap.get(topic);

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

                        {/* Cut-off notes input box if In-Progress */}
                        {isInProgress && (
                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-amber-950">
                                📍 Lesson Cut-off Point / Slide Number:
                              </label>
                              <span className="text-[10px] text-amber-800 font-medium">Where did you stop?</span>
                            </div>

                            <input
                              type="text"
                              value={cutoffNotes.get(topic) || ''}
                              onChange={(e) => handleUpdateCutoffNote(topic, e.target.value)}
                              placeholder="e.g. Stopped at Slide #24, Chapter 2 Example 3..."
                              className="w-full rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                            />

                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {['Stopped at Slide #', 'Halfway through discussion', 'Completed theory, lab pending', 'Up to Section 2'].map(chip => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => handleAppendCutoffChip(topic, chip)}
                                  className="text-[10px] font-semibold bg-white text-amber-900 px-2 py-0.5 rounded border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
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

          {/* Next Actions & General Notes */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-950">
              Next Class Action Items & Follow-ups
            </label>
            <p className="text-xs text-zinc-600">
              Notes recorded here will appear on your timetable and modal as a reminder before your next meeting.
            </p>

            <textarea
              value={nextActions}
              onChange={(e) => setNextActions(e.target.value)}
              placeholder="e.g. Prepare quiz on SQLite CRUD, bring sample Android devices..."
              rows={2}
              className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-xs text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            />

            <div className="flex items-center gap-1.5 flex-wrap">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handlePromptChipClick(prompt)}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer"
                >
                  + {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Student Engagement Rating */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Class Engagement Rating
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Low', 'Medium', 'High'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEngagement(level)}
                  className={`h-9 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    engagement === level
                      ? 'border-zinc-950 bg-zinc-950 text-white shadow-2xs'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {level} Engagement
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Dialog Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 p-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-950 px-5 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Save Session Progress
          </button>
        </div>

      </div>
    </div>
  );
};
