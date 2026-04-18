// pet-health-tracker-client/src/pages/vets/VetsPage.tsx
import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Container,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, Skeleton, TextField, Typography,
} from '@mui/material';
import {
  Add, AccessTime, Edit, ExpandMore, LocationOn, Map,
  MedicalServices, Phone, Star,
} from '@mui/icons-material';
import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { vetsApi } from '../../api/vets';
import { placesApi, type PlaceSearchResult, type PlaceDetails } from '../../api/places';
import { getApiError } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { WorkHoursEditor } from '../../components/WorkHoursEditor';
import type { Vet, VetWorkHours } from '../../types';

type SearchState = 'idle' | 'searching' | 'done';

const emptyForm = {
  name: '',
  address: '',
  phone: '',
  workHours: [] as VetWorkHours[],
  googleMapsUrl: '',
  notes: '',
  rating: '',
  placeId: '',
};

export function VetsPage() {
  const queryClient = useQueryClient();

  // Add vet state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Card expand state
  const [expandedVetId, setExpandedVetId] = useState<string | null>(null);

  // Edit vet state
  const [editVet, setEditVet] = useState<Vet | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  useEffect(() => {
    if (editVet) {
      setEditForm({
        name: editVet.name,
        address: editVet.address ?? '',
        phone: editVet.phone ?? '',
        workHours: editVet.workHours ?? [],
        googleMapsUrl: editVet.googleMapsUrl ?? '',
        notes: editVet.notes ?? '',
        rating: editVet.rating != null ? String(editVet.rating) : '',
      });
    }
  }, [editVet]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const setEdit = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm((f) => ({ ...f, [field]: e.target.value }));

  const { showError } = useNotification();

  const resetSearch = () => {
    setSearchState('idle');
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  };

  const handleClose = () => {
    setOpen(false);
    setForm(emptyForm);
    resetSearch();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const results = await placesApi.search(searchQuery.trim());
      setSearchResults(results);
    } catch {
      setSearchError('Search failed. Try again or enter details manually.');
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handlePickPlace = async (placeId: string) => {
    setIsSearchLoading(true);
    setSearchError(null);
    try {
      const details: PlaceDetails = await placesApi.details(placeId);
      setForm((f) => ({
        ...f,
        name: details.name || f.name,
        address: details.address || f.address,
        phone: details.phone || f.phone,
        googleMapsUrl: details.googleMapsUrl || f.googleMapsUrl,
        rating: details.rating !== undefined ? String(details.rating) : f.rating,
        placeId,
      }));
      setSearchState('done');
    } catch {
      setSearchError('Could not load details. Try again or enter manually.');
    } finally {
      setIsSearchLoading(false);
    }
  };

  const { data, isLoading, isError: listError, error: listErrorObj, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['vets'],
    queryFn: ({ pageParam }) => vetsApi.list({ pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });

  const vets = data?.pages.flatMap((p) => p.items) ?? [];

  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); },
    hasNextPage,
  );

  const mutation = useMutation({
    mutationFn: () => vetsApi.create({
      name: form.name,
      address: form.address || undefined,
      phone: form.phone || undefined,
      workHours: form.workHours.length > 0 ? form.workHours : undefined,
      googleMapsUrl: form.googleMapsUrl || undefined,
      rating: form.rating ? Number(form.rating) : undefined,
      placeId: form.placeId || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vets'] });
      queryClient.invalidateQueries({ queryKey: ['vets-all'] });
      setOpen(false);
      setForm(emptyForm);
      resetSearch();
    },
    onError: (err) => showError(getApiError(err)),
  });

  const editMutation = useMutation({
    mutationFn: () => vetsApi.update(editVet!.id, {
      name: editForm.name,
      address: editForm.address || undefined,
      phone: editForm.phone || undefined,
      workHours: editForm.workHours.length > 0 ? editForm.workHours : undefined,
      googleMapsUrl: editForm.googleMapsUrl || undefined,
      rating: editForm.rating ? Number(editForm.rating) : undefined,
      notes: editForm.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vets'] });
      queryClient.invalidateQueries({ queryKey: ['vets-all'] });
      setEditVet(null);
    },
    onError: (err) => showError(getApiError(err)),
  });

  const toggleExpand = (id: string) =>
    setExpandedVetId((prev) => (prev === id ? null : id));

  return (
    <Container maxWidth="md" sx={{ mt: 4, px: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Vets</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Add Vet
        </Button>
      </Box>

      {listError && (
        <Alert severity="error" sx={{ mb: 2 }}>{getApiError(listErrorObj)}</Alert>
      )}

      {isLoading ? (
        <Grid container spacing={2}>
          {[1, 2].map((i) => (
            <Grid size={{ xs: 12 }} key={i}>
              <Skeleton variant="rectangular" height={72} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : vets.length === 0 ? (
        <Card elevation={1}>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <MedicalServices sx={{ fontSize: 32, color: 'primary.main', mb: 1, opacity: 0.5 }} />
            <Typography variant="subtitle2" color="text.secondary">No vets added yet</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              Add a vet to link them to visits and get reminders
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {vets.map((vet) => {
            const expanded = expandedVetId === vet.id;
            return (
              <Grid size={{ xs: 12 }} key={vet.id}>
                <Card
                  elevation={1}
                  sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}
                  onClick={() => toggleExpand(vet.id)}
                >
                  <CardContent sx={{ pb: '16px !important' }}>
                    {/* Collapsed header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                        bgcolor: 'rgba(42,157,143,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <MedicalServices sx={{ color: 'primary.main', fontSize: 20 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{vet.name}</Typography>
                        {vet.notes && (
                          <Typography variant="body2" color="text.secondary" noWrap>{vet.notes}</Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                        {vet.phone && (
                          <Chip
                            icon={<Phone sx={{ fontSize: '14px !important' }} />}
                            label={vet.phone}
                            size="small"
                            variant="outlined"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {vet.rating != null && (
                          <Chip
                            icon={<Star sx={{ fontSize: '14px !important', color: 'warning.main !important' }} />}
                            label={vet.rating.toFixed(1)}
                            size="small"
                            variant="outlined"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <ExpandMore sx={{
                          color: 'text.secondary',
                          transform: expanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                          fontSize: 20,
                        }} />
                      </Box>
                    </Box>

                    {/* Expanded detail */}
                    {expanded && (
                      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {vet.address && (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
                            <Typography variant="body2" color="text.secondary">{vet.address}</Typography>
                          </Box>
                        )}

                        {vet.workHours && vet.workHours.length > 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <AccessTime sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                              {vet.workHours.map((wh) => (
                                <Box key={wh.dayOfWeek} sx={{ display: 'flex', gap: 1.5 }}>
                                  <Typography variant="caption" sx={{ width: 28, color: 'text.secondary', flexShrink: 0 }}>
                                    {wh.dayOfWeek.charAt(0) + wh.dayOfWeek.slice(1, 3).toLowerCase()}
                                  </Typography>
                                  <Typography variant="caption" color={wh.open ? 'text.primary' : 'text.disabled'}>
                                    {wh.open ? `${wh.startTime}–${wh.endTime}` : 'Closed'}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled">No hours set</Typography>
                        )}

                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          {vet.googleMapsUrl && (
                            <Button
                              size="small"
                              startIcon={<Map />}
                              href={vet.googleMapsUrl}
                              target="_blank"
                              rel="noopener"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Maps
                            </Button>
                          )}
                          <Button
                            size="small"
                            startIcon={<Edit />}
                            onClick={(e) => { e.stopPropagation(); setEditVet(vet); }}
                          >
                            Edit
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <div ref={sentinelRef} />
      {isFetchingNextPage && (
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="rectangular" height={72} sx={{ borderRadius: 2 }} />
        </Box>
      )}

      {/* Add Vet dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Add Vet</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
          {searchState === 'idle' && (
            <Box
              onClick={() => setSearchState('searching')}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                px: 2, py: 1.25, borderRadius: 2,
                border: '1px dashed', borderColor: 'primary.main',
                color: 'primary.main', cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Map sx={{ fontSize: 18 }} />
              <Typography variant="body2">Search Google Maps to auto-fill details</Typography>
            </Box>
          )}

          {searchState === 'searching' && (
            <Box sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 2, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small" fullWidth placeholder="Search for a clinic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  autoFocus
                />
                <Button
                  variant="contained" size="small" onClick={handleSearch}
                  disabled={isSearchLoading || !searchQuery.trim()}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {isSearchLoading ? '...' : 'Search'}
                </Button>
              </Box>
              {searchError && <Typography variant="caption" color="error">{searchError}</Typography>}
              {searchResults.length === 0 && !isSearchLoading && !searchError && searchQuery && (
                <Typography variant="caption" color="text.secondary">No results found</Typography>
              )}
              {searchResults.map((r) => (
                <Box key={r.placeId} onClick={() => handlePickPlace(r.placeId)}
                  sx={{ px: 1.5, py: 1, borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{r.address}</Typography>
                </Box>
              ))}
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ cursor: 'pointer', '&:hover': { color: 'text.primary' } }}
                  onClick={resetSearch}>
                  ✕ cancel search
                </Typography>
              </Box>
            </Box>
          )}

          {searchState === 'done' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: 2, bgcolor: 'success.main', color: 'success.contrastText', opacity: 0.85 }}>
              <Typography variant="caption">✓ Filled from Google Maps — edit freely</Typography>
            </Box>
          )}

          <TextField label="Name" value={form.name} onChange={set('name')} fullWidth required autoFocus={searchState === 'idle'} />
          <TextField label="Phone" value={form.phone} onChange={set('phone')} fullWidth />
          <TextField label="Address" value={form.address} onChange={set('address')} fullWidth />
          <WorkHoursEditor value={form.workHours} onChange={(wh) => setForm((f) => ({ ...f, workHours: wh }))} />
          <TextField label="Google Maps URL" value={form.googleMapsUrl} onChange={set('googleMapsUrl')} fullWidth />
          <TextField label="Notes" value={form.notes} onChange={set('notes')} fullWidth multiline rows={3} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={() => mutation.mutate()} disabled={!form.name.trim() || mutation.isPending}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Vet dialog */}
      {editVet && (
        <Dialog open onClose={() => setEditVet(null)} fullWidth maxWidth="sm">
          <DialogTitle>Edit Vet</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
            <TextField label="Name" value={editForm.name} onChange={setEdit('name')} fullWidth required autoFocus />
            <TextField label="Phone" value={editForm.phone} onChange={setEdit('phone')} fullWidth />
            <TextField label="Address" value={editForm.address} onChange={setEdit('address')} fullWidth />
            <WorkHoursEditor value={editForm.workHours} onChange={(wh) => setEditForm((f) => ({ ...f, workHours: wh }))} />
            <TextField label="Google Maps URL" value={editForm.googleMapsUrl} onChange={setEdit('googleMapsUrl')} fullWidth />
            <TextField label="Notes" value={editForm.notes} onChange={setEdit('notes')} fullWidth multiline rows={3} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setEditVet(null)} color="inherit">Cancel</Button>
            <Button variant="contained" onClick={() => editMutation.mutate()} disabled={!editForm.name.trim() || editMutation.isPending}>
              {editMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
}
