/**
 * Minimal iCalendar (.ics, RFC 5545) generator for exporting appointments and
 * due dates to the phone's calendar. Opening the file on iPhone offers "Add All".
 */

export interface IcsEvent {
  uid: string;
  title: string;
  /** Full ISO date-time for timed events, or YYYY-MM-DD for all-day events. */
  start: string;
  durationMinutes?: number;
  description?: string;
  location?: string;
  /** Minutes before start for an alert. */
  alarmMinutes?: number | null;
}

export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Folds lines longer than 75 octets as required by the spec. */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 73) parts.push((i === 0 ? '' : ' ') + line.slice(i, i + 73));
  return parts.join('\r\n');
}

export function buildIcs(events: IcsEvent[], now = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PAWPASS//Cat Health Record//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${utcStamp(now)}`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(e.start)) {
      const day = e.start.replace(/-/g, '');
      const next = new Date(Date.UTC(+e.start.slice(0, 4), +e.start.slice(5, 7) - 1, +e.start.slice(8, 10) + 1));
      lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, '')}`);
    } else {
      const start = new Date(e.start);
      const end = new Date(start.getTime() + (e.durationMinutes ?? 60) * 60_000);
      lines.push(`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(end)}`);
    }
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.alarmMinutes != null) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(e.title)}`, `TRIGGER:-PT${Math.max(0, Math.round(e.alarmMinutes))}M`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
