# Schedule Form: Time + Vet Picker Design

**Date:** 2026-04-16  
**Status:** Approved

## Overview

Enhance the inline "Schedule vet visit" form in `DayDetailModal` with two additions:

1. A time field so visits aren't always stored at midnight
2. A searchable vet/clinic picker to assign a vet at scheduling time

---

## 1. Time Field

### Current behavior

`visitDate` is sent as `yyyy-MM-dd` (date-only string), which the API stores as midnight local time.

### New behavior

A native `<input type="time">` is added alongside the read-only date display. It defaults to `09:00`.

On submit, the date and time are combined:
```ts
visitDate: `${format(date!, 'yyyy-MM-dd')}T${time}:00`
```

This produces an ISO datetime string in local time (e.g., `2026-04-16T09:00:00`).

### State

New state variable: `const [time, setTime] = useState('09:00')`

Reset in both `handleClose` and `onSuccess` alongside existing form state.

---

## 2. Vet Picker (Searchable Autocomplete)

### New behavior

A MUI `Autocomplete` renders below the time field. The field is optional — no vet is pre-selected. Typing filters by vet name or clinic name. Clearing sets `vetId` to `undefined` in the payload.

### Data loading

`CalendarPage` fetches vets via `vetsApi.listAll()` using TanStack Query:

```ts
queryKey: ['vets-all']
queryFn: () => vetsApi.listAll()
staleTime: 10 * 60 * 1000  // 10 min — vet list changes rarely
```

`CalendarPage` passes `vets: Vet[]` to `DayDetailModal` as a new prop.

### Autocomplete config

- `options={vets}`
- `getOptionLabel={(v) => v.name}`
- `renderOption`: two-line display — vet name (bold) + clinic on the line below
- `isOptionEqualToValue={(a, b) => a.id === b.id}`
- `size="small"`, `fullWidth`
- placeholder: `"Search vets…"`

### State

New state variable: `const [selectedVet, setSelectedVet] = useState<Vet | null>(null)`

Reset in both `handleClose` and `onSuccess`.

### Payload

`vetId: selectedVet?.id` is added to the `createVetVisit` call (already supported by the API).

---

## Architecture

### Files changed

| File | Change |
|---|---|
| `src/components/DayDetailModal.tsx` | Add `vets: Vet[]` prop; add `time` and `selectedVet` state; add time input + Autocomplete to form; update `visitDate` construction; update reset logic |
| `src/pages/calendar/CalendarPage.tsx` | Add `['vets-all']` query via `vetsApi.listAll()`; pass `vets` to `DayDetailModal` |

### No new files needed

---

## Edge Cases

- **No vets in the system:** Autocomplete renders empty with placeholder text. Field remains optional so form still submits without a vet.
- **Vets still loading:** Pass `vets={[]}` until the query resolves — Autocomplete renders empty, no crash.
- **Time not changed:** Defaults to `09:00`, which is more useful than midnight.
- **Modal reopens after submit:** `handleClose` resets `time` to `'09:00'` and `selectedVet` to `null`.
