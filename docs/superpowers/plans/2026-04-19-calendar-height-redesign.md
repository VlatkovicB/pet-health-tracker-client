# Calendar Height Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the calendar fill the full viewport height on desktop (flex grid with equal rows) and render a week strip + agenda list on mobile.

**Architecture:** CalendarPage becomes a `height: 100vh` flex column (with mobile nav offset). MonthCalendar fills remaining height via CSS grid with `gridTemplateRows: repeat(N, 1fr)`. On mobile (below `md` breakpoint — matching Layout's nav switch), `MobileCalendarView` replaces the month grid with a 7-day week strip and scrollable agenda list. Both views share the same `CalendarEvent[]` data from CalendarPage. Note: spec says `sm` breakpoint but Layout switches nav at `md` — this plan uses `md` to avoid a mixed-nav state.

**Tech Stack:** React 18, MUI v9, date-fns v4, TanStack React Query, TypeScript, pnpm

---

## File Map

| File | Change |
|---|---|
| `src/pages/calendar/MonthCalendar.tsx` | Export `toLocalDate` + `getEventsForDay`; bump MAX_RIBBONS → 5; outer Box flex-fill; grid gets `gridTemplateRows`; cells lose `minHeight`; legend bar added |
| `src/pages/calendar/MobileCalendarView.tsx` | **New** — week strip + agenda list with internal week navigation |
| `src/pages/calendar/CalendarPage.tsx` | Remove `Container` → `Box` with `height: 100vh`; add `useTheme`/`useMediaQuery`; conditionally render desktop vs mobile view |

---

### Task 1: Export helpers from MonthCalendar + bump MAX_RIBBONS

**Files:**
- Modify: `src/pages/calendar/MonthCalendar.tsx`

- [ ] **Step 1: Export `toLocalDate` and `getEventsForDay`**

In `src/pages/calendar/MonthCalendar.tsx`, add `export` to both helper functions (they are currently private):

```tsx
// Before:
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

// After — add export to both:
export function toLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getEventsForDay(day: Date, events: CalendarEvent[]): CalendarEvent[] {
  const dateKey = format(day, 'yyyy-MM-dd');
  return events.filter((e) => {
    if (e.kind === 'vet-visit') return e.date.slice(0, 10) === dateKey;
    const start = toLocalDate(e.startDate);
    const end = e.endDate ? toLocalDate(e.endDate) : null;
    return day >= start && (end === null || day <= end);
  });
}
```

- [ ] **Step 2: Bump MAX_RIBBONS from 3 to 5**

```tsx
// Before:
const MAX_RIBBONS = 3;

// After:
const MAX_RIBBONS = 5;
```

- [ ] **Step 3: Verify build**

```bash
cd ~/projects/pet-health-tracker-client && pnpm build
```

Expected: exits 0 with no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/calendar/MonthCalendar.tsx
git commit -m "feat: export calendar helpers, bump MAX_RIBBONS to 5"
```

---

### Task 2: Make MonthCalendar fill remaining viewport height

**Files:**
- Modify: `src/pages/calendar/MonthCalendar.tsx`

- [ ] **Step 1: Make the outer wrapper a flex column**

Find the outer `<Box sx={{ px: { xs: 1, sm: 2 } }}>` (first element returned by `MonthCalendar`, wrapping everything below the error Alert). Add flex properties:

```tsx
// Before:
<Box sx={{ px: { xs: 1, sm: 2 } }}>

// After:
<Box sx={{ px: { xs: 1, sm: 2 }, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
```

- [ ] **Step 2: Make the calendar grid flex-fill with equal-height rows**

Find the `<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid', ... }}>` (the day cell grid, NOT the day-headers row). Replace its `sx`:

```tsx
// Before:
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

// After:
<Box
  sx={{
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gridTemplateRows: `repeat(${days.length / 7}, 1fr)`,
    flex: 1,
    minHeight: 0,
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    overflow: 'hidden',
  }}
>
```

`days.length / 7` is always 5 or 6 — `buildGrid` always produces complete weeks.

- [ ] **Step 3: Remove `minHeight` from day cells**

Find the day cell Box (the one with `minHeight: { xs: 44, md: 72 }`). Remove only the `minHeight` line. Leave all other sx properties untouched:

```tsx
// Remove this line from the day cell sx:
minHeight: { xs: 44, md: 72 },
```

- [ ] **Step 4: Add legend bar after the grid**

After the closing `</Box>` of the calendar grid and before the empty-state `<Typography>`, insert:

```tsx
{/* Legend */}
{!loading && (
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
      <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', fontWeight: 600 }}>Scheduled</Typography>
    </Box>
    <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', ml: 'auto' }}>
      Click any day for details
    </Typography>
  </Box>
)}
```

`petColors` and `petNames` are already available as props in `MonthCalendar`.

- [ ] **Step 5: Verify build**

```bash
cd ~/projects/pet-health-tracker-client && pnpm build
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/pages/calendar/MonthCalendar.tsx
git commit -m "feat: MonthCalendar fills viewport height with equal grid rows and legend"
```

---

### Task 3: Create MobileCalendarView

**Files:**
- Create: `src/pages/calendar/MobileCalendarView.tsx`

- [ ] **Step 1: Create the file with complete implementation**

Create `src/pages/calendar/MobileCalendarView.tsx`:

```tsx
import { useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  format, startOfToday, startOfWeek, addDays, isToday, isSameDay,
} from 'date-fns';
import { PetFilterChips } from './PetFilterChips';
import { getEventsForDay, toLocalDate } from './MonthCalendar';
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
  onDayClick: (date: Date, events: CalendarEvent[]) => void;
}

function agendaDateLabel(day: Date): string {
  if (isToday(day)) return 'Today';
  if (isSameDay(day, addDays(startOfToday(), 1))) return 'Tomorrow';
  return format(day, 'EEEE');
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.kind === b.kind) return 0;
    return a.kind === 'vet-visit' ? -1 : 1;
  });
}

export function MobileCalendarView({
  events, petColors, petNames, pets, selectedPetId, onPetChange, loading, error, onDayClick,
}: MobileCalendarViewProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfToday());
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(startOfToday(), { weekStartsOn: 1 })
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayEvents = getEventsForDay(selectedDay, events);
  const sortedEvents = sortEvents(dayEvents);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, px: 0.5, pt: 0.5 }}>
      {/* Header: month label + week navigation arrows */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75, px: 0.5 }}>
        <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.5px', color: 'text.primary' }}>
          {format(weekStart, 'MMMM yyyy')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {[['‹', () => setWeekStart((d) => addDays(d, -7))], ['›', () => setWeekStart((d) => addDays(d, 7))]] .map(([label, handler]) => (
            <Box
              key={label as string}
              onClick={handler as () => void}
              sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'primary.main', fontWeight: 900, fontSize: '1rem', userSelect: 'none', '&:hover': { bgcolor: isDark ? '#3d3580' : '#ede9fe' } }}
            >{label as string}</Box>
          ))}
        </Box>
      </Box>

      {/* Pet filter chips */}
      <PetFilterChips
        pets={pets}
        petColors={petColors}
        selectedPetId={selectedPetId}
        onChange={onPetChange}
      />

      {/* 7-day week strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mt: 1, mb: 1, flexShrink: 0 }}>
        {weekDays.map((day, i) => {
          const active = isSameDay(day, selectedDay);
          const today = isToday(day);
          const dots = getEventsForDay(day, events);
          return (
            <Box
              key={i}
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
                  const color = petColors[e.petId] ?? '#888';
                  const isScheduled = e.kind === 'vet-visit' && e.type === 'scheduled';
                  return (
                    <Box
                      key={e.id}
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
            const color = petColors[e.petId] ?? '#888';
            const isScheduled = e.kind === 'vet-visit' && e.type === 'scheduled';
            const isOverdue = e.kind === 'vet-visit' && e.type === 'scheduled' && toLocalDate(e.date) < startOfToday();
            const title = e.kind === 'vet-visit'
              ? `${petNames[e.petId] ?? 'Pet'} · Vet visit`
              : `${petNames[e.petId] ?? 'Pet'} · ${e.name}`;
            const subtitle = e.kind === 'vet-visit'
              ? [e.reason, e.vetName].filter(Boolean).join(' · ')
              : `${e.dosageLabel} · ${e.frequencyLabel}${e.hasReminder ? ' 🔔' : ''}`;

            return (
              <Box
                key={e.id}
                onClick={() => onDayClick(selectedDay, dayEvents)}
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
```

- [ ] **Step 2: Verify build**

```bash
cd ~/projects/pet-health-tracker-client && pnpm build
```

Expected: exits 0. If you get a "cannot find module" error for `./MonthCalendar`, confirm `toLocalDate` and `getEventsForDay` were exported in Task 1.

- [ ] **Step 3: Commit**

```bash
git add src/pages/calendar/MobileCalendarView.tsx
git commit -m "feat: add MobileCalendarView with week strip and agenda list"
```

---

### Task 4: Rebuild CalendarPage — viewport fill + mobile branch

**Files:**
- Modify: `src/pages/calendar/CalendarPage.tsx`

- [ ] **Step 1: Update imports**

Remove `Container` from the MUI import line and add `useTheme`, `useMediaQuery`. Add `MobileCalendarView` import:

```tsx
// Replace the existing MUI import line:
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';

// Add after the existing MonthCalendar import:
import { MobileCalendarView } from './MobileCalendarView';
```

- [ ] **Step 2: Add theme + isMobile inside the component**

Add two lines immediately after `const queryClient = useQueryClient();`:

```tsx
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
```

- [ ] **Step 3: Replace the entire return statement**

Replace everything from `return (` to the final `)` with:

```tsx
return (
  <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    height: { xs: 'calc(100vh - 56px)', md: '100vh' },
    overflow: 'hidden',
    px: { xs: 1, sm: 2 },
    pt: 1,
  }}>
    {isMobile ? (
      <MobileCalendarView
        events={visibleEvents}
        petColors={petColors}
        petNames={petNames}
        pets={pets}
        selectedPetId={selectedPetId}
        onPetChange={setSelectedPetId}
        loading={loading}
        error={error}
        onDayClick={(date, evts) => setSelectedDay({ date, events: evts })}
      />
    ) : (
      <>
        <PetFilterChips
          pets={pets}
          petColors={petColors}
          selectedPetId={selectedPetId}
          onChange={setSelectedPetId}
        />

        {/* Page header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, md: 3 }, pt: 2.5, pb: 1, flexShrink: 0 }}>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.25rem', md: '1.5rem' }, color: 'text.primary', letterSpacing: '-0.8px' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            <Box
              onClick={() => { setCurrentMonth((m) => subMonths(m, 1)); setSelectedDay(null); }}
              sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'primary.main', fontWeight: 900, fontSize: '1rem', userSelect: 'none', '&:hover': { bgcolor: (t) => t.palette.mode === 'dark' ? '#3d3580' : '#ede9fe' } }}
            >‹</Box>
            <Box
              onClick={() => { setCurrentMonth((m) => addMonths(m, 1)); setSelectedDay(null); }}
              sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'primary.main', fontWeight: 900, fontSize: '1rem', userSelect: 'none', '&:hover': { bgcolor: (t) => t.palette.mode === 'dark' ? '#3d3580' : '#ede9fe' } }}
            >›</Box>
          </Box>
        </Box>

        <MonthCalendar
          month={currentMonth}
          events={visibleEvents}
          petColors={petColors}
          petNames={petNames}
          loading={loading}
          error={error}
          onDayClick={(date, evts) => setSelectedDay({ date, events: evts })}
        />
      </>
    )}

    <DayDetailModal
      date={selectedDay?.date ?? null}
      events={selectedDay?.events ?? []}
      petNames={petNames}
      petColors={petColors}
      pets={pets}
      vets={vets}
      onClose={() => setSelectedDay(null)}
      onScheduled={() => {
        queryClient.invalidateQueries({ queryKey: ['calendar-vet-visits', monthKey] });
        setSelectedDay(null);
      }}
    />
  </Box>
);
```

Note: `height: { xs: 'calc(100vh - 56px)', md: '100vh' }` — 56px is MUI BottomNavigation's default height. The Layout already adds `pb: { xs: 8 }` to its content Box for scroll clearance, but since CalendarPage uses `overflow: hidden`, that padding has no effect here; the explicit calc is needed.

- [ ] **Step 4: Verify build**

```bash
cd ~/projects/pet-health-tracker-client && pnpm build
```

Expected: exits 0. Common errors to check:
- `events` shadow — the `onDayClick` arrow function parameter was renamed `evts` to avoid shadowing the outer `events` variable.
- `Container` still in import — remove it if the build complains about unused imports.

- [ ] **Step 5: Manual verification — desktop**

```bash
pnpm dev
```

Open http://localhost:5173 in a browser window (not device toolbar). Check:
- Calendar grid fills to the very bottom of the viewport
- No empty white space below the grid
- Legend bar is visible at the bottom (pet swatches + "Click any day for details")
- Month navigation ‹ › changes the month and grid redraws
- Pet filter chips filter correctly
- Clicking a day opens DayDetailModal

- [ ] **Step 6: Manual verification — mobile**

Open DevTools (F12) → toggle device toolbar → choose a phone preset (e.g. iPhone SE, 375×667). Reload. Check:
- Week strip shows Mon–Sun of the current week with colored dots
- Today's date is highlighted in primary color
- Tapping a different day in the strip highlights it and updates the agenda list below — modal does NOT open
- Agenda items show a pet-colored left bar, bold title, subtitle text
- Scheduled future visits show a "Scheduled" chip in the pet color
- Overdue scheduled visits show an "Overdue" chip in red
- Tapping an agenda item opens DayDetailModal
- The ‹ › arrows move to the previous/next week
- The month title updates when crossing a month boundary

- [ ] **Step 7: Commit**

```bash
git add src/pages/calendar/CalendarPage.tsx
git commit -m "feat: calendar page fills viewport, mobile shows week strip and agenda"
```
