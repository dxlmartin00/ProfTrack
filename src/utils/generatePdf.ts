import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { SessionLog, ClassSession, InstructorProfile } from '../services/db';

export const generateMonthlyReport = (
  logs: (SessionLog & { classInfo: ClassSession })[], 
  year: number, 
  month: number,
  profile?: InstructorProfile
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

  // Header Banner / Title
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.text(`FACULTY ACCOMPLISHMENT REPORT`, 14, 18);
  
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.setFont('helvetica', 'bold');
  doc.text(`Instructor: `, 14, 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`${profile?.fullName || 'Faculty Member'}  (${profile?.position || 'Instructor'})`, 34, 25);

  doc.setFont('helvetica', 'bold');
  doc.text(`Department: `, 14, 30);
  doc.setFont('helvetica', 'normal');
  doc.text(`${profile?.department || 'College'} • ${profile?.institution || 'University'}`, 36, 30);

  doc.setFont('helvetica', 'bold');
  doc.text(`Period: `, 14, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(`${monthName}  •  ${totalSessions} Sessions Logged  •  ${totalTopics} Topics Completed`, 28, 35);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Report Generated: ${format(new Date(), 'MMM dd, yyyy • h:mm a')}${profile?.employeeId ? ` • ID: ${profile.employeeId}` : ''}`, 14, 40);

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
    startY: 45,
    head: [['Date', 'Course & Section', 'Type', 'Topics & Syllabus Accomplished', 'Student Engagement', 'Reminders & Next Steps']],
    body: tableData.length > 0 ? tableData : [['—', 'No session logs recorded for this period.', '—', '—', '—', '—']],
    theme: 'grid',
    headStyles: { 
      fillColor: [24, 24, 27], // zinc-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: { 
      fontSize: 8, 
      cellPadding: 3.5,
      valign: 'top',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 32 },
      2: { cellWidth: 20 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 24 },
      5: { cellWidth: 36 }
    },
    didDrawPage: function (data) {
      // Footer
      const str = `Page ${doc.internal.pages.length - 1}`;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.text(str, data.settings.margin.left, pageHeight - 8);
      doc.text(`Prepared by: ${profile?.fullName || 'Faculty Member'}  •  ProfTrack PWA`, pageSize.width - 95, pageHeight - 8);
    }
  });

  doc.save(`Accomplishment_Report_${format(new Date(year, month, 1), 'yyyy_MM')}.pdf`);
};
