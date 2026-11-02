# MK LIVE PRO — Devam Notu (başka bir ajan/geliştirici için)

Tarih: 2026-11-02. Durum: **Faz 1C + Bilgi Arenası + merkezi LIVE olay motoru yerel geliştirme tamamlandı**. Üç aşamalı/30 soruluk Bilgi Arenası, Yarışma Merkezi içinde ayrı bölüm olarak hazırdır. Kelime Tahmini ve Türkü Tahmini ayrı 40 soruluk yarışmalar olarak korunur; Şiir Tamamlama kaldırılmıştır. Demo/manüel yorum ve hediye akışı tek LiveEventHub üzerinden arena, hediye, takım ve sohbet motorlarına dağıtılır. Gerçek TikTok LIVE etkileşim API'si doğrulanmadığı için LIVE modu desteklenmiyor gösterilir. Otomatik testler geçti. Vercel deploy ve gerçek TikTok LIVE Studio kontrolü kullanıcı onayı bekliyor.
Sıradaki iş: kullanıcı onayıyla Faz 1B/1C Vercel ve TikTok doğrulaması; ardından **Faz 1D**.

## Proje özeti
TikTok LIVE Studio'ya "Kaynak Ekle → Bağlantı" ile eklenen, 9:16 (1080×1920) şeffaf yayın katmanı (overlay) ve onu yöneten
yerel kontrol paneli (studio). Panel değişikliği → WebSocket → overlay anında güncellenir. Yazılım tamamen yerelde çalışır.
Ürün sloganı: "Yayınını aç, konseptini seç, sahnen hazır." Arayüz dili: **Türkçe**, koyu tema.

## Kritik kurallar (kullanıcıdan, değiştirme)
- Diğer MK DIGITAL SYSTEMS projelerine dokunma; Supabase / MK Digital Vault / veritabanı / bulut kullanma.
- Kullanıcı onayı olmadan **deploy, push, commit, canlı yayın başlatma yapma.**
- Gereksiz paket yükleme. API anahtarını koda yazma. TikTok'un resmî olmayan veri yöntemlerini kullanma.
- Gerçek TikTok verisi yokken sahte istatistik gösterme. Yarışmalar/puanlar **elle** yönetilir (otomatik yorum/hediye okuma yok).
- Test edilmemiş entegrasyonu başarılı diye raporlama. Her aşamada yapılanı ve test sonucunu açıkça yaz.
- Telifli müzik / lisanssız şarkı sözü dağıtma.
- Kontrol paneline dış ağdan erişim açma (sunucu yalnızca 127.0.0.1).

## Çalıştırma
```bat
cd MK-LIVE-PRO
npm install          :: ilk kez
npm run build        :: studio + overlay derler (kod değişince tekrar)
npm start            :: http://127.0.0.1:4173
npm run typecheck    :: tsc --noEmit
npm test             :: 82 otomatik kontrol (önce build gerekir), geçici port 4999
```
`start.bat` hepsini yapıp paneli açar. Geliştirme modu (Vite dev) YOK; değişiklikten sonra `npm run build`.

Adresler: panel `http://127.0.0.1:4173/studio`, overlay `http://127.0.0.1:4173/overlay`, WS `ws://127.0.0.1:4173/ws?role=studio|overlay`,
API `/api/state` (GET/PUT), `/api/health`.

## Mimari
```
apps/local-server/src/server.ts   HTTP + WS + statik; Host/Origin denetimi; yalnız 127.0.0.1
apps/local-server/src/store.ts    data/state.json (atomik yazım, 300 ms debounce, bozuk dosyada yedek+varsayılan)
apps/local-server/src/poem-store.ts  özel şiir kütüphanesi (data/poems.json; overlay'e gitmez)
apps/local-server/src/media-store.ts yerel görsel kütüphanesi (data/media + media.json)
apps/local-server/src/selftest.ts uçtan uca test
apps/local-server/src/arena-store.ts  sunucu otoriteli turnuva, süre, cevap, puan, sıralama ve kalıcılık
apps/local-server/src/arena-questions.ts  varsayılan 30 özel soru ve cevap anahtarı (istemci paketine girmez)
apps/local-server/src/arena-question-store.ts  data/arena-questions.json düzenlenebilir yerel kopyası
apps/local-server/src/live-provider.ts  gerçek entegrasyona hazır arayüz + manuel/demo sağlayıcı
apps/studio/                      React panel (Şiir, Yarışma, Sohbet, Türkü, Sahne Tasarımcısı, Yayın Ayarları)
apps/overlay/                     React şeffaf katman, sahne 1080×1920, pencereye göre scale
packages/shared/src/state.ts      StudioState tipi, DEFAULT_STATE, sanitizeState (TEK doğrulama noktası), protokol tipleri
packages/shared/src/client.ts     connectState(): WS istemcisi, otomatik yeniden bağlanma, heartbeat watchdog
packages/themes/                  tema meta (index.ts) + overlay tema CSS (overlay-themes.css)
vercel.json, apps/overlay/vite.hosted.config.ts   uzak (Vercel) overlay derlemesi
```
Veri akışı: studio `update(patch)` → 120 ms toplayıp WS `{type:'patch'}` → sunucu `sanitizeState` ile doğrular, rev++,
kaydeder, tüm istemcilere `{type:'state'}` yayınlar. Yalnızca `role=studio` patch gönderebilir; overlay salt okunur.
Overlay bağlantı koparsa son durumu gösterir (localStorage önbelleği), yeniden bağlanınca güncel durumu alır.

### Yeni alan/özellik eklerken kurallar
1. Alanı `StudioState` + `DEFAULT_STATE` + `sanitizeState` içine ekle (sunucu geçersiz veriyi buradan eler). `LIMITS` güncelle.
2. İç içe nesneleri (font, position, layers, safeArea) panelde **bütün olarak** gönder (`{...s.font, size}`); `useStudio` üst düzey birleştirir.
3. Overlay'e yalnızca `transform`/`opacity` animasyonları (düşük CPU). Arka plan şeffaf kalmalı, kamerayı kapatan geniş öğe olmamalı.
4. Tema farkı yalnızca renk olmasın: tipografi + animasyon + kart düzeni (bkz. overlay-themes.css).
5. Metinler overlay'de `FitText` ile sığdırılır; taşma olmamalı.

## Teknik tuzaklar (zaman kaybettirdi)
- Sunucu TS'i **Node 22 type-stripping** ile doğrudan çalışır: ilgili dosyalarda `.ts` uzantılı import, `import type`, `enum`/`namespace`/parametre-özelliği YOK
  (`tsconfig`: `erasableSyntaxOnly`, `allowImportingTsExtensions`). Sunucu `packages/shared` içini **göreli yolla** import eder.
- TypeScript 7, Vite 8, React 19 kurulu.
- Overlay `:root{color-scheme:dark}` olmak zorunda; yoksa panel önizlemesindeki iframe opak beyaz çizilir (panel koyu şemada).
- Sunucu `data/config.json` dosyasını **yalnızca açılışta** okur (değişince yeniden başlat).
- Port 4173 doluysa sunucu net hata verip çıkar (eski süreç açık kalmış olabilir).
- Windows'ta repo satır sonu uyarısı (LF→CRLF) zararsızdır.

## Uzak (Vercel) overlay — kurulu ve çalışıyor
LIVE Studio'nun Bağlantı alanı `http://127.0.0.1` / `localhost` adresini **kabul etmedi**; bu yüzden overlay Vercel'de yayında:
**https://mk-live-pro.vercel.app/overlay**. Bu sayfa `ws://127.0.0.1:4173/ws` adresine (kullanıcının kendi bilgisayarı) bağlanır
(`client.ts`: sayfa localhost değilse 127.0.0.1'e bağlan; `?port=` ile port değişir).
Sunucu bu origin'i `data/config.json` ile tanır (repoda yok, yerel dosya):
```json
{ "overlayOrigins": ["https://mk-live-pro.vercel.app"] }
```
Bu origin yalnızca **overlay (salt okunur)** rolüyle kabul edilir; studio rolü reddedilir (selftest dışında elle doğrulandı).
Vercel yeniden yayın gerekir: `vercel --prod` (kök: `MK-LIVE-PRO`; ayarlar `vercel.json`). Deploy için kullanıcı onayı al.

## Doğrulananlar / Doğrulanmayanlar
Doğrulandı:
- `npm test` 82/82, typecheck temiz, build temiz.
- Edge headless: overlay PNG'sinde boş alan alfa=0 (şeffaf); 3 tema ve çok uzun başlık (3 satıra küçülür) taşmıyor.
- Vercel overlay'i WS'e overlay olarak bağlanıyor, studio olarak reddediliyor, yabancı origin reddediliyor.
- Kullanıcı bildirimi: TikTok LIVE Studio'ya Vercel overlay adresi eklenince panelden yazılan başlık ("musty tazdun" test yazısı) ekranda göründü.

Henüz **teyit edilmedi** (kullanıcıya sorulmuştu): sayfa yenilemeden anlık güncelleme, arka planın gerçekten şeffaf olması
(kamera görünüyor mu), mobil kadrajda konum. `docs/TIKTOK-TEST.md` tablosu işaretlenmedi.
Bilinen risk: Chromium "yerel ağ erişimi" kısıtı yeni sürümlerde https sayfanın 127.0.0.1'e WS'ini engelleyebilir (şu an çalışıyor görünüyor).

Yerel veri notu: `data/state.json` içinde test başlığı kalmış olabilir; panelden "Türkü Gecesi"/"Şiir Gecesi"ne geri alınabilir.

## Studio'ya web üzerinden erişim (kullanıcı sordu — henüz yapılmadı)
Şu an panel yalnızca `http://127.0.0.1:4173/studio`. Seçenekler:
- **Aynı bilgisayarda web adresinden panel (önerilen, kolay):** studio'yu da Vercel'de yayınla; tarayıcıda `https://…vercel.app/studio` açılınca
  WS `ws://127.0.0.1:4173`'e bağlanır (overlay ile aynı yol). Gerekenler: (1) `connectState('studio')` zaten uzak sayfada 127.0.0.1'e gider;
  (2) sunucuda uzak origin'e **studio rolü** izni için ayrı bir config anahtarı (örn. `studioOrigins`) ve `originOk`/upgrade kontrolünde rol bazlı ayrım;
  `PUT /api/state` için de aynısı (CORS başlığı gerekir); (3) Vercel çıktısı hem `/overlay` hem `/studio` içermeli (iki ayrı Vite derlemesini
  tek `dist`'e koy; base `/overlay/` ve `/studio/`; `vercel.json` rewrites); (4) panel önizleme iframe'i `/overlay?preview=1` aynı origin'de kalır ama WS 127.0.0.1'e gider.
  Güvenlik: studio origin'i yalnızca kendi Vercel adresin olmalı; o siteye kod enjeksiyonu = yayın kontrolü demektir, siteyi sade tut.
- **Başka cihazdan (telefon/başka PC) uzaktan yönetim:** 127.0.0.1 modelinde MÜMKÜN DEĞİL. Bunun için bir röle (bulut/WS sunucusu veya
  tünel) ve kimlik doğrulama gerekir; bu, "yerel-only, bulut yok" Faz 1 kararına aykırı — kullanıcıya açıkça sorulmadan yapma.

## Yol haritası
**Faz 1B — Şiir Stüdyosu (YEREL KOD TAMAM):** özel şiir arşivi overlay durumundan tamamen ayrıldı; şiir adı, şair, tam metin ve notlar yalnızca
`data/poems.json` içinde tutulur. Okuyan kişi, katılımcı sırası, sıradaki kişi, sahne başlat/bitir, yağmur/sonbahar/gece/nostalji atmosferleri hazır.
Yerel JPG/PNG/WebP görselleri tarayıcıda küçültülerek `data/media/` altında saklanır ve overlay'e WebSocket üzerinden gönderilir; kapalı/arka plan/çerçeveli
modları ile görünürlük ayarı vardır. Aynı kütüphane 30 MB'ye kadar kısa MP4/WebM atmosfer videolarını sessiz, otomatik ve döngülü oynatır.
Yayın hakkı bulunan MP3/WAV/M4A/OGG/WebM dosyaları `data/audio/` altında yerel tutulur; panelde yumuşak başlat/duraklat,
ses, döngü ve başa alma kontrolleri vardır. YouTube indirme/yeniden yayınlama özelliği yoktur. Katılımcı hızlı ekleme alanı Yayın Sahnesi kartına taşındı.
Global `AudioDock` bütün stüdyo sayfalarında sağ altta açılır; alkış/tebrikler/hoş geldiniz/wow/ding-dong/kahkaha yuvalarına farklı yerel sesler atanır,
efektler fonu kesmeden eşzamanlı çalabilir. Dosya atanmamışken alkış ve ding-dong Web Audio API ile sentezlenir; kısa anonslar yerel SpeechSynthesis kullanır.
Typecheck/build temiz, uçtan uca testler geçti; Chrome headless ile panel, tema ve fotoğraflı overlay görsel olarak doğrulandı.
Vercel deploy ve gerçek TikTok LIVE Studio kontrol listesi henüz kullanıcı onayı bekliyor.
**Faz 1C — YEREL KOD TAMAM:** Yarışma Merkezi; kelime tahmini, türkü tahmini ve soru-cevap, panelde kalan gizli cevap,
geri sayım, manuel puan, skor tablosu ve kazanan ekranı içerir. Sohbet Stüdyosu; günün konusu, aktif soru kartı ve soru havuzu içerir.
Türkü Stüdyosu; eser/sanatçı/yöre/istek sahibi, istek sırası, sıradaki eser ve başlat/bitir akışını yönetir. Türkü ve şarkı akışları aynı olduğundan
ayrı Şarkı Stüdyosu kullanıcı kararıyla kaldırıldı; tek sade Türkü Stüdyosu kullanılıyor. Üç modülün overlay sahneleri ve panel önizlemeleri Chrome headless ile doğrulandı.
Yarışma, Sohbet ve Türkü stüdyolarında `sceneBackgrounds` üzerinden ayrı yerel fotoğraf, görünürlük, karartma ve bulanıklık ayarı bulunur; fotoğraf WebSocket medya aktarımıyla overlay'e gider ve buluta yüklenmez.
**Bilgi Arenası — YEREL KOD TAMAM:** Yarışma Merkezi içinde ayrı sekmedir. Test 1/2/3 yalnızca dört şıklı soru-cevap turnuvasıdır; Türkü Tahmini ve
Kelime Tahmini bu testlere karıştırılmaz ve “Diğer yarışmalar” sekmesinde ayrı kalır. Her ikisi için 40'ar soruluk paket vardır; Şiir Tamamlama kaldırılmıştır. Bilgi Arenası'nda 30 soru, sunucu zamanı, 10 sn okuma/50 sn cevap,
5 saniyelik hız puanı, tek cevap, Türkçe normalizasyon, manuel düzeltme geçmişi, istatistik, aşama/genel sıralama, atomik JSON kalıcılık ve sansürlenmiş
overlay protokolü hazırdır. Doğru cevaplar yalnızca yerel sunucu ve yayıncı panelindedir; açıklama öncesi overlay mesajında yoktur. Gerçek TikTok yorum
entegrasyonu yoktur; `LiveProvider` arayüzü ile manuel ve açıkça işaretli demo sağlayıcı vardır. Telefon kumandası hâlâ yoktur.
**Faz 1D:** performans/hata yönetimi, önizleme iyileştirme, Windows başlatma kolaylığı, kurulum/kullanım dokümantasyonu. Medya Kütüphanesi (assets/).
Ayrıca açık kalan: şeffaflık başarısızsa chroma-key yedeği.

## Çalışma biçimi
Önce küçük çalışan çekirdek, sonra genişlet. Her değişiklikten sonra `npm run typecheck`, `npm run build`, `npm test`; görsel işte
Edge headless ekran görüntüsü (`msedge --headless=new --screenshot`) ile kontrol et. Kullanıcıyla Türkçe konuş, sonuçları dürüstçe raporla.
