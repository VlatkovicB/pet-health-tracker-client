import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { PetOwnershipTransfer } from '../types';

export const transfersApi = {
  listPending: (): Promise<PetOwnershipTransfer[]> =>
    apiClient.get('/pet-ownership-transfers/pending').then((r) => r.data),

  initiate: (petId: string, email: string): Promise<PetOwnershipTransfer> =>
    apiClient.post(`/pets/${petId}/transfer`, { email }).then((r) => r.data),

  cancel: (petId: string): Promise<void> =>
    apiClient.delete(`/pets/${petId}/transfer`).then(() => undefined),

  accept: (transferId: string, retainAccessForOriginalOwner: boolean): Promise<void> =>
    apiClient.patch(`/pet-ownership-transfers/${transferId}/accept`, { retainAccessForOriginalOwner }).then(() => undefined),

  decline: (transferId: string): Promise<void> =>
    apiClient.patch(`/pet-ownership-transfers/${transferId}/decline`).then(() => undefined),
};

export function useListPendingTransfers() {
  return useQuery({
    queryKey: ['pendingTransfers'],
    queryFn: transfersApi.listPending,
  });
}

export function useInitiateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, email }: { petId: string; email: string }) =>
      transfersApi.initiate(petId, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pets'] });
    },
  });
}

export function useCancelTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (petId: string) => transfersApi.cancel(petId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pets'] });
    },
  });
}

export function useAcceptTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transferId, retainAccess }: { transferId: string; retainAccess: boolean }) =>
      transfersApi.accept(transferId, retainAccess),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pendingTransfers'] });
      qc.invalidateQueries({ queryKey: ['sharedPets'] });
      qc.invalidateQueries({ queryKey: ['pets'] });
    },
  });
}

export function useDeclineTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transferId: string) => transfersApi.decline(transferId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pendingTransfers'] });
    },
  });
}
