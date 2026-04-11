import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Button, Container, TextField, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions, Card, CardContent, Grid, Chip, Link, Skeleton, Alert,
} from '@mui/material';
import { Add, Phone, LocationOn, AccessTime, Map } from '@mui/icons-material';
import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { vetsApi } from '../../api/vets';
import { getApiError } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

export function VetsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phone: '', workHours: '', googleMapsUrl: '', notes: '' });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const { showError } = useNotification();

  const { data, isLoading, isError: listError, error: listErrorObj, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['vets', groupId],
    queryFn: ({ pageParam }) => vetsApi.list(groupId!, { pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: !!groupId,
  });

  const vets = data?.pages.flatMap((p) => p.items) ?? [];

  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); },
    hasNextPage,
  );

  const mutation = useMutation({
    mutationFn: () => vetsApi.create(groupId!, {
      name: form.name,
      address: form.address || undefined,
      phone: form.phone || undefined,
      workHours: form.workHours || undefined,
      googleMapsUrl: form.googleMapsUrl || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vets', groupId] });
      setOpen(false);
      setForm({ name: '', address: '', phone: '', workHours: '', googleMapsUrl: '', notes: '' });
    },
    onError: (err) => showError(getApiError(err)),
  });

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Vets</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>Add Vet</Button>
      </Box>

      {listError && (
        <Alert severity="error" sx={{ mb: 2 }}>{getApiError(listErrorObj)}</Alert>
      )}

      {isLoading ? (
        <Grid container spacing={2}>
          {[1, 2].map((i) => <Grid size={{ xs: 12 }} key={i}><Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} /></Grid>)}
        </Grid>
      ) : vets.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No vets added yet. Add one to start tracking visits.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {vets.map((vet) => (
            <Grid size={{ xs: 12 }} key={vet.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>{vet.name}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                    {vet.phone && (
                      <Chip icon={<Phone fontSize="small" />} label={vet.phone} size="small" variant="outlined" />
                    )}
                    {vet.workHours && (
                      <Chip icon={<AccessTime fontSize="small" />} label={vet.workHours} size="small" variant="outlined" />
                    )}
                    {vet.address && (
                      <Chip icon={<LocationOn fontSize="small" />} label={vet.address} size="small" variant="outlined" />
                    )}
                    {vet.googleMapsUrl && (
                      <Chip
                        icon={<Map fontSize="small" />}
                        label={<Link href={vet.googleMapsUrl} target="_blank" rel="noopener" underline="none">Maps</Link>}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    )}
                  </Box>
                  {vet.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{vet.notes}</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <div ref={sentinelRef} />
      {isFetchingNextPage && (
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Vet</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Name" value={form.name} onChange={set('name')} fullWidth required />
          <TextField label="Phone" value={form.phone} onChange={set('phone')} fullWidth />
          <TextField label="Address" value={form.address} onChange={set('address')} fullWidth />
          <TextField label="Work Hours" placeholder="e.g. Mon–Fri 8:00–18:00" value={form.workHours} onChange={set('workHours')} fullWidth />
          <TextField label="Google Maps URL" value={form.googleMapsUrl} onChange={set('googleMapsUrl')} fullWidth />
          <TextField label="Notes" value={form.notes} onChange={set('notes')} fullWidth multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => mutation.mutate()} disabled={!form.name.trim() || mutation.isPending}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
