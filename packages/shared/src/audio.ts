export interface AudioItem {
  id: string;
  name: string;
  mime: 'audio/mpeg' | 'audio/wav' | 'audio/ogg' | 'audio/mp4' | 'audio/webm';
  size: number;
  createdAt: string;
}

export const AUDIO_LIMITS = {
  items: 100,
  bytes: 25 * 1024 * 1024,
  name: 120,
} as const;
