import fs from 'node:fs';
import path from 'node:path';
import { POEM_LIBRARY_LIMITS } from '../../../packages/shared/src/index.ts';
import type { PoemEntry } from '../../../packages/shared/src/index.ts';

export interface PoemStore {
  get(): PoemEntry[];
  replace(input: unknown): PoemEntry[];
  flush(): void;
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  // Satır sonlarını koru; diğer kontrol karakterlerini temizle.
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ').slice(0, max);
}

function sanitize(input: unknown): PoemEntry[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const result: PoemEntry[] = [];
  for (const raw of input.slice(0, POEM_LIBRARY_LIMITS.entries)) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    const id = typeof item.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(item.id) ? item.id : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const createdAt = typeof item.createdAt === 'string' ? item.createdAt.slice(0, 40) : '';
    const updatedAt = typeof item.updatedAt === 'string' ? item.updatedAt.slice(0, 40) : '';
    result.push({
      id,
      title: cleanText(item.title, POEM_LIBRARY_LIMITS.title),
      poet: cleanText(item.poet, POEM_LIBRARY_LIMITS.poet),
      body: cleanText(item.body, POEM_LIBRARY_LIMITS.body),
      notes: cleanText(item.notes, POEM_LIBRARY_LIMITS.notes),
      createdAt,
      updatedAt,
    });
  }
  return result;
}

export function createPoemStore(dataDir: string): PoemStore {
  const file = path.join(dataDir, 'poems.json');
  let poems = load();
  let dirty = false;

  function load(): PoemEntry[] {
    if (!fs.existsSync(file)) return [];
    try {
      return sanitize(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch (err) {
      const backup = `${file}.bozuk-${Date.now()}`;
      try { fs.renameSync(file, backup); } catch { /* yedeklenemedi */ }
      console.warn(`[şiir kütüphanesi] poems.json okunamadı (${(err as Error).message}); boş kütüphane açıldı, eski dosya: ${backup}`);
      return [];
    }
  }

  function write() {
    if (!dirty) return;
    dirty = false;
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(poems, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  }

  return {
    get: () => poems,
    replace(input) {
      poems = sanitize(input);
      dirty = true;
      write();
      return poems;
    },
    flush: write,
  };
}
