import { useMemo } from 'react';
import { Box, Typography, Skeleton, Alert } from '@mui/material';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, format,
} from 'date-fns';
import type { CalendarEvent } from '../../types';

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

interface MonthCalendarProps {
  month: Date;
  events: CalendarEvent[];
  petColors: Record<string, string>;
  petNames: Record<string, string>;
  loading?: boolean;
  error?: boolean;
  onEventClick: (event: CalendarEvent, anchor: HTMLElement) => void;
}

function buildGrid(month: Date): Date[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  return eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });
}

export function MonthCalendar({ month, events, petColors, petNames, loading, error, onEventClick }: MonthCalendarProps) {
  const days = useMemo(() => buildGrid(month), [month]);

  const vetVisitsByDay = useMemo(() => {
    const map: Record<string, (CalendarEvent & { kind: 'vet-visit' })[]> = {};
    events
      .filter((e): e is CalendarEvent & { kind: 'vet-visit' } => e.kind === 'vet-visit')
      .forEach((e) => {
        const key = e.date.slice(0, 10);
        (map[key] ??= []).push(e);
      });
    return map;
  }, [events]);

  const medications = useMemo(
    () => events.filter((e): e is CalendarEvent & { kind: 'medication' } => e.kind === 'medication'),
    [events],
  );

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
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />
          ))}
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const inMonth = isSameMonth(day, month);
            const today = isToday(day);
            const dayVisits = vetVisitsByDay[dateKey] ?? [];
            const visibleDots = dayVisits.slice(0, 3);
            const overflow = dayVisits.length - visibleDots.length;

            return (
              <Box
                key={dateKey}
                sx={{
                  minHeight: 44,
                  borderRadius: 1,
                  p: 0.5,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  bgcolor: today ? 'primary.main' : 'transparent',
                  opacity: inMonth ? 1 : 0.3,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: today ? 700 : 500,
                    color: today ? '#fff' : inMonth ? 'text.primary' : 'text.disabled',
                    lineHeight: 1.6,
                    fontSize: '0.75rem',
                  }}
                >
                  {format(day, 'd')}
                </Typography>
                {dayVisits.length > 0 && (
                  <Box sx={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center', mt: 0.25 }}>
                    {visibleDots.map((v) => (
                      <Box
                        key={v.id}
                        component="span"
                        onClick={(e) => onEventClick(v, e.currentTarget as HTMLElement)}
                        sx={{
                          width: 6, height: 6, borderRadius: '50%', cursor: 'pointer',
                          bgcolor: v.type === 'scheduled' ? '#457b9d' : 'text.disabled',
                          flexShrink: 0,
                        }}
                      />
                    ))}
                    {overflow > 0 && (
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: today ? '#fff' : 'text.secondary', lineHeight: 1 }}>
                        +{overflow}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Medication span bars */}
      {!loading && medications.length > 0 && (
        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {medications.map((med) => (
            <Box
              key={med.id}
              onClick={(e) => onEventClick(med, e.currentTarget as HTMLElement)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.75,
                bgcolor: petColors[med.petId] ?? 'primary.main',
                color: '#fff',
                borderRadius: 0.75,
                px: 1, py: 0.5,
                cursor: 'pointer',
                '&:hover': { filter: 'brightness(0.92)' },
              }}
            >
              <span>💊</span>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#fff', flex: 1, fontSize: '0.75rem' }} noWrap>
                {petNames[med.petId] ? `${petNames[med.petId]} · ` : ''}{med.name}
              </Typography>
              {med.hasReminder && <span style={{ fontSize: '0.8rem' }}>🔔</span>}
            </Box>
          ))}
        </Box>
      )}

      {/* Empty state */}
      {!loading && events.length === 0 && (
        <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', mt: 3, mb: 1 }}>
          No events this month
        </Typography>
      )}

      {/* Legend */}
      {!loading && (
        <Box sx={{ display: 'flex', gap: 2, mt: 1.5, px: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#457b9d' }} />
            <Typography variant="caption" color="text.secondary">Scheduled visit</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">Past visit</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
