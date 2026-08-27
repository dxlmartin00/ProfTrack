import { useState } from 'react';
import type { FC } from 'react';
import type { ClassSession, SessionLog } from '../services/db';
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
  Layers
} from 'lucide-react';

interface CourseDetailModalProps {
  classSession: ClassSession;
  courseLogs: SessionLog[];
  onClose: () => void;
  onEdit: (cls: ClassSession) => void;
  onDelete: (classId: string) => void;
  onLogNewSession: (cls: ClassSession) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CourseDetailModal: FC<CourseDetailModalProps> = ({
  classSession,
  courseLogs,
  onClose,
  onEdit,
  onDelete,
  onLogNewSession
}) => {
  const [activeTab, setActiveTab] = useState<'syllabus' | 'history'>('syllabus');

  // Compute completed topics across all logs
  const coveredTopicsSet = new Set<string>();
  courseLogs.forEach((log) => {
    log.topicsCovered.forEach((t) => coveredTopicsSet.add(t));
  });

  const totalTopics = classSession.masterSyllabus.length || 1;
  const completedCount = classSession.masterSyllabus.filter((t) => coveredTopicsSet.has(t)).length;
  const progressPercent = Math.round((completedCount / totalTopics) * 100);

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
              className="rounded-lg p-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
              title="Edit Course Details"
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Delete course"
              className="rounded-lg p-2 text-zinc-500 hover:text-red-700 hover:bg-red-50 transition-colors"
              title="Delete Course"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-lg p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors ml-1"
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
              <span className="text-zinc-950 font-mono">{completedCount} of {classSession.masterSyllabus.length} Topics ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-zinc-950 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

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
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
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
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
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
            <div className="space-y-2">
              {classSession.masterSyllabus.map((topic, index) => {
                const isCovered = coveredTopicsSet.has(topic);
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 rounded-lg border p-3.5 transition-all ${
                      isCovered
                        ? 'border-emerald-300 bg-emerald-50/50 text-zinc-950'
                        : 'border-zinc-200 bg-zinc-50/50 text-zinc-700'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      isCovered
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-zinc-300 bg-white text-zinc-400'
                    }`}>
                      {isCovered ? <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" /> : <span className="text-2xs font-mono font-bold">{index + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium leading-normal ${isCovered ? 'text-zinc-950 font-semibold' : 'text-zinc-700'}`}>
                        {topic}
                      </p>
                      {isCovered && (
                        <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                          ✓ Completed in class sessions
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
                {courseLogs.map((log, index) => (
                  <div
                    key={log.id || index}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-zinc-200 text-zinc-900">
                          {log.sessionType || 'Lecture'}
                        </span>
                        <span className="text-xs font-mono font-bold text-zinc-700">
                          {format(new Date(log.date), 'EEEE, MMM dd, yyyy')}
                        </span>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        log.engagementLevel === 'High'
                          ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                          : 'border-zinc-300 bg-white text-zinc-800'
                      }`}>
                        Engagement: {log.engagementLevel || 'Medium'}
                      </span>
                    </div>

                    {log.topicsCovered.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-700">Covered Topics:</p>
                        <ul className="text-xs text-zinc-800 space-y-0.5 pl-3 list-disc">
                          {log.topicsCovered.map((t, idx) => (
                            <li key={idx}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {log.nextActions && (
                      <p className="text-xs text-zinc-600 italic bg-white p-2 rounded border border-zinc-200">
                        <span className="font-semibold text-zinc-700 not-italic">Notes:</span> {log.nextActions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 p-4 shrink-0 bg-zinc-50">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogNewSession(classSession);
            }}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <PlusCircle className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Log Session Now
          </button>
        </div>

      </div>
    </div>
  );
};
