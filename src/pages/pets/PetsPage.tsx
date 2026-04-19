import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Typography, Dialog,
  DialogTitle, DialogContent, DialogActions, Skeleton, Grid,
} from '@mui/material';
import { Add, Pets } from '@mui/icons-material';
import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { petsApi } from '../../api/pets';
import { healthApi } from '../../api/health';
import { getApiError } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isUrgent ? 'secondary.main' : 'primary.main', flexShrink: 0 }} />
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: isUrgent ? 'secondary.main' : 'primary.main' }}>
          {visit.reason} · {label}
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#34d399', flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#059669' }}>All clear</Typography>
    </Box>
  );
}

function PetCard({ pet, upcomingVisits }: { pet: Pet; upcomingVisits: VetVisit[] }) {
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
        p: 1.75,
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        {/* Avatar */}
        <Box
          sx={{
            width: 48, height: 48, borderRadius: 1.75, flexShrink: 0,
            bgcolor: pet.color ? `${pet.color}22` : avatarBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {pet.photoUrl ? (
            <img src={`${serverUrl}${pet.photoUrl}`} alt={pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Pets sx={{ fontSize: 24, color: pet.color ?? (speciesKey === 'cat' ? '#6c63ff' : speciesKey === 'dog' ? '#fb7185' : '#34d399') }} />
          )}
        </Box>

        {/* Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.9375rem', color: 'text.primary', letterSpacing: '-0.3px' }} noWrap>
            {pet.name}
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: '0.6875rem', color: 'text.secondary' }} noWrap>
            {pet.species}{age ? ` · ${age}` : ''}
          </Typography>
          <StatusBadge pet={pet} upcomingVisits={upcomingVisits} />
        </Box>

        {/* Species tag */}
        <Box
          sx={{
            background: tagGradient,
            color: tagColor,
            fontSize: '0.5625rem',
            fontWeight: 800,
            px: 1,
            py: 0.375,
            borderRadius: 5,
            letterSpacing: '0.5px',
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

export function PetsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', species: '', breed: '', birthDate: '' });
  const { showError } = useNotification();

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: 'text.primary', letterSpacing: '-0.8px' }}>
            My Pets
          </Typography>
          {pets.length > 0 && (
            <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary', mt: 0.25 }}>
              {pets.length} pet{pets.length !== 1 ? 's' : ''}
              {upcomingVisits.length > 0 ? ` · ${upcomingVisits.length} upcoming visit${upcomingVisits.length !== 1 ? 's' : ''}` : ''}
            </Typography>
          )}
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} size="small">
          Add Pet
        </Button>
      </Box>

      {/* Pet grid */}
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
