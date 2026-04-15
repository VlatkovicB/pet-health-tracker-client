import { useMemo, useState } from 'react';
import { Box, Container, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { petsApi } from '../../api/pets';
import { healthApi } from '../../api/health';
import { medicationsApi } from '../../api/medications';
import { remindersApi } from '../../api/reminders';
import { MonthCalendar } from './MonthCalendar';
import { PetFilterChips } from './PetFilterChips';
import { DayDetailModal } from '../../components/DayDetailModal';
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
  const [selectedDay, setSelectedDay] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);

  const queryClient = useQueryClient();

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
    <Container maxWidth="md" sx={{ pt: 1, px: { xs: 1, sm: 2 } }}>
      <PetFilterChips
        pets={pets}
        petColors={petColors}
        selectedPetId={selectedPetId}
        onChange={setSelectedPetId}
      />

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
        onDayClick={(date, events) => setSelectedDay({ date, events })}
      />

      <DayDetailModal
        date={selectedDay?.date ?? null}
        events={selectedDay?.events ?? []}
        petNames={petNames}
        petColors={petColors}
        pets={pets}
        onClose={() => setSelectedDay(null)}
        onScheduled={() => {
          queryClient.invalidateQueries({ queryKey: ['calendar-vet-visits', monthKey] });
          setSelectedDay(null);
        }}
      />
    </Container>
  );
}
