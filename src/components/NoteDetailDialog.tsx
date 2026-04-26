import { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { Note, Pet } from '../types';
import { petsApi } from '../api/pets';
import { useDeleteNote, useAddNoteImage } from '../api/notes';
import { useNotification } from '../context/NotificationContext';
import { getApiError } from '../api/client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? '';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrls, setImageUrls] = useState(note.imageUrls);

  useEffect(() => { setImageUrls(note.imageUrls); }, [note.imageUrls]);

  const petsQuery = useQuery({
    queryKey: ['pets-calendar'],
    queryFn: () => petsApi.list({ pageParam: 1 }),
    enabled: note.petIds.length > 0,
  });
  const allPets: Pet[] = petsQuery.data?.items ?? [];
  const taggedPets = allPets.filter((p) => note.petIds.includes(p.id));

  const deleteMutation = useDeleteNote();
  const addImageMutation = useAddNoteImage();

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    addImageMutation.mutate(
      { noteId: note.id, file },
      {
        onSuccess: (updatedNote) => {
          setImageUrls(updatedNote.imageUrls);
          showSuccess('Image added');
        },
        onError: (err) => showError(getApiError(err)),
      },
    );
    e.target.value = '';
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

        {/* ── Images ── */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={SECTION_LABEL_SX}>Images</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileChange}
              />
              <Button
                size="small"
                variant="outlined"
                disabled={addImageMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
                startIcon={
                  addImageMutation.isPending ? <CircularProgress size={12} color="inherit" /> : undefined
                }
                sx={{ borderRadius: '14px', fontWeight: 800, fontSize: '0.6875rem', py: 0.25 }}
              >
                {addImageMutation.isPending ? 'Uploading…' : 'Add image'}
              </Button>
            </Box>
          </Box>

          {imageUrls.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                gap: 1.25,
                overflowX: 'auto',
                pb: 0.5,
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {imageUrls.map((url, i) => {
                const fullUrl = url.startsWith('http') ? url : `${SERVER_URL}${url}`;
                return (
                  <Box
                    key={i}
                    component="a"
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      flexShrink: 0,
                      width: 100,
                      height: 100,
                      borderRadius: '16px',
                      overflow: 'hidden',
                      display: 'block',
                      border: '1.5px solid',
                      borderColor: 'divider',
                      '&:hover': { opacity: 0.85 },
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    <Box
                      component="img"
                      src={fullUrl}
                      alt={`Note image ${i + 1}`}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </Box>
                );
              })}
            </Box>
          )}

          {imageUrls.length === 0 && (
            <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
              No images yet
            </Typography>
          )}
        </Box>

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
