# Google Places Refresh / Append for Vets

**Date:** 2026-04-18  
**Status:** Approved

## Overview

Two goals:
1. Allow manually-entered vets to be linked to a Google Places record so their info can be populated from Places data.
2. Allow vets that were previously created via Google Places to have their info refreshed (name, address, phone, rating, Maps URL) from Places at any time.

Working hours are **not** synced — Places returns an unstructured string and the vets domain now uses structured `VetWorkHours[]`. Hours can only be set manually via the WorkHoursEditor.

## Section 1: Data Model

### API — `vets` table

Add `place_id VARCHAR nullable` column to the `vets` table. Applied via `sync({ alter: true })`.

| column | type | notes |
|---|---|---|
| `place_id` | VARCHAR nullable | Google Places place ID; `null` for manually-entered vets |

**Modified files:**

`VetModel.ts`
- Add `@Column({ type: DataType.STRING, allowNull: true, field: 'place_id' }) declare placeId: string | null`

`Vet.ts` (domain)
- Add `placeId?: string` to props

`VetMapper.ts`
- `toDomain`: map `model.placeId ?? undefined`
- `toPersistence`: include `placeId: vet.placeId ?? null`
- `VetResponseDto`: add `placeId?: string`

`CreateVetUseCase.ts`
- Accept `placeId?: string` in input, pass to `Vet.create()`

`UpdateVetUseCase.ts`
- Accept `placeId?: string` in input, include in reconstituted vet

### Client — `src/types/index.ts`

```ts
export interface Vet {
  // ... existing fields ...
  placeId?: string;
}
```

## Section 2: PlacesSyncDialog Component

**New component: `src/components/PlacesSyncDialog.tsx`**

```ts
interface PlacesSyncDialogProps {
  vet: Vet;
  open: boolean;
  onClose: () => void;
  onSynced: () => void; // triggers query invalidation in parent
}
```

Behavior branches on whether `vet.placeId` is set:

### Manual vet (no `placeId`)

Opens showing the Places search UI — identical to the search banner in the Add Vet dialog:
- Text field + Search button
- Results list (name + address rows)
- User picks a result → `placesApi.details(placeId)` → `vetsApi.update(vet.id, { name, address, phone, rating, googleMapsUrl, placeId })`
- On success: "Vet info updated" notification, `onSynced()`, dialog closes
- On error: error message inline

### Places vet (has `placeId`)

Opens in a loading state. Immediately calls `placesApi.details(vet.placeId)`, then `vetsApi.update(vet.id, { name, address, phone, rating, googleMapsUrl, placeId: vet.placeId })`.
- On success: "Vet info refreshed" notification, `onSynced()`, dialog closes
- On error: error message + Retry button

### Fields synced

| field | synced |
|---|---|
| `name` | yes |
| `address` | yes |
| `phone` | yes |
| `rating` | yes |
| `googleMapsUrl` | yes |
| `workHours` | **no** — structured hours set manually only |
| `notes` | **no** |

The dialog calls `vetsApi.update` directly and calls `onSynced()` on success, which the parent (VetsPage) uses to invalidate the vets query.

## Section 3: VetsPage Changes

### Card — sync icon button

In the expanded accordion card, add one icon button to the right of the Edit button:

- **Vet has `placeId`**: `SyncIcon` — tooltip "Refresh from Google Places" — opens `PlacesSyncDialog`
- **Vet has no `placeId`**: `PlaceOutlinedIcon` (or `SearchIcon`) — tooltip "Find on Google Places" — opens `PlacesSyncDialog`

Both pass the vet to `PlacesSyncDialog`. `onSynced` calls `queryClient.invalidateQueries(['vets'])`.

### Add Vet dialog — store `placeId` in form

`handlePickPlace` currently discards `placeId` after fetching details. Fix:
- Add `placeId: ''` to `emptyForm`
- In `handlePickPlace(placeId)`: set `form.placeId = placeId`
- Submit `placeId` with the create payload

No changes to the Edit Vet dialog — `placeId` is managed via `PlacesSyncDialog`, not the edit form.
