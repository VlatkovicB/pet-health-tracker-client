import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { petsApi } from '../api/pets';
import { useCreateNote, useUpdateNote } from '../api/notes';
import { useNotification } from '../context/NotificationContext';
import { getApiError } from '../api/client';
import type { Note } from '../types';

interface NoteFormDialogProps {
  open: boolean;
  onClose: () => void;
  note?: Note;           // if provided → edit mode; absent → create mode
  defaultPetId?: string; // pre-select this pet when opening from pet detail page
  defaultDate?: string;  // pre-fill noteDate (YYYY-MM-DD) when opening from calendar
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const GRADIENT = 'linear-gradient(135deg, #6c63ff, #a78bfa)';

const sectionLabelSx = {
  fontWeight: 800,
  fontSize: '0.6875rem',
  color: 'text.disabled',
  letterSpacing: '2.5px',
  textTransform: 'uppercase' as const,
  mb: -0.5,
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    fontFamily: 'Nunito, sans-serif',
    fontWeight: 600,
    fontSize: '0.8125rem',
    '& fieldset': { borderWidth: '1.5px' },
  },
  '& .MuiInputLabel-root': {
    fontFamily: 'Nunito, sans-serif',
    fontWeight: 600,
    fontSize: '0.8125rem',
  },
};

export function NoteFormDialog({ open, onClose, note, defaultPetId, defaultDate }: NoteFormDialogProps) {
  const { showSuccess, showError } = useNotification();
  const isEditMode = !!note;

  // ── form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [noteDate, setNoteDate] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ title?: string; noteDate?: string }>({});

  // populate form on open / note change
  useEffect(() => {
    if (open) {
      if (note) {
        setTitle(note.title);
        setNoteDate(note.noteDate.slice(0, 10));
        setDescription(note.description ?? '');
        setSelectedPetIds(note.petIds ?? []);
      } else {
        setTitle('');
        setNoteDate(defaultDate ?? todayIso());
        setDescription('');
        setSelectedPetIds(defaultPetId ? [defaultPetId] : []);
      }
      setErrors({});
    }
  }, [open, note, defaultDate, defaultPetId]);

  // ── pets query ──────────────────────────────────────────────────────────────
  const { data: petsPage } = useQuery({
    queryKey: ['pets-note-form'],
    queryFn: () => petsApi.list({ pageParam: 1 }),
    enabled: open,
  });
  const pets = petsPage?.items ?? [];

  // ── mutations ───────────────────────────────────────────────────────────────
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const isPending = createNote.isPending || updateNote.isPending;

  // ── handlers ────────────────────────────────────────────────────────────────
  const togglePet = (petId: string) => {
    setSelectedPetIds((prev) =>
      prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId],
    );
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Title is required';
    if (!noteDate) next.noteDate = 'Date is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload = {
      title: title.trim(),
      noteDate,
      description: description.trim() || undefined,
      petIds: selectedPetIds.length ? selectedPetIds : undefined,
    };

    if (isEditMode) {
      updateNote.mutate(
        { noteId: note!.id, data: payload },
        {
          onSuccess: () => {
            showSuccess('Note updated');
            onClose();
          },
          onError: (err) => showError(getApiError(err)),
        },
      );
    } else {
      createNote.mutate(payload, {
        onSuccess: () => {
          showSuccess('Note created');
          onClose();
        },
        onError: (err) => showError(getApiError(err)),
      });
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '22px',
            fontFamily: 'Nunito, sans-serif',
            bgcolor: 'background.paper',
          },
        },
      }}
    >
      {/* ── title bar ── */}
      <DialogTitle
        sx={{
          pb: 4,
          pt: 2.5,
          px: 3,
          background: GRADIENT,
          color: '#fff',
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 800,
          fontSize: '1.05rem',
          borderRadius: '22px 22px 24px 24px',
        }}
      >
        {isEditMode ? 'Edit Note' : 'New Note'}
      </DialogTitle>

      <DialogContent sx={{ pt: 0, px: 3, pb: 1, mt: -2.5, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* ── details section label ── */}
          <Typography sx={sectionLabelSx}>Details</Typography>

          {/* title */}
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            error={!!errors.title}
            helperText={errors.title}
            sx={inputSx}
          />

          {/* date */}
          <TextField
            label="Date"
            type="date"
            value={noteDate}
            onChange={(e) => setNoteDate(e.target.value)}
            fullWidth
            required
            error={!!errors.noteDate}
            helperText={errors.noteDate}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={inputSx}
          />

          {/* description */}
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={inputSx}
          />

          {/* ── pets section ── */}
          {pets.length > 0 && !defaultPetId && (
            <>
              <Typography sx={{ ...sectionLabelSx, mt: 0.5 }}>Tag pets</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {pets.map((pet) => {
                  const selected = selectedPetIds.includes(pet.id);
                  return (
                    <Chip
                      key={pet.id}
                      label={pet.name}
                      onClick={() => togglePet(pet.id)}
                      sx={{
                        fontFamily: 'Nunito, sans-serif',
                        fontWeight: 800,
                        fontSize: '0.5625rem',
                        letterSpacing: '0.5px',
                        borderRadius: '999px',
                        px: 0.5,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        ...(selected
                          ? {
                              background: GRADIENT,
                              color: '#fff',
                              border: 'none',
                            }
                          : {
                              bgcolor: 'transparent',
                              color: 'text.secondary',
                              border: '1.5px solid',
                              borderColor: 'divider',
                            }),
                      }}
                    />
                  );
                })}
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        <Button
          onClick={onClose}
          color="inherit"
          sx={{
            borderRadius: '14px',
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 800,
            fontSize: '0.8125rem',
            textTransform: 'none',
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isPending}
          sx={{
            borderRadius: '14px',
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 800,
            fontSize: '0.8125rem',
            textTransform: 'none',
            background: GRADIENT,
            boxShadow: 'none',
            '&:hover': { background: GRADIENT, opacity: 0.9, boxShadow: 'none' },
            '&.Mui-disabled': { opacity: 0.5, color: '#fff' },
          }}
        >
          {isPending ? (isEditMode ? 'Saving…' : 'Creating…') : isEditMode ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
