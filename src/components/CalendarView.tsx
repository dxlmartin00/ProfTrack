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
  Printer, 
  CheckCircle2, 
  Clock, 
  ListFilter, 
  Plus, 
  BookOpen, 
  MapPin, 
  CalendarDays, 
  LayoutGrid, 
  Check 
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CalendarViewProps {
  classes: ClassSession[];
  logs: (SessionLog & { classInfo: ClassSession })[];
  profile?: InstructorProfile;
  onClassClick: (cls: ClassSession, sch?: ClassSchedule, targetDate?: Date) => void;
  onSwitchToDaily: () => void;
  onAddClassClick?: () => void;
}

// Timeline Grid start and end hours (07:00 AM to 06:00 PM)
const START_HOUR = 7;
const END_HOUR = 18;
const TOTAL_HOURS = END_HOUR - START_HOUR; // 11 hours
const SLOT_HEIGHT_PX = 44; // Height per 30 minutes in timeline view

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
  onSwitchToDaily,
  onAddClassClick
}) => {
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [calendarMode, setCalendarMode] = useState<'planner' | 'timeline'>('planner');
  const [selectedMobileDayIdx, setSelectedMobileDayIdx] = useState<number>(() => {
    const day = new Date().getDay();
    return day >= 1 && day <= 6 ? day - 1 : 0;
  });
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Lecture' | 'Laboratory'>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const calendarPrintRef = useRef<HTMLDivElement>(null);

  // Live timer for active class tracking
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Navigation
  const nextWeek = () => setCurrentWeekDate(addWeeks(currentWeekDate, 1));
  const prevWeek = () => setCurrentWeekDate(subWeeks(currentWeekDate, 1));
  const goToCurrentWeek = () => {
    const now = new Date();
    setCurrentWeekDate(now);
    const day = now.getDay();
    setSelectedMobileDayIdx(day >= 1 && day <= 6 ? day - 1 : 0);
  };
  const prevMobileDay = () => {
    setSelectedMobileDayIdx((prev) => (prev > 0 ? prev - 1 : weekDays.length - 1));
  };
  const nextMobileDay = () => {
    setSelectedMobileDayIdx((prev) => (prev < weekDays.length - 1 ? prev + 1 : 0));
  };

  // Check if Saturday has any scheduled classes
  const hasSaturdayClasses = useMemo(() => {
    return classes.some(c => c.schedule.some(s => s.dayOfWeek === 6));
  }, [classes]);

  // Academic days for the week: Mon to Fri (or Sat if classes exist)
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeekDate, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(currentWeekDate, { weekStartsOn: 1 }); // Sunday
    const allDays = eachDayOfInterval({ start, end });
    return hasSaturdayClasses ? allDays.slice(0, 6) : allDays.slice(0, 5);
  }, [currentWeekDate, hasSaturdayClasses]);

  // Week range label (e.g. September 7 – 12, 2026)
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length === 0) return '';
    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];
    if (format(first, 'MMM') === format(last, 'MMM')) {
      return `${format(first, 'MMMM d')} – ${format(last, 'd, yyyy')}`;
    }
    return `${format(first, 'MMM d')} – ${format(last, 'MMM d, yyyy')}`;
  }, [weekDays]);

  // Course & Type filtering
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      if (selectedCourseFilter !== 'all' && cls.id !== selectedCourseFilter) {
        return false;
      }
      return true;
    });
  }, [classes, selectedCourseFilter]);

  // Format 24h to 12h time (13:00 -> 1:00 PM)
  const formatTimeSlot = (timeStr: string) => {
    try {
      const parsed = parse(timeStr, 'HH:mm', new Date());
      return format(parsed, 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  // Convert time "HH:mm" to minutes from START_HOUR
  const timeToMinutesFromStart = (timeStr: string): number => {
    try {
      const [h, m] = timeStr.split(':').map(Number);
      return (h - START_HOUR) * 60 + m;
    } catch {
      return 0;
    }
  };

  // Calculate duration in minutes
  const computeDurationMinutes = (startStr: string, endStr: string): number => {
    try {
      const [sh, sm] = startStr.split(':').map(Number);
      const [eh, em] = endStr.split(':').map(Number);
      return Math.max(30, (eh * 60 + em) - (sh * 60 + sm));
    } catch {
      return 60;
    }
  };

  // Map classes to each day with enhanced calendar metadata
  const getDaySchedule = (dayDate: Date) => {
    const dayOfWeek = dayDate.getDay();
    const items: Array<{
      cls: ClassSession;
      sch: ClassSchedule;
      isLogged: boolean;
      isLiveNow: boolean;
      startsInMinutes: number | null;
      topPx: number;
      heightPx: number;
      durationMinutes: number;
      matchingLog?: SessionLog & { classInfo: ClassSession };
      nextTopic?: string;
    }> = [];

    filteredClasses.forEach(cls => {
      cls.schedule.forEach(sch => {
        if (sch.dayOfWeek === dayOfWeek) {
          if (typeFilter !== 'all' && sch.type !== typeFilter) {
            return;
          }

          const matchingLog = logs.find(l => 
            l.classInfo.id === cls.id && 
            isSameDay(new Date(l.date), dayDate)
          );

          let isLiveNow = false;
          let startsInMinutes: number | null = null;

          if (isToday(dayDate)) {
            const todayStr = format(currentTime, 'yyyy-MM-dd');
            const start = parse(`${todayStr} ${sch.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
            const end = parse(`${todayStr} ${sch.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
            isLiveNow = currentTime >= start && currentTime <= end;

            const diffMinutes = Math.round((start.getTime() - currentTime.getTime()) / (1000 * 60));
            if (diffMinutes > 0 && diffMinutes <= 60) {
              startsInMinutes = diffMinutes;
            }
          }

          const loggedCount = logs.filter(l => l.classInfo.id === cls.id).length;
          const nextTopic = cls.masterSyllabus && cls.masterSyllabus.length > loggedCount 
            ? cls.masterSyllabus[loggedCount]
            : undefined;

          const startMinutes = timeToMinutesFromStart(sch.startTime);
          const duration = computeDurationMinutes(sch.startTime, sch.endTime);

          const topPx = (startMinutes / 30) * SLOT_HEIGHT_PX;
          const heightPx = (duration / 30) * SLOT_HEIGHT_PX - 4;

          items.push({
            cls,
            sch,
            isLogged: !!matchingLog,
            isLiveNow,
            startsInMinutes,
            topPx,
            heightPx,
            durationMinutes: duration,
            matchingLog,
            nextTopic
          });
        }
      });
    });

    return items.sort((a, b) => a.sch.startTime.localeCompare(b.sch.startTime));
  };

  // Generate hour marks for timeline mode
  const timeSlots = useMemo(() => {
    const slots: Array<{ label: string; hour: number; isHalf: boolean }> = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h >= 12 ? 'PM' : 'AM';
      slots.push({ label: `${displayHour} ${ampm}`, hour: h, isHalf: false });
      if (h < END_HOUR) {
        slots.push({ label: `${displayHour}:30`, hour: h, isHalf: true });
      }
    }
    return slots;
  }, []);

  // Overall weekly metrics
  const weeklyMetrics = useMemo(() => {
    let totalClasses = 0;
    let totalHours = 0;
    let loggedSessions = 0;

    weekDays.forEach(day => {
      const schedule = getDaySchedule(day);
      totalClasses += schedule.length;
      schedule.forEach(item => {
        totalHours += item.durationMinutes / 60;
        if (item.isLogged) loggedSessions++;
      });
    });

    const completionRate = totalClasses > 0 ? Math.round((loggedSessions / totalClasses) * 100) : 0;
    return { totalClasses, totalHours, loggedSessions, completionRate };
  }, [weekDays, filteredClasses, logs, typeFilter]);

  // Current time position indicator on the timeline grid
  const nowIndicatorTopPx = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const totalMinutesFromStart = (hours - START_HOUR) * 60 + minutes;
    const maxMinutes = (END_HOUR - START_HOUR) * 60;
    if (totalMinutesFromStart < 0 || totalMinutesFromStart > maxMinutes) {
      return null;
    }
    return (totalMinutesFromStart / 30) * SLOT_HEIGHT_PX;
  }, [currentTime]);

  // Export PDF
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

      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, Math.min(pdfHeight, 190));
      pdf.save(`ProfTrack_Weekly_Schedule_${format(currentWeekDate, 'yyyy_MM_dd')}.pdf`);
    } catch (err) {
      console.error('Failed to export calendar PDF:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const totalGridHeightPx = TOTAL_HOURS * (SLOT_HEIGHT_PX * 2);

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-4 sm:py-6 space-y-4 font-sans">
      
      {/* 1. Main Calendar Header Toolbar */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 sm:p-5 shadow-sm transition-colors space-y-4">
        
        {/* Top Row: Month, Navigation, and Mode Switcher */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
          
          {/* Month & Week Title with Navigation Controls */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={prevWeek}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer shadow-2xs"
                title="Previous Week"
                aria-label="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button
                type="button"
                onClick={goToCurrentWeek}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-colors shadow-2xs cursor-pointer"
                title="Jump to current week"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Today</span>
              </button>

              <button
                type="button"
                onClick={nextWeek}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer shadow-2xs"
                title="Next Week"
                aria-label="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-black text-zinc-950 dark:text-zinc-100 tracking-tight">
                  {format(currentWeekDate, 'MMMM yyyy')}
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  Week {format(currentWeekDate, 'w')}
                </span>
              </div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-300">
                {weekRangeLabel}
              </p>
            </div>
          </div>

          {/* Calendar Presentation Switcher & Quick Filters */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between lg:justify-end">
            
            {/* Switch to Daily Timetable */}
            <button
              type="button"
              onClick={onSwitchToDaily}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Switch back to Daily Timetable"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Daily Timetable</span>
            </button>

            {/* View Mode Switcher: Planner Board vs Timeline Grid */}
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0">
              <button
                type="button"
                onClick={() => setCalendarMode('planner')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  calendarMode === 'planner'
                    ? 'bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
                title="Weekly Planner Calendar View"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Weekly Planner</span>
              </button>

              <button
                type="button"
                onClick={() => setCalendarMode('timeline')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  calendarMode === 'timeline'
                    ? 'bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
                title="Continuous Hourly Timeline Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Hourly Timeline</span>
              </button>
            </div>

            {/* Course Filter Dropdown */}
            <div className="relative shrink-0">
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="appearance-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-3 pr-8 py-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-white cursor-pointer"
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

            {/* Type Filter (All / Lecture / Lab) */}
            <div className="hidden sm:inline-flex p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                  typeFilter === 'all'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('Lecture')}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                  typeFilter === 'Lecture'
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Lec
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('Laboratory')}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                  typeFilter === 'Laboratory'
                    ? 'bg-teal-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Lab
              </button>
            </div>

            {/* Export PDF Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-950 dark:border-zinc-700 bg-zinc-950 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              title="Download printable calendar PDF"
            >
              {isExporting ? (
                <span className="animate-spin text-xs">⏳</span>
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Export PDF</span>
            </button>

            {/* Quick Add Course */}
            {onAddClassClick && (
              <button
                type="button"
                onClick={onAddClassClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
                title="Add a new class or course schedule"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span className="hidden sm:inline">Add Course</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Interactive Week-at-a-Glance Strip */}
        <div className="grid grid-cols-5 md:grid-cols-5 lg:grid-cols-6 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          {weekDays.map((dayDate, idx) => {
            const isCurrentDay = isToday(dayDate);
            const isSelected = selectedMobileDayIdx === idx;
            const schedule = getDaySchedule(dayDate);
            const hasOngoing = schedule.some(s => s.isLiveNow);

            return (
              <button
                key={dayDate.toISOString()}
                type="button"
                onClick={() => setSelectedMobileDayIdx(idx)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrentDay
                    ? 'border-zinc-950 dark:border-white bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-sm'
                    : isSelected
                    ? 'border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                    : 'border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-850/40 hover:bg-zinc-100/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isCurrentDay ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-500 dark:text-zinc-400'
                  }`}>
                    {format(dayDate, 'EEE')}
                  </span>
                  {hasOngoing && (
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Class in session now" />
                  )}
                </div>

                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base sm:text-lg font-black tracking-tight">
                    {format(dayDate, 'd')}
                  </span>
                  <span className={`text-[10px] font-medium truncate ${
                    isCurrentDay ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-300'
                  }`}>
                    {schedule.length} {schedule.length === 1 ? 'class' : 'classes'}
                  </span>
                </div>

                {/* Event color dots indicator */}
                <div className="flex items-center gap-1 mt-1.5 h-1.5">
                  {schedule.slice(0, 4).map((item, dotIdx) => (
                    <span 
                      key={dotIdx}
                      className={`h-1.5 w-1.5 rounded-full ${
                        item.isLogged 
                          ? 'bg-emerald-500' 
                          : item.sch.type === 'Laboratory' 
                          ? 'bg-teal-500' 
                          : 'bg-blue-500'
                      }`}
                    />
                  ))}
                  {schedule.length > 4 && (
                    <span className="text-[8px] leading-none opacity-70">+{schedule.length - 4}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Faculty Schedule Insights Banner */}
      <div className="bg-zinc-50 dark:bg-zinc-900/70 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-300 block leading-tight">Weekly Load</span>
              <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{weeklyMetrics.totalClasses} Sessions ({weeklyMetrics.totalHours} hrs)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-300 block leading-tight">Progress</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                {weeklyMetrics.loggedSessions} of {weeklyMetrics.totalClasses} Logged ({weeklyMetrics.completionRate}%)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-600 dark:text-zinc-300">
          {profile?.fullName && (
            <span className="hidden lg:inline-block font-semibold">
              {profile.fullName} • {profile.position || 'Faculty'}
            </span>
          )}
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-1" /> Lecture
          <span className="inline-block h-2 w-2 rounded-full bg-teal-500 ml-2 mr-1" /> Laboratory
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 ml-2 mr-1" /> Accomplished
        </div>
      </div>

      {/* 4. Main Calendar Surface (Planner Columns or Timeline Grid) */}
      <div 
        ref={calendarPrintRef} 
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors"
      >
        {calendarMode === 'planner' ? (
          /* ========================================================= */
          /* MODE A: WEEKLY PLANNER BOARD (Modern Weekly Calendar)     */
          /* ========================================================= */
          <div>
            {/* Desktop 5/6 Column Grid */}
            <div className="hidden md:grid grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 divide-x divide-zinc-200/80 dark:divide-zinc-800 min-h-[600px]">
              {weekDays.map((dayDate) => {
                const isCurrentDay = isToday(dayDate);
                const schedule = getDaySchedule(dayDate);
                const holidayName = PHILIPPINE_HOLIDAYS[format(dayDate, 'MM-dd')];
                const totalDayHours = schedule.reduce((acc, s) => acc + s.durationMinutes / 60, 0);

                return (
                  <div 
                    key={dayDate.toISOString()}
                    className={`flex flex-col flex-1 transition-colors ${
                      isCurrentDay 
                        ? 'bg-zinc-50/50 dark:bg-zinc-900/40' 
                        : 'bg-white dark:bg-zinc-900'
                    }`}
                  >
                    {/* Column Header */}
                    <div className={`p-3.5 border-b border-zinc-200/80 dark:border-zinc-800 transition-colors ${
                      isCurrentDay 
                        ? 'bg-zinc-100/90 dark:bg-zinc-800/90' 
                        : 'bg-zinc-50/70 dark:bg-zinc-900/80'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-black uppercase tracking-wider ${
                          isCurrentDay ? 'text-zinc-950 dark:text-white' : 'text-zinc-500 dark:text-zinc-300'
                        }`}>
                          {format(dayDate, 'EEEE')}
                        </span>
                        {isCurrentDay && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Today
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between mt-1">
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center justify-center h-7 w-7 rounded-full text-sm font-black ${
                            isCurrentDay 
                              ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950' 
                              : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                          }`}>
                            {format(dayDate, 'd')}
                          </span>
                          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                            {format(dayDate, 'MMM')}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-300">
                          {schedule.length > 0 ? `${totalDayHours}h load` : 'No classes'}
                        </span>
                      </div>

                      {holidayName && (
                        <div className="mt-2 text-[10px] font-bold text-rose-800 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/40 px-2 py-1 rounded-md truncate">
                          🎉 {holidayName}
                        </div>
                      )}
                    </div>

                    {/* Column Content: Chronological Calendar Event Cards */}
                    <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto">
                      {schedule.length === 0 ? (
                        <div className="h-44 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-300">
                          <BookOpen className="w-5 h-5 mb-1.5 opacity-40" />
                          <span className="text-xs font-medium">Free Academic Day</span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-300 mt-0.5">Prep & Consultation</span>
                          {onAddClassClick && (
                            <button
                              type="button"
                              onClick={onAddClassClick}
                              className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Session</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        schedule.map((item, itemIdx) => {
                          const isLab = item.sch.type === 'Laboratory';

                          // Modern Apple/Google calendar card styling with color accent border
                          const accentBorder = item.isLogged
                            ? 'border-l-4 border-l-emerald-500 bg-emerald-50/40 dark:bg-[#12281c] border-emerald-200/80 dark:border-[#1e4632]'
                            : isLab
                            ? 'border-l-4 border-l-teal-500 bg-teal-50/40 dark:bg-[#11292b] border-teal-200/80 dark:border-[#1c4347]'
                            : 'border-l-4 border-l-sky-500 bg-sky-50/40 dark:bg-[#142337] border-sky-200/80 dark:border-[#1f3756]';

                          return (
                            <div
                              key={`${item.cls.id}_planner_${itemIdx}`}
                              onClick={() => onClassClick(item.cls, item.sch, dayDate)}
                              className={`group rounded-xl border p-3 text-left transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] ${accentBorder}`}
                              title={`${item.cls.subjectCode} (${item.cls.section})\n${item.cls.subjectTitle}\nTime: ${formatTimeSlot(item.sch.startTime)} – ${formatTimeSlot(item.sch.endTime)}\nRoom: ${item.sch.room || item.cls.room}\nClick to log topics or view syllabus.`}
                            >
                              {/* Card Header: Time Range & Type Chip */}
                              <div className="flex items-center justify-between gap-1 text-[11px]">
                                <div className="flex items-center gap-1 font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                  <Clock className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-300 shrink-0" />
                                  <span>{formatTimeSlot(item.sch.startTime)}</span>
                                </div>
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  isLab
                                    ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200'
                                    : 'bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200'
                                }`}>
                                  {item.sch.type === 'Laboratory' ? 'Lab' : 'Lec'}
                                </span>
                              </div>

                              {/* Card Subject Code & Section Badge */}
                              <div className="mt-2 flex items-center justify-between gap-1.5">
                                <span className="text-sm font-black text-zinc-950 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                  {item.cls.subjectCode}
                                </span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-black/40 text-zinc-800 dark:text-zinc-200 shrink-0">
                                  {item.cls.section}
                                </span>
                              </div>

                              {/* Subject Title */}
                              <div className="text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate mt-0.5">
                                {item.cls.subjectTitle}
                              </div>

                              {/* Location Room Badge */}
                              <div className="flex items-center gap-1 mt-2 text-[11px] text-zinc-600 dark:text-zinc-300">
                                <MapPin className="w-3 h-3 text-zinc-500 dark:text-zinc-300 shrink-0" />
                                <span className="font-semibold">{item.sch.room || item.cls.room || 'CL Room'}</span>
                              </div>

                              {/* Next Topic Chip Preview */}
                              {item.nextTopic && (
                                <div className="mt-2 pt-2 border-t border-zinc-200/60 dark:border-white/10 text-[10px] text-zinc-600 dark:text-zinc-300 flex items-start gap-1">
                                  <BookOpen className="w-3 h-3 text-zinc-500 dark:text-zinc-300 shrink-0 mt-0.5" />
                                  <span className="truncate leading-tight font-medium">
                                    {item.nextTopic}
                                  </span>
                                </div>
                              )}

                              {/* Status Pills */}
                              <div className="mt-2.5 flex items-center justify-between gap-1">
                                {item.isLiveNow ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100/90 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full animate-pulse">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Active Now
                                  </span>
                                ) : item.startsInMinutes !== null ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-950/60 px-2 py-0.5 rounded-full animate-pulse">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                    Starts in {item.startsInMinutes}m
                                  </span>
                                ) : item.isLogged ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
                                    <Check className="w-3 h-3" />
                                    Logged
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                                    Log topics →
                                  </span>
                                )}

                                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-300">
                                  {item.durationMinutes}m
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

            {/* Mobile View: Tab Day Switcher + Rich Cards */}
            <div className="md:hidden">
              {(() => {
                const currentDay = weekDays[selectedMobileDayIdx] || weekDays[0];
                const holidayName = PHILIPPINE_HOLIDAYS[format(currentDay, 'MM-dd')];
                const schedule = getDaySchedule(currentDay);
                const isCurrentDay = isToday(currentDay);

                return (
                  <div className="p-3.5 space-y-3">
                    {/* Mobile Day Header Banner */}
                    <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      isCurrentDay 
                        ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white' 
                        : holidayName 
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200' 
                        : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
                    }`}>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                          {format(currentDay, 'EEEE')}
                        </span>
                        <h3 className="text-base font-black">
                          {format(currentDay, 'MMMM d, yyyy')}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold">
                          {schedule.length} {schedule.length === 1 ? 'class' : 'classes'}
                        </span>
                        {isCurrentDay && (
                          <div className="text-[10px] font-bold text-emerald-400 dark:text-emerald-600 uppercase tracking-wider mt-0.5">
                            • Today
                          </div>
                        )}
                      </div>
                    </div>

                    {holidayName && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-900 dark:text-rose-200">
                        🎉 Holiday: {holidayName}
                      </div>
                    )}

                    {/* Mobile Class Cards */}
                    <div className="space-y-2.5">
                      {schedule.length === 0 ? (
                        <div className="py-12 text-center text-zinc-500 dark:text-zinc-300 text-xs font-semibold">
                          No classes scheduled for {format(currentDay, 'EEEE')}.
                        </div>
                      ) : (
                        schedule.map((item, itemIdx) => {
                          const isLab = item.sch.type === 'Laboratory';
                          return (
                            <div
                              key={`${item.cls.id}_mobile_planner_${itemIdx}`}
                              onClick={() => onClassClick(item.cls, item.sch, currentDay)}
                              className={`rounded-xl border p-3.5 cursor-pointer shadow-2xs space-y-2.5 transition-all active:scale-[0.98] ${
                                item.isLogged
                                  ? 'border-l-4 border-l-emerald-500 bg-emerald-50/40 dark:bg-[#12281c] border-emerald-200 dark:border-[#1e4632]'
                                  : isLab
                                  ? 'border-l-4 border-l-teal-500 bg-teal-50/40 dark:bg-[#11292b] border-teal-200 dark:border-[#1c4347]'
                                  : 'border-l-4 border-l-sky-500 bg-sky-50/40 dark:bg-[#142337] border-sky-200 dark:border-[#1f3756]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-black text-zinc-950 dark:text-zinc-100">
                                    {item.cls.subjectCode}
                                  </span>
                                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-black/40 text-zinc-800 dark:text-zinc-200">
                                    {item.cls.section}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                  isLab 
                                    ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200' 
                                    : 'bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200'
                                }`}>
                                  {item.sch.type}
                                </span>
                              </div>

                              <div className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                                {item.cls.subjectTitle}
                              </div>

                              {item.nextTopic && (
                                <div className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium flex items-center gap-1.5 pt-1">
                                  <BookOpen className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-300 shrink-0" />
                                  <span className="truncate">{item.nextTopic}</span>
                                </div>
                              )}

                              <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 pt-2 border-t border-zinc-200/60 dark:border-white/10 font-mono">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-300" />
                                  <span>{formatTimeSlot(item.sch.startTime)} – {formatTimeSlot(item.sch.endTime)}</span>
                                </div>
                                <span className="font-bold bg-zinc-100 dark:bg-black/30 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white">
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
          </div>
        ) : (
          /* ========================================================= */
          /* MODE B: CONTINUOUS HOURLY TIMELINE (Responsive Grid)      */
          /* ========================================================= */
          <div>
            {/* Desktop Mode B: Multi-day Continuous Timeline Grid */}
            <div className="hidden md:block overflow-x-auto">
              <div className="min-w-[750px]">
                {/* Day Column Headers */}
                <div className="grid grid-cols-[70px_repeat(5,1fr)] lg:grid-cols-[80px_repeat(5,1fr)] border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-[#161820] divide-x divide-zinc-200 dark:divide-zinc-800">
                  <div className="p-3 text-center text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-300 flex items-center justify-center">
                    Time
                  </div>

                  {weekDays.map((dayDate) => {
                    const isCurrentDay = isToday(dayDate);
                    const holidayName = PHILIPPINE_HOLIDAYS[format(dayDate, 'MM-dd')];
                    const schedule = getDaySchedule(dayDate);

                    return (
                      <div 
                        key={dayDate.toISOString()} 
                        className={`p-3 text-center transition-all ${
                          isCurrentDay
                            ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                            : holidayName
                            ? 'bg-rose-50/80 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200'
                            : 'text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <div className={`text-[10px] font-black uppercase tracking-wider ${
                          isCurrentDay ? 'text-zinc-200 dark:text-zinc-700' : 'text-zinc-500 dark:text-zinc-300'
                        }`}>
                          {format(dayDate, 'EEEE')}
                        </div>
                        <div className="text-base font-black tracking-tight mt-0.5 flex items-center justify-center gap-1.5">
                          <span>{format(dayDate, 'MMM d')}</span>
                          {isCurrentDay && (
                            <span className="h-2 w-2 rounded-full bg-emerald-400 dark:bg-emerald-600 animate-pulse" />
                          )}
                        </div>
                        <div className={`text-[10px] font-medium mt-0.5 ${
                          isCurrentDay ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-300'
                        }`}>
                          {schedule.length} {schedule.length === 1 ? 'class' : 'classes'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time-Grid Body */}
                <div 
                  className="relative grid grid-cols-[70px_repeat(5,1fr)] lg:grid-cols-[80px_repeat(5,1fr)] divide-x divide-zinc-200 dark:divide-zinc-800" 
                  style={{ height: `${totalGridHeightPx}px` }}
                >
                  {/* Left Y-Axis Time Labels */}
                  <div className="relative bg-zinc-50/70 dark:bg-[#111318] select-none">
                    {timeSlots.filter(s => !s.isHalf).map((slot, sIdx) => (
                      <div 
                        key={sIdx} 
                        className="absolute w-full px-2 text-right text-[10px] font-mono leading-none font-bold text-zinc-600 dark:text-zinc-300 -translate-y-1.5"
                        style={{ top: `${sIdx * (SLOT_HEIGHT_PX * 2)}px` }}
                      >
                        {slot.label}
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {weekDays.map((dayDate) => {
                    const schedule = getDaySchedule(dayDate);
                    const isCurrentDay = isToday(dayDate);

                    return (
                      <div 
                        key={dayDate.toISOString()} 
                        className={`relative transition-colors ${
                          isCurrentDay ? 'bg-zinc-50/40 dark:bg-[#141720]' : 'bg-white dark:bg-[#0f1116]'
                        }`}
                        style={{ height: `${totalGridHeightPx}px` }}
                      >
                        {/* Hour Lines */}
                        {timeSlots.map((slot, sIdx) => (
                          <div
                            key={sIdx}
                            className={`absolute left-0 right-0 border-t pointer-events-none ${
                              slot.isHalf 
                                ? 'border-zinc-100 dark:border-zinc-800/40 border-dashed' 
                                : 'border-zinc-200 dark:border-zinc-800'
                            }`}
                            style={{ top: `${sIdx * SLOT_HEIGHT_PX}px` }}
                          />
                        ))}

                        {/* Real-time Current Time Line for Today */}
                        {isCurrentDay && nowIndicatorTopPx !== null && (
                          <div 
                            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                            style={{ top: `${nowIndicatorTopPx}px` }}
                          >
                            <div className="w-2.5 h-2.5 -ml-1 rounded-full bg-rose-500 shadow-sm ring-2 ring-white dark:ring-zinc-900 animate-ping absolute" />
                            <div className="w-2 h-2 -ml-1 rounded-full bg-rose-500 shadow-sm ring-2 ring-white dark:ring-zinc-900 relative z-10" />
                            <div className="flex-1 h-[2px] bg-rose-500 shadow-xs" />
                            <span className="text-[9px] font-mono font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded shadow-xs ml-1">
                              {format(currentTime, 'h:mm a')}
                            </span>
                          </div>
                        )}

                        {/* Scheduled Class Blocks with Left Accent Border */}
                        {schedule.map((item, itemIdx) => {
                          const isLab = item.sch.type === 'Laboratory';

                          const cardColors = item.isLogged
                            ? 'border-l-4 border-l-emerald-500 bg-emerald-50/95 dark:bg-[#143224] border-emerald-200/90 dark:border-[#1f4c37] text-emerald-950 dark:text-[#bbf7d0]'
                            : isLab
                            ? 'border-l-4 border-l-teal-500 bg-teal-50/95 dark:bg-[#133235] border-teal-200/90 dark:border-[#1e4d52] text-teal-950 dark:text-[#a7f3d0]'
                            : 'border-l-4 border-l-sky-500 bg-sky-50/95 dark:bg-[#17273d] border-sky-200/90 dark:border-[#223d60] text-sky-950 dark:text-[#bae6fd]';

                          return (
                            <div
                              key={`${item.cls.id}_timeline_${itemIdx}`}
                              onClick={() => onClassClick(item.cls, item.sch, dayDate)}
                              style={{
                                top: `${item.topPx}px`,
                                height: `${item.heightPx}px`,
                              }}
                              className={`absolute left-1 right-1 rounded-xl border p-2 text-left cursor-pointer transition-all shadow-2xs hover:shadow-md hover:scale-[1.01] active:scale-[0.98] flex flex-col justify-between overflow-hidden z-10 ${cardColors}`}
                              title={`${item.cls.subjectCode} (${item.cls.section}) - ${item.cls.subjectTitle}\nTime: ${formatTimeSlot(item.sch.startTime)} – ${formatTimeSlot(item.sch.endTime)}\nRoom: ${item.sch.room || item.cls.room}\nClick to log topics or view syllabus.`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 leading-tight">
                                  <span className="text-xs font-black truncate">
                                    {item.cls.subjectCode}
                                  </span>
                                  <span className="text-[9px] font-bold px-1 rounded bg-black/10 dark:bg-black/30 shrink-0">
                                    {item.cls.section}
                                  </span>
                                </div>
                                <div className="text-[10px] opacity-85 truncate mt-0.5">
                                  {item.cls.subjectTitle}
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] font-mono leading-none pt-1">
                                <span>{formatTimeSlot(item.sch.startTime)}</span>
                                <span className="font-bold">{item.sch.room || item.cls.room || 'CL'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile Mode B: Dedicated Full-Width Single Day Hourly Timeline */}
            <div className="md:hidden">
              {(() => {
                const currentDay = weekDays[selectedMobileDayIdx] || weekDays[0];
                const isCurrentDay = isToday(currentDay);
                const holidayName = PHILIPPINE_HOLIDAYS[format(currentDay, 'MM-dd')];
                const schedule = getDaySchedule(currentDay);

                return (
                  <div>
                    {/* Mobile Day Navigation Banner */}
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-850/60 border-b border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={prevMobileDay}
                          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors shadow-2xs shrink-0 cursor-pointer"
                          title="Previous Day"
                          aria-label="Previous Day"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="text-center flex-1 min-w-0">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                              {format(currentDay, 'EEEE')}
                            </span>
                            {isCurrentDay && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Today
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-300 font-medium truncate mt-0.5">
                            {format(currentDay, 'MMMM d, yyyy')} • {schedule.length} {schedule.length === 1 ? 'class' : 'classes'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={nextMobileDay}
                          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors shadow-2xs shrink-0 cursor-pointer"
                          title="Next Day"
                          aria-label="Next Day"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Day Pill Buttons */}
                      <div className="grid grid-cols-5 gap-1.5 mt-2.5">
                        {weekDays.slice(0, 5).map((d, i) => {
                          const isSel = selectedMobileDayIdx === i;
                          const isTd = isToday(d);
                          const count = getDaySchedule(d).length;
                          return (
                            <button
                              key={d.toISOString()}
                              type="button"
                              onClick={() => setSelectedMobileDayIdx(i)}
                              className={`py-1.5 px-1 rounded-xl text-center transition-all cursor-pointer border ${
                                isSel
                                  ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs'
                                  : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700/80 hover:bg-zinc-100/60 dark:hover:bg-zinc-750'
                              }`}
                            >
                              <div className={`text-[9px] uppercase font-bold ${
                                isSel ? 'opacity-80' : isTd ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-zinc-500 dark:text-zinc-300'
                              }`}>
                                {format(d, 'EEE')}
                              </div>
                              <div className="text-xs font-black">
                                {format(d, 'd')}
                              </div>
                              <div className={`text-[9px] font-medium leading-none mt-0.5 ${
                                isSel ? 'opacity-80' : 'text-zinc-400 dark:text-zinc-400'
                              }`}>
                                {count} {count === 1 ? 'cls' : 'cls'}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {holidayName && (
                        <div className="mt-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                          <span className="text-sm">🎉</span>
                          <span className="truncate">Holiday: {holidayName}</span>
                        </div>
                      )}
                    </div>

                    {/* Single-Day Hourly Timeline Body */}
                    <div 
                      className="relative grid grid-cols-[55px_1fr] divide-x divide-zinc-200 dark:divide-zinc-800"
                      style={{ height: `${totalGridHeightPx}px` }}
                    >
                      {/* Left Y-Axis Time Labels */}
                      <div className="relative bg-zinc-50/70 dark:bg-[#111318] select-none">
                        {timeSlots.filter(s => !s.isHalf).map((slot, sIdx) => (
                          <div 
                            key={sIdx} 
                            className="absolute w-full px-2 text-right text-[10px] font-mono leading-none font-bold text-zinc-600 dark:text-zinc-300 -translate-y-1.5"
                            style={{ top: `${sIdx * (SLOT_HEIGHT_PX * 2)}px` }}
                          >
                            {slot.label}
                          </div>
                        ))}
                      </div>

                      {/* Full-Width Day Column */}
                      <div 
                        className={`relative transition-colors ${
                          isCurrentDay ? 'bg-zinc-50/40 dark:bg-[#141720]' : 'bg-white dark:bg-[#0f1116]'
                        }`}
                        style={{ height: `${totalGridHeightPx}px` }}
                      >
                        {/* Hour Lines */}
                        {timeSlots.map((slot, sIdx) => (
                          <div
                            key={sIdx}
                            className={`absolute left-0 right-0 border-t pointer-events-none ${
                              slot.isHalf 
                                ? 'border-zinc-100 dark:border-zinc-800/40 border-dashed' 
                                : 'border-zinc-200 dark:border-zinc-800'
                            }`}
                            style={{ top: `${sIdx * SLOT_HEIGHT_PX}px` }}
                          />
                        ))}

                        {/* Real-time Current Time Line for Today */}
                        {isCurrentDay && nowIndicatorTopPx !== null && (
                          <div 
                            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                            style={{ top: `${nowIndicatorTopPx}px` }}
                          >
                            <div className="w-2.5 h-2.5 -ml-1 rounded-full bg-rose-500 shadow-sm ring-2 ring-white dark:ring-zinc-900 animate-ping absolute" />
                            <div className="w-2 h-2 -ml-1 rounded-full bg-rose-500 shadow-sm ring-2 ring-white dark:ring-zinc-900 relative z-10" />
                            <div className="flex-1 h-[2px] bg-rose-500 shadow-xs" />
                            <span className="text-[9px] font-mono font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded shadow-xs ml-1">
                              {format(currentTime, 'h:mm a')}
                            </span>
                          </div>
                        )}

                        {/* Scheduled Class Cards (Spacious Full Width) */}
                        {schedule.map((item, itemIdx) => {
                          const isLab = item.sch.type === 'Laboratory';

                          const cardColors = item.isLogged
                            ? 'border-l-4 border-l-emerald-500 bg-emerald-50/95 dark:bg-[#143224] border-emerald-200/90 dark:border-[#1f4c37] text-emerald-950 dark:text-[#bbf7d0]'
                            : isLab
                            ? 'border-l-4 border-l-teal-500 bg-teal-50/95 dark:bg-[#133235] border-teal-200/90 dark:border-[#1e4d52] text-teal-950 dark:text-[#a7f3d0]'
                            : 'border-l-4 border-l-sky-500 bg-sky-50/95 dark:bg-[#17273d] border-sky-200/90 dark:border-[#223d60] text-sky-950 dark:text-[#bae6fd]';

                          return (
                            <div
                              key={`${item.cls.id}_mobile_timeline_${itemIdx}`}
                              onClick={() => onClassClick(item.cls, item.sch, currentDay)}
                              style={{
                                top: `${item.topPx}px`,
                                height: `${item.heightPx}px`,
                              }}
                              className={`absolute left-2 right-2 rounded-xl border p-2.5 text-left cursor-pointer transition-all shadow-xs hover:shadow-md active:scale-[0.99] flex flex-col justify-between overflow-hidden z-10 ${cardColors}`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center justify-between gap-1.5 leading-tight">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="text-xs font-black truncate">
                                      {item.cls.subjectCode}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/10 dark:bg-black/30 shrink-0">
                                      {item.cls.section}
                                    </span>
                                  </div>

                                  {item.isLogged ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 shrink-0">
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                      Done
                                    </span>
                                  ) : isLab ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-200/80 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 shrink-0">
                                      Lab
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-200/80 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 shrink-0">
                                      Lecture
                                    </span>
                                  )}
                                </div>

                                {item.heightPx >= 50 && (
                                  <div className="text-[11px] font-medium opacity-90 truncate mt-1">
                                    {item.cls.subjectTitle}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[10px] font-mono leading-none pt-1 border-t border-black/10 dark:border-white/10 mt-1">
                                <div className="flex items-center gap-1 font-semibold truncate">
                                  <Clock className="w-3 h-3 shrink-0 opacity-70" />
                                  <span>{formatTimeSlot(item.sch.startTime)} – {formatTimeSlot(item.sch.endTime)}</span>
                                </div>
                                <div className="flex items-center gap-1 font-bold shrink-0 ml-1">
                                  <MapPin className="w-3 h-3 shrink-0 opacity-70" />
                                  <span>{item.sch.room || item.cls.room || 'CL'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
