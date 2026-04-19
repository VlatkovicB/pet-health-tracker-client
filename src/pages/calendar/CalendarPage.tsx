import { useMemo, useState } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { petsApi } from '../../api/pets';
import { healthApi } from '../../api/health';
import { medicationsApi } from '../../api/medications';
import { remindersApi } from '../../api/reminders';
import { vetsApi } from '../../api/vets';
import { MonthCalendar } from './MonthCalendar';
import { MobileCalendarView } from './MobileCalendarView';
import { PetFilterChips } from './PetFilterChips';
import { DayDetailModal } from '../../components/DayDetailModal';
import { PET_COLOR_PALETTE } from '../../utils/color';
import type { CalendarEvent, Pet, Vet, VetVisit, Medication } from '../../types';

function buildPetColors(pets: Pet[]): Record<string, string> {
  return Object.fromEntries(
    pets.map((p, i) => [p.id, p.color ?? PET_COLOR_PALETTE[i % PET_COLOR_PALETTE.length]])
  );
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
  const [selectedDay, setSelectedDay] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);

  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const monthKey = format(currentMonth, 'yyyy-MM');
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Pets (page 1 — sufficient for filter chips; distinct key from PetsPage infinite query)
  const { data: petsPage } = useQuery({
    queryKey: ['pets-calendar'],
    queryFn: () => petsApi.list({ pageParam: 1 }),
  });
  const pets = petsPage?.items ?? [];
  const petColors = useMemo(() => buildPetColors(pets), [pets]);
  const petNames = useMemo(() => buildPetNames(pets), [pets]);

  // All vets (for schedule form autocomplete)
  const { data: vets = [] } = useQuery<Vet[]>({
    queryKey: ['vets-all'],
    queryFn: () => vetsApi.listAll(),
    staleTime: 10 * 60 * 1000,
  });

  // Vet visits for the month
  const { data: vetVisits = [], isLoading: visitsLoading, isError: visitsError } = useQuery({
    queryKey: ['calendar-vet-visits', monthKey],
    queryFn: () => healthApi.listVetVisitsByMonth(
      format(monthStart, 'yyyy-MM-dd'),
      format(monthEnd, 'yyyy-MM-dd'),
    ),
    staleTime: 5 * 60 * 1000,
  });

  // Medications per pet (parallel)
  const medQueries = useQueries({
    queries: pets.map((pet) => ({
      queryKey: ['medications', pet.id],
      queryFn: () => medicationsApi.list(pet.id),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const allMedications = useMemo(
    () => medQueries.flatMap((q) => q.data ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [medQueries.map((q) => q.dataUpdatedAt).join(',')],
  );

  // Reminders per medication (parallel)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMedications, reminderQueries.map((q) => q.dataUpdatedAt).join(',')]);

  const loading = visitsLoading || medQueries.some((q) => q.isLoading);
  const error = visitsError || medQueries.some((q) => q.isError);

  const allEvents = useMemo(
    () => toCalendarEvents(vetVisits, allMedications, remindersMap, monthStart, monthEnd),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vetVisits, allMedications, remindersMap, monthKey],
  );

  const visibleEvents = useMemo(
    () => selectedPetId ? allEvents.filter((e) => e.petId === selectedPetId) : allEvents,
    [allEvents, selectedPetId],
  );

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: { xs: 'calc(100vh - 56px)', md: '100vh' },
      overflow: 'hidden',
      px: { xs: 1, sm: 2 },
      pt: 1,
    }}>
      {isMobile ? (
        <MobileCalendarView
          events={visibleEvents}
          petColors={petColors}
          petNames={petNames}
          pets={pets}
          selectedPetId={selectedPetId}
          onPetChange={setSelectedPetId}
          loading={loading}
          error={error}
          onDayClick={(date, evts) => setSelectedDay({ date, events: evts })}
        />
      ) : (
        <>
          <Box sx={{ flexShrink: 0 }}>
            <PetFilterChips
              pets={pets}
              petColors={petColors}
              selectedPetId={selectedPetId}
              onChange={setSelectedPetId}
            />
          </Box>

          {/* Page header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, md: 3 }, pt: 2.5, pb: 1, flexShrink: 0 }}>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.25rem', md: '1.5rem' }, color: 'text.primary', letterSpacing: '-0.8px' }}>
              {format(currentMonth, 'MMMM yyyy')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <Box
                onClick={() => { setCurrentMonth((m) => subMonths(m, 1)); setSelectedDay(null); }}
                sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'primary.main', fontWeight: 900, fontSize: '1rem', userSelect: 'none', '&:hover': { bgcolor: (t) => t.palette.mode === 'dark' ? '#3d3580' : '#ede9fe' } }}
              >‹</Box>
              <Box
                onClick={() => { setCurrentMonth((m) => addMonths(m, 1)); setSelectedDay(null); }}
                sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'primary.main', fontWeight: 900, fontSize: '1rem', userSelect: 'none', '&:hover': { bgcolor: (t) => t.palette.mode === 'dark' ? '#3d3580' : '#ede9fe' } }}
              >›</Box>
            </Box>
          </Box>

          <MonthCalendar
            month={currentMonth}
            events={visibleEvents}
            petColors={petColors}
            petNames={petNames}
            loading={loading}
            error={error}
            onDayClick={(date, evts) => setSelectedDay({ date, events: evts })}
          />
        </>
      )}

      <DayDetailModal
        date={selectedDay?.date ?? null}
        events={selectedDay?.events ?? []}
        petNames={petNames}
        petColors={petColors}
        pets={pets}
        vets={vets}
        onClose={() => setSelectedDay(null)}
        onScheduled={() => {
          queryClient.invalidateQueries({ queryKey: ['calendar-vet-visits', monthKey] });
          setSelectedDay(null);
        }}
      />
    </Box>
  );
}
