import { useState } from 'react';
import axios from 'axios';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Alert, CircularProgress, Box,
} from '@mui/material';
import { Warning } from '@mui/icons-material';
import { useInitiateTransfer, useCancelTransfer } from '../../api/transfers';
import { getApiError } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';

interface Props {
  open: boolean;
  onClose: () => void;
  petId: string;
  petName: string;
}

export function InitiateTransferDialog({ open, onClose, petId, petName }: Props) {
  const { showError } = useNotification();
  const [email, setEmail] = useState('');
  const [conflictError, setConflictError] = useState(false);
  const initiateMutation = useInitiateTransfer();
  const cancelMutation = useCancelTransfer();

  const handleClose = () => {
    setEmail('');
    setConflictError(false);
    onClose();
  };

  const handleSubmit = () => {
    setConflictError(false);
    initiateMutation.mutate(
      { petId, email },
      {
        onSuccess: handleClose,
        onError: (err) => {
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            setConflictError(true);
          } else {
            showError(getApiError(err));
          }
        },
      },
    );
  };

  const handleCancelExisting = () => {
    cancelMutation.mutate(petId, {
      onSuccess: () => {
        setConflictError(false);
        initiateMutation.reset();
      },
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Transfer ownership of {petName}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2, p: 1.5, bgcolor: 'warning.main', borderRadius: 1.5, opacity: 0.9 }}>
          <Warning sx={{ color: 'warning.contrastText', fontSize: 18, mt: 0.125 }} />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'warning.contrastText' }}>
            This transfers full ownership to the recipient. They have 7 days to accept.
          </Typography>
        </Box>

        {conflictError && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button
                size="small"
                color="inherit"
                onClick={handleCancelExisting}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? <CircularProgress size={12} /> : 'Cancel it'}
              </Button>
            }
          >
            A transfer is already pending for this pet.
          </Alert>
        )}

        <TextField
          label="Recipient email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          autoFocus
          disabled={initiateMutation.isPending}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={initiateMutation.isPending}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleSubmit}
          disabled={!email.trim() || initiateMutation.isPending}
        >
          {initiateMutation.isPending ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Transfer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
