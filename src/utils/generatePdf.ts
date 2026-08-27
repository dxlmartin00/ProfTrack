import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { SessionLog, ClassSession } from '../services/db';

export const generateMonthlyReport = (
  logs: (SessionLog & { classInfo: ClassSession })[], 
  year: number, 
  month: number
) => {
  const doc = new jsPDF();
  const monthName = format(new Date(year, month, 1), 'MMMM yyyy');

  // Filter logs for this specific period
  const periodLogs = logs.filter((log) => {
    const d = new Date(log.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // Calculate summary metrics
  const totalSessions = periodLogs.length;
  const totalTopics = periodLogs.reduce((acc, l) => acc + l.topicsCovered.length, 0);

  // Document Title Header
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.text(`Faculty Accomplishment Report`, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFont('helvetica', 'normal');
  doc.text(`Academic Period: ${monthName}`, 14, 27);
  doc.text(`Total Sessions Logged: ${totalSessions}  •  Total Topics Completed: ${totalTopics}`, 14, 33);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy • h:mm a')}`, 14, 39);

  // Table Data Preparation
  const tableData = periodLogs
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((log) => [
      format(new Date(log.date), 'MMM dd (EEE)'),
      `${log.classInfo.subjectCode}\n${log.classInfo.section}`,
      log.sessionType || 'Lecture',
      log.topicsCovered.length > 0 ? log.topicsCovered.map(t => `• ${t}`).join('\n') : 'Class lecture & recitation',
      log.engagementLevel || 'Medium',
      log.nextActions || 'None'
    ]);

  autoTable(doc, {
    startY: 46,
    head: [['Date', 'Course & Section', 'Type', 'Topics & Syllabus Accomplished', 'Student Engagement', 'Reminders & Next Steps']],
    body: tableData.length > 0 ? tableData : [['—', 'No session logs recorded for this period.', '—', '—', '—', '—']],
    theme: 'grid',
    headStyles: { 
      fillColor: [24, 24, 27], // zinc-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    styles: { 
      fontSize: 8.5, 
      cellPadding: 4,
      valign: 'top',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 32 },
      2: { cellWidth: 22 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 24 },
      5: { cellWidth: 36 }
    },
    didDrawPage: function (data) {
      // Footer
      const str = `Page ${doc.internal.pages.length - 1}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.text(str, data.settings.margin.left, pageHeight - 10);
      doc.text('Generated via ProfTrack • Offline-First Instructor PWA', pageSize.width - 90, pageHeight - 10);
    }
  });

  doc.save(`Accomplishment_Report_${format(new Date(year, month, 1), 'yyyy_MM')}.pdf`);
};
