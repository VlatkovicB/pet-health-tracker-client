export type PhotoSourceType = 'standalone' | 'vet-visit' | 'note';

export interface Photo {
  id: string;
  petId: string;
  ownerId: string;
  url: string;
  takenAt: string;
  caption?: string;
  sourceType: PhotoSourceType;
  sourceId?: string;
  createdAt: string;
  pet?: { id: string; name: string };
}

export type PhotoTimeline = Record<string, Record<string, Photo[]>>;
