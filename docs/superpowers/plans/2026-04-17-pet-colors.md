# Pet Colors: Legibility + Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `color` field to the Pet model (backend + frontend), replace the hardcoded palette with 16 legible colors, and add a swatch picker to the Edit Pet dialog.

**Architecture:** Backend adds `color?: string` to `Pet` across domain/model/mapper/controller — no migration needed (`sequelize.sync({ alter: true })` handles it. Frontend adds a `src/utils/color.ts` utility, then threads `pet.color` through the calendar and the pet edit dialog.

**Tech Stack:** Node.js/TypeScript, sequelize-typescript, Express (api); React 19, TypeScript 6.0.2, MUI v9, TanStack Query v5, pnpm (client)

---

## File Map

| File | Repo | Change |
|---|---|---|
| `src/domain/pet/Pet.ts` | api | Add `color` prop + getter |
| `src/infrastructure/db/models/PetModel.ts` | api | Add `color` column |
| `src/application/pet/UpdatePetUseCase.ts` | api | Accept + pass through `color` |
| `src/infrastructure/mappers/PetMapper.ts` | api | Include `color` in DTO / toDomain / toPersistence |
| `src/infrastructure/http/controllers/PetController.ts` | api | Pass `color` from request body |
| `src/utils/color.ts` | client | New: `PET_COLOR_PALETTE` + `getContrastText` |
| `src/types/index.ts` | client | Add `color?` to `Pet` interface |
| `src/pages/calendar/CalendarPage.tsx` | client | `buildPetColors` uses `pet.color` + new palette |
| `src/pages/calendar/MonthCalendar.tsx` | client | `getContrastText` for solid ribbons; tinted fill for scheduled |
| `src/pages/health/PetDetailPage.tsx` | client | Swatch picker in `EditPetDialog` |

---

### Task 1: Backend — Add `color` to Pet

**Repo:** `~/projects/pet-health-tracker-api`

**Files:**
- Modify: `src/domain/pet/Pet.ts`
- Modify: `src/infrastructure/db/models/PetModel.ts`
- Modify: `src/application/pet/UpdatePetUseCase.ts`
- Modify: `src/infrastructure/mappers/PetMapper.ts`
- Modify: `src/infrastructure/http/controllers/PetController.ts`

**Background:** The API uses `sequelize.sync({ alter: true })` on startup (`src/main.ts:15`), so adding a column to `PetModel` is enough — no migration file needed. The `PUT /pets/:id` handler calls `UpdatePetUseCase`, which calls `Pet.reconstitute` and then `petRepository.save`.

- [ ] **Step 1: Update Pet domain**

Replace the full contents of `src/domain/pet/Pet.ts`:

```ts
import { AggregateRoot } from '../shared/AggregateRoot';
import { UniqueEntityId } from '../shared/UniqueEntityId';

interface PetProps {
  name: string;
  species: string;
  breed?: string;
  birthDate?: Date;
  userId: string;
  photoUrl?: string;
  color?: string;
  createdAt: Date;
}

export class Pet extends AggregateRoot<PetProps> {
  get name(): string { return this.props.name; }
  get species(): string { return this.props.species; }
  get breed(): string | undefined { return this.props.breed; }
  get birthDate(): Date | undefined { return this.props.birthDate; }
  get userId(): string { return this.props.userId; }
  get photoUrl(): string | undefined { return this.props.photoUrl; }
  get color(): string | undefined { return this.props.color; }
  get createdAt(): Date { return this.props.createdAt; }

  static create(props: Omit<PetProps, 'createdAt'>, id?: UniqueEntityId): Pet {
    return new Pet({ ...props, createdAt: new Date() }, id);
  }

  static reconstitute(props: PetProps, id: UniqueEntityId): Pet {
    return new Pet(props, id);
  }
}
```

- [ ] **Step 2: Add `color` column to PetModel**

In `src/infrastructure/db/models/PetModel.ts`, add this after the `photoUrl` column declaration (after line 24):

```ts
  @Column({ type: DataType.STRING(7), allowNull: true })
  declare color: string | null;
```

- [ ] **Step 3: Update UpdatePetUseCase**

Replace the full contents of `src/application/pet/UpdatePetUseCase.ts`:

```ts
import { Inject, Service } from 'typedi';
import { PetRepository, PET_REPOSITORY } from '../../domain/pet/PetRepository';
import { Pet } from '../../domain/pet/Pet';
import { ForbiddenError, NotFoundError } from '../../shared/errors/AppError';
import { UniqueEntityId } from '../../domain/shared/UniqueEntityId';

export interface UpdatePetInput {
  petId: string;
  name?: string;
  species?: string;
  breed?: string;
  birthDate?: Date;
  photoUrl?: string;
  color?: string;
  requestingUserId: string;
}

@Service()
export class UpdatePetUseCase {
  constructor(
    @Inject(PET_REPOSITORY) private readonly petRepository: PetRepository,
  ) {}

  async execute(input: UpdatePetInput): Promise<Pet> {
    const existing = await this.petRepository.findById(input.petId);
    if (!existing) throw new NotFoundError('Pet');
    if (existing.userId !== input.requestingUserId) throw new ForbiddenError('Not your pet');

    const updated = Pet.reconstitute(
      {
        name: input.name ?? existing.name,
        species: input.species ?? existing.species,
        breed: input.breed !== undefined ? input.breed : existing.breed,
        birthDate: input.birthDate !== undefined ? input.birthDate : existing.birthDate,
        photoUrl: input.photoUrl !== undefined ? input.photoUrl : existing.photoUrl,
        color: input.color !== undefined ? input.color : existing.color,
        userId: existing.userId,
        createdAt: existing.createdAt,
      },
      new UniqueEntityId(existing.id.toValue()),
    );

    await this.petRepository.save(updated);
    return updated;
  }
}
```

- [ ] **Step 4: Update PetMapper**

Replace the full contents of `src/infrastructure/mappers/PetMapper.ts`:

```ts
import { Service } from 'typedi';
import { PetModel } from '../db/models/PetModel';
import { Pet } from '../../domain/pet/Pet';
import { UniqueEntityId } from '../../domain/shared/UniqueEntityId';

export interface PetResponseDto {
  id: string;
  name: string;
  species: string;
  breed?: string;
  birthDate?: string;
  photoUrl?: string;
  color?: string;
  userId: string;
  createdAt: string;
}

@Service()
export class PetMapper {
  toDomain(model: PetModel): Pet {
    return Pet.reconstitute(
      {
        name: model.name,
        species: model.species,
        breed: model.breed ?? undefined,
        birthDate: model.birthDate ?? undefined,
        photoUrl: model.photoUrl ?? undefined,
        color: model.color ?? undefined,
        userId: model.userId,
        createdAt: model.createdAt,
      },
      new UniqueEntityId(model.id),
    );
  }

  toPersistence(pet: Pet): object {
    return {
      id: pet.id.toValue(),
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? null,
      birthDate: pet.birthDate ?? null,
      photoUrl: pet.photoUrl ?? null,
      color: pet.color ?? null,
      userId: pet.userId,
      createdAt: pet.createdAt,
    };
  }

  toResponse(pet: Pet): PetResponseDto {
    return {
      id: pet.id.toValue(),
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      birthDate: pet.birthDate?.toISOString(),
      photoUrl: pet.photoUrl,
      color: pet.color,
      userId: pet.userId,
      createdAt: pet.createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 5: Update PetController to pass `color`**

In `src/infrastructure/http/controllers/PetController.ts`, replace the `update` method:

```ts
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pet = await this.updatePet.execute({
        petId: req.params.petId,
        name: req.body.name,
        species: req.body.species,
        breed: req.body.breed,
        birthDate: req.body.birthDate ? new Date(req.body.birthDate) : undefined,
        color: req.body.color,
        requestingUserId: req.auth.userId,
      });
      res.json(this.mapper.toResponse(pet));
    } catch (err) {
      next(err);
    }
  };
```

- [ ] **Step 6: Verify the build**

```bash
cd ~/projects/pet-health-tracker-api
npm run build
```

Expected: `tsc` compiles with no errors.

- [ ] **Step 7: Commit**

```bash
cd ~/projects/pet-health-tracker-api
git add src/domain/pet/Pet.ts \
        src/infrastructure/db/models/PetModel.ts \
        src/application/pet/UpdatePetUseCase.ts \
        src/infrastructure/mappers/PetMapper.ts \
        src/infrastructure/http/controllers/PetController.ts
git commit -m "feat: add color field to Pet model and API"
```

---

### Task 2: Color Utilities (frontend)

**Repo:** `~/projects/pet-health-tracker-client`

**Files:**
- Create: `src/utils/color.ts`

**Background:** `getContrastText` uses WCAG relative luminance to decide white vs dark text. `PET_COLOR_PALETTE` contains 16 colors that all pass ≥ 4.5:1 contrast against white. Both are used in Tasks 3–5.

- [ ] **Step 1: Create `src/utils/color.ts`**

```ts
export const PET_COLOR_PALETTE = [
  '#1565c0', '#c62828', '#00796b', '#6a1b9a',
  '#e65100', '#2e7d32', '#4527a0', '#00838f',
  '#558b2f', '#ad1457', '#4e342e', '#37474f',
  '#0277bd', '#6d4c41', '#283593', '#00695c',
];

export function getContrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.179 ? '#1a2332' : '#fff';
}
```

- [ ] **Step 2: Verify the build**

```bash
cd ~/projects/pet-health-tracker-client
pnpm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/pet-health-tracker-client
git add src/utils/color.ts
git commit -m "feat: add PET_COLOR_PALETTE and getContrastText utility"
```

---

### Task 3: Pet type + CalendarPage fallback

**Repo:** `~/projects/pet-health-tracker-client`

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/pages/calendar/CalendarPage.tsx`

**Background:** Adding `color?` to the `Pet` type makes the API response field available everywhere. `buildPetColors` is updated to use `pet.color` when set, falling back to `PET_COLOR_PALETTE` by index (replacing the old `PET_COLORS` constant).

- [ ] **Step 1: Add `color` to the `Pet` type**

In `src/types/index.ts`, update the `Pet` interface by adding `color?: string` after `photoUrl?`:

```ts
export interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  birthDate?: string;
  photoUrl?: string;
  color?: string;
  userId: string;
  createdAt: string;
}
```

- [ ] **Step 2: Update `buildPetColors` in CalendarPage**

In `src/pages/calendar/CalendarPage.tsx`:

Replace line 14 (the type import) — add `PET_COLOR_PALETTE` import and remove the local `PET_COLORS` constant:

```tsx
import { PET_COLOR_PALETTE } from '../../utils/color';
import type { CalendarEvent, Pet, Vet, VetVisit, Medication } from '../../types';
```

Delete lines 16–19 (the `PET_COLORS` constant and old `buildPetColors`), replace with:

```tsx
function buildPetColors(pets: Pet[]): Record<string, string> {
  return Object.fromEntries(
    pets.map((p, i) => [p.id, p.color ?? PET_COLOR_PALETTE[i % PET_COLOR_PALETTE.length]])
  );
}
```

- [ ] **Step 3: Verify the build**

```bash
cd ~/projects/pet-health-tracker-client
pnpm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 4: Commit**

```bash
cd ~/projects/pet-health-tracker-client
git add src/types/index.ts src/pages/calendar/CalendarPage.tsx
git commit -m "feat: add color to Pet type, use pet.color in buildPetColors"
```

---

### Task 4: Calendar ribbon legibility

**Repo:** `~/projects/pet-health-tracker-client`

**Files:**
- Modify: `src/pages/calendar/MonthCalendar.tsx`

**Background:** Two changes to the ribbon renderer:
1. **Solid ribbons** (logged visits + medications): replace hardcoded `'#fff'` text with `getContrastText(petColor)` — fixes yellow and light-blue contrast.
2. **Scheduled (dashed) ribbons**: add `bgcolor: \`${petColor}33\`` (20% opacity tint) — replaces `'transparent'` so the text has a surface in both light and dark mode.

- [ ] **Step 1: Add `getContrastText` import**

In `src/pages/calendar/MonthCalendar.tsx`, add this import after line 7 (after the `CalendarEvent` import):

```tsx
import { getContrastText } from '../../utils/color';
```

- [ ] **Step 2: Update scheduled ribbon `bgcolor` and solid ribbon text color**

Find the ribbon `<Box>` `sx` prop (around line 149). Replace the spread that handles solid vs scheduled:

**Before:**
```tsx
...(isScheduled
  ? {
      bgcolor: 'transparent',
      border: `2px dashed ${petColor}`,
    }
  : {
      bgcolor: petColor,
    }),
```

**After:**
```tsx
...(isScheduled
  ? {
      bgcolor: `${petColor}33`,
      border: `2px dashed ${petColor}`,
    }
  : {
      bgcolor: petColor,
    }),
```

Then find the `<Typography>` label (the last element in the ribbon Box, around line 186). Replace its `color`:

**Before:**
```tsx
color: isScheduled ? petColor : '#fff',
```

**After:**
```tsx
color: isScheduled ? petColor : getContrastText(petColor),
```

- [ ] **Step 3: Verify the build**

```bash
cd ~/projects/pet-health-tracker-client
pnpm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 4: Commit**

```bash
cd ~/projects/pet-health-tracker-client
git add src/pages/calendar/MonthCalendar.tsx
git commit -m "feat: fix ribbon legibility with contrast text and tinted scheduled fill"
```

---

### Task 5: Color picker in Edit Pet dialog

**Repo:** `~/projects/pet-health-tracker-client`

**Files:**
- Modify: `src/pages/health/PetDetailPage.tsx`

**Background:** `EditPetDialog` is defined at the bottom of `PetDetailPage.tsx` (line 584). Its form state currently has `name`, `species`, `breed`, `birthDate`. We add `color` initialized from `pet.color` (with fallback to first palette color), add a swatch row, and include `color` in the `onSave` payload.

The `onSave` type is `(data: Partial<Omit<Pet, 'id' | 'userId' | 'createdAt' | 'photoUrl'>>) => void` — since `Pet` now has `color?`, `color` flows through without any other changes. The mutation calls `petsApi.update(petId, data)` which calls `PUT /pets/:id`.

- [ ] **Step 1: Add `PET_COLOR_PALETTE` import to PetDetailPage**

In `src/pages/health/PetDetailPage.tsx`, add this import near the top with the other utility/API imports:

```tsx
import { PET_COLOR_PALETTE } from '../../utils/color';
```

- [ ] **Step 2: Add `color` to `EditPetDialog` form state**

Find the `useState` in `EditPetDialog` (around line 591). Replace it:

```tsx
  const [form, setForm] = useState({
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? '',
    birthDate: pet.birthDate ? new Date(pet.birthDate).toISOString().slice(0, 10) : '',
    color: pet.color ?? PET_COLOR_PALETTE[0],
  });
```

- [ ] **Step 3: Add color swatch row to the dialog**

In the `<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>` inside `<DialogContent>`, add this block after the Birth Date `<TextField>`:

```tsx
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Calendar color
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {PET_COLOR_PALETTE.map((c) => (
                <Box
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: c,
                    cursor: 'pointer',
                    ...(form.color === c && {
                      outline: '3px solid',
                      outlineColor: 'text.primary',
                      outlineOffset: '2px',
                    }),
                  }}
                />
              ))}
            </Box>
          </Box>
```

- [ ] **Step 4: Include `color` in the `onSave` call**

Find the `onClick` on the Save `<Button>` (around line 614). Replace it:

```tsx
          onClick={() => onSave({
            name: form.name,
            species: form.species,
            breed: form.breed || undefined,
            birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : undefined,
            color: form.color,
          })}
```

- [ ] **Step 5: Verify the build**

```bash
cd ~/projects/pet-health-tracker-client
pnpm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 6: Visual end-to-end check**

Start the dev server:
```bash
cd ~/projects/pet-health-tracker-client
pnpm run dev
```

Open http://localhost:5173 and verify:
1. Navigate to a pet detail page (Pets → click a pet)
2. Click the edit (pencil) button → "Edit Pet" dialog opens
3. A "Calendar color" row with 16 colored circles appears below Birth Date
4. Click a swatch — it gets a ring outline indicating selection
5. Save → navigate back to the calendar
6. The pet's ribbons now use the selected color, with readable text

- [ ] **Step 7: Commit**

```bash
cd ~/projects/pet-health-tracker-client
git add src/pages/health/PetDetailPage.tsx
git commit -m "feat: add color swatch picker to Edit Pet dialog"
```
