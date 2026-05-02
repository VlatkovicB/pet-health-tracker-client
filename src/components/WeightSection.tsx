import { useRef, useState } from 'react';
import {
  Box, Button, IconButton, Stack, Typography, CircularProgress,
  List, ListItem, ListItemText, Divider, Tooltip,
} from '@mui/material';
import { Add, AddAPhoto, Edit, Delete } from '@mui/icons-material';
import { WeightChart } from './WeightChart';
import { WeightEntryDialog } from './WeightEntryDialog';
import { useWeightEntries, useAddWeightEntry, useUpdateWeightEntry, useDeleteWeightEntry } from '../api/weight';
import { useAttachPhotoToWeightEntry } from '../api/photos';
import type { WeightEntry } from '../types';

interface Props {
  petId: string;
  canEdit: boolean;
}

function WeightEntryActions({
  entry,
  canEdit,
  onEdit,
  onDelete,
}: {
  entry: WeightEntry;
  canEdit: boolean;
  onEdit: (entry: WeightEntry) => void;
  onDelete: (id: string) => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const attachPhoto = useAttachPhotoToWeightEntry(entry.id);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('takenAt', entry.date);
    attachPhoto.mutate(formData);
    e.target.value = '';
  };

  return (
    <Stack direction="row" sx={{ alignItems: 'center' }}>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePhotoSelect}
      />
      <Tooltip title="Attach photo">
        <span>
          <IconButton
            size="small"
            onClick={() => photoInputRef.current?.click()}
            disabled={attachPhoto.isPending}
          >
            {attachPhoto.isPending ? <CircularProgress size={16} /> : <AddAPhoto fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
      {canEdit && (
        <>
          <IconButton size="small" onClick={() => onEdit(entry)}><Edit fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => onDelete(entry.id)}><Delete fontSize="small" /></IconButton>
        </>
      )}
    </Stack>
  );
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
                  <WeightEntryActions
                    entry={entry}
                    canEdit={canEdit}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
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
