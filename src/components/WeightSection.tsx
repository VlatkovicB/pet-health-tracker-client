import { useState } from 'react';
import {
  Box, Button, IconButton, Stack, Typography, CircularProgress,
  List, ListItem, ListItemText, Divider,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { WeightChart } from './WeightChart';
import { WeightEntryDialog } from './WeightEntryDialog';
import { useWeightEntries, useAddWeightEntry, useUpdateWeightEntry, useDeleteWeightEntry } from '../api/weight';
import type { WeightEntry } from '../types';

interface Props {
  petId: string;
  canEdit: boolean;
}

export function WeightSection({ petId, canEdit }: Props) {
  const { data: entries = [], isLoading } = useWeightEntries(petId);
  const addMutation = useAddWeightEntry(petId);
  const updateMutation = useUpdateWeightEntry(petId);
  const deleteMutation = useDeleteWeightEntry(petId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<WeightEntry | null>(null);

  const handleSubmit = (data: Parameters<typeof addMutation.mutate>[0]) => {
    if (editEntry) {
      updateMutation.mutate(
        { entryId: editEntry.id, data },
        { onSuccess: () => { setDialogOpen(false); setEditEntry(null); } },
      );
    } else {
      addMutation.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleEdit = (entry: WeightEntry) => {
    setEditEntry(entry);
    setDialogOpen(true);
  };

  const handleDelete = (entryId: string) => {
    deleteMutation.mutate(entryId);
  };

  if (isLoading) return <CircularProgress size={24} />;

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Weight</Typography>
        {canEdit && (
          <Button startIcon={<Add />} variant="outlined" size="small" onClick={() => { setEditEntry(null); setDialogOpen(true); }}>
            Add Entry
          </Button>
        )}
      </Stack>

      <WeightChart entries={entries} />

      {entries.length > 0 && (
        <List dense sx={{ mt: 1 }}>
          {entries.map((entry, idx) => (
            <Box key={entry.id}>
              {idx > 0 && <Divider />}
              <ListItem
                secondaryAction={
                  canEdit && (
                    <Stack direction="row">
                      <IconButton size="small" onClick={() => handleEdit(entry)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => handleDelete(entry.id)}><Delete fontSize="small" /></IconButton>
                    </Stack>
                  )
                }
              >
                <ListItemText
                  primary={`${entry.value} ${entry.unit}`}
                  secondary={`${entry.date}${entry.notes ? ` · ${entry.notes}` : ''}`}
                />
              </ListItem>
            </Box>
          ))}
        </List>
      )}

      <WeightEntryDialog
        open={dialogOpen}
        entry={editEntry}
        onClose={() => { setDialogOpen(false); setEditEntry(null); }}
        onSubmit={handleSubmit}
        loading={addMutation.isPending || updateMutation.isPending}
      />
    </Box>
  );
}
