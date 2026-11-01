// MK LIVE PRO yerel sunucu: statik dosyalar (/studio, /overlay), API (/api) ve WebSocket (/ws).
// Yalnızca 127.0.0.1 üzerinde dinler.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { Duplex } from 'node:stream';
import { WebSocketServer, WebSocket } from 'ws';
import { MEDIA_LIMITS } from '../../../packages/shared/src/index.ts';
import type { ClientMessage, ServerMessage } from '../../../packages/shared/src/index.ts';
import { createStore } from './store.ts';
import { createPoemStore } from './poem-store.ts';
import { createMediaStore } from './media-store.ts';
import { createAudioStore } from './audio-store.ts';
import { createArenaQuestionStore } from './arena-question-store.ts';
import { createArenaStore } from './arena-store.ts';
import { LocalCommentProvider } from './comment-provider.ts';

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 4173;
const ROOT = path.resolve(import.meta.dirname, '../../..');
const DATA_DIR = process.env.MK_DATA_DIR ? path.resolve(process.env.MK_DATA_DIR) : path.join(ROOT, 'data');
const APPS: Record<string, string> = {
  '/studio': path.join(ROOT, 'apps/studio/dist'),
  '/overlay': path.join(ROOT, 'apps/overlay/dist'),
};
const MAX_BODY = 64 * 1024;
const MAX_LIBRARY_BODY = 12 * 1024 * 1024;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const store = createStore(DATA_DIR);
const poemStore = createPoemStore(DATA_DIR);
const mediaStore = createMediaStore(DATA_DIR);
const audioStore = createAudioStore(DATA_DIR);
const arenaQuestionStore = createArenaQuestionStore(DATA_DIR);
const arenaStore = createArenaStore(DATA_DIR, arenaQuestionStore);
const manualCommentProvider = new LocalCommentProvider('manual');
const demoCommentProvider = new LocalCommentProvider('demo');
manualCommentProvider.start(arenaStore.submitComment);
demoCommentProvider.start(arenaStore.submitComment);

// Opsiyonel: data/config.json -> { "overlayOrigins": ["https://proje.vercel.app"] }
// Bu adreslerden gelen bağlantılar yalnızca overlay (salt okunur) olarak kabul edilir.
function loadOverlayOrigins(): Set<string> {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'config.json'), 'utf8'));
    const list: unknown[] = Array.isArray(cfg.overlayOrigins) ? cfg.overlayOrigins : [];
    return new Set(list.filter((o): o is string => typeof o === 'string' && /^https:\/\/[^/\s]+$/.test(o)));
  } catch {
    return new Set();
  }
}
const overlayOrigins = loadOverlayOrigins();

// --- Güvenlik: DNS rebinding ve başka sitelerden gelen istekleri engelle -----
const allowedHosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const allowedOrigins = new Set([`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`]);

function hostOk(req: http.IncomingMessage): boolean {
  return allowedHosts.has(String(req.headers.host ?? '').toLowerCase());
}
function originOk(req: http.IncomingMessage): boolean {
  const origin = req.headers.origin;
  return origin === undefined || allowedOrigins.has(origin); // Origin yok = tarayıcı dışı yerel araç
}

// --- HTTP -------------------------------------------------------------------
function send(res: http.ServerResponse, status: number, body: string | Buffer, type = 'text/plain; charset=utf-8', extra: http.OutgoingHttpHeaders = {}) {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', ...extra });
  res.end(body);
}
const json = (res: http.ServerResponse, status: number, data: unknown) =>
  send(res, status, JSON.stringify(data), 'application/json; charset=utf-8');

function sendAudio(req: http.IncomingMessage, res: http.ServerResponse, data: Buffer, type: string) {
  const range = req.headers.range;
  if (!range) return send(res, 200, data, type, { 'Accept-Ranges': 'bytes', 'Content-Length': data.length });
  const match = /^bytes=(\d+)-(\d*)$/.exec(range);
  if (!match) return send(res, 416, 'Geçersiz aralık', 'text/plain; charset=utf-8', { 'Content-Range': `bytes */${data.length}` });
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), data.length - 1) : data.length - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= data.length) {
    return send(res, 416, 'Geçersiz aralık', 'text/plain; charset=utf-8', { 'Content-Range': `bytes */${data.length}` });
  }
  const chunk = data.subarray(start, end + 1);
  return send(res, 206, chunk, type, {
    'Accept-Ranges': 'bytes',
    'Content-Range': `bytes ${start}-${end}/${data.length}`,
    'Content-Length': chunk.length,
  });
}

function serveStatic(res: http.ServerResponse, mount: string, dir: string, urlPath: string) {
  let rel = urlPath.slice(mount.length);
  if (rel === '' || rel === '/') rel = '/index.html';
  let decoded: string;
  try {
    decoded = decodeURIComponent(rel);
  } catch {
    return send(res, 400, 'Geçersiz adres');
  }
  const full = path.resolve(dir, '.' + decoded);
  if (full !== dir && !full.startsWith(dir + path.sep)) return send(res, 403, 'Yasak');
  fs.readFile(full, (err, data) => {
    if (err) {
      const hint = fs.existsSync(dir) ? 'Bulunamadı' : 'Arayüz derlenmemiş. Önce "npm run build" çalıştırın.';
      return send(res, 404, hint);
    }
    const ext = path.extname(full).toLowerCase();
    const immutable = decoded.startsWith('/assets/'); // Vite çıktısı, dosya adında hash var
    res.writeHead(200, {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-store',
    });
    res.end(data);
  });
}

function readBuffer(req: http.IncomingMessage, maxSize = MAX_BODY): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > maxSize) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readBody(req: http.IncomingMessage, maxSize = MAX_BODY): Promise<string> {
  return (await readBuffer(req, maxSize)).toString('utf8');
}

const server = http.createServer(async (req, res) => {
  if (!hostOk(req)) return send(res, 403, 'Yasak');
  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);
  const p = url.pathname;

  if (p === '/api/health') return json(res, 200, { ok: true, rev: store.get().rev, clients: wss.clients.size });
  if (p === '/api/arena/questions') {
    if (!originOk(req)) return json(res, 403, { error: 'origin' });
    if (req.method === 'GET') return json(res, 200, arenaQuestionStore.get());
    if (req.method === 'PUT') {
      try {
        const questions = arenaQuestionStore.replace(JSON.parse(await readBody(req, MAX_LIBRARY_BODY)));
        broadcastArena();
        return json(res, 200, questions);
      } catch (err) {
        return json(res, 400, { error: (err as Error).message });
      }
    }
    return json(res, 405, { error: 'method' });
  }
  if (p === '/api/arena/questions/reset') {
    if (!originOk(req)) return json(res, 403, { error: 'origin' });
    if (req.method !== 'POST') return json(res, 405, { error: 'method' });
    const questions = arenaQuestionStore.reset();
    broadcastArena();
    return json(res, 200, questions);
  }
  if (p === '/api/poems') {
    if (!originOk(req)) return json(res, 403, { error: 'origin' });
    if (req.method === 'GET') return json(res, 200, poemStore.get());
    if (req.method === 'PUT') {
      try {
        return json(res, 200, poemStore.replace(JSON.parse(await readBody(req, MAX_LIBRARY_BODY))));
      } catch {
        return json(res, 400, { error: 'geçersiz şiir kütüphanesi' });
      }
    }
    return json(res, 405, { error: 'method' });
  }
  if (p === '/api/media') {
    if (!originOk(req)) return json(res, 403, { error: 'origin' });
    if (req.method === 'GET') return json(res, 200, mediaStore.list());
    if (req.method === 'POST') {
      try {
        const mime = String(req.headers['content-type'] ?? '').split(';')[0].toLowerCase();
        const rawName = String(req.headers['x-mk-filename'] ?? 'Görsel');
        let name = rawName;
        try { name = decodeURIComponent(rawName); } catch { /* ham adı kullan */ }
        const item = mediaStore.add(name, mime, await readBuffer(req, MEDIA_LIMITS.bytes));
        return json(res, 201, item);
      } catch (err) {
        return json(res, 400, { error: (err as Error).message });
      }
    }
    return json(res, 405, { error: 'method' });
  }
  if (p.startsWith('/api/media/')) {
    if (!originOk(req)) return json(res, 403, { error: 'origin' });
    const id = p.slice('/api/media/'.length);
    if (req.method === 'GET') {
      const media = mediaStore.read(id);
      return media
        ? media.item.mime.startsWith('video/') ? sendAudio(req, res, media.data, media.item.mime) : send(res, 200, media.data, media.item.mime)
        : send(res, 404, 'Görsel bulunamadı');
    }
    if (req.method === 'DELETE') {
      return mediaStore.remove(id) ? json(res, 200, { ok: true }) : json(res, 404, { error: 'bulunamadı' });
    }
    return json(res, 405, { error: 'method' });
  }
  if (p === '/api/audio') {
    if (!originOk(req)) return json(res, 403, { error: 'origin' });
    if (req.method === 'GET') return json(res, 200, audioStore.list());
    if (req.method === 'POST') {
      try {
        const mime = String(req.headers['content-type'] ?? '').split(';')[0].toLowerCase();
        const rawName = String(req.headers['x-mk-filename'] ?? 'Fon müziği');
        let name = rawName;
        try { name = decodeURIComponent(rawName); } catch { /* ham adı kullan */ }
        const item = audioStore.add(name, mime, await readBuffer(req, 25 * 1024 * 1024));
        return json(res, 201, item);
      } catch (err) {
        return json(res, 400, { error: (err as Error).message });
      }
    }
    return json(res, 405, { error: 'method' });
  }
  if (p.startsWith('/api/audio/')) {
    if (!originOk(req)) return json(res, 403, { error: 'origin' });
    const id = p.slice('/api/audio/'.length);
    if (req.method === 'GET') {
      const audio = audioStore.read(id);
      return audio ? sendAudio(req, res, audio.data, audio.item.mime) : send(res, 404, 'Ses dosyası bulunamadı');
    }
    if (req.method === 'DELETE') {
      return audioStore.remove(id) ? json(res, 200, { ok: true }) : json(res, 404, { error: 'bulunamadı' });
    }
    return json(res, 405, { error: 'method' });
  }
  if (p === '/api/state') {
    if (req.method === 'GET') return json(res, 200, store.get());
    if (req.method === 'PUT') {
      if (!originOk(req)) return json(res, 403, { error: 'origin' });
      try {
        const body = JSON.parse(await readBody(req));
        const next = store.patch(body);
        if (next) broadcast({ type: 'state', state: next });
        return json(res, 200, store.get());
      } catch {
        return json(res, 400, { error: 'geçersiz istek' });
      }
    }
    return json(res, 405, { error: 'method' });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Yöntem desteklenmiyor');
  if (p === '/') return send(res, 302, '', 'text/plain', { Location: '/studio' });
  for (const [mount, dir] of Object.entries(APPS)) {
    if (p === mount || p.startsWith(mount + '/')) return serveStatic(res, mount, dir, p);
  }
  send(res, 404, 'Bulunamadı');
});

// --- WebSocket --------------------------------------------------------------
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_BODY });
const socketRoles = new WeakMap<WebSocket, string>();

function broadcast(msg: ServerMessage) {
  const data = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === WebSocket.OPEN) c.send(data);
}

function sendArena(ws: WebSocket, role: string) {
  const msg: ServerMessage = role === 'studio'
    ? { type: 'arena:studio', arena: arenaStore.getStudio() }
    : { type: 'arena', arena: arenaStore.getPublic() };
  ws.send(JSON.stringify(msg));
}

function broadcastArena() {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) sendArena(client, socketRoles.get(client) ?? 'overlay');
  }
}

server.on('upgrade', (req: http.IncomingMessage, socket: Duplex, head: Buffer) => {
  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);
  const wsRole = url.searchParams.get('role');
  const origin = req.headers.origin;
  const originAllowed = originOk(req) || (wsRole === 'overlay' && origin !== undefined && overlayOrigins.has(origin));
  if (url.pathname !== '/ws' || !hostOk(req) || !originAllowed) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }
  const role = url.searchParams.get('role');
  wss.handleUpgrade(req, socket, head, (ws) => {
    socketRoles.set(ws, role ?? 'overlay');
    ws.send(JSON.stringify({ type: 'state', state: store.get() } satisfies ServerMessage));
    sendArena(ws, role ?? 'overlay');
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as ClientMessage;
        if (msg.type === 'media:get') {
          const media = mediaStore.read(msg.id);
          if (media) ws.send(JSON.stringify({ type: 'media', id: media.item.id, mime: media.item.mime, data: media.data.toString('base64') } satisfies ServerMessage));
          return;
        }
        if (msg.type === 'arena:command') {
          if (role !== 'studio') return;
          const command = msg.command;
          const commandResult = command.type === 'submit-comment'
            ? (command.source === 'demo' ? demoCommentProvider : manualCommentProvider).emit({
                eventId: command.eventId?.trim().slice(0, 160) || crypto.randomUUID(),
                userId: command.userId,
                displayName: command.displayName,
                comment: command.comment,
              })
            : arenaStore.command(command);
          if (!commandResult.ok) ws.send(JSON.stringify({ type: 'arena:error', message: commandResult.message } satisfies ServerMessage));
          broadcastArena();
          return;
        }
        // Yalnızca stüdyo yayın durumunu değiştirebilir; overlay salt okunur.
        if (role !== 'studio' || msg.type !== 'patch') return;
        const next = store.patch(msg.patch);
        if (next) broadcast({ type: 'state', state: next });
      } catch {
        /* bozuk mesajı yok say */
      }
    });
    ws.on('error', () => ws.terminate());
  });
});

const heartbeat = setInterval(() => broadcast({ type: 'hb' }), 15_000);
let arenaSignature = '';
const arenaTicker = setInterval(() => {
  arenaStore.tick();
  const arena = arenaStore.getPublic();
  const signature = `${arena.rev}:${arena.phase}:${arena.remainingSeconds}`;
  if (signature !== arenaSignature) {
    arenaSignature = signature;
    broadcastArena();
  }
}, 500);

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') console.error(`Port ${PORT} kullanımda. MK LIVE PRO zaten çalışıyor olabilir veya PORT ortam değişkeniyle başka port seçin.`);
  else console.error(err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('MK LIVE PRO yerel sunucu çalışıyor (yalnızca bu bilgisayardan erişilir)');
  console.log(`  Kontrol paneli : http://127.0.0.1:${PORT}/studio`);
  console.log(`  Yayın katmanı  : http://127.0.0.1:${PORT}/overlay   <- TikTok LIVE Studio'ya bu adresi ekleyin`);
  console.log(`  Kayıt klasörü  : ${DATA_DIR}`);
  if (overlayOrigins.size) console.log(`  İzinli uzak overlay: ${[...overlayOrigins].join(', ')}`);
});

function shutdown() {
  clearInterval(heartbeat);
  clearInterval(arenaTicker);
  store.flush();
  arenaStore.flush();
  poemStore.flush();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
