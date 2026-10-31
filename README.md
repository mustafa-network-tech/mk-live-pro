# MK LIVE PRO

TikTok LIVE Studio'ya "Bağlantı" kaynağı olarak eklenen, yerel çalışan canlı yayın sahne yöneticisi.
*Yayınını aç, konseptini seç, sahnen hazır.*

Durum: **Faz 1A (çekirdek)**. Şiir/Yarışma/Sohbet/Türkü/Şarkı modülleri henüz yok (menüde "Faz 1B/1C" etiketli).

## Çalıştırma

Gereksinim: Node.js 22.18 veya üzeri.

```bat
npm install        :: yalnızca ilk kurulumda
npm run build      :: arayüzleri derler (kod değişince tekrar)
npm start          :: sunucuyu başlatır
```

veya `start.bat` dosyasına çift tıklayın (gerekirse kurar, derler, paneli açar).

| Adres | Ne işe yarar |
|-------|--------------|
| http://127.0.0.1:4173/studio | Kontrol paneli (tarayıcıda açın) |
| http://127.0.0.1:4173/overlay | Yayın katmanı (**TikTok LIVE Studio'ya bu eklenir**) |
| ws://127.0.0.1:4173/ws | WebSocket (panel → overlay) |
| http://127.0.0.1:4173/api/health, /api/state | Sağlık ve durum (JSON) |

Port değiştirmek için: `set PORT=4200` (cmd) ardından `npm start`.
Sunucu yalnızca `127.0.0.1` üzerinde dinler; başka bilgisayarlar erişemez. Yabancı `Host`/`Origin` başlıkları reddedilir.

## Test

```bat
npm run typecheck   :: TypeScript denetimi
npm test            :: uçtan uca sunucu testi (WebSocket, kalıcılık, güvenlik)
```

TikTok LIVE Studio içindeki doğrulama elle yapılır: [docs/TIKTOK-TEST.md](docs/TIKTOK-TEST.md).

## Yapı

```
apps/local-server  Node HTTP + WebSocket + JSON kayıt (data/state.json)
apps/studio        React kontrol paneli
apps/overlay       React şeffaf yayın katmanı (1080x1920 sahne, pencereye göre ölçeklenir)
packages/shared    Durum tipi, doğrulama, WebSocket istemcisi
packages/themes    Tema bilgileri ve overlay tema CSS'i
packages/modules   (Faz 1B+ için ayrıldı)
data/ assets/ docs/
```

Akış: panel değişikliği → WebSocket `patch` → sunucu doğrular, kaydeder → tüm overlay'lere yayınlar.
Overlay bağlantısı kopsa son durumu gösterir, kendiliğinden yeniden bağlanır ve güncel durumu alır.

## Bilinen sınırlar

- TikTok LIVE Studio'da localhost, şeffaflık ve canlı güncelleme **henüz doğrulanmadı** (bkz. TIKTOK-TEST.md).
- Gerçek TikTok verisi (yorum, hediye, izleyici) okunmaz; her şey elle yönetilir.
- Geliştirme için canlı yeniden yükleme (Vite dev) yok; kod değişince `npm run build`.
