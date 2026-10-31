// JSON tabanlı yerel kayıt: data/state.json. Atomik yazım (geçici dosya + rename), geciktirilmiş kaydetme.
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_STATE, sanitizeState } from '../../../packages/shared/src/index.ts';
import type { StatePatch, StudioState } from '../../../packages/shared/src/index.ts';

export interface Store {
  get(): StudioState;
  /** Yamayı doğrulayıp uygular. Değişiklik olduysa yeni durumu, olmadıysa null döner. */
  patch(patch: StatePatch): StudioState | null;
  flush(): void;
}

export function createStore(dataDir: string): Store {
  const file = path.join(dataDir, 'state.json');
  fs.mkdirSync(dataDir, { recursive: true });

  let state = load();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;

  function load(): StudioState {
    if (!fs.existsSync(file)) return { ...DEFAULT_STATE };
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const loaded = sanitizeState(raw, DEFAULT_STATE);
      loaded.rev = typeof raw?.rev === 'number' && raw.rev >= 0 ? Math.trunc(raw.rev) : 0;
      return loaded;
    } catch (err) {
      const backup = `${file}.bozuk-${Date.now()}`;
      try {
        fs.renameSync(file, backup);
      } catch {
        /* yedeklenemedi */
      }
      console.warn(`[kayıt] state.json okunamadı (${(err as Error).message}); varsayılanlar yüklendi, eski dosya: ${backup}`);
      return { ...DEFAULT_STATE };
    }
  }

  function write() {
    timer = undefined;
    if (!dirty) return;
    dirty = false;
    const tmp = `${file}.tmp`;
    try {
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
      fs.renameSync(tmp, file);
    } catch (err) {
      console.error(`[kayıt] yazılamadı: ${(err as Error).message}`);
    }
  }

  return {
    get: () => state,
    patch(patch) {
      const next = sanitizeState(patch, state);
      if (JSON.stringify({ ...next, rev: 0 }) === JSON.stringify({ ...state, rev: 0 })) return null;
      next.rev = state.rev + 1;
      state = next;
      dirty = true;
      timer ??= setTimeout(write, 300);
      return state;
    },
    flush() {
      clearTimeout(timer);
      write();
    },
  };
}
