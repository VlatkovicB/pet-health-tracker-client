import { useState } from 'react';
import {
  Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, MenuItem, Switch, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Medication, ReminderScheduleProps, AdvanceNotice } from '../types';
import type { UpdateMedicationInput } from '../api/medications';
import { medicationsApi } from '../api/medications';
import { petsApi } from '../api/pets';
import { MedicationScheduleSection } from './MedicationScheduleSection';
import { getApiError } from '../api/client';
import { useNotification } from '../context/NotificationContext';

const DOSAGE_UNITS = ['mg', 'ml', 'g', 'mcg', 'tab', 'pip', 'injection', 'collar', 'drop'];

interface Props {
  med: Medication;
  petId: string;
  onClose: () => void;
  canEdit?: boolean;
}

export function MedicationDetailDialog({ med, petId, onClose, canEdit = true }: Props) {
  const queryClient = useQueryClient();
  const { showError } = useNotification();

  const [form, setForm] = useState({
    name: med.name,
    dosageAmount: String(med.dosage.amount),
    dosageUnit: med.dosage.unit,
    startDate: med.startDate.slice(0, 10),
    endDate: med.endDate ? med.endDate.slice(0, 10) : '',
    notes: med.notes ?? '',
  });
  const [schedule, setSchedule] = useState<ReminderScheduleProps>(med.schedule);
  const [reminderEnabled, setReminderEnabled] = useState(med.reminderEnabled);
  const [advanceNotice, setAdvanceNotice] = useState<AdvanceNotice | undefined>(med.advanceNotice);
  const [hasEndDate, setHasEndDate] = useState(!!med.endDate);
  const [active, setActive] = useState(med.active);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const canSave = !!(form.name && form.dosageAmount && form.dosageUnit && form.startDate);

  const petsQuery = useQuery({
    queryKey: ['pets-calendar'],
    queryFn: () => petsApi.list({ pageParam: 1 }),
  });
  const pet = (petsQuery.data?.items ?? []).find((p) => p.id === petId);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateMedicationInput) => medicationsApi.update(petId, med.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', petId] });
      onClose();
    },
    onError: (err) => showError(getApiError(err)),
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: form.name,
      dosageAmount: parseFloat(form.dosageAmount),
      dosageUnit: form.dosageUnit,
      schedule,
      startDate: new Date(form.startDate).toISOString(),
      endDate: hasEndDate && form.endDate ? new Date(form.endDate).toISOString() : null,
      notes: form.notes || null,
      active,
      reminder: { enabled: reminderEnabled, advanceNotice },
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 0, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {med.name}
        {active ? (
          <Chip label="Active" size="small" sx={{ fontWeight: 800, borderRadius: 5, fontSize: '0.6875rem', bgcolor: '#34d39922', color: '#059669' }} />
        ) : (
          <Chip label="Inactive" size="small" sx={{ fontWeight: 800, borderRadius: 5, fontSize: '0.6875rem', bgcolor: '#f3f4f6', color: 'text.disabled' }} />
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {pet && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Pet
              </Typography>
              <Chip
                label={pet.name}
                size="small"
                sx={{
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800,
                  fontSize: '0.6875rem',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                  color: '#fff',
                  border: 'none',
                }}
              />
            </Box>
          )}
          <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: -0.5 }}>
            Medication Details
          </Typography>
          <TextField
            label="Medication name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            fullWidth
            required
            disabled={!canEdit}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Dose"
              type="number"
              value={form.dosageAmount}
              onChange={(e) => set('dosageAmount', e.target.value)}
              sx={{ flex: 1 }}
              required
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              disabled={!canEdit}
            />
            <TextField
              select
              label="Unit"
              value={form.dosageUnit}
              onChange={(e) => set('dosageUnit', e.target.value)}
              sx={{ width: 130 }}
              disabled={!canEdit}
            >
              {DOSAGE_UNITS.map((u) => (
                <MenuItem key={u} value={u}>{u}</MenuItem>
              ))}
            </TextField>
          </Box>
          <TextField
            label="Start date"
            type="date"
            value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
            fullWidth
            required
            slotProps={{ inputLabel: { shrink: true } }}
            disabled={!canEdit}
          />
          <FormControlLabel
            control={<Checkbox checked={hasEndDate} onChange={(e) => setHasEndDate(e.target.checked)} disabled={!canEdit} />}
            label="Set end date"
          />
          {hasEndDate && (
            <TextField
              label="End date"
              type="date"
              value={form.endDate}
              onChange={(e) => set('endDate', e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              disabled={!canEdit}
            />
          )}
          <TextField
            label="Notes"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            fullWidth
            multiline
            rows={2}
            disabled={!canEdit}
          />
          <FormControlLabel
            control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} disabled={!canEdit} />}
            label="Active"
          />
          <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: -1 }}>
            Schedule
          </Typography>
          <MedicationScheduleSection
            schedule={schedule}
            onScheduleChange={setSchedule}
            reminderEnabled={reminderEnabled}
            onReminderToggle={setReminderEnabled}
            advanceNotice={advanceNotice}
            onAdvanceNoticeChange={setAdvanceNotice}
            disabled={!canEdit}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        {canEdit ? (
          <>
            <Button onClick={onClose} color="inherit">Cancel</Button>
            <Button
              variant="contained"
              disabled={!canSave || updateMutation.isPending}
              onClick={handleSave}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        ) : (
          <Button onClick={onClose} color="inherit">Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
