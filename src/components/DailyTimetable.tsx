import { useState, useEffect } from 'react';
import type { FC } from 'react';
import type { ClassSession, ClassSchedule, SessionLog } from '../services/db';
import { getCourseProgressDetails } from '../utils/courseProgress';
import { format, parse } from 'date-fns';
import { 
  Clock, 
  Plus, 
  MapPin, 
  Layers, 
  Search, 
  GraduationCap, 
  FlaskConical, 
  CalendarDays,
  FileDown,
  CheckCircle2,
  BookOpen,
  Smartphone,
  Hourglass,
  Camera,
  FileText
} from 'lucide-react';

interface DailyTimetableProps {
  classes: ClassSession[];
  logs: (SessionLog & { classInfo: ClassSession })[];
  onClassClick: (cls: ClassSession, activeSchedule?: ClassSchedule) => void;
  onManageCourse: (cls: ClassSession) => void;
  onAddClassClick: () => void;
  onOpenReports: () => void;
  onOpenTransfer: () => void;
  onOpenScanModal?: () => void;
  onQuickAdvanceLesson?: (cls: ClassSession) => void;
}

export const DailyTimetable: FC<DailyTimetableProps> = ({ 
  classes, 
  logs,
  onClassClick, 
  onManageCourse,
  onAddClassClick,
  onOpenReports,
  onOpenTransfer,
  onOpenScanModal,
  onQuickAdvanceLesson,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const todayDayOfWeek = currentTime.getDay();
  const todayStr = format(currentTime, 'EEEE, MMMM d, yyyy');

  const formatTime = (timeStr: string) => {
    try {
      const parsed = parse(timeStr, 'HH:mm', new Date());
      return format(parsed, 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  const getStatus = (startTime: string, endTime: string) => {
    const now = currentTime;
    const todayDateStr = format(now, 'yyyy-MM-dd');
    const start = parse(`${todayDateStr} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const end = parse(`${todayDateStr} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());

    if (now >= start && now <= end) {
      return { 
        label: 'Active Now', 
        badgeClass: 'border-emerald-300 bg-emerald-50 text-emerald-900',
        dot: 'bg-emerald-600 animate-pulse',
        isLive: true 
      };
    }
    if (now < start) {
      return { 
        label: 'Upcoming', 
        badgeClass: 'border-zinc-300 bg-zinc-100 text-zinc-800',
        dot: 'bg-zinc-500',
        isLive: false 
      };
    }
    return { 
      label: 'Completed', 
      badgeClass: 'border-zinc-300 bg-zinc-50 text-zinc-600',
      dot: 'bg-zinc-400',
      isLive: false 
    };
  };

  // Build today's sessions
  const todaySessions: Array<{ classInfo: ClassSession; schedule: ClassSchedule }> = [];
  classes.forEach((cls) => {
    const matchingSchedules = cls.schedule.filter((s) => s.dayOfWeek === todayDayOfWeek);
    matchingSchedules.forEach((sch) => {
      todaySessions.push({
        classInfo: cls,
        schedule: sch,
      });
    });
  });

  todaySessions.sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));

  const filteredAllClasses = classes.filter((cls) => 
    cls.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cls.subjectTitle && cls.subjectTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
    cls.section.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeNowSession = todaySessions.find((s) => {
    const status = getStatus(s.schedule.startTime, s.schedule.endTime);
    return status.isLive;
  });

  const activeProgress = activeNowSession ? getCourseProgressDetails(activeNowSession.classInfo, logs) : null;

  return (
    <div className="flex flex-col gap-5 sm:gap-6 max-w-5xl mx-auto w-full min-w-0 px-3.5 py-4 sm:px-6 sm:py-8 box-border">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5 w-full min-w-0">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 truncate">
              Timetable & Syllabus
            </h1>
            <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-800 shrink-0">
              Current Semester
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-zinc-600 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
            <span className="truncate">{todayStr}</span>
          </p>
        </div>

        {/* Responsive Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto min-w-0">
          <button
            type="button"
            onClick={onAddClassClick}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-3.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5 shrink-0" aria-hidden="true" />
            Add Course
          </button>

          {onOpenScanModal && (
            <button
              type="button"
              onClick={onOpenScanModal}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs sm:text-sm font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 hover:text-zinc-950 transition-colors cursor-pointer min-w-0"
              title="Upload or scan faculty loading screenshot"
            >
              <Camera className="w-4 h-4 mr-1.5 text-zinc-700 shrink-0" aria-hidden="true" />
              <span className="truncate">Scan Image</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenTransfer}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs sm:text-sm font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 hover:text-zinc-950 transition-colors cursor-pointer min-w-0"
            title="Transfer data between Laptop & Phone"
          >
            <Smartphone className="w-4 h-4 mr-1.5 text-zinc-700 shrink-0" aria-hidden="true" />
            <span className="truncate">Transfer</span>
          </button>

          <button
            type="button"
            onClick={onOpenReports}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs sm:text-sm font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 hover:text-zinc-950 transition-colors cursor-pointer min-w-0"
          >
            <FileDown className="w-4 h-4 mr-1.5 text-zinc-600 shrink-0" aria-hidden="true" />
            <span className="truncate">Report</span>
          </button>
        </div>
      </div>

      {/* Live Class Notification Banner */}
      {activeNowSession && activeProgress && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 sm:p-5 shadow-2xs flex flex-col gap-3 w-full min-w-0 box-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span className="relative flex h-3 w-3 mt-1 shrink-0" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Current Active Class
                  </span>
                  <span className="text-xs font-semibold text-emerald-800">
                    {formatTime(activeNowSession.schedule.startTime)} – {formatTime(activeNowSession.schedule.endTime)}
                  </span>
                </div>
                <p className="text-base font-bold text-zinc-950 mt-0.5 break-words">
                  {activeNowSession.classInfo.subjectCode} — {activeNowSession.classInfo.subjectTitle || activeNowSession.classInfo.section}
                  {activeNowSession.schedule.room && ` (${activeNowSession.schedule.room})`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onClassClick(activeNowSession.classInfo, activeNowSession.schedule)}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white shadow-2xs hover:bg-emerald-800 transition-colors shrink-0 cursor-pointer w-full sm:w-auto"
            >
              <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
              Log Class Progress
            </button>
          </div>

          {/* Unfinished Cut-off Callout in Live Banner with 1-Click Proceed */}
          {activeProgress.isContinuingPartial && activeProgress.partialTopics.length > 0 && (
            <div className="bg-white/95 border border-amber-300 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 w-full min-w-0 box-border">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Hourglass className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                  <span className="font-bold text-amber-900 shrink-0">Resume from cut-off:</span>
                  <span className="font-semibold text-zinc-950 break-words">{activeProgress.partialTopics[0].topic}</span>
                </div>
                {activeProgress.partialTopics[0].note && (
                  <p className="text-[11px] font-medium text-amber-900 break-words pl-5">
                    Cut-off point: "{activeProgress.partialTopics[0].note}"
                  </p>
                )}
                {activeProgress.nextLessonTopic && (
                  <p className="text-[11px] text-zinc-600 font-medium pl-5 pt-0.5 truncate">
                    Next lesson: <span className="font-bold text-zinc-950">{activeProgress.nextLessonTopic}</span>
                  </p>
                )}
              </div>

              {onQuickAdvanceLesson && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAdvanceLesson(activeNowSession.classInfo);
                  }}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3 text-xs font-bold text-white shadow-2xs transition-colors shrink-0 cursor-pointer w-full sm:w-auto"
                  title="Mark this partial lesson completed and advance to the next syllabus topic"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Mark Done & Advance →</span>
                </button>
              )}
            </div>
          )}

          {/* Clean Notes from Last Class in Live Banner (Never Erased) */}
          {activeProgress.latestNote && (
            <div className="bg-white/95 border border-emerald-300/80 rounded-lg p-2.5 flex items-start gap-2.5 text-xs text-zinc-900 w-full min-w-0 box-border">
              <FileText className="h-3.5 w-3.5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-emerald-950 uppercase text-[10px] tracking-wider block">
                    Notes & Actions from Last Meeting {activeProgress.latestNoteDate && `(${format(activeProgress.latestNoteDate, 'MMM d')})`}:
                  </span>
                  {activeProgress.isLatestNoteDone && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200">
                      ✓ Done
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 leading-relaxed break-words ${activeProgress.isLatestNoteDone ? 'line-through text-zinc-600' : 'text-zinc-900 font-medium'}`}>
                  {activeProgress.latestNote}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
        <div 
          role="tablist" 
          aria-label="Timetable Schedule Filter"
          className="grid grid-cols-2 sm:inline-flex h-11 items-center justify-center rounded-lg bg-zinc-200/80 p-1 text-zinc-700 w-full sm:w-auto min-w-0 box-border"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'today'}
            type="button"
            onClick={() => setActiveTab('today')}
            className={`inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'today'
                ? 'bg-white text-zinc-950 shadow-2xs'
                : 'text-zinc-700 hover:text-zinc-950'
            }`}
          >
            Today's Schedule ({todaySessions.length})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'all'}
            type="button"
            onClick={() => setActiveTab('all')}
            className={`inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-zinc-950 shadow-2xs'
                : 'text-zinc-700 hover:text-zinc-950'
            }`}
          >
            All Courses ({classes.length})
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="relative w-full sm:w-80 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by code, title, or section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-4 py-2 text-xs sm:text-sm text-zinc-900 shadow-2xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            />
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="w-full min-w-0">
        {activeTab === 'today' ? (
          todaySessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 sm:p-12 text-center w-full box-border">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 mb-3.5">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-zinc-950">
                {classes.length === 0 ? 'No courses in your schedule yet' : 'No classes scheduled for today'}
              </h2>
              <p className="text-sm text-zinc-600 mt-1 max-w-sm mx-auto mb-5 leading-normal">
                {classes.length === 0 
                  ? 'Your timetable is completely clean. Get started by adding your semester courses or uploading your syllabus (.docx).'
                  : 'You do not have any lecture or laboratory sessions assigned for today.'}
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={onAddClassClick}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  Add Course
                </button>
                {classes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    View All Courses ({classes.length})
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 w-full min-w-0">
              {todaySessions.map(({ classInfo: cls, schedule: sch }, idx) => {
                const status = getStatus(sch.startTime, sch.endTime);
                const isLab = sch.type === 'Laboratory';
                const displayRoom = sch.room || cls.room;
                const progress = getCourseProgressDetails(cls, logs);

                return (
                  <div
                    key={`${cls.id}_${idx}`}
                    onClick={() => onClassClick(cls, sch)}
                    className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer flex flex-col gap-3 group w-full min-w-0 box-border overflow-hidden"
                  >
                    {/* Header Row: Subject Code, Type Badge, Section, Room */}
                    <div className="flex items-start justify-between gap-2 w-full min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 flex-1">
                        <span className="text-base sm:text-lg font-bold tracking-tight text-zinc-950">
                          {cls.subjectCode}
                        </span>

                        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold shrink-0 ${
                          isLab 
                            ? 'border-purple-300 bg-purple-100 text-purple-900' 
                            : 'border-zinc-300 bg-zinc-100 text-zinc-900'
                        }`}>
                          {isLab ? <FlaskConical className="w-3.5 h-3.5 text-purple-700 shrink-0" aria-hidden="true" /> : <GraduationCap className="w-3.5 h-3.5 text-zinc-700 shrink-0" aria-hidden="true" />}
                          {sch.type || 'Lecture'}
                        </span>

                        <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 shrink-0">
                          {cls.section}
                        </span>
                      </div>

                      {displayRoom && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-200/80 px-2 py-0.5 rounded shrink-0">
                          <MapPin className="w-3 h-3 text-zinc-500 shrink-0" aria-hidden="true" />
                          {displayRoom}
                        </span>
                      )}
                    </div>

                    {/* Subject Title */}
                    {cls.subjectTitle && (
                      <p className="text-sm text-zinc-700 font-medium leading-snug break-words">
                        {cls.subjectTitle}
                      </p>
                    )}

                    {/* Unfinished / In-Progress Topic Badge with 1-Click Done & Proceed */}
                    {progress.isContinuingPartial && progress.partialTopics.length > 0 ? (
                      <div className="rounded-lg border border-amber-300 bg-amber-50/90 p-3 space-y-2 text-xs text-amber-950 w-full min-w-0 box-border">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 p-1 rounded bg-amber-200/80 text-amber-800 shrink-0">
                            <Hourglass className="h-3.5 w-3.5" />
                          </div>
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wider block">
                              Unfinished Lesson (Resume Today):
                            </span>
                            <p className="font-semibold text-zinc-950 text-xs leading-snug break-words">
                              {progress.partialTopics[0].topic}
                            </p>
                            {progress.partialTopics[0].note && (
                              <p className="text-[11px] font-medium text-amber-900 bg-white/90 px-2 py-0.5 rounded border border-amber-200 inline-block break-words max-w-full">
                                📍 Cut-off: "{progress.partialTopics[0].note}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quick 1-Click Done & Proceed Button */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/80 flex-wrap">
                          <span className="text-[11px] text-amber-950 font-medium truncate">
                            Next topic: <span className="font-bold text-zinc-950">{progress.nextLessonTopic || 'Next lesson'}</span>
                          </span>

                          {onQuickAdvanceLesson && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickAdvanceLesson(cls);
                              }}
                              className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                              title="Mark this partial lesson completed and advance to the next syllabus topic"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Mark Done & Advance →</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      progress.currentActiveTopic && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-medium min-w-0">
                          <span className="text-zinc-500 font-normal shrink-0">Next Up:</span>
                          <span className="font-semibold text-zinc-900 truncate">{progress.currentActiveTopic}</span>
                        </div>
                      )
                    )}

                    {/* Notes from Last Session Box (Never Erased) */}
                    {progress.latestNote && (
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50/90 p-2.5 flex items-start gap-2 text-xs text-zinc-800 w-full min-w-0 box-border">
                        <FileText className="h-3.5 w-3.5 text-zinc-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-zinc-700 uppercase text-[10px] tracking-wider">
                              Notes from Last Class {progress.latestNoteDate && `(${format(progress.latestNoteDate, 'MMM d')})`}:
                            </span>
                            {progress.isLatestNoteDone && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200">
                                ✓ Done
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 leading-relaxed break-words ${progress.isLatestNoteDone ? 'line-through text-zinc-600' : 'text-zinc-900 font-medium'}`}>
                            {progress.latestNote}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Mini syllabus progress bar */}
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-600 w-full min-w-0">
                      <div className="w-24 sm:w-28 bg-zinc-200 h-1.5 rounded-full overflow-hidden shrink-0">
                        <div className="bg-zinc-900 h-full rounded-full transition-all" style={{ width: `${progress.percent}%` }} />
                      </div>
                      <span className="text-[11px] sm:text-xs text-zinc-600 font-medium truncate">
                        {progress.completedCount}/{progress.totalTopics} Topics Covered ({progress.percent}%)
                      </span>
                    </div>

                    {/* Card Footer: Time, Status Badge & Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-t border-zinc-100 pt-3 mt-0.5 w-full min-w-0">
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-zinc-900 flex-wrap min-w-0">
                        <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
                        <span>{formatTime(sch.startTime)} – {formatTime(sch.endTime)}</span>
                        <span className="text-zinc-400 font-normal">•</span>
                        <span className="text-xs text-zinc-500 font-medium">
                          {sch.type || 'Lecture'} Slot
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${status.badgeClass} shrink-0`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                          {status.label}
                        </span>

                        <button
                          type="button"
                          className="inline-flex h-8 sm:h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 sm:px-3.5 text-xs font-bold text-zinc-800 shadow-2xs group-hover:bg-zinc-950 group-hover:text-white group-hover:border-zinc-950 transition-colors shrink-0 cursor-pointer"
                        >
                          Log Session
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          filteredAllClasses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center w-full box-border">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 mb-3.5">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-zinc-950">No courses found</h2>
              <p className="text-sm text-zinc-600 mt-1 mb-5">
                {searchQuery ? "Try searching with a different course code or title." : "You haven't configured any courses yet."}
              </p>
              <button
                type="button"
                onClick={onAddClassClick}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Add Course
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 w-full min-w-0">
              {filteredAllClasses.map((cls) => {
                const progress = getCourseProgressDetails(cls, logs);

                return (
                  <div
                    key={cls.id}
                    onClick={() => onManageCourse(cls)}
                    className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer flex flex-col justify-between group w-full min-w-0 box-border overflow-hidden"
                  >
                    <div className="space-y-3 min-w-0">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-base font-bold tracking-tight text-zinc-950">
                              {cls.subjectCode}
                            </span>
                            <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                              {cls.section}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-zinc-600 mt-0.5">
                            {cls.year}
                          </p>
                        </div>

                        {cls.room && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
                            {cls.room}
                          </span>
                        )}
                      </div>

                      {cls.subjectTitle && (
                        <p className="text-sm font-medium text-zinc-900 line-clamp-1 break-words">
                          {cls.subjectTitle}
                        </p>
                      )}

                      {/* Unfinished / In-Progress Topic Badge in All Courses */}
                      {progress.isContinuingPartial && progress.partialTopics.length > 0 ? (
                        <div className="rounded-lg border border-amber-300 bg-amber-50/90 p-2.5 flex items-start gap-2 text-xs text-amber-950 w-full min-w-0 box-border">
                          <Hourglass className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-amber-900 text-[10px] uppercase block">Unfinished Lesson:</span>
                            <span className="font-semibold text-zinc-950 truncate block">{progress.partialTopics[0].topic}</span>
                            {progress.partialTopics[0].note && (
                              <span className="text-[11px] text-amber-900 font-medium block truncate">Cut-off: "{progress.partialTopics[0].note}"</span>
                            )}
                          </div>
                        </div>
                      ) : progress.latestNote ? (
                        <p className="text-xs text-zinc-600 font-medium line-clamp-1">
                          <span className="text-zinc-500">Note:</span> {progress.latestNote}
                        </p>
                      ) : null}

                      {/* Real Syllabus Accomplishment Progress Bar */}
                      <div className="space-y-1 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200/80 w-full min-w-0">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-zinc-600">Syllabus Progress</span>
                          <span className="font-mono text-zinc-950 font-bold">{progress.completedCount}/{progress.totalTopics} ({progress.percent}%)</span>
                        </div>
                        <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-zinc-950 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600 w-full min-w-0">
                      <span className="flex items-center gap-1 shrink-0">
                        <Layers className="w-3.5 h-3.5 text-zinc-500" />
                        {cls.masterSyllabus.length} Topics
                      </span>
                      <span className="font-semibold text-zinc-900 group-hover:text-zinc-950 shrink-0">
                        View Syllabus Details →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

    </div>
  );
};
