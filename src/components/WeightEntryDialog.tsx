import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, ToggleButton, ToggleButtonGroup, Stack,
} from '@mui/material';
import type { WeightEntry, WeightUnit } from '../types';

interface Props {
  open: boolean;
  entry?: WeightEntry | null;
  onClose: () => void;
  onSubmit: (data: { date: string; value: number; unit: WeightUnit; notes?: string }) => void;
  loading?: boolean;
}

export function WeightEntryDialog({ open, entry, onClose, onSubmit, loading }: Props) {
  const [date, setDate] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setDate(entry?.date ?? new Date().toISOString().slice(0, 10));
      setValue(entry ? String(entry.value) : '');
      setUnit(entry?.unit ?? 'kg');
      setNotes(entry?.notes ?? '');
    }
  }, [open, entry]);

  const handleSubmit = () => {
    const num = parseFloat(value);
    if (!date || isNaN(num) || num <= 0) return;
    onSubmit({ date, value: num, unit, notes: notes.trim() || undefined });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{entry ? 'Edit Weight Entry' : 'Add Weight Entry'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TextField
              label="Weight"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
              sx={{ flex: 1 }}
            />
            <ToggleButtonGroup
              value={unit}
              exclusive
              onChange={(_, v) => { if (v) setUnit(v); }}
              size="small"
            >
              <ToggleButton value="kg">kg</ToggleButton>
              <ToggleButton value="lb">lb</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || !date || !value}>
          {entry ? 'Save' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
