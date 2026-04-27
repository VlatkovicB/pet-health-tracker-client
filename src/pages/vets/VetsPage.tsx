// pet-health-tracker-client/src/pages/vets/VetsPage.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, Skeleton, TextField, Typography,
} from '@mui/material';
import {
  Add, DragIndicator, Map, MedicalServices,
} from '@mui/icons-material';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { vetsApi } from '../../api/vets';
import { placesApi, type PlaceSearchResult, type PlaceDetails } from '../../api/places';
import { getApiError } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { WorkHoursEditor } from '../../components/WorkHoursEditor';
import { WorkHoursDisplay } from '../../components/WorkHoursDisplay';
import { PlacesSyncDialog } from '../../components/PlacesSyncDialog';
import type { Vet, VetWorkHours } from '../../types';

type SortMode = 'alpha' | 'rating' | 'custom';
type SearchState = 'idle' | 'searching' | 'done';

const SORT_LABELS: Record<SortMode, string> = { alpha: 'A–Z', rating: 'Rating', custom: 'Custom' };

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

// ─── Sortable card ─────────────────────────────────────────────────────────────

interface SortableVetCardProps {
  vet: Vet;
  isExpanded: boolean;
  isDragEnabled: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onSync: () => void;
}

function SortableVetCard({ vet, isExpanded, isDragEnabled, onToggleExpand, onEdit, onSync }: SortableVetCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: vet.id });

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      sx={{
        bgcolor: 'background.paper', borderRadius: 2,
        boxShadow: (t) => t.palette.mode === 'dark'
          ? '0 2px 12px rgba(0,0,0,0.25)'
          : '0 2px 12px rgba(108,99,255,0.08)',
        mb: 1.5, overflow: 'hidden',
        zIndex: isDragging ? 1 : 'auto',
        position: 'relative',
      }}
    >
      {/* Card header */}
      <Box
        sx={{ p: 2, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 1 }}
        onClick={onToggleExpand}
      >
        {isDragEnabled && (
          <Box
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            sx={{
              color: 'text.disabled', cursor: 'grab', mt: 0.375, flexShrink: 0,
              touchAction: 'none',
              '&:active': { cursor: 'grabbing' },
            }}
          >
            <DragIndicator sx={{ fontSize: 20 }} />
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: 'text.primary' }}>{vet.name}</Typography>
          {vet.phone && (
            <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary', mt: 0.375 }}>
              {vet.phone}
            </Typography>
          )}
          {vet.rating != null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.625 }}>
              <Typography sx={{ color: '#fbbf24', fontSize: '0.875rem' }}>
                {'★'.repeat(Math.round(vet.rating))}
              </Typography>
              <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>
                {vet.rating.toFixed(1)}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Expanded: work hours */}
      {isExpanded && vet.workHours && vet.workHours.length > 0 && (
        <Box sx={{ px: 2, pb: 1.5, borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.625rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: 0.875 }}>
            Working Hours
          </Typography>
          <WorkHoursDisplay hours={vet.workHours} />
        </Box>
      )}

      {/* Expanded actions */}
      {isExpanded && (
        <Box sx={{ px: 2, pb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Box
            onClick={onEdit}
            sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? '#3d3580' : '#ede9fe', color: 'primary.main', fontSize: '0.8125rem', fontWeight: 800, px: 1.5, py: 0.625, borderRadius: 1.5, cursor: 'pointer' }}
          >
            Edit
          </Box>
          {vet.googleMapsUrl && (
            <Box
              component="a" href={vet.googleMapsUrl} target="_blank" rel="noreferrer"
              sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? '#3d3580' : '#ede9fe', color: 'primary.main', fontSize: '0.8125rem', fontWeight: 800, px: 1.5, py: 0.625, borderRadius: 1.5, textDecoration: 'none' }}
            >
              🗺 Maps
            </Box>
          )}
          {vet.placeId && (
            <Box
              onClick={onSync}
              sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? '#3d3580' : '#ede9fe', color: 'primary.main', fontSize: '0.8125rem', fontWeight: 800, px: 1.5, py: 0.625, borderRadius: 1.5, cursor: 'pointer' }}
            >
              Sync
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

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

  // Sync vet state
  const [syncVet, setSyncVet] = useState<Vet | null>(null);

  // Search filter state
  const [search, setSearch] = useState('');

  // Sort state — persisted to localStorage
  const [sortMode, setSortMode] = useState<SortMode>(() =>
    (localStorage.getItem('vet-sort-mode') as SortMode | null) ?? 'alpha',
  );
  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('vet-custom-order') ?? '[]') as string[]; }
    catch { return []; }
  });

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
        placeId: editVet.placeId ?? '',
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
        workHours: details.workHours ?? f.workHours,
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

  // ── Sort + filter ──────────────────────────────────────────────────────────
  const sortedVets = useMemo(() => {
    const filtered = vets.filter((v) => v.name.toLowerCase().includes(search.toLowerCase()));
    if (sortMode === 'alpha') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortMode === 'rating') {
      return [...filtered].sort((a, b) => {
        if (a.rating == null && b.rating == null) return 0;
        if (a.rating == null) return 1;
        if (b.rating == null) return -1;
        return b.rating - a.rating;
      });
    }
    // custom
    return [...filtered].sort((a, b) => {
      const ai = customOrder.indexOf(a.id);
      const bi = customOrder.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [vets, search, sortMode, customOrder]);

  const changeSortMode = (mode: SortMode) => {
    if (mode === 'custom' && customOrder.length === 0) {
      // Seed order from current alpha list
      const order = [...vets].sort((a, b) => a.name.localeCompare(b.name)).map((v) => v.id);
      setCustomOrder(order);
      localStorage.setItem('vet-custom-order', JSON.stringify(order));
    }
    setSortMode(mode);
    localStorage.setItem('vet-sort-mode', mode);
  };

  // ── DnD ──────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (sortMode !== 'custom') return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCustomOrder((prev) => {
      const activeId = String(active.id);
      const overId = String(over.id);
      const oldIndex = prev.indexOf(activeId);
      const newIndex = prev.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      localStorage.setItem('vet-custom-order', JSON.stringify(next));
      return next;
    });
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
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
      placeId: editForm.placeId || undefined,
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

  const isDragEnabled = sortMode === 'custom';

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', px: { xs: 2, md: 3 }, pt: 2.5, pb: 4 }}>
      {/* Page header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: 'text.primary', letterSpacing: '-0.8px' }}>Vets</Typography>
          <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary', mt: 0.25 }}>Your trusted veterinarians</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} size="small">Add Vet</Button>
      </Box>

      {/* Search + sort controls */}
      <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <TextField
          placeholder="Search vets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
          sx={{ maxWidth: { md: 320 } }}
        />
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '1.5px', textTransform: 'uppercase', mr: 0.25 }}>
            Sort
          </Typography>
          {(['alpha', 'rating', 'custom'] as SortMode[]).map((mode) => (
            <Box
              key={mode}
              onClick={() => changeSortMode(mode)}
              sx={{
                px: 1.5, py: 0.375, borderRadius: '20px', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 800, transition: 'all 0.15s',
                bgcolor: sortMode === mode
                  ? 'primary.main'
                  : (t) => t.palette.mode === 'dark' ? '#3d3580' : '#ede9fe',
                color: sortMode === mode ? 'primary.contrastText' : 'primary.main',
              }}
            >
              {SORT_LABELS[mode]}
            </Box>
          ))}
        </Box>
      </Box>

      {listError && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="error">{getApiError(listErrorObj)}</Alert>
        </Box>
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedVets.map((v) => v.id)} strategy={verticalListSortingStrategy}>
            {sortedVets.map((vet) => (
              <SortableVetCard
                key={vet.id}
                vet={vet}
                isExpanded={expandedVetId === vet.id}
                isDragEnabled={isDragEnabled}
                onToggleExpand={() => toggleExpand(vet.id)}
                onEdit={() => setEditVet(vet)}
                onSync={() => setSyncVet(vet)}
              />
            ))}
          </SortableContext>
        </DndContext>
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

      {syncVet && (
        <PlacesSyncDialog
          vet={syncVet}
          open={Boolean(syncVet)}
          onClose={() => setSyncVet(null)}
          onSynced={() => {
            queryClient.invalidateQueries({ queryKey: ['vets'] });
            queryClient.invalidateQueries({ queryKey: ['vets-all'] });
            setSyncVet(null);
          }}
        />
      )}
    </Box>
  );
}
