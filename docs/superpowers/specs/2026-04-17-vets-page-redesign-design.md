# Vets Page Redesign + Working Hours Integration

**Date:** 2026-04-17  
**Status:** Approved

## Overview

Two goals:
1. Declutter the vets list — cards show only the essential info at a glance
2. Show a vet's working hours when scheduling a visit, with a non-blocking warning if the selected time is outside those hours

## Section 1: Data Model

### New table: `vet_work_hours`

| column | type | notes |
|---|---|---|
| `id` | UUID PK | |
| `vet_id` | UUID FK → `vets.id` | CASCADE delete |
| `day_of_week` | ENUM `MON`/`TUE`/`WED`/`THU`/`FRI`/`SAT`/`SUN` | reuses existing `DayOfWeek` type |
| `open` | BOOLEAN NOT NULL | default false |
| `start_time` | VARCHAR(5) nullable | e.g. `"08:00"` — null when `open = false` |
| `end_time` | VARCHAR(5) nullable | e.g. `"18:00"` — null when `open = false` |

Up to 7 rows per vet (one per day). Days not present in the table are treated as "no data".

The `work_hours` text column is dropped from `vets`. Schema change applied via `sync({ alter: true })`.

## Section 2: API Layer

### New files
- `src/infrastructure/db/models/VetWorkHoursModel.ts` — sequelize-typescript model for `vet_work_hours`

### Modified files

**`VetModel.ts`**
- Remove `workHours` column declaration
- Add `@HasMany(() => VetWorkHoursModel) workHours` association

**`database.ts`**
- Register `VetWorkHoursModel` in the models array

**`Vet.ts` (domain)**
- Replace `workHours?: string` with `workHours?: VetWorkHoursProps[]`
- `VetWorkHoursProps`: `{ dayOfWeek: DayOfWeek; open: boolean; startTime?: string; endTime?: string }`

**`VetMapper.ts`**
- `toDomain`: map `model.workHours` (eager-loaded array) to `VetWorkHoursProps[]`
- `toPersistence`: no longer includes `work_hours` string field
- `VetResponseDto.workHours`: `WorkHoursDayDto[]` (same shape as `VetWorkHoursProps`)
- Add `toWorkHoursPersistence(vetId, hours[])` helper for bulk insert

**`SequelizeVetRepository.ts`**
- `findByPk` and `findAndCountAll`: add `include: [VetWorkHoursModel]`
- `save(vet)`: after upserting vet, delete existing work hours rows for that `vetId`, then bulk-insert new ones

**`CreateVetUseCase.ts`**
- Accept `workHours?: WorkHoursInput[]` in input, pass to `Vet.create()`

**New: `UpdateVetUseCase.ts`**
- Accepts all editable vet fields including `workHours?: WorkHoursInput[]`

`WorkHoursInput` = `{ dayOfWeek: DayOfWeek; open: boolean; startTime?: string; endTime?: string }`
- Loads existing vet, updates props, calls `vetRepository.save()`

**`VetController.ts`**
- Add `PUT /vets/:id` route handler calling `UpdateVetUseCase`

**`vetRoutes.ts`**
- Register `PUT /vets/:id`

### Client (`src/types/index.ts`)
```ts
export interface VetWorkHours {
  dayOfWeek: DayOfWeek;
  open: boolean;
  startTime?: string;
  endTime?: string;
}

export interface Vet {
  // ... existing fields minus workHours string ...
  workHours?: VetWorkHours[];
}
```

**`src/api/vets.ts`**
- Add `update(id, data)` method calling `PUT /vets/:id`

## Section 3: VetsPage UI

### Card (collapsed)
- Left: MedicalServices icon + name (bold) + notes snippet (if present, muted, truncated)
- Right: phone chip + rating chip (only when present)
- A chevron icon indicates expandability

### Card (expanded, accordion in-place)
- **Address**: LocationOn icon + text (if present)
- **Working hours grid**: compact table — one row per configured day, showing day abbreviation + time range or "Closed". If `workHours` is empty/absent: "No hours set".
- **Maps link**: button with Map icon (only if `googleMapsUrl` present)
- **Edit button**: opens Edit Vet dialog

### Edit Vet dialog
Same layout as Add Vet dialog, pre-populated with existing values. Includes the work hours editor (see Section 4). On save, calls `vetsApi.update()`.

## Section 4: Work Hours Editor Component

**New component: `WorkHoursEditor`**

```ts
interface WorkHoursEditorProps {
  value: WorkHoursInput[];
  onChange: (hours: WorkHoursInput[]) => void;
}
```

Renders 7 rows (Mon–Sun):
- Checkbox/switch: toggles `open`
- When open: `type="time"` inputs for `startTime` and `endTime` (enabled)
- When closed: time inputs greyed out / hidden
- When a day is toggled on with no times set: defaults to `startTime: "08:00"`, `endTime: "18:00"`

Used in both Add Vet and Edit Vet dialogs. Replaces the previous free-text "Work Hours" TextField.

**Note on Google Maps auto-fill:** The Places API returns work hours as a pre-formatted string, not structured data. After this change, auto-fill no longer populates work hours — the field is left blank for manual entry. The `workHours` field in `PlaceDetails` is removed from the form fill logic in `VetsPage.tsx`.

## Section 5: Scheduling Dialog — Working Hours Warning

Location: `PetDetailPage.tsx`, "Add Vet Visit" dialog (lines 444–536).

When **both** a vet with `workHours` data **and** a `visitDate` are selected, and the visit is a future/scheduled visit (`isScheduling === true`):

1. Derive `dayOfWeek` from `visitDate` using a helper that maps `Date.getDay()` (0=Sun…6=Sat) to `DayOfWeek` enum
2. Find matching entry in `selectedVet.workHours` for that day
3. Below the date/time picker, render:
   - Day is open: `"Mon: 08:00–18:00"` — `Typography variant="caption"` muted
   - Day is closed, or day is not present in the vet's `workHours` array (but array is non-empty): `"Mon: Closed"` — same style
   - `workHours` array is empty/absent entirely: nothing rendered
4. If selected time is outside the open range, or the day is closed/missing:
   - Render `<Alert severity="warning">Outside working hours</Alert>` below the hours line
   - Non-blocking — user can still save

No changes for logging past visits.
