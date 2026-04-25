import { useState } from 'react';
import { Box, Button, Typography, Switch, FormControlLabel, CircularProgress, Collapse } from '@mui/material';
import { KeyboardDoubleArrowRight } from '@mui/icons-material';
import type { PetOwnershipTransfer } from '../../types';

interface Props {
  transfer: PetOwnershipTransfer;
  onAccept: (retainAccess: boolean) => void;
  onDecline: () => void;
  accepting: boolean;
  declining: boolean;
}

export function PendingTransferCard({ transfer, onAccept, onDecline, accepting, declining }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [retainAccess, setRetainAccess] = useState(false);
  const busy = accepting || declining;

  const expiryDate = new Date(transfer.expiresAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  });

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        p: 2,
        mb: 1.25,
        boxShadow: (t) => t.palette.mode === 'dark'
          ? '0 2px 12px rgba(0,0,0,0.25)'
          : '0 2px 12px rgba(108,99,255,0.08)',
        border: '1px solid',
        borderColor: (t) => t.palette.mode === 'dark' ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: 1.5, flexShrink: 0,
            bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <KeyboardDoubleArrowRight sx={{ color: 'primary.main', fontSize: 20 }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.9375rem', color: 'text.primary' }} noWrap>
            {transfer.petName}
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary', mt: 0.25 }} noWrap>
            Ownership transfer from {transfer.fromUserEmail} · expires {expiryDate}
          </Typography>
        </Box>

        {!confirming && (
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <Button
              size="small"
              onClick={onDecline}
              disabled={busy}
              sx={{ color: 'text.secondary', fontWeight: 700 }}
            >
              {declining ? <CircularProgress size={14} /> : 'Decline'}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => setConfirming(true)}
              disabled={busy}
            >
              Accept
            </Button>
          </Box>
        )}
      </Box>

      <Collapse in={confirming}>
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={retainAccess}
                onChange={(e) => setRetainAccess(e.target.checked)}
              />
            }
            label={
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.secondary' }}>
                Keep original owner's access after transfer
              </Typography>
            }
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5, justifyContent: 'flex-end' }}>
            <Button size="small" onClick={() => setConfirming(false)} disabled={busy} sx={{ color: 'text.secondary' }}>
              Back
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => onAccept(retainAccess)}
              disabled={busy}
            >
              {accepting ? <CircularProgress size={14} sx={{ color: 'white' }} /> : 'Confirm accept'}
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
