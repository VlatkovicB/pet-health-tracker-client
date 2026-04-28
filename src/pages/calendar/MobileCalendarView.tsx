import { useState, useMemo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  format, startOfToday, startOfWeek, addDays, isToday, isSameDay,
} from 'date-fns';
import { PetFilterChips } from './PetFilterChips';
import { getEventsForDay, toLocalDate } from './calendarUtils';
import type { CalendarEvent, Pet } from '../../types';

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

interface MobileCalendarViewProps {
  events: CalendarEvent[];
  petColors: Record<string, string>;
  petNames: Record<string, string>;
  pets: Pet[];
  selectedPetId: string | null;
  onPetChange: (petId: string | null) => void;
  loading?: boolean;
  error?: boolean;
  showInactiveMeds?: boolean;
  onToggleInactiveMeds?: () => void;
  onDayClick: (date: Date, events: CalendarEvent[]) => void;
  sharedPetIds?: Set<string>;
  visibleKinds: Set<CalendarEvent['kind']>;
  onToggleKind: (kind: CalendarEvent['kind']) => void;
}

function agendaDateLabel(day: Date): string {
  if (isToday(day)) return 'Today';
  if (isSameDay(day, addDays(startOfToday(), 1))) return 'Tomorrow';
  return format(day, 'EEEE');
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  const order: Record<CalendarEvent['kind'], number> = {
    birthday: 0,
    'vet-visit': 1,
    medication: 2,
    note: 3,
  };
  return [...events].sort((a, b) => (order[a.kind] ?? 4) - (order[b.kind] ?? 4));
}

export function MobileCalendarView({
  events, petColors, petNames, pets, selectedPetId, onPetChange,
  loading, error, showInactiveMeds, onToggleInactiveMeds, onDayClick, sharedPetIds,
  visibleKinds, onToggleKind,
}: MobileCalendarViewProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfToday());
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(startOfToday(), { weekStartsOn: 1 })
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const currentWeekStart = useMemo(
    () => startOfWeek(startOfToday(), { weekStartsOn: 1 }),
    []
  );
  const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime();
  const dayEvents = getEventsForDay(selectedDay, events);
  const visibleDayEvents = dayEvents.filter((e) =>
    e.kind === 'note' || e.kind === 'birthday' || e.kind === 'vet-visit' ||
    (e.kind === 'medication' && (showInactiveMeds || e.active))
  );
  const sortedEvents = sortEvents(visibleDayEvents);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, px: 0.5, pt: 0.5 }}>
      {/* Header: month label + week navigation arrows */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75, px: 0.5 }}>
        <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.5px', color: 'text.primary' }}>
          {format(weekStart, 'MMMM yyyy')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          <Box
            onClick={() => { const next = addDays(weekStart, -7); setWeekStart(next); setSelectedDay(next); }}
            sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'primary.main', fontWeight: 900, fontSize: '1rem', userSelect: 'none', '&:hover': { bgcolor: isDark ? '#3d3580' : '#ede9fe' } }}
          >‹</Box>
          <Box
            onClick={() => { if (!isCurrentWeek) { setWeekStart(currentWeekStart); setSelectedDay(startOfToday()); } }}
            sx={{
              px: 1.25, height: 30, borderRadius: 1.5, bgcolor: 'background.paper',
              border: '1.5px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isCurrentWeek ? 'default' : 'pointer',
              color: 'primary.main', fontWeight: 800, fontSize: '0.72rem',
              userSelect: 'none', opacity: isCurrentWeek ? 0.4 : 1,
              ...(!isCurrentWeek && { '&:hover': { bgcolor: isDark ? '#3d3580' : '#ede9fe' } }),
            }}
          >Today</Box>
          <Box
            onClick={() => { const next = addDays(weekStart, 7); setWeekStart(next); setSelectedDay(next); }}
            sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'primary.main', fontWeight: 900, fontSize: '1rem', userSelect: 'none', '&:hover': { bgcolor: isDark ? '#3d3580' : '#ede9fe' } }}
          >›</Box>
        </Box>
      </Box>

      {/* Pet filter chips */}
      <PetFilterChips
        pets={pets}
        petColors={petColors}
        selectedPetId={selectedPetId}
        onChange={onPetChange}
        showInactiveMeds={showInactiveMeds}
        onToggleInactiveMeds={onToggleInactiveMeds}
        sharedPetIds={sharedPetIds}
        visibleKinds={visibleKinds}
        onToggleKind={onToggleKind}
      />

      {/* 7-day week strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mt: 1, mb: 1, flexShrink: 0 }}>
        {weekDays.map((day, i) => {
          const active = isSameDay(day, selectedDay);
          const today = isToday(day);
          const allDayEvents = getEventsForDay(day, events);
          const dots = allDayEvents.filter((e) =>
            e.kind === 'note' || e.kind === 'birthday' || e.kind === 'vet-visit' ||
            (e.kind === 'medication' && (showInactiveMeds || e.active))
          );
          return (
            <Box
              key={format(day, 'yyyy-MM-dd')}
              onClick={() => setSelectedDay(day)}
              sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                py: 0.75, px: 0.25, borderRadius: 1.5, cursor: 'pointer',
                bgcolor: active ? (isDark ? '#3d3580' : '#ede9fe') : 'transparent',
                '&:hover': { bgcolor: isDark ? '#2d2a50' : '#f5f3ff' },
                transition: 'background 0.1s',
              }}
            >
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'text.disabled', lineHeight: 1 }}>
                {DAY_LABELS[i]}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: today ? 900 : 800, color: active || today ? 'primary.main' : 'text.primary', lineHeight: 1 }}>
                {format(day, 'd')}
              </Typography>
              {/* Event dots — solid circle per event, dashed for scheduled visit */}
              <Box sx={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center', minHeight: 7 }}>
                {dots.slice(0, 3).map((e) => {
                  const color = e.kind === 'note'
                    ? '#888'
                    : e.kind === 'birthday'
                    ? '#f59e0b'
                    : (petColors[e.petId] ?? '#888');
                  const isScheduled = e.kind === 'vet-visit' && e.type === 'scheduled';
                  const key = e.kind === 'note'
                    ? `note-${e.note.id}`
                    : e.kind === 'birthday'
                    ? `birthday-${e.petId}`
                    : e.id;
                  return (
                    <Box
                      key={key}
                      sx={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        ...(isScheduled
                          ? { border: `1.5px dashed ${color}`, bgcolor: 'transparent' }
                          : { bgcolor: color }),
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Date label above agenda */}
      <Typography sx={{ fontWeight: 800, fontSize: '0.78rem', color: 'text.secondary', mb: 0.75, px: 0.5, flexShrink: 0 }}>
        {agendaDateLabel(selectedDay)} · {format(selectedDay, 'MMM d')}
      </Typography>

      {/* Agenda list — scrollable, fills remaining height */}
      <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.75, minHeight: 0, pb: 1 }}>
        {loading ? (
          <Typography sx={{ color: 'text.disabled', fontSize: '0.8rem', textAlign: 'center', mt: 3 }}>
            Loading…
          </Typography>
        ) : error ? (
          <Typography sx={{ color: 'error.main', fontSize: '0.8rem', textAlign: 'center', mt: 3 }}>
            Failed to load events.
          </Typography>
        ) : sortedEvents.length === 0 ? (
          <Typography sx={{ color: 'text.disabled', fontSize: '0.8rem', textAlign: 'center', mt: 3 }}>
            No events on this day
          </Typography>
        ) : (
          sortedEvents.map((e) => {
            const color = e.kind === 'note'
              ? '#888'
              : e.kind === 'birthday'
              ? '#f59e0b'
              : (petColors[e.petId] ?? '#888');
            const isScheduled = e.kind === 'vet-visit' && e.type === 'scheduled';
            const isOverdue = e.kind === 'vet-visit' && e.type === 'scheduled' && toLocalDate(e.date) < startOfToday();
            const title = e.kind === 'note'
              ? e.note.title
              : e.kind === 'birthday'
              ? `🎂 ${petNames[e.petId] ?? 'Pet'}'s Birthday`
              : e.kind === 'vet-visit'
              ? `${petNames[e.petId] ?? 'Pet'} · Vet visit`
              : `${petNames[e.petId] ?? 'Pet'} · ${e.name}`;
            const subtitle = e.kind === 'note'
              ? (e.note.description ?? '')
              : e.kind === 'birthday'
              ? `Turning ${e.age} year${e.age !== 1 ? 's' : ''} old`
              : e.kind === 'vet-visit'
              ? [e.reason, e.vetName].filter(Boolean).join(' · ')
              : `${e.dosageLabel} · ${e.frequencyLabel}${e.hasReminder ? ' 🔔' : ''}`;
            const key = e.kind === 'note'
              ? `note-${e.note.id}`
              : e.kind === 'birthday'
              ? `birthday-${e.petId}`
              : e.id;

            return (
              <Box
                key={key}
                onClick={() => onDayClick(selectedDay, getEventsForDay(selectedDay, events))}
                sx={{
                  display: 'flex', gap: 1, alignItems: 'stretch',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: isScheduled ? color : 'divider',
                  borderStyle: isScheduled ? 'dashed' : 'solid',
                  borderRadius: 1.5,
                  p: 1.25,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: isDark ? '#1e1b35' : '#f5f3ff' },
                  flexShrink: 0,
                }}
              >
                <Box sx={{ width: 3, borderRadius: 2, bgcolor: color, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: 'text.primary' }}>
                      {title}
                    </Typography>
                    {isScheduled && (
                      <Box sx={{ borderRadius: 1, bgcolor: isOverdue ? '#e6394622' : `${color}22`, border: '1px solid', borderColor: isOverdue ? '#e63946' : color, px: 0.5, py: '1px' }}>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: isOverdue ? '#e63946' : color, lineHeight: 1.3 }}>
                          {isOverdue ? 'Overdue' : 'Scheduled'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  {subtitle ? (
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.25 }}>
                      {subtitle}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}
