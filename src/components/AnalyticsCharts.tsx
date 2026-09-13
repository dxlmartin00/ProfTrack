import { useState, useMemo } from 'react';
import type { FC } from 'react';
import type { SessionLog, ClassSession } from '../services/db';
import { BarChart3, PieChart, BookOpen, Users, TrendingUp, Clock } from 'lucide-react';

interface AnalyticsChartsProps {
  logs: (SessionLog & { classInfo: ClassSession })[];
  classes: ClassSession[];
  monthName: string;
  year: number;
}

export const AnalyticsCharts: FC<AnalyticsChartsProps> = ({ logs, classes, monthName, year }) => {
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  // 1. Weekly breakdown (Weeks 1-5 of the month)
  const weeklyData = useMemo(() => {
    const weeks: { weekNumber: number; label: string; count: number; lectureCount: number; labCount: number; dates: string }[] = [
      { weekNumber: 1, label: 'Week 1', count: 0, lectureCount: 0, labCount: 0, dates: '1st - 7th' },
      { weekNumber: 2, label: 'Week 2', count: 0, lectureCount: 0, labCount: 0, dates: '8th - 14th' },
      { weekNumber: 3, label: 'Week 3', count: 0, lectureCount: 0, labCount: 0, dates: '15th - 21st' },
      { weekNumber: 4, label: 'Week 4', count: 0, lectureCount: 0, labCount: 0, dates: '22nd - 28th' },
      { weekNumber: 5, label: 'Week 5', count: 0, lectureCount: 0, labCount: 0, dates: '29th - end' },
    ];

    logs.forEach((log) => {
      const day = new Date(log.date).getDate();
      let weekIdx = 0;
      if (day <= 7) weekIdx = 0;
      else if (day <= 14) weekIdx = 1;
      else if (day <= 21) weekIdx = 2;
      else if (day <= 28) weekIdx = 3;
      else weekIdx = 4;

      weeks[weekIdx].count += 1;
      if (log.sessionType === 'Laboratory') {
        weeks[weekIdx].labCount += 1;
      } else {
        weeks[weekIdx].lectureCount += 1;
      }
    });

    const maxCount = Math.max(...weeks.map((w) => w.count), 1);
    return { weeks, maxCount };
  }, [logs]);

  // 2. Course & Section workload breakdown
  const courseWorkload = useMemo(() => {
    const map = new Map<string, { subjectCode: string; section: string; subjectTitle: string; sessionCount: number; topicCount: number }>();

    logs.forEach((log) => {
      const key = `${log.classInfo.subjectCode}-${log.classInfo.section}`;
      const existing = map.get(key) || {
        subjectCode: log.classInfo.subjectCode,
        section: log.classInfo.section,
        subjectTitle: log.classInfo.subjectTitle || '',
        sessionCount: 0,
        topicCount: 0,
      };
      existing.sessionCount += 1;
      existing.topicCount += log.topicsCovered.length;
      map.set(key, existing);
    });

    const list = Array.from(map.values()).sort((a, b) => b.sessionCount - a.sessionCount);
    const totalSessions = logs.length || 1;
    return list.map((item) => ({
      ...item,
      percentage: Math.round((item.sessionCount / totalSessions) * 100),
    }));
  }, [logs]);

  // 3. Session Delivery Modality (Lecture vs. Lab)
  const sessionTypeData = useMemo(() => {
    let lecture = 0;
    let lab = 0;
    let other = 0;

    logs.forEach((log) => {
      const type = (log.sessionType || 'Lecture').toLowerCase();
      if (type.includes('lab')) lab += 1;
      else if (type.includes('lec')) lecture += 1;
      else other += 1;
    });

    const total = logs.length || 1;
    const lecturePct = Math.round((lecture / total) * 100);
    const labPct = Math.round((lab / total) * 100);
    const otherPct = Math.max(0, 100 - lecturePct - labPct);

    return { lecture, lab, other, lecturePct, labPct, otherPct, total: logs.length };
  }, [logs]);

  // 4. Student Engagement metrics
  const engagementData = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;

    logs.forEach((log) => {
      const lvl = (log.engagementLevel || 'Medium').toLowerCase();
      if (lvl === 'high') high += 1;
      else if (lvl === 'low') low += 1;
      else medium += 1;
    });

    const total = logs.length || 1;
    return {
      high,
      medium,
      low,
      highPct: Math.round((high / total) * 100),
      mediumPct: Math.round((medium / total) * 100),
      lowPct: Math.round((low / total) * 100),
    };
  }, [logs]);

  // Estimate total hours based on logged sessions (average 1.5 hrs per session)
  const estimatedHours = useMemo(() => {
    return (logs.length * 1.5).toFixed(1).replace('.0', '');
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center bg-zinc-50/50 dark:bg-zinc-800/30">
        <BarChart3 className="h-8 w-8 mx-auto text-zinc-400 dark:text-zinc-500 mb-2" aria-hidden="true" />
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No Analytics Data for {monthName} {year}</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 max-w-sm mx-auto">
          Log teaching sessions for this month to generate activity trends, modality distributions, and course workload charts.
        </p>
      </div>
    );
  }

  // Calculate SVG donut stroke offsets
  const circumference = 2 * Math.PI * 40; // r=40 -> ~251.3
  const lectureStroke = (sessionTypeData.lecturePct / 100) * circumference;
  const labStroke = (sessionTypeData.labPct / 100) * circumference;
  const otherStroke = (sessionTypeData.otherPct / 100) * circumference;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Level Key Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" />
            <span className="text-2xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Teaching Hours</span>
          </div>
          <p className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 font-mono">
            ~{estimatedHours} <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 font-sans">hrs</span>
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <TrendingUp className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" />
            <span className="text-2xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Avg Sessions/Wk</span>
          </div>
          <p className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 font-mono">
            {(logs.length / 4.3).toFixed(1)}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <BookOpen className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" />
            <span className="text-2xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Active Courses</span>
          </div>
          <p className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 font-mono">
            {courseWorkload.length} <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 font-sans">of {classes.length}</span>
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <Users className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" />
            <span className="text-2xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">High Engagement</span>
          </div>
          <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
            {engagementData.highPct}%
          </p>
        </div>
      </div>

      {/* Primary Charts: Weekly Trend & Modality Split */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Weekly Activity Bar Chart (3 cols on desktop) */}
        <div className="md:col-span-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Weekly Session Activity
              </h3>
            </div>
            <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
              {logs.length} total sessions
            </span>
          </div>

          {/* SVG Bar Chart */}
          <div className="relative pt-2 pb-1">
            <div className="h-44 w-full flex items-end justify-between gap-2 sm:gap-4 px-2">
              {weeklyData.weeks.map((w, idx) => {
                const heightPct = weeklyData.maxCount > 0 ? (w.count / weeklyData.maxCount) * 100 : 0;
                const isHovered = hoveredWeek === idx;

                return (
                  <div
                    key={w.weekNumber}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                    onMouseEnter={() => setHoveredWeek(idx)}
                    onMouseLeave={() => setHoveredWeek(null)}
                    onClick={() => setHoveredWeek(hoveredWeek === idx ? null : idx)}
                  >
                    {/* Tooltip Popup */}
                    {isHovered && (
                      <div className="absolute -top-14 z-20 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 text-2xs py-1 px-2.5 rounded-md shadow-lg pointer-events-none whitespace-nowrap transition-all">
                        <p className="font-bold">{w.label} ({w.dates})</p>
                        <p className="text-zinc-300 dark:text-zinc-700">
                          {w.count} sessions • {w.lectureCount} lec, {w.labCount} lab
                        </p>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-950 dark:bg-zinc-100 rotate-45" />
                      </div>
                    )}

                    {/* Value Badge on top of bar */}
                    <span className={`text-2xs font-mono font-bold mb-1 transition-colors ${
                      w.count > 0 ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-600'
                    }`}>
                      {w.count}
                    </span>

                    {/* Stacked Bar Container */}
                    <div className="w-full max-w-[48px] bg-zinc-100 dark:bg-zinc-700/60 rounded-t-md overflow-hidden flex flex-col justify-end transition-all duration-300 hover:brightness-110" style={{ height: `${Math.max(heightPct, 6)}%` }}>
                      {/* Lab portion */}
                      {w.labCount > 0 && (
                        <div
                          className="w-full bg-teal-500 dark:bg-teal-400 transition-all"
                          style={{ height: `${(w.labCount / Math.max(w.count, 1)) * 100}%` }}
                          title={`Lab: ${w.labCount}`}
                        />
                      )}
                      {/* Lecture portion */}
                      {w.lectureCount > 0 && (
                        <div
                          className="w-full bg-blue-600 dark:bg-blue-500 transition-all"
                          style={{ height: `${(w.lectureCount / Math.max(w.count, 1)) * 100}%` }}
                          title={`Lecture: ${w.lectureCount}`}
                        />
                      )}
                    </div>

                    {/* X-axis label */}
                    <div className="mt-2 text-center">
                      <p className="text-2xs font-bold text-zinc-700 dark:text-zinc-300">{w.label}</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 hidden sm:block">{w.dates}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-center gap-4 text-2xs text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 dark:bg-blue-500" />
                <span>Lecture</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-teal-500 dark:bg-teal-400" />
                <span>Laboratory</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modality Donut / Delivery Split (2 cols on desktop) */}
        <div className="md:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 p-4 space-y-3 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Session Modality
              </h3>
            </div>
            <span className="text-2xs font-semibold text-zinc-500 dark:text-zinc-400">
              Split Ratio
            </span>
          </div>

          {/* SVG Donut Chart */}
          <div className="flex flex-col items-center justify-center my-auto py-2">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-zinc-100 dark:text-zinc-700/60"
                />

                {/* Lecture Segment (Blue) */}
                {sessionTypeData.lecturePct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#2563eb"
                    strokeWidth="12"
                    strokeDasharray={`${lectureStroke} ${circumference}`}
                    strokeDashoffset="0"
                    className="transition-all duration-500"
                  />
                )}

                {/* Lab Segment (Teal) */}
                {sessionTypeData.labPct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#14b8a6"
                    strokeWidth="12"
                    strokeDasharray={`${labStroke} ${circumference}`}
                    strokeDashoffset={`-${lectureStroke}`}
                    className="transition-all duration-500"
                  />
                )}

                {/* Other Segment (Amber) */}
                {sessionTypeData.otherPct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth="12"
                    strokeDasharray={`${otherStroke} ${circumference}`}
                    strokeDashoffset={`-${lectureStroke + labStroke}`}
                    className="transition-all duration-500"
                  />
                )}
              </svg>

              {/* Center Stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold font-mono text-zinc-950 dark:text-zinc-100">
                  {logs.length}
                </span>
                <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">
                  Classes
                </span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="w-full space-y-1.5 mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-500" />
                  <span className="font-medium">Lecture</span>
                </div>
                <span className="font-mono font-bold text-zinc-950 dark:text-zinc-100">
                  {sessionTypeData.lecture} ({sessionTypeData.lecturePct}%)
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 dark:bg-teal-400" />
                  <span className="font-medium">Laboratory</span>
                </div>
                <span className="font-mono font-bold text-zinc-950 dark:text-zinc-100">
                  {sessionTypeData.lab} ({sessionTypeData.labPct}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Workload & Syllabus Topics Completed Breakdown */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Course Workload & Topics Completed
            </h3>
          </div>
          <span className="text-2xs text-zinc-500 dark:text-zinc-400">
            Ranked by session volume
          </span>
        </div>

        <div className="space-y-3">
          {courseWorkload.map((item, idx) => (
            <div key={`${item.subjectCode}-${item.section}`} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-zinc-950 dark:text-zinc-100">
                    {item.subjectCode}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 text-2xs">
                    Sec {item.section}
                  </span>
                  {item.subjectTitle && (
                    <span className="text-zinc-600 dark:text-zinc-300 text-2xs truncate max-w-[180px] sm:max-w-xs hidden sm:inline">
                      • {item.subjectTitle}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-2xs">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    <strong className="text-zinc-950 dark:text-zinc-100 font-mono">{item.topicCount}</strong> topics done
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-200">
                    {item.sessionCount} sessions ({item.percentage}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-700/60 rounded-full overflow-hidden flex">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    idx === 0
                      ? 'bg-blue-600 dark:bg-blue-500'
                      : idx === 1
                      ? 'bg-indigo-600 dark:bg-indigo-400'
                      : idx === 2
                      ? 'bg-teal-500 dark:bg-teal-400'
                      : 'bg-zinc-500 dark:bg-zinc-400'
                  }`}
                  style={{ width: `${Math.max(item.percentage, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Engagement Rating Meter */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Student Engagement Distribution
            </h3>
          </div>
          <span className="text-2xs font-semibold text-emerald-600 dark:text-emerald-400">
            {engagementData.highPct}% Optimal Engagement
          </span>
        </div>

        {/* Stacked Gauge Bar */}
        <div className="space-y-2">
          <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-700/60 rounded-full overflow-hidden flex gap-0.5">
            {engagementData.highPct > 0 && (
              <div
                className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500"
                style={{ width: `${engagementData.highPct}%` }}
                title={`High: ${engagementData.high} sessions (${engagementData.highPct}%)`}
              />
            )}
            {engagementData.mediumPct > 0 && (
              <div
                className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-500"
                style={{ width: `${engagementData.mediumPct}%` }}
                title={`Medium: ${engagementData.medium} sessions (${engagementData.mediumPct}%)`}
              />
            )}
            {engagementData.lowPct > 0 && (
              <div
                className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                style={{ width: `${engagementData.lowPct}%` }}
                title={`Low: ${engagementData.low} sessions (${engagementData.lowPct}%)`}
              />
            )}
          </div>

          <div className="flex items-center justify-between text-2xs text-zinc-600 dark:text-zinc-300 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span>High Engagement ({engagementData.high})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
              <span>Medium Engagement ({engagementData.medium})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
              <span>Low Engagement ({engagementData.low})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
