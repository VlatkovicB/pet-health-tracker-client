import { Box, Button, Chip, FormControlLabel, MenuItem, Switch, TextField, Typography } from '@mui/material';
import type { DayOfWeek, ReminderScheduleProps } from '../types';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DEFAULT_SCHEDULE: ReminderScheduleProps = { type: 'daily', times: ['08:00'] };

interface ReminderScheduleEditorProps {
  enabled: boolean;
  onToggleEnabled: (v: boolean) => void;
  schedule: ReminderScheduleProps | null;
  onChange: (s: ReminderScheduleProps) => void;
  saving?: boolean;
}

export function ReminderScheduleEditor({
  enabled,
  onToggleEnabled,
  schedule,
  onChange,
  saving,
}: ReminderScheduleEditorProps) {
  const current = schedule ?? DEFAULT_SCHEDULE;

  const handleTypeChange = (type: 'daily' | 'weekly' | 'monthly') => {
    if (type === 'daily') onChange({ type: 'daily', times: current.times });
    else if (type === 'weekly') onChange({ type: 'weekly', days: ['MON'], times: current.times });
    else onChange({ type: 'monthly', daysOfMonth: [1], times: current.times });
  };

  const handleTimeChange = (index: number, value: string) => {
    const times = [...current.times];
    times[index] = value;
    onChange({ ...current, times } as ReminderScheduleProps);
  };

  const addTime = () => {
    if (current.times.length >= 4) return;
    onChange({ ...current, times: [...current.times, '08:00'] } as ReminderScheduleProps);
  };

  const removeTime = (index: number) => {
    const times = current.times.filter((_, i) => i !== index);
    if (times.length === 0) return;
    onChange({ ...current, times } as ReminderScheduleProps);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControlLabel
        control={
          <Switch checked={enabled} onChange={(e) => onToggleEnabled(e.target.checked)} disabled={saving} />
        }
        label="Enable reminders"
      />

      {enabled && (
        <>
          <TextField
            select
            label="Schedule type"
            value={current.type}
            onChange={(e) => handleTypeChange(e.target.value as 'daily' | 'weekly' | 'monthly')}
            fullWidth
            disabled={saving}
          >
            <MenuItem value="daily">Daily</MenuItem>
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
          </TextField>

          {current.type === 'weekly' && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {DAYS.map((d) => {
                const selected = (current as { days: DayOfWeek[] }).days.includes(d);
                return (
                  <Chip
                    key={d}
                    label={d}
                    size="small"
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    onClick={() => {
                      const days = selected
                        ? (current as { days: DayOfWeek[] }).days.filter((x) => x !== d)
                        : [...(current as { days: DayOfWeek[] }).days, d];
                      if (days.length > 0)
                        onChange({ ...current, days } as ReminderScheduleProps);
                    }}
                    disabled={saving}
                    sx={{ cursor: 'pointer' }}
                  />
                );
              })}
            </Box>
          )}

          {current.type === 'monthly' && (
            <TextField
              label="Day(s) of month (comma-separated)"
              fullWidth
              disabled={saving}
              value={(current as { daysOfMonth: number[] }).daysOfMonth.join(', ')}
              onChange={(e) => {
                const daysOfMonth = e.target.value
                  .split(',')
                  .map((s) => parseInt(s.trim()))
                  .filter((n) => n >= 1 && n <= 31);
                if (daysOfMonth.length > 0)
                  onChange({ ...current, daysOfMonth } as ReminderScheduleProps);
              }}
            />
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Reminder time(s)
            </Typography>
            {current.times.map((t, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label={`Time ${i + 1}`}
                  type="time"
                  value={t}
                  onChange={(e) => handleTimeChange(i, e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  disabled={saving}
                  sx={{ flex: 1 }}
                />
                {current.times.length > 1 && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => removeTime(i)}
                    disabled={saving}
                    sx={{ minWidth: 32 }}
                  >
                    ✕
                  </Button>
                )}
              </Box>
            ))}
            <Button
              size="small"
              variant="outlined"
              onClick={addTime}
              disabled={saving || current.times.length >= 4}
            >
              + Add time
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
