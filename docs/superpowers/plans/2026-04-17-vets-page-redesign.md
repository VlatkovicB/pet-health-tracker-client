# Vets Page Redesign + Working Hours Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cluttered vets list with compact accordion cards, introduce a `vet_work_hours` relational table for structured per-day hours, and show an out-of-hours warning when scheduling a vet visit.

**Architecture:** A new `vet_work_hours` table stores up to 7 rows per vet (one per day). The API eagerly loads and bulk-replaces these rows when saving a vet. The client renders a `WorkHoursEditor` component in Add/Edit dialogs and a non-blocking warning in the scheduling dialog.

**Tech Stack:** API — Node.js, Express, Sequelize-TypeScript, TypeDI, PostgreSQL, UUID v4. Client — React, Vite, MUI v9, React Query, pnpm.

---

## File Map

**API — `pet-health-tracker-api/src/`**
- CREATE: `infrastructure/db/models/VetWorkHoursModel.ts` — Sequelize model for `vet_work_hours`
- MODIFY: `infrastructure/db/models/VetModel.ts` — remove `workHours` string column, add `@HasMany`
- MODIFY: `infrastructure/db/database.ts` — register `VetWorkHoursModel`
- MODIFY: `domain/vet/Vet.ts` — replace `workHours?: string` with `workHours?: VetWorkHoursProps[]`
- MODIFY: `infrastructure/mappers/VetMapper.ts` — eager-load mapping, new DTO shape, `toWorkHoursPersistence`
- MODIFY: `infrastructure/db/repositories/SequelizeVetRepository.ts` — include association, bulk-replace rows
- MODIFY: `application/vet/CreateVetUseCase.ts` — accept `workHours?: VetWorkHoursProps[]`
- CREATE: `application/vet/UpdateVetUseCase.ts` — load + update + save vet
- MODIFY: `infrastructure/http/controllers/VetController.ts` — add `update` handler
- MODIFY: `infrastructure/http/routes/vetRoutes.ts` — add `PUT /vets/:id`

**Client — `pet-health-tracker-client/src/`**
- MODIFY: `types/index.ts` — add `VetWorkHours` interface, update `Vet` type
- MODIFY: `api/vets.ts` — add `update()` method
- CREATE: `components/WorkHoursEditor.tsx` — 7-row controlled hours editor
- MODIFY: `pages/vets/VetsPage.tsx` — compact cards, accordion expand, edit dialog, WorkHoursEditor
- MODIFY: `pages/health/PetDetailPage.tsx` — hours hint + warning in scheduling dialog

---

## Task 1: VetWorkHoursModel + VetModel + database registration (API)

**Files:**
- Create: `pet-health-tracker-api/src/infrastructure/db/models/VetWorkHoursModel.ts`
- Modify: `pet-health-tracker-api/src/infrastructure/db/models/VetModel.ts`
- Modify: `pet-health-tracker-api/src/infrastructure/db/database.ts`

- [ ] **Step 1: Create `VetWorkHoursModel.ts`**

```typescript
// pet-health-tracker-api/src/infrastructure/db/models/VetWorkHoursModel.ts
import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { VetModel } from './VetModel';

@Table({ tableName: 'vet_work_hours', timestamps: false })
export class VetWorkHoursModel extends Model {
  @PrimaryKey
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => VetModel)
  @Column({ type: DataType.UUID, allowNull: false, field: 'vet_id' })
  declare vetId: string;

  @Column({
    type: DataType.ENUM('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'),
    allowNull: false,
    field: 'day_of_week',
  })
  declare dayOfWeek: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare open: boolean;

  @Column({ type: DataType.STRING(5), allowNull: true, field: 'start_time' })
  declare startTime: string | null;

  @Column({ type: DataType.STRING(5), allowNull: true, field: 'end_time' })
  declare endTime: string | null;

  @BelongsTo(() => VetModel)
  declare vet: VetModel;
}
```

- [ ] **Step 2: Update `VetModel.ts`** — remove `workHours` column, add `@HasMany`

Replace the existing `VetModel.ts` content with:

```typescript
// pet-health-tracker-api/src/infrastructure/db/models/VetModel.ts
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

- [ ] **Step 3: Register `VetWorkHoursModel` in `database.ts`**

```typescript
// pet-health-tracker-api/src/infrastructure/db/database.ts
import { Sequelize } from 'sequelize-typescript';
import { UserModel } from './models/UserModel';
import { PetModel } from './models/PetModel';
import { VetModel } from './models/VetModel';
import { VetWorkHoursModel } from './models/VetWorkHoursModel';
import { VetVisitModel } from './models/VetVisitModel';
import { MedicationModel } from './models/MedicationModel';
import { ReminderModel } from './models/ReminderModel';
import { ReminderNotifyUserModel } from './models/ReminderNotifyUserModel';

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'pet_health_tracker',
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  logging: false,
  models: [
    UserModel,
    PetModel,
    VetModel,
    VetWorkHoursModel,
    VetVisitModel,
    MedicationModel,
    ReminderModel,
    ReminderNotifyUserModel,
  ],
});
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd ~/projects/pet-health-tracker-api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd ~/projects/pet-health-tracker-api
git add src/infrastructure/db/models/VetWorkHoursModel.ts src/infrastructure/db/models/VetModel.ts src/infrastructure/db/database.ts
git commit -m "feat: add VetWorkHoursModel and register in database"
```

---

## Task 2: Vet domain entity update (API)

**Files:**
- Modify: `pet-health-tracker-api/src/domain/vet/Vet.ts`

- [ ] **Step 1: Update `Vet.ts`**

`DayOfWeek` is already defined at `src/domain/health/value-objects/ReminderSchedule.ts`. Import from there.

```typescript
// pet-health-tracker-api/src/domain/vet/Vet.ts
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd ~/projects/pet-health-tracker-api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/pet-health-tracker-api
git add src/domain/vet/Vet.ts
git commit -m "feat: update Vet domain entity — workHours is now VetWorkHoursProps[]"
```

---

## Task 3: VetMapper update (API)

**Files:**
- Modify: `pet-health-tracker-api/src/infrastructure/mappers/VetMapper.ts`

- [ ] **Step 1: Rewrite `VetMapper.ts`**

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
      notes: vet.notes,
      createdAt: vet.createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd ~/projects/pet-health-tracker-api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/pet-health-tracker-api
git add src/infrastructure/mappers/VetMapper.ts
git commit -m "feat: update VetMapper — workHours array DTO, toWorkHoursPersistence helper"
```

---

## Task 4: SequelizeVetRepository update (API)

**Files:**
- Modify: `pet-health-tracker-api/src/infrastructure/db/repositories/SequelizeVetRepository.ts`

- [ ] **Step 1: Rewrite `SequelizeVetRepository.ts`**

```typescript
// pet-health-tracker-api/src/infrastructure/db/repositories/SequelizeVetRepository.ts
import { Service } from 'typedi';
import { VetModel } from '../models/VetModel';
import { VetWorkHoursModel } from '../models/VetWorkHoursModel';
import { VetRepository } from '../../../domain/vet/VetRepository';
import { Vet } from '../../../domain/vet/Vet';
import { VetMapper } from '../../mappers/VetMapper';
import { PaginationParams, PaginatedResult } from '../../../shared/types/Pagination';

@Service()
export class SequelizeVetRepository implements VetRepository {
  constructor(private readonly mapper: VetMapper) {}

  async findById(id: string): Promise<Vet | null> {
    const model = await VetModel.findByPk(id, { include: [VetWorkHoursModel] });
    return model ? this.mapper.toDomain(model) : null;
  }

  async findByUserId(userId: string, { page, limit }: PaginationParams): Promise<PaginatedResult<Vet>> {
    const { count, rows } = await VetModel.findAndCountAll({
      where: { userId },
      limit,
      offset: (page - 1) * limit,
      include: [VetWorkHoursModel],
    });
    const offset = (page - 1) * limit;
    return {
      items: rows.map((m) => this.mapper.toDomain(m)),
      total: count,
      nextPage: offset + rows.length < count ? page + 1 : null,
    };
  }

  async save(vet: Vet): Promise<void> {
    await VetModel.upsert(this.mapper.toPersistence(vet) as any);
    await VetWorkHoursModel.destroy({ where: { vetId: vet.id.toValue() } });
    const hours = vet.workHours ?? [];
    if (hours.length > 0) {
      await VetWorkHoursModel.bulkCreate(
        this.mapper.toWorkHoursPersistence(vet.id.toValue(), hours) as any[],
      );
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd ~/projects/pet-health-tracker-api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/pet-health-tracker-api
git add src/infrastructure/db/repositories/SequelizeVetRepository.ts
git commit -m "feat: eager-load workHours in VetRepository, bulk-replace rows on save"
```

---

## Task 5: CreateVetUseCase + UpdateVetUseCase + VetController + vetRoutes (API)

**Files:**
- Modify: `pet-health-tracker-api/src/application/vet/CreateVetUseCase.ts`
- Create: `pet-health-tracker-api/src/application/vet/UpdateVetUseCase.ts`
- Modify: `pet-health-tracker-api/src/infrastructure/http/controllers/VetController.ts`
- Modify: `pet-health-tracker-api/src/infrastructure/http/routes/vetRoutes.ts`

- [ ] **Step 1: Update `CreateVetUseCase.ts`**

```typescript
// pet-health-tracker-api/src/application/vet/CreateVetUseCase.ts
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
      notes: input.notes,
    });

    await this.vetRepository.save(vet);
    return vet;
  }
}
```

- [ ] **Step 2: Create `UpdateVetUseCase.ts`**

```typescript
// pet-health-tracker-api/src/application/vet/UpdateVetUseCase.ts
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

- [ ] **Step 3: Update `VetController.ts`**

```typescript
// pet-health-tracker-api/src/infrastructure/http/controllers/VetController.ts
import { Request, Response, NextFunction } from 'express';
import { Service } from 'typedi';
import { CreateVetUseCase } from '../../../application/vet/CreateVetUseCase';
import { ListVetsUseCase } from '../../../application/vet/ListVetsUseCase';
import { UpdateVetUseCase } from '../../../application/vet/UpdateVetUseCase';
import { VetMapper } from '../../mappers/VetMapper';

@Service()
export class VetController {
  constructor(
    private readonly createVet: CreateVetUseCase,
    private readonly listVets: ListVetsUseCase,
    private readonly updateVet: UpdateVetUseCase,
    private readonly mapper: VetMapper,
  ) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const result = await this.listVets.execute(req.auth.userId, { page, limit });
      res.json({ ...result, items: result.items.map((v) => this.mapper.toResponse(v)) });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const vet = await this.createVet.execute({
        ...req.body,
        requestingUserId: req.auth.userId,
      });
      res.status(201).json(this.mapper.toResponse(vet));
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const vet = await this.updateVet.execute({
        vetId: req.params.id,
        ...req.body,
        requestingUserId: req.auth.userId,
      });
      res.json(this.mapper.toResponse(vet));
    } catch (err) {
      next(err);
    }
  };
}
```

- [ ] **Step 4: Update `vetRoutes.ts`**

```typescript
// pet-health-tracker-api/src/infrastructure/http/routes/vetRoutes.ts
import { Router } from 'express';
import { Container } from 'typedi';
import { VetController } from '../controllers/VetController';
import { authMiddleware } from '../middleware/authMiddleware';

export function vetRoutes(): Router {
  const router = Router();
  const controller = Container.get(VetController);

  router.get('/', authMiddleware, controller.list);
  router.post('/', authMiddleware, controller.create);
  router.put('/:id', authMiddleware, controller.update);

  return router;
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd ~/projects/pet-health-tracker-api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Start the API and verify the schema syncs**

```bash
cd ~/projects/pet-health-tracker-api && npm run dev
```

Expected in terminal: server starts without errors. Check PostgreSQL — table `vet_work_hours` should now exist and `work_hours` column should be dropped from `vets`. Verify with:

```bash
psql -U postgres -d pet_health_tracker -c "\d vets"
psql -U postgres -d pet_health_tracker -c "\d vet_work_hours"
```

Expected: `vets` has no `work_hours` column; `vet_work_hours` table exists with correct columns.

- [ ] **Step 7: Commit**

```bash
cd ~/projects/pet-health-tracker-api
git add src/application/vet/CreateVetUseCase.ts src/application/vet/UpdateVetUseCase.ts src/infrastructure/http/controllers/VetController.ts src/infrastructure/http/routes/vetRoutes.ts
git commit -m "feat: add UpdateVetUseCase and PUT /vets/:id route"
```

---

## Task 6: Client types + vetsApi (Client)

**Files:**
- Modify: `pet-health-tracker-client/src/types/index.ts`
- Modify: `pet-health-tracker-client/src/api/vets.ts`

- [ ] **Step 1: Update `types/index.ts`** — add `VetWorkHours`, update `Vet`

Add `VetWorkHours` interface and update the `Vet` interface. Replace the `Vet` interface in `src/types/index.ts`:

```typescript
// In src/types/index.ts — add this after the DayOfWeek type:
export interface VetWorkHours {
  dayOfWeek: DayOfWeek;
  open: boolean;
  startTime?: string;
  endTime?: string;
}

// Replace the existing Vet interface with:
export interface Vet {
  id: string;
  userId: string;
  name: string;
  address?: string;
  phone?: string;
  workHours?: VetWorkHours[];
  googleMapsUrl?: string;
  rating?: number;
  notes?: string;
  createdAt: string;
}
```

- [ ] **Step 2: Update `api/vets.ts`** — add `update` method

```typescript
// pet-health-tracker-client/src/api/vets.ts
import { apiClient } from './client';
import type { Vet, PaginatedResult } from '../types';

export const vetsApi = {
  list: ({ pageParam = 1 }: { pageParam?: number } = {}) =>
    apiClient.get<PaginatedResult<Vet>>('/vets', { params: { page: pageParam, limit: 20 } }).then((r) => r.data),

  listAll: () =>
    apiClient.get<PaginatedResult<Vet>>('/vets', { params: { page: 1, limit: 100 } }).then((r) => r.data.items),

  create: (data: Omit<Vet, 'id' | 'userId' | 'createdAt'>) =>
    apiClient.post<Vet>('/vets', data).then((r) => r.data),

  update: (id: string, data: Omit<Vet, 'id' | 'userId' | 'createdAt'>) =>
    apiClient.put<Vet>(`/vets/${id}`, data).then((r) => r.data),
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd ~/projects/pet-health-tracker-client && pnpm exec tsc --noEmit
```

Expected: no errors (may see existing errors if any — focus on no new errors from your changes).

- [ ] **Step 4: Commit**

```bash
cd ~/projects/pet-health-tracker-client
git add src/types/index.ts src/api/vets.ts
git commit -m "feat: add VetWorkHours type and vetsApi.update"
```

---

## Task 7: WorkHoursEditor component (Client)

**Files:**
- Create: `pet-health-tracker-client/src/components/WorkHoursEditor.tsx`

- [ ] **Step 1: Create `WorkHoursEditor.tsx`**

```typescript
// pet-health-tracker-client/src/components/WorkHoursEditor.tsx
import { Box, Checkbox, FormControlLabel, TextField, Typography } from '@mui/material';
import type { DayOfWeek, VetWorkHours } from '../types';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'MON', label: 'Mon' },
  { key: 'TUE', label: 'Tue' },
  { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' },
  { key: 'FRI', label: 'Fri' },
  { key: 'SAT', label: 'Sat' },
  { key: 'SUN', label: 'Sun' },
];

interface Props {
  value: VetWorkHours[];
  onChange: (hours: VetWorkHours[]) => void;
}

export function WorkHoursEditor({ value, onChange }: Props) {
  const getDay = (key: DayOfWeek) => value.find((h) => h.dayOfWeek === key);

  const toggleOpen = (key: DayOfWeek, open: boolean) => {
    const existing = getDay(key);
    if (open) {
      if (existing) {
        onChange(value.map((h) =>
          h.dayOfWeek === key
            ? { ...h, open: true, startTime: h.startTime ?? '08:00', endTime: h.endTime ?? '18:00' }
            : h,
        ));
      } else {
        onChange([...value, { dayOfWeek: key, open: true, startTime: '08:00', endTime: '18:00' }]);
      }
    } else {
      if (existing) {
        onChange(value.map((h) => h.dayOfWeek === key ? { ...h, open: false } : h));
      }
    }
  };

  const setTime = (key: DayOfWeek, field: 'startTime' | 'endTime', val: string) => {
    const existing = getDay(key);
    if (existing) {
      onChange(value.map((h) => h.dayOfWeek === key ? { ...h, [field]: val } : h));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
        Working Hours
      </Typography>
      {DAYS.map(({ key, label }) => {
        const entry = getDay(key);
        const isOpen = entry?.open ?? false;
        return (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              sx={{ minWidth: 72, m: 0 }}
              control={
                <Checkbox
                  size="small"
                  checked={isOpen}
                  onChange={(e) => toggleOpen(key, !isOpen)}
                />
              }
              label={<Typography variant="body2">{label}</Typography>}
            />
            <TextField
              size="small"
              type="time"
              value={entry?.startTime ?? ''}
              onChange={(e) => setTime(key, 'startTime', e.target.value)}
              disabled={!isOpen}
              sx={{ width: 120 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Typography variant="body2" color="text.secondary">–</Typography>
            <TextField
              size="small"
              type="time"
              value={entry?.endTime ?? ''}
              onChange={(e) => setTime(key, 'endTime', e.target.value)}
              disabled={!isOpen}
              sx={{ width: 120 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        );
      })}
    </Box>
  );
}
```

Note: `onChange={(e) => toggleOpen(key, !isOpen)}` — uses `!isOpen` (not `e.target.checked`) per the project's controlled-input pattern (see feedback memory).

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd ~/projects/pet-health-tracker-client && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/pet-health-tracker-client
git add src/components/WorkHoursEditor.tsx
git commit -m "feat: add WorkHoursEditor component — 7-day controlled hours editor"
```

---

## Task 8: VetsPage redesign (Client)

**Files:**
- Modify: `pet-health-tracker-client/src/pages/vets/VetsPage.tsx`

This task rewrites VetsPage to use compact accordion cards and an Edit Vet dialog.

- [ ] **Step 1: Replace `VetsPage.tsx`**

```typescript
// pet-health-tracker-client/src/pages/vets/VetsPage.tsx
import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Container,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, Skeleton, TextField, Typography,
} from '@mui/material';
import {
  Add, AccessTime, Edit, ExpandMore, LocationOn, Map,
  MedicalServices, Phone, Star,
} from '@mui/icons-material';
import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { vetsApi } from '../../api/vets';
import { placesApi, type PlaceSearchResult, type PlaceDetails } from '../../api/places';
import { getApiError } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { WorkHoursEditor } from '../../components/WorkHoursEditor';
import type { Vet, VetWorkHours } from '../../types';

type SearchState = 'idle' | 'searching' | 'done';

const emptyForm = {
  name: '',
  address: '',
  phone: '',
  workHours: [] as VetWorkHours[],
  googleMapsUrl: '',
  notes: '',
  rating: '',
};

export function VetsPage() {
  const queryClient = useQueryClient();

  // Add vet state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Card expand state
  const [expandedVetId, setExpandedVetId] = useState<string | null>(null);

  // Edit vet state
  const [editVet, setEditVet] = useState<Vet | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  useEffect(() => {
    if (editVet) {
      setEditForm({
        name: editVet.name,
        address: editVet.address ?? '',
        phone: editVet.phone ?? '',
        workHours: editVet.workHours ?? [],
        googleMapsUrl: editVet.googleMapsUrl ?? '',
        notes: editVet.notes ?? '',
        rating: editVet.rating != null ? String(editVet.rating) : '',
      });
    }
  }, [editVet]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const setEdit = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm((f) => ({ ...f, [field]: e.target.value }));

  const { showError } = useNotification();

  const resetSearch = () => {
    setSearchState('idle');
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  };

  const handleClose = () => {
    setOpen(false);
    setForm(emptyForm);
    resetSearch();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const results = await placesApi.search(searchQuery.trim());
      setSearchResults(results);
    } catch {
      setSearchError('Search failed. Try again or enter details manually.');
    } finally {
      setIsSearchLoading(false);
    }
  };

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
      }));
      setSearchState('done');
    } catch {
      setSearchError('Could not load details. Try again or enter manually.');
    } finally {
      setIsSearchLoading(false);
    }
  };

  const { data, isLoading, isError: listError, error: listErrorObj, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['vets'],
    queryFn: ({ pageParam }) => vetsApi.list({ pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });

  const vets = data?.pages.flatMap((p) => p.items) ?? [];

  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); },
    hasNextPage,
  );

  const mutation = useMutation({
    mutationFn: () => vetsApi.create({
      name: form.name,
      address: form.address || undefined,
      phone: form.phone || undefined,
      workHours: form.workHours.length > 0 ? form.workHours : undefined,
      googleMapsUrl: form.googleMapsUrl || undefined,
      rating: form.rating ? Number(form.rating) : undefined,
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

  const editMutation = useMutation({
    mutationFn: () => vetsApi.update(editVet!.id, {
      name: editForm.name,
      address: editForm.address || undefined,
      phone: editForm.phone || undefined,
      workHours: editForm.workHours.length > 0 ? editForm.workHours : undefined,
      googleMapsUrl: editForm.googleMapsUrl || undefined,
      rating: editForm.rating ? Number(editForm.rating) : undefined,
      notes: editForm.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vets'] });
      queryClient.invalidateQueries({ queryKey: ['vets-all'] });
      setEditVet(null);
    },
    onError: (err) => showError(getApiError(err)),
  });

  const toggleExpand = (id: string) =>
    setExpandedVetId((prev) => (prev === id ? null : id));

  return (
    <Container maxWidth="md" sx={{ mt: 4, px: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Vets</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Add Vet
        </Button>
      </Box>

      {listError && (
        <Alert severity="error" sx={{ mb: 2 }}>{getApiError(listErrorObj)}</Alert>
      )}

      {isLoading ? (
        <Grid container spacing={2}>
          {[1, 2].map((i) => (
            <Grid size={{ xs: 12 }} key={i}>
              <Skeleton variant="rectangular" height={72} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : vets.length === 0 ? (
        <Card elevation={1}>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <MedicalServices sx={{ fontSize: 32, color: 'primary.main', mb: 1, opacity: 0.5 }} />
            <Typography variant="subtitle2" color="text.secondary">No vets added yet</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              Add a vet to link them to visits and get reminders
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {vets.map((vet) => {
            const expanded = expandedVetId === vet.id;
            return (
              <Grid size={{ xs: 12 }} key={vet.id}>
                <Card
                  elevation={1}
                  sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}
                  onClick={() => toggleExpand(vet.id)}
                >
                  <CardContent sx={{ pb: '16px !important' }}>
                    {/* Collapsed header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                        bgcolor: 'rgba(42,157,143,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <MedicalServices sx={{ color: 'primary.main', fontSize: 20 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{vet.name}</Typography>
                        {vet.notes && (
                          <Typography variant="body2" color="text.secondary" noWrap>{vet.notes}</Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                        {vet.phone && (
                          <Chip
                            icon={<Phone sx={{ fontSize: '14px !important' }} />}
                            label={vet.phone}
                            size="small"
                            variant="outlined"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {vet.rating != null && (
                          <Chip
                            icon={<Star sx={{ fontSize: '14px !important', color: 'warning.main !important' }} />}
                            label={vet.rating.toFixed(1)}
                            size="small"
                            variant="outlined"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <ExpandMore sx={{
                          color: 'text.secondary',
                          transform: expanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                          fontSize: 20,
                        }} />
                      </Box>
                    </Box>

                    {/* Expanded detail */}
                    {expanded && (
                      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {vet.address && (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
                            <Typography variant="body2" color="text.secondary">{vet.address}</Typography>
                          </Box>
                        )}

                        {vet.workHours && vet.workHours.length > 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <AccessTime sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                              {vet.workHours.map((wh) => (
                                <Box key={wh.dayOfWeek} sx={{ display: 'flex', gap: 1.5 }}>
                                  <Typography variant="caption" sx={{ width: 28, color: 'text.secondary', flexShrink: 0 }}>
                                    {wh.dayOfWeek.charAt(0) + wh.dayOfWeek.slice(1, 3).toLowerCase()}
                                  </Typography>
                                  <Typography variant="caption" color={wh.open ? 'text.primary' : 'text.disabled'}>
                                    {wh.open ? `${wh.startTime}–${wh.endTime}` : 'Closed'}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled">No hours set</Typography>
                        )}

                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
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
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <div ref={sentinelRef} />
      {isFetchingNextPage && (
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="rectangular" height={72} sx={{ borderRadius: 2 }} />
        </Box>
      )}

      {/* Add Vet dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Add Vet</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
          {searchState === 'idle' && (
            <Box
              onClick={() => setSearchState('searching')}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                px: 2, py: 1.25, borderRadius: 2,
                border: '1px dashed', borderColor: 'primary.main',
                color: 'primary.main', cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Map sx={{ fontSize: 18 }} />
              <Typography variant="body2">Search Google Maps to auto-fill details</Typography>
            </Box>
          )}

          {searchState === 'searching' && (
            <Box sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 2, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small" fullWidth placeholder="Search for a clinic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  autoFocus
                />
                <Button
                  variant="contained" size="small" onClick={handleSearch}
                  disabled={isSearchLoading || !searchQuery.trim()}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {isSearchLoading ? '...' : 'Search'}
                </Button>
              </Box>
              {searchError && <Typography variant="caption" color="error">{searchError}</Typography>}
              {searchResults.length === 0 && !isSearchLoading && !searchError && searchQuery && (
                <Typography variant="caption" color="text.secondary">No results found</Typography>
              )}
              {searchResults.map((r) => (
                <Box key={r.placeId} onClick={() => handlePickPlace(r.placeId)}
                  sx={{ px: 1.5, py: 1, borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{r.address}</Typography>
                </Box>
              ))}
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ cursor: 'pointer', '&:hover': { color: 'text.primary' } }}
                  onClick={resetSearch}>
                  ✕ cancel search
                </Typography>
              </Box>
            </Box>
          )}

          {searchState === 'done' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: 2, bgcolor: 'success.main', color: 'success.contrastText', opacity: 0.85 }}>
              <Typography variant="caption">✓ Filled from Google Maps — edit freely</Typography>
            </Box>
          )}

          <TextField label="Name" value={form.name} onChange={set('name')} fullWidth required autoFocus={searchState === 'idle'} />
          <TextField label="Phone" value={form.phone} onChange={set('phone')} fullWidth />
          <TextField label="Address" value={form.address} onChange={set('address')} fullWidth />
          <WorkHoursEditor value={form.workHours} onChange={(wh) => setForm((f) => ({ ...f, workHours: wh }))} />
          <TextField label="Google Maps URL" value={form.googleMapsUrl} onChange={set('googleMapsUrl')} fullWidth />
          <TextField label="Notes" value={form.notes} onChange={set('notes')} fullWidth multiline rows={3} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={() => mutation.mutate()} disabled={!form.name.trim() || mutation.isPending}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Vet dialog */}
      {editVet && (
        <Dialog open onClose={() => setEditVet(null)} fullWidth maxWidth="sm">
          <DialogTitle>Edit Vet</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
            <TextField label="Name" value={editForm.name} onChange={setEdit('name')} fullWidth required autoFocus />
            <TextField label="Phone" value={editForm.phone} onChange={setEdit('phone')} fullWidth />
            <TextField label="Address" value={editForm.address} onChange={setEdit('address')} fullWidth />
            <WorkHoursEditor value={editForm.workHours} onChange={(wh) => setEditForm((f) => ({ ...f, workHours: wh }))} />
            <TextField label="Google Maps URL" value={editForm.googleMapsUrl} onChange={setEdit('googleMapsUrl')} fullWidth />
            <TextField label="Notes" value={editForm.notes} onChange={setEdit('notes')} fullWidth multiline rows={3} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setEditVet(null)} color="inherit">Cancel</Button>
            <Button variant="contained" onClick={() => editMutation.mutate()} disabled={!editForm.name.trim() || editMutation.isPending}>
              {editMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd ~/projects/pet-health-tracker-client && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start client and verify visually**

```bash
cd ~/projects/pet-health-tracker-client && pnpm dev
```

Open the Vets page. Verify:
- Cards show only name, phone chip, rating chip
- Clicking a card expands the accordion showing address, hours grid, Maps button, Edit button
- Clicking again collapses it
- "Add Vet" dialog includes the 7-row WorkHoursEditor
- "Edit" button opens pre-populated edit dialog
- Toggling a day open defaults to 08:00–18:00
- Saving a vet with hours works (check network tab — `POST /vets` body has `workHours` array; response has `workHours` array)
- Editing a vet with hours works (`PUT /vets/:id`)

- [ ] **Step 4: Commit**

```bash
cd ~/projects/pet-health-tracker-client
git add src/pages/vets/VetsPage.tsx
git commit -m "feat: redesign VetsPage — compact accordion cards, edit dialog, WorkHoursEditor"
```

---

## Task 9: Scheduling dialog — working hours hint + warning (Client)

**Files:**
- Modify: `pet-health-tracker-client/src/pages/health/PetDetailPage.tsx`

- [ ] **Step 1: Add `dayOfWeekFromDate` helper and `getWorkHoursHint` function**

In `PetDetailPage.tsx`, add `VetWorkHours` and `DayOfWeek` to the existing import from `../../types` (the file already imports `VetVisit`, `Vet`, etc. from there — extend that line, don't add a second import).

Add these helpers outside the component, after all imports, before the component function:

```typescript
// Add VetWorkHours and DayOfWeek to the existing types import in PetDetailPage.tsx, e.g.:
// import type { VetVisit, Vet, Reminder, ReminderScheduleProps, Medication, VetWorkHours, DayOfWeek } from '../../types';

const DAY_INDEX_TO_DOW: Record<number, DayOfWeek> = {
  0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT',
};

const DOW_LABELS: Record<DayOfWeek, string> = {
  MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun',
};

function getWorkHoursHint(
  vets: Vet[],
  vetId: string,
  visitDate: string,
): { label: string; isOutside: boolean } | null {
  if (!vetId || !visitDate) return null;
  const vet = vets.find((v) => v.id === vetId);
  if (!vet?.workHours?.length) return null;

  const dow = DAY_INDEX_TO_DOW[new Date(visitDate + ':00').getDay()];
  const dayLabel = DOW_LABELS[dow];
  const entry: VetWorkHours | undefined = vet.workHours.find((wh) => wh.dayOfWeek === dow);

  if (!entry || !entry.open) {
    return { label: `${dayLabel}: Closed`, isOutside: true };
  }

  const time = visitDate.slice(11, 16); // "HH:MM"
  const isOutside = !!entry.startTime && !!entry.endTime && (time < entry.startTime || time > entry.endTime);
  return {
    label: `${dayLabel}: ${entry.startTime}–${entry.endTime}`,
    isOutside,
  };
}
```

- [ ] **Step 2: Add the hint + warning in the scheduling dialog JSX**

In `PetDetailPage.tsx`, find the "Visit Date" `TextField` inside the Add Vet Visit dialog (around line 472–481). After the closing `/>` of that TextField, insert:

```tsx
{isScheduling && (() => {
  const hint = getWorkHoursHint(vets, vetForm.vetId, vetForm.visitDate);
  if (!hint) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{hint.label}</Typography>
      {hint.isOutside && (
        <Alert severity="warning" sx={{ mt: 0.5, py: 0.5 }}>Outside working hours</Alert>
      )}
    </Box>
  );
})()}
```

Make sure `Alert` is imported from `@mui/material` (it should already be imported in `PetDetailPage.tsx`; add it if not).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd ~/projects/pet-health-tracker-client && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify end-to-end**

1. Start API (`npm run dev`) and client (`pnpm dev`)
2. Go to the Vets page, add a vet with some work hours (e.g. Mon–Fri 09:00–17:00, Sat–Sun Closed)
3. Go to a pet's detail page, click "Add Vet Visit"
4. Select that vet from the dropdown
5. Set a future date that falls on a weekday within hours — confirm: working hours caption appears, no warning
6. Change the time to before 09:00 or after 17:00 — confirm: "Outside working hours" Alert appears
7. Change the date to a Saturday — confirm: "Sat: Closed" + warning appears

- [ ] **Step 5: Commit**

```bash
cd ~/projects/pet-health-tracker-client
git add src/pages/health/PetDetailPage.tsx
git commit -m "feat: show working hours hint and out-of-hours warning in scheduling dialog"
```

---

## Final merge

```bash
cd ~/projects/pet-health-tracker-api && git checkout main && git merge - --no-ff
cd ~/projects/pet-health-tracker-client && git checkout main && git merge - --no-ff
```
