import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { PetShare, SharedPet, SharePermissions } from '../types';

export const sharesApi = {
  listForPet: (petId: string): Promise<PetShare[]> =>
    apiClient.get(`/pets/${petId}/shares`).then((r) => r.data),

  create: (petId: string, data: { email: string; permissions: Partial<SharePermissions> }): Promise<PetShare> =>
    apiClient.post(`/pets/${petId}/shares`, data).then((r) => r.data),

  update: (petId: string, shareId: string, permissions: Partial<SharePermissions>): Promise<PetShare> =>
    apiClient.put(`/pets/${petId}/shares/${shareId}`, permissions).then((r) => r.data),

  revoke: (petId: string, shareId: string): Promise<void> =>
    apiClient.delete(`/pets/${petId}/shares/${shareId}`).then(() => undefined),

  listPending: (): Promise<PetShare[]> =>
    apiClient.get('/shares/pending').then((r) => r.data),

  accept: (shareId: string): Promise<void> =>
    apiClient.patch(`/shares/${shareId}/accept`).then(() => undefined),

  decline: (shareId: string): Promise<void> =>
    apiClient.patch(`/shares/${shareId}/decline`).then(() => undefined),

  listSharedWithMe: (): Promise<SharedPet[]> =>
    apiClient.get('/pets/shared-with-me').then((r) => r.data),
};

export function useListPetShares(petId: string | undefined) {
  return useQuery({
    queryKey: ['petShares', petId],
    queryFn: () => sharesApi.listForPet(petId!),
    enabled: !!petId,
  });
}

export function useSharePet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, email, permissions }: { petId: string; email: string; permissions: Partial<SharePermissions> }) =>
      sharesApi.create(petId, { email, permissions }),
    onSuccess: (_data, { petId }) => {
      qc.invalidateQueries({ queryKey: ['petShares', petId] });
    },
  });
}

export function useUpdateSharePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, shareId, permissions }: { petId: string; shareId: string; permissions: Partial<SharePermissions> }) =>
      sharesApi.update(petId, shareId, permissions),
    onSuccess: (_data, { petId }) => {
      qc.invalidateQueries({ queryKey: ['petShares', petId] });
    },
  });
}

export function useRevokeShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, shareId }: { petId: string; shareId: string }) =>
      sharesApi.revoke(petId, shareId),
    onSuccess: (_data, { petId }) => {
      qc.invalidateQueries({ queryKey: ['petShares', petId] });
    },
  });
}

export function useListPendingShares() {
  return useQuery({
    queryKey: ['pendingShares'],
    queryFn: sharesApi.listPending,
  });
}

export function useAcceptShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => sharesApi.accept(shareId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pendingShares'] });
      qc.invalidateQueries({ queryKey: ['sharedPets'] });
    },
  });
}

export function useDeclineShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => sharesApi.decline(shareId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pendingShares'] });
    },
  });
}

export function useListSharedPets() {
  return useQuery({
    queryKey: ['sharedPets'],
    queryFn: sharesApi.listSharedWithMe,
  });
}
