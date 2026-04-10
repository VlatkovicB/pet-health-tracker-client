import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Button, Container, Tab, Tabs, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, List, ListItemButton,
  Divider, Skeleton, Checkbox, FormControlLabel, IconButton, Avatar, Chip, Tooltip,
  CircularProgress,
} from '@mui/material';
import { Add, AddAPhoto, Edit, Pets, Close } from '@mui/icons-material';
import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { healthApi } from '../../api/health';
import { vetsApi } from '../../api/vets';
import { petsApi } from '../../api/pets';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import type { Pet, VetVisit } from '../../types';

type TabValue = 'vet-visits' | 'medications';

const toIso = (v: string) => (v ? new Date(v + ':00').toISOString() : '');
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString();
const todayNoon = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.toISOString().slice(0, 16); };
const weekFromNow = () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(12, 0, 0, 0); return d.toISOString().slice(0, 16); };
const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000';

function calcAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 1) return '< 1 month';
  if (months < 24) return `${months} month${months !== 1 ? 's' : ''}`;
  const y = Math.floor(months / 12);
  return `${y} year${y !== 1 ? 's' : ''}`;
}

export function PetDetailPage() {
  const { petId, groupId } = useParams<{ petId: string; groupId: string }>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabValue>('vet-visits');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailVisit, setDetailVisit] = useState<VetVisit | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Pet info
  const { data: pet } = useQuery({
    queryKey: ['pet', groupId, petId],
    queryFn: () => petsApi.get(groupId!, petId!),
    enabled: !!groupId && !!petId,
  });

  // Vets for dropdown
  const { data: vets = [] } = useQuery({
    queryKey: ['vets-all', groupId],
    queryFn: () => vetsApi.listAll(groupId!),
    enabled: !!groupId,
  });

  // Vet visits
  const vetVisitsQuery = useInfiniteQuery({
    queryKey: ['vet-visits', petId],
    queryFn: ({ pageParam }) => healthApi.listVetVisits(petId!, { pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: !!petId && tab === 'vet-visits',
  });
  const vetVisits = vetVisitsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const vetVisitsSentinel = useInfiniteScroll(
    () => { if (vetVisitsQuery.hasNextPage && !vetVisitsQuery.isFetchingNextPage) vetVisitsQuery.fetchNextPage(); },
    tab === 'vet-visits' && vetVisitsQuery.hasNextPage,
  );

  // Edit pet mutation
  const editMutation = useMutation({
    mutationFn: (data: Partial<Omit<Pet, 'id' | 'groupId' | 'createdAt' | 'photoUrl'>>) =>
      petsApi.update(groupId!, petId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet', groupId, petId] });
      setEditOpen(false);
    },
  });

  // Pet photo upload mutation
  const photoMutation = useMutation({
    mutationFn: (file: File) => petsApi.uploadPhoto(groupId!, petId!, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pet', groupId, petId] }),
  });

  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) photoMutation.mutate(file);
    e.target.value = '';
  };

  // Vet visit form
  const [hasNextVisit, setHasNextVisit] = useState(false);
  const [vetForm, setVetForm] = useState({ vetId: '', reason: '', notes: '', visitDate: todayNoon(), nextVisitDate: weekFromNow() });
  const vetMutation = useMutation({
    mutationFn: () => healthApi.createVetVisit(petId!, {
      vetId: vetForm.vetId || undefined,
      reason: vetForm.reason,
      notes: vetForm.notes || undefined,
      visitDate: toIso(vetForm.visitDate),
      nextVisitDate: hasNextVisit && vetForm.nextVisitDate ? toIso(vetForm.nextVisitDate) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vet-visits', petId] });
      setAddOpen(false);
      setVetForm({ vetId: '', reason: '', notes: '', visitDate: todayNoon(), nextVisitDate: weekFromNow() });
      setHasNextVisit(false);
    },
  });

  // Vet visit update mutation
  const updateVisitMutation = useMutation({
    mutationFn: ({ visitId, data }: { visitId: string; data: Partial<Omit<VetVisit, 'id' | 'petId' | 'createdAt' | 'imageUrls'>> }) =>
      healthApi.updateVetVisit(petId!, visitId, data),
    onSuccess: (updatedVisit) => {
      queryClient.invalidateQueries({ queryKey: ['vet-visits', petId] });
      setDetailVisit(updatedVisit);
    },
  });

  // Vet visit image upload mutation
  const imageMutation = useMutation({
    mutationFn: ({ visitId, file }: { visitId: string; file: File }) =>
      healthApi.uploadVetVisitImage(petId!, visitId, file),
    onSuccess: (updatedVisit) => {
      queryClient.invalidateQueries({ queryKey: ['vet-visits', petId] });
      setDetailVisit(updatedVisit);
    },
  });

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && detailVisit) imageMutation.mutate({ visitId: detailVisit.id, file });
    e.target.value = '';
  };

  const canSaveVetVisit = !!(vetForm.reason && vetForm.visitDate);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {/* Pet hero */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 3, mb: 4, p: 3,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 3,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
      }}>
        {/* Avatar — click to change photo */}
        <Tooltip title="Change photo" placement="bottom">
          <Box
            onClick={() => photoInputRef.current?.click()}
            sx={{ position: 'relative', cursor: 'pointer', flexShrink: 0,
              '&:hover .photo-overlay': { opacity: 1 } }}
          >
            <Avatar
              src={pet?.photoUrl ? `${serverUrl}${pet.photoUrl}` : undefined}
              sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 36 }}
            >
              {!pet?.photoUrl && <Pets fontSize="large" />}
            </Avatar>
            <Box className="photo-overlay" sx={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s',
            }}>
              <AddAPhoto fontSize="small" />
            </Box>
          </Box>
        </Tooltip>

        {/* Pet info */}
        <Box sx={{ flex: 1 }}>
          {pet ? (
            <>
              <Typography variant="h4" fontWeight="bold" sx={{ lineHeight: 1.1 }}>{pet.name}</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                <Chip label={pet.species} size="small" color="primary" variant="outlined" />
                {pet.breed && <Chip label={pet.breed} size="small" variant="outlined" />}
                {pet.birthDate && <Chip label={calcAge(pet.birthDate)} size="small" variant="outlined" />}
              </Box>
              {pet.birthDate && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Born {fmtDate(pet.birthDate)}
                </Typography>
              )}
            </>
          ) : (
            <>
              <Skeleton variant="text" width={200} height={48} />
              <Skeleton variant="text" width={120} height={28} />
            </>
          )}
        </Box>

        {/* Edit button */}
        <IconButton
          onClick={() => pet && setEditOpen(true)}
          disabled={!pet}
          size="small"
          sx={{ position: 'absolute', top: 12, right: 12, color: 'text.secondary' }}
        >
          <Edit fontSize="small" />
        </IconButton>
      </Box>

      {/* Hidden file inputs */}
      <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoPick} />
      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagePick} />

      {/* Tabs */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Vet Visits" value="vet-visits" />
          <Tab label="Medications" value="medications" />
        </Tabs>
        {tab === 'vet-visits' && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setAddOpen(true)} size="small">Add</Button>
        )}
      </Box>

      <Box sx={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 2,
        overflow: 'hidden',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {tab === 'vet-visits' && (
          <>
            {vetVisitsQuery.isLoading ? <LoadingState /> : !vetVisits.length ? <EmptyState /> : (
              <>
                <List disablePadding>
                  {vetVisits.map((v, i) => {
                    const vet = vets.find((vt) => vt.id === v.vetId);
                    const vetName = vet ? vet.name : (v.clinic ?? null);
                    return (
                      <Box key={v.id}>
                        {i > 0 && <Divider />}
                        <ListItemButton onClick={() => setDetailVisit(v)} sx={{ py: 1, px: 2 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={500} noWrap>{v.reason}</Typography>
                            {vetName && <Typography variant="caption" color="text.secondary" noWrap>{vetName}</Typography>}
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 2, whiteSpace: 'nowrap' }}>
                            {fmtDate(v.visitDate)}
                          </Typography>
                        </ListItemButton>
                      </Box>
                    );
                  })}
                </List>
                <div ref={vetVisitsSentinel} />
                {vetVisitsQuery.isFetchingNextPage && <ListSkeleton />}
              </>
            )}
          </>
        )}

        {tab === 'medications' && <EmptyState label="Coming soon" />}
      </Box>

      {/* Edit pet dialog */}
      {pet && (
        <EditPetDialog
          key={`${pet.name}|${pet.species}|${pet.breed ?? ''}|${pet.birthDate ?? ''}`}
          pet={pet}
          open={editOpen}
          saving={editMutation.isPending}
          onClose={() => setEditOpen(false)}
          onSave={(data) => editMutation.mutate(data)}
        />
      )}

      {/* Add vet visit dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Vet Visit</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField select label="Vet / Clinic" value={vetForm.vetId} onChange={(e) => setVetForm({ ...vetForm, vetId: e.target.value })} fullWidth>
              <MenuItem value="">— None —</MenuItem>
              {vets.map((v) => <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>)}
            </TextField>
            <TextField label="Reason" value={vetForm.reason} onChange={(e) => setVetForm({ ...vetForm, reason: e.target.value })} fullWidth required />
            <TextField label="Visit Date" type="datetime-local" value={vetForm.visitDate} onChange={(e) => setVetForm({ ...vetForm, visitDate: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} required />
            <FormControlLabel
              control={<Checkbox checked={hasNextVisit} onChange={(e) => setHasNextVisit(e.target.checked)} />}
              label="Schedule next visit"
            />
            {hasNextVisit && (
              <TextField label="Next Visit Date" type="datetime-local" value={vetForm.nextVisitDate} onChange={(e) => setVetForm({ ...vetForm, nextVisitDate: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
            )}
            <TextField label="Notes" value={vetForm.notes} onChange={(e) => setVetForm({ ...vetForm, notes: e.target.value })} fullWidth multiline rows={3} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => vetMutation.mutate()} disabled={!canSaveVetVisit}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Vet visit detail dialog */}
      {detailVisit && (
        <VetVisitDetailDialog
          key={detailVisit.id}
          visit={detailVisit}
          vets={vets}
          imageInputRef={imageInputRef}
          uploading={imageMutation.isPending}
          saving={updateVisitMutation.isPending}
          onClose={() => setDetailVisit(null)}
          onAddPhoto={() => imageInputRef.current?.click()}
          onSave={(data) => updateVisitMutation.mutate({ visitId: detailVisit.id, data })}
        />
      )}
    </Container>
  );
}

function EditPetDialog({ pet, open, saving, onClose, onSave }: {
  pet: Pet;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (data: Partial<Omit<Pet, 'id' | 'groupId' | 'createdAt' | 'photoUrl'>>) => void;
}) {
  const [form, setForm] = useState({
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? '',
    birthDate: pet.birthDate ? new Date(pet.birthDate).toISOString().slice(0, 10) : '',
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Pet</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
          <TextField label="Species" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} fullWidth required />
          <TextField label="Breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} fullWidth />
          <TextField label="Birth Date" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={saving || !form.name || !form.species}
          onClick={() => onSave({
            name: form.name,
            species: form.species,
            breed: form.breed || undefined,
            birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : undefined,
          })}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type VetVisitEditForm = {
  vetId: string;
  reason: string;
  notes: string;
  visitDate: string;
  nextVisitDate: string;
  hasNextVisit: boolean;
};

function visitToForm(visit: VetVisit): VetVisitEditForm {
  return {
    vetId: visit.vetId ?? '',
    reason: visit.reason,
    notes: visit.notes ?? '',
    visitDate: visit.visitDate ? new Date(visit.visitDate).toISOString().slice(0, 16) : '',
    nextVisitDate: visit.nextVisitDate ? new Date(visit.nextVisitDate).toISOString().slice(0, 16) : weekFromNow(),
    hasNextVisit: !!visit.nextVisitDate,
  };
}

function formChanged(original: VetVisitEditForm, current: VetVisitEditForm): boolean {
  return JSON.stringify(original) !== JSON.stringify(current);
}

function VetVisitDetailDialog({
  visit, vets, imageInputRef: _imageInputRef, uploading, saving, onClose, onAddPhoto, onSave,
}: {
  visit: VetVisit;
  vets: import('../../types').Vet[];
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  uploading: boolean;
  saving: boolean;
  onClose: () => void;
  onAddPhoto: () => void;
  onSave: (data: Partial<Omit<VetVisit, 'id' | 'petId' | 'createdAt' | 'imageUrls'>>) => void;
}) {
  const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000';
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<VetVisitEditForm>(() => visitToForm(visit));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const originalForm = visitToForm(visit);

  const vetName = vets.find((v) => v.id === visit.vetId)?.name ?? visit.clinic;

  const handleSaveClick = () => {
    if (!formChanged(originalForm, form)) { setEditing(false); return; }
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    onSave({
      vetId: form.vetId || undefined,
      reason: form.reason,
      notes: form.notes || undefined,
      visitDate: form.visitDate ? new Date(form.visitDate + ':00').toISOString() : undefined,
      nextVisitDate: form.hasNextVisit && form.nextVisitDate
        ? new Date(form.nextVisitDate + ':00').toISOString()
        : (form.hasNextVisit ? undefined : null as any),
    });
    setEditing(false);
  };

  return (
    <>
      <Dialog open onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 0 }}>
          {editing ? (
            <TextField
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              variant="standard"
              fullWidth
              sx={{ fontSize: 'inherit' }}
            />
          ) : (
            <Box sx={{ flex: 1 }}>{visit.reason}</Box>
          )}
          {!editing && (
            <IconButton size="small" onClick={() => setEditing(true)} sx={{ color: 'text.secondary' }}>
              <Edit fontSize="small" />
            </IconButton>
          )}
          {editing && (
            <IconButton size="small" onClick={() => { setEditing(false); setForm(visitToForm(visit)); }} sx={{ color: 'text.secondary' }}>
              <Close fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent>
          {editing ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                select label="Vet / Clinic" value={form.vetId}
                onChange={(e) => setForm({ ...form, vetId: e.target.value })} fullWidth
              >
                <MenuItem value="">— None —</MenuItem>
                {vets.map((v) => <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>)}
              </TextField>
              <TextField
                label="Visit Date" type="datetime-local" value={form.visitDate}
                onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                fullWidth slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormControlLabel
                control={<Checkbox checked={form.hasNextVisit} onChange={(e) => setForm({ ...form, hasNextVisit: e.target.checked })} />}
                label="Schedule next visit"
              />
              {form.hasNextVisit && (
                <TextField
                  label="Next Visit Date" type="datetime-local" value={form.nextVisitDate}
                  onChange={(e) => setForm({ ...form, nextVisitDate: e.target.value })}
                  fullWidth slotProps={{ inputLabel: { shrink: true } }}
                />
              )}
              <TextField
                label="Notes" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                fullWidth multiline rows={3}
              />
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">{vetName ?? '—'}</Typography>
                <Typography variant="body2" color="text.secondary">{fmtDateTime(visit.visitDate)}</Typography>
              </Box>
              {visit.nextVisitDate && (
                <Typography variant="body2" color="primary" sx={{ mb: 1.5 }}>
                  Next visit: {fmtDateTime(visit.nextVisitDate)}
                </Typography>
              )}
              {visit.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{visit.notes}</Typography>
              )}
            </>
          )}

          {/* Photos — always visible */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: editing ? 1 : 0, mb: 1 }}>
            {visit.imageUrls.map((url) => (
              <Box
                key={url}
                component="img"
                src={`${serverUrl}${url}`}
                sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 1, border: '1px solid rgba(255,255,255,0.1)' }}
              />
            ))}
            <IconButton
              onClick={onAddPhoto}
              disabled={uploading}
              sx={{
                width: 96, height: 96, borderRadius: 1,
                border: '1px dashed rgba(255,255,255,0.2)',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              {uploading ? <CircularProgress size={20} /> : <AddAPhoto fontSize="small" />}
            </IconButton>
          </Box>
        </DialogContent>

        <DialogActions>
          {editing ? (
            <>
              <Button onClick={() => { setEditing(false); setForm(visitToForm(visit)); }}>Cancel</Button>
              <Button variant="contained" onClick={handleSaveClick} disabled={saving || !form.reason}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>Close</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Save changes?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will update the vet visit record. Are you sure?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirm}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function EmptyState({ label = 'No records yet' }: { label?: string }) {
  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}

function LoadingState() {
  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />)}
    </Box>
  );
}

function ListSkeleton() {
  return (
    <Box sx={{ px: 2, pb: 1 }}>
      <Skeleton variant="rectangular" height={44} sx={{ borderRadius: 1 }} />
    </Box>
  );
}
