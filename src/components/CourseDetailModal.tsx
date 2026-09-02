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
      <div className="bg-white text-zinc-950 rounded-xl border border-zinc-200 w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 p-5 shrink-0 bg-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="course-detail-title" className="text-xl font-bold tracking-tight text-zinc-950">
                {classSession.subjectCode}
              </h2>
              <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                {classSession.section}
              </span>
              <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                {classSession.year}
              </span>
              {classSession.room && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
                  {classSession.room}
                </span>
              )}
            </div>
            {classSession.subjectTitle && (
              <p className="text-sm font-medium text-zinc-600">
                {classSession.subjectTitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(classSession)}
              aria-label="Edit course details"
              className="rounded-lg p-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Edit Course Details"
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Delete course"
              className="rounded-lg p-2 text-zinc-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete Course"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-lg p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors ml-1 cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Schedule & Syllabus Progress Ribbon */}
        <div className="bg-zinc-50/80 p-5 border-b border-zinc-200 space-y-3">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
                Syllabus Accomplishment
              </span>
              <span className="text-zinc-950 font-mono">{courseProgress.completedCount} of {courseProgress.totalTopics} Topics ({courseProgress.percent}%)</span>
            </div>
            <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-zinc-950 h-full rounded-full transition-all duration-300"
                style={{ width: `${courseProgress.percent}%` }}
              />
            </div>
          </div>

          {/* Unfinished / In Progress Current Status Callout */}
          {courseProgress.isContinuingPartial && courseProgress.partialTopics.length > 0 ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-2.5 text-xs text-amber-950 font-medium">
              <Hourglass className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900">Current Unfinished Lesson: </span>
                <span className="font-semibold text-zinc-950">{courseProgress.partialTopics[0].topic}</span>
                {courseProgress.partialTopics[0].note && (
                  <span className="block text-amber-800 text-[11px] font-semibold mt-0.5">
                    Cut-off point: "{courseProgress.partialTopics[0].note}" — to be resumed next meeting.
                  </span>
                )}
              </div>
            </div>
          ) : courseProgress.latestNote ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-2.5 flex items-start gap-2 text-xs text-zinc-800">
              <FileText className="h-3.5 w-3.5 text-zinc-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-zinc-900">Notes from Last Class: </span>
                <span className="text-zinc-700 font-medium">{courseProgress.latestNote}</span>
              </div>
            </div>
          ) : null}

          {/* Schedule Breakdown */}
          <div className="flex flex-wrap gap-2 pt-1">
            {classSession.schedule.map((sch, i) => {
              const isLab = sch.type === 'Laboratory';
              return (
                <div key={i} className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs">
                  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-bold uppercase ${
                    isLab ? 'bg-purple-100 text-purple-900' : 'bg-zinc-100 text-zinc-900'
                  }`}>
                    {isLab ? <FlaskConical className="w-3 h-3 text-purple-700" aria-hidden="true" /> : <GraduationCap className="w-3 h-3 text-zinc-700" aria-hidden="true" />}
                    {sch.type || 'Lecture'}
                  </span>
                  <span className="font-bold text-zinc-950">{DAY_NAMES[sch.dayOfWeek]}</span>
                  <span className="font-mono text-zinc-700">{sch.startTime} – {sch.endTime}</span>
                  {sch.room && <span className="text-zinc-500 font-medium">({sch.room})</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pt-4 bg-white border-b border-zinc-200 flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('syllabus')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'syllabus'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Master Syllabus ({classSession.masterSyllabus.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Logged Sessions ({courseLogs.length})
          </button>
        </div>

        {/* Content area */}
        <div className="p-5 space-y-3 overflow-y-auto flex-1 bg-white">
          {activeTab === 'syllabus' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Course Outline & Master Syllabus
                </span>
                {onOpenSyllabusUpload && (
                  <button
                    type="button"
                    onClick={() => onOpenSyllabusUpload(classSession.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                    title="Upload syllabus from Microsoft Word (.docx)"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-700" />
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
                        ? 'border-emerald-300 bg-emerald-50/50 text-zinc-950'
                        : isPartial
                        ? 'border-amber-300 bg-amber-50/70 text-zinc-950'
                        : isNext
                        ? 'border-zinc-400 bg-zinc-50'
                        : 'border-zinc-200 bg-zinc-50/50 text-zinc-700'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      isCovered
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : isPartial
                        ? 'bg-amber-600 border-amber-600 text-white'
                        : 'border-zinc-300 bg-white text-zinc-400'
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
                        <p className={`text-sm leading-normal ${isCovered ? 'text-zinc-950 font-semibold' : 'text-zinc-800 font-medium'}`}>
                          {topic}
                        </p>

                        {isCovered && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                            ✓ Completed
                          </span>
                        )}

                        {isPartial && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                            <Hourglass className="h-3 w-3 text-amber-700" />
                            In Progress (Unfinished)
                          </span>
                        )}

                        {isNext && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900 bg-zinc-200 px-2 py-0.5 rounded-full border border-zinc-300">
                            <Sparkles className="h-3 w-3 text-zinc-700" />
                            Next Up
                          </span>
                        )}
                      </div>

                      {isPartial && partialNote && partialNote !== 'In progress' && (
                        <p className="text-xs text-amber-900 font-semibold mt-1 bg-white/80 p-2 rounded border border-amber-200">
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
              <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-600 space-y-1.5">
                <Calendar className="h-6 w-6 mx-auto text-zinc-400" aria-hidden="true" />
                <p className="text-sm font-bold text-zinc-950">No sessions logged for this course yet</p>
                <p className="text-xs text-zinc-500">Log class attendance and topic updates after your lectures.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseLogs.map((log, index) => {
                  const isLab = log.sessionType === 'Laboratory';
                  return (
                    <div
                      key={log.id || index}
                      className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 space-y-2.5 text-xs text-zinc-700"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-zinc-200/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold uppercase ${
                            isLab ? 'bg-purple-100 text-purple-900' : 'bg-zinc-100 text-zinc-900'
                          }`}>
                            {isLab ? <FlaskConical className="w-3 h-3 text-purple-700" /> : <GraduationCap className="w-3 h-3 text-zinc-700" />}
                            {log.sessionType || 'Lecture'}
                          </span>
                          <span className="font-semibold text-zinc-950">
                            {format(new Date(log.date), 'EEEE, MMMM d, yyyy')}
                          </span>
                        </div>

                        <span className={`px-2 py-0.5 rounded font-bold ${
                          log.engagementLevel === 'High'
                            ? 'bg-emerald-100 text-emerald-900'
                            : log.engagementLevel === 'Low'
                            ? 'bg-rose-100 text-rose-900'
                            : 'bg-zinc-100 text-zinc-800'
                        }`}>
                          {log.engagementLevel || 'Medium'} Engagement
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-zinc-900 block mb-1">Topics Discussed:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-zinc-800 font-medium">
                          {log.topicsCovered.map((t, idx) => (
                            <li key={idx} className="break-words">{t}</li>
                          ))}
                        </ul>
                      </div>

                      {log.nextActions && (
                        <div className="bg-white p-2.5 rounded border border-zinc-200 mt-1">
                          <span className="font-bold text-zinc-900 block text-[11px] uppercase tracking-wider">Action Items / Cut-off:</span>
                          <p className="text-zinc-700 mt-0.5 break-words font-medium">{log.nextActions}</p>
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
        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 p-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onLogNewSession(classSession);
            }}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-950 px-4 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Log Class Progress
          </button>
        </div>

      </div>
    </div>
  );
};
