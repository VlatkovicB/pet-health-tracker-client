import { useMemo } from 'react';
import { Box, Typography, Skeleton, Alert } from '@mui/material';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, format, startOfToday,
} from 'date-fns';
import type { CalendarEvent } from '../../types';

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MAX_RIBBONS = 3;

interface MonthCalendarProps {
  month: Date;
  events: CalendarEvent[];
  petColors: Record<string, string>;
  petNames: Record<string, string>;
  loading?: boolean;
  error?: boolean;
  onDayClick: (date: Date, events: CalendarEvent[]) => void;
}

function buildGrid(month: Date): Date[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  return eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });
}

function toLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getEventsForDay(day: Date, events: CalendarEvent[]): CalendarEvent[] {
  const dateKey = format(day, 'yyyy-MM-dd');
  return events.filter((e) => {
    if (e.kind === 'vet-visit') return e.date.slice(0, 10) === dateKey;
    const start = toLocalDate(e.startDate);
    const end = e.endDate ? toLocalDate(e.endDate) : null;
    return day >= start && (end === null || day <= end);
  });
}

export function MonthCalendar({ month, events, petColors, petNames, loading, error, onDayClick }: MonthCalendarProps) {
  const days = useMemo(() => buildGrid(month), [month]);

  if (error) {
    return <Alert severity="error" sx={{ mx: { xs: 2, sm: 3 }, mt: 1 }}>Failed to load calendar data.</Alert>;
  }

  return (
    <Box sx={{ px: { xs: 1, sm: 2 } }}>
      {/* Day-of-week headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
        {DAY_HEADERS.map((d) => (
          <Typography key={d} variant="caption" sx={{ textAlign: 'center', color: 'text.disabled', fontWeight: 600, py: 0.5 }}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* Calendar grid */}
      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={80} />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          {days.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const inMonth = isSameMonth(day, month);
            const today = isToday(day);
            const dayEvents = getEventsForDay(day, events);
            const visible = dayEvents.slice(0, MAX_RIBBONS);
            const overflow = dayEvents.length - visible.length;
            const col = idx % 7;
            const row = Math.floor(idx / 7);

            return (
              <Box
                key={dateKey}
                onClick={() => onDayClick(day, dayEvents)}
                sx={{
                  minHeight: 80,
                  p: 0.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  cursor: 'pointer',
                  bgcolor: today ? 'primary.light' : 'background.paper',
                  opacity: inMonth ? 1 : 0.4,
                  borderRight: col < 6 ? '1px solid' : 'none',
                  borderBottom: row < Math.floor((days.length - 1) / 7) ? '1px solid' : 'none',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: today ? 'primary.light' : 'action.hover' },
                  transition: 'background-color 0.1s',
                }}
              >
                {/* Day number */}
                <Box sx={{ alignSelf: 'flex-start' }}>
                  <Box
                    sx={{
                      width: 22, height: 22,
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: today ? 'primary.main' : 'transparent',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: today ? 700 : 500,
                        color: today ? '#fff' : 'text.primary',
                        fontSize: '0.72rem',
                        lineHeight: 1,
                      }}
                    >
                      {format(day, 'd')}
                    </Typography>
                  </Box>
                </Box>

                {/* Event ribbons */}
                {visible.map((e) => {
                  const isVet = e.kind === 'vet-visit';
                  const petColor = petColors[e.petId] ?? '#888';

                  const isOverdue = isVet && e.type === 'scheduled' && toLocalDate(e.date) < startOfToday();
                  const isScheduled = isVet && e.type === 'scheduled';

                  const label = isVet ? (petNames[e.petId] ?? 'Vet') : e.name;

                  return (
                    <Box
                      key={e.id}
                      sx={{
                        borderRadius: 0.5,
                        px: 0.5,
                        py: '1px',
                        overflow: 'hidden',
                        ...(isScheduled
                          ? {
                              bgcolor: 'transparent',
                              border: `2px dashed ${petColor}`,
                            }
                          : {
                              bgcolor: petColor,
                            }),
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      {isOverdue && (
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: '#e63946',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Typography sx={{ color: '#fff', fontSize: '0.5rem', fontWeight: 900, lineHeight: 1 }}>!</Typography>
                        </Box>
                      )}
                      {e.kind === 'medication' && e.hasReminder && (
                        <Typography variant="caption" sx={{ fontSize: '0.62rem', lineHeight: 1.4 }}>🔔</Typography>
                      )}
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{
                          color: isScheduled ? petColor : '#fff',
                          fontSize: '0.62rem',
                          fontWeight: 600,
                          display: 'block',
                          lineHeight: 1.4,
                        }}
                      >
                        {label}
                      </Typography>
                    </Box>
                  );
                })}

                {overflow > 0 && (
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', pl: 0.25, lineHeight: 1.4 }}>
                    +{overflow} more
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Empty state */}
      {!loading && events.length === 0 && (
        <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', mt: 3, mb: 1 }}>
          No events this month
        </Typography>
      )}
    </Box>
  );
}
