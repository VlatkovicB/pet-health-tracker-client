import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { AdminUser } from '../types';

interface PaginatedResult<T> {
  items: T[];
  total: number;
  nextPage: number | null;
}

type LimitOverrides = Partial<{
  maxPets: number | null;
  maxVets: number | null;
  maxMedications: number | null;
  maxNotes: number | null;
  maxStorageBytes: number | null;
  maxPlacesSearchesMonthly: number | null;
}>;

export const adminApi = {
  listUsers: (page = 1, limit = 20) =>
    apiClient.get<PaginatedResult<AdminUser>>('/admin/users', { params: { page, limit } }).then((r) => r.data),

  getUser: (userId: string) =>
    apiClient.get<AdminUser>(`/admin/users/${userId}`).then((r) => r.data),

  updateRole: (userId: string, role: 'user' | 'admin') =>
    apiClient.patch(`/admin/users/${userId}/role`, { role }).then((r) => r.data),

  upsertLimits: (userId: string, limits: LimitOverrides) =>
    apiClient.put(`/admin/users/${userId}/limits`, limits).then((r) => r.data),

  deleteUser: (userId: string) =>
    apiClient.delete(`/admin/users/${userId}`).then((r) => r.data),
};

export function useAdminUsers(page = 1) {
  return useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () => adminApi.listUsers(page),
  });
}

export function useAdminUser(userId: string | null) {
  return useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: () => adminApi.getUser(userId!),
    enabled: !!userId,
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'user' | 'admin' }) =>
      adminApi.updateRole(userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpsertLimits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, limits }: { userId: string; limits: LimitOverrides }) =>
      adminApi.upsertLimits(userId, limits),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users', userId] });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
