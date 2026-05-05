import { useState } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Drawer, IconButton, Divider, Grid, Paper, Button, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions,
  TextField, CircularProgress, Pagination,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import {
  useAdminUsers, useAdminUser, useUpdateRole,
  useUpsertLimits, useDeleteUser,
} from '../../api/admin';
import type { AdminUser } from '../../types';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Stat card used in drawer ──────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, textAlign: 'center' }}>
      <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>{value}</Typography>
    </Paper>
  );
}

// ── Edit limits dialog ────────────────────────────────────────────────────────
interface LimitField {
  key: keyof LimitFormState;
  label: string;
}
interface LimitFormState {
  maxPets: string;
  maxVets: string;
  maxMedications: string;
  maxNotes: string;
  maxStorageBytes: string;
  maxPlacesSearchesMonthly: string;
}
const LIMIT_FIELDS: LimitField[] = [
  { key: 'maxPets',                  label: 'Max pets' },
  { key: 'maxVets',                  label: 'Max vets' },
  { key: 'maxMedications',           label: 'Max medications' },
  { key: 'maxNotes',                 label: 'Max notes' },
  { key: 'maxStorageBytes',          label: 'Max storage (bytes)' },
  { key: 'maxPlacesSearchesMonthly', label: 'Max Places searches/month' },
];

function EditLimitsDialog({
  userId,
  currentLimits,
  open,
  onClose,
}: {
  userId: string;
  currentLimits: AdminUser['limits'];
  open: boolean;
  onClose: () => void;
}) {
  const { mutate, isPending } = useUpsertLimits();
  const [form, setForm] = useState<LimitFormState>({
    maxPets:                  currentLimits?.pets?.max != null         ? String(currentLimits.pets?.max)                  : '',
    maxVets:                  currentLimits?.vets?.max != null         ? String(currentLimits.vets?.max)                  : '',
    maxMedications:           currentLimits?.medications?.max != null  ? String(currentLimits.medications?.max)           : '',
    maxNotes:                 currentLimits?.notes?.max != null        ? String(currentLimits.notes?.max)                 : '',
    maxStorageBytes:          currentLimits?.storage?.maxBytes != null ? String(currentLimits.storage?.maxBytes)          : '',
    maxPlacesSearchesMonthly: currentLimits?.placesSearches?.max != null ? String(currentLimits.placesSearches?.max)      : '',
  });

  const handleSave = () => {
    const limits: Record<string, number | null> = {};
    for (const { key } of LIMIT_FIELDS) {
      const val = form[key].trim();
      limits[key] = val === '' ? null : Number(val);
    }
    mutate({ userId, limits }, { onSuccess: onClose });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit limits</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
        <DialogContentText sx={{ fontSize: '0.8rem' }}>
          Leave blank to use the system default.
        </DialogContentText>
        {LIMIT_FIELDS.map(({ key, label }) => (
          <TextField
            key={key}
            label={label}
            type="number"
            size="small"
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            placeholder="default"
            slotProps={{ htmlInput: { min: 0 } }}
          />
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={isPending}>
          {isPending ? <CircularProgress size={18} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Delete confirm dialog ─────────────────────────────────────────────────────
function DeleteConfirmDialog({
  user,
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  user: AdminUser;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle>Delete {user.name}?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will permanently delete <strong>{user.name}</strong> and all their data (pets, photos, health records, notes). This cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={isPending}>
          {isPending ? <CircularProgress size={18} /> : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── User detail drawer ────────────────────────────────────────────────────────
function UserDrawer({
  userId,
  onClose,
  currentUserId,
}: {
  userId: string;
  onClose: () => void;
  currentUserId: string;
}) {
  const { data: user, isLoading } = useAdminUser(userId);
  const { mutate: updateRole, isPending: rolePending } = useUpdateRole();
  const { mutate: deleteUser, isPending: deletePending } = useDeleteUser();
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading || !user) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const isSelf = user.id === currentUserId;
  const isAdmin = user.role === 'admin';

  const handleDelete = () => {
    deleteUser(user.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        onClose();
      },
    });
  };

  return (
    <Box sx={{ width: 380, p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>{user.name}</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{user.email}</Typography>
          <Chip
            label={user.role}
            size="small"
            color={isAdmin ? 'primary' : 'default'}
            sx={{ mt: 0.5 }}
          />
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </Box>

      <Divider />

      {/* Stats grid */}
      <Box>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
          Stats
        </Typography>
        <Grid container spacing={1}>
          {[
            { label: 'Pets',        value: user.stats.pets },
            { label: 'Vets',        value: user.stats.vets },
            { label: 'Visits',      value: user.stats.vetVisits },
            { label: 'Meds',        value: user.stats.medications },
            { label: 'Notes',       value: user.stats.notes },
            { label: 'Photos',      value: user.stats.photos },
            { label: 'Reminders',   value: user.stats.reminders },
            { label: 'Storage',     value: formatBytes(user.stats.storageUsedBytes) },
            { label: 'Places/mo',   value: user.stats.placesSearchesThisMonth },
          ].map(({ label, value }) => (
            <Grid size={{ xs: 4 }} key={label}>
              <StatCard label={label} value={value} />
            </Grid>
          ))}
        </Grid>
      </Box>

      <Divider />

      {/* Actions */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button variant="outlined" size="small" onClick={() => setLimitsOpen(true)}>
          Edit limits
        </Button>
        <Button
          variant="outlined"
          size="small"
          disabled={isSelf || rolePending}
          onClick={() => updateRole({ userId: user.id, role: isAdmin ? 'user' : 'admin' })}
        >
          {rolePending ? <CircularProgress size={16} /> : isAdmin ? 'Demote to user' : 'Promote to admin'}
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="small"
          disabled={isSelf}
          onClick={() => setDeleteOpen(true)}
        >
          Delete user
        </Button>
        {isSelf && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>
            Cannot modify your own account.
          </Typography>
        )}
      </Box>

      {/* Dialogs */}
      <EditLimitsDialog
        userId={user.id}
        currentLimits={user.limits}
        open={limitsOpen}
        onClose={() => setLimitsOpen(false)}
      />
      <DeleteConfirmDialog
        user={user}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        isPending={deletePending}
      />
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminPage() {
  const { user: authUser } = useAuth();
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { data, isLoading } = useAdminUsers(page);

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Table area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', mb: 2 }}>
          Users
        </Typography>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
              <TableHead>
                <TableRow>
                  {['User', 'Pets', 'Vets', 'Meds', 'Notes', 'Photos', 'Storage', 'Places/mo', 'Role'].map((col) => (
                    <TableCell key={col} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.disabled', textTransform: 'uppercase' }}>
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.map((u: AdminUser) => (
                  <TableRow
                    key={u.id}
                    hover
                    selected={u.id === selectedUserId}
                    onClick={() => setSelectedUserId(u.id === selectedUserId ? null : u.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{u.name}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>{u.email}</Typography>
                    </TableCell>
                    <TableCell>{u.stats.pets}</TableCell>
                    <TableCell>{u.stats.vets}</TableCell>
                    <TableCell>{u.stats.medications}</TableCell>
                    <TableCell>{u.stats.notes}</TableCell>
                    <TableCell>{u.stats.photos}</TableCell>
                    <TableCell>{formatBytes(u.stats.storageUsedBytes)}</TableCell>
                    <TableCell>{u.stats.placesSearchesThisMonth}</TableCell>
                    <TableCell>
                      <Chip
                        label={u.role}
                        size="small"
                        color={u.role === 'admin' ? 'primary' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Detail drawer */}
      <Drawer
        anchor="right"
        variant="persistent"
        open={!!selectedUserId}
        sx={{
          '& .MuiDrawer-paper': {
            width: 380,
            position: 'relative',
            boxSizing: 'border-box',
            borderLeft: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {selectedUserId && (
          <UserDrawer
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
            currentUserId={authUser?.id ?? '__unknown__'}
          />
        )}
      </Drawer>
    </Box>
  );
}
