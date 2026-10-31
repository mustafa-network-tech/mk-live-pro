// Uçtan uca kendi kendine test: sunucuyu geçici port ve geçici veri klasöründe başlatır.
// Çalıştırma: npm test   (önce npm run build gerekir)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { WebSocket } from 'ws';

const PORT = 4999;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mklive-'));
const serverFile = path.join(import.meta.dirname, 'server.ts');
let failed = 0;

function check(name: string, ok: boolean, extra = '') {
  console.log(`${ok ? 'GEÇTİ' : 'KALDI'}  ${name}${ok ? '' : ' ' + extra}`);
  if (!ok) failed++;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function startServer() {
  const child = spawn(process.execPath, [serverFile], { env: { ...process.env, PORT: String(PORT), MK_DATA_DIR: dataDir }, stdio: 'ignore' });
  return child;
}

function request(method: string, p: string, opts: { headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path: p, method, headers: opts.headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.end(opts.body);
  });
}

function wsConnect(role: string, origin?: string): Promise<{ ws: WebSocket; messages: any[] } | null> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws?role=${role}`, origin ? { origin } : {});
    const messages: any[] = [];
    ws.on('message', (d) => messages.push(JSON.parse(d.toString())));
    ws.on('open', () => resolve({ ws, messages }));
    ws.on('error', () => resolve(null));
  });
}

async function waitUp() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await request('GET', '/api/health')).status === 200) return;
    } catch {
      /* henüz açılmadı */
    }
    await sleep(100);
  }
  throw new Error('sunucu açılmadı');
}

let server = startServer();
try {
  await waitUp();

  const health = JSON.parse((await request('GET', '/api/health')).body);
  check('sağlık ucu çalışıyor', health.ok === true);

  const overlay = await wsConnect('overlay');
  const studio = await wsConnect('studio');
  check('overlay ve stüdyo WebSocket bağlandı', !!overlay && !!studio);
  await sleep(100);
  check('bağlanınca ilk durum geliyor', overlay!.messages[0]?.type === 'state' && overlay!.messages[0].state.title === 'Şiir Gecesi');

  // Ana senaryo: Şiir Gecesi -> Türkü Gecesi
  studio!.ws.send(JSON.stringify({ type: 'patch', patch: { title: 'Türkü Gecesi' } }));
  await sleep(150);
  const last = overlay!.messages.filter((m) => m.type === 'state').at(-1);
  check('stüdyo başlığı değiştirince overlay "Türkü Gecesi" alıyor', last?.state.title === 'Türkü Gecesi' && last.state.rev === 1);

  // Overlay salt okunur
  overlay!.ws.send(JSON.stringify({ type: 'patch', patch: { title: 'HACK' } }));
  await sleep(150);
  check('overlay yetkisiz değişiklik yapamıyor', (await request('GET', '/api/state').then((r) => JSON.parse(r.body))).title === 'Türkü Gecesi');

  // Doğrulama
  studio!.ws.send(JSON.stringify({ type: 'patch', patch: { theme: 'yok', font: { size: 99999, color: 'red' }, title: 'a'.repeat(500) } }));
  await sleep(150);
  const st = JSON.parse((await request('GET', '/api/state')).body);
  check('geçersiz tema/renk reddedilip boyut sınırlandı', st.theme === 'elegant-gold' && st.font.size === 200 && st.font.color === '' && st.title.length === 120);

  // Güvenlik
  check('yabancı Origin ile WebSocket reddediliyor', (await wsConnect('studio', 'http://evil.example')) === null);
  const badHost = await request('GET', '/api/state', { headers: { Host: 'evil.example' } });
  check('yabancı Host başlığı reddediliyor (DNS rebinding)', badHost.status === 403);
  const badPut = await request('PUT', '/api/state', { headers: { Origin: 'http://evil.example', 'Content-Type': 'application/json' }, body: '{"title":"x"}' });
  check('yabancı Origin ile PUT reddediliyor', badPut.status === 403);
  const trav = await request('GET', '/studio/..%2f..%2fpackage.json');
  check('dizin dışına çıkış engelleniyor', trav.status !== 200);

  // Statik dosyalar
  const ov = await request('GET', '/overlay');
  const stu = await request('GET', '/studio');
  check('/overlay ve /studio sayfaları sunuluyor', ov.status === 200 && ov.body.includes('<div id="root">') && stu.status === 200);

  // Kalıcılık + yeniden başlatma
  studio!.ws.send(JSON.stringify({ type: 'patch', patch: { title: 'Kalıcı Başlık' } }));
  await sleep(200);
  server.kill('SIGTERM');
  await sleep(400);
  const saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'state.json'), 'utf8'));
  check('durum data/state.json içine kaydedildi', saved.title === 'Kalıcı Başlık');

  // Sunucu kapalıyken istemciler çökmemeli; yeniden açılınca güncel durum gelmeli
  server = startServer();
  await waitUp();
  check('yeniden başlatmada kayıtlı durum yükleniyor', JSON.parse((await request('GET', '/api/state')).body).title === 'Kalıcı Başlık');

  // Bozuk dosya
  server.kill('SIGTERM');
  await sleep(300);
  fs.writeFileSync(path.join(dataDir, 'state.json'), '{bozuk json');
  server = startServer();
  await waitUp();
  check('bozuk state.json varsayılana düşüyor, sunucu çökmüyor', JSON.parse((await request('GET', '/api/state')).body).title === 'Şiir Gecesi');
} finally {
  server.kill('SIGTERM');
  await sleep(200);
  fs.rmSync(dataDir, { recursive: true, force: true });
}

console.log(failed === 0 ? '\nTüm testler geçti.' : `\n${failed} test kaldı.`);
process.exit(failed === 0 ? 0 : 1);
