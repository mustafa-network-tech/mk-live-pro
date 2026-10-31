// MK LIVE PRO yerel sunucu: statik dosyalar (/studio, /overlay), API (/api) ve WebSocket (/ws).
// Yalnızca 127.0.0.1 üzerinde dinler.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { Duplex } from 'node:stream';
import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from '../../../packages/shared/src/index.ts';
import { createStore } from './store.ts';

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 4173;
const ROOT = path.resolve(import.meta.dirname, '../../..');
const DATA_DIR = process.env.MK_DATA_DIR ? path.resolve(process.env.MK_DATA_DIR) : path.join(ROOT, 'data');
const APPS: Record<string, string> = {
  '/studio': path.join(ROOT, 'apps/studio/dist'),
  '/overlay': path.join(ROOT, 'apps/overlay/dist'),
};
const MAX_BODY = 64 * 1024;

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

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (!hostOk(req)) return send(res, 403, 'Yasak');
  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);
  const p = url.pathname;

  if (p === '/api/health') return json(res, 200, { ok: true, rev: store.get().rev, clients: wss.clients.size });
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

function broadcast(msg: ServerMessage) {
  const data = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === WebSocket.OPEN) c.send(data);
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
    ws.send(JSON.stringify({ type: 'state', state: store.get() } satisfies ServerMessage));
    ws.on('message', (raw) => {
      // Yalnızca stüdyo değişiklik yapabilir; overlay salt okunur.
      if (role !== 'studio') return;
      try {
        const msg = JSON.parse(raw.toString()) as ClientMessage;
        if (msg.type !== 'patch') return;
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
  store.flush();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
