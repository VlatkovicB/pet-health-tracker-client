---
name: adding-a-feature
description: Step-by-step checklist for adding a new page, feature, or dialog to pet-health-tracker-client. Follow in order to avoid missing layers.
---

# Adding a Feature — Client

Follow these steps in order.

---

## 1. Types

File: `src/types/index.ts`

- Add `interface` definitions for any new API response shapes
- Always use `interface` (not `type alias`) — file exports only interfaces
- Always import with `import type { … }` at usage sites — never a bare `import`

---

## 2. API Module Function

File: `src/api/<resource>.ts`

- Add a plain async function that calls `apiClient.<method>('<path>', data)`
- Return a typed Promise — use the interfaces from step 1
- For paginated lists: accept `{ pageParam = 1 }` and return `PaginatedResult<T>`
- For dropdown-style fetches that need all items: add a `listAll` variant with `limit=100`

```ts
// paginated
export const list = ({ pageParam = 1 }: { pageParam?: number }) =>
  apiClient.get<PaginatedResult<MyType>>('/my-resource', { params: { page: pageParam, limit: 20 } }).then(r => r.data)

// dropdown (all items)
export const listAll = () =>
  apiClient.get<PaginatedResult<MyType>>('/my-resource', { params: { page: 1, limit: 100 } }).then(r => r.data.items)
```

---

## 3. React Query Hooks

Inline in the page/component file, or extract to `src/api/<resource>.ts` if reused.

**Infinite list:**
```ts
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['my-resource'],
  queryFn: myApi.list,
  initialPageParam: 1,
  getNextPageParam: (last) => last.nextPage ?? undefined,
})
const items = data?.pages.flatMap(p => p.items) ?? []
```

**Single resource:**
```ts
const { data } = useQuery({ queryKey: ['my-resource', id], queryFn: () => myApi.get(id) })
```

**Mutation:**
```ts
const { mutate } = useMutation({
  mutationFn: myApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['my-resource'] })
    onClose()
  },
})
```

---

## 4. Infinite Scroll (for list pages)

- Place a sentinel `<div ref={sentinelRef} style={{ height: 1 }} />` at the bottom of the list
- Call `useInfiniteScroll(fetchNextPage, hasNextPage && !isFetchingNextPage)`

```ts
const sentinelRef = useInfiniteScroll(fetchNextPage, hasNextPage && !isFetchingNextPage)
```

---

## 5. Page or Dialog Component

**Page** (`src/pages/<domain>/<Name>Page.tsx`):
- Use MUI layout: `Box` with `sx={{ px: 2, pb: 10 }}` (leave room for bottom nav)
- Section labels use `text-transform: uppercase`, `font-size: 10–11px`, `font-weight: 800`
- FAB: position `bottom: 76px, right: 18px` — sits above the bottom nav
- Follow the design-system skill for all colors, spacing, and component patterns

**Dialog** (`src/components/<Name>Dialog.tsx`):
- Accept `open`, `onClose`, and the entity as props
- Use a `key` prop at the call site based on mutable entity fields to force remount on edit:
  ```tsx
  <MyDialog key={`${entity.id}-${entity.updatedAt}`} ... />
  ```
- Never read `e.target.checked` in controlled inputs — use `!currentValue` to avoid stale DOM reads

---

## 6. Route Registration (new pages only)

File: `src/App.tsx`

- Add a `<Route path="/<path>" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />`
- All non-auth routes require `ProtectedRoute`

---

## 7. Bottom Nav (new primary destination only)

File: `src/components/Layout.tsx` (or wherever the bottom nav lives)

- Add a new tab with icon + label
- Active tab: `background.activeNav`, `color: primary.main`
- Inactive tab: `color: text.muted`
- Bottom nav height is ~56px; FABs and page bottom padding must account for this

---

## Common Mistakes

- **Importing types without `import type`** — Vite ESM dev server throws on runtime named-export misses from `types/index.ts`
- **Forgetting `queryClient.invalidateQueries`** after mutations — list stays stale
- **Using `e.target.checked` in controlled checkboxes** — use `!currentPropValue` instead
- **Hardcoding hex colors** — always use MUI theme tokens in `sx` so dark mode works
- **FAB overlapping bottom nav** — set `bottom: 76px` not `bottom: 16px`
- **Dialog form state not resetting** — pass a `key` prop that changes when the entity changes to force remount
- **Photo URLs** — prepend `import.meta.env.VITE_SERVER_URL` before rendering `<img src={url}>`; URLs from the API are relative paths
- **`fontWeight` / `textAlign` on `<Typography>`** — must go inside `sx`, not as top-level props (MUI v9)
