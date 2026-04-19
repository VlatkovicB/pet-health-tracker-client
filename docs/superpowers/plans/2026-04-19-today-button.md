# Today Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dimming-aware Today button between the ‹ and › navigation arrows on both the desktop monthly calendar and the mobile weekly calendar.

**Architecture:** Two self-contained edits — one in `CalendarPage.tsx` (desktop header) and one in `MobileCalendarView.tsx` (mobile header). No new files, no new state, no API changes. The button renders dimmed when the user is already on the current period.

**Tech Stack:** React 19, TypeScript, MUI v6, date-fns v4

---

## File Map

| File | Change |
|------|--------|
| `src/pages/calendar/CalendarPage.tsx` | Insert Today box between ‹ and › in desktop header; compute `isCurrentMonth` |
| `src/pages/calendar/MobileCalendarView.tsx` | Insert Today box between ‹ and › in mobile header; compute `isCurrentWeek` |

---

### Task 1: Desktop Today button

**Files:**
- Modify: `src/pages/calendar/CalendarPage.tsx`

The header is at lines ~184–198. Add `isSameMonth` to the date-fns import, compute `isCurrentMonth`, then insert a Today box between the two arrow boxes.

- [ ] **Step 1: Add `isSameMonth` to the date-fns import**

Current import (line ~4):
```ts
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
```
Change to:
```ts
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
```

- [ ] **Step 2: Compute `isCurrentMonth` inside `CalendarPage`**

After line ~73 (`const monthEnd = endOfMonth(currentMonth);`), add:
```ts
const isCurrentMonth = isSameMonth(currentMonth, new Date());
```

- [ ] **Step 3: Insert the Today button between the arrow boxes**

Replace the nav arrow group (lines ~188–197):
```tsx
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
```
With:
```tsx
<Box sx={{ display: 'flex', gap: 0.75 }}>
  <Box
    onClick={() => { setCurrentMonth((m) => subMonths(m, 1)); setSelectedDay(null); }}
    sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'primary.main', fontWeight: 900, fontSize: '1rem', userSelect: 'none', '&:hover': { bgcolor: (t) => t.palette.mode === 'dark' ? '#3d3580' : '#ede9fe' } }}
  >‹</Box>
  <Box
    onClick={() => { if (!isCurrentMonth) { setCurrentMonth(startOfMonth(new Date())); setSelectedDay(null); } }}
    sx={{
      px: 1.25, height: 32, borderRadius: 1.5, bgcolor: 'background.paper',
      border: '1.5px solid', borderColor: 'divider',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: isCurrentMonth ? 'default' : 'pointer',
      color: 'primary.main', fontWeight: 800, fontSize: '0.72rem',
      userSelect: 'none', opacity: isCurrentMonth ? 0.4 : 1,
      ...(!isCurrentMonth && { '&:hover': { bgcolor: (t: any) => t.palette.mode === 'dark' ? '#3d3580' : '#ede9fe' } }),
    }}
  >Today</Box>
  <Box
    onClick={() => { setCurrentMonth((m) => addMonths(m, 1)); setSelectedDay(null); }}
    sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'primary.main', fontWeight: 900, fontSize: '1rem', userSelect: 'none', '&:hover': { bgcolor: (t) => t.palette.mode === 'dark' ? '#3d3580' : '#ede9fe' } }}
  >›</Box>
</Box>
```

- [ ] **Step 4: Verify the dev server compiles without errors**

```bash
pnpm dev
```
Expected: no TypeScript errors in the terminal. Open the calendar page — you should see `‹ Today ›` in the header.

- [ ] **Step 5: Manual smoke test**

1. Confirm Today is dimmed (opacity 0.4) when viewing the current month.
2. Click `›` to navigate to next month. Confirm Today becomes fully opaque with a hover effect.
3. Click Today. Confirm the calendar jumps back to the current month and Today dims again.

- [ ] **Step 6: Commit**

```bash
git add src/pages/calendar/CalendarPage.tsx
git commit -m "feat: add Today button to desktop calendar header"
```

---

### Task 2: Mobile Today button

**Files:**
- Modify: `src/pages/calendar/MobileCalendarView.tsx`

The mobile header arrow group is at lines ~59–69. Add `startOfToday`, `startOfWeek` is already imported. Compute `isCurrentWeek`, then insert the Today box.

- [ ] **Step 1: Verify `startOfToday` and `startOfWeek` are imported**

Current import (line ~4):
```ts
import {
  format, startOfToday, startOfWeek, addDays, isToday, isSameDay,
} from 'date-fns';
```
Both are already present — no import change needed.

- [ ] **Step 2: Compute `isCurrentWeek` inside `MobileCalendarView`**

After the `weekDays` declaration (line ~48), add:
```ts
const isCurrentWeek = weekStart.getTime() === startOfWeek(startOfToday(), { weekStartsOn: 1 }).getTime();
```

- [ ] **Step 3: Replace the arrow group with ‹ Today ›**

Replace the existing arrow group (lines ~59–69):
```tsx
<Box sx={{ display: 'flex', gap: 0.75 }}>
  {[
    ['‹', () => { const next = addDays(weekStart, -7); setWeekStart(next); setSelectedDay(next); }],
    ['›', () => { const next = addDays(weekStart, 7); setWeekStart(next); setSelectedDay(next); }],
  ].map(([label, handler]) => (
    <Box
      key={label as string}
      onClick={handler as () => void}
      sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'primary.main', fontWeight: 900, fontSize: '1rem', userSelect: 'none', '&:hover': { bgcolor: isDark ? '#3d3580' : '#ede9fe' } }}
    >{label as string}</Box>
  ))}
</Box>
```
With:
```tsx
<Box sx={{ display: 'flex', gap: 0.75 }}>
  <Box
    onClick={() => { const next = addDays(weekStart, -7); setWeekStart(next); setSelectedDay(next); }}
    sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'primary.main', fontWeight: 900, fontSize: '1rem', userSelect: 'none', '&:hover': { bgcolor: isDark ? '#3d3580' : '#ede9fe' } }}
  >‹</Box>
  <Box
    onClick={() => { if (!isCurrentWeek) { const today = startOfToday(); setWeekStart(startOfWeek(today, { weekStartsOn: 1 })); setSelectedDay(today); } }}
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
```

- [ ] **Step 4: Verify the dev server compiles without errors**

```bash
pnpm dev
```
Expected: no TypeScript errors. On mobile viewport (or browser devtools narrow mode), open the calendar — you should see `‹ Today ›` in the mobile header.

- [ ] **Step 5: Manual smoke test**

1. Confirm Today is dimmed when viewing the current week.
2. Tap `›` to advance to next week. Confirm Today becomes active.
3. Tap Today. Confirm the week strip snaps back to the current week, and today's day is selected and highlighted in the strip.

- [ ] **Step 6: Commit**

```bash
git add src/pages/calendar/MobileCalendarView.tsx
git commit -m "feat: add Today button to mobile calendar header"
```

---

### Task 3: Push

- [ ] **Push both commits**

```bash
git push
```
