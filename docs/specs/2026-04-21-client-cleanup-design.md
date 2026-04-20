# Client Cleanup — Design Spec
**Date:** 2026-04-21

## Overview

Five isolated bug/UX fixes to pet-health-tracker-client. No API changes required.

---

## 1. Medication Active Switch

**Problem:** The inline `Switch` in `PetDetailPage.tsx` only calls `e.stopPropagation()` on change — it never persists the toggle.

**Fix:**
- Add an `updateActiveMutation` (or reuse a shared update hook) in `PetDetailPage` that calls `medicationsApi.update(petId, med.id, { active: !med.active })`
- On success: invalidate `['medications', petId]`
- The switch `onChange` calls `e.stopPropagation()` then fires the mutation
- Show no loading state (optimistic is fine given the small toggle)

---

## 2. Vet Visit Completion — No Confirm Step

**Problem:** `ScheduledVisitDetailDialog` has a two-step "Mark as done → notes → Confirm done" flow. User wants a single action.

**Fix:**
- Remove `markingDone` state and `doneNotes` field entirely
- "Mark as done" button directly calls `completeMutation.mutate()`
- Button shows "Saving…" while pending, disabled during mutation
- Remove "Confirm done" and "Back" buttons from `DialogActions`
- Keep "Close" as the only non-action button

---

## 3. Calendar Medication Display — Dot Indicators

**Problem:** Medications currently render as per-day ribbon events (same style as vet visits), creating visual noise for daily ongoing meds.

**Design:** Replace with dot row at the bottom of each calendar cell.

### Changes

**`CalendarPage.tsx`**
- Add `showInactiveMeds: boolean` state (default `false`)
- Pass `showInactiveMeds` to `MonthCalendar` and `MobileCalendarView`
- In `toCalendarEvents`: keep generating `kind: 'medication'` events as before (used by day detail modal)
- Add separate `activeMedications` / `allMedications` distinction for dot rendering

**`PetFilterChips.tsx`**
- Add a "Show inactive meds" toggle chip after the pet filter chips
- Styled as a small outlined toggle chip (grey when off, purple when on)

**`MonthCalendar.tsx`**
- Remove medication events from the `visible` ribbon list
- Add a dot row at the bottom of each day cell:
  - Compute meds active on that day (startDate ≤ day ≤ endDate, or no endDate)
  - Filter by `active` unless `showInactiveMeds` is true
  - Render one dot per med, colored by `petColors[med.petId]`, 7×7px rounded
  - Inactive meds (when shown): same dot at 40% opacity
  - Apply pet filter: if `selectedPetId` is set, only show dots for that pet
- Vet visit ribbons unchanged

**`DayDetailModal.tsx`**
- No change — it already receives all events for the day including medications

### Data flow
`MonthCalendar` needs access to the raw `medications` array (not just `CalendarEvent[]`) to render dots independently of the event ribbons. Pass `medications: Medication[]` as a new prop alongside `events`.

---

## 4. Monthly Schedule Day Picker

**Problem:** `MedicationScheduleSection` shows a free-text comma-separated input for `daysOfMonth` — confusing UX.

**Fix:** Replace with a 1–31 chip grid matching the weekly day-picker interaction:
- 31 small chips in a flex-wrap grid, labelled 1–31
- Click toggles selection; at least 1 must remain selected
- Selected chips: `bgcolor: 'primary.main'`, white text
- Unselected chips: `bgcolor: 'background.paper'`, secondary text, divider border

---

## 5. Vet Search — Work Hours Not Updated

**Problem:** `handlePickPlace` in `VetsPage.tsx` ignores `details.workHours` from the Places API response.

**Fix:** Add to the `setForm` call:
```ts
workHours: details.workHours ?? f.workHours,
```

---

## Out of Scope

- No API changes
- No new routes or pages
- No changes to reminder scheduling
