import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Typography,
} from '@mui/material';
import { placesApi, type PlaceSearchResult } from '../api/places';
import { vetsApi } from '../api/vets';
import { getApiError } from '../api/client';
import type { Vet } from '../types';

interface PlacesSyncDialogProps {
  vet: Vet;
  open: boolean;
  onClose: () => void;
  onSynced: () => void;
}

export function PlacesSyncDialog({ vet, open, onClose, onSynced }: PlacesSyncDialogProps) {
  const isLinked = Boolean(vet.placeId);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state (manual vet only)
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);

  const doRefresh = async (placeId?: string) => {
    const id = placeId ?? vet.placeId!;
    setLoading(true);
    setError(null);
    try {
      const details = await placesApi.details(id);
      await vetsApi.update(vet.id, {
        name: details.name || vet.name,
        address: details.address || vet.address,
        phone: details.phone || vet.phone,
        googleMapsUrl: details.googleMapsUrl || vet.googleMapsUrl,
        rating: details.rating ?? vet.rating,
        placeId: id,
        workHours: vet.workHours,
        notes: vet.notes,
      });
      onSynced();
      onClose();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh for linked vets — defined after doRefresh to avoid hoisting issue
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (isLinked) {
      doRefresh();
    }
  }, [open]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await placesApi.search(query.trim());
      setResults(res);
    } catch {
      setError('Search failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (placeId: string) => {
    doRefresh(placeId);
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isLinked ? 'Refresh from Google Places' : 'Find on Google Places'}
      </DialogTitle>
      <DialogContent>
        {isLinked ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3, gap: 2 }}>
            {loading && <CircularProgress size={32} />}
            {loading && <Typography variant="body2" color="text.secondary">Refreshing…</Typography>}
            {error && (
              <>
                <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
                <Button variant="outlined" onClick={() => doRefresh()} disabled={loading}>
                  Retry
                </Button>
              </>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by clinic name or address"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                disabled={loading}
              />
              <Button variant="contained" onClick={handleSearch} disabled={loading || !query.trim()}>
                Search
              </Button>
            </Box>
            {loading && <CircularProgress size={20} sx={{ alignSelf: 'center' }} />}
            {error && <Alert severity="error">{error}</Alert>}
            {results.map((r) => (
              <Box
                key={r.placeId}
                onClick={() => handlePick(r.placeId)}
                sx={{ px: 1.5, py: 1, borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                <Typography variant="caption" color="text.secondary">{r.address}</Typography>
              </Box>
            ))}
            {results.length === 0 && !loading && query && (
              <Typography variant="caption" color="text.secondary">No results found</Typography>
            )}
          </Box>
        )}
      </DialogContent>
      {!isLinked && (
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
