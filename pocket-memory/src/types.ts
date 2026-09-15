export type ItemType = 'text' | 'image' | 'video' | 'audio' | 'link';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export type CategoryKind = 'base' | 'custom' | 'uncategorized';

export type VideoKind = 'own' | 'social';

export type TypeFilter = 'all' | ItemType;

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
}

export interface MemoryItem {
  id: string;
  type: ItemType;
  createdAt: number;
  categoryId: string;
  classifying: boolean;
  syncStatus: SyncStatus;
  text?: string;
  mediaUri?: string;
  thumbnailUri?: string;
  durationMs?: number;
  imageCount?: number;
  extraImageUris?: string[];
  videoKind?: VideoKind;
  url?: string;
  title?: string;
  caption?: string;
  author?: string;
  sourceApp?: string;
  coverUri?: string;
  parseIncomplete?: boolean;
  transcript?: string;
}

export interface AppSettings {
  cloudEnabled: boolean;
}

export interface PersistedState {
  items: MemoryItem[];
  categories: Category[];
  settings: AppSettings;
}

export type CaptureKind = 'text' | 'photo' | 'album' | 'video' | 'audio' | 'link';
