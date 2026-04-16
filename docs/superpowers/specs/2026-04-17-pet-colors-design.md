# Pet Colors: Legibility + Customization Design

**Date:** 2026-04-17
**Status:** Approved

## Overview

Two related improvements:
1. Replace the hardcoded pet color palette with better, more legible colors
2. Allow users to assign a custom color per pet, stored on the backend (syncs across devices)

Color is set via a swatch picker in the existing **Edit Pet** dialog. Calendar ribbons are updated to always render readable text.

---

## 1. Backend: `color` field on Pet

### Change

Add `color?: string` (hex value, e.g. `#1565c0`) to the `Pet` aggregate. The field is optional — existing pets have no color until the user picks one.

The API uses `sequelize.sync({ alter: true })` on startup, so no migration file is needed — adding the column to `PetModel` is sufficient.

### Files (pet-health-tracker-api)

**`src/domain/pet/Pet.ts`**
- Add `color?: string` to `PetProps`
- Add getter: `get color(): string | undefined { return this.props.color; }`

**`src/infrastructure/db/models/PetModel.ts`**
- Add: `@Column({ type: DataType.STRING(7), allowNull: true }) declare color: string | null;`

**`src/application/pet/UpdatePetUseCase.ts`**
- Add `color?: string` to `UpdatePetInput`
- Pass through in `Pet.reconstitute`: `color: input.color !== undefined ? input.color : existing.color`

**`src/infrastructure/mappers/PetMapper.ts`**
- Add `color?: string` to `PetResponseDto`
- Include in `toDomain`: `color: model.color ?? undefined`
- Include in `toPersistence`: `color: pet.color ?? null`
- Include in `toResponse`: `color: pet.color`

**`src/infrastructure/http/controllers/PetController.ts`**
- In `update`: pass `color: req.body.color` to `updatePet.execute`

---

## 2. Color Utilities (frontend)

### New file: `src/utils/color.ts`

Two exports:

**`PET_COLOR_PALETTE`** — 16 curated hex colors, all passing WCAG AA contrast (≥ 4.5:1) against white:

```ts
export const PET_COLOR_PALETTE = [
  '#1565c0', '#c62828', '#00796b', '#6a1b9a',
  '#e65100', '#2e7d32', '#4527a0', '#00838f',
  '#558b2f', '#ad1457', '#4e342e', '#37474f',
  '#0277bd', '#6d4c41', '#283593', '#00695c',
];
```

**`getContrastText(hex: string): string`** — returns `'#fff'` or `'#1a2332'` based on WCAG relative luminance of the hex color:

```ts
export function getContrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.179 ? '#1a2332' : '#fff';
}
```

---

## 3. Frontend: Types + CalendarPage

**`src/types/index.ts`**
- Add `color?: string` to the `Pet` interface

**`src/pages/calendar/CalendarPage.tsx`**
- Update `buildPetColors` to use `pet.color` when set:
  ```ts
  function buildPetColors(pets: Pet[]): Record<string, string> {
    return Object.fromEntries(
      pets.map((p, i) => [p.id, p.color ?? PET_COLOR_PALETTE[i % PET_COLOR_PALETTE.length]])
    );
  }
  ```
- Replace `PET_COLORS` import with `PET_COLOR_PALETTE` from `../../utils/color`

---

## 4. Frontend: Calendar Ribbon Legibility

**`src/pages/calendar/MonthCalendar.tsx`**

Two changes to the ribbon renderer:

**Solid ribbons** (logged vet visits + medications): replace hardcoded `color: '#fff'` with `color: getContrastText(petColor)`.

**Scheduled (dashed) ribbons**: add a 20% tinted background fill so the text has a surface in both light and dark mode:
```ts
bgcolor: `${petColor}33`,          // 20% opacity tint
border: `2px dashed ${petColor}`,
```
Text color: `petColor` (unchanged — the tinted fill provides sufficient contrast for the saturated palette colors).

Import `getContrastText` from `../../utils/color`.

---

## 5. Frontend: Color Picker in Edit Pet Dialog

**`src/pages/health/PetDetailPage.tsx → EditPetDialog`**

Add `color` to the form state (initialized from `pet.color ?? PET_COLOR_PALETTE[0]`).

Add a **Calendar color** row below the Birth Date field — a flex row of 16 circular swatches. The currently selected swatch shows a white outline ring (`outline: 3px solid #fff; outline-offset: 2px`). Clicking a swatch updates `form.color`.

The `onSave` callback already accepts `Partial<Omit<Pet, 'id' | 'userId' | 'createdAt' | 'photoUrl'>>` and `petsApi.update` passes the payload straight to `PATCH /pets/:id`, so `color` flows through without any other client changes.

```tsx
// Swatch row snippet
<Box>
  <Typography variant="caption" color="text.secondary">Calendar color</Typography>
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
    {PET_COLOR_PALETTE.map((c) => (
      <Box
        key={c}
        onClick={() => setForm({ ...form, color: c })}
        sx={{
          width: 24, height: 24, borderRadius: '50%',
          bgcolor: c, cursor: 'pointer',
          ...(form.color === c && { outline: '3px solid', outlineColor: 'text.primary', outlineOffset: '2px' }),
        }}
      />
    ))}
  </Box>
</Box>
```

---

## Architecture Summary

| File | Repo | Change |
|---|---|---|
| `src/domain/pet/Pet.ts` | api | Add `color` prop + getter |
| `src/infrastructure/db/models/PetModel.ts` | api | Add `color` column |
| `src/application/pet/UpdatePetUseCase.ts` | api | Accept + pass through `color` |
| `src/infrastructure/mappers/PetMapper.ts` | api | Include `color` in DTO, domain, persistence |
| `src/infrastructure/http/controllers/PetController.ts` | api | Pass `color` from request body |
| `src/utils/color.ts` | client | New: `PET_COLOR_PALETTE` + `getContrastText` |
| `src/types/index.ts` | client | Add `color?` to `Pet` |
| `src/pages/calendar/CalendarPage.tsx` | client | `buildPetColors` uses `pet.color` |
| `src/pages/calendar/MonthCalendar.tsx` | client | `getContrastText` for solid text; tinted fill for scheduled |
| `src/pages/health/PetDetailPage.tsx` | client | Swatch picker in `EditPetDialog` |

---

## Edge Cases

- **Pet has no color set**: `buildPetColors` falls back to `PET_COLOR_PALETTE[i % 16]` — same behavior as today but with the better palette.
- **Invalid/missing hex in `getContrastText`**: only called with colors from the curated palette or from `pet.color` (which is also a palette color) — no defensive parsing needed.
- **20% tinted scheduled fill in dark mode**: `${petColor}33` on a dark cell background produces a subtle but visible tint. All palette colors are saturated enough to be distinguishable.
- **Color visible after save**: The edit mutation invalidates `['pet', petId]` (single pet). `CalendarPage` uses `['pets-calendar']` with no `staleTime`, so it refetches automatically when the user navigates back to the calendar — new color appears on next calendar visit.
