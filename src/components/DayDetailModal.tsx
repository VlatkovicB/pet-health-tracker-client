import { useState } from 'react';
import {
  Autocomplete,
  Box, Button, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent,
  Divider, IconButton, TextField, Typography,
} from '@mui/material';
import { Close, NotificationsNone } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useMutation } from '@tanstack/react-query';
import type { CalendarEvent, Pet, Vet } from '../types';
import { healthApi } from '../api/health';
import { useNotification } from '../context/NotificationContext';

interface DayDetailModalProps {
  date: Date | null;
  events: CalendarEvent[];
  petNames: Record<string, string>;
  petColors: Record<string, string>;
  pets: Pet[];
  vets: Vet[];
  onClose: () => void;
  onScheduled: () => void;
}

function formatIso(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'MMM d, yyyy');
}

export function DayDetailModal({ date, events, petNames, petColors, pets, vets, onClose, onScheduled }: DayDetailModalProps) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [time, setTime] = useState('09:00');
  const [selectedVet, setSelectedVet] = useState<Vet | null>(null);

  const vetVisits = events.filter((e): e is CalendarEvent & { kind: 'vet-visit' } => e.kind === 'vet-visit');
  const medications = events.filter((e): e is CalendarEvent & { kind: 'medication' } => e.kind === 'medication');

  const { mutate: scheduleVisit, isPending } = useMutation({
    retry: 0,
    mutationFn: () =>
      healthApi.createVetVisit(selectedPetId!, {
        visitDate: `${format(date!, 'yyyy-MM-dd')}T${time}:00`,
        vetId: selectedVet?.id,
        reason: reason.trim(),
      }),
    onSuccess: () => {
      showSuccess('Vet visit scheduled');
      setSelectedPetId(null);
      setReason('');
      setTime('09:00');
      setSelectedVet(null);
      onScheduled();
    },
    onError: () => {
      showError('Failed to schedule visit');
    },
  });

  function handleClose() {
    setSelectedPetId(null);
    setReason('');
    setTime('09:00');
    setSelectedVet(null);
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
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: 1 }}>
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
                    {v.type === 'scheduled' ? (
                      <Chip
                        label="Scheduled"
                        size="small"
                        sx={{
                          fontWeight: 800, borderRadius: 5, fontSize: '0.6875rem',
                          bgcolor: (t) => t.palette.mode === 'dark' ? '#3d3580' : '#ede9fe',
                          color: 'primary.main',
                          border: '1px solid',
                          borderColor: (t) => t.palette.mode === 'dark' ? '#5a5478' : '#d4d0f8',
                        }}
                      />
                    ) : (
                      <Chip
                        label="Logged"
                        size="small"
                        sx={{
                          fontWeight: 800, borderRadius: 5, fontSize: '0.6875rem',
                          bgcolor: '#34d39922', color: '#059669',
                        }}
                      />
                    )}
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
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: 1 }}>
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
              <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: 1 }}>
                Schedule vet visit
              </Typography>

              <Box sx={{ mt: 0.75 }}>
                {/* Pet chips */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                  {pets.map((pet) => {
                    const selected = selectedPetId === pet.id;
                    return (
                      <Chip
                        key={pet.id}
                        label={pet.name}
                        size="small"
                        onClick={() => setSelectedPetId(selected ? null : pet.id)}
                        sx={selected
                          ? { fontWeight: 800, bgcolor: 'primary.main', color: 'white' }
                          : { fontWeight: 800, bgcolor: 'background.default', color: 'text.secondary' }
                        }
                      />
                    );
                  })}
                </Box>

                {/* Date + Time */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                    {date ? format(date, 'EEE, MMM d, yyyy') : ''}
                  </Typography>
                  <input
                    type="time"
                    aria-label="Visit time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={{
                      border: '1px solid #ccc',
                      borderRadius: 4,
                      padding: '3px 6px',
                      fontSize: 12,
                      background: 'transparent',
                      color: 'inherit',
                      fontFamily: 'inherit',
                    }}
                  />
                </Box>

                {/* Vet (optional) */}
                <Autocomplete<Vet>
                  options={vets}
                  value={selectedVet}
                  onChange={(_e, v) => setSelectedVet(v)}
                  getOptionLabel={(v) => v.name}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  renderOption={(props, v) => (
                    <Box component="li" {...props} key={v.id}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{v.name}</Typography>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Search vets… (optional)"
                      sx={{ mb: 1 }}
                    />
                  )}
                  size="small"
                  fullWidth
                  clearOnEscape
                  noOptionsText="No vets found"
                />

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
                  disabled={!selectedPetId || !reason.trim() || !time || isPending}
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
