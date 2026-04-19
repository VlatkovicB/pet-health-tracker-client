# Calendar Height Redesign

**Date:** 2026-04-19
**Status:** Approved for implementation

## Goal

Make the calendar page use the full viewport height. Desktop cells are currently 44–72px tall, leaving most of the screen empty. Mobile shows unreadable tiny text ribbons.

## Decisions

| Question | Decision |
|---|---|
| Layout approach | Full-viewport flex grid (Option A) |
| Container | Drop `Container maxWidth="md"`, go full-width |
| Header/chips | Keep as-is — no compaction |
| Mobile view | Week strip + agenda list (Option B) |
| Mobile toggle | None — mobile always shows week view |

---

## Desktop

### Layout

`CalendarPage` switches from `Container maxWidth="md"` to:

```tsx
<Box sx={{ px: 2, pt: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
```

The `MonthCalendar` wrapper becomes:

```tsx
<Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
```

### Grid rows

The calendar grid uses `gridTemplateRows: \`repeat(\${numWeeks}, 1fr)\`` where `numWeeks` is computed from the month's day array (5 or 6). Rows share equal height, filling to the bottom of the viewport.

Day cells remove `minHeight` — height is dictated by the grid row.

### Event ribbons

`MAX_RIBBONS` increases from 3 to 5. With taller cells, 5 ribbons fit comfortably on most months.

### Legend bar

A compact legend row sits below the grid (flex-shrink: 0):
- Colored swatch + pet name for each pet
- Dashed swatch for scheduled visits
- Right-aligned hint: "Click any day for details"

---

## Mobile (`sm` breakpoint and below)

### Switching views

`CalendarPage` uses `const isMobile = useMediaQuery(theme.breakpoints.down('sm'))`. When `isMobile` is true, renders `<MobileCalendarView>` instead of `<MonthCalendar>`.

Both views receive the same props: `events`, `petColors`, `petNames`, `onDayClick`.

### New component: `MobileCalendarView`

File: `src/pages/calendar/MobileCalendarView.tsx`

**State:**
- `selectedDay: Date` — defaults to today
- `selectedWeekStart: Date` — start of current week (Monday), defaults to start of current week

**Layout (flex column, height: 100%):**

```
┌─────────────────────────────────┐
│ April 2026              ‹  ›    │  ← month/week nav — arrows step by week
│ [All] [● Mochi] [● Luna]        │  ← pet filter chips (unchanged)
│ Mo  Tu  We  Th  Fr  Sa  Su      │  ← day strip with dots
│ 13  14  15  16  17  18  19      │
├─────────────────────────────────┤
│ Today · Apr 19                  │  ← date label, bold
│                                 │
│ ╠══ Mochi · Vet visit           │  ← agenda items, scrollable
│    Wellness check · Dr. Park    │
│ ╠── Luna · Gabapentin           │
│    50mg · Twice daily           │
│  ...                            │
└─────────────────────────────────┘
```

**Week strip:**
- 7 columns, one per day of the selected week
- Each column: day letter (Mo/Tu/etc.), day number, colored dots
- Dot: 6×6px circle, pet color. Dashed-border dot = scheduled visit
- Active day: highlighted background (`primary.main` at 20% opacity), number in `primary.main`
- Tapping a day sets `selectedDay`; does NOT open the modal

**Navigation:**
- `‹ ›` arrows step `selectedWeekStart` by ±7 days (prev/next week)
- The header title shows the month of the selected week's first day

**Agenda list:**
- Scrollable `Box` with `flex: 1; overflowY: auto`
- Date label above: `"{Today/Tomorrow/Day name} · MMM d"` in bold
- One row per event on `selectedDay`, sorted: vet visits first, then medications
- Each row: pet-colored 3px left bar, title (`{petName} · {eventName}`), subtitle line, optional `Scheduled` chip for future visits
- Tapping a row calls `onDayClick(selectedDay, eventsForDay)` to open `DayDetailModal`
- Empty state: `"No events on this day"` centered, muted

**No modal for dot/day tap** — only agenda row taps open the modal.

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/calendar/CalendarPage.tsx` | Remove `Container`, add `height: 100vh` flex column, `useMediaQuery` branch |
| `src/pages/calendar/MonthCalendar.tsx` | Remove `minHeight`, add `gridTemplateRows`, bump `MAX_RIBBONS` to 5 |
| `src/pages/calendar/MobileCalendarView.tsx` | **New file** — week strip + agenda |

---

## Out of Scope

- No swipe gestures
- No animation between weeks
- No "jump to today" button
- Desktop month toggle on mobile
