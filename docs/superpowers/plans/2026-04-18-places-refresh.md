# Google Places Refresh / Append for Vets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow vets to be linked to a Google Places record so their info (name, address, phone, rating, Maps URL) can be populated or refreshed at any time via an icon button on the expanded accordion card.

**Architecture:** Add `place_id` to the `vets` table and flow it through the API domain/mapper/use-cases. On the client, a new `PlacesSyncDialog` component handles both the "search and link" flow (manual vets) and the "re-fetch and save" flow (Places-linked vets). Two icon buttons on the expanded card open this dialog.

**Tech Stack:** Sequelize-TypeScript (`sync({ alter: true })`), TypeDI, Express, React, MUI v9, React Query (`useMutation`, `useQueryClient`), existing `placesApi` and `vetsApi`.

---

## File Map

**API — pet-health-tracker-api/src/**

| File | Change |
|---|---|
| `infrastructure/db/models/VetModel.ts` | Add `placeId` column |
| `domain/vet/Vet.ts` | Add `placeId` to props + getters |
| `infrastructure/mappers/VetMapper.ts` | Map `placeId` in toDomain / toPersistence / toResponse |
| `application/vet/CreateVetUseCase.ts` | Accept `placeId` in input |
| `application/vet/UpdateVetUseCase.ts` | Accept `placeId` in input |

**Client — pet-health-tracker-client/src/**

| File | Change |
|---|---|
| `types/index.ts` | Add `placeId?: string` to `Vet` |
| `api/vets.ts` | No change needed — `update` already accepts `Omit<Vet, ...>` |
| `components/PlacesSyncDialog.tsx` | New component |
| `pages/vets/VetsPage.tsx` | Add sync icon buttons; store `placeId` in Add Vet form |

---

## Task 1: Add `placeId` to the API data layer

**Repo:** `pet-health-tracker-api`

**Files:**
- Modify: `src/infrastructure/db/models/VetModel.ts`
- Modify: `src/domain/vet/Vet.ts`
- Modify: `src/infrastructure/mappers/VetMapper.ts`
- Modify: `src/application/vet/CreateVetUseCase.ts`
- Modify: `src/application/vet/UpdateVetUseCase.ts`

There is no test suite in this project. Verification is TypeScript compilation + manual smoke test.

- [ ] **Step 1: Add `placeId` column to `VetModel`**

In `src/infrastructure/db/models/VetModel.ts`, add after the `rating` column:

```typescript
@Column({ type: DataType.STRING, allowNull: true, field: 'place_id' })
declare placeId: string | null;
```

The full file after change:

```typescript
import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { UserModel } from './UserModel';
import { VetWorkHoursModel } from './VetWorkHoursModel';

@Table({ tableName: 'vets', timestamps: false })
export class VetModel extends Model {
  @PrimaryKey
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUID, allowNull: false, field: 'user_id' })
  declare userId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare address: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare phone: string | null;

  @Column({ type: DataType.STRING, allowNull: true, field: 'google_maps_url' })
  declare googleMapsUrl: string | null;

  @Column({ type: DataType.FLOAT, allowNull: true })
  declare rating: number | null;

  @Column({ type: DataType.STRING, allowNull: true, field: 'place_id' })
  declare placeId: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare notes: string | null;

  @Column({ type: DataType.DATE, allowNull: false, field: 'created_at' })
  declare createdAt: Date;

  @BelongsTo(() => UserModel)
  declare user: UserModel;

  @HasMany(() => VetWorkHoursModel)
  declare workHours: VetWorkHoursModel[];
}
```

- [ ] **Step 2: Add `placeId` to the `Vet` domain entity**

Replace `src/domain/vet/Vet.ts` with:

```typescript
import { Entity } from '../shared/Entity';
import { UniqueEntityId } from '../shared/UniqueEntityId';
import type { DayOfWeek } from '../health/value-objects/ReminderSchedule';

export interface VetWorkHoursProps {
  dayOfWeek: DayOfWeek;
  open: boolean;
  startTime?: string;
  endTime?: string;
}

interface VetProps {
  userId: string;
  name: string;
  address?: string;
  phone?: string;
  workHours?: VetWorkHoursProps[];
  googleMapsUrl?: string;
  rating?: number;
  placeId?: string;
  notes?: string;
  createdAt: Date;
}

export class Vet extends Entity<VetProps> {
  get userId(): string { return this.props.userId; }
  get name(): string { return this.props.name; }
  get address(): string | undefined { return this.props.address; }
  get phone(): string | undefined { return this.props.phone; }
  get workHours(): VetWorkHoursProps[] | undefined { return this.props.workHours; }
  get googleMapsUrl(): string | undefined { return this.props.googleMapsUrl; }
  get rating(): number | undefined { return this.props.rating; }
  get placeId(): string | undefined { return this.props.placeId; }
  get notes(): string | undefined { return this.props.notes; }
  get createdAt(): Date { return this.props.createdAt; }

  static create(props: Omit<VetProps, 'createdAt'>, id?: UniqueEntityId): Vet {
    return new Vet({ ...props, createdAt: new Date() }, id);
  }

  static reconstitute(props: VetProps, id: UniqueEntityId): Vet {
    return new Vet(props, id);
  }
}
```

- [ ] **Step 3: Update `VetMapper` to map `placeId`**

Replace `src/infrastructure/mappers/VetMapper.ts` with:

```typescript
// pet-health-tracker-api/src/infrastructure/mappers/VetMapper.ts
import { Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { VetModel } from '../db/models/VetModel';
import { Vet, VetWorkHoursProps } from '../../domain/vet/Vet';
import { UniqueEntityId } from '../../domain/shared/UniqueEntityId';
import type { DayOfWeek } from '../../domain/health/value-objects/ReminderSchedule';

export interface WorkHoursDayDto {
  dayOfWeek: string;
  open: boolean;
  startTime?: string;
  endTime?: string;
}

export interface VetResponseDto {
  id: string;
  userId: string;
  name: string;
  address?: string;
  phone?: string;
  workHours?: WorkHoursDayDto[];
  googleMapsUrl?: string;
  rating?: number;
  placeId?: string;
  notes?: string;
  createdAt: string;
}

@Service()
export class VetMapper {
  toDomain(model: VetModel): Vet {
    return Vet.reconstitute(
      {
        userId: model.userId,
        name: model.name,
        address: model.address ?? undefined,
        phone: model.phone ?? undefined,
        workHours: (model.workHours ?? []).map((wh) => ({
          dayOfWeek: wh.dayOfWeek as DayOfWeek,
          open: wh.open,
          startTime: wh.startTime ?? undefined,
          endTime: wh.endTime ?? undefined,
        })),
        googleMapsUrl: model.googleMapsUrl ?? undefined,
        rating: model.rating ?? undefined,
        placeId: model.placeId ?? undefined,
        notes: model.notes ?? undefined,
        createdAt: model.createdAt,
      },
      new UniqueEntityId(model.id),
    );
  }

  toPersistence(vet: Vet): object {
    return {
      id: vet.id.toValue(),
      userId: vet.userId,
      name: vet.name,
      address: vet.address ?? null,
      phone: vet.phone ?? null,
      googleMapsUrl: vet.googleMapsUrl ?? null,
      rating: vet.rating ?? null,
      placeId: vet.placeId ?? null,
      notes: vet.notes ?? null,
      createdAt: vet.createdAt,
    };
  }

  toWorkHoursPersistence(vetId: string, hours: VetWorkHoursProps[]): object[] {
    return hours.map((wh) => ({
      id: uuidv4(),
      vetId,
      dayOfWeek: wh.dayOfWeek,
      open: wh.open,
      startTime: wh.open ? (wh.startTime ?? null) : null,
      endTime: wh.open ? (wh.endTime ?? null) : null,
    }));
  }

  toResponse(vet: Vet): VetResponseDto {
    return {
      id: vet.id.toValue(),
      userId: vet.userId,
      name: vet.name,
      address: vet.address,
      phone: vet.phone,
      workHours: vet.workHours?.map((wh) => ({
        dayOfWeek: wh.dayOfWeek,
        open: wh.open,
        startTime: wh.startTime,
        endTime: wh.endTime,
      })),
      googleMapsUrl: vet.googleMapsUrl,
      rating: vet.rating,
      placeId: vet.placeId,
      notes: vet.notes,
      createdAt: vet.createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 4: Accept `placeId` in `CreateVetUseCase`**

Replace `src/application/vet/CreateVetUseCase.ts` with:

```typescript
import { Inject, Service } from 'typedi';
import { VetRepository, VET_REPOSITORY } from '../../domain/vet/VetRepository';
import { Vet, VetWorkHoursProps } from '../../domain/vet/Vet';

interface CreateVetInput {
  name: string;
  address?: string;
  phone?: string;
  workHours?: VetWorkHoursProps[];
  googleMapsUrl?: string;
  rating?: number;
  placeId?: string;
  notes?: string;
  requestingUserId: string;
}

@Service()
export class CreateVetUseCase {
  constructor(
    @Inject(VET_REPOSITORY) private readonly vetRepository: VetRepository,
  ) {}

  async execute(input: CreateVetInput): Promise<Vet> {
    const vet = Vet.create({
      userId: input.requestingUserId,
      name: input.name,
      address: input.address,
      phone: input.phone,
      workHours: input.workHours,
      googleMapsUrl: input.googleMapsUrl,
      rating: input.rating,
      placeId: input.placeId,
      notes: input.notes,
    });

    await this.vetRepository.save(vet);
    return vet;
  }
}
```

- [ ] **Step 5: Accept `placeId` in `UpdateVetUseCase`**

Replace `src/application/vet/UpdateVetUseCase.ts` with:

```typescript
import { Inject, Service } from 'typedi';
import { VetRepository, VET_REPOSITORY } from '../../domain/vet/VetRepository';
import { Vet, VetWorkHoursProps } from '../../domain/vet/Vet';

interface UpdateVetInput {
  vetId: string;
  name?: string;
  address?: string;
  phone?: string;
  workHours?: VetWorkHoursProps[];
  googleMapsUrl?: string;
  rating?: number;
  placeId?: string;
  notes?: string;
  requestingUserId: string;
}

@Service()
export class UpdateVetUseCase {
  constructor(
    @Inject(VET_REPOSITORY) private readonly vetRepository: VetRepository,
  ) {}

  async execute(input: UpdateVetInput): Promise<Vet> {
    const vet = await this.vetRepository.findById(input.vetId);
    if (!vet) {
      const err = new Error('Vet not found') as any;
      err.status = 404;
      throw err;
    }
    if (vet.userId !== input.requestingUserId) {
      const err = new Error('Forbidden') as any;
      err.status = 403;
      throw err;
    }

    const updated = Vet.reconstitute(
      {
        userId: vet.userId,
        name: input.name ?? vet.name,
        address: input.address ?? vet.address,
        phone: input.phone ?? vet.phone,
        workHours: input.workHours ?? vet.workHours,
        googleMapsUrl: input.googleMapsUrl ?? vet.googleMapsUrl,
        rating: input.rating ?? vet.rating,
        placeId: input.placeId ?? vet.placeId,
        notes: input.notes ?? vet.notes,
        createdAt: vet.createdAt,
      },
      vet.id,
    );

    await this.vetRepository.save(updated);
    return updated;
  }
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /path/to/pet-health-tracker-api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/infrastructure/db/models/VetModel.ts \
        src/domain/vet/Vet.ts \
        src/infrastructure/mappers/VetMapper.ts \
        src/application/vet/CreateVetUseCase.ts \
        src/application/vet/UpdateVetUseCase.ts
git commit -m "feat: add placeId to Vet — model, domain, mapper, use-cases"
```

---

## Task 2: Add `placeId` to the client `Vet` type and Add Vet form

**Repo:** `pet-health-tracker-client`

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/pages/vets/VetsPage.tsx`

- [ ] **Step 1: Add `placeId` to the `Vet` interface**

In `src/types/index.ts`, find the `Vet` interface and add `placeId?: string` after `rating`:

```typescript
export interface Vet {
  id: string;
  userId: string;
  name: string;
  address?: string;
  phone?: string;
  workHours?: VetWorkHours[];
  googleMapsUrl?: string;
  rating?: number;
  placeId?: string;
  notes?: string;
  createdAt: string;
}
```

- [ ] **Step 2: Add `placeId` to `emptyForm` in VetsPage**

In `src/pages/vets/VetsPage.tsx`, find the `emptyForm` constant (line ~23) and add `placeId: ''`:

```typescript
const emptyForm = {
  name: '',
  address: '',
  phone: '',
  workHours: [] as VetWorkHours[],
  googleMapsUrl: '',
  notes: '',
  rating: '',
  placeId: '',
};
```

- [ ] **Step 3: Store `placeId` when a place is picked**

In `src/pages/vets/VetsPage.tsx`, find `handlePickPlace` (line ~102). Currently it never stores `placeId`. Change the `setForm` call to also set `placeId`:

```typescript
const handlePickPlace = async (placeId: string) => {
  setIsSearchLoading(true);
  setSearchError(null);
  try {
    const details: PlaceDetails = await placesApi.details(placeId);
    setForm((f) => ({
      ...f,
      name: details.name || f.name,
      address: details.address || f.address,
      phone: details.phone || f.phone,
      googleMapsUrl: details.googleMapsUrl || f.googleMapsUrl,
      rating: details.rating !== undefined ? String(details.rating) : f.rating,
      placeId,
    }));
    setSearchState('done');
  } catch {
    setSearchError('Could not load details. Try again or enter manually.');
  } finally {
    setIsSearchLoading(false);
  }
};
```

- [ ] **Step 4: Submit `placeId` in the create mutation**

In `src/pages/vets/VetsPage.tsx`, find the `mutation` (line ~137). Add `placeId` to the `mutationFn`:

```typescript
const mutation = useMutation({
  mutationFn: () => vetsApi.create({
    name: form.name,
    address: form.address || undefined,
    phone: form.phone || undefined,
    workHours: form.workHours.length > 0 ? form.workHours : undefined,
    googleMapsUrl: form.googleMapsUrl || undefined,
    rating: form.rating ? Number(form.rating) : undefined,
    placeId: form.placeId || undefined,
    notes: form.notes || undefined,
  }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['vets'] });
    queryClient.invalidateQueries({ queryKey: ['vets-all'] });
    setOpen(false);
    setForm(emptyForm);
    resetSearch();
  },
  onError: (err) => showError(getApiError(err)),
});
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /path/to/pet-health-tracker-client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/pages/vets/VetsPage.tsx
git commit -m "feat: add placeId to Vet type and store it in Add Vet form"
```

---

## Task 3: Build `PlacesSyncDialog` component

**Repo:** `pet-health-tracker-client`

**Files:**
- Create: `src/components/PlacesSyncDialog.tsx`

This component handles both flows:
- **Manual vet (no `placeId`):** search UI → pick → update vet via `vetsApi.update`
- **Places vet (has `placeId`):** auto-fetches on open → updates vet → closes

It calls `vetsApi.update` directly and fires `onSynced()` on success so the parent can invalidate the query.

- [ ] **Step 1: Create `PlacesSyncDialog.tsx`**

Create `src/components/PlacesSyncDialog.tsx`:

```typescript
import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Typography,
} from '@mui/material';
import { placesApi, type PlaceSearchResult } from '../api/places';
import { vetsApi } from '../api/vets';
import { getApiError } from '../api/client';
import type { Vet } from '../types';

interface PlacesSyncDialogProps {
  vet: Vet;
  open: boolean;
  onClose: () => void;
  onSynced: () => void;
}

export function PlacesSyncDialog({ vet, open, onClose, onSynced }: PlacesSyncDialogProps) {
  const isLinked = Boolean(vet.placeId);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state (manual vet only)
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);

  const doRefresh = async (placeId?: string) => {
    const id = placeId ?? vet.placeId!;
    setLoading(true);
    setError(null);
    try {
      const details = await placesApi.details(id);
      await vetsApi.update(vet.id, {
        name: details.name || vet.name,
        address: details.address || vet.address,
        phone: details.phone || vet.phone,
        googleMapsUrl: details.googleMapsUrl || vet.googleMapsUrl,
        rating: details.rating ?? vet.rating,
        placeId: id,
        workHours: vet.workHours,
        notes: vet.notes,
      });
      onSynced();
      onClose();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh for linked vets — defined after doRefresh to avoid hoisting issue
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (isLinked) {
      doRefresh();
    }
  }, [open]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await placesApi.search(query.trim());
      setResults(res);
    } catch {
      setError('Search failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (placeId: string) => {
    doRefresh(placeId);
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isLinked ? 'Refresh from Google Places' : 'Find on Google Places'}
      </DialogTitle>
      <DialogContent>
        {isLinked ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3, gap: 2 }}>
            {loading && <CircularProgress size={32} />}
            {loading && <Typography variant="body2" color="text.secondary">Refreshing…</Typography>}
            {error && (
              <>
                <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
                <Button variant="outlined" onClick={() => doRefresh()} disabled={loading}>
                  Retry
                </Button>
              </>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by clinic name or address"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                disabled={loading}
              />
              <Button variant="contained" onClick={handleSearch} disabled={loading || !query.trim()}>
                Search
              </Button>
            </Box>
            {loading && <CircularProgress size={20} sx={{ alignSelf: 'center' }} />}
            {error && <Alert severity="error">{error}</Alert>}
            {results.map((r) => (
              <Box
                key={r.placeId}
                onClick={() => handlePick(r.placeId)}
                sx={{ px: 1.5, py: 1, borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                <Typography variant="caption" color="text.secondary">{r.address}</Typography>
              </Box>
            ))}
            {results.length === 0 && !loading && query && (
              <Typography variant="caption" color="text.secondary">No results found</Typography>
            )}
          </Box>
        )}
      </DialogContent>
      {!isLinked && (
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /path/to/pet-health-tracker-client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlacesSyncDialog.tsx
git commit -m "feat: add PlacesSyncDialog — search+link or refresh from Google Places"
```

---

## Task 4: Wire sync icon buttons into VetsPage

**Repo:** `pet-health-tracker-client`

**Files:**
- Modify: `src/pages/vets/VetsPage.tsx`

Add two icon buttons to the expanded accordion card: `SyncIcon` for linked vets (has `placeId`), `TravelExploreIcon` (or `SearchIcon`) for manual vets. Both open `PlacesSyncDialog`.

- [ ] **Step 1: Add imports**

In `src/pages/vets/VetsPage.tsx`, add to the MUI icons import line:

```typescript
import {
  Add, AccessTime, Edit, ExpandMore, LocationOn, Map,
  MedicalServices, Phone, Star, Sync, TravelExplore,
} from '@mui/icons-material';
```

And add the import for `PlacesSyncDialog` and `IconButton`:

```typescript
import { PlacesSyncDialog } from '../../components/PlacesSyncDialog';
```

Also add `IconButton` and `Tooltip` to the MUI import:

```typescript
import {
  Alert, Box, Button, Card, CardContent, Chip, Container,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, Skeleton, TextField, Tooltip, Typography,
} from '@mui/material';
```

- [ ] **Step 2: Add `syncVet` state**

In `src/pages/vets/VetsPage.tsx`, after the `editVet` state declaration, add:

```typescript
const [syncVet, setSyncVet] = useState<Vet | null>(null);
```

- [ ] **Step 3: Add sync icon buttons to the expanded card actions**

In `src/pages/vets/VetsPage.tsx`, find the expanded card `<Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>` section (around line 294) that contains the Maps button and Edit button. Add the sync/search icon button:

```tsx
<Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
  {vet.googleMapsUrl && (
    <Button
      size="small"
      startIcon={<Map />}
      href={vet.googleMapsUrl}
      target="_blank"
      rel="noopener"
      onClick={(e) => e.stopPropagation()}
    >
      Maps
    </Button>
  )}
  <Button
    size="small"
    startIcon={<Edit />}
    onClick={(e) => { e.stopPropagation(); setEditVet(vet); }}
  >
    Edit
  </Button>
  <Tooltip title={vet.placeId ? 'Refresh from Google Places' : 'Find on Google Places'}>
    <IconButton
      size="small"
      onClick={(e) => { e.stopPropagation(); setSyncVet(vet); }}
    >
      {vet.placeId ? <Sync fontSize="small" /> : <TravelExplore fontSize="small" />}
    </IconButton>
  </Tooltip>
</Box>
```

- [ ] **Step 4: Add `PlacesSyncDialog` below the edit dialog**

In `src/pages/vets/VetsPage.tsx`, at the end of the JSX (before the closing `</Container>`), add:

```tsx
{syncVet && (
  <PlacesSyncDialog
    vet={syncVet}
    open={Boolean(syncVet)}
    onClose={() => setSyncVet(null)}
    onSynced={() => {
      queryClient.invalidateQueries({ queryKey: ['vets'] });
      queryClient.invalidateQueries({ queryKey: ['vets-all'] });
      setSyncVet(null);
    }}
  />
)}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /path/to/pet-health-tracker-client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Smoke test**

Start the API and client. In the Vets list:
1. Expand a manually-entered vet → see `TravelExplore` icon → click → search dialog opens → search → pick a result → vet info updates, dialog closes
2. Expand a vet that was created via Google Places (will have `placeId` after Task 2 fix) → see `Sync` icon → click → dialog opens showing spinner → vet info refreshed, dialog closes
3. Add a new vet via Places search → confirm `placeId` is stored (visible in network response)

- [ ] **Step 7: Commit**

```bash
git add src/pages/vets/VetsPage.tsx
git commit -m "feat: add Places sync/search icon buttons to vet accordion cards"
```
