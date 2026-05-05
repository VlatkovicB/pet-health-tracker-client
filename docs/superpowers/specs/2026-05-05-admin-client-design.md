# Admin Panel & User Limits — Client Design Spec

**Date:** 2026-05-05  
**Status:** Approved

---

## Overview

Two connected features:

1. **User-facing limits** — profile page gains a "Usage" section showing each resource's current usage vs. limit as progress bars.
2. **Admin panel** — dedicated `/admin` route (visible/accessible only to `role === 'admin'` users) with a user management table and a right-side drawer for per-user detail, limit overrides, role changes, and deletion.

---

## 1. Types (`src/types/index.ts`)

### Updated `User`
```ts
interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'   // NEW
  theme: 'light' | 'dark'
  createdAt: string
}
```

### New types
```ts
interface UserLimits {
  pets:           { used: number; max: number | null }
  vets:           { used: number; max: number | null }
  medications:    { used: number; max: number | null }
  notes:          { used: number; max: number | null }
  storage:        { usedBytes: number; maxBytes: number | null }
  placesSearches: { usedThisMonth: number; max: number | null }
}

interface AdminUserStats {
  pets: number
  vets: number
  vetVisits: number
  medications: number
  notes: number
  photos: number
  reminders: number
  storageUsedBytes: number
  placesSearchesThisMonth: number
}

interface AdminUser extends User {
  stats: AdminUserStats
  limits: UserLimits | null
}
```

---

## 2. Auth Context (`src/context/AuthContext.tsx`)

Currently stores only `token`. After a successful login (or on app load with a stored token), fetch `GET /users/me` and store the full `User` object in context.

`AuthContextValue` gains:
```ts
user: User | null
setUser: (user: User | null) => void
```

`useAuth()` consumers can read `user.role` to gate admin UI. The `login()` function fetches `/users/me` after storing the token and sets `user`. `logout()` clears both `token` and `user`.

---

## 3. Route Guard

New component `src/routes/AdminRoute.tsx`:
- Wraps `ProtectedRoute`
- Additionally checks `user?.role === 'admin'`
- Redirects to `/` if authenticated but not admin

---

## 4. Navigation (`src/components/Layout.tsx`)

Add an "Admin" nav item to `NAV_ITEMS_BASE` rendered conditionally:
- Only shown when `user?.role === 'admin'`
- Icon: `AdminPanelSettingsIcon` (MUI)
- Route: `/admin`
- Appears below existing nav items, above the profile button

---

## 5. Admin Page (`src/pages/admin/AdminPage.tsx`)

### Route
`/admin` — wrapped in `AdminRoute`

### Layout
Full-width page. When no user is selected: table fills the page. When a user row is clicked: a persistent MUI `Drawer` opens on the right (width ~380px), table shrinks to fill remaining space.

### Users Table
MUI `Table` with columns:

| Column | Value |
|---|---|
| Name / Email | name (bold) + email (muted, smaller) |
| Pets | stats.pets |
| Vets | stats.vets |
| Medications | stats.medications |
| Notes | stats.notes |
| Photos | stats.photos |
| Storage | stats.storageUsedBytes formatted as MB |
| Places/mo | stats.placesSearchesThisMonth |
| Role | Chip: `admin` (blue) or `user` (muted) |

Rows are clickable. Selected row is highlighted. Pagination via `page`/`limit` query params (20 per page).

### User Detail Drawer

Header: user name + email + role chip.

**Stats grid** — 2-column grid of stat cards (same values as table columns, plus vetVisits and reminders).

**Current limits section** — shows resolved effective limit per resource (value or "default"). If a per-user override exists, shown in a different color.

**Actions:**
- **Edit limits** — opens a small MUI `Dialog` with a number input per limit field. Empty = "use default" (sends `null`). On save → `PUT /api/v1/admin/users/:id/limits`. Invalidates user query on success.
- **Change role** — toggle button: "Promote to admin" / "Demote to user". Disabled when viewing self. On confirm → `PATCH /api/v1/admin/users/:id/role`.
- **Delete user** — red outlined button. Opens confirm dialog showing "This will permanently delete [name] and all their data." On confirm → `DELETE /api/v1/admin/users/:id`. On success: close drawer, remove from table, show snackbar.

---

## 6. User-Facing Limits (`src/pages/profile/ProfilePage.tsx`)

New `UsageLimitsSection` component added below existing profile settings.

Fetches `GET /api/v1/users/me/limits` via `useMyLimits()` hook.

Displays six labeled progress bars:

| Label | Value | Max |
|---|---|---|
| Pets | used | max |
| Vets | used | max |
| Medications | used | max |
| Notes | used | max |
| Storage | usedBytes → "X MB" | maxBytes → "X MB" |
| Places searches this month | usedThisMonth | max |

**Color thresholds** (applied to MUI `LinearProgress`):
- < 80% → primary blue
- 80–94% → warning yellow (`warning.main`)
- ≥ 95% → error red (`error.main`)

**`max: null`** → bar not shown; label shows "Unlimited" instead of a number.

---

## 7. API Layer

### `src/api/users.ts` — additions
```ts
usersApi.getLimits(): Promise<UserLimits>   // GET /users/me/limits
useMyLimits(): UseQueryResult<UserLimits>
```

### New `src/api/admin.ts`
```ts
adminApi.listUsers(page, limit): Promise<PaginatedResult<AdminUser>>
adminApi.getUser(userId): Promise<AdminUser>
adminApi.updateRole(userId, role): Promise<void>
adminApi.upsertLimits(userId, limits): Promise<void>
adminApi.deleteUser(userId): Promise<void>

useAdminUsers(page): UseQueryResult<PaginatedResult<AdminUser>>
useAdminUser(userId): UseQueryResult<AdminUser>
```

React Query cache keys: `['admin', 'users']`, `['admin', 'users', userId]`.  
On successful mutation (role/limits/delete): invalidate `['admin', 'users']`.

---

## 8. File Map

### New files
| File | Purpose |
|---|---|
| `src/routes/AdminRoute.tsx` | Role-gated route wrapper |
| `src/pages/admin/AdminPage.tsx` | Users table + drawer |
| `src/api/admin.ts` | Admin API hooks |

### Modified files
| File | Change |
|---|---|
| `src/types/index.ts` | Add `role` to `User`; add `UserLimits`, `AdminUserStats`, `AdminUser` |
| `src/context/AuthContext.tsx` | Fetch + store full `User` after login; expose in context |
| `src/components/Layout.tsx` | Conditional admin nav item |
| `src/App.tsx` | Add `/admin` route via `AdminRoute` |
| `src/pages/profile/ProfilePage.tsx` | Add `UsageLimitsSection` |
| `src/api/users.ts` | Add `getLimits()` + `useMyLimits()` |

---

## Out of Scope

- Admin dashboard with aggregate charts
- Bulk user actions
- Audit log / activity history
- Email notifications triggered from admin panel
