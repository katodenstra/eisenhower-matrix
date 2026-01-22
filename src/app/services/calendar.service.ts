import { Injectable } from '@angular/core';
import { Task } from '../models/task.models';

/**
 * Real calendar integrations depend on the platform and permissions.
 * This approach exports a standard .ics file that most calendar apps can import.
 */
@Injectable({ providedIn: 'root' })
export class CalendarService {
  downloadIcs(task: Task): void {
    const ics = this.makeIcs(task);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.safeFileName(task.title)}.ics`;
    a.click();

    URL.revokeObjectURL(url);
  }

  private makeIcs(task: Task): string {
    // Minimal valid event. We use "all-day" when dueDate exists.
    const uid = `${task.id}@eisenhower.local`;
    const dtstamp = this.toIcsDateTime(new Date());

    const hasDue = !!task.dueDate;
    const due = hasDue ? this.toIcsDate(task.dueDate!) : null;

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Eisenhower Matrix//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `SUMMARY:${this.escape(task.title)}`,
      task.description ? `DESCRIPTION:${this.escape(task.description)}` : '',
      hasDue ? `DTSTART;VALUE=DATE:${due}` : '',
      hasDue ? `DTEND;VALUE=DATE:${due}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n');
  }

  private toIcsDate(yyyyMmDd: string): string {
    // YYYYMMDD
    return yyyyMmDd.replaceAll('-', '');
  }

  private toIcsDateTime(d: Date): string {
    // UTC format YYYYMMDDTHHMMSSZ
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  }

  private escape(s: string): string {
    return s
      .replaceAll('\\', '\\\\')
      .replaceAll('\n', '\\n')
      .replaceAll(',', '\\,')
      .replaceAll(';', '\\;');
  }

  private safeFileName(s: string): string {
    return (
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 40) || 'task'
    );
  }
}
