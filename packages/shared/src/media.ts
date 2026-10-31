export interface MediaItem {
  id: string;
  name: string;
  mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4' | 'video/webm';
  size: number;
  createdAt: string;
}

export const MEDIA_LIMITS = {
  items: 100,
  bytes: 30 * 1024 * 1024,
  name: 120,
} as const;
