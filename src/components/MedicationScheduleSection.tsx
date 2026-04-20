import { Box, MenuItem, Switch, TextField, Typography } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import type { ReminderScheduleProps, DayOfWeek, AdvanceNotice } from '../types';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const ADVANCE_NOTICE_OPTIONS: { label: string; value: AdvanceNotice | null }[] = [
  { label: 'At dose time', value: null },
  { label: '15 minutes before', value: { amount: 15, unit: 'minutes' } },
  { label: '30 minutes before', value: { amount: 30, unit: 'minutes' } },
  { label: '1 hour before', value: { amount: 1, unit: 'hours' } },
  { label: '2 hours before', value: { amount: 2, unit: 'hours' } },
  { label: '4 hours before', value: { amount: 4, unit: 'hours' } },
  { label: '1 day before', value: { amount: 1, unit: 'days' } },
];

function advanceNoticeKey(v: AdvanceNotice | null): string {
  if (!v) return 'none';
  return `${v.amount}-${v.unit}`;
}

interface Props {
  schedule: ReminderScheduleProps;
  onScheduleChange: (s: ReminderScheduleProps) => void;
  reminderEnabled: boolean;
  onReminderToggle: (enabled: boolean) => void;
  advanceNotice?: AdvanceNotice;
  onAdvanceNoticeChange: (v: AdvanceNotice | undefined) => void;
}

export function MedicationScheduleSection({
  schedule,
  onScheduleChange,
  reminderEnabled,
  onReminderToggle,
  advanceNotice,
  onAdvanceNoticeChange,
}: Props) {
  const handleTypeChange = (type: 'daily' | 'weekly' | 'monthly') => {
    if (type === 'daily') onScheduleChange({ type: 'daily', times: schedule.times });
    else if (type === 'weekly') onScheduleChange({ type: 'weekly', days: ['MON'], times: schedule.times });
    else onScheduleChange({ type: 'monthly', daysOfMonth: [1], times: schedule.times });
  };

  const handleTimeChange = (index: number, value: string) => {
    const times = [...schedule.times];
    times[index] = value;
    onScheduleChange({ ...schedule, times } as ReminderScheduleProps);
  };

  const addTime = () => {
    if (schedule.times.length >= 4) return;
    onScheduleChange({ ...schedule, times: [...schedule.times, '08:00'] } as ReminderScheduleProps);
  };

  const removeTime = (index: number) => {
    const times = schedule.times.filter((_, i) => i !== index);
    if (times.length === 0) return;
    onScheduleChange({ ...schedule, times } as ReminderScheduleProps);
  };

  const selectedAdvanceKey = advanceNoticeKey(advanceNotice ?? null);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        select
        label="Schedule type"
        value={schedule.type}
        onChange={(e) => handleTypeChange(e.target.value as 'daily' | 'weekly' | 'monthly')}
        fullWidth
      >
        <MenuItem value="daily">Daily</MenuItem>
        <MenuItem value="weekly">Weekly</MenuItem>
        <MenuItem value="monthly">Monthly</MenuItem>
      </TextField>

      {schedule.type === 'weekly' && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {DAYS.map((d) => {
            const selected = (schedule as { days: DayOfWeek[] }).days.includes(d);
            return (
              <Box
                key={d}
                onClick={() => {
                  const days = selected
                    ? (schedule as { days: DayOfWeek[] }).days.filter((x) => x !== d)
                    : [...(schedule as { days: DayOfWeek[] }).days, d];
                  if (days.length > 0) onScheduleChange({ ...schedule, days } as ReminderScheduleProps);
                }}
                sx={{
                  px: 1.5, py: 0.5, borderRadius: 2, fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer', userSelect: 'none',
                  bgcolor: selected ? 'primary.main' : 'background.paper',
                  color: selected ? 'primary.contrastText' : 'text.secondary',
                  border: '1.5px solid',
                  borderColor: selected ? 'primary.main' : 'divider',
                }}
              >
                {d}
              </Box>
            );
          })}
        </Box>
      )}

      {schedule.type === 'monthly' && (
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}>
            Day(s) of month
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const selected = (schedule as { daysOfMonth: number[] }).daysOfMonth.includes(day);
              return (
                <Box
                  key={day}
                  onClick={() => {
                    const current = (schedule as { daysOfMonth: number[] }).daysOfMonth;
                    const next = selected
                      ? current.filter((d) => d !== day)
                      : [...current, day].sort((a, b) => a - b);
                    if (next.length > 0)
                      onScheduleChange({ ...schedule, daysOfMonth: next } as ReminderScheduleProps);
                  }}
                  sx={{
                    width: 32, height: 32, borderRadius: 1.5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700,
                    cursor: 'pointer', userSelect: 'none',
                    bgcolor: selected ? 'primary.main' : 'background.paper',
                    color: selected ? 'primary.contrastText' : 'text.secondary',
                    border: '1.5px solid',
                    borderColor: selected ? 'primary.main' : 'divider',
                  }}
                >
                  {day}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Dose time(s)</Typography>
        {schedule.times.map((t, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label={`Time ${i + 1}`}
              type="time"
              value={t}
              onChange={(e) => handleTimeChange(i, e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ flex: 1 }}
            />
            {schedule.times.length > 1 && (
              <Box
                onClick={() => removeTime(i)}
                sx={{ cursor: 'pointer', color: 'text.disabled', px: 1, '&:hover': { color: 'error.main' } }}
              >✕</Box>
            )}
          </Box>
        ))}
        {schedule.times.length < 4 && (
          <Box
            onClick={addTime}
            sx={{ fontSize: '0.8rem', color: 'primary.main', cursor: 'pointer', pl: 0.5, '&:hover': { opacity: 0.7 } }}
          >
            + Add time
          </Box>
        )}
      </Box>

      {/* Reminder toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'divider', borderRadius: 2, px: 1.5, py: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <NotificationsIcon sx={{ fontSize: 16 }} /> Enable reminder
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Get notified before each dose</Typography>
        </Box>
        <Switch checked={reminderEnabled} onChange={(e) => onReminderToggle(e.target.checked)} />
      </Box>

      {/* Advance notice — only shown when reminder enabled */}
      {reminderEnabled && (
        <TextField
          select
          label="Remind me"
          value={selectedAdvanceKey}
          onChange={(e) => {
            const opt = ADVANCE_NOTICE_OPTIONS.find((o) => advanceNoticeKey(o.value) === e.target.value);
            onAdvanceNoticeChange(opt?.value ?? undefined);
          }}
          fullWidth
        >
          {ADVANCE_NOTICE_OPTIONS.map((opt) => (
            <MenuItem key={advanceNoticeKey(opt.value)} value={advanceNoticeKey(opt.value)}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Box>
  );
}
