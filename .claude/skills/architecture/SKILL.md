---
name: architecture
description: Deep architecture reference for pet-health-tracker-client — stack, routing, API layer, types, state management, and key design decisions
---

## Stack

| Layer | Technology |
|---|---|
| Build tool | Vite |
| Framework | React 19 + TypeScript |
| UI library | MUI v6 |
| Data fetching | TanStack React Query v5 |
| HTTP client | axios |
| Routing | react-router-dom v6 |
| Theme | Custom dark navy (defined in `src/theme.ts`) |

## Project Structure

```
src/
  main.tsx              Entry point — wraps app in QueryClient + ThemeContextProvider + NotificationProvider + AuthProvider + Router
  App.tsx               Route definitions
  theme.ts              createAppTheme(mode) — MUI theme factory (dark navy, teal primary, frosted glass cards)
  types/index.ts        All shared TypeScript interfaces (no runtime exports — use `import type`)
  api/                  One module per backend resource; all functions return typed Promises
  context/
    AuthContext.tsx      JWT token storage + current user; provides login/logout/register
    ThemeContext.tsx     dark/light mode; syncs to localStorage and backend User.theme
    NotificationContext.tsx  in-app notification snackbar
  routes/
    ProtectedRoute.tsx  Redirects to /login if not authenticated
  hooks/
    useInfiniteScroll.ts  IntersectionObserver sentinel hook for infinite lists
  components/
    Layout.tsx           App shell — AppBar with breadcrumbs, NavigationDrawer, content wrapper
    NavigationDrawer.tsx Slide-in nav drawer (calendar, pets, vets links)
    CalendarEventPopup.tsx  Popover detail for calendar day events
    DayDetailModal.tsx   Full-day detail modal from calendar
    MedicationDetailDialog.tsx  Medication view/edit dialog
    PlacesSyncDialog.tsx Google Places sync flow for vets
    ReminderScheduleEditor.tsx  UI for daily/weekly/monthly ReminderSchedule
    ScheduledVisitDetailDialog.tsx  Detail/complete dialog for scheduled vet visits
    WorkHoursEditor.tsx  7-row editor for vet work hours
  pages/
    auth/               LoginPage, RegisterPage
    calendar/           CalendarPage, MonthCalendar, PetFilterChips
    pets/               PetsPage (pet cards grid + upcoming vet visits)
    health/             PetDetailPage (pet hero, vet visits tab, medications tab)
    vets/               VetsPage
```

## Pages & Routes

| Route | Component | Description |
|---|---|---|
| `/login` | `LoginPage` | Email/password login |
| `/register` | `RegisterPage` | Registration form |
| `/` | `CalendarPage` | Monthly calendar — vet visits + medication spans |
| `/pets` | `PetsPage` | Pet cards grid + upcoming scheduled visits |
| `/vets` | `VetsPage` | Vet directory — accordion cards, work hours, Places sync |
| `/pets/:petId` | `PetDetailPage` | Pet hero + vet visits tab + medications tab |

All routes except `/login` and `/register` are wrapped in `ProtectedRoute`.

## API Layer (`src/api/`)

Each module exports a plain object of async functions. All use the shared `apiClient` (axios instance with JWT interceptor and 401 redirect).

| Module | Key functions |
|---|---|
| `auth.ts` | `login`, `register` |
| `users.ts` | `getMe`, `updateTheme` |
| `pets.ts` | `list({ pageParam })`, `get(petId)`, `create`, `update`, `uploadPhoto` |
| `vets.ts` | `list({ pageParam })`, `listAll()`, `create`, `update`, `syncFromPlace` |
| `health.ts` | `listVetVisits`, `createVetVisit`, `updateVetVisit`, `completeVetVisit`, `uploadVetVisitImage`, `getUpcomingVetVisits`, `listVetVisitsByDateRange`, `createMedication`, `updateMedication`, `getVetVisitReminder`, `configureVetVisitReminder` |
| `medications.ts` | `list(petId)`, `updateReminder`, `toggleReminder` |
| `reminders.ts` | medication reminder configure/toggle |
| `places.ts` | `search(query)`, `details(placeId)` |

`vetsApi.listAll` fetches page 1 with limit 100 and returns items array — used for dropdowns.

## Types (`src/types/index.ts`)

All entries are `interface` (erased at runtime). Always import with `import type { … }`.

| Type | Notable fields |
|---|---|
| `User` | id, name, email, createdAt |
| `Pet` | id, name, species, breed?, birthDate?, photoUrl?, color?, userId, createdAt |
| `Vet` | id, userId, name, address?, phone?, workHours?, googleMapsUrl?, rating?, placeId?, notes?, createdAt |
| `VetWorkHours` | dayOfWeek (DayOfWeek), open, startTime?, endTime? |
| `VetVisit` | id, petId, **type** (`logged`\|`scheduled`), vetId?, clinic?, vetName?, reason, notes?, visitDate, imageUrls[], createdAt |
| `Medication` | id, petId, name, dosage, frequency, startDate, endDate?, notes?, active, createdAt |
| `Reminder` | id, entityType, entityId, schedule (ReminderScheduleProps), enabled, notifyUserIds[] |
| `ReminderScheduleProps` | discriminated union: `{type:'daily',times[]}` \| `{type:'weekly',days[],times[]}` \| `{type:'monthly',daysOfMonth[],times[]}` |
| `CalendarEvent` | discriminated union: `{kind:'vet-visit',…}` \| `{kind:'medication',…}` |
| `Symptom` | id, petId, description, severity, observedAt, notes? |
| `HealthCheck` | id, petId, weight?, temperature?, checkedAt, notes? |
| `PaginatedResult<T>` | items, total, nextPage (number\|null) |

## State Management

- **Server state** — TanStack React Query. All lists use `useInfiniteQuery`; single-resource fetches use `useQuery`; mutations use `useMutation` with `queryClient.invalidateQueries` on success.
- **Auth state** — `AuthContext` holds token (localStorage) + decoded user.
- **Theme state** — `ThemeContext` holds `mode` (`light`\|`dark`); persists to localStorage and syncs to `PATCH /users/me`.
- **Notifications** — `NotificationContext` provides `showNotification(message, severity)` backed by a MUI `Snackbar`.
- **Local UI state** — `useState` in page/dialog components (form fields, open/close, edit mode).

## Hooks (`src/hooks/`)

- `useInfiniteScroll(onIntersect, enabled)` — attaches `IntersectionObserver` to `<div ref={sentinelRef} />` with `rootMargin: '400px'`; calls `onIntersect` when visible.

## Key Design Decisions

- **Calendar-first home** — `/` renders a monthly calendar (`MonthCalendar`) with vet visit markers and medication span bars; `PetFilterChips` filter visible pets.
- **`import type` for all types** — `src/types/index.ts` exports only interfaces; Vite's ESM dev server throws on runtime named-export misses.
- **Infinite scroll on all lists** — `useInfiniteQuery` + `useInfiniteScroll` hook with 400 px root margin.
- **`key` prop to force dialog remount** — dialogs with `useState` form fields receive a `key` based on the entity's mutable fields so React remounts them when the entity is updated.
- **`vetsApi.listAll` split** — paginated `list` for the vets page; `listAll` (limit=100) for dropdowns. Avoids paginating vet-select dropdowns in forms.
- **Dark navy theme** — defined in `theme.ts` as `createAppTheme(mode)`. Cards use frosted glass (`rgba(255,255,255,0.04)` + backdrop-filter). Buttons use teal→blue gradient. Toggle lives in the Layout AppBar menu.
- **Photo URLs** — stored as relative paths (e.g. `/uploads/pets/uuid.jpg`); prepend `VITE_SERVER_URL` env var before rendering `<img src>`.
- **MUI v9 gotchas** — system props (`fontWeight`, `textAlign`) must go in `sx` on `<Typography>`; shadows require `as any` cast.
- **VetWorkHours** — stored as 7-row array (one per day of week); `WorkHoursEditor` renders all 7 days with open/close toggles and time pickers.
- **Vet Places sync** — `PlacesSyncDialog` lets users re-sync vet data from Google Places using the stored `placeId`; `TravelExplore` icon on vet cards.
