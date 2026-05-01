import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Tab, Tabs, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem,
  Skeleton, Checkbox, FormControlLabel, Switch, IconButton, Chip, Tooltip,
  Alert, useTheme,
} from '@mui/material';
import { Add, AddAPhoto, Edit, Pets, Close, StickyNote2 } from '@mui/icons-material';
import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { healthApi } from '../../api/health';
import { vetsApi } from '../../api/vets';
import { petsApi } from '../../api/pets';
import { usersApi } from '../../api/users';
import { medicationsApi, type CreateMedicationInput } from '../../api/medications';
import { useNotes } from '../../api/notes';
import { useListSharedPets } from '../../api/shares';
import { getApiError } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import type { Medication, Note, Pet, VetVisit, Vet, VetWorkHours, DayOfWeek } from '../../types';
import { PET_SPECIES } from '../../types';
import { PET_COLOR_PALETTE } from '../../utils/color';
import { ScheduledVisitDetailDialog } from '../../components/ScheduledVisitDetailDialog';
import { MedicationDetailDialog } from '../../components/MedicationDetailDialog';
import { MedicationScheduleSection } from '../../components/MedicationScheduleSection';
import { NoteFormDialog } from '../../components/NoteFormDialog';
import { NoteDetailDialog } from '../../components/NoteDetailDialog';
import { SharingTab } from '../../components/sharing/SharingTab';
import type { ReminderScheduleProps, AdvanceNotice } from '../../types';
import { WeightSection } from '../../components/WeightSection';

type TabValue = 'vet-visits' | 'medications' | 'notes' | 'weight' | 'sharing';

const toIso = (v: string) => (v ? new Date(v + ':00').toISOString() : '');
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString();
const todayNoon = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.toISOString().slice(0, 16); };
const weekFromNow = () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(12, 0, 0, 0); return d.toISOString().slice(0, 16); };
const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000';


function calcAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let mos = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) mos--;
  if (mos < 0) { years--; mos += 12; }
  if (years < 0) return '< 1 mo';
  if (years === 0 && mos === 0) return '< 1 mo';
  if (years === 0) return `${mos} mo${mos !== 1 ? 's' : ''}`;
  if (mos === 0) return `${years} yr${years !== 1 ? 's' : ''}`;
  return `${years} yr${years !== 1 ? 's' : ''} ${mos} mo${mos !== 1 ? 's' : ''}`;
}

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

export function PetDetailPage() {
  const { petId } = useParams<{ petId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { showError } = useNotification();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const rawTab = searchParams.get('tab');
  const setTab = (value: TabValue) => setSearchParams({ tab: value }, { replace: true });
  const [addOpen, setAddOpen] = useState(false);
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailVisit, setDetailVisit] = useState<VetVisit | null>(null);
  const [scheduledVisit, setScheduledVisit] = useState<VetVisit | null>(null);
  const [detailMed, setDetailMed] = useState<Medication | null>(null);
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [noteDetailOpen, setNoteDetailOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Pet info
  const { data: pet } = useQuery({
    queryKey: ['pet', petId],
    queryFn: () => petsApi.get(petId!),
    enabled: !!petId,
  });

  // Current user (for ownership check)
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: usersApi.getMe });

  // Shared pets (for sharer's permissions)
  const { data: sharedPets = [] } = useListSharedPets();

  const isOwner = !!pet && !!me && pet.userId === me.id;
  const sharePerms = !isOwner ? sharedPets.find((sp) => sp.id === petId)?.permissions ?? null : null;

  const showVetVisits = isOwner || (sharePerms?.canViewVetVisits ?? false);
  const showMedications = isOwner || (sharePerms?.canViewMedications ?? false);
  const showNotes = isOwner || (sharePerms?.canViewNotes ?? false);
  const canEditVetVisits = isOwner || (sharePerms?.canEditVetVisits ?? false);
  const canEditMedications = isOwner || (sharePerms?.canEditMedications ?? false);
  const canEditNotes = isOwner || (sharePerms?.canEditNotes ?? false);

  const tab: TabValue = (() => {
    if (rawTab === 'weight') return 'weight';
    if (rawTab === 'sharing' && isOwner) return 'sharing';
    if (rawTab === 'medications' && showMedications) return 'medications';
    if (rawTab === 'notes' && showNotes) return 'notes';
    if (rawTab === 'vet-visits' && showVetVisits) return 'vet-visits';
    if (showVetVisits) return 'vet-visits';
    if (showMedications) return 'medications';
    if (showNotes) return 'notes';
    return 'vet-visits';
  })();

  // Vets for dropdown
  const { data: vets = [] } = useQuery({
    queryKey: ['vets-all'],
    queryFn: () => vetsApi.listAll(),
  });

  // Vet visits
  const vetVisitsQuery = useInfiniteQuery({
    queryKey: ['vet-visits', petId],
    queryFn: ({ pageParam }) => healthApi.listVetVisits(petId!, { pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: !!petId,
  });
  const vetVisits = vetVisitsQuery.data?.pages.flatMap((p) => p.items) ?? [];

  // Auto-open a visit when navigated from the upcoming visits list
  const visitIdParam = searchParams.get('visitId');
  useEffect(() => {
    if (!visitIdParam || !vetVisits.length) return;
    const match = vetVisits.find((v) => v.id === visitIdParam);
    if (match) {
      if (match.type === 'scheduled') setScheduledVisit(match);
      else setDetailVisit(match);
      setSearchParams((prev) => { prev.delete('visitId'); return prev; }, { replace: true });
    }
  }, [visitIdParam, vetVisits]);

  const vetVisitsSentinel = useInfiniteScroll(
    () => { if (vetVisitsQuery.hasNextPage && !vetVisitsQuery.isFetchingNextPage) vetVisitsQuery.fetchNextPage(); },
    tab === 'vet-visits' && vetVisitsQuery.hasNextPage,
  );

  // Medications
  const medicationsQuery = useQuery({
    queryKey: ['medications', petId],
    queryFn: () => medicationsApi.list(petId!),
    enabled: !!petId && tab === 'medications',
  });
  // Notes
  const notesQuery = useNotes({ petId: petId ?? undefined });
  const notes = (notesQuery.data ?? []).slice().sort((a, b) => b.noteDate.localeCompare(a.noteDate));

  const medications = (medicationsQuery.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const activeMeds = medications.filter((m) => m.active);
  const nextVisit = vetVisits
    .filter((v) => v.type === 'scheduled')
    .sort((a, b) => a.visitDate.localeCompare(b.visitDate))[0] ?? null;

  const addMedMutation = useMutation({
    mutationFn: (data: CreateMedicationInput) => medicationsApi.create(petId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', petId] });
      setAddMedOpen(false);
    },
    onError: (err) => showError(getApiError(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ medId, active }: { medId: string; active: boolean }) =>
      medicationsApi.update(petId!, medId, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', petId] });
    },
    onError: (err) => showError(getApiError(err)),
  });

  // Edit pet mutation
  const editMutation = useMutation({
    mutationFn: (data: Partial<Omit<Pet, 'id' | 'userId' | 'createdAt' | 'photoUrl'>>) =>
      petsApi.update(petId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet', petId] });
      setEditOpen(false);
    },
    onError: (err) => showError(getApiError(err)),
  });

  // Pet photo upload mutation
  const photoMutation = useMutation({
    mutationFn: (file: File) => petsApi.uploadPhoto(petId!, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pet', petId] }),
    onError: (err) => showError(getApiError(err)),
  });

  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) photoMutation.mutate(file);
    e.target.value = '';
  };

  // Vet visit form
  const [hasNextVisit, setHasNextVisit] = useState(false);
  const [vetForm, setVetForm] = useState({ vetId: '', reason: '', notes: '', visitDate: todayNoon(), nextVisitDate: weekFromNow(), nextReason: '' });
  const isScheduling = vetForm.visitDate ? new Date(vetForm.visitDate + ':00') > new Date() : false;

  const vetMutation = useMutation({
    mutationFn: () =>
      healthApi.createVetVisit(petId!, {
        type: isScheduling ? 'scheduled' : 'logged',
        vetId: vetForm.vetId || undefined,
        reason: vetForm.reason,
        notes: !isScheduling && vetForm.notes ? vetForm.notes : undefined,
        visitDate: toIso(vetForm.visitDate),
        scheduleNextVisit:
          !isScheduling && hasNextVisit && vetForm.nextVisitDate
            ? {
                visitDate: toIso(vetForm.nextVisitDate),
                reason: vetForm.nextReason || vetForm.reason,
                vetId: vetForm.vetId || undefined,
              }
            : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vet-visits', petId] });
      setAddOpen(false);
      setVetForm({ vetId: '', reason: '', notes: '', visitDate: todayNoon(), nextVisitDate: weekFromNow(), nextReason: '' });
      setHasNextVisit(false);
    },
    onError: (err) => showError(getApiError(err)),
  });

  // Vet visit update mutation
  const updateVisitMutation = useMutation({
    mutationFn: ({ visitId, data }: { visitId: string; data: Partial<Omit<VetVisit, 'id' | 'petId' | 'createdAt' | 'type'>> }) =>
      healthApi.updateVetVisit(petId!, visitId, data),
    onSuccess: (updatedVisit) => {
      queryClient.invalidateQueries({ queryKey: ['vet-visits', petId] });
      setDetailVisit(updatedVisit);
    },
    onError: (err) => showError(getApiError(err)),
  });


  return (
    <Box sx={{ maxWidth: { md: 960 }, mx: 'auto' }}>
      {/* Gradient hero */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
          px: { xs: 2, md: 3 },
          pt: 2.5, pb: 5,
          display: 'flex', alignItems: 'center', gap: 2,
          borderRadius: '0 0 32px 32px',
        }}
      >
        <Tooltip title="Change photo" placement="bottom">
          <Box
            onClick={() => isOwner && photoInputRef.current?.click()}
            sx={{
              width: { xs: 48, md: 56 }, height: { xs: 48, md: 56 },
              borderRadius: 2, flexShrink: 0,
              bgcolor: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', cursor: 'pointer',
              position: 'relative',
              '&:hover .photo-overlay': { opacity: 1 },
            }}
          >
            {pet?.photoUrl ? (
              <img src={`${serverUrl}${pet.photoUrl}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={pet.name} />
            ) : (
              <Pets sx={{ color: 'white', fontSize: { xs: 26, md: 30 } }} />
            )}
            <Box className="photo-overlay" sx={{
              position: 'absolute', inset: 0, borderRadius: 2,
              bgcolor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s',
            }}>
              <AddAPhoto fontSize="small" sx={{ color: 'white' }} />
            </Box>
          </Box>
        </Tooltip>
        <Box sx={{ flex: 1 }}>
          {pet ? (
            <>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.25rem', md: '1.5rem' }, color: 'white', letterSpacing: '-0.8px' }}>
                {pet.name}
              </Typography>
              <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'rgba(255,255,255,0.75)', mt: 0.25 }}>
                {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}{pet.birthDate ? ` · ${calcAge(pet.birthDate)}` : ''}
              </Typography>
            </>
          ) : (
            <>
              <Skeleton variant="text" width={160} height={36} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
              <Skeleton variant="text" width={110} height={22} sx={{ bgcolor: 'rgba(255,255,255,0.15)' }} />
            </>
          )}
        </Box>
        {isOwner && (
          <Button
            onClick={() => setEditOpen(true)}
            size="small"
            disabled={!pet}
            sx={{
              color: 'white', fontWeight: 800, fontSize: '0.8125rem',
              bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1.5, px: 1.5, py: 0.625,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            Edit
          </Button>
        )}
      </Box>

      {/* Hidden file inputs */}
      <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoPick} />

      {/* Content + side panel */}
      <Box sx={{ display: 'flex', mt: -3 }}>
        {/* Main content */}
        <Box sx={{ flex: 1, minWidth: 0, px: { xs: 2, md: 3 }, pt: 2, position: 'relative', zIndex: 1 }}>

      {/* Tabs */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          {showVetVisits && <Tab value="vet-visits" label="Vet Visits" />}
          {showMedications && <Tab label="Medications" value="medications" />}
          {showNotes && <Tab value="notes" label="Notes" icon={<StickyNote2 sx={{ fontSize: '1rem' }} />} iconPosition="start" />}
          <Tab value="weight" label="Weight" />
          {isOwner && <Tab value="sharing" label="Sharing" />}
        </Tabs>
        {tab === 'vet-visits' && canEditVetVisits && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setAddOpen(true)} size="small">Add</Button>
        )}
        {tab === 'medications' && canEditMedications && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setAddMedOpen(true)} size="small">Add</Button>
        )}
        {tab === 'notes' && canEditNotes && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setNoteFormOpen(true)} size="small">Add</Button>
        )}
      </Box>

      <Box>
        {tab === 'vet-visits' && (
          <>
            {vetVisitsQuery.isLoading ? (
              <LoadingState />
            ) : vetVisitsQuery.isError ? (
              <Box sx={{ p: 2 }}>
                <Alert severity="error">{getApiError(vetVisitsQuery.error)}</Alert>
              </Box>
            ) : (
              <>
                {/* Unified visit list: scheduled first (ascending), then logged (descending) */}
                {vetVisits.length === 0 ? (
                  <EmptyState />
                ) : (
                  <>
                    {[...vetVisits]
                      .sort((a, b) => {
                        if (a.type === b.type) return b.visitDate.localeCompare(a.visitDate);
                        return a.type === 'scheduled' ? -1 : 1;
                      })
                      .map((v) => {
                        const vet = vets.find((vt) => vt.id === v.vetId);
                        const clinicLabel = vet ? vet.name : (v.clinic ?? null);
                        const isScheduled = v.type === 'scheduled';
                        return (
                          <Box
                            key={v.id}
                            onClick={() => isScheduled ? setScheduledVisit(v) : setDetailVisit(v)}
                            sx={{
                              bgcolor: 'background.paper', borderRadius: 2, p: 2, mb: 1.25,
                              boxShadow: isDark
                                ? '0 2px 12px rgba(0,0,0,0.25)'
                                : '0 2px 12px rgba(108,99,255,0.08)',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              cursor: 'pointer',
                              '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(108,99,255,0.04)' },
                            }}
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 800, fontSize: '0.9375rem', color: 'text.primary' }} noWrap>{v.reason}</Typography>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary', mt: 0.375 }}>
                                {fmtDate(v.visitDate)}{clinicLabel ? ` · ${clinicLabel}` : ''}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                              <Chip
                                label={isScheduled ? 'Scheduled' : 'Logged'}
                                size="small"
                                sx={{
                                  fontWeight: 800, borderRadius: 5, fontSize: '0.75rem',
                                  bgcolor: isScheduled
                                    ? (isDark ? '#3d3580' : '#ede9fe')
                                    : '#34d39922',
                                  color: isScheduled ? 'primary.main' : '#059669',
                                  border: isScheduled ? '1px solid' : 'none',
                                  borderColor: isDark ? '#5a5478' : '#d4d0f8',
                                }}
                              />
                            </Box>
                          </Box>
                        );
                      })}
                  </>
                )}
                <div ref={vetVisitsSentinel} />
                {vetVisitsQuery.isFetchingNextPage && <ListSkeleton />}
              </>
            )}
          </>
        )}

        {tab === 'medications' && (
          medicationsQuery.isLoading ? <LoadingState /> : medicationsQuery.isError ? (
            <Box sx={{ p: 2 }}><Alert severity="error">{getApiError(medicationsQuery.error)}</Alert></Box>
          ) : !medications.length ? <EmptyState /> : (
            <>
              {medications.map((m) => (
                <Box
                  key={m.id}
                  onClick={() => setDetailMed(m)}
                  sx={{
                    bgcolor: 'background.paper', borderRadius: 2, p: 2, mb: 1.25,
                    boxShadow: isDark
                      ? '0 2px 12px rgba(0,0,0,0.25)'
                      : '0 2px 12px rgba(108,99,255,0.08)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(108,99,255,0.04)' },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.9375rem', color: 'text.primary' }}>{m.name}</Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary', mt: 0.375 }}>
                      {m.dosage.amount} {m.dosage.unit} · {m.schedule.type}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                    <Chip
                      label={m.active ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        fontWeight: 800, borderRadius: 5, fontSize: '0.75rem',
                        bgcolor: m.active ? '#34d39922' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                        color: m.active ? '#059669' : 'text.disabled',
                        border: 'none',
                      }}
                    />
                    {canEditMedications && (
                      <Switch
                        size="small"
                        checked={m.active}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleActiveMutation.mutate({ medId: m.id, active: !m.active });
                        }}
                        disabled={toggleActiveMutation.isPending && toggleActiveMutation.variables?.medId === m.id}
                        sx={{ flexShrink: 0 }}
                      />
                    )}
                  </Box>
                </Box>
              ))}
            </>
          )
        )}

        {tab === 'notes' && (
          notesQuery.isLoading ? <LoadingState /> : notesQuery.isError ? (
            <Box sx={{ p: 2 }}><Alert severity="error">{getApiError(notesQuery.error)}</Alert></Box>
          ) : notes.length === 0 ? (
            <EmptyState label="No notes yet" />
          ) : (
            <>
              {notes.map((note) => {
                const [y, m2, d] = note.noteDate.split('-').map(Number);
                const formattedDate = new Date(y, m2 - 1, d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                const thumbnail = null;
                const extraPets = note.petIds.length > 1 ? note.petIds.length - 1 : 0;
                return (
                  <Box
                    key={note.id}
                    onClick={() => { setSelectedNote(note); setNoteDetailOpen(true); }}
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: '16px',
                      p: '14px',
                      mb: 1.25,
                      boxShadow: isDark
                        ? '0 2px 12px rgba(0,0,0,0.25)'
                        : '0 2px 12px rgba(108,99,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(108,99,255,0.04)' },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{ fontWeight: 800, fontSize: '0.9375rem', color: 'text.primary', mb: 0.375 }}
                        noWrap
                      >
                        {note.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: note.description ? 0.375 : 0 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>
                          {formattedDate}
                        </Typography>
                        {extraPets > 0 && (
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.6875rem',
                              color: 'primary.main',
                              bgcolor: isDark ? 'rgba(108,99,255,0.18)' : 'rgba(108,99,255,0.10)',
                              borderRadius: '999px',
                              px: 0.75,
                              py: 0.125,
                              lineHeight: 1.6,
                            }}
                          >
                            +{extraPets} pet{extraPets > 1 ? 's' : ''}
                          </Typography>
                        )}
                      </Box>
                      {note.description && (
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            color: 'text.secondary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {note.description}
                        </Typography>
                      )}
                    </Box>
                    {thumbnail && (
                      <Box
                        component="img"
                        src={thumbnail}
                        alt="Note thumbnail"
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: '12px',
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1.5px solid',
                          borderColor: 'divider',
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </>
          )
        )}
        {tab === 'weight' && (
          <WeightSection petId={petId!} canEdit={isOwner} />
        )}
        {tab === 'sharing' && isOwner && pet && (
          <SharingTab petId={petId!} petName={pet.name} />
        )}
      </Box>

        </Box>{/* end main content */}

        {/* Desktop side panel */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column', gap: 2,
            width: 260, flexShrink: 0,
            bgcolor: 'background.paper',
            borderLeft: '1px solid', borderColor: 'divider',
            p: 2, pt: 5,
            position: 'relative', zIndex: 1,
          }}
        >
          {/* Active medications */}
          <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Active Medications
          </Typography>
          {activeMeds.length === 0 ? (
            <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary' }}>None</Typography>
          ) : activeMeds.slice(0, 3).map((med) => (
            <Box key={med.id} sx={{ bgcolor: 'background.default', borderRadius: 1.5, p: 1.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.8125rem', color: 'text.primary' }}>{med.name}</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
                {med.dosage.amount}{med.dosage.unit} · {med.schedule.type}
              </Typography>
            </Box>
          ))}

          {/* Upcoming visit */}
          {nextVisit && (
            <>
              <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mt: 1 }}>
                Next Visit
              </Typography>
              <Box sx={{ bgcolor: isDark ? '#3d3580' : '#ede9fe', borderRadius: 1.5, p: 1.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'primary.main' }}>{nextVisit.reason}</Typography>
                <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                  {fmtDate(nextVisit.visitDate)} · {nextVisit.clinic ?? nextVisit.vetName ?? 'No clinic'}
                </Typography>
              </Box>
            </>
          )}
        </Box>

      </Box>{/* end flex container */}

      {/* Edit pet dialog */}
      {pet && (
        <EditPetDialog
          key={`${pet.name}|${pet.species}|${pet.breed ?? ''}|${pet.birthDate ?? ''}|${pet.color ?? ''}`}
          pet={pet}
          open={editOpen}
          saving={editMutation.isPending}
          onClose={() => setEditOpen(false)}
          onSave={(data) => editMutation.mutate(data)}
        />
      )}

      {/* Add vet visit dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {isScheduling ? 'Schedule Vet Visit' : 'Log Vet Visit'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Vet / Clinic"
              value={vetForm.vetId}
              onChange={(e) => setVetForm({ ...vetForm, vetId: e.target.value })}
              fullWidth
            >
              <MenuItem value="">— None —</MenuItem>
              {vets.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Reason"
              value={vetForm.reason}
              onChange={(e) => setVetForm({ ...vetForm, reason: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Visit Date"
              type="datetime-local"
              value={vetForm.visitDate}
              onChange={(e) => setVetForm({ ...vetForm, visitDate: e.target.value })}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              required
              helperText={isScheduling ? 'Future date — will be saved as a scheduled visit' : 'Past or today — will be logged as history'}
            />
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
            {!isScheduling && (
              <TextField
                label="Notes"
                value={vetForm.notes}
                onChange={(e) => setVetForm({ ...vetForm, notes: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            )}
            {!isScheduling && (
              <>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={hasNextVisit}
                      onChange={(e) => setHasNextVisit(e.target.checked)}
                    />
                  }
                  label="Also schedule next visit"
                />
                {hasNextVisit && (
                  <>
                    <TextField
                      label="Next Visit Date"
                      type="datetime-local"
                      value={vetForm.nextVisitDate}
                      onChange={(e) => setVetForm({ ...vetForm, nextVisitDate: e.target.value })}
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                      label="Reason for next visit"
                      placeholder={vetForm.reason || 'Same as current'}
                      value={vetForm.nextReason}
                      onChange={(e) => setVetForm({ ...vetForm, nextReason: e.target.value })}
                      fullWidth
                    />
                  </>
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => vetMutation.mutate()}
            disabled={!vetForm.reason || !vetForm.visitDate || vetMutation.isPending}
          >
            {vetMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add medication dialog */}
      <AddMedicationDialog
        open={addMedOpen}
        saving={addMedMutation.isPending}
        onClose={() => setAddMedOpen(false)}
        onSave={(data) => addMedMutation.mutate(data)}
      />

      {/* Vet visit detail dialog (logged visits) */}
      {detailVisit && (
        <VetVisitDetailDialog
          key={detailVisit.id}
          visit={detailVisit}
          vets={vets}
          saving={updateVisitMutation.isPending}
          canEdit={canEditVetVisits}
          onClose={() => setDetailVisit(null)}
          onSave={(data) => updateVisitMutation.mutate({ visitId: detailVisit.id, data })}
        />
      )}

      {/* Scheduled visit detail dialog */}
      {scheduledVisit && (
        <ScheduledVisitDetailDialog
          key={scheduledVisit.id}
          visit={scheduledVisit}
          petId={petId!}
          vets={vets}
          onClose={() => setScheduledVisit(null)}
        />
      )}

      {/* Medication detail dialog */}
      {detailMed && (
        <MedicationDetailDialog
          key={detailMed.id}
          med={detailMed}
          petId={petId!}
          onClose={() => setDetailMed(null)}
          canEdit={canEditMedications}
        />
      )}

      {/* Note form dialog */}
      <NoteFormDialog
        open={noteFormOpen}
        onClose={() => setNoteFormOpen(false)}
        defaultPetId={petId}
      />

      {/* Note detail dialog */}
      {selectedNote && (
        <NoteDetailDialog
          key={selectedNote.id}
          open={noteDetailOpen}
          onClose={() => { setNoteDetailOpen(false); setSelectedNote(null); }}
          note={selectedNote}
          onEdit={(note) => {
            setNoteDetailOpen(false);
            setSelectedNote(note);
            setNoteFormOpen(true);
          }}
        />
      )}
    </Box>
  );
}

function EditPetDialog({ pet, open, saving, onClose, onSave }: {
  pet: Pet;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (data: Partial<Omit<Pet, 'id' | 'userId' | 'createdAt' | 'photoUrl'>>) => void;
}) {
  const [form, setForm] = useState({
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? '',
    birthDate: pet.birthDate ? new Date(pet.birthDate).toISOString().slice(0, 10) : '',
    color: pet.color ?? PET_COLOR_PALETTE[0],
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Pet</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
          <TextField select label="Species" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value as typeof PET_SPECIES[number] })} fullWidth required>
            {PET_SPECIES.map((s) => (
              <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
            ))}
          </TextField>
          <TextField label="Breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} fullWidth />
          <TextField label="Birth Date" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={saving || !form.name || !form.species}
          onClick={() => onSave({
            name: form.name,
            species: form.species,
            breed: form.breed || undefined,
            birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : undefined,
            color: form.color,
          })}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type VetVisitEditForm = {
  vetId: string;
  reason: string;
  notes: string;
  visitDate: string;
};

function visitToForm(visit: VetVisit): VetVisitEditForm {
  return {
    vetId: visit.vetId ?? '',
    reason: visit.reason,
    notes: visit.notes ?? '',
    visitDate: visit.visitDate ? new Date(visit.visitDate).toISOString().slice(0, 16) : '',
  };
}

function formChanged(original: VetVisitEditForm, current: VetVisitEditForm): boolean {
  return JSON.stringify(original) !== JSON.stringify(current);
}

function VetVisitDetailDialog({
  visit, vets, saving, onClose, onSave, canEdit = true,
}: {
  visit: VetVisit;
  vets: import('../../types').Vet[];
  saving: boolean;
  onClose: () => void;
  onSave: (data: Partial<Omit<VetVisit, 'id' | 'petId' | 'createdAt' | 'type'>>) => void;
  canEdit?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<VetVisitEditForm>(() => visitToForm(visit));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const originalForm = visitToForm(visit);

  const vetName = vets.find((v) => v.id === visit.vetId)?.name ?? visit.clinic;

  const handleSaveClick = () => {
    if (!formChanged(originalForm, form)) { setEditing(false); return; }
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    onSave({
      vetId: form.vetId || undefined,
      reason: form.reason,
      notes: form.notes || undefined,
      visitDate: form.visitDate ? new Date(form.visitDate + ':00').toISOString() : undefined,
    });
    setEditing(false);
  };

  return (
    <>
      <Dialog open onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 0 }}>
          {editing ? (
            <TextField
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              variant="standard"
              fullWidth
              sx={{ fontSize: 'inherit' }}
            />
          ) : (
            <Box sx={{ flex: 1 }}>{visit.reason}</Box>
          )}
          {!editing && canEdit && (
            <IconButton size="small" onClick={() => setEditing(true)} sx={{ color: 'text.secondary' }}>
              <Edit fontSize="small" />
            </IconButton>
          )}
          {editing && (
            <IconButton size="small" onClick={() => { setEditing(false); setForm(visitToForm(visit)); }} sx={{ color: 'text.secondary' }}>
              <Close fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent>
          {editing ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                select label="Vet / Clinic" value={form.vetId}
                onChange={(e) => setForm({ ...form, vetId: e.target.value })} fullWidth
              >
                <MenuItem value="">— None —</MenuItem>
                {vets.map((v) => <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>)}
              </TextField>
              <TextField
                label="Visit Date" type="datetime-local" value={form.visitDate}
                onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                fullWidth slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Notes" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                fullWidth multiline rows={3}
              />
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">{vetName ?? '—'}</Typography>
                <Typography variant="body2" color="text.secondary">{fmtDateTime(visit.visitDate)}</Typography>
              </Box>
              {visit.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{visit.notes}</Typography>
              )}
            </>
          )}

        </DialogContent>

        <DialogActions>
          {editing ? (
            <>
              <Button onClick={() => { setEditing(false); setForm(visitToForm(visit)); }}>Cancel</Button>
              <Button variant="contained" onClick={handleSaveClick} disabled={saving || !form.reason}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>Close</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Save changes?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will update the vet visit record. Are you sure?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirm}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

const DOSAGE_UNITS = ['mg', 'ml', 'g', 'mcg', 'tab', 'pip', 'injection', 'collar', 'drop'];

function AddMedicationDialog({ open, saving, onClose, onSave }: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (data: CreateMedicationInput) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    dosageAmount: '',
    dosageUnit: 'mg',
    startDate: today(),
    endDate: '',
    notes: '',
  });
  const [schedule, setSchedule] = useState<ReminderScheduleProps>({ type: 'daily', times: ['08:00'] });
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [advanceNotice, setAdvanceNotice] = useState<AdvanceNotice | undefined>(undefined);
  const [hasEndDate, setHasEndDate] = useState(false);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const canSave = !!(form.name && form.dosageAmount && form.dosageUnit && form.startDate);

  const handleSave = () => {
    onSave({
      name: form.name,
      dosageAmount: parseFloat(form.dosageAmount),
      dosageUnit: form.dosageUnit,
      schedule,
      startDate: new Date(form.startDate).toISOString(),
      endDate: hasEndDate && form.endDate ? new Date(form.endDate).toISOString() : undefined,
      notes: form.notes || undefined,
      reminder: { enabled: reminderEnabled, advanceNotice },
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Medication</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Medication name" value={form.name} onChange={(e) => set('name', e.target.value)} fullWidth required />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Dose" type="number" value={form.dosageAmount}
              onChange={(e) => set('dosageAmount', e.target.value)}
              sx={{ flex: 1 }} required
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
            <TextField
              select label="Unit" value={form.dosageUnit}
              onChange={(e) => set('dosageUnit', e.target.value)}
              sx={{ width: 130 }}
            >
              {DOSAGE_UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </TextField>
          </Box>
          <TextField label="Start date" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} fullWidth required slotProps={{ inputLabel: { shrink: true } }} />
          <FormControlLabel
            control={<Checkbox checked={hasEndDate} onChange={(e) => setHasEndDate(e.target.checked)} />}
            label="Set end date"
          />
          {hasEndDate && (
            <TextField label="End date" type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
          )}
          <TextField label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} fullWidth multiline rows={2} />
          <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: -1 }}>
            Schedule
          </Typography>
          <MedicationScheduleSection
            schedule={schedule}
            onScheduleChange={setSchedule}
            reminderEnabled={reminderEnabled}
            onReminderToggle={setReminderEnabled}
            advanceNotice={advanceNotice}
            onAdvanceNoticeChange={setAdvanceNotice}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canSave || saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EmptyState({ label = 'No records yet' }: { label?: string }) {
  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}

function LoadingState() {
  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />)}
    </Box>
  );
}

function ListSkeleton() {
  return (
    <Box sx={{ px: 2, pb: 1 }}>
      <Skeleton variant="rectangular" height={44} sx={{ borderRadius: 1 }} />
    </Box>
  );
}
