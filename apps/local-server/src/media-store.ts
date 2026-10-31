import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { MEDIA_LIMITS } from '../../../packages/shared/src/index.ts';
import type { MediaItem } from '../../../packages/shared/src/index.ts';

const EXTENSIONS: Record<MediaItem['mime'], string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

export interface MediaStore {
  list(): MediaItem[];
  add(name: string, mime: string, data: Buffer): MediaItem;
  remove(id: string): boolean;
  read(id: string): { item: MediaItem; data: Buffer } | null;
}

function validId(id: string): boolean {
  return /^[a-f0-9-]{36}$/.test(id);
}

export function createMediaStore(dataDir: string): MediaStore {
  const mediaDir = path.join(dataDir, 'media');
  const indexFile = path.join(dataDir, 'media.json');
  fs.mkdirSync(mediaDir, { recursive: true });
  let items = load();

  function fileFor(item: MediaItem): string {
    return path.join(mediaDir, item.id + EXTENSIONS[item.mime]);
  }

  function load(): MediaItem[] {
    try {
      const raw: unknown = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      if (!Array.isArray(raw)) return [];
      return raw.filter((value): value is MediaItem => {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
        const item = value as Record<string, unknown>;
        return typeof item.id === 'string' && validId(item.id)
          && typeof item.name === 'string'
          && typeof item.mime === 'string' && item.mime in EXTENSIONS
          && typeof item.size === 'number'
          && typeof item.createdAt === 'string'
          && fs.existsSync(path.join(mediaDir, item.id + EXTENSIONS[item.mime as MediaItem['mime']]));
      }).slice(0, MEDIA_LIMITS.items);
    } catch {
      return [];
    }
  }

  function save() {
    const tmp = `${indexFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
    fs.renameSync(tmp, indexFile);
  }

  return {
    list: () => items,
    add(name, mime, data) {
      if (!(mime in EXTENSIONS)) throw new Error('desteklenmeyen görsel türü');
      if (data.length === 0 || data.length > MEDIA_LIMITS.bytes) throw new Error('görsel boyutu geçersiz');
      if (items.length >= MEDIA_LIMITS.items) throw new Error('görsel sınırı doldu');
      const cleanName = name.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MEDIA_LIMITS.name) || 'Görsel';
      const item: MediaItem = {
        id: crypto.randomUUID(),
        name: cleanName,
        mime: mime as MediaItem['mime'],
        size: data.length,
        createdAt: new Date().toISOString(),
      };
      fs.writeFileSync(fileFor(item), data);
      items = [item, ...items];
      save();
      return item;
    },
    remove(id) {
      if (!validId(id)) return false;
      const item = items.find((value) => value.id === id);
      if (!item) return false;
      try { fs.unlinkSync(fileFor(item)); } catch { /* dosya zaten yok olabilir */ }
      items = items.filter((value) => value.id !== id);
      save();
      return true;
    },
    read(id) {
      if (!validId(id)) return null;
      const item = items.find((value) => value.id === id);
      if (!item) return null;
      try { return { item, data: fs.readFileSync(fileFor(item)) }; } catch { return null; }
    },
  };
}
