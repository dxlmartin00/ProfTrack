import { useState } from 'react';
import type { FC } from 'react';
import type { SessionLog, ClassSession, InstructorProfile } from '../services/db';
import { generateMonthlyReport } from '../utils/generatePdf';
import { X, Download, FileText, BarChart3, Table as TableIcon } from 'lucide-react';
import { format } from 'date-fns';
import { AnalyticsCharts } from './AnalyticsCharts';
import { useToast } from '../context/ToastContext';

interface ReportModalProps {
  logs: (SessionLog & { classInfo: ClassSession })[];
  classes: ClassSession[];
  profile?: InstructorProfile;
  onClose: () => void;
}

export const ReportModal: FC<ReportModalProps> = ({ logs, classes, profile, onClose }) => {
  const { showToast } = useToast();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'table'>('analytics');

  const filteredLogs = logs.filter((log) => {
    const logDate = new Date(log.date);
    return (
      logDate.getMonth() === selectedMonth &&
      logDate.getFullYear() === selectedYear
    );
  });

  const totalTopicsCovered = filteredLogs.reduce(
    (acc, log) => acc + log.topicsCovered.length,
    0
  );

  const highEngagementCount = filteredLogs.filter(
    (log) => log.engagementLevel === 'High'
  ).length;

  const engagementPercent =
    filteredLogs.length > 0
      ? Math.round((highEngagementCount / filteredLogs.length) * 100)
      : 0;

  const handleExport = () => {
    setIsGenerating(true);
    try {
      generateMonthlyReport(logs, selectedYear, selectedMonth, profile);
      showToast('PDF report exported successfully!', 'success');
    } catch (err) {
      console.error('Failed to export PDF:', err);
      showToast('Error generating PDF report.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
      <div className="bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-4xl shadow-xl flex flex-col max-h-[90vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Dialog Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 p-5 shrink-0 bg-white dark:bg-zinc-900">
          <div className="space-y-1">
            <h2 id="report-modal-title" className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
              Monthly Accomplishment Report
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Generate formatted PDF accomplishment logs and visual analytics for departmental reporting.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-white dark:bg-zinc-900">
          
          {/* Month / Year Filter and Quick Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-1 space-y-1">
                <label htmlFor="period-month" className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">Period Month</label>
                <select
                  id="period-month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="flex h-9 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-400 font-medium"
                >
                  {months.map((m, idx) => (
                    <option key={idx} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-28 space-y-1">
                <label htmlFor="period-year" className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">Year</label>
                <select
                  id="period-year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="flex h-9 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-400 font-mono font-bold"
                >
                  {[2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-2 self-start sm:self-end pb-0.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-750">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <strong className="font-mono font-bold">{filteredLogs.length}</strong> Sessions Recorded
              </span>
            </div>
          </div>

          {/* Navigation Tabs (Analytics vs Table) */}
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span>Analytics & Charts</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <TableIcon className="h-4 w-4 shrink-0" />
              <span>Session Logs</span>
              <span className={`ml-1 text-2xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'table'
                  ? 'bg-white/20 dark:bg-zinc-900/30 text-white dark:text-zinc-950 font-mono font-bold'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-mono font-bold'
              }`}>
                {filteredLogs.length}
              </span>
            </button>
          </div>

          {/* Tab Content: Analytics vs Table */}
          {activeTab === 'analytics' ? (
            <AnalyticsCharts
              logs={filteredLogs}
              classes={classes}
              monthName={months[selectedMonth]}
              year={selectedYear}
            />
          ) : (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Quick Metrics */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-2.5 sm:p-4 space-y-0.5 sm:space-y-1 shadow-2xs min-w-0 overflow-hidden">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider text-zinc-600 dark:text-zinc-300 truncate">
                    <span className="hidden sm:inline">Logged </span>Sessions
                  </p>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 font-mono truncate">{filteredLogs.length}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-2.5 sm:p-4 space-y-0.5 sm:space-y-1 shadow-2xs min-w-0 overflow-hidden">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider text-zinc-600 dark:text-zinc-300 truncate">
                    <span className="hidden sm:inline">Topics </span>Covered
                  </p>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 font-mono truncate">{totalTopicsCovered}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-2.5 sm:p-4 space-y-0.5 sm:space-y-1 shadow-2xs min-w-0 overflow-hidden">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider text-zinc-600 dark:text-zinc-300 truncate">
                    <span className="hidden sm:inline">High </span>Engagement
                  </p>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 font-mono truncate">{engagementPercent}%</p>
                </div>
              </div>

              {/* Table / List Preview */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Sessions Logged ({filteredLogs.length})
                  </label>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {classes.length} Active Courses
                  </span>
                </div>

                {filteredLogs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-zinc-600 dark:text-zinc-300 space-y-1.5">
                    <FileText className="h-6 w-6 mx-auto text-zinc-400 dark:text-zinc-400" aria-hidden="true" />
                    <p className="text-sm font-bold text-zinc-950 dark:text-zinc-100">No session logs found for this period</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">Once you log classes, they will be formatted for PDF output.</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card List (sm:hidden) */}
                    <div className="sm:hidden space-y-2.5">
                      {filteredLogs.map((log, index) => (
                        <div key={log.id || index} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/60 p-3 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-xs text-zinc-950 dark:text-zinc-100">
                              {log.classInfo.subjectCode} ({log.classInfo.section})
                            </span>
                            <span className="font-mono text-2xs font-semibold text-zinc-500 dark:text-zinc-400 shrink-0">
                              {format(new Date(log.date), 'MMM dd')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-800 dark:text-zinc-200">
                              {log.sessionType || 'Lecture'}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                              log.engagementLevel === 'High'
                                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300'
                                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                            }`}>
                              {log.engagementLevel || 'Medium'} Engagement
                            </span>
                          </div>
                          {log.topicsCovered.length > 0 && (
                            <p className="text-2xs text-zinc-600 dark:text-zinc-300 pt-0.5 line-clamp-2">
                              {log.topicsCovered.join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table (hidden sm:block) */}
                    <div className="hidden sm:block rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold">
                          <tr>
                            <th className="p-3 pl-3.5">Date</th>
                            <th className="p-3">Course</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Topics Covered</th>
                            <th className="p-3 pr-3.5">Engagement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {filteredLogs.map((log, index) => (
                            <tr key={log.id || index} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                              <td className="p-3 pl-3.5 font-mono font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                {format(new Date(log.date), 'MMM dd')}
                              </td>
                              <td className="p-3 font-bold text-zinc-950 dark:text-zinc-100 whitespace-nowrap">
                                {log.classInfo.subjectCode} ({log.classInfo.section})
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                  {log.sessionType || 'Lecture'}
                                </span>
                              </td>
                              <td className="p-3 text-zinc-700 dark:text-zinc-300">
                                {log.topicsCovered.length > 0 ? log.topicsCovered.join(', ') : '—'}
                              </td>
                              <td className="p-3 pr-3.5 whitespace-nowrap">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                                  log.engagementLevel === 'High'
                                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300'
                                    : 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                                }`}>
                                  {log.engagementLevel || 'Medium'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Dialog Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 p-4 shrink-0 bg-zinc-50 dark:bg-zinc-900/80">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 text-sm font-semibold text-zinc-800 dark:text-zinc-200 shadow-2xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isGenerating || filteredLogs.length === 0}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 dark:bg-zinc-100 px-5 text-sm font-semibold text-white dark:text-zinc-950 shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            {isGenerating ? 'Generating...' : 'Download PDF Report'}
          </button>
        </div>

      </div>
    </div>
  );
};
