import { apiClient } from './client';

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    apiClient.post<{ ok: boolean }>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<{ ok: boolean }>('/auth/login', data).then((r) => r.data),

  logout: () =>
    apiClient.post<{ ok: boolean }>('/auth/logout').then((r) => r.data),
};
