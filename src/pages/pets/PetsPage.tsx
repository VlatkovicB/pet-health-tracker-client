import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, TextField, Typography, Dialog,
  DialogTitle, DialogContent, DialogActions, Card, CardContent, CardActionArea,
  Grid, Skeleton, List, ListItemButton, Divider, Avatar, Chip,
} from '@mui/material';
import { Add, CalendarMonth, ChevronRight, Email, MedicalServices, Pets } from '@mui/icons-material';
import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { petsApi } from '../../api/pets';
import { healthApi } from '../../api/health';
import { vetsApi } from '../../api/vets';
import { apiClient, getApiError } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = iso.split('T')[0].split('-').map(Number);
  const visitDate = new Date(year, month - 1, day);
  const diff = Math.round((visitDate.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
}

export function PetsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', species: '', breed: '', birthDate: '' });

  // Pets (infinite)
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['pets', groupId],
    queryFn: ({ pageParam }) => petsApi.list(groupId!, { pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: !!groupId,
  });
  const pets = data?.pages.flatMap((p) => p.items) ?? [];
  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); },
    hasNextPage,
  );

  // Upcoming vet visits
  const { data: upcomingVisits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ['upcoming-vet-visits', groupId],
    queryFn: () => healthApi.listUpcomingVetVisits(groupId!),
    enabled: !!groupId,
  });

  // Vets (for resolving vet names)
  const { data: vets = [] } = useQuery({
    queryKey: ['vets-all', groupId],
    queryFn: () => vetsApi.listAll(groupId!),
    enabled: !!groupId,
  });

  // Pet map for resolving pet names on visits
  const petMap = Object.fromEntries(pets.map((p) => [p.id, p]));

  const { showError, showSuccess } = useNotification();

  const testEmailMutation = useMutation({
    mutationFn: () => apiClient.post('/dev/test-email/vet-visit').then((r) => r.data as { sentTo: string }),
    onSuccess: (data) => showSuccess(`Test email sent to ${data.sentTo}`),
    onError: (err) => showError(getApiError(err)),
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => petsApi.create(groupId!, {
      name: data.name,
      species: data.species,
      breed: data.breed || undefined,
      birthDate: data.birthDate || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets', groupId] });
      setOpen(false);
      setForm({ name: '', species: '', breed: '', birthDate: '' });
    },
    onError: (err) => showError(getApiError(err)),
  });

  return (
    <Container maxWidth="md" sx={{ mt: 4, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Pets</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {import.meta.env.DEV && (
            <Button
              variant="outlined"
              color="warning"
              size="small"
              startIcon={<Email sx={{ fontSize: 17 }} />}
              onClick={() => testEmailMutation.mutate()}
              disabled={testEmailMutation.isPending}
              title="DEV: Send test vet visit reminder email"
            >
              Test Email
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<MedicalServices sx={{ fontSize: 17 }} />}
            onClick={() => navigate(`/groups/${groupId}/vets`)}
            size="small"
          >
            Vets
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} size="small">
            Add Pet
          </Button>
        </Box>
      </Box>

      {/* Pets grid */}
      {isLoading ? (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[1, 2, 3].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rectangular" height={96} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : pets.length === 0 ? (
        <Card elevation={1} sx={{ mb: 4 }}>
          <CardActionArea onClick={() => setOpen(true)} sx={{ py: 4, textAlign: 'center' }}>
            <Pets sx={{ fontSize: 32, color: 'primary.main', mb: 1, opacity: 0.6 }} />
            <Typography variant="subtitle2" color="text.secondary">
              No pets yet — add one to get started
            </Typography>
          </CardActionArea>
        </Card>
      ) : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {pets.map((pet) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={pet.id}>
              <Card elevation={1} sx={{ '&:hover': { boxShadow: 4 } }}>
                <CardActionArea onClick={() => navigate(`/groups/${groupId}/pets/${pet.id}`)}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                    <Avatar
                      src={pet.photoUrl ? `${serverUrl}${pet.photoUrl}` : undefined}
                      sx={{ width: 48, height: 48, flexShrink: 0 }}
                    >
                      {!pet.photoUrl && <Pets sx={{ fontSize: 22 }} />}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" noWrap>{pet.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
                      </Typography>
                    </Box>
                    <ChevronRight sx={{ color: 'text.disabled', flexShrink: 0, fontSize: 20 }} />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <div ref={sentinelRef} />
      {isFetchingNextPage && (
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="rectangular" height={96} sx={{ borderRadius: 2 }} />
        </Box>
      )}

      {/* Upcoming vet visits */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <CalendarMonth sx={{ fontSize: 18, color: 'primary.main' }} />
        <Typography variant="subtitle1">Upcoming Vet Visits</Typography>
      </Box>

      <Card elevation={1} sx={{ overflow: 'hidden' }}>
        {visitsLoading ? (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2].map((i) => <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: 1 }} />)}
          </Box>
        ) : !upcomingVisits.length ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No upcoming vet visits</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {upcomingVisits.map((visit, i) => {
              const pet = petMap[visit.petId];
              const vet = vets.find((v) => v.id === visit.vetId);
              const vetName = vet?.name ?? visit.clinic;
              const until = daysUntil(visit.nextVisitDate!);
              const isUrgent = new Date(visit.nextVisitDate!).getTime() - Date.now() < 3 * 86_400_000;
              return (
                <Box key={visit.id}>
                  {i > 0 && <Divider />}
                  <ListItemButton
                    onClick={() => pet && navigate(`/groups/${groupId}/pets/${pet.id}`)}
                    sx={{ py: 1.75, px: 2, borderRadius: 0 }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{visit.reason}</Typography>
                        {pet && (
                          <Chip label={pet.name} size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
                        )}
                      </Box>
                      {vetName && (
                        <Typography variant="caption" color="text.secondary" noWrap>{vetName}</Typography>
                      )}
                    </Box>
                    <Box sx={{ ml: 2, textAlign: 'right', flexShrink: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, display: 'block', color: isUrgent ? 'error.main' : 'primary.main' }}
                      >
                        {until}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {fmtDate(visit.nextVisitDate!)}
                      </Typography>
                    </Box>
                  </ListItemButton>
                </Box>
              );
            })}
          </List>
        )}
      </Card>

      {/* Add pet dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add Pet</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required autoFocus />
          <TextField label="Species" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} fullWidth required />
          <TextField label="Breed (optional)" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} fullWidth />
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
    </Container>
  );
}
