import { useState } from 'react';
import {
  Box, Button, TextField, Typography, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useListPetShares, useSharePet, useRevokeShare } from '../../api/shares';
import { getApiError } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { EditPermissionsDialog } from './EditPermissionsDialog';
import { InitiateTransferDialog } from './InitiateTransferDialog';
import type { PetShare, SharePermissions } from '../../types';

interface Props {
  petId: string;
  petName: string;
}

function permissionSummary(share: PetShare): string {
  const parts: string[] = [];
  if (share.permissions.canViewVetVisits) parts.push(share.permissions.canEditVetVisits ? 'edit vet visits' : 'view vet visits');
  if (share.permissions.canViewMedications) parts.push(share.permissions.canEditMedications ? 'edit medications' : 'view medications');
  if (share.permissions.canViewNotes) parts.push(share.permissions.canEditNotes ? 'edit notes' : 'view notes');
  return parts.length > 0 ? parts.join(' · ') : 'no permissions';
}

export function SharingTab({ petId, petName }: Props) {
  const { showError } = useNotification();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [pendingInviteEmail, setPendingInviteEmail] = useState('');
  const [editShare, setEditShare] = useState<PetShare | null>(null);
  const [revokeShare, setRevokeShare] = useState<PetShare | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const { data: shares = [], isLoading } = useListPetShares(petId);
  const shareMutation = useSharePet();
  const revokeMutation = useRevokeShare();

  const handleShareClick = () => {
    if (!inviteEmail.trim()) return;
    setPendingInviteEmail(inviteEmail.trim());
    setInviteDialogOpen(true);
  };

  const handleInviteConfirm = (permissions: SharePermissions) => {
    shareMutation.mutate(
      { petId, email: pendingInviteEmail, permissions },
      {
        onSuccess: () => {
          setInviteEmail('');
          setInviteDialogOpen(false);
        },
        onError: (err) => showError(getApiError(err)),
      },
    );
  };

  const handleRevoke = () => {
    if (!revokeShare) return;
    revokeMutation.mutate(
      { petId, shareId: revokeShare.id },
      {
        onSuccess: () => setRevokeShare(null),
        onError: (err) => showError(getApiError(err)),
      },
    );
  };

  const accepted = shares.filter((s) => s.status === 'accepted');
  const pending = shares.filter((s) => s.status === 'pending');

  return (
    <Box>
      {/* Section 1: Invite */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: 1 }}>
          Invite someone
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleShareClick()}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleShareClick}
            disabled={!inviteEmail.trim()}
            size="small"
          >
            Share
          </Button>
        </Box>
      </Box>

      {/* Section 2: People with access */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '2px', textTransform: 'uppercase', mb: 1 }}>
          People with access {shares.length > 0 ? `(${shares.length})` : ''}
        </Typography>

        {isLoading ? (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        ) : shares.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No one has access yet.</Typography>
        ) : (
          <>
            {accepted.map((share) => (
              <Box
                key={share.id}
                sx={{
                  bgcolor: 'background.default', borderRadius: 1.5, p: 1.5, mb: 1,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'text.primary' }} noWrap>
                    {share.sharedWithEmail}
                  </Typography>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'primary.main', mt: 0.25 }}>
                    {permissionSummary(share)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                  <Button size="small" sx={{ fontWeight: 700, fontSize: '0.75rem', minWidth: 0, px: 1 }} onClick={() => setEditShare(share)}>
                    Edit
                  </Button>
                  <Button size="small" color="error" sx={{ fontWeight: 700, fontSize: '0.75rem', minWidth: 0, px: 1 }} onClick={() => setRevokeShare(share)}>
                    Revoke
                  </Button>
                </Box>
              </Box>
            ))}

            {pending.map((share) => (
              <Box
                key={share.id}
                sx={{
                  bgcolor: 'background.default', borderRadius: 1.5, p: 1.5, mb: 1,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1,
                  opacity: 0.7,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'text.primary' }} noWrap>
                      {share.sharedWithEmail}
                    </Typography>
                    <Chip label="Pending" size="small" sx={{ fontWeight: 800, fontSize: '0.6875rem', borderRadius: 5 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'primary.main', mt: 0.25 }}>
                    {permissionSummary(share)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                  <Button size="small" sx={{ fontWeight: 700, fontSize: '0.75rem', minWidth: 0, px: 1 }} onClick={() => setEditShare(share)}>
                    Edit
                  </Button>
                  <Button size="small" color="error" sx={{ fontWeight: 700, fontSize: '0.75rem', minWidth: 0, px: 1 }} onClick={() => setRevokeShare(share)}>
                    Revoke
                  </Button>
                </Box>
              </Box>
            ))}
          </>
        )}
      </Box>

      {/* Section 3: Danger zone */}
      <Box sx={{ borderTop: '1px solid rgba(239,68,68,0.3)', pt: 2, opacity: 0.8 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'error.main', letterSpacing: '2px', textTransform: 'uppercase', mb: 1 }}>
          Danger zone
        </Typography>
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={() => setTransferOpen(true)}
          fullWidth
        >
          Transfer Ownership…
        </Button>
      </Box>

      {/* Invite dialog */}
      {inviteDialogOpen && (
        <EditPermissionsDialog
          open
          onClose={() => setInviteDialogOpen(false)}
          mode="create"
          email={pendingInviteEmail}
          onConfirm={handleInviteConfirm}
          confirmPending={shareMutation.isPending}
        />
      )}

      {/* Edit permissions dialog */}
      {editShare && (
        <EditPermissionsDialog
          open
          onClose={() => setEditShare(null)}
          share={editShare}
          petId={petId}
        />
      )}

      {/* Revoke confirm dialog */}
      <Dialog open={!!revokeShare} onClose={() => setRevokeShare(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Revoke access?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {revokeShare?.sharedWithEmail} will lose access to {petName}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeShare(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleRevoke} disabled={revokeMutation.isPending}>
            {revokeMutation.isPending ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer ownership dialog */}
      <InitiateTransferDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        petId={petId}
        petName={petName}
      />
    </Box>
  );
}
