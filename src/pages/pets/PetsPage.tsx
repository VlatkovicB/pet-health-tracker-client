import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, TextField, Typography, Dialog,
  DialogTitle, DialogContent, DialogActions, Card, CardContent, CardActionArea, Grid, Skeleton,
} from '@mui/material';
import { Add, Pets, MedicalServices } from '@mui/icons-material';
import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { petsApi } from '../../api/pets';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

export function PetsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', species: '', breed: '', birthDate: '' });

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
  });

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Pets</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<MedicalServices />} onClick={() => navigate(`/groups/${groupId}/vets`)}>
            Vets
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>Add Pet</Button>
        </Box>
      </Box>

      {isLoading ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}><Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} /></Grid>)}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {pets.map((pet) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={pet.id}>
              <Card>
                <CardActionArea onClick={() => navigate(`/groups/${groupId}/pets/${pet.id}`)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Pets color="primary" />
                      <Typography variant="h6">{pet.name}</Typography>
                    </Box>
                    <Typography color="text.secondary">{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <div ref={sentinelRef} />
      {isFetchingNextPage && (
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
        </Box>
      )}

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
