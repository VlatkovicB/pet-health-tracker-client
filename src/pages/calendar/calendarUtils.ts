import { format } from 'date-fns';
import type { CalendarEvent } from '../../types';

export function toLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getEventsForDay(day: Date, events: CalendarEvent[]): CalendarEvent[] {
  const dateKey = format(day, 'yyyy-MM-dd');
  return events.filter((e) => {
    if (e.kind === 'vet-visit') return e.date.slice(0, 10) === dateKey;
    if (e.kind === 'note') return e.date.slice(0, 10) === dateKey;
    const start = toLocalDate(e.startDate);
    const end = e.endDate ? toLocalDate(e.endDate) : null;
    return day >= start && (end === null || day <= end);
  });
}
