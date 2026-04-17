import { useState } from 'react';
import {
  Box, Button, Container, TextField, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions, Card, CardContent, Grid, Chip, Link, Skeleton, Alert,
} from '@mui/material';
import { Add, Phone, LocationOn, AccessTime, Map, MedicalServices, Star } from '@mui/icons-material';
import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { vetsApi } from '../../api/vets';
import { placesApi, type PlaceSearchResult, type PlaceDetails } from '../../api/places';
import { getApiError } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

type SearchState = 'idle' | 'searching' | 'done';

const emptyForm = { name: '', address: '', phone: '', workHours: '', googleMapsUrl: '', notes: '', rating: '' };

export function VetsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

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
        workHours: details.workHours || f.workHours,
        googleMapsUrl: details.googleMapsUrl || f.googleMapsUrl,
        rating: details.rating !== undefined ? String(details.rating) : f.rating,
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
      workHours: form.workHours || undefined,
      googleMapsUrl: form.googleMapsUrl || undefined,
      rating: form.rating ? Number(form.rating) : undefined,
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
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : vets.length === 0 ? (
        <Card elevation={1}>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <MedicalServices sx={{ fontSize: 32, color: 'primary.main', mb: 1, opacity: 0.5 }} />
            <Typography variant="subtitle2" color="text.secondary">
              No vets added yet
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              Add a vet to link them to visits and get reminders
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {vets.map((vet) => (
            <Grid size={{ xs: 12 }} key={vet.id}>
              <Card elevation={1}>
                <CardContent sx={{ pb: '16px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: vet.phone || vet.rating || vet.workHours || vet.address || vet.googleMapsUrl ? 1.5 : 0 }}>
                    <Box
                      sx={{
                        width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                        bgcolor: 'rgba(42,157,143,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <MedicalServices sx={{ color: 'primary.main', fontSize: 20 }} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{vet.name}</Typography>
                      {vet.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{vet.notes}</Typography>
                      )}
                    </Box>
                  </Box>
                  {(vet.phone || vet.rating || vet.workHours || vet.address || vet.googleMapsUrl) && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {vet.phone && (
                        <Chip icon={<Phone sx={{ fontSize: '14px !important' }} />} label={vet.phone} size="small" variant="outlined" />
                      )}
                      {vet.rating && (
                        <Chip
                          icon={<Star sx={{ fontSize: '14px !important', color: 'warning.main !important' }} />}
                          label={vet.rating.toFixed(1)}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {vet.workHours && (
                        <Chip icon={<AccessTime sx={{ fontSize: '14px !important' }} />} label={vet.workHours} size="small" variant="outlined" />
                      )}
                      {vet.address && (
                        <Chip icon={<LocationOn sx={{ fontSize: '14px !important' }} />} label={vet.address} size="small" variant="outlined" />
                      )}
                      {vet.googleMapsUrl && (
                        <Chip
                          icon={<Map sx={{ fontSize: '14px !important' }} />}
                          label={<Link href={vet.googleMapsUrl} target="_blank" rel="noopener" underline="none" color="primary">Maps</Link>}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      )}
                    </Box>
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
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
        </Box>
      )}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Add Vet</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>

          {/* Search banner / panel */}
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
                  size="small"
                  fullWidth
                  placeholder="Search for a clinic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  autoFocus
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSearch}
                  disabled={isSearchLoading || !searchQuery.trim()}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {isSearchLoading ? '...' : 'Search'}
                </Button>
              </Box>

              {searchError && (
                <Typography variant="caption" color="error">{searchError}</Typography>
              )}

              {searchResults.length === 0 && !isSearchLoading && !searchError && searchQuery && (
                <Typography variant="caption" color="text.secondary">No results found</Typography>
              )}

              {searchResults.map((r) => (
                <Box
                  key={r.placeId}
                  onClick={() => handlePickPlace(r.placeId)}
                  sx={{
                    px: 1.5, py: 1, borderRadius: 1, cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{r.address}</Typography>
                </Box>
              ))}

              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ cursor: 'pointer', '&:hover': { color: 'text.primary' } }}
                  onClick={resetSearch}
                >
                  ✕ cancel search
                </Typography>
              </Box>
            </Box>
          )}

          {searchState === 'done' && (
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 2, py: 1, borderRadius: 2,
                bgcolor: 'success.main', color: 'success.contrastText',
                opacity: 0.85,
              }}
            >
              <Typography variant="caption">✓ Filled from Google Maps — edit freely</Typography>
            </Box>
          )}

          {/* Manual form fields */}
          <TextField label="Name" value={form.name} onChange={set('name')} fullWidth required autoFocus={searchState === 'idle'} />
          <TextField label="Phone" value={form.phone} onChange={set('phone')} fullWidth />
          <TextField label="Address" value={form.address} onChange={set('address')} fullWidth />
          <TextField label="Work Hours" placeholder="e.g. Mon–Fri 8:00–18:00" value={form.workHours} onChange={set('workHours')} fullWidth multiline rows={2} />
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
    </Container>
  );
}
