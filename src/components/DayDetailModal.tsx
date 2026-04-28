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
import type { CalendarEvent, Note, Pet, Vet } from '../types';
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
  onNoteClick?: (note: Note) => void;
  onAddNote?: () => void;
  onAddMedication?: (petId: string) => void;
}

function formatIso(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'MMM d, yyyy');
}

export function DayDetailModal({ date, events, petNames, petColors, pets, vets, onClose, onScheduled, onNoteClick, onAddNote, onAddMedication }: DayDetailModalProps) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [time, setTime] = useState('09:00');
  const [selectedVet, setSelectedVet] = useState<Vet | null>(null);
  const [activeCreate, setActiveCreate] = useState<'note' | 'vet-visit' | 'medication' | null>(null);
  const [medPetId, setMedPetId] = useState<string | null>(null);

  const vetVisits = events.filter((e): e is CalendarEvent & { kind: 'vet-visit' } => e.kind === 'vet-visit');
  const medications = events.filter((e): e is CalendarEvent & { kind: 'medication' } => e.kind === 'medication');
  const noteEvents = events.filter((e): e is CalendarEvent & { kind: 'note' } => e.kind === 'note');
  const birthdayEvents = events.filter((e): e is CalendarEvent & { kind: 'birthday' } => e.kind === 'birthday');

  const { mutate: scheduleVisit, isPending } = useMutation({
    retry: 0,
    mutationFn: () =>
      healthApi.createVetVisit(selectedPetId!, {
        type: 'scheduled',
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
    setActiveCreate(null);
    setMedPetId(null);
    onClose();
  }

  function toggleCreate(panel: 'note' | 'vet-visit' | 'medication') {
    setActiveCreate((prev) => (prev === panel ? null : panel));
  }

  return (
    <Dialog open={!!date} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
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

        {birthdayEvents.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: 1, display: 'block' }}>
              Birthdays
            </Typography>
            <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {birthdayEvents.map((e) => (
                <Box
                  key={`bd-${e.petId}`}
                  sx={{
                    p: 1.25, borderRadius: 1,
                    bgcolor: '#f59e0b15',
                    border: '1.5px solid #f59e0b55',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>🎂</Typography>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {petNames[e.petId] ?? 'Pet'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {e.age === 0 ? 'First birthday! 🎉' : `Turning ${e.age} year${e.age !== 1 ? 's' : ''} old`}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        {birthdayEvents.length > 0 && (vetVisits.length > 0 || medications.length > 0 || noteEvents.length > 0) && (
          <Divider sx={{ my: 1.25 }} />
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

        {noteEvents.length > 0 && (medications.length > 0 || vetVisits.length > 0) && (
          <Divider sx={{ my: 1.25 }} />
        )}

        {noteEvents.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: 1 }}>
              Notes
            </Typography>
            <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {noteEvents.map(({ note }) => (
                <Box
                  key={note.id}
                  onClick={() => onNoteClick?.(note)}
                  sx={{
                    p: 1.25, borderRadius: 1, border: '1px solid', borderColor: 'divider',
                    cursor: onNoteClick ? 'pointer' : 'default',
                    '&:hover': onNoteClick ? { bgcolor: 'action.hover' } : {},
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#a78bfa', flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>
                      {note.title}
                    </Typography>
                    {note.petIds.length > 0 && (
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                        {note.petIds.length} pet{note.petIds.length > 1 ? 's' : ''}
                      </Typography>
                    )}
                  </Box>
                  {note.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {note.description}
                    </Typography>
                  )}
                  {onNoteClick && (
                    <Typography variant="caption" sx={{ color: '#a78bfa', fontWeight: 600, mt: 0.5, display: 'block' }}>
                      View details →
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 1.25 }} />

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: 1, display: 'block' }}>
            Add
          </Typography>

          {/* Tab buttons */}
          <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75 }}>
            {(['note', 'vet-visit', 'medication'] as const).map((panel) => {
              const labels: Record<string, string> = { note: 'Note', 'vet-visit': 'Vet Visit', medication: 'Medication' };
              const active = activeCreate === panel;
              return (
                <Button
                  key={panel}
                  size="small"
                  onClick={() => toggleCreate(panel)}
                  sx={active
                    ? {
                        background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                        color: 'white',
                        borderRadius: '14px',
                        fontWeight: 800,
                        fontSize: '0.8125rem',
                        textTransform: 'none',
                        flex: 1,
                        '&:hover': { background: 'linear-gradient(135deg, #5b52ee, #9679f0)' },
                      }
                    : {
                        bgcolor: 'background.default',
                        color: 'text.secondary',
                        borderRadius: '14px',
                        fontWeight: 800,
                        fontSize: '0.8125rem',
                        textTransform: 'none',
                        flex: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                      }
                  }
                >
                  {labels[panel]}
                </Button>
              );
            })}
          </Box>

          {/* Note panel */}
          {activeCreate === 'note' && (
            <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 1.5, mt: 1 }}>
              <Button
                variant="contained"
                size="small"
                fullWidth
                onClick={() => { onAddNote?.(); handleClose(); }}
                sx={{
                  background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                  fontWeight: 800,
                  borderRadius: '14px',
                  textTransform: 'none',
                  '&:hover': { background: 'linear-gradient(135deg, #5b52ee, #9679f0)' },
                }}
              >
                Add note for this day
              </Button>
            </Box>
          )}

          {/* Vet Visit panel */}
          {activeCreate === 'vet-visit' && (
            <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 1.5, mt: 1 }}>
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
                        : { fontWeight: 800, bgcolor: 'background.paper', color: 'text.secondary' }
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
          )}

          {/* Medication panel */}
          {activeCreate === 'medication' && (
            <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 1.5, mt: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: medPetId ? 1 : 0 }}>
                {pets.map((pet) => {
                  const selected = medPetId === pet.id;
                  return (
                    <Chip
                      key={pet.id}
                      label={pet.name}
                      size="small"
                      onClick={() => setMedPetId(selected ? null : pet.id)}
                      sx={selected
                        ? { fontWeight: 800, bgcolor: 'primary.main', color: 'white' }
                        : { fontWeight: 800, bgcolor: 'background.paper', color: 'text.secondary' }
                      }
                    />
                  );
                })}
              </Box>

              {medPetId && (
                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  onClick={() => { onAddMedication?.(medPetId); handleClose(); }}
                  sx={{
                    background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                    fontWeight: 800,
                    borderRadius: '14px',
                    textTransform: 'none',
                    '&:hover': { background: 'linear-gradient(135deg, #5b52ee, #9679f0)' },
                  }}
                >
                  Add medication for {pets.find((p) => p.id === medPetId)?.name ?? 'pet'}
                </Button>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
