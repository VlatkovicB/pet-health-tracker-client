// pet-health-tracker-client/src/components/WorkHoursEditor.tsx
import { Box, Checkbox, FormControlLabel, TextField, Typography } from '@mui/material';
import type { DayOfWeek, VetWorkHours } from '../types';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'MON', label: 'Mon' },
  { key: 'TUE', label: 'Tue' },
  { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' },
  { key: 'FRI', label: 'Fri' },
  { key: 'SAT', label: 'Sat' },
  { key: 'SUN', label: 'Sun' },
];

interface Props {
  value: VetWorkHours[];
  onChange: (hours: VetWorkHours[]) => void;
}

export function WorkHoursEditor({ value, onChange }: Props) {
  const getDay = (key: DayOfWeek) => value.find((h) => h.dayOfWeek === key);

  const toggleOpen = (key: DayOfWeek, isOpen: boolean) => {
    const existing = getDay(key);
    if (isOpen) {
      if (existing) {
        onChange(value.map((h) =>
          h.dayOfWeek === key
            ? { ...h, open: true, startTime: h.startTime ?? '08:00', endTime: h.endTime ?? '18:00' }
            : h,
        ));
      } else {
        onChange([...value, { dayOfWeek: key, open: true, startTime: '08:00', endTime: '18:00' }]);
      }
    } else {
      if (existing) {
        onChange(value.map((h) => h.dayOfWeek === key ? { ...h, open: false } : h));
      }
    }
  };

  const setTime = (key: DayOfWeek, field: 'startTime' | 'endTime', val: string) => {
    const existing = getDay(key);
    if (existing) {
      onChange(value.map((h) => h.dayOfWeek === key ? { ...h, [field]: val } : h));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
        Working Hours
      </Typography>
      {DAYS.map(({ key, label }) => {
        const entry = getDay(key);
        const isOpen = entry?.open ?? false;
        return (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              sx={{ minWidth: 72, m: 0 }}
              control={
                <Checkbox
                  size="small"
                  checked={isOpen}
                  onChange={() => toggleOpen(key, !isOpen)}
                />
              }
              label={<Typography variant="body2">{label}</Typography>}
            />
            <TextField
              size="small"
              type="time"
              value={entry?.startTime ?? ''}
              onChange={(e) => setTime(key, 'startTime', e.target.value)}
              disabled={!isOpen}
              sx={{ width: 120 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Typography variant="body2" color="text.secondary">–</Typography>
            <TextField
              size="small"
              type="time"
              value={entry?.endTime ?? ''}
              onChange={(e) => setTime(key, 'endTime', e.target.value)}
              disabled={!isOpen}
              sx={{ width: 120 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        );
      })}
    </Box>
  );
}
