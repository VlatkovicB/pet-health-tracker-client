import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { Note, Pet } from '../types';
import { petsApi } from '../api/pets';
import { useDeleteNote } from '../api/notes';
import { useNotification } from '../context/NotificationContext';
import { getApiError } from '../api/client';

const SECTION_LABEL_SX = {
  fontWeight: 800,
  fontSize: '0.6875rem',
  color: 'text.disabled',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
};

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'MMMM d, yyyy');
}

interface NoteDetailDialogProps {
  open: boolean;
  onClose: () => void;
  note: Note;
  onEdit: (note: Note) => void;
}

export function NoteDetailDialog({ open, onClose, note, onEdit }: NoteDetailDialogProps) {
  const { showError, showSuccess } = useNotification();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const petsQuery = useQuery({
    queryKey: ['pets-calendar'],
    queryFn: () => petsApi.list({ pageParam: 1 }),
    enabled: note.petIds.length > 0,
  });
  const allPets: Pet[] = petsQuery.data?.items ?? [];
  const taggedPets = allPets.filter((p) => note.petIds.includes(p.id));

  const deleteMutation = useDeleteNote();

  function handleDelete() {
    deleteMutation.mutate(note.id, {
      onSuccess: () => {
        showSuccess('Note deleted');
        setConfirmDelete(false);
        onClose();
      },
      onError: (err) => showError(getApiError(err)),
    });
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {/* ── Header ── */}
      <DialogTitle
        component="div"
        sx={{
          pb: 0.5,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25, wordBreak: 'break-word' }}>
            {note.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {fmtDate(note.noteDate)}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} edge="end" sx={{ mt: -0.5, flexShrink: 0 }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
        {/* ── Pet tags ── */}
        {taggedPets.length > 0 && (
          <Box>
            <Typography sx={{ ...SECTION_LABEL_SX, mb: 1 }}>Pets</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {taggedPets.map((pet) => (
                <Chip
                  key={pet.id}
                  label={pet.name}
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.5625rem',
                    borderRadius: '999px',
                    height: 22,
                    '& .MuiChip-label': { px: 1.25 },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* ── Description ── */}
        {note.description && (
          <Box>
            <Typography sx={{ ...SECTION_LABEL_SX, mb: 1 }}>Description</Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {note.description}
            </Typography>
          </Box>
        )}

        {/* ── Delete confirmation (inline) ── */}
        {confirmDelete && (
          <Box
            sx={{
              p: 2,
              borderRadius: '16px',
              border: '1.5px solid',
              borderColor: '#fb718544',
              bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(251,113,133,0.08)' : 'rgba(251,113,133,0.04)',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5, color: '#fb7185' }}>
              Delete this note? This cannot be undone.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                disabled={deleteMutation.isPending}
                onClick={handleDelete}
                sx={{
                  background: '#fb7185',
                  '&:hover': { background: '#f43f5e' },
                  borderRadius: '14px',
                  fontWeight: 800,
                }}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Yes, delete'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteMutation.isPending}
                sx={{ borderRadius: '14px', fontWeight: 800 }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* ── Actions ── */}
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        {!confirmDelete && (
          <Button
            size="small"
            onClick={() => setConfirmDelete(true)}
            sx={{
              color: '#fb7185',
              borderRadius: '14px',
              fontWeight: 800,
              mr: 'auto',
              '&:hover': { bgcolor: 'rgba(251,113,133,0.08)' },
            }}
          >
            Delete
          </Button>
        )}
        <Button
          onClick={onClose}
          color="inherit"
          sx={{ borderRadius: '14px', fontWeight: 800 }}
        >
          Close
        </Button>
        <Button
          variant="contained"
          onClick={() => onEdit(note)}
          sx={{ borderRadius: '14px', fontWeight: 800 }}
        >
          Edit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
