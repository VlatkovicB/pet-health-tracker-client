import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, TextField, Typography, Dialog,
  DialogTitle, DialogContent, DialogActions, Card, CardContent, CardActionArea, Grid, Skeleton,
} from '@mui/material';
import { Add, Group, ChevronRight } from '@mui/icons-material';
import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../../api/groups';
import { getApiError } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

export function GroupsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['groups'],
    queryFn: ({ pageParam }) => groupsApi.list({ pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });

  const groups = data?.pages.flatMap((p) => p.items) ?? [];

  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); },
    hasNextPage,
  );

  const { showError } = useNotification();

  const mutation = useMutation({
    mutationFn: groupsApi.create,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setOpen(false);
      setName('');
      navigate(`/groups/${group.id}`);
    },
    onError: (err) => showError(getApiError(err)),
  });

  return (
    <Container maxWidth="md" sx={{ mt: 4, px: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">My Groups</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          New Group
        </Button>
      </Box>

      {isLoading ? (
        <Grid container spacing={2}>
          {[1, 2].map((i) => (
            <Grid size={{ xs: 12, sm: 6 }} key={i}>
              <Skeleton variant="rectangular" height={88} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : groups.length === 0 ? (
        <Card elevation={1}>
          <CardActionArea onClick={() => setOpen(true)} sx={{ py: 5, px: 3, textAlign: 'center' }}>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: '50%',
                bgcolor: 'primary.main', opacity: 0.12,
                mx: 'auto', mb: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            />
            <Box sx={{ position: 'relative', top: -48, mb: -4 }}>
              <Group sx={{ fontSize: 28, color: 'primary.main', mb: 1 }} />
              <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
                Create your first group
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Groups let you manage pets and share access with family members
              </Typography>
            </Box>
          </CardActionArea>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {groups.map((group) => (
            <Grid size={{ xs: 12, sm: 6 }} key={group.id}>
              <Card elevation={1} sx={{ '&:hover': { boxShadow: 4 } }}>
                <CardActionArea onClick={() => navigate(`/groups/${group.id}`)}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2.5 }}>
                    <Box
                      sx={{
                        width: 44, height: 44, borderRadius: 2, flexShrink: 0,
                        bgcolor: 'rgba(42,157,143,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Group sx={{ color: 'primary.main', fontSize: 22 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" noWrap>{group.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {group.members?.length ?? 0} member{(group.members?.length ?? 0) !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                    <ChevronRight sx={{ color: 'text.disabled', flexShrink: 0 }} />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <div ref={sentinelRef} />
      {isFetchingNextPage && (
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="rectangular" height={88} sx={{ borderRadius: 2 }} />
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New Group</DialogTitle>
        <DialogContent>
          <TextField
            label="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
            sx={{ mt: 1 }}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) mutation.mutate({ name }); }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={() => mutation.mutate({ name })}
            disabled={!name.trim() || mutation.isPending}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
