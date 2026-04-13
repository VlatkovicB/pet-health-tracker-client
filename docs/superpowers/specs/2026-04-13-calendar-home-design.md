# Calendar Home Page Redesign

**Date:** 2026-04-13  
**Status:** Approved — ready for implementation

## Overview

Replace the current home page (a flat pets grid + upcoming visits list) with a monthly calendar view. The calendar shows vet visits and active medications across all pets, filterable by pet. A hamburger-triggered side drawer replaces the current account-avatar-only navigation, adding explicit Home / Pets / Vets links.

## Routing Changes

| Route | Before | After |
|---|---|---|
| `/` | `PetsPage` | `CalendarPage` (new) |
| `/pets` | — | `PetsPage` (moved) |
| `/vets` | `VetsPage` | `VetsPage` (unchanged) |
| `/pets/:petId` | `PetDetailPage` | `PetDetailPage` (unchanged) |

## Navigation

`Layout` gains a `drawerOpen: boolean` state. The AppBar renders a hamburger `IconButton` on the left that toggles the drawer. The account `Avatar` stays in the AppBar but its dropdown menu loses the logout item (logout moves to the drawer).

`NavigationDrawer` is a new component rendered inside `Layout`:
- MUI `Drawer` (temporary variant, anchored left)
- Links: **Home** (`/`), **Pets** (`/pets`), **Vets** (`/vets`)
- Divider, then **Logout** in error color
- Active link highlighted (compare `useLocation().pathname`)
- Closes on any link click or backdrop tap

Breadcrumbs remain on `/pets/:petId` and `/vets`, unchanged.

## New Components

```
src/components/
  NavigationDrawer.tsx        # Drawer nav — links + logout
  CalendarEventPopup.tsx      # MUI Popover — event preview + "View details" link

src/pages/calendar/
  CalendarPage.tsx            # Data fetching, month/pet state
  MonthCalendar.tsx           # Pure rendering — grid + span bars
  PetFilterChips.tsx          # Chip row — emits selected petId | null
```

## Data Model

All calendar data flows through a discriminated union:

```ts
type CalendarEvent =
  | {
      kind: 'vet-visit';
      id: string;
      petId: string;
      date: string;           // ISO date string
      type: 'logged' | 'scheduled';
      reason: string;
      vetName?: string;
    }
  | {
      kind: 'medication';
      id: string;
      petId: string;
      startDate: string;      // ISO date string
      endDate?: string;       // ISO date string, undefined = ongoing
      name: string;
      hasReminder: boolean;
    };
```

`CalendarPage` maps `VetVisit[]` and `Medication[]` into `CalendarEvent[]` before passing them to `MonthCalendar`. `MonthCalendar` has no knowledge of the raw API types.

## Data Fetching

Three React Query queries, all keyed on the visible month string (e.g. `'2026-04'`):

1. **Pets** — existing `['pets']` query; reused for the chip row and pet name resolution. No changes.

2. **Vet visits** — new query key `['calendar-vet-visits', monthKey]`. Requires a new backend endpoint:
   `GET /vet-visits?from=2026-04-01&to=2026-04-30`  
   Returns all vet visits (logged + scheduled) for the authenticated user's group within the date range. The existing `GET /vet-visits/upcoming` endpoint only returns future visits and is not reused here.

3. **Medications** — query key `['calendar-medications', monthKey]`. Fetches `GET /pets/:petId/medications` for each pet (existing endpoint), then filters client-side to those active in the month:  
   `startDate <= monthEnd && (endDate == null || endDate >= monthStart)`  
   Fires in parallel per pet using `useQueries`.

4. **Reminders** — fetched after medications load using `useQueries`, one query per medication: `GET /reminders?entityType=medication&entityId={id}` (or the equivalent existing endpoint). `hasReminder` is `true` if a reminder exists with `enabled: true`. Defaults to `false` while loading. If the existing API doesn't support a batch fetch, per-item queries are acceptable given typical medication counts (< 10 per pet).

Month navigation (prev/next) updates the `currentMonth` state, which changes the query keys and triggers background refetches. React Query's `staleTime` of 5 minutes avoids redundant fetches when navigating back to a previously seen month.

## Calendar Rendering

`MonthCalendar` uses `date-fns`:

- `startOfMonth` / `endOfMonth` to get month bounds
- `eachWeekOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: endOfWeek(monthEnd, { weekStartsOn: 1 }) })` to build the full grid (always Monday-start; 5 or 6 rows)
- Days outside the current month rendered with `color: text.disabled`
- Today's date cell gets a teal (`primary.main`) filled circle background

**Vet visit dots:** Each day cell shows up to 3 small dots (6px circles) for visits on that date. Color: `#457b9d` (blue) for `scheduled`, `text.disabled` grey for `logged`. If more than 3 visits fall on one day, show the first 2 dots + a `+N` label. Clicking any dot opens `CalendarEventPopup`.

**Medication span bars:** Rendered as a separate list below the calendar grid, not inside day cells. Each bar:
- Spans `max(startDate, monthStart)` → `min(endDate ?? monthEnd, monthEnd)` — medications that started in a prior month still show from day 1 of the current month
- Displays: pill icon + `{petName} · {medicationName}` + bell icon (if `hasReminder`)
- Color assigned per pet (consistent with chip color)
- Clicking opens `CalendarEventPopup`

## Event Popup

`CalendarEventPopup` is an MUI `Popover` anchored to the clicked element:

**Vet visit:**
- Title: `{reason} · {petName}`
- Subtitle: `{formattedDate} · {vetName or clinic}`
- Body: notes preview (truncated at 80 chars) if present
- Footer: "View details →" button → navigates to `/pets/:petId?tab=vet-visits&visitId={id}`

**Medication:**
- Title: `{medicationName} · {petName}`
- Subtitle: `{dosage} · {frequency label}`
- Body: `Started {startDate}` + end date if present
- Footer: "View details →" → `/pets/:petId?tab=medications`

Popup closes on outside click (Popover default behavior).

## Pet Filter Chips

`PetFilterChips` renders above the calendar header. Chips: **All** (default, selected) + one chip per pet. Selecting a pet chip filters `CalendarEvent[]` by `petId` before passing to `MonthCalendar`. "All" always shows everything. Each pet is assigned a color from a fixed palette on first render (consistent across the session).

## Loading & Error States

- **Loading:** Skeleton shimmer replaces the calendar grid while the month query is in flight. Chip row renders immediately from cached pets data.
- **Error:** Inline MUI `Alert severity="error"` below the calendar header; shows on vet visits or medications query failure.
- **Empty month:** Faint `"No events this month"` body2 text centered below the grid. Not an error state.

## Backend Change Required

One new endpoint on the API side:

```
GET /vet-visits?from=YYYY-MM-DD&to=YYYY-MM-DD
```

Returns `VetVisit[]` for all pets in the authenticated user's group within the date range (inclusive). Both `logged` and `scheduled` types included. This is the only backend change — all other data comes from existing endpoints.
