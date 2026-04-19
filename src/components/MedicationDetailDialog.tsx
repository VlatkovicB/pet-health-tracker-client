import { useEffect, useState } from 'react';
import {
  Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, MenuItem, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Medication, ReminderScheduleProps } from '../types';
import type { UpdateMedicationInput } from '../api/medications';
import { medicationsApi } from '../api/medications';
import { remindersApi } from '../api/reminders';
import { ReminderScheduleEditor } from './ReminderScheduleEditor';
import { getApiError } from '../api/client';
import { useNotification } from '../context/NotificationContext';

const DOSAGE_UNITS = ['mg', 'ml', 'g', 'mcg', 'tab', 'pip', 'injection', 'collar', 'drop'];
type FreqType = 'hourly' | 'daily' | 'weekly' | 'monthly';

interface Props {
  med: Medication;
  petId: string;
  onClose: () => void;
}

export function MedicationDetailDialog({ med, petId, onClose }: Props) {
  const queryClient = useQueryClient();
  const { showError } = useNotification();
  const [tab, setTab] = useState<'details' | 'reminder'>('details');

  // Details form state
  const [form, setForm] = useState({
    name: med.name,
    dosageAmount: String(med.dosage.amount),
    dosageUnit: med.dosage.unit,
    startDate: med.startDate.slice(0, 10),
    endDate: med.endDate ? med.endDate.slice(0, 10) : '',
    notes: med.notes ?? '',
  });
  const [frequency, setFrequency] = useState<{ type: FreqType; interval: number }>({
    type: med.frequency.type as FreqType,
    interval: med.frequency.interval,
  });
  const [hasEndDate, setHasEndDate] = useState(!!med.endDate);
  const [active, setActive] = useState(med.active);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const canSave = !!(form.name && form.dosageAmount && form.dosageUnit && form.startDate);

  // Reminder state
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderSchedule, setReminderSchedule] = useState<ReminderScheduleProps | null>(null);

  const reminderQuery = useQuery({
    queryKey: ['medication-reminder', med.id],
    queryFn: () => remindersApi.getMedicationReminder(med.id),
    retry: false,
    enabled: tab === 'reminder',
  });

  useEffect(() => {
    if (reminderQuery.data) {
      setReminderEnabled(reminderQuery.data.enabled);
      setReminderSchedule(reminderQuery.data.schedule);
    }
  }, [reminderQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateMedicationInput) => medicationsApi.update(petId, med.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', petId] });
      onClose();
    },
    onError: (err) => showError(getApiError(err)),
  });

  const reminderMutation = useMutation({
    mutationFn: (data: { schedule: ReminderScheduleProps; enabled: boolean }) =>
      remindersApi.configureMedicationReminder(med.id, data),
    onError: (err) => showError(getApiError(err)),
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: form.name,
      dosageAmount: parseFloat(form.dosageAmount),
      dosageUnit: form.dosageUnit,
      frequency,
      startDate: new Date(form.startDate).toISOString(),
      endDate: hasEndDate && form.endDate ? new Date(form.endDate).toISOString() : null,
      notes: form.notes || null,
      active,
    });
  };

  const handleReminderChange = (s: ReminderScheduleProps) => {
    setReminderSchedule(s);
    if (reminderEnabled) reminderMutation.mutate({ schedule: s, enabled: true });
  };

  const handleReminderToggle = (enabled: boolean) => {
    setReminderEnabled(enabled);
    reminderMutation.mutate({
      schedule: reminderSchedule ?? { type: 'daily', times: ['08:00'] },
      enabled,
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

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3 }}>
        <Tab value="details" label="Details" />
        <Tab value="reminder" label="🔔 Reminder" />
      </Tabs>

      <DialogContent sx={{ pt: 2 }}>
        {tab === 'details' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: -0.5 }}>
              Medication Details
            </Typography>
            <TextField
              label="Medication name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              fullWidth
              required
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
              />
              <TextField
                select
                label="Unit"
                value={form.dosageUnit}
                onChange={(e) => set('dosageUnit', e.target.value)}
                sx={{ width: 130 }}
              >
                {DOSAGE_UNITS.map((u) => (
                  <MenuItem key={u} value={u}>
                    {u}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                select
                label="Frequency"
                value={frequency.type}
                onChange={(e) => setFrequency({ ...frequency, type: e.target.value as FreqType })}
                sx={{ flex: 1 }}
              >
                <MenuItem value="hourly">Hourly</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </TextField>
              <TextField
                label="Every"
                type="number"
                value={frequency.interval}
                onChange={(e) => setFrequency({ ...frequency, interval: Math.max(1, parseInt(e.target.value) || 1) })}
                sx={{ width: 100 }}
                slotProps={{ htmlInput: { min: 1 } }}
              />
            </Box>
            <TextField
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControlLabel
              control={<Checkbox checked={hasEndDate} onChange={(e) => setHasEndDate(e.target.checked)} />}
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
              />
            )}
            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <FormControlLabel
              control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
              label="Active"
            />
          </Box>
        )}

        {tab === 'reminder' && (
          <>
            {reminderQuery.isLoading ? (
              <CircularProgress size={20} />
            ) : (
              <ReminderScheduleEditor
                enabled={reminderEnabled}
                onToggleEnabled={handleReminderToggle}
                schedule={reminderSchedule}
                onChange={handleReminderChange}
                saving={reminderMutation.isPending}
              />
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        {tab === 'details' && (
          <Button
            variant="contained"
            disabled={!canSave || updateMutation.isPending}
            onClick={handleSave}
          >
            {updateMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
