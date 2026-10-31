// Uçtan uca kendi kendine test: sunucuyu geçici port ve geçici veri klasöründe başlatır.
// Çalıştırma: npm test   (önce npm run build gerekir)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { WebSocket } from 'ws';
import { DEFAULT_STATE, sanitizeState } from '../../../packages/shared/src/index.ts';

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

function request(method: string, p: string, opts: { headers?: Record<string, string>; body?: string | Buffer } = {}): Promise<{ status: number; body: string }> {
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
  const migrated = sanitizeState({ title: 'Eski kayıt' }, DEFAULT_STATE);
  check(
    'eski durum kaydı yeni stüdyo alanlarıyla tamamlanıyor',
    migrated.title === 'Eski kayıt'
      && migrated.poem.theme === 'night'
      && Array.isArray(migrated.poem.queue)
      && migrated.contest.mode === DEFAULT_STATE.contest.mode
      && Array.isArray(migrated.contest.players)
      && Array.isArray(migrated.chat.questions)
      && Array.isArray(migrated.turku.queue),
  );

  await waitUp();

  const health = JSON.parse((await request('GET', '/api/health')).body);
  check('sağlık ucu çalışıyor', health.ok === true);

  const overlay = await wsConnect('overlay');
  const studio = await wsConnect('studio');
  check('overlay ve stüdyo WebSocket bağlandı', !!overlay && !!studio);
  await sleep(100);
  check('bağlanınca ilk durum geliyor', overlay!.messages[0]?.type === 'state' && overlay!.messages[0].state.title === 'Şiir Gecesi');

  // Özel şiir kütüphanesi: yerelde kalır ve yayın durumuna karışmaz.
  const emptyPoems = await request('GET', '/api/poems');
  check('şiir kütüphanesi başlangıçta boş', emptyPoems.status === 200 && JSON.parse(emptyPoems.body).length === 0);
  const privatePoem = [{
    id: 'test-siiri',
    title: 'Test Şiiri',
    poet: 'Test Şairi',
    body: 'Bu özel dize overlay durumuna gitmemeli.',
    notes: 'Yalnızca yayıncı görür.',
    createdAt: '2026-10-31T00:00:00.000Z',
    updatedAt: '2026-10-31T00:00:00.000Z',
  }];
  const savedPoems = await request('PUT', '/api/poems', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(privatePoem) });
  check('şiir kütüphanesi yerel API ile kaydediliyor', savedPoems.status === 200 && JSON.parse(savedPoems.body)[0]?.title === 'Test Şiiri');
  const publicState = (await request('GET', '/api/state')).body;
  check('özel şiir metni yayın durumuna dahil edilmiyor', !publicState.includes('Bu özel dize') && !publicState.includes('Yalnızca yayıncı görür'));

  // Yerel görsel kütüphanesi ve WebSocket medya aktarımı
  const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const mediaUpload = await request('POST', '/api/media', {
    headers: { 'Content-Type': 'image/png', 'X-MK-Filename': encodeURIComponent('gece görseli.png') },
    body: tinyPng,
  });
  const mediaItem = JSON.parse(mediaUpload.body);
  check('yerel görsel yüklenip listeleniyor', mediaUpload.status === 201 && mediaItem.mime === 'image/png' && JSON.parse((await request('GET', '/api/media')).body).length === 1);
  check('yerel görsel dosyası okunuyor', (await request('GET', `/api/media/${mediaItem.id}`)).status === 200);
  overlay!.ws.send(JSON.stringify({ type: 'media:get', id: mediaItem.id }));
  await sleep(100);
  const mediaMessage = overlay!.messages.find((m) => m.type === 'media' && m.id === mediaItem.id);
  check('overlay görseli WebSocket üzerinden alıyor', mediaMessage?.mime === 'image/png' && Buffer.from(mediaMessage.data, 'base64').equals(tinyPng));

  const secondUpload = await request('POST', '/api/media', { headers: { 'Content-Type': 'image/png', 'X-MK-Filename': 'silinecek.png' }, body: tinyPng });
  const secondItem = JSON.parse(secondUpload.body);
  check('yerel görsel silinebiliyor', (await request('DELETE', `/api/media/${secondItem.id}`)).status === 200 && JSON.parse((await request('GET', '/api/media')).body).length === 1);
  const tinyVideo = Buffer.from('1a45dfa39f4286810142f7810142f2810442f381084282847765626d', 'hex');
  const videoUpload = await request('POST', '/api/media', { headers: { 'Content-Type': 'video/webm', 'X-MK-Filename': 'gece-dongusu.webm' }, body: tinyVideo });
  const videoItem = JSON.parse(videoUpload.body);
  check('yerel kısa video yüklenip listeleniyor', videoUpload.status === 201 && videoItem.mime === 'video/webm' && JSON.parse((await request('GET', '/api/media')).body).length === 2);
  check('video tarayıcı aralık isteğini destekliyor', (await request('GET', `/api/media/${videoItem.id}`, { headers: { Range: 'bytes=0-7' } })).status === 206);
  overlay!.ws.send(JSON.stringify({ type: 'media:get', id: videoItem.id }));
  await sleep(100);
  const videoMessage = overlay!.messages.find((m) => m.type === 'media' && m.id === videoItem.id);
  check('overlay videoyu WebSocket üzerinden alıyor', videoMessage?.mime === 'video/webm' && Buffer.from(videoMessage.data, 'base64').equals(tinyVideo));

  // Yerel ve lisanslı fon müziği kütüphanesi
  const tinyAudio = Buffer.from('49443303000000000000', 'hex');
  const audioUpload = await request('POST', '/api/audio', {
    headers: { 'Content-Type': 'audio/mpeg', 'X-MK-Filename': encodeURIComponent('şiir fonu.mp3') },
    body: tinyAudio,
  });
  const audioItem = JSON.parse(audioUpload.body);
  check('yerel fon müziği yüklenip listeleniyor', audioUpload.status === 201 && audioItem.mime === 'audio/mpeg' && JSON.parse((await request('GET', '/api/audio')).body).length === 1);
  check('yerel fon müziği dosyası okunuyor', (await request('GET', `/api/audio/${audioItem.id}`)).status === 200);
  check('fon müziği tarayıcı aralık isteğini destekliyor', (await request('GET', `/api/audio/${audioItem.id}`, { headers: { Range: 'bytes=0-3' } })).status === 206);
  const secondAudio = JSON.parse((await request('POST', '/api/audio', { headers: { 'Content-Type': 'audio/mpeg', 'X-MK-Filename': 'silinecek.mp3' }, body: tinyAudio })).body);
  check('yerel fon müziği silinebiliyor', (await request('DELETE', `/api/audio/${secondAudio.id}`)).status === 200 && JSON.parse((await request('GET', '/api/audio')).body).length === 1);

  // Ana senaryo: panel değişikliği ve Faz 1C yarışma durumu overlay'e birlikte gider.
  studio!.ws.send(JSON.stringify({
    type: 'patch',
    patch: {
      title: 'Türkü Gecesi',
      concept: 'yarisma',
      contest: {
        mode: 'quiz',
        prompt: 'Başkentimiz hangisidir?',
        status: 'live',
        duration: 90,
        endsAt: Date.now() + 90_000,
        showScores: true,
        players: [{ id: 'test-oyuncu', name: 'Ayşe', score: 5 }],
      },
    },
  }));
  await sleep(150);
  const last = overlay!.messages.filter((m) => m.type === 'state').at(-1);
  check(
    'stüdyo değişikliği ve yarışma durumu overlay’e ulaşıyor',
    last?.state.title === 'Türkü Gecesi'
      && last.state.concept === 'yarisma'
      && last.state.contest.prompt === 'Başkentimiz hangisidir?'
      && last.state.contest.players[0]?.score === 5
      && last.state.rev === 1,
  );

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
  const badPoems = await request('GET', '/api/poems', { headers: { Origin: 'http://evil.example' } });
  check('yabancı Origin özel şiir kütüphanesini okuyamıyor', badPoems.status === 403);
  const badMedia = await request('GET', '/api/media', { headers: { Origin: 'http://evil.example' } });
  check('yabancı Origin yerel görsel kütüphanesini okuyamıyor', badMedia.status === 403);
  const badAudio = await request('GET', '/api/audio', { headers: { Origin: 'http://evil.example' } });
  check('yabancı Origin fon müziği kütüphanesini okuyamıyor', badAudio.status === 403);
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
  check('şiir kütüphanesi yeniden başlatmada korunuyor', JSON.parse((await request('GET', '/api/poems')).body)[0]?.body === privatePoem[0].body);
  const persistedMedia = JSON.parse((await request('GET', '/api/media')).body);
  check('görsel/video kütüphanesi yeniden başlatmada korunuyor', persistedMedia.some((item: any) => item.id === mediaItem.id) && persistedMedia.some((item: any) => item.id === videoItem.id));
  check('fon müziği kütüphanesi yeniden başlatmada korunuyor', JSON.parse((await request('GET', '/api/audio')).body)[0]?.id === audioItem.id);

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
