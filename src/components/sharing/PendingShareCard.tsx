import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { Share } from '@mui/icons-material';
import type { PetShare } from '../../types';

interface Props {
  share: PetShare;
  onAccept: () => void;
  onDecline: () => void;
  accepting: boolean;
  declining: boolean;
}

export function PendingShareCard({ share, onAccept, onDecline, accepting, declining }: Props) {
  const busy = accepting || declining;
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
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 40, height: 40, borderRadius: 1.5, flexShrink: 0,
          bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Share sx={{ color: 'primary.main', fontSize: 20 }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.9375rem', color: 'text.primary' }} noWrap>
          {share.petName}
        </Typography>
        <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary', mt: 0.25 }} noWrap>
          Shared by {share.sharedByEmail}
        </Typography>
      </Box>

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
          onClick={onAccept}
          disabled={busy}
        >
          {accepting ? <CircularProgress size={14} sx={{ color: 'white' }} /> : 'Accept'}
        </Button>
      </Box>
    </Box>
  );
}
