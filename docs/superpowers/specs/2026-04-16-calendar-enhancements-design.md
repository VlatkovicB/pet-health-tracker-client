# Calendar Enhancements Design

**Date:** 2026-04-16  
**Status:** Approved

## Overview

Three targeted enhancements to the monthly calendar view:

1. Vet visit ribbons use each pet's assigned color instead of hardcoded blue/gray
2. Past unconfirmed (scheduled) vet visits show a red `!` badge to signal they need attention
3. The day detail modal includes an inline form to schedule a new vet visit on that date

---

## 1. Vet Visit Ribbon Colors

### Current behavior

`MonthCalendar.tsx` hardcodes ribbon colors for vet visits:
- Scheduled → `#457b9d` (blue)
- Logged/past → `#9e9e9e` (gray)

Medication ribbons already use `petColors[e.petId]`.

### New behavior

Vet visit ribbons use `petColors[petId]` with visual distinction by visit type:

| Visit type | Style |
|---|---|
| `scheduled` | Transparent background, 2px dashed border in `petColors[petId]`, text in `petColors[petId]` |
| `logged` | Solid fill in `petColors[petId]`, white text (same as medications) |

### Overdue indicator

A scheduled visit is **overdue** when `type === 'scheduled'` AND its date is before today (local midnight).

Overdue ribbons show a small red badge before the pet name:
- Shape: 12×12px filled circle, `#e63946`
- Content: `!` in white, 8px bold
- Position: inline-flex within the ribbon text, left of the pet name

Overdue check uses the existing `toLocalDate` helper to avoid UTC midnight timezone issues:
```ts
const isOverdue = e.type === 'scheduled' && toLocalDate(e.date) < startOfToday();
```

---

## 2. DayDetailModal — Schedule Vet Visit Form

### Props change

Add `pets: Pet[]` to `DayDetailModalProps`. `CalendarPage` already has `pets` in scope and passes it down.

### Form placement

A new "Schedule vet visit" section appears at the bottom of `DayDetailModal`, always visible (no toggle). It is separated from the events list by a `<Divider>`.

### Form fields

| Field | Type | Default |
|---|---|---|
| Pet | Chip row (one chip per pet) | None selected |
| Date | Read-only text display | The clicked day (formatted) |
| Reason | Optional text field | Empty |

The chip row uses the same `petColors` already available as a prop. Selecting a chip highlights it; only one pet can be selected at a time.

### Submission

On "Schedule visit" button click:
1. Validate: a pet must be selected (button disabled if none)
2. Call `healthApi.createVetVisit(selectedPetId, { visitDate: format(date, 'yyyy-MM-dd'), reason: reason.trim() || undefined })`
3. On success: invalidate `['calendar-vet-visits', monthKey]` query, show success notification, close the modal
4. On error: show error notification, keep the modal open

The `monthKey` is not directly available in `DayDetailModal` — pass an `onScheduled` callback from `CalendarPage` that handles invalidation and modal close, so the modal stays free of data concerns.

---

## Architecture

### Files changed

| File | Change |
|---|---|
| `src/pages/calendar/MonthCalendar.tsx` | Update ribbon color logic for vet visits; add overdue badge |
| `src/components/DayDetailModal.tsx` | Add `pets` prop, inline schedule form, `onScheduled` callback |
| `src/pages/calendar/CalendarPage.tsx` | Pass `pets` and `onScheduled` to `DayDetailModal` |

### No new files needed

All changes are isolated edits to three existing files.

---

## Edge Cases

- **No pets loaded yet:** The chip row renders empty; the form is still visible but the button stays disabled. This is a brief loading state and not worth special handling.
- **Single pet:** One chip is shown; user still must tap it to confirm intent before saving.
- **Date is today:** `toLocalDate(e.date) < startOfToday()` returns false, so no overdue badge — correct.
- **Multiple overdue visits on same day:** Each ribbon independently shows its badge.
