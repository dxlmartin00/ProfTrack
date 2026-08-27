import { useState, useEffect } from 'react';
import type { FC } from 'react';
import type { ClassSession, ClassSchedule, SessionLog } from '../services/db';
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
  BookOpen
} from 'lucide-react';

interface DailyTimetableProps {
  classes: ClassSession[];
  logs: (SessionLog & { classInfo: ClassSession })[];
  onClassClick: (cls: ClassSession, activeSchedule?: ClassSchedule) => void;
  onManageCourse: (cls: ClassSession) => void;
  onAddClassClick: () => void;
  onOpenReports: () => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DailyTimetable: FC<DailyTimetableProps> = ({ 
  classes, 
  logs,
  onClassClick, 
  onManageCourse,
  onAddClassClick,
  onOpenReports 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = format(currentTime, 'EEEE, MMMM d, yyyy');
  const todayDayOfWeek = currentTime.getDay();

  const formatTime = (time: string) => {
    try {
      const date = parse(time, 'HH:mm', new Date());
      return format(date, 'h:mm a');
    } catch {
      return time;
    }
  };

  const getStatus = (startTime: string, endTime: string) => {
    const currentString = format(currentTime, 'HH:mm');
    if (currentString < startTime) {
      return { 
        label: 'Upcoming', 
        badgeClass: 'border-zinc-300 bg-zinc-100 text-zinc-800',
        dot: 'bg-zinc-500',
        isLive: false 
      };
    }
    if (currentString >= startTime && currentString <= endTime) {
      return { 
        label: 'In Progress', 
        badgeClass: 'border-emerald-400 bg-emerald-100 text-emerald-900',
        dot: 'bg-emerald-600 animate-pulse',
        isLive: true 
      };
    }
    return { 
      label: 'Completed', 
      badgeClass: 'border-zinc-300 bg-zinc-50 text-zinc-600',
      dot: 'bg-zinc-400',
      isLive: false 
    };
  };

  // Helper to get syllabus accomplishment % for a class
  const getCourseSyllabusStats = (cls: ClassSession) => {
    const courseLogs = logs.filter(l => l.classInfo.id === cls.id || l.classInfo.subjectCode === cls.subjectCode);
    const coveredSet = new Set<string>();
    courseLogs.forEach(l => l.topicsCovered.forEach(t => coveredSet.add(t)));

    const total = cls.masterSyllabus.length || 1;
    const completed = cls.masterSyllabus.filter(t => coveredSet.has(t)).length;
    const percent = Math.round((completed / total) * 100);

    return { completed, total: cls.masterSyllabus.length, percent };
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

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full px-4 py-8 sm:px-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
              Timetable & Syllabus
            </h1>
            <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-800">
              Current Semester
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-600 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-zinc-500" aria-hidden="true" />
            <span>{todayStr}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenReports}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 hover:text-zinc-950 transition-colors cursor-pointer"
          >
            <FileDown className="w-4 h-4 mr-2 text-zinc-600" aria-hidden="true" />
            Export Report
          </button>
          
          <button
            type="button"
            onClick={onAddClassClick}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
            Add Course
          </button>
        </div>
      </div>

      {/* Live Class Notification Banner */}
      {activeNowSession && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="relative flex h-3 w-3 mt-1" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Current Active Class
                </span>
                <span className="font-mono text-xs font-semibold text-emerald-800">
                  {formatTime(activeNowSession.schedule.startTime)} – {formatTime(activeNowSession.schedule.endTime)}
                </span>
              </div>
              <p className="text-base font-bold text-zinc-950 mt-0.5">
                {activeNowSession.classInfo.subjectCode} — {activeNowSession.classInfo.subjectTitle || activeNowSession.classInfo.section}
                {activeNowSession.schedule.room && ` (${activeNowSession.schedule.room})`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onClassClick(activeNowSession.classInfo, activeNowSession.schedule)}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white shadow-2xs hover:bg-emerald-800 transition-colors shrink-0 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
            Log Class Progress
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div 
          role="tablist" 
          aria-label="Timetable Schedule Filter"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-200/80 p-1 text-zinc-700 w-full sm:w-auto"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'today'}
            type="button"
            onClick={() => setActiveTab('today')}
            className={`inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-4 text-sm font-semibold transition-all ${
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
            className={`inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-4 text-sm font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-zinc-950 shadow-2xs'
                : 'text-zinc-700 hover:text-zinc-950'
            }`}
          >
            All Courses ({classes.length})
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search courses by code, title, or section"
              placeholder="Search courses or sections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-3 py-2 text-sm text-zinc-900 shadow-2xs placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            />
          </div>
        )}
      </div>

      {/* Main Stream Area */}
      <div>
        {activeTab === 'today' ? (
          todaySessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
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
              <div className="flex items-center justify-center gap-3">
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
            <div className="grid gap-4">
              {todaySessions.map(({ classInfo: cls, schedule: sch }, idx) => {
                const status = getStatus(sch.startTime, sch.endTime);
                const isLab = sch.type === 'Laboratory';
                const displayRoom = sch.room || cls.room;
                const stats = getCourseSyllabusStats(cls);

                return (
                  <div
                    key={`${cls.id}_${idx}`}
                    onClick={() => onClassClick(cls, sch)}
                    className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-base font-bold tracking-tight text-zinc-950">
                          {cls.subjectCode}
                        </span>

                        <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                          isLab 
                            ? 'border-purple-300 bg-purple-100 text-purple-900' 
                            : 'border-zinc-300 bg-zinc-100 text-zinc-900'
                        }`}>
                          {isLab ? <FlaskConical className="w-3.5 h-3.5 text-purple-700" aria-hidden="true" /> : <GraduationCap className="w-3.5 h-3.5 text-zinc-700" aria-hidden="true" />}
                          {sch.type || 'Lecture'}
                        </span>

                        <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                          {cls.section}
                        </span>

                        {displayRoom && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600">
                            <MapPin className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
                            {displayRoom}
                          </span>
                        )}
                      </div>

                      {cls.subjectTitle && (
                        <p className="text-sm text-zinc-600 font-medium">
                          {cls.subjectTitle}
                        </p>
                      )}

                      {/* Mini syllabus progress bar */}
                      <div className="flex items-center gap-3 pt-1 text-xs font-semibold text-zinc-600">
                        <div className="w-28 bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-zinc-900 h-full rounded-full" style={{ width: `${stats.percent}%` }} />
                        </div>
                        <span>{stats.completed}/{stats.total} Topics Covered ({stats.percent}%)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3.5 sm:pt-0 border-zinc-100">
                      <div className="text-left sm:text-right">
                        <div className="flex items-center sm:justify-end gap-1.5 font-mono text-sm font-bold text-zinc-900">
                          <Clock className="w-4 h-4 text-zinc-500" aria-hidden="true" />
                          <span>{formatTime(sch.startTime)} – {formatTime(sch.endTime)}</span>
                        </div>
                        <p className="text-xs font-medium text-zinc-600 mt-0.5">
                          {sch.type || 'Lecture'} Slot
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${status.badgeClass}`}>
                          <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden="true" />
                          {status.label}
                        </span>

                        <button
                          type="button"
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3.5 text-xs font-bold text-zinc-800 shadow-2xs group-hover:bg-zinc-950 group-hover:text-white group-hover:border-zinc-950 transition-colors"
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
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
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
                className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Add Course
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredAllClasses.map((cls) => {
                const stats = getCourseSyllabusStats(cls);
                return (
                  <div
                    key={cls.id}
                    onClick={() => onManageCourse(cls)}
                    className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
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
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600">
                            <MapPin className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
                            {cls.room}
                          </span>
                        )}
                      </div>

                      {cls.subjectTitle && (
                        <p className="text-sm font-medium text-zinc-900 line-clamp-1">
                          {cls.subjectTitle}
                        </p>
                      )}

                      {/* Real Syllabus Accomplishment Progress Bar */}
                      <div className="space-y-1 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200/80">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-zinc-600">Syllabus Progress</span>
                          <span className="font-mono text-zinc-950 font-bold">{stats.completed}/{stats.total} ({stats.percent}%)</span>
                        </div>
                        <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-zinc-950 h-full rounded-full transition-all duration-300" style={{ width: `${stats.percent}%` }} />
                        </div>
                      </div>

                      {/* Schedule Slots list */}
                      <div className="space-y-1.5 pt-1">
                        {cls.schedule.map((sch, i) => {
                          const isLab = sch.type === 'Laboratory';
                          return (
                            <div key={i} className="flex items-center justify-between text-xs text-zinc-700 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200/80">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase ${
                                  isLab ? 'bg-purple-100 text-purple-900 border border-purple-300' : 'bg-zinc-200 text-zinc-900'
                                }`}>
                                  {sch.type || 'Lecture'}
                                </span>
                                <span className="font-semibold text-zinc-950">{DAY_NAMES[sch.dayOfWeek]}:</span>
                                <span className="font-mono text-zinc-800">{formatTime(sch.startTime)} – {formatTime(sch.endTime)}</span>
                              </div>
                              {sch.room && (
                                <span className="text-xs font-medium text-zinc-500">
                                  {sch.room}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-zinc-100 text-xs font-medium text-zinc-600">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-zinc-500" aria-hidden="true" />
                        {cls.masterSyllabus.length} Syllabus Topics
                      </span>
                      <span className="font-bold text-zinc-950 group-hover:underline">
                        Manage & Inspect Course →
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
