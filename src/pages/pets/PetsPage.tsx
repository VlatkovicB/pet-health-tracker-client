import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Button, TextField, Typography, Dialog, Chip,
  DialogTitle, DialogContent, DialogActions, Skeleton, Grid, Tabs, Tab,
} from '@mui/material';
import { Add, Pets } from '@mui/icons-material';
import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { petsApi } from '../../api/pets';
import { healthApi } from '../../api/health';
import { getApiError } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import {
  useListPendingShares, useAcceptShare, useDeclineShare, useListSharedPets,
} from '../../api/shares';
import {
  useListPendingTransfers, useAcceptTransfer, useDeclineTransfer,
} from '../../api/transfers';
import { PendingShareCard } from '../../components/sharing/PendingShareCard';
import { PendingTransferCard } from '../../components/sharing/PendingTransferCard';
import type { Pet, VetVisit } from '../../types';

const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000';

const SPECIES_AVATAR_BG: Record<string, string> = {
  cat:    '#ede9fe',
  dog:    '#fce7f3',
  rabbit: '#d1fae5',
};

const SPECIES_TAG_GRADIENT: Record<string, string> = {
  cat:    'linear-gradient(135deg, #6c63ff, #a78bfa)',
  dog:    'linear-gradient(135deg, #fb7185, #f9a8d4)',
  rabbit: 'linear-gradient(135deg, #34d399, #6ee7b7)',
};

const SPECIES_TAG_COLOR: Record<string, string> = {
  cat:    'white',
  dog:    'white',
  rabbit: '#064e3b',
};

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = iso.split('T')[0].split('-').map(Number);
  return Math.round((new Date(year, month - 1, day).getTime() - today.getTime()) / 86_400_000);
}

function petAge(birthDate?: string): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const years = Math.floor((Date.now() - birth.getTime()) / (365.25 * 86_400_000));
  return years <= 0 ? '< 1 year' : `${years} yr${years !== 1 ? 's' : ''}`;
}

function StatusBadge({ pet, upcomingVisits }: { pet: Pet; upcomingVisits: VetVisit[] }) {
  const visit = upcomingVisits.find((v) => v.petId === pet.id);
  if (visit) {
    const days = daysUntil(visit.visitDate);
    const isUrgent = days <= 3;
    const label = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.625 }}>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: isUrgent ? 'secondary.main' : 'primary.main', flexShrink: 0 }} />
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: isUrgent ? 'secondary.main' : 'primary.main' }}>
          {visit.reason} · {label}
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.625 }}>
      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#34d399', flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>All clear</Typography>
    </Box>
  );
}

function PetCard({ pet, upcomingVisits, sharedChip }: { pet: Pet; upcomingVisits: VetVisit[]; sharedChip?: boolean }) {
  const navigate = useNavigate();
  const speciesKey = pet.species.toLowerCase();
  const avatarBg = SPECIES_AVATAR_BG[speciesKey] ?? '#e0f2fe';
  const tagGradient = SPECIES_TAG_GRADIENT[speciesKey] ?? 'linear-gradient(135deg, #fbbf24, #fde68a)';
  const tagColor = SPECIES_TAG_COLOR[speciesKey] ?? '#451a03';
  const age = petAge(pet.birthDate);

  return (
    <Box
      onClick={() => navigate(`/pets/${pet.id}`)}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        p: 2,
        cursor: 'pointer',
        boxShadow: (t) => t.palette.mode === 'dark'
          ? '0 2px 12px rgba(0,0,0,0.25)'
          : '0 2px 12px rgba(108,99,255,0.08)',
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (t) => t.palette.mode === 'dark'
            ? '0 6px 20px rgba(0,0,0,0.35)'
            : '0 6px 20px rgba(108,99,255,0.16)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 56, height: 56, borderRadius: 2, flexShrink: 0,
            bgcolor: pet.color ? `${pet.color}22` : avatarBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {pet.photoUrl ? (
            <img src={`${serverUrl}${pet.photoUrl}`} alt={pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Pets sx={{ fontSize: 28, color: pet.color ?? (speciesKey === 'cat' ? '#6c63ff' : speciesKey === 'dog' ? '#fb7185' : '#34d399') }} />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: 'text.primary', letterSpacing: '-0.3px' }} noWrap>
              {pet.name}
            </Typography>
            {sharedChip && (
              <Chip
                label="Shared"
                size="small"
                sx={{
                  fontWeight: 800, borderRadius: 5, fontSize: '0.6875rem',
                  bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
                  color: 'primary.main',
                  flexShrink: 0,
                }}
              />
            )}
          </Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary', mt: 0.125 }} noWrap>
            {pet.species}{age ? ` · ${age}` : ''}
          </Typography>
          <StatusBadge pet={pet} upcomingVisits={upcomingVisits} />
        </Box>

        <Box
          sx={{
            background: tagGradient,
            color: tagColor,
            fontSize: '0.6875rem',
            fontWeight: 800,
            px: 1.25,
            py: 0.5,
            borderRadius: 5,
            letterSpacing: '0.25px',
            flexShrink: 0,
            textTransform: 'uppercase',
          }}
        >
          {pet.species}
        </Box>
      </Box>
    </Box>
  );
}

function SharedWithMeTab() {
  const { data: pendingShares = [], isLoading: sharesLoading } = useListPendingShares();
  const { data: pendingTransfers = [], isLoading: transfersLoading } = useListPendingTransfers();
  const { data: sharedPets = [], isLoading: petsLoading } = useListSharedPets();

  const acceptShareMutation = useAcceptShare();
  const declineShareMutation = useDeclineShare();
  const acceptTransferMutation = useAcceptTransfer();
  const declineTransferMutation = useDeclineTransfer();

  const hasPending = pendingShares.length > 0 || pendingTransfers.length > 0;
  const isLoading = sharesLoading || transfersLoading || petsLoading;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
        {[1, 2].map((i) => <Skeleton key={i} variant="rectangular" height={72} sx={{ borderRadius: 2 }} />)}
      </Box>
    );
  }

  return (
    <Box>
      {hasPending && (
        <Box sx={{ mb: 2.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: 1 }}>
            Pending ({pendingShares.length + pendingTransfers.length})
          </Typography>
          {pendingShares.map((share) => (
            <PendingShareCard
              key={share.id}
              share={share}
              accepting={acceptShareMutation.isPending && acceptShareMutation.variables === share.id}
              declining={declineShareMutation.isPending && declineShareMutation.variables === share.id}
              onAccept={() => acceptShareMutation.mutate(share.id)}
              onDecline={() => declineShareMutation.mutate(share.id)}
            />
          ))}
          {pendingTransfers.map((transfer) => (
            <PendingTransferCard
              key={transfer.id}
              transfer={transfer}
              accepting={acceptTransferMutation.isPending && (acceptTransferMutation.variables as { transferId: string } | undefined)?.transferId === transfer.id}
              declining={declineTransferMutation.isPending && declineTransferMutation.variables === transfer.id}
              onAccept={(retainAccess) => acceptTransferMutation.mutate({ transferId: transfer.id, retainAccess })}
              onDecline={() => declineTransferMutation.mutate(transfer.id)}
            />
          ))}
        </Box>
      )}

      {sharedPets.length > 0 && (
        <Box>
          {hasPending && (
            <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: 1 }}>
              Active ({sharedPets.length})
            </Typography>
          )}
          <Grid container spacing={1.5}>
            {sharedPets.map((pet) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={pet.id}>
                <PetCard pet={pet} upcomingVisits={[]} sharedChip />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {!hasPending && sharedPets.length === 0 && (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2rem', mb: 1 }}>🤝</Typography>
          <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.875rem' }}>
            No pets shared with you yet
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export function PetsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', species: '', breed: '', birthDate: '' });
  const { showError } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'shared' ? 'shared' : 'mine';
  const setView = (v: 'mine' | 'shared') => setSearchParams({ view: v }, { replace: true });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['pets'],
    queryFn: ({ pageParam }) => petsApi.list({ pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });
  const pets = data?.pages.flatMap((p) => p.items) ?? [];
  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); },
    hasNextPage,
  );

  const { data: upcomingVisits = [] } = useQuery({
    queryKey: ['upcoming-vet-visits'],
    queryFn: () => healthApi.listUpcomingVetVisits(),
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => petsApi.create({
      name: data.name, species: data.species,
      breed: data.breed || undefined,
      birthDate: data.birthDate || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      setOpen(false);
      setForm({ name: '', species: '', breed: '', birthDate: '' });
    },
    onError: (err) => showError(getApiError(err)),
  });

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', px: { xs: 2, md: 3 }, pt: 2.5, pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: 'text.primary', letterSpacing: '-0.8px' }}>
          Pets
        </Typography>
        {view === 'mine' && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} size="small">
            Add Pet
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ mb: 2.5 }}>
        <Tab value="mine" label="My Pets" />
        <Tab value="shared" label="Shared With Me" />
      </Tabs>

      {view === 'mine' && (
        <>
          {isLoading ? (
            <Grid container spacing={1.5}>
              {[1, 2, 3].map((i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                  <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
                </Grid>
              ))}
            </Grid>
          ) : pets.length === 0 ? (
            <Box
              onClick={() => setOpen(true)}
              sx={{
                bgcolor: 'background.paper', borderRadius: 2, py: 5,
                textAlign: 'center', cursor: 'pointer',
                border: '2px dashed', borderColor: 'divider',
                '&:hover': { borderColor: 'primary.light' },
              }}
            >
              <Typography sx={{ fontSize: '2rem', mb: 1 }}>🐾</Typography>
              <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.875rem' }}>
                No pets yet — tap to add one
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={1.5}>
              {pets.map((pet) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={pet.id}>
                  <PetCard pet={pet} upcomingVisits={upcomingVisits} />
                </Grid>
              ))}
            </Grid>
          )}
          <div ref={sentinelRef} />
          {isFetchingNextPage && (
            <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2, mt: 1.5 }} />
          )}
        </>
      )}

      {view === 'shared' && <SharedWithMeTab />}

      {/* Add pet dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add Pet</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
          <TextField label="Name"              value={form.name}      onChange={(e) => setForm({ ...form, name:      e.target.value })} fullWidth required autoFocus />
          <TextField label="Species"           value={form.species}   onChange={(e) => setForm({ ...form, species:   e.target.value })} fullWidth required />
          <TextField label="Breed (optional)"  value={form.breed}     onChange={(e) => setForm({ ...form, breed:     e.target.value })} fullWidth />
          <TextField label="Birth Date" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={() => mutation.mutate(form)}
            disabled={!form.name.trim() || !form.species.trim() || mutation.isPending}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
