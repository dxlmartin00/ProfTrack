import { useState, useMemo, useRef } from 'react';
import type { FC } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
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
  Plus
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

// Philippine National & Academic Calendar Holidays
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

const DAY_LABELS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const CalendarView: FC<CalendarViewProps> = ({
  classes,
  logs,
  profile,
  onClassClick,
  onSwitchToDaily,
  onAddClassClick
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const calendarPrintRef = useRef<HTMLDivElement>(null);

  // Month navigation
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Formatted display
  const monthYearDisplay = format(currentMonth, 'MMMM yyyy');

  // Filtered classes based on dropdown
  const filteredClasses = useMemo(() => {
    if (selectedCourseFilter === 'all') return classes;
    return classes.filter(c => c.id === selectedCourseFilter);
  }, [classes, selectedCourseFilter]);

  // Compute 7-column month grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Format 24h to 12h time (e.g. 08:00 -> 8:00 AM)
  const formatTimeSlot = (timeStr: string) => {
    try {
      const parsed = parse(timeStr, 'HH:mm', new Date());
      return format(parsed, 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  // Map classes to each date based on day of week
  const getDaySchedule = (date: Date) => {
    const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const items: Array<{
      cls: ClassSession;
      sch: ClassSchedule;
      isLogged: boolean;
      loggedTopics?: string[];
    }> = [];

    filteredClasses.forEach(cls => {
      cls.schedule.forEach(sch => {
        if (sch.dayOfWeek === dayOfWeek) {
          // Check if session was logged for this exact date
          const matchingLog = logs.find(l => 
            l.classInfo.id === cls.id && 
            isSameDay(new Date(l.date), date)
          );
          items.push({
            cls,
            sch,
            isLogged: !!matchingLog,
            loggedTopics: matchingLog?.topicsCovered
          });
        }
      });
    });

    // Sort chronologically by start time
    return items.sort((a, b) => a.sch.startTime.localeCompare(b.sch.startTime));
  };

  // Export calendar as high-resolution printable PDF
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
      pdf.save(`ProfTrack_Calendar_${format(currentMonth, 'yyyy_MM')}.pdf`);
    } catch (err) {
      console.error('Failed to export calendar PDF:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4">
      {/* Calendar Top Control Toolbar */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: View Mode Segmented Switcher & Today */}
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
              <span>Monthly Calendar</span>
            </button>
          </div>

          <button
            type="button"
            onClick={goToToday}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-800 transition-colors shadow-2xs cursor-pointer"
            title="Jump to today"
          >
            Today
          </button>

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
        </div>

        {/* Center: Month & Year Navigator */}
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer shadow-2xs"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <h2 className="text-base sm:text-lg font-black text-zinc-950 tracking-tight min-w-[170px] text-center">
            {monthYearDisplay}
          </h2>

          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer shadow-2xs"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Course Filter & Print / Export Action */}
        <div className="flex items-center gap-2 justify-end flex-wrap">
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

          {/* Export / Print PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-950 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Download printable PDF calendar"
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

      {/* Printable Wall Calendar Enclosure (Styling matches user reference photo & ProfTrack) */}
      <div 
        ref={calendarPrintRef}
        className="bg-white rounded-2xl border-2 border-zinc-950 ring-1 ring-zinc-300 shadow-xl overflow-hidden print:m-0 print:border-none print:shadow-none"
      >
        {/* Academic Header Band for Print / Branding */}
        <div className="bg-zinc-900 text-white px-4 py-2 border-b border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-wide uppercase text-zinc-100">
              {profile?.institution || 'University of Makati'}
            </span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-300">{profile?.fullName || 'Faculty Schedule'}</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-400 hidden sm:block">
            Academic Calendar Planner • 1st Semester A.Y. 2026–2027
          </div>
        </div>

        {/* Navy Header Days of Week Bar (Matches photo reference) */}
        <div className="bg-zinc-950 text-white grid grid-cols-7 text-center divide-x divide-zinc-800 border-b border-zinc-950">
          {DAY_LABELS.map((dayName, idx) => {
            const isWeekend = idx === 0 || idx === 6;
            return (
              <div 
                key={dayName}
                className={`py-2 text-[10px] sm:text-xs font-black tracking-wider ${
                  isWeekend ? 'text-zinc-400' : 'text-white'
                }`}
              >
                <span className="hidden md:inline">{dayName}</span>
                <span className="md:hidden">{dayName.slice(0, 3)}</span>
              </div>
            );
          })}
        </div>

        {/* 7-Column Wall Calendar Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200 bg-zinc-200">
          {calendarDays.map((dayDate) => {
            const isCurrentMonth = isSameMonth(dayDate, currentMonth);
            const isTodayDate = isToday(dayDate);
            const dayNumber = format(dayDate, 'd');
            const monthDayKey = format(dayDate, 'MM-dd');
            const holidayName = PHILIPPINE_HOLIDAYS[monthDayKey];
            const scheduleItems = getDaySchedule(dayDate);
            const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
            const hasClasses = scheduleItems.length > 0;

            // Background logic matching reference photo:
            // - Class days: cool soft slate-blue (work week)
            // - Holidays: soft rose / peach accent
            // - Weekends / Off days: clean white
            let cellBg = 'bg-white';
            if (holidayName) {
              cellBg = 'bg-rose-50/75 border-rose-100';
            } else if (hasClasses && isCurrentMonth) {
              cellBg = 'bg-slate-50/90 hover:bg-slate-100/90';
            } else if (!isCurrentMonth) {
              cellBg = 'bg-zinc-50/60 opacity-40';
            }

            return (
              <div
                key={dayDate.toISOString()}
                className={`min-h-[115px] sm:min-h-[145px] md:min-h-[165px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors relative group ${cellBg} ${
                  isTodayDate ? 'ring-2 ring-inset ring-zinc-950 bg-amber-50/20' : ''
                }`}
              >
                {/* Cell Header: Day Number & Status Badges */}
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className={`text-xs sm:text-sm font-black tracking-tight ${
                        isTodayDate 
                          ? 'bg-zinc-950 text-white rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center shadow-2xs' 
                          : isCurrentMonth 
                          ? 'text-zinc-900' 
                          : 'text-zinc-400'
                      }`}
                    >
                      {dayNumber}
                    </span>
                    {isTodayDate && (
                      <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1 rounded">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Holiday / Event Label */}
                  {holidayName && (
                    <span 
                      className="text-[9px] sm:text-[10px] font-bold text-rose-800 bg-rose-100/90 border border-rose-200 px-1 sm:px-1.5 py-0.2 rounded truncate max-w-[85px] sm:max-w-[120px]"
                      title={holidayName}
                    >
                      {holidayName}
                    </span>
                  )}
                </div>

                {/* Scheduled Classes Stack */}
                <div className="flex-1 space-y-1 overflow-y-auto max-h-[110px] sm:max-h-[125px] pr-0.5 scrollbar-none">
                  {scheduleItems.map((item, itemIdx) => {
                    const isLab = item.sch.type === 'Laboratory';
                    return (
                      <div
                        key={`${item.cls.id}_${item.sch.dayOfWeek}_${itemIdx}`}
                        onClick={() => onClassClick(item.cls, item.sch, dayDate)}
                        className={`p-1 sm:p-1.5 rounded-lg border text-left cursor-pointer transition-all shadow-2xs group/card hover:scale-[1.01] ${
                          isLab
                            ? 'bg-blue-50/90 border-blue-200 text-blue-950 hover:border-blue-400'
                            : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-400'
                        }`}
                        title={`${item.cls.subjectCode} (${item.cls.section}) - ${item.cls.subjectTitle}\nTime: ${formatTimeSlot(item.sch.startTime)} - ${formatTimeSlot(item.sch.endTime)}\nRoom: ${item.sch.room || item.cls.room}\nClick to view topics or log accomplishments.`}
                      >
                        <div className="flex items-center justify-between gap-1 leading-tight">
                          <span className="font-extrabold text-[10px] sm:text-[11px] truncate text-zinc-950">
                            {item.cls.subjectCode} <span className="font-semibold text-zinc-600">({item.cls.section})</span>
                          </span>

                          {/* Completion / Log status badge */}
                          {item.isLogged ? (
                            <span className="text-emerald-700 shrink-0" title="Class accomplishment logged for this date">
                              <CheckCircle2 className="w-3 h-3" />
                            </span>
                          ) : (
                            <span 
                              className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 rounded shrink-0 ${
                                isLab ? 'bg-blue-200/80 text-blue-900' : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              {isLab ? 'Lab' : 'Lec'}
                            </span>
                          )}
                        </div>

                        {/* Time & Room line */}
                        <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono mt-0.5">
                          <span>{formatTimeSlot(item.sch.startTime)}</span>
                          <span className="font-bold text-zinc-700 bg-zinc-100 px-1 rounded border border-zinc-200">
                            {item.sch.room || item.cls.room || 'CL'}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty state for weekdays without loaded classes */}
                  {!hasClasses && isCurrentMonth && !isWeekend && !holidayName && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[10px] text-zinc-400 italic">No classes</span>
                    </div>
                  )}
                </div>

                {/* Day Footer: Quick Summary Count */}
                {hasClasses && (
                  <div className="pt-1 text-[9px] text-zinc-400 font-medium flex items-center justify-between border-t border-zinc-200/60 mt-1">
                    <span>{scheduleItems.length} {scheduleItems.length === 1 ? 'class' : 'classes'}</span>
                    <span className="text-zinc-600 font-mono">
                      {scheduleItems.filter(s => s.isLogged).length}/{scheduleItems.length} logged
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Calendar Footer Legend */}
        <div className="bg-zinc-50 p-3 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600">
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
              <span className="h-3 w-3 rounded bg-rose-100 border border-rose-300 shadow-2xs" />
              <span className="text-[11px]">Holiday / Observance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px]">Accomplishment Logged</span>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500">
            Tip: Click any class session box to view covered topics or record accomplishments.
          </div>
        </div>
      </div>
    </div>
  );
};
