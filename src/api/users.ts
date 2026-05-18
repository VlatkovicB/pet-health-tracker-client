import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from './client';
import type { User, UserLimits } from '../types';

export const usersApi = {
  getMe: () => apiClient.get<User>('/users/me').then((r) => r.data),
  updateTheme: (theme: 'light' | 'dark') =>
    apiClient.patch<{ theme: 'light' | 'dark' }>('/users/me', { theme }).then((r) => r.data),
  getLimits: () => apiClient.get<UserLimits>('/users/me/limits').then((r) => r.data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.patch<{ ok: boolean }>('/users/me/password', data).then((r) => r.data),
};

export function useMyLimits() {
  return useQuery({
    queryKey: ['me', 'limits'],
    queryFn: usersApi.getLimits,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: usersApi.changePassword,
  });
}
