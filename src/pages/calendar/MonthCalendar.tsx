import { useMemo } from 'react';
import { Box, Typography, Skeleton, Alert, useTheme } from '@mui/material';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, format, startOfToday,
} from 'date-fns';
import type { CalendarEvent } from '../../types';
import { toLocalDate, getEventsForDay } from './calendarUtils';

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MAX_RIBBONS = 4;

interface MonthCalendarProps {
  month: Date;
  events: CalendarEvent[];
  petColors: Record<string, string>;
  petNames: Record<string, string>;
  loading?: boolean;
  error?: boolean;
  showInactiveMeds?: boolean;
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

export function MonthCalendar({
  month, events, petColors, petNames, loading, error, showInactiveMeds, onDayClick,
}: MonthCalendarProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const days = useMemo(() => buildGrid(month), [month]);

  if (error) {
    return <Alert severity="error" sx={{ mx: { xs: 2, sm: 3 }, mt: 1 }}>Failed to load calendar data.</Alert>;
  }

  return (
    <Box sx={{ px: { xs: 1, sm: 2 }, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${Math.round(days.length / 7)}, 1fr)`, gap: '1px', flex: 1, minHeight: 0 }}>
          {Array.from({ length: days.length }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" sx={{ height: '100%' }} />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridTemplateRows: `repeat(${Math.round(days.length / 7)}, 1fr)`,
            flex: 1,
            minHeight: 0,
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

            const vetEvents = dayEvents.filter((e) => e.kind === 'vet-visit');
            const medEvents = dayEvents.filter((e) => e.kind === 'medication');
            const visibleMedDots = showInactiveMeds
              ? medEvents
              : medEvents.filter((e) => e.kind === 'medication' && e.active);

            const visibleRibbons = vetEvents.slice(0, MAX_RIBBONS);
            const overflow = vetEvents.length - visibleRibbons.length;

            const col = idx % 7;
            const row = Math.floor(idx / 7);

            return (
              <Box
                key={dateKey}
                onClick={() => onDayClick(day, dayEvents)}
                sx={{
                  p: '5px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  cursor: 'pointer',
                  bgcolor: today ? (isDark ? '#3d3580' : '#ede9fe') : 'background.paper',
                  borderRadius: 1,
                  opacity: inMonth ? 1 : 0.3,
                  borderRight: col < 6 ? '1px solid' : 'none',
                  borderBottom: row < Math.floor((days.length - 1) / 7) ? '1px solid' : 'none',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: isDark ? '#2d2a50' : '#f5f3ff' },
                  transition: 'background 0.12s',
                }}
              >
                {/* Day number */}
                <Typography
                  sx={{
                    fontSize: '0.6875rem',
                    fontWeight: today ? 900 : 800,
                    color: today ? 'primary.main' : 'text.primary',
                    lineHeight: 1,
                    mb: '3px',
                  }}
                >
                  {format(day, 'd')}
                </Typography>

                {/* Vet visit ribbons */}
                {visibleRibbons.map((e) => {
                  if (e.kind !== 'vet-visit') return null;
                  const petColor = petColors[e.petId] ?? '#888';
                  const isOverdue = e.type === 'scheduled' && toLocalDate(e.date) < startOfToday();
                  const isScheduled = e.type === 'scheduled';

                  return (
                    <Box
                      key={e.id}
                      sx={{
                        borderRadius: '4px',
                        px: '3px',
                        py: '1px',
                        overflow: 'hidden',
                        mb: '1px',
                        ...(isScheduled
                          ? { bgcolor: `${petColor}33`, border: `2px dashed ${petColor}` }
                          : { bgcolor: petColor }),
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      {isOverdue && (
                        <Box
                          sx={{
                            width: 12, height: 12, borderRadius: '50%', bgcolor: '#e63946',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}
                        >
                          <Typography sx={{ color: '#fff', fontSize: '0.5625rem', fontWeight: 900, lineHeight: 1 }}>!</Typography>
                        </Box>
                      )}
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{
                          borderRadius: '4px', px: '3px', py: '1px',
                          fontSize: '0.625rem', fontWeight: 800,
                          color: isScheduled ? petColor : 'white',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          mb: '1px', display: 'block', lineHeight: 1.4,
                        }}
                      >
                        {petNames[e.petId] ?? 'Vet'}
                      </Typography>
                    </Box>
                  );
                })}

                {overflow > 0 && (
                  <Typography variant="caption" sx={{ fontSize: '0.625rem', color: 'text.secondary', pl: 0.25, lineHeight: 1.4 }}>
                    +{overflow} more
                  </Typography>
                )}

                {/* Medication dots */}
                {visibleMedDots.length > 0 && (
                  <Box sx={{ display: 'flex', gap: '3px', flexWrap: 'wrap', mt: 'auto', pt: '2px' }}>
                    {visibleMedDots.map((e) => {
                      const petColor = petColors[e.petId] ?? '#888';
                      const isInactive = e.kind === 'medication' && !e.active;
                      return (
                        <Box
                          key={e.id}
                          sx={{
                            width: 7, height: 7, borderRadius: '50%',
                            bgcolor: petColor,
                            opacity: isInactive ? 0.35 : 1,
                            flexShrink: 0,
                          }}
                        />
                      );
                    })}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Legend */}
      {!loading && events.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center', pt: 0.75, pb: 0.25, px: 0.5 }}>
          {Object.entries(petColors).map(([petId, color]) => (
            <Box key={petId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: color, flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', fontWeight: 600 }}>
                {petNames[petId] ?? petId}
              </Typography>
            </Box>
          ))}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '3px', border: '2px dashed', borderColor: 'primary.main', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', fontWeight: 600 }}>Scheduled visit</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', fontWeight: 600 }}>Medication</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', ml: 'auto' }}>
            Click any day for details
          </Typography>
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
