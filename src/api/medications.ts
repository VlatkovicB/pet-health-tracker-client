import { apiClient } from './client';
import type { Medication, ReminderScheduleProps, AdvanceNotice } from '../types';

export interface CreateMedicationInput {
  name: string;
  dosageAmount: number;
  dosageUnit: string;
  schedule: ReminderScheduleProps;
  startDate: string;
  endDate?: string;
  notes?: string;
  reminder?: { enabled: boolean; advanceNotice?: AdvanceNotice };
}

export interface UpdateMedicationInput {
  name?: string;
  dosageAmount?: number;
  dosageUnit?: string;
  schedule?: ReminderScheduleProps;
  startDate?: string;
  endDate?: string | null;
  notes?: string | null;
  active?: boolean;
  reminder?: { enabled: boolean; advanceNotice?: AdvanceNotice };
}

export const medicationsApi = {
  list(petId: string): Promise<Medication[]> {
    return apiClient.get(`/pets/${petId}/medications`).then((r) => r.data);
  },

  create(petId: string, data: CreateMedicationInput): Promise<Medication> {
    return apiClient.post(`/pets/${petId}/medications`, data).then((r) => r.data);
  },

  update(petId: string, medicationId: string, data: UpdateMedicationInput): Promise<Medication> {
    return apiClient.put(`/pets/${petId}/medications/${medicationId}`, data).then((r) => r.data);
  },
};
