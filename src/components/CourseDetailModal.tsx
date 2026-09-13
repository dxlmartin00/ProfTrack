import { useState, useMemo } from 'react';
import type { FC } from 'react';
import type { ClassSession, SessionLog } from '../services/db';
import { getCourseProgressDetails } from '../utils/courseProgress';
import { format } from 'date-fns';
import { 
  X, 
  Trash2, 
  Edit3, 
  PlusCircle, 
  MapPin, 
  GraduationCap, 
  FlaskConical, 
  Check, 
  Calendar,
  Layers,
  Hourglass,
  Sparkles,
  FileText
} from 'lucide-react';

interface CourseDetailModalProps {
  classSession: ClassSession;
  courseLogs: SessionLog[];
  onClose: () => void;
  onEdit: (cls: ClassSession) => void;
  onDelete: (classId: string) => void;
  onLogNewSession: (cls: ClassSession) => void;
  onOpenSyllabusUpload?: (courseId: string) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CourseDetailModal: FC<CourseDetailModalProps> = ({
  classSession,
  courseLogs,
  onClose,
  onEdit,
  onDelete,
  onLogNewSession,
  onOpenSyllabusUpload
}) => {
  const [activeTab, setActiveTab] = useState<'syllabus' | 'history'>('syllabus');

  // Convert courseLogs to full format with classInfo to pass into getCourseProgressDetails
  const fullLogs = useMemo(() => {
    return courseLogs.map(l => ({ ...l, classInfo: classSession }));
  }, [courseLogs, classSession]);

  const courseProgress = useMemo(() => {
    return getCourseProgressDetails(classSession, fullLogs);
  }, [classSession, fullLogs]);

  const completedSet = useMemo(() => new Set(courseProgress.completedTopics), [courseProgress.completedTopics]);
  const partialNotesMap = useMemo(() => {
    const map = new Map<string, string>();
    courseProgress.partialTopics.forEach(p => {
      map.set(p.topic, p.note || 'In progress');
    });
    return map;
  }, [courseProgress.partialTopics]);

  const suggestedNextTopic = useMemo(() => {
    return classSession.masterSyllabus.find(t => !completedSet.has(t) && !partialNotesMap.has(t));
  }, [classSession.masterSyllabus, completedSet, partialNotesMap]);

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${classSession.subjectCode} (${classSession.section})? This cannot be undone.`)) {
      onDelete(classSession.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="course-detail-title">
      <div className="bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 p-5 shrink-0 bg-white dark:bg-zinc-900">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="course-detail-title" className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
                {classSession.subjectCode}
              </h2>
              <span className="inline-flex items-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {classSession.section}
              </span>
              <span className="inline-flex items-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                {classSession.year}
              </span>
              {classSession.room && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-300" aria-hidden="true" />
                  {classSession.room}
                </span>
              )}
            </div>
            {classSession.subjectTitle && (
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {classSession.subjectTitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(classSession)}
              aria-label="Edit course details"
              className="rounded-lg p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Edit Course Details"
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Delete course"
              className="rounded-lg p-2 text-zinc-500 dark:text-zinc-300 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              title="Delete Course"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-lg p-2 text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Schedule & Syllabus Progress Ribbon */}
        <div className="bg-zinc-50/80 dark:bg-zinc-850/80 p-5 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-300" aria-hidden="true" />
                Syllabus Accomplishment
              </span>
              <span className="text-zinc-950 dark:text-zinc-100 font-mono">{courseProgress.completedCount} of {courseProgress.totalTopics} Topics ({courseProgress.percent}%)</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-zinc-950 dark:bg-zinc-100 h-full rounded-full transition-all duration-300"
                style={{ width: `${courseProgress.percent}%` }}
              />
            </div>
          </div>

          {/* Unfinished / In Progress Current Status Callout */}
          {courseProgress.isContinuingPartial && courseProgress.partialTopics.length > 0 ? (
            <div className="rounded-lg border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 p-3 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200 font-medium">
              <Hourglass className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-300">Current Unfinished Lesson: </span>
                <span className="font-semibold text-zinc-950 dark:text-zinc-100">{courseProgress.partialTopics[0].topic}</span>
                {courseProgress.partialTopics[0].note && (
                  <span className="block text-amber-800 dark:text-amber-300 text-[11px] font-semibold mt-0.5">
                    Cut-off point: "{courseProgress.partialTopics[0].note}" — to be resumed next meeting.
                  </span>
                )}
              </div>
            </div>
          ) : courseProgress.latestNote ? (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 flex items-start gap-2 text-xs text-zinc-800 dark:text-zinc-200">
              <FileText className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">Notes from Last Class: </span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">{courseProgress.latestNote}</span>
              </div>
            </div>
          ) : null}

          {/* Schedule Breakdown */}
          <div className="flex flex-wrap gap-2 pt-1">
            {classSession.schedule.map((sch, i) => {
              const isLab = sch.type === 'Laboratory';
              return (
                <div key={i} className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs">
                  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-bold uppercase ${
                    isLab ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200'
                  }`}>
                    {isLab ? <FlaskConical className="w-3 h-3 text-purple-700 dark:text-purple-300" aria-hidden="true" /> : <GraduationCap className="w-3 h-3 text-zinc-700 dark:text-zinc-300" aria-hidden="true" />}
                    {sch.type || 'Lecture'}
                  </span>
                  <span className="font-bold text-zinc-950 dark:text-zinc-100">{DAY_NAMES[sch.dayOfWeek]}</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{sch.startTime} – {sch.endTime}</span>
                  {sch.room && <span className="text-zinc-500 dark:text-zinc-300 font-medium">({sch.room})</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pt-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('syllabus')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'syllabus'
                ? 'border-zinc-950 dark:border-zinc-100 text-zinc-950 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Master Syllabus ({classSession.masterSyllabus.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-zinc-950 dark:border-zinc-100 text-zinc-950 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Logged Sessions ({courseLogs.length})
          </button>
        </div>

        {/* Content area */}
        <div className="p-5 space-y-3 overflow-y-auto flex-1 bg-white dark:bg-zinc-900">
          {activeTab === 'syllabus' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Course Outline & Master Syllabus
                </span>
                {onOpenSyllabusUpload && (
                  <button
                    type="button"
                    onClick={() => onOpenSyllabusUpload(classSession.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                    title="Upload syllabus from Microsoft Word (.docx)"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                    Upload Word Syllabus (.docx)
                  </button>
                )}
              </div>

              {classSession.masterSyllabus.map((topic, index) => {
                const isCovered = completedSet.has(topic);
                const isPartial = partialNotesMap.has(topic);
                const partialNote = partialNotesMap.get(topic);
                const isNext = topic === suggestedNextTopic;

                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 rounded-lg border p-3.5 transition-all ${
                      isCovered
                        ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-zinc-950 dark:text-zinc-100'
                        : isPartial
                        ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/30 text-zinc-950 dark:text-zinc-100'
                        : isNext
                        ? 'border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-950 dark:text-zinc-100'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      isCovered
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : isPartial
                        ? 'bg-amber-600 border-amber-600 text-white'
                        : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold'
                    }`}>
                      {isCovered ? (
                        <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
                      ) : isPartial ? (
                        <Hourglass className="h-3 w-3" />
                      ) : (
                        <span className="text-2xs font-mono font-bold">{index + 1}</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm leading-normal ${isCovered ? 'text-zinc-950 dark:text-zinc-100 font-semibold' : 'text-zinc-800 dark:text-zinc-200 font-medium'}`}>
                          {topic}
                        </p>

                        {isCovered && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                            ✓ Completed
                          </span>
                        )}

                        {isPartial && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                            <Hourglass className="h-3 w-3 text-amber-700 dark:text-amber-400" />
                            In Progress (Unfinished)
                          </span>
                        )}

                        {isNext && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full border border-zinc-300 dark:border-zinc-600">
                            <Sparkles className="h-3 w-3 text-zinc-700 dark:text-zinc-300" />
                            Next Up
                          </span>
                        )}
                      </div>

                      {isPartial && partialNote && partialNote !== 'In progress' && (
                        <p className="text-xs text-amber-900 dark:text-amber-200 font-semibold mt-1 bg-white/80 dark:bg-zinc-800/80 p-2 rounded border border-amber-200 dark:border-amber-700">
                          📌 Cut-off note: "{partialNote}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            courseLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-zinc-600 dark:text-zinc-300 space-y-1.5">
                <Calendar className="h-6 w-6 mx-auto text-zinc-400 dark:text-zinc-400" aria-hidden="true" />
                <p className="text-sm font-bold text-zinc-950 dark:text-zinc-100">No sessions logged for this course yet</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">Log class attendance and topic updates after your lectures.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseLogs.map((log, index) => {
                  const isLab = log.sessionType === 'Laboratory';
                  return (
                    <div
                      key={log.id || index}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 p-4 space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-zinc-200/80 dark:border-zinc-750 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold uppercase ${
                            isLab ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200'
                          }`}>
                            {isLab ? <FlaskConical className="w-3 h-3 text-purple-700 dark:text-purple-300" /> : <GraduationCap className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />}
                            {log.sessionType || 'Lecture'}
                          </span>
                          <span className="font-semibold text-zinc-950 dark:text-zinc-100">
                            {format(new Date(log.date), 'EEEE, MMMM d, yyyy')}
                          </span>
                        </div>

                        <span className={`px-2 py-0.5 rounded font-bold ${
                          log.engagementLevel === 'High'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                            : log.engagementLevel === 'Low'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200'
                            : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                        }`}>
                          {log.engagementLevel || 'Medium'} Engagement
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 block mb-1">Topics Discussed:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-zinc-800 dark:text-zinc-200 font-medium">
                          {log.topicsCovered.map((t, idx) => (
                            <li key={idx} className="break-words">{t}</li>
                          ))}
                        </ul>
                      </div>

                      {log.nextActions && (
                        <div className="bg-white dark:bg-zinc-800 p-2.5 rounded border border-zinc-200 dark:border-zinc-700 mt-1">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block text-[11px] uppercase tracking-wider">Action Items / Cut-off:</span>
                          <p className="text-zinc-700 dark:text-zinc-300 mt-0.5 break-words font-medium">{log.nextActions}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onLogNewSession(classSession);
            }}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-950 dark:bg-white px-4 text-xs font-bold text-white dark:text-zinc-950 shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Log Class Progress
          </button>
        </div>

      </div>
    </div>
  );
};
