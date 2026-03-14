import { jsPDF } from 'jspdf';
import type { DayReport, Task } from '../types';

/**
 * Export day report as PDF certificate.
 */
export function exportDayReport(report: DayReport, tasks: Task[]): void {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Revise Right — Daily Report', 20, 20);
  doc.setFontSize(12);
  doc.text(`Date: ${report.date}`, 20, 30);
  let y = 45;
  doc.text('Task Name', 20, y);
  doc.text('Estimated', 80, y);
  doc.text('Actual', 120, y);
  doc.text('Status', 150, y);
  y += 8;
  for (const task of tasks.filter((t) => report.completedTaskIds.includes(t.id))) {
    doc.text(task.title.slice(0, 30), 20, y);
    doc.text(`${task.estimatedMinutes} min`, 80, y);
    doc.text(`${task.actualMinutes} min`, 120, y);
    doc.text(task.status, 150, y);
    y += 7;
  }
  y += 10;
  doc.text('Keep up the great work!', 20, y);
  doc.save(`revise-right-${report.date}.pdf`);
}
