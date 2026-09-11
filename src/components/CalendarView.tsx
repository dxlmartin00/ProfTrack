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
  ListFilter,
  Plus,
  BookOpen
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

// Grid start and end hours (07:00 AM to 06:00 PM)
const START_HOUR = 7;
const END_HOUR = 18;
const TOTAL_HOURS = END_HOUR - START_HOUR; // 11 hours
const SLOT_HEIGHT_PX = 42; // Height per 30 minutes
const HOUR_HEIGHT_PX = SLOT_HEIGHT_PX * 2; // 84px per hour

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
  const [selectedMobileDayIdx, setSelectedMobileDayIdx] = useState<number>(() => {
    const day = new Date().getDay();
    return day >= 1 && day <= 6 ? day - 1 : 0;
  });
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
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

  // Check if Saturday has any scheduled classes
  const hasSaturdayClasses = useMemo(() => {
    return classes.some(c => c.schedule.some(s => s.dayOfWeek === 6));
  }, [classes]);

  // Compute academic days for the week: Mon to Fri (or Sat if classes exist)
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

  // Course filtering
  const filteredClasses = useMemo(() => {
    if (selectedCourseFilter === 'all') return classes;
    return classes.filter(c => c.id === selectedCourseFilter);
  }, [classes, selectedCourseFilter]);

  // Format 24h to 12h time (08:00 -> 8:00 AM)
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

  // Map classes to each day
  const getDaySchedule = (dayDate: Date) => {
    const dayOfWeek = dayDate.getDay();
    const items: Array<{
      cls: ClassSession;
      sch: ClassSchedule;
      isLogged: boolean;
      isLiveNow: boolean;
      topPx: number;
      heightPx: number;
      durationMinutes: number;
      matchingLog?: SessionLog & { classInfo: ClassSession };
      nextTopic?: string;
    }> = [];

    filteredClasses.forEach(cls => {
      cls.schedule.forEach(sch => {
        if (sch.dayOfWeek === dayOfWeek) {
          const matchingLog = logs.find(l => 
            l.classInfo.id === cls.id && 
            isSameDay(new Date(l.date), dayDate)
          );

          let isLiveNow = false;
          if (isToday(dayDate)) {
            const todayStr = format(currentTime, 'yyyy-MM-dd');
            const start = parse(`${todayStr} ${sch.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
            const end = parse(`${todayStr} ${sch.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
            isLiveNow = currentTime >= start && currentTime <= end;
          }

          const loggedCount = logs.filter(l => l.classInfo.id === cls.id).length;
          const nextTopic = cls.masterSyllabus && cls.masterSyllabus.length > loggedCount 
            ? cls.masterSyllabus[loggedCount]
            : undefined;

          const startMinutes = timeToMinutesFromStart(sch.startTime);
          const duration = computeDurationMinutes(sch.startTime, sch.endTime);

          const topPx = (startMinutes / 30) * SLOT_HEIGHT_PX;
          const heightPx = (duration / 30) * SLOT_HEIGHT_PX - 4; // slight gap

          items.push({
            cls,
            sch,
            isLogged: !!matchingLog,
            isLiveNow,
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

  // Generate 30-minute time intervals for Y-axis
  const timeSlots = useMemo(() => {
    const slots: Array<{ label: string; hour: number; isHalf: boolean }> = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h >= 12 ? 'PM' : 'AM';
      slots.push({ label: `${displayHour}:00 ${ampm}`, hour: h, isHalf: false });
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

    return { totalClasses, totalHours, loggedSessions };
  }, [weekDays, filteredClasses, logs]);

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

      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`ProfTrack_Weekly_Schedule_${format(currentWeekDate, 'yyyy_MM_dd')}.pdf`);
    } catch (err) {
      console.error('Failed to export calendar PDF:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const totalGridHeightPx = TOTAL_HOURS * HOUR_HEIGHT_PX;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4">
      {/* Top Controls Toolbar */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 transition-colors">
        {/* Left: View Switcher & Current Week */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={onSwitchToDaily}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Daily Timetable</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-2xs transition-all cursor-default"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />
              <span>Weekly Time-Grid</span>
            </button>
          </div>

          <button
            type="button"
            onClick={goToCurrentWeek}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-colors shadow-2xs cursor-pointer"
            title="Jump to current week"
          >
            This Week
          </button>
        </div>

        {/* Center: Week Navigator (Matches Sample Image header) */}
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={prevWeek}
            className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer shadow-2xs"
            aria-label="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <h2 className="text-sm sm:text-base font-black text-zinc-950 dark:text-zinc-100 tracking-tight min-w-[210px] text-center">
            {weekRangeLabel}
          </h2>

          <button
            type="button"
            onClick={nextWeek}
            className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer shadow-2xs"
            aria-label="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Course Filter, Add Course & PDF */}
        <div className="flex items-center gap-2 justify-end flex-wrap">
          {onAddClassClick && (
            <button
              type="button"
              onClick={onAddClassClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-colors shadow-2xs cursor-pointer"
              title="Add a new course"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
              <span className="hidden sm:inline">Add Course</span>
            </button>
          )}

          {/* Course filter */}
          <div className="relative">
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

          {/* Export PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-950 dark:border-zinc-700 bg-zinc-950 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Download printable PDF weekly time grid"
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
      <div className="bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800 px-4 py-2.5 flex items-center justify-between gap-4 text-xs flex-wrap transition-colors">
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">Weekly Total:</span>
            <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{weeklyMetrics.totalClasses} Sessions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">Teaching Hours:</span>
            <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{weeklyMetrics.totalHours} hrs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">Accomplished:</span>
            <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{weeklyMetrics.loggedSessions} logged</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 hidden md:block">
          {profile?.fullName || 'Faculty Schedule'} • {profile?.position || 'Instructor'}
        </div>
      </div>

      {/* Mobile Day Selector Tabs */}
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
                  ? 'bg-zinc-950 dark:bg-white border-zinc-950 dark:border-white text-white dark:text-zinc-950 shadow-sm'
                  : isCurrentDay
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
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

      {/* Hourly Time-Grid Calendar Container (Matches Sample Image Layout) */}
      <div 
        ref={calendarPrintRef}
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors"
      >
        {/* Desktop & Tablet Hourly Time-Grid */}
        <div className="hidden md:block overflow-x-auto">
          {/* Day Headers Bar */}
          <div className="grid grid-cols-[70px_repeat(5,1fr)] lg:grid-cols-[80px_repeat(5,1fr)] border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-950 divide-x divide-zinc-200 dark:divide-zinc-800">
            {/* Time label corner */}
            <div className="p-2.5 text-center text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 flex items-center justify-center">
              Time
            </div>

            {/* Day Column Headers */}
            {weekDays.map((dayDate) => {
              const isCurrentDay = isToday(dayDate);
              const holidayName = PHILIPPINE_HOLIDAYS[format(dayDate, 'MM-dd')];
              const schedule = getDaySchedule(dayDate);

              return (
                <div 
                  key={dayDate.toISOString()}
                  className={`p-2.5 text-center transition-all ${
                    isCurrentDay
                      ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-xs'
                      : holidayName
                      ? 'bg-rose-50/80 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200'
                      : 'text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  <div className={`text-[10px] font-black uppercase tracking-wider ${
                    isCurrentDay ? 'text-zinc-200 dark:text-zinc-700' : 'text-zinc-500 dark:text-zinc-400'
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
                    isCurrentDay ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400 dark:text-zinc-500'
                  }`}>
                    {schedule.length} {schedule.length === 1 ? 'class' : 'classes'}
                  </div>
                  {holidayName && (
                    <div className="text-[9px] font-bold text-rose-800 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-900/40 rounded px-1 mt-1 truncate">
                      {holidayName}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time-Grid Body */}
          <div className="relative grid grid-cols-[70px_repeat(5,1fr)] lg:grid-cols-[80px_repeat(5,1fr)] divide-x divide-zinc-200 dark:divide-zinc-800" style={{ height: `${totalGridHeightPx}px` }}>
            {/* Left Y-Axis Time Labels */}
            <div className="relative bg-zinc-50/70 dark:bg-zinc-950/60 select-none">
              {timeSlots.map((slot, sIdx) => (
                <div 
                  key={sIdx} 
                  className={`absolute w-full px-2 text-right text-[10px] font-mono leading-none ${
                    slot.isHalf ? 'text-zinc-400/80 dark:text-zinc-600' : 'font-bold text-zinc-600 dark:text-zinc-400'
                  }`}
                  style={{ top: `${sIdx * SLOT_HEIGHT_PX}px` }}
                >
                  {slot.label}
                </div>
              ))}
            </div>

            {/* Day Columns with Proportional Absolute-Positioned Class Blocks */}
            {weekDays.map((dayDate) => {
              const schedule = getDaySchedule(dayDate);
              const isCurrentDay = isToday(dayDate);

              return (
                <div 
                  key={dayDate.toISOString()} 
                  className={`relative bg-hatched transition-colors ${
                    isCurrentDay ? 'bg-zinc-50/30 dark:bg-zinc-800/10' : ''
                  }`}
                  style={{ height: `${totalGridHeightPx}px` }}
                >
                  {/* Horizontal 30-min Grid Guide Lines */}
                  {timeSlots.map((slot, sIdx) => (
                    <div
                      key={sIdx}
                      className={`absolute left-0 right-0 border-t pointer-events-none ${
                        slot.isHalf 
                          ? 'border-zinc-100 dark:border-zinc-800/50 border-dashed' 
                          : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                      style={{ top: `${sIdx * SLOT_HEIGHT_PX}px` }}
                    />
                  ))}

                  {/* Scheduled Class Blocks (Matching Sample Image Layout & Eye-Care Colors) */}
                  {schedule.map((item, itemIdx) => {
                    const isLab = item.sch.type === 'Laboratory';

                    // Non-oversaturated, easy-on-the-eyes palette:
                    // Lecture: Soft slate blue/gray
                    // Laboratory: Soft cyan/teal
                    // Accomplished: Soft emerald
                    let cardColorClasses = isLab
                      ? 'bg-cyan-50/95 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800/80 text-cyan-950 dark:text-cyan-100 hover:border-cyan-400 dark:hover:border-cyan-600'
                      : 'bg-white dark:bg-zinc-800/90 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500';

                    if (item.isLogged) {
                      cardColorClasses = 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 hover:border-emerald-400';
                    }

                    if (item.isLiveNow) {
                      cardColorClasses += ' ring-2 ring-emerald-500 shadow-md animate-pulse';
                    }

                    return (
                      <div
                        key={`${item.cls.id}_${itemIdx}`}
                        onClick={() => onClassClick(item.cls, item.sch, dayDate)}
                        style={{
                          top: `${item.topPx}px`,
                          height: `${item.heightPx}px`,
                        }}
                        className={`absolute left-1 right-1 rounded-xl border p-2 text-left cursor-pointer transition-all shadow-2xs hover:shadow-md hover:scale-[1.01] flex flex-col justify-between overflow-hidden z-10 ${cardColorClasses}`}
                        title={`${item.cls.subjectCode} (${item.cls.section}) - ${item.cls.subjectTitle}\nTime: ${formatTimeSlot(item.sch.startTime)} – ${formatTimeSlot(item.sch.endTime)}\nRoom: ${item.sch.room || item.cls.room}\nClick to log topics or view syllabus.`}
                      >
                        {/* Block Header: Subject Code, Section & Status */}
                        <div>
                          <div className="flex items-center justify-between gap-1 leading-tight">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-xs font-black truncate">
                                {item.cls.subjectCode}
                              </span>
                              <span className="text-[10px] font-bold px-1 rounded bg-zinc-200/70 dark:bg-zinc-700/80 shrink-0">
                                {item.cls.section}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {item.isLiveNow && (
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Live Now" />
                              )}
                              {item.isLogged ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1 rounded bg-zinc-100 dark:bg-zinc-700/60 opacity-80">
                                  {isLab ? 'Lab' : 'Lec'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Subject Title (Shown if block height permits) */}
                          {item.heightPx > 50 && (
                            <p className="text-[10px] opacity-80 truncate mt-0.5 font-medium">
                              {item.cls.subjectTitle}
                            </p>
                          )}
                        </div>

                        {/* Next Topic Preview (Shown for longer 2-3h lab blocks) */}
                        {item.heightPx > 80 && item.nextTopic && !item.isLogged && (
                          <div className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100/80 dark:bg-zinc-800/80 opacity-90 truncate flex items-center gap-1">
                            <BookOpen className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate"><span className="font-bold">Next:</span> {item.nextTopic}</span>
                          </div>
                        )}

                        {/* Block Footer: Time & Room */}
                        <div className="flex items-center justify-between text-[9px] font-mono opacity-85 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
                          <span>
                            {formatTimeSlot(item.sch.startTime)} – {formatTimeSlot(item.sch.endTime)}
                          </span>
                          <span className="font-bold px-1 rounded bg-zinc-100/90 dark:bg-zinc-700/70">
                            {item.sch.room || item.cls.room || 'CL'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Single Day Time-Grid View */}
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
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white' 
                    : holidayName 
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200' 
                    : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
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
                    <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
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
                              ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40'
                              : isLab
                              ? 'border-cyan-200 dark:border-cyan-800/80 bg-cyan-50/70 dark:bg-cyan-950/40'
                              : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-black text-zinc-950 dark:text-zinc-100">
                                {item.cls.subjectCode}
                              </span>
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600">
                                {item.cls.section}
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              isLab ? 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-900 dark:text-cyan-200' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                            }`}>
                              {item.sch.type}
                            </span>
                          </div>

                          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                            {item.cls.subjectTitle}
                          </div>

                          <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 font-mono">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-zinc-500" />
                              <span>{formatTimeSlot(item.sch.startTime)} – {formatTimeSlot(item.sch.endTime)}</span>
                            </div>
                            <span className="font-bold bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-600">
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

        {/* Legend Bar (Matching Sample Image bottom row) */}
        <div className="bg-zinc-50 dark:bg-zinc-950 p-3.5 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400 transition-colors">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-zinc-900 dark:text-zinc-200 text-[11px] uppercase tracking-wider">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 shadow-2xs" />
              <span className="text-[11px]">Lecture Class</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-cyan-100 dark:bg-cyan-900/60 border border-cyan-300 dark:border-cyan-700 shadow-2xs" />
              <span className="text-[11px]">Laboratory Class</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 shadow-2xs" />
              <span className="text-[11px]">Accomplished Log</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px]">Active Live Now</span>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            Tip: Click any class block to view syllabus topics, log session accomplishments, or inspect course details.
          </div>
        </div>
      </div>
    </div>
  );
};
