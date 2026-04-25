import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Checkbox, FormControlLabel, Typography, CircularProgress,
} from '@mui/material';
import { useUpdateSharePermissions } from '../../api/shares';
import { getApiError } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import type { PetShare, SharePermissions } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  share: PetShare;
  petId: string;
}

const PERMISSION_PAIRS: Array<{
  viewKey: keyof SharePermissions;
  editKey: keyof SharePermissions;
  label: string;
}> = [
  { viewKey: 'canViewVetVisits',    editKey: 'canEditVetVisits',    label: 'Vet visits' },
  { viewKey: 'canViewMedications',  editKey: 'canEditMedications',  label: 'Medications' },
  { viewKey: 'canViewNotes',        editKey: 'canEditNotes',        label: 'Notes' },
];

export function EditPermissionsDialog({ open, onClose, share, petId }: Props) {
  const { showError } = useNotification();
  const [perms, setPerms] = useState<SharePermissions>({ ...share.permissions });
  const mutation = useUpdateSharePermissions();

  const toggle = (key: keyof SharePermissions, value: boolean) => {
    setPerms((prev) => {
      const next = { ...prev, [key]: value };
      // Edit implies view: if editing is enabled, ensure view is also enabled
      if (key === 'canEditVetVisits' && value) next.canViewVetVisits = true;
      if (key === 'canEditMedications' && value) next.canViewMedications = true;
      if (key === 'canEditNotes' && value) next.canViewNotes = true;
      // Disabling view must also disable edit
      if (key === 'canViewVetVisits' && !value) next.canEditVetVisits = false;
      if (key === 'canViewMedications' && !value) next.canEditMedications = false;
      if (key === 'canViewNotes' && !value) next.canEditNotes = false;
      return next;
    });
  };

  const handleSave = () => {
    mutation.mutate(
      { petId, shareId: share.id, permissions: perms },
      {
        onSuccess: onClose,
        onError: (err) => showError(getApiError(err)),
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Edit access — {share.sharedWithEmail}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose what this person can see and do.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
          {PERMISSION_PAIRS.map(({ viewKey, editKey, label }) => (
            <Box key={viewKey} sx={{ display: 'contents' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={perms[viewKey]}
                    onChange={() => toggle(viewKey, !perms[viewKey])}
                  />
                }
                label={<Typography sx={{ fontSize: '0.875rem' }}>View {label}</Typography>}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={perms[editKey]}
                    onChange={() => toggle(editKey, !perms[editKey])}
                  />
                }
                label={<Typography sx={{ fontSize: '0.875rem' }}>Edit {label}</Typography>}
              />
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
