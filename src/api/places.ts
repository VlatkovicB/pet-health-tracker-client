import { apiClient } from './client';
import type { VetWorkHours } from '../types';

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
}

export interface PlaceDetails {
  name: string;
  address: string;
  phone?: string;
  workHours?: VetWorkHours[];
  rating?: number;
  googleMapsUrl?: string;
}

export const placesApi = {
  search: (q: string) =>
    apiClient.get<PlaceSearchResult[]>('/places/search', { params: { q } }).then((r) => r.data),

  details: (placeId: string) =>
    apiClient.get<PlaceDetails>('/places/details', { params: { placeId } }).then((r) => r.data),
};
