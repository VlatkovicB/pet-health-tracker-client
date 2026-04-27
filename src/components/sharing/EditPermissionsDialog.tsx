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
  // edit mode
  share?: PetShare;
  petId?: string;
  // create mode
  mode?: 'create' | 'edit';
  email?: string;
  onConfirm?: (permissions: SharePermissions) => void;
  confirmPending?: boolean;
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

const DEFAULT_PERMISSIONS: SharePermissions = {
  canViewVetVisits: true,
  canEditVetVisits: false,
  canViewMedications: true,
  canEditMedications: false,
  canViewNotes: true,
  canEditNotes: false,
};

export function EditPermissionsDialog({ open, onClose, share, petId, mode, email, onConfirm, confirmPending }: Props) {
  const { showError } = useNotification();
  const isCreate = mode === 'create';
  const [perms, setPerms] = useState<SharePermissions>(
    isCreate ? { ...DEFAULT_PERMISSIONS } : { ...share!.permissions },
  );
  const mutation = useUpdateSharePermissions();

  const toggle = (key: keyof SharePermissions, value: boolean) => {
    setPerms((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'canEditVetVisits' && value) next.canViewVetVisits = true;
      if (key === 'canEditMedications' && value) next.canViewMedications = true;
      if (key === 'canEditNotes' && value) next.canViewNotes = true;
      if (key === 'canViewVetVisits' && !value) next.canEditVetVisits = false;
      if (key === 'canViewMedications' && !value) next.canEditMedications = false;
      if (key === 'canViewNotes' && !value) next.canEditNotes = false;
      return next;
    });
  };

  const handleSave = () => {
    if (isCreate) {
      onConfirm?.(perms);
      return;
    }
    mutation.mutate(
      { petId: petId!, shareId: share!.id, permissions: perms },
      {
        onSuccess: onClose,
        onError: (err) => showError(getApiError(err)),
      },
    );
  };

  const isPending = isCreate ? (confirmPending ?? false) : mutation.isPending;
  const displayEmail = isCreate ? email : share?.sharedWithEmail;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isCreate ? `Invite ${displayEmail}` : `Edit access — ${displayEmail}`}</DialogTitle>
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
        <Button onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={isPending}>
          {isPending
            ? <CircularProgress size={16} sx={{ color: 'white' }} />
            : isCreate ? 'Send invite' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
