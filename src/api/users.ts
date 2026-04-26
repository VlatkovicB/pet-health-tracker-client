import { apiClient } from './client';

export const usersApi = {
  getMe: () => apiClient.get<{ id: string; name: string; email: string; theme: 'light' | 'dark'; createdAt: string }>('/users/me').then((r) => r.data),
  updateTheme: (theme: 'light' | 'dark') =>
    apiClient.patch<{ theme: 'light' | 'dark' }>('/users/me', { theme }).then((r) => r.data),
};
