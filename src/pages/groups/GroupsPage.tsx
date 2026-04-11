import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, TextField, Typography, Dialog,
  DialogTitle, DialogContent, DialogActions, Card, CardContent, CardActionArea, Grid, Skeleton,
} from '@mui/material';
import { Add, Group } from '@mui/icons-material';
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
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Groups</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>New Group</Button>
      </Box>

      {isLoading ? (
        <Grid container spacing={2}>
          {[1, 2].map((i) => <Grid size={{ xs: 12, sm: 6 }} key={i}><Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} /></Grid>)}
        </Grid>
      ) : groups.length === 0 ? (
        <Card>
          <CardActionArea onClick={() => setOpen(true)}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">Create your first group to start tracking pets</Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {groups.map((group) => (
            <Grid size={{ xs: 12, sm: 6 }} key={group.id}>
              <Card>
                <CardActionArea onClick={() => navigate(`/groups/${group.id}`)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Group color="primary" />
                      <Box>
                        <Typography variant="h6">{group.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {group.members?.length ?? 0} member{(group.members?.length ?? 0) !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Box>
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
          <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
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
