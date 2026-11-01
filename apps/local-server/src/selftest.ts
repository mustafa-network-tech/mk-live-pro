// Uçtan uca kendi kendine test: sunucuyu geçici port ve geçici veri klasöründe başlatır.
// Çalıştırma: npm test   (önce npm run build gerekir)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { WebSocket } from 'ws';
import { arenaPointsForElapsed, CONTEST_MODES, DEFAULT_STATE, FOLK_GUESS_QUESTIONS, matchArenaAnswer, rankArenaParticipants, sanitizeState, WORD_GUESS_QUESTIONS } from '../../../packages/shared/src/index.ts';
import type { ArenaParticipant } from '../../../packages/shared/src/index.ts';
import { DEFAULT_ARENA_QUESTIONS } from './arena-questions.ts';

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
  check('Şiir Tamamlama yarışması kaldırıldı', !CONTEST_MODES.includes('poem' as never));
  check('Kelime Tahmini paketi 40 özgün soru içeriyor', WORD_GUESS_QUESTIONS.length === 40 && new Set(WORD_GUESS_QUESTIONS.map((question) => question.answer.toLocaleLowerCase('tr-TR'))).size === 40);
  check('Türkü Tahmini paketi 40 özgün soru içeriyor', FOLK_GUESS_QUESTIONS.length === 40 && new Set(FOLK_GUESS_QUESTIONS.map((question) => question.answer.toLocaleLowerCase('tr-TR'))).size === 40);
  check('tahmin paketleri yayın alanı sınırlarına uyuyor', [...WORD_GUESS_QUESTIONS, ...FOLK_GUESS_QUESTIONS].every((question) => question.prompt.length <= 240 && question.hint.length <= 160 && question.answer.length <= 160));
  check('Türkü Tahmini paketinde şarkı sözü veya dize saklanmıyor', FOLK_GUESS_QUESTIONS.every((question) => !question.prompt.includes('\n') && !question.hint.includes('\n')));
  const backgroundState = sanitizeState({ sceneBackgrounds: { yarisma: { photoId: '12345678-1234-1234-1234-123456789abc', opacity: 999, darkness: -5, blur: 99 } } }, DEFAULT_STATE);
  check('stüdyo fotoğraf ayarları ayrı saklanıp güvenli sınırlanıyor', backgroundState.sceneBackgrounds.yarisma.opacity === 100 && backgroundState.sceneBackgrounds.yarisma.darkness === 0 && backgroundState.sceneBackgrounds.yarisma.blur === 12 && backgroundState.sceneBackgrounds.sohbet.photoId === '');

  check('Bilgi Arenası tam 30 soruyla geliyor', DEFAULT_ARENA_QUESTIONS.length === 30);
  check('Bilgi Arenası her testte tam 10 soru içeriyor', [1, 2, 3].every((testId) => DEFAULT_ARENA_QUESTIONS.filter((question) => question.testId === testId).length === 10));
  check('30 sorunun cevap anahtarı talimatla eşleşiyor', DEFAULT_ARENA_QUESTIONS.map((question) => question.correctOption).join('') === 'BACDBACDBACBADCABDCABDACBDACBD');
  check('cevap süresi bütün sorularda tam 50 saniye', DEFAULT_ARENA_QUESTIONS.every((question) => question.answeringSeconds === 50));
  check('5 saniyelik hız puanı sınırları doğru', [
    [0, 10], [4_999, 10], [5_000, 9], [9_999, 9], [10_000, 8], [44_999, 2], [45_000, 1], [49_999, 1], [50_000, 0],
  ].every(([ms, points]) => arenaPointsForElapsed(ms) === points));
  const firstArenaQuestion = DEFAULT_ARENA_QUESTIONS[0];
  check('şık harfi ve cevap metni eşleştiriliyor', matchArenaAnswer('b', firstArenaQuestion) === 'B' && matchArenaAnswer('B Konya', firstArenaQuestion) === 'B' && matchArenaAnswer('KONYA', firstArenaQuestion) === 'B');
  check('Türkçe cevap normalizasyonu çalışıyor', matchArenaAnswer('  Cevabım B!!! ', firstArenaQuestion) === 'B');
  check('belirsiz yorum reddediliyor', matchArenaAnswer('A mı B mi?', firstArenaQuestion) === null);
  const tieParticipants: ArenaParticipant[] = ['a', 'b'].map((id) => ({ userId: id, displayName: id, stageScores: [10, 0, 0], totalScore: 10, correctCount: 1, correctTimeMs: 1000, stageCorrectCounts: [1, 0, 0], stageCorrectTimeMs: [1000, 0, 0] }));
  check('tam eşitlikte eşit derece korunuyor', rankArenaParticipants(tieParticipants, 1)[1]?.rank === 1 && rankArenaParticipants(tieParticipants, 1)[1]?.tied === true);

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

  const arenaQuestionsResponse = await request('GET', '/api/arena/questions');
  check('özel soru paketi yalnızca kontrol API’sinden okunuyor', arenaQuestionsResponse.status === 200 && JSON.parse(arenaQuestionsResponse.body).length === 30);
  studio!.ws.send(JSON.stringify({ type: 'arena:command', command: { type: 'start-tournament' } }));
  await sleep(80);
  studio!.ws.send(JSON.stringify({ type: 'arena:command', command: { type: 'start-reading' } }));
  await sleep(80);
  let publicArena = overlay!.messages.filter((message) => message.type === 'arena').at(-1)?.arena;
  check('okuma aşamasında soru ve dört seçenek overlay’e gidiyor', publicArena?.phase === 'reading' && Object.keys(publicArena.currentQuestion?.options ?? {}).length === 4);
  check('doğru cevap açıklama öncesinde overlay’e sızmıyor', publicArena?.currentQuestion && !('correctOption' in publicArena.currentQuestion) && !JSON.stringify(publicArena).includes('"correctAnswer"'));
  studio!.ws.send(JSON.stringify({ type: 'arena:command', command: { type: 'submit-comment', userId: 'erken', displayName: 'Erken', comment: 'B', source: 'manual', eventId: 'erken-1' } }));
  await sleep(80);
  check('okuma süresinde cevap kabul edilmiyor', studio!.messages.filter((message) => message.type === 'arena:error').at(-1)?.message.includes('açık değil'));
  studio!.ws.send(JSON.stringify({ type: 'arena:command', command: { type: 'open-answers' } }));
  await sleep(50);
  studio!.ws.send(JSON.stringify({ type: 'arena:command', command: { type: 'submit-comment', userId: 'u1', displayName: 'Ayşe', comment: 'KONYA', source: 'manual', eventId: 'u1-q1' } }));
  await sleep(50);
  studio!.ws.send(JSON.stringify({ type: 'arena:command', command: { type: 'submit-comment', userId: 'u1', displayName: 'Ayşe Yeni', comment: 'A', source: 'manual', eventId: 'u1-q1-tekrar' } }));
  await sleep(50);
  studio!.ws.send(JSON.stringify({ type: 'arena:command', command: { type: 'submit-comment', userId: 'u2', displayName: 'Mehmet', comment: 'A', source: 'manual', eventId: 'u2-q1' } }));
  await sleep(80);
  let studioArena = studio!.messages.filter((message) => message.type === 'arena:studio').at(-1)?.arena;
  check('aynı kullanıcının ikinci cevabı puanlanmıyor', studioArena?.answers.length === 2 && studioArena.answers.filter((answer: any) => answer.userId === 'u1').length === 1);
  check('doğru cevaba hız puanı, yanlış cevaba sıfır veriliyor', studioArena?.answers.find((answer: any) => answer.userId === 'u1')?.points === 10 && studioArena.answers.find((answer: any) => answer.userId === 'u2')?.points === 0);
  studio!.ws.send(JSON.stringify({ type: 'arena:command', command: { type: 'lock-answers' } }));
  studio!.ws.send(JSON.stringify({ type: 'arena:command', command: { type: 'reveal-answer' } }));
  studio!.ws.send(JSON.stringify({ type: 'arena:command', command: { type: 'show-results' } }));
  await sleep(100);
  publicArena = overlay!.messages.filter((message) => message.type === 'arena').at(-1)?.arena;
  check('kilit sonrası doğru cevap ve istatistikler yayınlanıyor', publicArena?.phase === 'results' && publicArena.currentQuestion?.correctOption === 'B' && publicArena.stats?.validParticipants === 2 && publicArena.stats.correctCount === 1);
  check('aşama puanı 100, genel puan 300 ile sınırlı', studioArena?.participants.every((participant: any) => participant.stageScores.every((score: number) => score <= 100) && participant.totalScore <= 300) === true);
  overlay!.ws.send(JSON.stringify({ type: 'arena:command', command: { type: 'reset-tournament' } }));
  await sleep(80);
  check('overlay Bilgi Arenası kontrol komutu gönderemiyor', overlay!.messages.filter((message) => message.type === 'arena').at(-1)?.arena.phase === 'results');

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
  const badArenaQuestions = await request('GET', '/api/arena/questions', { headers: { Origin: 'http://evil.example' } });
  check('yabancı Origin özel Bilgi Arenası cevap paketini okuyamıyor', badArenaQuestions.status === 403);
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
  const restartedStudio = await wsConnect('studio');
  await sleep(100);
  const persistedArena = restartedStudio?.messages.find((message) => message.type === 'arena:studio')?.arena;
  check('Bilgi Arenası cevapları ve puanları yeniden başlatmada korunuyor', persistedArena?.answers.length === 2 && persistedArena.participants.some((participant: any) => participant.userId === 'u1' && participant.totalScore === 10));
  restartedStudio?.ws.close();
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
