import { jsPDF } from 'jspdf';
import type { DayReport, Task } from '../types';

/**
 * Export day report as PDF certificate.
 */
export function exportDayReport(report: DayReport, tasks: Task[]): void {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Step Flow — Daily Report', 20, 20);
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

export interface ReflectionSection {
  heading: string;
  prompt: string;
  response: string;
}

/**
 * Export reflection journal as an aesthetic PDF.
 */
export function exportReflectionJournal(date: string, sections: ReflectionSection[]): void {
  const doc = new jsPDF();
  doc.setFillColor(255, 248, 240);
  doc.rect(10, 10, 190, 277, 'F');

  doc.setFontSize(20);
  doc.text('Step Flow — Reflection Journal', 20, 30);
  doc.setFontSize(12);
  doc.text(`Date: ${date}`, 20, 40);

  let y = 60;

  for (const section of sections) {
    if (y > 260) {
      doc.addPage();
      doc.setFillColor(255, 248, 240);
      doc.rect(10, 10, 190, 277, 'F');
      y = 40;
    }

    doc.setFontSize(14);
    doc.text(section.heading, 20, y);
    y += 8;

    doc.setFontSize(11);
    const promptLines = doc.splitTextToSize(section.prompt, 170);
    doc.text(promptLines, 20, y);
    y += promptLines.length * 6 + 4;

    const responseText = section.response.trim() || '[No response provided]';
    const responseLines = doc.splitTextToSize(responseText, 170);

    doc.setDrawColor(200, 160, 120);
    doc.setLineWidth(0.3);
    doc.roundedRect(18, y - 2, 174, responseLines.length * 6 + 8, 2, 2);
    doc.text(responseLines, 20, y + 4);
    y += responseLines.length * 6 + 14;
  }

  doc.save(`revise-right-reflection-${date}.pdf`);
}
