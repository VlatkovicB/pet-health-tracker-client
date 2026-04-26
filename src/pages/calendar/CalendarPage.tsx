import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Fab, Typography, useTheme, useMediaQuery } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { petsApi } from '../../api/pets';
import { healthApi } from '../../api/health';
import { medicationsApi } from '../../api/medications';
import { vetsApi } from '../../api/vets';
import { useNotes } from '../../api/notes';
import { MonthCalendar } from './MonthCalendar';
import { MobileCalendarView } from './MobileCalendarView';
import { PetFilterChips } from './PetFilterChips';
import { DayDetailModal } from '../../components/DayDetailModal';
import { NoteFormDialog } from '../../components/NoteFormDialog';
import { NoteDetailDialog } from '../../components/NoteDetailDialog';
import { PET_COLOR_PALETTE } from '../../utils/color';
import type { CalendarEvent, Note, Pet, Vet, VetVisit, Medication } from '../../types';

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
  notes: Note[],
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
      frequencyLabel: m.schedule.type.charAt(0).toUpperCase() + m.schedule.type.slice(1),
      hasReminder: m.reminderEnabled,
      active: m.active,
    }));

  const noteEvents: CalendarEvent[] = notes.map((n) => ({
    kind: 'note' as const,
    date: n.noteDate,
    note: n,
  }));

  return [...visitEvents, ...medEvents, ...noteEvents];
}

export function CalendarPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);
  const [showInactiveMeds, setShowInactiveMeds] = useState(false);
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteFormNote, setNoteFormNote] = useState<Note | undefined>(undefined);

  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const monthKey = format(currentMonth, 'yyyy-MM');
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const isCurrentMonth = isSameMonth(currentMonth, new Date());

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

  // Notes for the month
  const { data: notes = [], isLoading: notesLoading, isError: notesError } = useNotes({
    from: format(monthStart, 'yyyy-MM-dd'),
    to: format(monthEnd, 'yyyy-MM-dd'),
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

  const loading = visitsLoading || notesLoading || medQueries.some((q) => q.isLoading);
  const error = visitsError || notesError || medQueries.some((q) => q.isError);

  const allEvents = useMemo(
    () => toCalendarEvents(vetVisits, allMedications, notes, monthStart, monthEnd),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vetVisits, allMedications, notes, monthKey],
  );

  const visibleEvents = useMemo(
    () => selectedPetId
      ? allEvents.filter((e) =>
          e.kind === 'note'
            ? e.note.petIds.includes(selectedPetId)
            : e.petId === selectedPetId,
        )
      : allEvents,
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
          showInactiveMeds={showInactiveMeds}
          onToggleInactiveMeds={() => setShowInactiveMeds((v) => !v)}
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
              showInactiveMeds={showInactiveMeds}
              onToggleInactiveMeds={() => setShowInactiveMeds((v) => !v)}
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
                onClick={() => { if (!isCurrentMonth) { setCurrentMonth(startOfMonth(new Date())); setSelectedDay(null); } }}
                sx={{
                  px: 1.25, height: 32, borderRadius: 1.5, bgcolor: 'background.paper',
                  border: '1.5px solid', borderColor: 'divider',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: isCurrentMonth ? 'default' : 'pointer',
                  color: 'primary.main', fontWeight: 800, fontSize: '0.72rem',
                  userSelect: 'none', opacity: isCurrentMonth ? 0.4 : 1,
                  ...(!isCurrentMonth && { '&:hover': { bgcolor: (t: any) => t.palette.mode === 'dark' ? '#3d3580' : '#ede9fe' } }),
                }}
              >Today</Box>
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
            showInactiveMeds={showInactiveMeds}
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
        onNoteClick={(note) => {
          setSelectedNote(note);
          setSelectedDay(null);
        }}
        onAddNote={() => {
          setNoteFormNote(undefined);
          setNoteFormOpen(true);
          setSelectedDay(null);
        }}
        onAddMedication={(petId) => {
          setSelectedDay(null);
          navigate(`/pets/${petId}?tab=medications`);
        }}
      />

      {/* FAB — add note for selected day (or today) */}
      <Fab
        color="primary"
        aria-label="Add note"
        onClick={() => {
          setNoteFormNote(undefined);
          setNoteFormOpen(true);
        }}
        sx={{
          position: 'fixed',
          bottom: { xs: 80, md: 32 },
          right: { xs: 20, md: 32 },
          background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
          boxShadow: '0 4px 20px rgba(108,99,255,0.4)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5b52ee, #9678f0)',
            boxShadow: '0 6px 24px rgba(108,99,255,0.5)',
          },
        }}
      >
        <Add />
      </Fab>

      {/* Note form dialog */}
      <NoteFormDialog
        open={noteFormOpen}
        note={noteFormNote}
        defaultDate={selectedDay?.date ? format(selectedDay.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
        onClose={() => {
          setNoteFormOpen(false);
          setNoteFormNote(undefined);
        }}
      />

      {/* Note detail dialog */}
      {selectedNote && (
        <NoteDetailDialog
          open={!!selectedNote}
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onEdit={(note) => {
            setSelectedNote(null);
            setNoteFormNote(note);
            setNoteFormOpen(true);
          }}
        />
      )}
    </Box>
  );
}
