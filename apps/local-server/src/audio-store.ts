import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AUDIO_LIMITS } from '../../../packages/shared/src/index.ts';
import type { AudioItem } from '../../../packages/shared/src/index.ts';

const EXTENSIONS: Record<AudioItem['mime'], string> = {
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/webm': '.webm',
};

export interface AudioStore {
  list(): AudioItem[];
  add(name: string, mime: string, data: Buffer): AudioItem;
  remove(id: string): boolean;
  read(id: string): { item: AudioItem; data: Buffer } | null;
}

function validId(id: string): boolean {
  return /^[a-f0-9-]{36}$/.test(id);
}

export function createAudioStore(dataDir: string): AudioStore {
  const audioDir = path.join(dataDir, 'audio');
  const indexFile = path.join(dataDir, 'audio.json');
  fs.mkdirSync(audioDir, { recursive: true });
  let items = load();

  function fileFor(item: AudioItem): string {
    return path.join(audioDir, item.id + EXTENSIONS[item.mime]);
  }

  function load(): AudioItem[] {
    try {
      const raw: unknown = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      if (!Array.isArray(raw)) return [];
      return raw.filter((value): value is AudioItem => {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
        const item = value as Record<string, unknown>;
        return typeof item.id === 'string' && validId(item.id)
          && typeof item.name === 'string'
          && typeof item.mime === 'string' && item.mime in EXTENSIONS
          && typeof item.size === 'number'
          && typeof item.createdAt === 'string'
          && fs.existsSync(path.join(audioDir, item.id + EXTENSIONS[item.mime as AudioItem['mime']]));
      }).slice(0, AUDIO_LIMITS.items);
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
      if (!(mime in EXTENSIONS)) throw new Error('desteklenmeyen ses türü');
      if (data.length === 0 || data.length > AUDIO_LIMITS.bytes) throw new Error('ses dosyası boyutu geçersiz');
      if (items.length >= AUDIO_LIMITS.items) throw new Error('müzik sınırı doldu');
      const cleanName = name.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, AUDIO_LIMITS.name) || 'Fon müziği';
      const item: AudioItem = {
        id: crypto.randomUUID(),
        name: cleanName,
        mime: mime as AudioItem['mime'],
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
