# Architecture

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
  main.tsx              Entry point — wraps app in QueryClient + AuthProvider + Router
  App.tsx               Route definitions
  theme.ts              MUI theme (dark, teal primary, frosted glass cards)
  types/index.ts        All shared TypeScript interfaces (no runtime exports — use `import type`)
  api/                  One module per backend resource; all functions return typed Promises
  context/
    AuthContext.tsx      JWT token storage + current user; provides login/logout/register
  routes/
    ProtectedRoute.tsx  Redirects to /login if not authenticated
  hooks/
    useInfiniteScroll.ts  IntersectionObserver sentinel hook for infinite lists
  components/
    Layout.tsx          App shell — AppBar, nav, content wrapper with bottom padding
  pages/
    auth/               LoginPage, RegisterPage
    groups/             GroupsPage
    pets/               PetsPage (pets grid + upcoming vet visits)
    health/             PetDetailPage (pet hero, vet visits tab, medications tab)
    vets/               VetsPage
```

## Pages & Routes

| Route | Component | Description |
|---|---|---|
| `/login` | `LoginPage` | Email/password login; redirects to `/` on success |
| `/register` | `RegisterPage` | Registration form |
| `/` | `GroupsPage` | Infinite-scroll list of groups the user belongs to |
| `/groups/:groupId` | `PetsPage` | Pet cards grid + upcoming vet visits list for the group |
| `/groups/:groupId/pets/:petId` | `PetDetailPage` | Pet hero (photo, name, age chips) + vet visits tab |
| `/groups/:groupId/vets` | `VetsPage` | Group vet directory — list + create |

All routes except `/login` and `/register` are wrapped in `ProtectedRoute`.

## API Layer (`src/api/`)

Each module exports a plain object of async functions. All use the shared `apiClient` (axios instance with JWT interceptor and 401 redirect).

| Module | Functions |
|---|---|
| `auth.ts` | `login`, `register` |
| `groups.ts` | `list({ pageParam })` |
| `pets.ts` | `list(groupId, { pageParam })`, `get(groupId, petId)`, `create`, `update`, `uploadPhoto` |
| `vets.ts` | `list(groupId, { pageParam })`, `listAll(groupId)`, `create` |
| `health.ts` | `listVetVisits`, `createVetVisit`, `updateVetVisit`, `uploadVetVisitImage`, `listUpcomingVetVisits(groupId)`, `createMedication`, `updateReminder`, `toggleReminder`, `listSymptoms`, `createSymptom`, `listHealthChecks`, `createHealthCheck` |

`vetsApi.listAll` fetches page 1 with limit 100 and returns the items array directly — used for dropdowns that need the full list.

## Types (`src/types/index.ts`)

All entries are `interface` (erased at runtime). Always import with `import type { … }` to avoid Vite ESM runtime errors.

| Type | Notes |
|---|---|
| `User` | id, name, email, createdAt |
| `Group` | id, name, members (GroupMember[]), createdAt |
| `GroupMember` | userId, role (`owner`\|`member`), joinedAt |
| `Pet` | id, name, species, breed?, birthDate?, photoUrl?, groupId, createdAt |
| `Vet` | id, groupId, name, address?, phone?, workHours?, googleMapsUrl?, notes?, createdAt |
| `VetVisit` | id, petId, vetId?, clinic?, reason, notes?, visitDate, nextVisitDate?, imageUrls[], createdAt |
| `Medication` | id, petId, name, dosage, startDate, endDate?, active, reminder?, createdAt |
| `Symptom` | id, petId, description, severity, observedAt, notes?, createdAt |
| `HealthCheck` | id, petId, weight?, temperature?, checkedAt, notes?, createdAt |
| `AuthTokens` | token |
| `PaginatedResult<T>` | items, total, nextPage (number\|null) |

## State Management

- **Server state** — TanStack React Query. All lists use `useInfiniteQuery`; single-resource fetches use `useQuery`; mutations use `useMutation` with `queryClient.invalidateQueries` on success.
- **Auth state** — `AuthContext` holds token (localStorage) + decoded user. Provided at app root.
- **Local UI state** — `useState` in individual page/dialog components (form fields, open/close, edit mode).

## Hooks (`src/hooks/`)

- `useInfiniteScroll(onIntersect, enabled)` — attaches an `IntersectionObserver` to a sentinel `<div ref={sentinelRef} />` with `rootMargin: '400px'`; calls `onIntersect` when visible to preload the next page.

## Components (`src/components/`)

- `Layout` — MUI `AppBar` + side nav + content `Box` with `pb: 10` (80 px bottom padding for infinite scroll sentinel clearance).

## Key Design Decisions

- **`import type` for all types** — `src/types/index.ts` exports only interfaces (erased at runtime); Vite's native ESM dev server throws on runtime named-export misses, so all consumers use `import type`.
- **Infinite scroll on all lists** — `useInfiniteQuery` + `useInfiniteScroll` hook with 400 px root margin; sentinel div placed after each list.
- **`key` prop to force dialog remount** — dialogs with internal `useState` form receive a `key` based on the entity's mutable fields so React remounts them (reinitializing form state) when the entity is updated.
- **`vetsApi.listAll` split** — paginated `list` for the vets page; `listAll` (limit=100) for dropdowns. Avoids paginating the vet-select dropdown in forms.
- **Dark navy theme** — defined once in `theme.ts`; applied globally via `ThemeProvider`. No per-page style overrides for base colours. Cards use frosted glass (`rgba(255,255,255,0.04)` + backdrop-filter). Buttons use teal→blue gradient.
- **Photo URLs** — stored as relative paths (e.g. `/uploads/pets/uuid.jpg`); prepend `VITE_SERVER_URL` env var before rendering `<img src>`.
- **Confirmation on edits** — destructive or irreversible UI actions (e.g. saving a vet visit edit) show a confirmation dialog before firing the mutation.
