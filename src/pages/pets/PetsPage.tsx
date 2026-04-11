import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, TextField, Typography, Dialog,
  DialogTitle, DialogContent, DialogActions, Card, CardContent, CardActionArea,
  Grid, Skeleton, List, ListItemButton, Divider, Avatar, Chip,
} from '@mui/material';
import { Add, CalendarMonth, MedicalServices, Pets } from '@mui/icons-material';
import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { petsApi } from '../../api/pets';
import { healthApi } from '../../api/health';
import { vetsApi } from '../../api/vets';
import { getApiError } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(iso: string) {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
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

  const { showError } = useNotification();

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
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Group</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<MedicalServices />} onClick={() => navigate(`/groups/${groupId}/vets`)}>
            Vets
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>Add Pet</Button>
        </Box>
      </Box>

      {/* Pets section */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Pets fontSize="small" color="primary" /> Pets
      </Typography>

      {isLoading ? (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[1, 2, 3].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rectangular" height={90} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {pets.map((pet) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={pet.id}>
              <Card>
                <CardActionArea onClick={() => navigate(`/groups/${groupId}/pets/${pet.id}`)}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      src={pet.photoUrl ? `${serverUrl}${pet.photoUrl}` : undefined}
                      sx={{ width: 44, height: 44, bgcolor: 'primary.main', flexShrink: 0 }}
                    >
                      {!pet.photoUrl && <Pets fontSize="small" />}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={600} noWrap>{pet.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
                      </Typography>
                    </Box>
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
          <Skeleton variant="rectangular" height={90} sx={{ borderRadius: 2 }} />
        </Box>
      )}

      {/* Upcoming vet visits section */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CalendarMonth fontSize="small" color="primary" /> Upcoming Vet Visits
      </Typography>

      <Box sx={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 2,
        overflow: 'hidden',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {visitsLoading ? (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2].map((i) => <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 1 }} />)}
          </Box>
        ) : !upcomingVisits.length ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No upcoming vet visits</Typography>
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
                    sx={{ py: 1.5, px: 2 }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={500} noWrap>{visit.reason}</Typography>
                        {pet && (
                          <Chip label={pet.name} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                        )}
                      </Box>
                      {vetName && (
                        <Typography variant="caption" color="text.secondary" noWrap>{vetName}</Typography>
                      )}
                    </Box>
                    <Box sx={{ ml: 2, textAlign: 'right', flexShrink: 0 }}>
                      <Typography variant="caption" color={isUrgent ? 'warning.main' : 'text.secondary'} fontWeight={isUrgent ? 600 : 400}>
                        {until}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {fmtDate(visit.nextVisitDate!)}
                      </Typography>
                    </Box>
                  </ListItemButton>
                </Box>
              );
            })}
          </List>
        )}
      </Box>

      {/* Add pet dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add Pet</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
          <TextField label="Species" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} fullWidth required />
          <TextField label="Breed (optional)" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} fullWidth />
          <TextField label="Birth Date" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
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
