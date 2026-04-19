import { useEffect, useState } from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Reminder, ReminderScheduleProps, Vet, VetVisit } from '../types';
import { healthApi } from '../api/health';
import { remindersApi } from '../api/reminders';
import { ReminderScheduleEditor } from './ReminderScheduleEditor';
import { getApiError } from '../api/client';
import { useNotification } from '../context/NotificationContext';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

function daysUntilLabel(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = iso.split('T')[0].split('-').map(Number);
  const d = Math.round((new Date(year, month - 1, day).getTime() - today.getTime()) / 86_400_000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d > 0) return `In ${d} days`;
  return `${Math.abs(d)} days ago`;
}

interface Props {
  visit: VetVisit;
  petId: string;
  vets: Vet[];
  onClose: () => void;
}

export function ScheduledVisitDetailDialog({ visit, petId, vets, onClose }: Props) {
  const queryClient = useQueryClient();
  const { showError } = useNotification();

  const vetName = vets.find((v) => v.id === visit.vetId)?.name ?? visit.clinic ?? '—';
  const [markingDone, setMarkingDone] = useState(false);
  const [doneNotes, setDoneNotes] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderSchedule, setReminderSchedule] = useState<ReminderScheduleProps | null>(null);

  const reminderQuery = useQuery<Reminder | null>({
    queryKey: ['vet-visit-reminder', visit.id],
    queryFn: () => remindersApi.getVetVisitReminder(petId, visit.id),
    retry: false,
  });

  useEffect(() => {
    if (reminderQuery.data) {
      setReminderEnabled(reminderQuery.data.enabled);
      setReminderSchedule(reminderQuery.data.schedule);
    }
  }, [reminderQuery.data]);

  const reminderMutation = useMutation({
    mutationFn: (data: { schedule: ReminderScheduleProps; enabled: boolean }) =>
      remindersApi.configureVetVisitReminder(petId, visit.id, data),
    onError: (err) => showError(getApiError(err)),
  });

  const completeMutation = useMutation({
    mutationFn: () => healthApi.completeVetVisit(petId, visit.id, doneNotes || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vet-visits', petId] });
      onClose();
    },
    onError: (err) => showError(getApiError(err)),
  });

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
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography variant="h6">{visit.reason}</Typography>
        <Typography variant="body2" color="text.secondary">
          {vetName} · {fmtDate(visit.visitDate)}
        </Typography>
        <Typography variant="body2" color="primary">
          {daysUntilLabel(visit.visitDate)}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
        <Divider />

        <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: 0 }}>
          Repeating reminder
        </Typography>

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

        <Divider />

        {markingDone ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Visit notes (optional)
            </Typography>
            <TextField
              label="Notes"
              multiline
              rows={3}
              fullWidth
              value={doneNotes}
              onChange={(e) => setDoneNotes(e.target.value)}
              autoFocus
            />
          </Box>
        ) : (
          <Button variant="outlined" color="success" onClick={() => setMarkingDone(true)}>
            Mark as done
          </Button>
        )}
      </DialogContent>

      <DialogActions>
        {markingDone ? (
          <>
            <Button onClick={() => setMarkingDone(false)} color="inherit">
              Back
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? 'Saving…' : 'Confirm done'}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
