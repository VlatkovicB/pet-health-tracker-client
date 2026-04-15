# Calendar Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pet-specific vet visit ribbon colors with dashed/solid distinction, an overdue `!` badge on past unconfirmed visits, and an inline "schedule vet visit" form in the day detail modal.

**Architecture:** All changes are isolated to 3 existing files. `MonthCalendar` handles ribbon rendering logic. `DayDetailModal` gains a schedule form and a new `pets` prop. `CalendarPage` wires the new props together and owns the post-save query invalidation via an `onScheduled` callback.

**Tech Stack:** React 19, TypeScript, MUI v9, date-fns v4, TanStack Query v5

---

## File Map

| File | Change |
|---|---|
| `src/pages/calendar/MonthCalendar.tsx` | Update vet visit ribbon color/style; add overdue badge |
| `src/components/DayDetailModal.tsx` | Add `pets` + `onScheduled` props; add inline schedule form |
| `src/pages/calendar/CalendarPage.tsx` | Pass `pets` + `onScheduled` to `DayDetailModal` |

---

### Task 1: Update vet visit ribbons in MonthCalendar

**Files:**
- Modify: `src/pages/calendar/MonthCalendar.tsx`

**Background:**  
Currently lines 138–162 compute `bgColor` for vet visits as a hardcoded hex. Medications already use `petColors[e.petId]`. We need vet visits to also use pet colors, with two styles:
- `scheduled` → transparent background, dashed border in `petColors[petId]`, text in `petColors[petId]`
- `logged` → solid fill in `petColors[petId]`, white text

Overdue means: `type === 'scheduled'` AND date is before today (local midnight). Uses existing `toLocalDate` helper (line 31). Add `startOfToday` to date-fns import.

- [ ] **Step 1: Update the date-fns import to include `startOfToday`**

In `src/pages/calendar/MonthCalendar.tsx`, change line 3–6:

```tsx
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, format, startOfToday,
} from 'date-fns';
```

- [ ] **Step 2: Replace the vet visit ribbon rendering block**

Replace lines 137–162 (the `{visible.map(...)}` block) with:

```tsx
{visible.map((e) => {
  const isVet = e.kind === 'vet-visit';
  const petColor = petColors[e.petId] ?? '#888';

  const isOverdue = isVet && e.type === 'scheduled' && toLocalDate(e.date) < startOfToday();
  const isScheduled = isVet && e.type === 'scheduled';

  const label = isVet ? (petNames[e.petId] ?? 'Vet') : e.name;

  return (
    <Box
      key={e.id}
      sx={{
        borderRadius: 0.5,
        px: 0.5,
        py: '1px',
        overflow: 'hidden',
        ...(isScheduled
          ? {
              bgcolor: 'transparent',
              border: `2px dashed ${petColor}`,
            }
          : {
              bgcolor: isVet ? petColor : (petColors[e.petId] ?? '#888'),
            }),
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
      }}
    >
      {isOverdue && (
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            bgcolor: '#e63946',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: '#fff', fontSize: '0.5rem', fontWeight: 900, lineHeight: 1 }}>!</Typography>
        </Box>
      )}
      {e.kind === 'medication' && e.hasReminder && (
        <Typography variant="caption" sx={{ fontSize: '0.62rem', lineHeight: 1.4 }}>🔔</Typography>
      )}
      <Typography
        variant="caption"
        noWrap
        sx={{
          color: isScheduled ? petColor : '#fff',
          fontSize: '0.62rem',
          fontWeight: 600,
          display: 'block',
          lineHeight: 1.4,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
})}
```

- [ ] **Step 3: Verify the build passes**

```bash
cd ~/projects/pet-health-tracker-client
pnpm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 4: Visual check in browser**

```bash
pnpm run dev
```

Open http://localhost:5173. Navigate to the calendar. Confirm:
- Logged vet visits show solid pet-color fill with white text
- Scheduled vet visits show dashed border in pet color, text in pet color, no white fill
- A scheduled visit with a past date shows the red `!` badge

- [ ] **Step 5: Commit**

```bash
git add src/pages/calendar/MonthCalendar.tsx
git commit -m "feat: use pet colors for vet visit ribbons with dashed/solid distinction and overdue badge"
```

---

### Task 2: Add `pets` prop and inline schedule form to DayDetailModal

**Files:**
- Modify: `src/components/DayDetailModal.tsx`

**Background:**  
`DayDetailModal` currently takes `{ date, events, petNames, petColors, onClose }`. We add:
- `pets: Pet[]` — for rendering pet chips in the form
- `onScheduled: () => void` — callback after successful save (CalendarPage owns invalidation + close)

The form renders at the bottom below a `<Divider>`, always visible. It has:
- Pet chip row (one chip per pet, single-select)
- Read-only date display
- Optional reason text field
- "Schedule visit" button (disabled until a pet is selected)

On submit: call `healthApi.createVetVisit`, then call `onScheduled()` (which closes the modal from CalendarPage), show success/error notification.

- [ ] **Step 1: Update imports**

Replace the imports block at the top of `src/components/DayDetailModal.tsx`:

```tsx
import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, Chip,
  IconButton, Divider, TextField, Button, CircularProgress,
} from '@mui/material';
import { Close, NotificationsNone } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useMutation } from '@tanstack/react-query';
import type { CalendarEvent, Pet } from '../types';
import { healthApi } from '../api/health';
import { useNotification } from '../context/NotificationContext';
```

- [ ] **Step 2: Update the Props interface**

Replace the `DayDetailModalProps` interface:

```tsx
interface DayDetailModalProps {
  date: Date | null;
  events: CalendarEvent[];
  petNames: Record<string, string>;
  petColors: Record<string, string>;
  pets: Pet[];
  onClose: () => void;
  onScheduled: () => void;
}
```

- [ ] **Step 3: Update the component signature and add internal state**

Replace the function signature and add state inside the component:

```tsx
export function DayDetailModal({ date, events, petNames, petColors, pets, onClose, onScheduled }: DayDetailModalProps) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const vetVisits = events.filter((e): e is CalendarEvent & { kind: 'vet-visit' } => e.kind === 'vet-visit');
  const medications = events.filter((e): e is CalendarEvent & { kind: 'medication' } => e.kind === 'medication');

  const { mutate: scheduleVisit, isPending } = useMutation({
    mutationFn: () =>
      healthApi.createVetVisit(selectedPetId!, {
        visitDate: format(date!, 'yyyy-MM-dd'),
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      showSuccess('Vet visit scheduled');
      setSelectedPetId(null);
      setReason('');
      onScheduled();
    },
    onError: () => {
      showError('Failed to schedule visit');
    },
  });
```

- [ ] **Step 4: Reset form state when modal closes**

Add an `onClose` wrapper that resets state before calling the original `onClose`. Replace all direct `onClose` references in the JSX with `handleClose`, and add this before the return:

```tsx
  function handleClose() {
    setSelectedPetId(null);
    setReason('');
    onClose();
  }
```

Update the three places in the JSX that call `onClose()` directly:
- `<Dialog onClose={handleClose}`
- `<IconButton onClick={handleClose}`
- After `navigate(...)` calls: `handleClose()` instead of `onClose()`

- [ ] **Step 5: Add the schedule form at the bottom of DialogContent**

Add this block inside `<DialogContent>`, after the medications section (after the closing `</Box>` of the medications block, before the closing `</DialogContent>`):

```tsx
<Divider sx={{ my: 1.25 }} />

<Box>
  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
    Schedule vet visit
  </Typography>

  <Box sx={{ mt: 0.75 }}>
    {/* Pet chips */}
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
      {pets.map((pet) => {
        const selected = selectedPetId === pet.id;
        const color = petColors[pet.id] ?? '#888';
        return (
          <Chip
            key={pet.id}
            label={pet.name}
            size="small"
            onClick={() => setSelectedPetId(selected ? null : pet.id)}
            sx={{
              bgcolor: selected ? color : 'transparent',
              color: selected ? '#fff' : color,
              border: `1px solid ${color}`,
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
              '& .MuiChip-label': { px: 0.75 },
              '&:hover': { bgcolor: selected ? color : `${color}22` },
            }}
          />
        );
      })}
    </Box>

    {/* Date (read-only) */}
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
      {date ? format(date, 'EEEE, MMMM d, yyyy') : ''}
    </Typography>

    {/* Reason */}
    <TextField
      size="small"
      fullWidth
      placeholder="Reason (optional)"
      value={reason}
      onChange={(e) => setReason(e.target.value)}
      sx={{ mb: 1 }}
      inputProps={{ maxLength: 200 }}
    />

    <Button
      variant="contained"
      size="small"
      fullWidth
      disabled={!selectedPetId || isPending}
      onClick={() => scheduleVisit()}
      startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : null}
    >
      {isPending ? 'Saving…' : 'Schedule visit'}
    </Button>
  </Box>
</Box>
```

- [ ] **Step 6: Verify the build passes**

```bash
pnpm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/DayDetailModal.tsx
git commit -m "feat: add inline schedule vet visit form to DayDetailModal"
```

---

### Task 3: Wire `pets` and `onScheduled` in CalendarPage

**Files:**
- Modify: `src/pages/calendar/CalendarPage.tsx`

**Background:**  
`CalendarPage` already has `pets` in scope (line 78). We need to:
1. Pass `pets` to `DayDetailModal`
2. Add an `onScheduled` callback that invalidates `['calendar-vet-visits', monthKey]` and closes the modal

- [ ] **Step 1: Add `useQueryClient` import**

In `src/pages/calendar/CalendarPage.tsx`, update the TanStack Query import on line 4:

```tsx
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
```

- [ ] **Step 2: Add `queryClient` inside the component**

Add this line inside `CalendarPage()`, right after the existing state declarations (after line 68):

```tsx
const queryClient = useQueryClient();
```

- [ ] **Step 3: Update the DayDetailModal JSX**

Replace the `<DayDetailModal .../>` block (lines 169–175) with:

```tsx
<DayDetailModal
  date={selectedDay?.date ?? null}
  events={selectedDay?.events ?? []}
  petNames={petNames}
  petColors={petColors}
  pets={pets}
  onClose={() => setSelectedDay(null)}
  onScheduled={() => {
    queryClient.invalidateQueries({ queryKey: ['calendar-vet-visits', monthKey] });
    setSelectedDay(null);
  }}
/>
```

- [ ] **Step 4: Verify the build passes**

```bash
pnpm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 5: Visual end-to-end check**

```bash
pnpm run dev
```

Open http://localhost:5173. Confirm:
1. Click any day — the modal opens with a "Schedule vet visit" section at the bottom
2. Select a pet chip — it highlights in the pet's color
3. Enter a reason (optional) and click "Schedule visit" — a success toast appears and the modal closes
4. The newly scheduled visit appears on the calendar for that day with a dashed ribbon in the pet's color
5. If the scheduled date is in the past, the ribbon shows a red `!` badge

- [ ] **Step 6: Commit**

```bash
git add src/pages/calendar/CalendarPage.tsx
git commit -m "feat: wire pets and onScheduled into DayDetailModal from CalendarPage"
```
