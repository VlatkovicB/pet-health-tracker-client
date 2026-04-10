import { apiClient } from './client';
import type { AuthTokens } from '../types';

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    apiClient.post<AuthTokens>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthTokens>('/auth/login', data).then((r) => r.data),
};
