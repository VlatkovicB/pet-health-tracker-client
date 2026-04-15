import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, Chip,
  IconButton, Divider, TextField, Button, CircularProgress,
} from '@mui/material';
import { Close, NotificationsNone } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useMutation } from '@tanstack/react-query';
import type { CalendarEvent, Pet } from '../types';
import { healthApi } from '../api/health';
import { useNotification } from '../context/NotificationContext';

interface DayDetailModalProps {
  date: Date | null;
  events: CalendarEvent[];
  petNames: Record<string, string>;
  petColors: Record<string, string>;
  pets: Pet[];
  onClose: () => void;
  onScheduled: () => void;
}

function formatIso(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'MMM d, yyyy');
}

export function DayDetailModal({ date, events, petNames, petColors, pets, onClose, onScheduled }: DayDetailModalProps) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const vetVisits = events.filter((e): e is CalendarEvent & { kind: 'vet-visit' } => e.kind === 'vet-visit');
  const medications = events.filter((e): e is CalendarEvent & { kind: 'medication' } => e.kind === 'medication');

  const { mutate: scheduleVisit, isPending } = useMutation({
    retry: 0,
    mutationFn: () =>
      healthApi.createVetVisit(selectedPetId!, {
        visitDate: format(date!, 'yyyy-MM-dd'),
        reason: reason.trim() || '',
      }),
    onSuccess: () => {
      showSuccess('Vet visit scheduled');
      setSelectedPetId(null);
      setReason('');
      onScheduled();
    },
    onError: () => {
      showError('Failed to schedule visit');
    },
  });

  function handleClose() {
    setSelectedPetId(null);
    setReason('');
    onClose();
  }

  return (
    <Dialog open={!!date} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
          {date ? format(date, 'EEEE, MMMM d') : ''}
        </Typography>
        <IconButton size="small" onClick={handleClose} edge="end">
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {events.length === 0 && (
          <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: 'center' }}>
            No events this day
          </Typography>
        )}

        {vetVisits.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Vet Visits
            </Typography>
            <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {vetVisits.map((v) => (
                <Box
                  key={v.id}
                  onClick={() => { navigate(`/pets/${v.petId}?tab=vet-visits&visitId=${v.id}`); handleClose(); }}
                  sx={{
                    p: 1.25, borderRadius: 1, border: '1px solid', borderColor: 'divider',
                    cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>
                      {petNames[v.petId] ?? 'Pet'}
                    </Typography>
                    <Chip
                      label={v.type === 'scheduled' ? 'Scheduled' : 'Past'}
                      size="small"
                      sx={{
                        bgcolor: v.type === 'scheduled' ? '#457b9d' : '#9e9e9e',
                        color: '#fff', height: 18, fontSize: '0.62rem',
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  </Box>
                  {v.reason && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{v.reason}</Typography>
                  )}
                  {v.vetName && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {v.vetName}{v.clinic ? ` · ${v.clinic}` : ''}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, mt: 0.5, display: 'block' }}>
                    View details →
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {vetVisits.length > 0 && medications.length > 0 && <Divider sx={{ my: 1.25 }} />}

        {medications.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Medications
            </Typography>
            <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {medications.map((m) => (
                <Box
                  key={m.id}
                  onClick={() => { navigate(`/pets/${m.petId}?tab=medications`); handleClose(); }}
                  sx={{
                    p: 1.25, borderRadius: 1, border: '1px solid', borderColor: 'divider',
                    cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: petColors[m.petId] ?? 'primary.main', flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>{m.name}</Typography>
                    {m.hasReminder && <NotificationsNone sx={{ fontSize: 16, color: 'text.secondary' }} />}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {petNames[m.petId] ?? 'Pet'} · {m.dosageLabel} · {m.frequencyLabel}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    {formatIso(m.startDate)}{m.endDate ? ` → ${formatIso(m.endDate)}` : ' (ongoing)'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, mt: 0.5, display: 'block' }}>
                    View details →
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {pets.length > 0 && (
          <>
            <Divider sx={{ my: 1.25 }} />

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Schedule vet visit
              </Typography>

              <Box sx={{ mt: 0.75 }}>
                {/* Pet chips */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                  {pets.map((pet) => {
                    const selected = selectedPetId === pet.id;
                    const color = petColors[pet.id] ?? '#888';
                    return (
                      <Chip
                        key={pet.id}
                        label={pet.name}
                        size="small"
                        onClick={() => setSelectedPetId(selected ? null : pet.id)}
                        sx={{
                          bgcolor: selected ? color : 'transparent',
                          color: selected ? '#fff' : color,
                          border: `1px solid ${color}`,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          height: 22,
                          '& .MuiChip-label': { px: 0.75 },
                          '&:hover': { bgcolor: selected ? color : `${color}22` },
                        }}
                      />
                    );
                  })}
                </Box>

                {/* Date (read-only) */}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {date ? format(date, 'EEEE, MMMM d, yyyy') : ''}
                </Typography>

                {/* Reason */}
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Reason"
                  required
                  helperText="Required"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  sx={{ mb: 1 }}
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />

                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  disabled={!selectedPetId || !reason.trim() || isPending}
                  onClick={() => scheduleVisit()}
                  startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : null}
                >
                  {isPending ? 'Saving…' : 'Schedule visit'}
                </Button>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
