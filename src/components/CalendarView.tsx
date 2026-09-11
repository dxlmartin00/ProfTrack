import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC } from 'react';
import { 
  format, 
  addWeeks, 
  subWeeks, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  parse
} from 'date-fns';
import type { ClassSession, SessionLog, InstructorProfile, ClassSchedule } from '../services/db';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Printer, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ListFilter,
  Plus,
  BookOpen,
  GraduationCap,
  FlaskConical,
  ExternalLink
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CalendarViewProps {
  classes: ClassSession[];
  logs: (SessionLog & { classInfo: ClassSession })[];
  profile?: InstructorProfile;
  onClassClick: (cls: ClassSession, sch?: ClassSchedule, targetDate?: Date) => void;
  onManageCourse?: (cls: ClassSession) => void;
  onSwitchToDaily: () => void;
  onAddClassClick?: () => void;
}

// Philippine Holidays & Academic Milestones
const PHILIPPINE_HOLIDAYS: Record<string, string> = {
  '01-01': "New Year's Day",
  '01-23': 'First Philippine Republic Day',
  '02-25': 'EDSA People Power Anniversary',
  '04-09': 'Araw ng Kagitingan (Day of Valor)',
  '05-01': 'Labor Day',
  '06-12': 'Philippine Independence Day',
  '08-21': 'Ninoy Aquino Day',
  '08-31': 'National Heroes Day',
  '11-01': "All Saints' Day",
  '11-02': "All Souls' Day",
  '11-30': 'Bonifacio Day',
  '12-08': 'Feast of the Immaculate Conception',
  '12-25': 'Christmas Day',
  '12-30': 'Rizal Day',
  '12-31': "New Year's Eve"
};

export const CalendarView: FC<CalendarViewProps> = ({
  classes,
  logs,
  profile,
  onClassClick,
  onManageCourse,
  onSwitchToDaily,
  onAddClassClick
}) => {
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedMobileDayIdx, setSelectedMobileDayIdx] = useState<number>(() => {
    const day = new Date().getDay();
    // Default to today if Mon-Sat, else Monday
    return day >= 1 && day <= 6 ? day - 1 : 0;
  });
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const calendarPrintRef = useRef<HTMLDivElement>(null);

  // Live clock for "Active Now" indicators
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Week navigation
  const nextWeek = () => setCurrentWeekDate(addWeeks(currentWeekDate, 1));
  const prevWeek = () => setCurrentWeekDate(subWeeks(currentWeekDate, 1));
  const goToCurrentWeek = () => {
    const now = new Date();
    setCurrentWeekDate(now);
    const day = now.getDay();
    setSelectedMobileDayIdx(day >= 1 && day <= 6 ? day - 1 : 0);
  };

  // Check if any loaded class has a Saturday schedule
  const hasSaturdayClasses = useMemo(() => {
    return classes.some(c => c.schedule.some(s => s.dayOfWeek === 6));
  }, [classes]);

  // Compute academic days for the week: Monday to Friday (or Saturday if loaded)
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeekDate, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(currentWeekDate, { weekStartsOn: 1 }); // Sunday
    const allDays = eachDayOfInterval({ start, end });
    
    // Academic work days: Monday(0) to Friday(4), or Saturday(5)
    return hasSaturdayClasses ? allDays.slice(0, 6) : allDays.slice(0, 5);
  }, [currentWeekDate, hasSaturdayClasses]);

  // Week display label
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length === 0) return '';
    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];
    if (format(first, 'MMM') === format(last, 'MMM')) {
      return `${format(first, 'MMMM d')} – ${format(last, 'd, yyyy')}`;
    }
    return `${format(first, 'MMM d')} – ${format(last, 'MMM d, yyyy')}`;
  }, [weekDays]);

  // Filtered classes based on course dropdown
  const filteredClasses = useMemo(() => {
    if (selectedCourseFilter === 'all') return classes;
    return classes.filter(c => c.id === selectedCourseFilter);
  }, [classes, selectedCourseFilter]);

  // Format 24h to 12h time (e.g. 08:00 -> 8:00 AM)
  const formatTimeSlot = (timeStr: string) => {
    try {
      const parsed = parse(timeStr, 'HH:mm', new Date());
      return format(parsed, 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  // Compute duration in hours
  const computeDurationHours = (startStr: string, endStr: string): number => {
    try {
      const [sh, sm] = startStr.split(':').map(Number);
      const [eh, em] = endStr.split(':').map(Number);
      const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
      return Math.max(0, totalMinutes / 60);
    } catch {
      return 1;
    }
  };

  // Map classes to each day of the week
  const getDaySchedule = (dayDate: Date) => {
    const dayOfWeek = dayDate.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const items: Array<{
      cls: ClassSession;
      sch: ClassSchedule;
      isLogged: boolean;
      isLiveNow: boolean;
      duration: number;
      matchingLog?: SessionLog & { classInfo: ClassSession };
      nextTopic?: string;
    }> = [];

    filteredClasses.forEach(cls => {
      cls.schedule.forEach(sch => {
        if (sch.dayOfWeek === dayOfWeek) {
          // Check if session was logged for this date
          const matchingLog = logs.find(l => 
            l.classInfo.id === cls.id && 
            isSameDay(new Date(l.date), dayDate)
          );

          // Check if active live right now
          let isLiveNow = false;
          if (isToday(dayDate)) {
            const todayStr = format(currentTime, 'yyyy-MM-dd');
            const start = parse(`${todayStr} ${sch.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
            const end = parse(`${todayStr} ${sch.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
            isLiveNow = currentTime >= start && currentTime <= end;
          }

          // Calculate next topic
          const loggedCount = logs.filter(l => l.classInfo.id === cls.id).length;
          const nextTopic = cls.masterSyllabus && cls.masterSyllabus.length > loggedCount 
            ? cls.masterSyllabus[loggedCount]
            : undefined;

          items.push({
            cls,
            sch,
            isLogged: !!matchingLog,
            isLiveNow,
            duration: computeDurationHours(sch.startTime, sch.endTime),
            matchingLog,
            nextTopic
          });
        }
      });
    });

    // Sort chronologically by start time
    return items.sort((a, b) => a.sch.startTime.localeCompare(b.sch.startTime));
  };

  // Overall weekly metrics
  const weeklyMetrics = useMemo(() => {
    let totalClasses = 0;
    let totalHours = 0;
    let loggedSessions = 0;

    weekDays.forEach(day => {
      const schedule = getDaySchedule(day);
      totalClasses += schedule.length;
      schedule.forEach(item => {
        totalHours += item.duration;
        if (item.isLogged) loggedSessions++;
      });
    });

    return { totalClasses, totalHours, loggedSessions };
  }, [weekDays, filteredClasses, logs]);

  // High-resolution Printable PDF Export
  const handleExportPDF = async () => {
    if (!calendarPrintRef.current) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(calendarPrintRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`ProfTrack_Weekly_Schedule_${format(currentWeekDate, 'yyyy_MM_dd')}.pdf`);
    } catch (err) {
      console.error('Failed to export calendar PDF:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4">
      {/* Top Toolbar: View Switcher, Week Navigation & Controls */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: View Mode Segmented Switcher & Current Week */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-1 rounded-xl bg-zinc-100 border border-zinc-200">
            <button
              type="button"
              onClick={onSwitchToDaily}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 hover:text-zinc-950 transition-all cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Daily Timetable</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-zinc-950 shadow-2xs transition-all cursor-default"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-zinc-900" />
              <span>Weekly Schedule</span>
            </button>
          </div>

          <button
            type="button"
            onClick={goToCurrentWeek}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-800 transition-colors shadow-2xs cursor-pointer"
            title="Jump to current week"
          >
            This Week
          </button>
        </div>

        {/* Center: Week Navigator */}
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={prevWeek}
            className="p-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer shadow-2xs"
            aria-label="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <h2 className="text-sm sm:text-base font-black text-zinc-950 tracking-tight min-w-[210px] text-center">
            {weekRangeLabel}
          </h2>

          <button
            type="button"
            onClick={nextWeek}
            className="p-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer shadow-2xs"
            aria-label="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Actions, Course Filter & PDF */}
        <div className="flex items-center gap-2 justify-end flex-wrap">
          {onAddClassClick && (
            <button
              type="button"
              onClick={onAddClassClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-800 transition-colors shadow-2xs cursor-pointer"
              title="Add a new course"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-700" />
              <span className="hidden sm:inline">Add Course</span>
            </button>
          )}

          {/* Course filter */}
          <div className="relative">
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="appearance-none rounded-xl border border-zinc-200 bg-white pl-3 pr-8 py-1.5 text-xs font-bold text-zinc-900 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 cursor-pointer"
            >
              <option value="all">All Courses ({classes.length})</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.subjectCode} ({c.section})
                </option>
              ))}
            </select>
            <ListFilter className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Export PDF button */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-950 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Download printable PDF weekly schedule"
          >
            {isExporting ? (
              <span className="animate-spin text-xs">⏳</span>
            ) : (
              <Printer className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      {/* Weekly Stats Header Pill Bar */}
      <div className="bg-zinc-50 rounded-xl border border-zinc-200/80 px-4 py-2.5 flex items-center justify-between gap-4 text-xs flex-wrap">
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-zinc-500">Weekly Total:</span>
            <span className="font-extrabold text-zinc-900">{weeklyMetrics.totalClasses} Sessions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-zinc-500">Teaching Hours:</span>
            <span className="font-extrabold text-zinc-900">{weeklyMetrics.totalHours} hrs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-zinc-500">Accomplished:</span>
            <span className="font-extrabold text-emerald-800">{weeklyMetrics.loggedSessions} logged</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-zinc-500 hidden md:block">
          {profile?.fullName || 'Faculty Schedule'} • {profile?.position || 'Instructor'}
        </div>
      </div>

      {/* Mobile Day Selector Tabs (Only visible on small mobile screens) */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {weekDays.map((dayDate, idx) => {
          const isSelected = selectedMobileDayIdx === idx;
          const isCurrentDay = isToday(dayDate);
          const schedule = getDaySchedule(dayDate);
          return (
            <button
              key={dayDate.toISOString()}
              type="button"
              onClick={() => setSelectedMobileDayIdx(idx)}
              className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-zinc-950 border-zinc-950 text-white shadow-sm'
                  : isCurrentDay
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                {format(dayDate, 'EEE')}
              </div>
              <div className="text-sm font-extrabold">
                {format(dayDate, 'd')}
              </div>
              <div className="text-[9px] font-medium mt-0.5 opacity-75">
                {schedule.length} {schedule.length === 1 ? 'class' : 'classes'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Weekly Schedule Planner Container */}
      <div 
        ref={calendarPrintRef}
        className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
      >
        {/* Desktop & Tablet Multi-Column View (Hidden on mobile, uses grid-cols-5 or 6) */}
        <div className={`hidden md:grid divide-x divide-zinc-200 ${
          hasSaturdayClasses ? 'grid-cols-6' : 'grid-cols-5'
        }`}>
          {weekDays.map((dayDate) => {
            const isCurrentDay = isToday(dayDate);
            const holidayName = PHILIPPINE_HOLIDAYS[format(dayDate, 'MM-dd')];
            const schedule = getDaySchedule(dayDate);
            const dayTotalHours = schedule.reduce((sum, item) => sum + item.duration, 0);

            return (
              <div key={dayDate.toISOString()} className="flex flex-col min-h-[480px] bg-zinc-50/40">
                {/* Day Header Column */}
                <div className={`p-3 border-b border-zinc-200 transition-colors ${
                  isCurrentDay 
                    ? 'bg-zinc-950 text-white' 
                    : holidayName 
                    ? 'bg-rose-50/90 text-rose-950 border-rose-200' 
                    : 'bg-zinc-100/70 text-zinc-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black tracking-wider uppercase ${
                      isCurrentDay ? 'text-zinc-200' : 'text-zinc-600'
                    }`}>
                      {format(dayDate, 'EEEE')}
                    </span>
                    {isCurrentDay && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Today" />
                    )}
                  </div>

                  <div className="flex items-baseline justify-between mt-1">
                    <span className={`text-lg font-black tracking-tight ${
                      isCurrentDay ? 'text-white' : 'text-zinc-950'
                    }`}>
                      {format(dayDate, 'MMM d')}
                    </span>
                    <span className={`text-[10px] font-bold ${
                      isCurrentDay ? 'text-zinc-300' : 'text-zinc-500'
                    }`}>
                      {schedule.length} {schedule.length === 1 ? 'class' : 'classes'} • {dayTotalHours}h
                    </span>
                  </div>

                  {/* Holiday Banner if present */}
                  {holidayName && (
                    <div className="mt-1.5 text-[10px] font-bold text-rose-800 bg-rose-100/80 px-1.5 py-0.5 rounded border border-rose-200 truncate">
                      {holidayName}
                    </div>
                  )}
                </div>

                {/* Day Schedule Stack */}
                <div className="flex-1 p-2 space-y-2.5 overflow-y-auto">
                  {schedule.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                      <div className="h-8 w-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 mb-1.5">
                        <CalendarIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-zinc-400">No classes scheduled</span>
                    </div>
                  ) : (
                    schedule.map((item, itemIdx) => {
                      const isLab = item.sch.type === 'Laboratory';
                      return (
                        <div
                          key={`${item.cls.id}_${item.sch.dayOfWeek}_${itemIdx}`}
                          onClick={() => onClassClick(item.cls, item.sch, dayDate)}
                          className={`rounded-xl border p-3 cursor-pointer transition-all shadow-2xs hover:shadow-md hover:scale-[1.01] group flex flex-col justify-between gap-2 ${
                            item.isLiveNow
                              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/50'
                              : isLab
                              ? 'border-blue-200 bg-blue-50/70 hover:border-blue-300'
                              : 'border-zinc-200 bg-white hover:border-zinc-300'
                          }`}
                        >
                          {/* Top Row: Time, Type Badge & Status */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-950 font-mono">
                              <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              <span>{formatTimeSlot(item.sch.startTime)}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Live indicator */}
                              {item.isLiveNow && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-600 text-white uppercase tracking-wider animate-pulse">
                                  Live
                                </span>
                              )}

                              {/* Completed checkmark */}
                              {item.isLogged ? (
                                <span className="text-emerald-700" title="Session accomplishment logged">
                                  <CheckCircle2 className="w-4 h-4" />
                                </span>
                              ) : (
                                <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  isLab ? 'bg-blue-100 text-blue-900' : 'bg-zinc-100 text-zinc-700'
                                }`}>
                                  {isLab ? <FlaskConical className="w-3 h-3 mr-0.5" /> : <GraduationCap className="w-3 h-3 mr-0.5" />}
                                  {isLab ? 'Lab' : 'Lec'}
                                </span>
                              )}

                              {onManageCourse && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onManageCourse(item.cls);
                                  }}
                                  className="p-1 rounded hover:bg-zinc-200/60 text-zinc-400 hover:text-zinc-800 transition-colors"
                                  title="Inspect Course Syllabus & Notes"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Middle: Subject Code & Title */}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-black text-zinc-950 group-hover:text-zinc-800">
                                {item.cls.subjectCode}
                              </span>
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200">
                                {item.cls.section}
                              </span>
                            </div>
                            <p className="text-[11px] font-medium text-zinc-600 line-clamp-1 mt-0.5">
                              {item.cls.subjectTitle}
                            </p>
                          </div>

                          {/* Next topic syllabus preview */}
                          {item.nextTopic && !item.isLogged && (
                            <div className="p-1.5 rounded-lg bg-zinc-100/70 border border-zinc-200/60 text-[10px] text-zinc-700 flex items-center gap-1.5">
                              <BookOpen className="w-3 h-3 text-zinc-500 shrink-0" />
                              <span className="truncate"><span className="font-bold text-zinc-900">Next:</span> {item.nextTopic}</span>
                            </div>
                          )}

                          {/* Bottom Row: Room & Duration */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-zinc-200/60 text-[10px] text-zinc-500 font-medium">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-zinc-400" />
                              <span className="font-bold text-zinc-700">
                                Room {item.sch.room || item.cls.room || 'CL'}
                              </span>
                            </div>
                            <span className="text-zinc-400 font-mono">
                              {formatTimeSlot(item.sch.endTime)} ({item.duration}h)
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Single Day View (Rendered only on mobile screen for selected day) */}
        <div className="md:hidden">
          {(() => {
            const currentDay = weekDays[selectedMobileDayIdx] || weekDays[0];
            const holidayName = PHILIPPINE_HOLIDAYS[format(currentDay, 'MM-dd')];
            const schedule = getDaySchedule(currentDay);
            const isCurrentDay = isToday(currentDay);

            return (
              <div className="p-3 space-y-3">
                {/* Mobile Day Header Banner */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  isCurrentDay 
                    ? 'bg-zinc-950 text-white border-zinc-950' 
                    : holidayName 
                    ? 'bg-rose-50 border-rose-200 text-rose-950' 
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                }`}>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                      {format(currentDay, 'EEEE')}
                    </span>
                    <h3 className="text-base font-extrabold">
                      {format(currentDay, 'MMMM d, yyyy')}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold">
                      {schedule.length} {schedule.length === 1 ? 'class' : 'classes'}
                    </span>
                    {isCurrentDay && (
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-0.5">
                        • Today
                      </div>
                    )}
                  </div>
                </div>

                {holidayName && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900">
                    🎉 Holiday / Observance: {holidayName}
                  </div>
                )}

                {/* Mobile Cards */}
                <div className="space-y-2.5">
                  {schedule.length === 0 ? (
                    <div className="py-12 text-center text-zinc-400 text-xs font-semibold">
                      No classes scheduled for {format(currentDay, 'EEEE')}.
                    </div>
                  ) : (
                    schedule.map((item, itemIdx) => {
                      const isLab = item.sch.type === 'Laboratory';
                      return (
                        <div
                          key={`${item.cls.id}_mobile_${itemIdx}`}
                          onClick={() => onClassClick(item.cls, item.sch, currentDay)}
                          className={`rounded-xl border p-3.5 cursor-pointer shadow-2xs space-y-2 ${
                            item.isLiveNow
                              ? 'border-emerald-500 bg-emerald-50/50'
                              : isLab
                              ? 'border-blue-200 bg-blue-50/70'
                              : 'border-zinc-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-black text-zinc-950">
                                {item.cls.subjectCode}
                              </span>
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                                {item.cls.section}
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              isLab ? 'bg-blue-100 text-blue-900' : 'bg-zinc-100 text-zinc-700'
                            }`}>
                              {item.sch.type}
                            </span>
                          </div>

                          <div className="text-xs text-zinc-600 font-medium">
                            {item.cls.subjectTitle}
                          </div>

                          <div className="flex items-center justify-between text-xs text-zinc-700 pt-2 border-t border-zinc-200/60 font-mono">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-zinc-500" />
                              <span>{formatTimeSlot(item.sch.startTime)} – {formatTimeSlot(item.sch.endTime)}</span>
                            </div>
                            <span className="font-bold bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                              {item.sch.room || item.cls.room || 'CL'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Calendar Footer Legend */}
        <div className="bg-zinc-50 p-3.5 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-zinc-900 text-[11px] uppercase tracking-wider">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-white border border-zinc-300 shadow-2xs" />
              <span className="text-[11px]">Lecture Class</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-blue-50 border border-blue-300 shadow-2xs" />
              <span className="text-[11px]">Laboratory Class</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px]">Active Class Live Now</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px]">Topic Accomplishment Logged</span>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 font-medium">
            Tip: Click any class card to record lesson accomplishment or inspect syllabus progress.
          </div>
        </div>
      </div>
    </div>
  );
};
