import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Box, Typography } from '@mui/material';
import type { WeightEntry, WeightUnit } from '../types';

function convert(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  return from === 'kg' ? value * 2.20462 : value / 2.20462;
}

interface Props {
  entries: WeightEntry[];
}

export function WeightChart({ entries }: Props) {
  const targetUnit: WeightUnit = entries.length > 0 ? entries[0].unit : 'kg';

  const data = useMemo(
    () =>
      [...entries]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => ({
          date: e.date,
          weight: Number(convert(e.value, e.unit, targetUnit).toFixed(2)),
          notes: e.notes ?? '',
        })),
    [entries, targetUnit],
  );

  if (data.length < 2) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary" variant="body2">
          Add at least 2 entries to see the chart.
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `${v} ${targetUnit}`}
          width={60}
        />
        <Tooltip
          content={({ active, payload, label }: any) => {
            if (!active || !payload?.length) return null;
            const { weight, notes } = payload[0].payload;
            return (
              <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 1, borderRadius: 1 }}>
                <Typography variant="caption" sx={{ display: 'block' }}>{label}</Typography>
                <Typography variant="body2">{weight} {targetUnit}</Typography>
                {notes && <Typography variant="caption" color="text.secondary">{notes}</Typography>}
              </Box>
            );
          }}
        />
        <Line type="monotone" dataKey="weight" stroke="#1976d2" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
