# Today Button — Calendar Design Spec

**Date:** 2026-04-19

## Problem

When a user navigates away from the current month (desktop) or week (mobile), there is no quick way to return to today's date. They must click `‹` or `›` repeatedly to get back.

## Decision

Add a **Today** button sandwiched between the existing navigation arrows: `‹ Today ›`.

- When the user is already on the current period (month on desktop, week on mobile): button is **dimmed** (`opacity: 0.4`, `cursor: default`) — signals "you're already here."
- When the user has navigated away: button is **fully active**, same style as the arrows.

---

## Desktop — `CalendarPage.tsx`

**Location:** Header row (lines ~188–198), between the `‹` and `›` Box elements.

**Logic:**
```ts
const isCurrentMonth = isSameMonth(currentMonth, new Date())
```

**On click:**
```ts
setCurrentMonth(startOfMonth(new Date()))
setSelectedDay(null)
```

**Styling:** Match the existing arrow boxes — `bgcolor: 'background.paper'`, `border: '1.5px solid'`, `borderColor: 'divider'`, `borderRadius: 1.5`, `color: 'primary.main'`, `fontWeight: 800`, `fontSize: '0.72rem'`. Padding `5px 12px` (wider than the arrow boxes). When `isCurrentMonth`: `opacity: 0.4`, `cursor: 'default'`, no hover effect.

---

## Mobile — `MobileCalendarView.tsx`

**Location:** Header row (lines ~59–69), between the `‹` and `›` boxes.

**Logic:**
```ts
const currentWeekStart = startOfWeek(startOfToday(), { weekStartsOn: 1 })
const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime()
```

**On click:**
```ts
const today = startOfToday()
setWeekStart(startOfWeek(today, { weekStartsOn: 1 }))
setSelectedDay(today)
```

**Styling:** Same as desktop variant. When `isCurrentWeek`: `opacity: 0.4`, `cursor: 'default'`, no click handler fires.

---

## Out of Scope

- No animation or transition beyond what the existing arrow buttons have.
- No tooltip.
- No changes to `DayDetailModal`, data fetching, or query invalidation.
