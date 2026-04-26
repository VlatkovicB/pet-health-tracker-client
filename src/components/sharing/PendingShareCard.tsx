import { useState } from 'react';
import { Box, Button, Typography, CircularProgress, Tooltip, Chip } from '@mui/material';
import { InfoOutlined, Pets } from '@mui/icons-material';
import type { PetShare, SharePermissions } from '../../types';
import { SPECIES_AVATAR_BG, SPECIES_ICON_COLOR } from '../../utils/speciesStyles';

function daysAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return `${diff} days ago`;
}

function PermissionRows({ permissions }: { permissions: SharePermissions }) {
  const rows = [
    { label: 'Vet Visits',   view: permissions.canViewVetVisits,    edit: permissions.canEditVetVisits },
    { label: 'Medications',  view: permissions.canViewMedications,  edit: permissions.canEditMedications },
    { label: 'Notes',        view: permissions.canViewNotes,        edit: permissions.canEditNotes },
  ];
  return (
    <Box sx={{ p: 0.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '1.5px', textTransform: 'uppercase', mb: 1 }}>
        Permissions
      </Typography>
      {rows.map(({ label, view, edit }) => (
        <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, width: 86, color: 'text.secondary', flexShrink: 0 }}>
            {label}
          </Typography>
          <Chip
            label="View"
            size="small"
            variant={view ? 'filled' : 'outlined'}
            color={view ? 'success' : 'default'}
            sx={{ fontSize: '0.6875rem', height: 20, opacity: view ? 1 : 0.3 }}
          />
          <Chip
            label="Edit"
            size="small"
            variant={edit ? 'filled' : 'outlined'}
            color={edit ? 'success' : 'default'}
            sx={{ fontSize: '0.6875rem', height: 20, opacity: edit ? 1 : 0.3 }}
          />
        </Box>
      ))}
    </Box>
  );
}

interface Props {
  share: PetShare;
  onAccept: () => void;
  onDecline: () => void;
  accepting: boolean;
  declining: boolean;
}

export function PendingShareCard({ share, onAccept, onDecline, accepting, declining }: Props) {
  const busy = accepting || declining;
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const speciesKey = share.petSpecies.toLowerCase();
  const avatarBg = SPECIES_AVATAR_BG[speciesKey] ?? '#e0f2fe';
  const iconColor = SPECIES_ICON_COLOR[speciesKey] ?? '#60a5fa';

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
      {/* Species avatar */}
      <Box
        sx={{
          width: 40, height: 40, borderRadius: 1.5, flexShrink: 0,
          bgcolor: avatarBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Pets sx={{ color: iconColor, fontSize: 22 }} />
      </Box>

      {/* Pet name + metadata */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.9375rem', color: 'text.primary' }} noWrap>
          {share.petName}
        </Typography>
        <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary', mt: 0.25 }} noWrap>
          {share.sharedByEmail} · {daysAgo(share.createdAt)}
        </Typography>
      </Box>

      {/* Permissions tooltip */}
      <Tooltip
        title={<PermissionRows permissions={share.permissions} />}
        placement="top"
        open={tooltipOpen}
        onClose={() => setTooltipOpen(false)}
        disableHoverListener
        disableFocusListener
        arrow
      >
        <Box
          component="span"
          role="button"
          tabIndex={0}
          aria-label="Show permissions"
          onClick={() => setTooltipOpen((v) => !v)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setTooltipOpen((v) => !v); }}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <InfoOutlined sx={{ fontSize: 18, color: 'text.disabled' }} />
        </Box>
      </Tooltip>

      {/* Actions */}
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
