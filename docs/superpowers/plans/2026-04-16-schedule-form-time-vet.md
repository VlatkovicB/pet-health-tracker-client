# Schedule Form: Time + Vet Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native time input and a searchable vet autocomplete to the inline "Schedule vet visit" form in `DayDetailModal`.

**Architecture:** `DayDetailModal` gains two new state vars (`time`, `selectedVet`) and two new form fields. `CalendarPage` adds a single `['vets-all']` query and passes the result as a `vets` prop. No new files.

**Tech Stack:** React 19, TypeScript 6.0.2, MUI v9 (Autocomplete), TanStack Query v5, date-fns v4, pnpm

---

## File Map

| File | Change |
|---|---|
| `src/components/DayDetailModal.tsx` | Add `vets` prop, `time`/`selectedVet` state, time input, Autocomplete, updated `visitDate` + `vetId` in mutation |
| `src/pages/calendar/CalendarPage.tsx` | Add `['vets-all']` query, pass `vets` to `DayDetailModal` |

---

### Task 1: Add time input and vet Autocomplete to DayDetailModal

**Files:**
- Modify: `src/components/DayDetailModal.tsx`

**Background:**
The current schedule form sends `visitDate: format(date!, 'yyyy-MM-dd')` (midnight) and no `vetId`. We need to:
- Add `vets: Vet[]` to the props interface
- Add `time` state (default `'09:00'`) and `selectedVet: Vet | null` state (default `null`)
- Change `visitDate` to `` `${format(date!, 'yyyy-MM-dd')}T${time}:00` ``
- Add `vetId: selectedVet?.id` to the mutation payload
- Replace the static date Typography with a date + time input row
- Add a MUI `Autocomplete` for vet selection below the time row
- Reset both new state vars in `handleClose` and `onSuccess`

- [ ] **Step 1: Update imports**

Replace the full imports block at the top of `src/components/DayDetailModal.tsx`:

```tsx
import { useState } from 'react';
import {
  Autocomplete,
  Box, Button, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent,
  Divider, IconButton, TextField, Typography,
} from '@mui/material';
import { Close, NotificationsNone } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useMutation } from '@tanstack/react-query';
import type { CalendarEvent, Pet, Vet } from '../types';
import { healthApi } from '../api/health';
import { useNotification } from '../context/NotificationContext';
```

- [ ] **Step 2: Add `vets` to the props interface**

Replace the `DayDetailModalProps` interface:

```tsx
interface DayDetailModalProps {
  date: Date | null;
  events: CalendarEvent[];
  petNames: Record<string, string>;
  petColors: Record<string, string>;
  pets: Pet[];
  vets: Vet[];
  onClose: () => void;
  onScheduled: () => void;
}
```

- [ ] **Step 3: Update the component signature, add state, update mutation**

Replace from the `export function DayDetailModal(` line through the closing `});` of the `useMutation` call (currently ends around line 54):

```tsx
export function DayDetailModal({ date, events, petNames, petColors, pets, vets, onClose, onScheduled }: DayDetailModalProps) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [time, setTime] = useState('09:00');
  const [selectedVet, setSelectedVet] = useState<Vet | null>(null);

  const vetVisits = events.filter((e): e is CalendarEvent & { kind: 'vet-visit' } => e.kind === 'vet-visit');
  const medications = events.filter((e): e is CalendarEvent & { kind: 'medication' } => e.kind === 'medication');

  const { mutate: scheduleVisit, isPending } = useMutation({
    retry: 0,
    mutationFn: () =>
      healthApi.createVetVisit(selectedPetId!, {
        visitDate: `${format(date!, 'yyyy-MM-dd')}T${time}:00`,
        vetId: selectedVet?.id,
        reason: reason.trim(),
      }),
    onSuccess: () => {
      showSuccess('Vet visit scheduled');
      setSelectedPetId(null);
      setReason('');
      setTime('09:00');
      setSelectedVet(null);
      onScheduled();
    },
    onError: () => {
      showError('Failed to schedule visit');
    },
  });
```

- [ ] **Step 4: Update `handleClose` to reset new state**

Replace the `handleClose` function:

```tsx
  function handleClose() {
    setSelectedPetId(null);
    setReason('');
    setTime('09:00');
    setSelectedVet(null);
    onClose();
  }
```

- [ ] **Step 5: Replace the static date display with a date + time row, and add Autocomplete**

Find the comment `{/* Date (read-only) */}` section in the schedule form (currently a `<Typography>` showing the formatted date). Replace it and everything up to (but not including) the `{/* Reason */}` comment with:

```tsx
                {/* Date + Time */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                    {date ? format(date, 'EEE, MMM d, yyyy') : ''}
                  </Typography>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={{
                      border: '1px solid #ccc',
                      borderRadius: 4,
                      padding: '3px 6px',
                      fontSize: 12,
                      background: 'transparent',
                      color: 'inherit',
                      fontFamily: 'inherit',
                    }}
                  />
                </Box>

                {/* Vet (optional) */}
                <Autocomplete<Vet>
                  options={vets}
                  value={selectedVet}
                  onChange={(_e, v) => setSelectedVet(v)}
                  getOptionLabel={(v) => v.name}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  renderOption={(props, v) => (
                    <Box component="li" {...props} key={v.id}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{v.name}</Typography>
                        {v.clinic && (
                          <Typography variant="caption" color="text.secondary">{v.clinic}</Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Search vets… (optional)"
                      sx={{ mb: 1 }}
                    />
                  )}
                  size="small"
                  fullWidth
                  clearOnEscape
                  noOptionsText="No vets found"
                />
```

- [ ] **Step 6: Verify the build passes**

```bash
cd ~/projects/pet-health-tracker-client
pnpm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/DayDetailModal.tsx
git commit -m "feat: add time input and vet autocomplete to schedule form"
```

---

### Task 2: Fetch vets in CalendarPage and pass to DayDetailModal

**Files:**
- Modify: `src/pages/calendar/CalendarPage.tsx`

**Background:**
`DayDetailModal` now requires `vets: Vet[]`. `CalendarPage` needs to fetch all vets via `vetsApi.listAll()` and pass the result as the `vets` prop. The query uses `staleTime: 10 * 60 * 1000` (10 min) since the vet list changes rarely.

- [ ] **Step 1: Add vets import and query**

In `src/pages/calendar/CalendarPage.tsx`, update the imports block and add the vets query.

Change the import on line 6 from:
```tsx
import { petsApi } from '../../api/pets';
```
to:
```tsx
import { petsApi } from '../../api/pets';
import { vetsApi } from '../../api/vets';
```

Change the type import on line 13 from:
```tsx
import type { CalendarEvent, Pet, VetVisit, Medication } from '../../types';
```
to:
```tsx
import type { CalendarEvent, Pet, Vet, VetVisit, Medication } from '../../types';
```

- [ ] **Step 2: Add the vets query inside the component**

Add this block inside `CalendarPage()`, right after the pets query block (after the `const petNames = ...` line, around line 82):

```tsx
  // All vets (for schedule form autocomplete)
  const { data: vets = [] } = useQuery<Vet[]>({
    queryKey: ['vets-all'],
    queryFn: () => vetsApi.listAll(),
    staleTime: 10 * 60 * 1000,
  });
```

- [ ] **Step 3: Pass `vets` to DayDetailModal**

Find the `<DayDetailModal` JSX block (currently lines 171–182). Add `vets={vets}` after `pets={pets}`:

```tsx
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
```

- [ ] **Step 4: Verify the build passes**

```bash
cd ~/projects/pet-health-tracker-client
pnpm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 5: Visual end-to-end check**

```bash
pnpm run dev
```

Open http://localhost:5173. Click any calendar day:
1. The "Schedule vet visit" form shows a time input defaulting to `09:00` next to the date
2. An autocomplete field labeled "Search vets… (optional)" appears — type a vet name to filter
3. Submit with pet + reason — success toast, modal closes, new visit appears on calendar
4. Reopen modal — time resets to `09:00`, vet field is cleared

- [ ] **Step 6: Commit**

```bash
git add src/pages/calendar/CalendarPage.tsx
git commit -m "feat: fetch vets and pass to DayDetailModal for schedule form"
```
