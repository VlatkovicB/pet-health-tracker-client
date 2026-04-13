# Calendar Home Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pets-list home page with a monthly calendar showing vet visits and medications across all pets, with a hamburger drawer nav and per-pet filter chips.

**Architecture:** Custom `MonthCalendar` grid built with `date-fns` (no calendar library). `CalendarPage` owns all data fetching and shapes raw API types into a `CalendarEvent` discriminated union before passing to the pure-rendering `MonthCalendar`. `NavigationDrawer` lives inside `Layout` and is triggered by a hamburger in the `AppBar`.

**Tech Stack:** React 19, MUI v9, React Query v5, React Router v7, date-fns (new), TypeScript, Express/Sequelize (API)

---

## File Map

**New files — API (`pet-health-tracker-api`):**
- `src/application/health/ListVetVisitsByDateRangeUseCase.ts`

**Modified files — API:**
- `src/domain/health/HealthRecordRepository.ts` — add `findVetVisitsByDateRange`
- `src/infrastructure/db/repositories/SequelizeHealthRecordRepository.ts` — implement it
- `src/infrastructure/http/controllers/HealthController.ts` — add `getVetVisitsByDateRange` handler
- `src/infrastructure/http/routes/index.ts` — register `GET /vet-visits`

**New files — Client (`pet-health-tracker-client`):**
- `src/components/NavigationDrawer.tsx`
- `src/components/CalendarEventPopup.tsx`
- `src/pages/calendar/CalendarPage.tsx`
- `src/pages/calendar/MonthCalendar.tsx`
- `src/pages/calendar/PetFilterChips.tsx`

**Modified files — Client:**
- `src/types/index.ts` — add `CalendarEvent` type
- `src/api/health.ts` — add `listVetVisitsByMonth`
- `src/components/Layout.tsx` — add hamburger, wire drawer, move logout
- `src/App.tsx` — update routes (`/` → CalendarPage, add `/pets`)

---

## Task 1: Backend — date-range vet visits endpoint

**Files:**
- Modify: `pet-health-tracker-api/src/domain/health/HealthRecordRepository.ts`
- Modify: `pet-health-tracker-api/src/infrastructure/db/repositories/SequelizeHealthRecordRepository.ts`
- Create: `pet-health-tracker-api/src/application/health/ListVetVisitsByDateRangeUseCase.ts`
- Modify: `pet-health-tracker-api/src/infrastructure/http/controllers/HealthController.ts`
- Modify: `pet-health-tracker-api/src/infrastructure/http/routes/index.ts`

- [ ] **Step 1: Add repository method to interface**

In `src/domain/health/HealthRecordRepository.ts`, add one line after `findUpcomingVetVisitsByUserId`:

```ts
findVetVisitsByDateRange(userId: string, from: Date, to: Date): Promise<VetVisit[]>;
```

Full file after change:

```ts
import { VetVisit } from './VetVisit';
import { Medication } from './Medication';
import { PaginationParams, PaginatedResult } from '../../shared/types/Pagination';

export interface HealthRecordRepository {
  // Vet visits
  findVetVisitById(id: string): Promise<VetVisit | null>;
  findVetVisitsByPetId(petId: string, pagination: PaginationParams): Promise<PaginatedResult<VetVisit>>;
  findUpcomingVetVisitsByUserId(userId: string): Promise<VetVisit[]>;
  findVetVisitsByDateRange(userId: string, from: Date, to: Date): Promise<VetVisit[]>;
  saveVetVisit(visit: VetVisit): Promise<void>;

  // Medications
  findMedicationById(id: string): Promise<Medication | null>;
  findMedicationsByPetId(petId: string): Promise<Medication[]>;
  findActiveMedications(): Promise<Medication[]>;
  saveMedication(medication: Medication): Promise<void>;
}

export const HEALTH_RECORD_REPOSITORY = 'HealthRecordRepository';
```

- [ ] **Step 2: Implement in Sequelize repository**

Add the following method to `SequelizeHealthRecordRepository` in `src/infrastructure/db/repositories/SequelizeHealthRecordRepository.ts`, after `findUpcomingVetVisitsByUserId`:

```ts
async findVetVisitsByDateRange(userId: string, from: Date, to: Date): Promise<VetVisit[]> {
  const rows = await VetVisitModel.findAll({
    where: {
      visitDate: { [Op.between]: [from, to] },
    },
    include: [{ model: PetModel, where: { userId }, required: true }],
    order: [['visit_date', 'ASC']],
  });
  return rows.map((m) => this.vetVisitMapper.toDomain(m));
}
```

`Op` and `PetModel` are already imported at the top of this file.

- [ ] **Step 3: Create use case**

Create `src/application/health/ListVetVisitsByDateRangeUseCase.ts`:

```ts
import { Inject, Service } from 'typedi';
import { HealthRecordRepository, HEALTH_RECORD_REPOSITORY } from '../../domain/health/HealthRecordRepository';
import { VetVisit } from '../../domain/health/VetVisit';

@Service()
export class ListVetVisitsByDateRangeUseCase {
  constructor(
    @Inject(HEALTH_RECORD_REPOSITORY) private readonly healthRepo: HealthRecordRepository,
  ) {}

  async execute(userId: string, from: Date, to: Date): Promise<VetVisit[]> {
    return this.healthRepo.findVetVisitsByDateRange(userId, from, to);
  }
}
```

- [ ] **Step 4: Add controller handler**

In `src/infrastructure/http/controllers/HealthController.ts`, add the import:

```ts
import { ListVetVisitsByDateRangeUseCase } from '../../../application/health/ListVetVisitsByDateRangeUseCase';
```

Add it to the constructor parameters (after `listVetVisits`):

```ts
private readonly listVetVisitsByDateRange: ListVetVisitsByDateRangeUseCase,
```

Add the handler method (after `getVetVisits`):

```ts
getVetVisitsByDateRange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) {
      res.status(400).json({ message: '`from` and `to` query params are required (YYYY-MM-DD)' });
      return;
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
      return;
    }
    const visits = await this.listVetVisitsByDateRange.execute(req.auth.userId, fromDate, toDate);
    res.json(visits.map((v) => this.vetVisitMapper.toResponse(v)));
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 5: Register the route**

In `src/infrastructure/http/routes/index.ts`, add the new route alongside the existing `/vet-visits/upcoming` line:

```ts
router.get('/vet-visits/upcoming', authMiddleware, Container.get(HealthController).getUpcomingVetVisits);
router.get('/vet-visits', authMiddleware, Container.get(HealthController).getVetVisitsByDateRange);
```

- [ ] **Step 6: Verify manually**

Start the API: `npm run dev` (in `pet-health-tracker-api`).

Test the endpoint:
```bash
# Replace TOKEN with a valid JWT
curl "http://localhost:3000/api/v1/vet-visits?from=2026-04-01&to=2026-04-30" \
  -H "Authorization: Bearer TOKEN"
```

Expected: JSON array of vet visits for the authenticated user in April 2026.

- [ ] **Step 7: Commit**

```bash
cd pet-health-tracker-api
git add src/domain/health/HealthRecordRepository.ts \
        src/infrastructure/db/repositories/SequelizeHealthRecordRepository.ts \
        src/application/health/ListVetVisitsByDateRangeUseCase.ts \
        src/infrastructure/http/controllers/HealthController.ts \
        src/infrastructure/http/routes/index.ts
git commit -m "feat: add date-range vet visits endpoint GET /vet-visits?from=&to="
```

---

## Task 2: Frontend — install date-fns and add CalendarEvent type

**Files:**
- Modify: `pet-health-tracker-client/package.json` (via npm)
- Modify: `pet-health-tracker-client/src/types/index.ts`
- Modify: `pet-health-tracker-client/src/api/health.ts`

- [ ] **Step 1: Install date-fns**

```bash
cd pet-health-tracker-client
npm install date-fns
```

Expected: `date-fns` appears in `package.json` dependencies.

- [ ] **Step 2: Add CalendarEvent type**

In `src/types/index.ts`, add after the `Vet` interface:

```ts
export type CalendarEvent =
  | {
      kind: 'vet-visit';
      id: string;
      petId: string;
      date: string;        // ISO date string, e.g. "2026-04-14T00:00:00.000Z"
      type: 'logged' | 'scheduled';
      reason: string;
      vetName?: string;
      clinic?: string;
    }
  | {
      kind: 'medication';
      id: string;
      petId: string;
      startDate: string;   // ISO date string
      endDate?: string;    // ISO date string, undefined = ongoing
      name: string;
      dosageLabel: string; // e.g. "10 mg"
      frequencyLabel: string; // e.g. "Daily"
      hasReminder: boolean;
    };
```

- [ ] **Step 3: Add month-range API method**

In `src/api/health.ts`, add after `listUpcomingVetVisits`:

```ts
listVetVisitsByMonth: (from: string, to: string) =>
  apiClient
    .get<VetVisit[]>('/vet-visits', { params: { from, to } })
    .then((r) => r.data),
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/types/index.ts src/api/health.ts
git commit -m "feat: install date-fns, add CalendarEvent type and month-range API method"
```

---

## Task 3: NavigationDrawer component

**Files:**
- Create: `pet-health-tracker-client/src/components/NavigationDrawer.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/NavigationDrawer.tsx`:

```tsx
import { Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText, Divider, Typography } from '@mui/material';
import { Home, Pets, MedicalServices, Logout } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { label: 'Home', icon: <Home />, path: '/' },
  { label: 'Pets', icon: <Pets />, path: '/pets' },
  { label: 'Vets', icon: <MedicalServices />, path: '/vets' },
] as const;

export function NavigationDrawer({ open, onClose, onLogout }: NavigationDrawerProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function handleNav(path: string) {
    navigate(path);
    onClose();
  }

  function handleLogout() {
    onLogout();
    onClose();
  }

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 220 } } }}
    >
      <Box sx={{ pt: 2, pb: 1, px: 2 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Menu
        </Typography>
      </Box>
      <List disablePadding>
        {NAV_ITEMS.map(({ label, icon, path }) => {
          const active = pathname === path;
          return (
            <ListItemButton
              key={path}
              onClick={() => handleNav(path)}
              selected={active}
              sx={{ mx: 1, borderRadius: 1.5, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
                {icon}
              </ListItemIcon>
              <ListItemText
                primary={label}
                slotProps={{ primary: { sx: { fontSize: '0.9rem', fontWeight: active ? 700 : 400 } } }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Divider sx={{ mt: 1 }} />
      <List disablePadding sx={{ mt: 0.5 }}>
        <ListItemButton onClick={handleLogout} sx={{ mx: 1, borderRadius: 1.5, color: 'error.main' }}>
          <ListItemIcon sx={{ minWidth: 36, color: 'error.main' }}>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" slotProps={{ primary: { sx: { fontSize: '0.9rem' } } }} />
        </ListItemButton>
      </List>
    </Drawer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/NavigationDrawer.tsx
git commit -m "feat: add NavigationDrawer component"
```

---

## Task 4: Update Layout — hamburger, drawer, move logout

**Files:**
- Modify: `pet-health-tracker-client/src/components/Layout.tsx`

- [ ] **Step 1: Rewrite Layout.tsx**

Replace the entire file with:

```tsx
import { useState } from 'react';
import {
  AppBar, Box, Breadcrumbs, IconButton, Link, Menu, MenuItem,
  Toolbar, Tooltip, Typography, Avatar,
} from '@mui/material';
import { Menu as MenuIcon, NavigateNext, Pets } from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { petsApi } from '../api/pets';
import { NavigationDrawer } from './NavigationDrawer';

function AppBreadcrumbs() {
  const { petId } = useParams<{ petId?: string }>();
  const location = useLocation();

  const { data: pet } = useQuery({
    queryKey: ['pet', petId],
    queryFn: () => petsApi.get(petId!),
    enabled: !!petId,
  });

  const isVets = location.pathname === '/vets';

  if (!petId && !isVets) return null;

  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: 0.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Breadcrumbs separator={<NavigateNext sx={{ fontSize: 14, color: 'text.disabled' }} />}>
        <Link
          component={RouterLink}
          to="/"
          underline="hover"
          color="text.secondary"
          sx={{ fontSize: '0.8125rem', fontWeight: 500 }}
        >
          Home
        </Link>
        {petId && (
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary' }}>
            {pet?.name ?? '…'}
          </Typography>
        )}
        {isVets && (
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary' }}>Vets</Typography>
        )}
      </Breadcrumbs>
    </Box>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { mode, toggleTheme } = useAppTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" sx={{ zIndex: 10 }}>
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 1 }}
            aria-label="Open navigation"
          >
            <MenuIcon />
          </IconButton>
          <Box
            sx={{
              width: 34, height: 34, borderRadius: 2, mr: 1.5, flexShrink: 0,
              bgcolor: 'primary.main',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(42,157,143,0.3)',
            }}
            onClick={() => navigate('/')}
          >
            <Pets sx={{ color: '#fff', fontSize: 19 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, cursor: 'pointer', color: 'text.primary', letterSpacing: '-0.3px', fontSize: '1rem', fontWeight: 700 }}
            onClick={() => navigate('/')}
          >
            Pet Health
          </Typography>
          <Tooltip title="Account">
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} size="small" sx={{ ml: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                U
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={menuAnchor}
            open={!!menuAnchor}
            onClose={() => setMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { mt: 0.5, minWidth: 160, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } } }}
          >
            <MenuItem onClick={toggleTheme} sx={{ fontSize: '0.9rem' }}>
              {mode === 'dark' ? 'Light mode' : 'Dark mode'}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <NavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={() => { logout(); navigate('/login'); }}
      />

      <AppBreadcrumbs />

      <Box sx={{ pb: 8 }}>
        {children}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Verify the app starts**

```bash
cd pet-health-tracker-client
npm run dev
```

Open http://localhost:5173. The hamburger should appear in the AppBar and open a drawer with Home / Pets / Vets / Logout. The avatar menu should show only Dark mode toggle.

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: add hamburger drawer nav to Layout, move logout to drawer"
```

---

## Task 5: PetFilterChips

**Files:**
- Create: `pet-health-tracker-client/src/pages/calendar/PetFilterChips.tsx`

- [ ] **Step 1: Create the component**

Create `src/pages/calendar/PetFilterChips.tsx`:

```tsx
import { Box, Chip } from '@mui/material';
import type { Pet } from '../../types';

interface PetFilterChipsProps {
  pets: Pet[];
  petColors: Record<string, string>;
  selectedPetId: string | null;
  onChange: (petId: string | null) => void;
}

export function PetFilterChips({ pets, petColors, selectedPetId, onChange }: PetFilterChipsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', px: { xs: 2, sm: 3 }, pt: 1.5, pb: 0.5 }}>
      <Chip
        label="All"
        size="small"
        onClick={() => onChange(null)}
        color={selectedPetId === null ? 'primary' : 'default'}
        variant={selectedPetId === null ? 'filled' : 'outlined'}
        sx={{ fontWeight: 600, fontSize: '0.75rem' }}
      />
      {pets.map((pet) => (
        <Chip
          key={pet.id}
          label={pet.name}
          size="small"
          onClick={() => onChange(pet.id)}
          variant={selectedPetId === pet.id ? 'filled' : 'outlined'}
          sx={{
            fontWeight: selectedPetId === pet.id ? 700 : 400,
            fontSize: '0.75rem',
            borderColor: petColors[pet.id],
            color: selectedPetId === pet.id ? '#fff' : petColors[pet.id],
            bgcolor: selectedPetId === pet.id ? petColors[pet.id] : 'transparent',
            '&:hover': { bgcolor: selectedPetId === pet.id ? petColors[pet.id] : `${petColors[pet.id]}22` },
          }}
        />
      ))}
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/calendar/PetFilterChips.tsx
git commit -m "feat: add PetFilterChips component"
```

---

## Task 6: MonthCalendar grid

**Files:**
- Create: `pet-health-tracker-client/src/pages/calendar/MonthCalendar.tsx`

- [ ] **Step 1: Create the component**

Create `src/pages/calendar/MonthCalendar.tsx`:

```tsx
import { useMemo } from 'react';
import { Box, Typography, Skeleton, Alert } from '@mui/material';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, format,
} from 'date-fns';
import type { CalendarEvent } from '../../types';

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

interface MonthCalendarProps {
  month: Date;
  events: CalendarEvent[];
  petColors: Record<string, string>;
  petNames: Record<string, string>;
  loading?: boolean;
  error?: boolean;
  onEventClick: (event: CalendarEvent, anchor: HTMLElement) => void;
}

function buildGrid(month: Date): Date[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  return eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });
}

export function MonthCalendar({ month, events, petColors, petNames, loading, error, onEventClick }: MonthCalendarProps) {
  const days = useMemo(() => buildGrid(month), [month]);

  const vetVisitsByDay = useMemo(() => {
    const map: Record<string, (CalendarEvent & { kind: 'vet-visit' })[]> = {};
    events
      .filter((e): e is CalendarEvent & { kind: 'vet-visit' } => e.kind === 'vet-visit')
      .forEach((e) => {
        const key = e.date.slice(0, 10);
        (map[key] ??= []).push(e);
      });
    return map;
  }, [events]);

  const medications = useMemo(
    () => events.filter((e): e is CalendarEvent & { kind: 'medication' } => e.kind === 'medication'),
    [events],
  );

  if (error) {
    return <Alert severity="error" sx={{ mx: { xs: 2, sm: 3 }, mt: 1 }}>Failed to load calendar data.</Alert>;
  }

  return (
    <Box sx={{ px: { xs: 1, sm: 2 } }}>
      {/* Day-of-week headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
        {DAY_HEADERS.map((d) => (
          <Typography key={d} variant="caption" sx={{ textAlign: 'center', color: 'text.disabled', fontWeight: 600, py: 0.5 }}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* Calendar grid */}
      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />
          ))}
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const inMonth = isSameMonth(day, month);
            const today = isToday(day);
            const dayVisits = vetVisitsByDay[dateKey] ?? [];
            const visibleDots = dayVisits.slice(0, 3);
            const overflow = dayVisits.length - visibleDots.length;

            return (
              <Box
                key={dateKey}
                sx={{
                  minHeight: 44,
                  borderRadius: 1,
                  p: 0.5,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  bgcolor: today ? 'primary.main' : 'transparent',
                  opacity: inMonth ? 1 : 0.3,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: today ? 700 : 500,
                    color: today ? '#fff' : inMonth ? 'text.primary' : 'text.disabled',
                    lineHeight: 1.6,
                    fontSize: '0.75rem',
                  }}
                >
                  {format(day, 'd')}
                </Typography>
                {/* Vet visit dots */}
                {dayVisits.length > 0 && (
                  <Box sx={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center', mt: 0.25 }}>
                    {visibleDots.map((v) => (
                      <Box
                        key={v.id}
                        component="span"
                        onClick={(e) => onEventClick(v, e.currentTarget as HTMLElement)}
                        sx={{
                          width: 6, height: 6, borderRadius: '50%', cursor: 'pointer',
                          bgcolor: v.type === 'scheduled' ? '#457b9d' : 'text.disabled',
                          flexShrink: 0,
                        }}
                      />
                    ))}
                    {overflow > 0 && (
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: today ? '#fff' : 'text.secondary', lineHeight: 1 }}>
                        +{overflow}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Medication span bars */}
      {!loading && medications.length > 0 && (
        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {medications.map((med) => (
            <Box
              key={med.id}
              onClick={(e) => onEventClick(med, e.currentTarget as HTMLElement)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.75,
                bgcolor: petColors[med.petId] ?? 'primary.main',
                color: '#fff',
                borderRadius: 0.75,
                px: 1, py: 0.5,
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                '&:hover': { filter: 'brightness(0.92)' },
              }}
            >
              <span>💊</span>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#fff', flex: 1, fontSize: '0.75rem' }} noWrap>
                {petNames[med.petId] ? `${petNames[med.petId]} · ` : ''}{med.name}
              </Typography>
              {med.hasReminder && <span style={{ fontSize: '0.8rem' }}>🔔</span>}
            </Box>
          ))}
        </Box>
      )}

      {/* Empty state */}
      {!loading && events.length === 0 && (
        <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', mt: 3, mb: 1 }}>
          No events this month
        </Typography>
      )}

      {/* Legend */}
      {!loading && (
        <Box sx={{ display: 'flex', gap: 2, mt: 1.5, px: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#457b9d' }} />
            <Typography variant="caption" color="text.secondary">Scheduled visit</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">Past visit</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/calendar/MonthCalendar.tsx
git commit -m "feat: add MonthCalendar grid component"
```

---

## Task 7: CalendarEventPopup

**Files:**
- Create: `pet-health-tracker-client/src/components/CalendarEventPopup.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/CalendarEventPopup.tsx`:

```tsx
import { Popover, Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { CalendarEvent } from '../types';

interface CalendarEventPopupProps {
  event: CalendarEvent | null;
  anchor: HTMLElement | null;
  petNames: Record<string, string>;
  onClose: () => void;
}

export function CalendarEventPopup({ event, anchor, petNames, onClose }: CalendarEventPopupProps) {
  const navigate = useNavigate();
  const open = Boolean(anchor && event);

  function handleViewDetails() {
    if (!event) return;
    if (event.kind === 'vet-visit') {
      navigate(`/pets/${event.petId}?tab=vet-visits&visitId=${event.id}`);
    } else {
      navigate(`/pets/${event.petId}?tab=medications`);
    }
    onClose();
  }

  function formatDate(iso: string) {
    return format(new Date(iso), 'MMM d, yyyy');
  }

  if (!event) return null;

  const petName = petNames[event.petId] ?? '';

  return (
    <Popover
      open={open}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{ paper: { sx: { mt: 0.5, p: 1.5, borderRadius: 2, minWidth: 200, maxWidth: 260, boxShadow: '0 8px 24px rgba(0,0,0,0.14)' } } }}
    >
      {event.kind === 'vet-visit' ? (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {event.reason}{petName ? ` · ${petName}` : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {formatDate(event.date)}{event.vetName ? ` · ${event.vetName}` : event.clinic ? ` · ${event.clinic}` : ''}
          </Typography>
        </>
      ) : (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {event.name}{petName ? ` · ${petName}` : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {event.dosageLabel} · {event.frequencyLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Started {formatDate(event.startDate)}
            {event.endDate ? ` · ends ${formatDate(event.endDate)}` : ''}
          </Typography>
        </>
      )}
      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="small" variant="contained" onClick={handleViewDetails} sx={{ fontSize: '0.75rem' }}>
          View details →
        </Button>
      </Box>
    </Popover>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CalendarEventPopup.tsx
git commit -m "feat: add CalendarEventPopup component"
```

---

## Task 8: CalendarPage

**Files:**
- Create: `pet-health-tracker-client/src/pages/calendar/CalendarPage.tsx`

- [ ] **Step 1: Create CalendarPage**

Create `src/pages/calendar/CalendarPage.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Box, Container, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useQuery, useQueries } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { petsApi } from '../../api/pets';
import { healthApi } from '../../api/health';
import { medicationsApi } from '../../api/medications';
import { remindersApi } from '../../api/reminders';
import { MonthCalendar } from './MonthCalendar';
import { PetFilterChips } from './PetFilterChips';
import { CalendarEventPopup } from '../../components/CalendarEventPopup';
import type { CalendarEvent, Pet, VetVisit, Medication } from '../../types';

const PET_COLORS = ['#f4a261', '#e76f51', '#457b9d', '#e9c46a', '#6d6875', '#a8dadc'];

function buildPetColors(pets: Pet[]): Record<string, string> {
  return Object.fromEntries(pets.map((p, i) => [p.id, PET_COLORS[i % PET_COLORS.length]]));
}

function buildPetNames(pets: Pet[]): Record<string, string> {
  return Object.fromEntries(pets.map((p) => [p.id, p.name]));
}

function toCalendarEvents(
  vetVisits: VetVisit[],
  medications: Medication[],
  remindersMap: Record<string, boolean>,
  monthStart: Date,
  monthEnd: Date,
): CalendarEvent[] {
  const visitEvents: CalendarEvent[] = vetVisits.map((v) => ({
    kind: 'vet-visit',
    id: v.id,
    petId: v.petId,
    date: v.visitDate,
    type: v.type,
    reason: v.reason,
    vetName: v.vetName,
    clinic: v.clinic,
  }));

  const medEvents: CalendarEvent[] = medications
    .filter((m) => {
      const start = new Date(m.startDate);
      const end = m.endDate ? new Date(m.endDate) : null;
      return start <= monthEnd && (end === null || end >= monthStart);
    })
    .map((m) => ({
      kind: 'medication',
      id: m.id,
      petId: m.petId,
      startDate: m.startDate,
      endDate: m.endDate,
      name: m.name,
      dosageLabel: `${m.dosage.amount} ${m.dosage.unit}`,
      frequencyLabel: m.frequency.label,
      hasReminder: remindersMap[m.id] ?? false,
    }));

  return [...visitEvents, ...medEvents];
}

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [popup, setPopup] = useState<{ event: CalendarEvent; anchor: HTMLElement } | null>(null);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Pets
  const { data: petsPages } = useQuery({
    queryKey: ['pets'],
    queryFn: () => petsApi.list({ pageParam: 1 }),
  });
  const pets = petsPages?.items ?? [];
  const petColors = useMemo(() => buildPetColors(pets), [pets]);
  const petNames = useMemo(() => buildPetNames(pets), [pets]);

  // Vet visits for the month
  const { data: vetVisits = [], isLoading: visitsLoading, isError: visitsError } = useQuery({
    queryKey: ['calendar-vet-visits', monthKey],
    queryFn: () => healthApi.listVetVisitsByMonth(
      format(monthStart, 'yyyy-MM-dd'),
      format(monthEnd, 'yyyy-MM-dd'),
    ),
    staleTime: 5 * 60 * 1000,
  });

  // Medications per pet
  const medQueries = useQueries({
    queries: pets.map((pet) => ({
      queryKey: ['medications', pet.id],
      queryFn: () => medicationsApi.list(pet.id),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const allMedications = useMemo(
    () => medQueries.flatMap((q) => q.data ?? []),
    [medQueries],
  );

  // Reminders per medication
  const reminderQueries = useQueries({
    queries: allMedications.map((med) => ({
      queryKey: ['reminder', 'medication', med.id],
      queryFn: () => remindersApi.getMedicationReminder(med.id),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const remindersMap = useMemo<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    allMedications.forEach((med, i) => {
      const r = reminderQueries[i]?.data;
      map[med.id] = !!(r?.enabled);
    });
    return map;
  }, [allMedications, reminderQueries]);

  const loading = visitsLoading || medQueries.some((q) => q.isLoading);
  const error = visitsError || medQueries.some((q) => q.isError);

  const allEvents = useMemo(
    () => toCalendarEvents(vetVisits, allMedications, remindersMap, monthStart, monthEnd),
    [vetVisits, allMedications, remindersMap, monthStart, monthEnd],
  );

  const visibleEvents = useMemo(
    () => selectedPetId ? allEvents.filter((e) => e.petId === selectedPetId) : allEvents,
    [allEvents, selectedPetId],
  );

  return (
    <Container maxWidth="md" sx={{ pt: 1, px: { xs: 1, sm: 2 } }}>
      <PetFilterChips
        pets={pets}
        petColors={petColors}
        selectedPetId={selectedPetId}
        onChange={setSelectedPetId}
      />

      {/* Month navigation header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 1 }}>
        <IconButton size="small" onClick={() => setCurrentMonth((m) => subMonths(m, 1))} aria-label="Previous month">
          <ChevronLeft />
        </IconButton>
        <Typography variant="h6" sx={{ minWidth: 140, textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </Typography>
        <IconButton size="small" onClick={() => setCurrentMonth((m) => addMonths(m, 1))} aria-label="Next month">
          <ChevronRight />
        </IconButton>
      </Box>

      <MonthCalendar
        month={currentMonth}
        events={visibleEvents}
        petColors={petColors}
        petNames={petNames}
        loading={loading}
        error={error}
        onEventClick={(event, anchor) => setPopup({ event, anchor })}
      />

      <CalendarEventPopup
        event={popup?.event ?? null}
        anchor={popup?.anchor ?? null}
        petNames={petNames}
        onClose={() => setPopup(null)}
      />
    </Container>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/calendar/CalendarPage.tsx
git commit -m "feat: add CalendarPage with data fetching and event assembly"
```

---

## Task 9: Update routing in App.tsx

**Files:**
- Modify: `pet-health-tracker-client/src/App.tsx`

- [ ] **Step 1: Update App.tsx**

Replace the entire file:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline } from '@mui/material';
import { ThemeContextProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { PetsPage } from './pages/pets/PetsPage';
import { PetDetailPage } from './pages/health/PetDetailPage';
import { VetsPage } from './pages/vets/VetsPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContextProvider>
        <CssBaseline />
        <NotificationProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/" element={<ProtectedRoute><Layout><CalendarPage /></Layout></ProtectedRoute>} />
                <Route path="/pets" element={<ProtectedRoute><Layout><PetsPage /></Layout></ProtectedRoute>} />
                <Route path="/vets" element={<ProtectedRoute><Layout><VetsPage /></Layout></ProtectedRoute>} />
                <Route path="/pets/:petId" element={<ProtectedRoute><Layout><PetDetailPage /></Layout></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </NotificationProvider>
      </ThemeContextProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Verify end-to-end**

```bash
npm run dev
```

Check:
- `/` shows the calendar with month navigation
- Hamburger opens the drawer; Home / Pets / Vets links navigate correctly
- `/pets` shows the pets list with "Add Pet" button
- Pet chips appear above calendar; selecting one filters events
- Clicking a vet visit dot opens the popup with "View details →"
- Clicking "View details →" navigates to the pet detail page

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire CalendarPage as home route, move PetsPage to /pets"
```
