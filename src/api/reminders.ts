import { apiClient } from './client';
import type { Reminder, ReminderScheduleProps } from '../types';

export const remindersApi = {
  getMedicationReminder: (medicationId: string): Promise<Reminder | null> =>
    apiClient
      .get<Reminder>(`/medications/${medicationId}/reminder`)
      .then((r) => r.data)
      .catch((err) => {
        if (err.response?.status === 404) return null;
        throw err;
      }),

  configureMedicationReminder: (
    medicationId: string,
    data: { schedule: ReminderScheduleProps; enabled: boolean },
  ) => apiClient.put(`/medications/${medicationId}/reminder`, data),

  getVetVisitReminder: (petId: string, visitId: string): Promise<Reminder | null> =>
    apiClient
      .get<Reminder>(`/pets/${petId}/vet-visits/${visitId}/reminder`)
      .then((r) => r.data)
      .catch((err) => {
        if (err.response?.status === 404) return null;
        throw err;
      }),

  configureVetVisitReminder: (
    petId: string,
    visitId: string,
    data: { schedule: ReminderScheduleProps; enabled: boolean },
  ) => apiClient.put(`/pets/${petId}/vet-visits/${visitId}/reminder`, data),
};
