# MK LIVE PRO

TikTok LIVE Studio'ya "Bağlantı" kaynağı olarak eklenen, yerel çalışan canlı yayın sahne yöneticisi.
*Yayınını aç, konseptini seç, sahnen hazır.*

Durum: **Faz 1C + Bilgi Arenası + merkezi LIVE olay motoru yerel geliştirme tamamlandı**. Şiir Stüdyosu, Yarışma Merkezi, Sohbet Stüdyosu ve sade Türkü Stüdyosu hazırdır. Yarışma Merkezi'nde üç aşamalı Bilgi Arenası ayrı bir bölüm olarak bulunur; Kelime Tahmini ve Türkü Tahmini ayrı 40 soruluk yarışmalardır. Demo/manüel yorum ve hediye akışı ortaktır; gerçek TikTok LIVE etkileşim sağlayıcısı doğrulanmamıştır. Şiir Tamamlama kaldırılmıştır. Vercel overlay güncellemesi kullanıcı onayı bekliyor.

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
data/poems.json    Yalnızca yerel panelde görünen özel şiir kütüphanesi
data/media/        Yerel fotoğraf/video kütüphanesi (Vercel'e yüklenmez)
data/audio/        Yerel fon müziği ve özel efekt sesleri (Vercel'e yüklenmez)
data/arena.json    Bilgi Arenası turnuva, cevap ve puan kaydı
data/arena-questions.json  Panelden düzenlenmiş özel soru paketi
data/ assets/ docs/
```

Akış: panel değişikliği → WebSocket `patch` → sunucu doğrular, kaydeder → tüm overlay'lere yayınlar.
Overlay bağlantısı kopsa son durumu gösterir, kendiliğinden yeniden bağlanır ve güncel durumu alır.

## Şiir Stüdyosu

- Şiir adı, şair, tam metin ve özel notlar yalnızca `data/poems.json` içinde saklanır; overlay'e veya TikTok'a gönderilmez.
- Şiirler panelden eklenebilir, aranabilir, düzenlenebilir ve silinebilir.
- Okuyan kişi ve katılımcı sırası yayın sahnesinden ayrı yönetilir.
- Yağmur, sonbahar, gece ve nostalji atmosferleri bulunur.
- JPG, PNG veya WebP fotoğrafları eklenebilir. Tarayıcı görseli en fazla 1920 piksele küçültüp WebP olarak yerelde saklar.
- 30 MB'ye kadar kısa, sessiz ve döngülü MP4/WebM atmosfer videoları eklenebilir.
- Fotoğraf/video kapalı, tam arka plan veya çerçeveli görsel olarak kullanılabilir; görünürlük ayarlanabilir.
- Yerel fotoğraf/video, overlay'e mevcut WebSocket bağlantısı üzerinden aktarılır; dosya buluta yüklenmez.
- Yayın hakkı bulunan MP3/WAV/M4A/OGG/WebM fon müzikleri yerelde saklanabilir; yumuşak başlatma/duraklatma, ses, döngü ve başa alma kontrolleri vardır.
- Fon müziği yayın bilgisayarındaki panelde çalar. TikTok LIVE Studio'da sistem/uygulama sesi ayrıca etkinleştirilmelidir.
- YouTube bağlantısından ses indirme veya yeniden yayınlama özelliği yoktur.
- Global “Ses Efektleri” paneli her stüdyo sayfasında sağ altta bulunur. Alkış, tebrikler, hoş geldiniz, wow, ding-dong ve kahkaha düğmelerine farklı yerel sesler atanabilir.
- Efektler fon müziğini kesmeden üst üste çalabilir; tüm efektleri durdurma ve ayrı efekt ses seviyesi vardır. Bütün düğmeler dosya atanmadan çalışır: alkış ve ding-dong Web Audio ile sentezlenir; kısa anonslar bilgisayarın yerel Türkçe konuşma motorunu kullanır.

## Faz 1C stüdyoları

- **Yarışma Merkezi:** 40 soruluk Kelime Tahmini, 40 soruluk Türkü Tahmini ve serbest soru-cevap modu; gizli cevap, ipucu, 10–600 saniye sayaç, manuel yarışmacı/puan yönetimi, skor tablosu ve kazanan ekranı. Şiir Tamamlama modu kaldırılmıştır.
- Gizli cevap yalnızca panel tarayıcısının yerel belleğinde tutulur; “Cevabı göster” denmeden overlay'e gönderilmez.
- **Sohbet Stüdyosu:** günün konusu, aktif soru kartı ve yeniden kullanılabilen soru havuzu; kartlar ayrı ayrı yayına gösterilip gizlenebilir.
- **Türkü Stüdyosu:** eser, sanatçı/kaynak, yöre ve istek sahibi bilgileriyle istek sırası; sıradaki eseri sahneye alma, başlatma ve bitirme.
- Ayrı Şarkı Stüdyosu yoktur. Aynı işlevi tekrar etmemesi için tüm müzik istekleri Türkü Stüdyosu'nda birleştirilmiştir.
- Global Ses Efektleri paneli bu stüdyoların tamamında kullanılabilir.
- Yarışma, Sohbet ve Türkü stüdyolarının her birine ayrı yerel fotoğraf seçilebilir. Görünürlük, karartma ve bulanıklık ayarları stüdyo bazında saklanır; fotoğraf kapatıldığında şeffaf kamera alanı korunur.

## Bilgi Arenası

- Test 1 Isınma, Test 2 Mücadele ve Test 3 Büyük Final olmak üzere üç ayrı soru-cevap aşaması; her aşamada 10, toplamda 30 dört şıklı soru vardır.
- Türkü Tahmini ve Kelime Tahmini Bilgi Arenası testleri değildir; Yarışma Merkezi'ndeki ayrı 40 soruluk yarışma modlarıdır.
- Okuma süresi varsayılan 10 saniyedir. Bu sırada cevap kabul edilmez. Cevap aşaması sunucu tarafından yönetilen tam 50 saniyedir.
- Doğru cevaplar 0–5 saniyede 10 puandan başlayarak beş saniyelik aralıklarla 1 puana iner; 50. saniye ve sonrası ile yanlış cevaplar sıfır puandır.
- Aynı kararlı kullanıcı kimliği bir soruda yalnızca bir kez sayılır. Puanı yalnızca yerel sunucu hesaplar ve turnuva `data/arena.json` içinde korunur.
- Overlay doğru cevabı açıklama komutundan önce almaz. Sonuç ekranında doğru şık, cevap dağılımı, istatistikler ve sıralama gösterilir.
- 30 soruluk paket panelden düzenlenebilir; tek soru JSON olarak kopyalanabilir ve paket JSON olarak dışa aktarılabilir. Varsayılan paket silinmez; düzenleme yerel kopyaya yazılır.
- Mevcut TikTok/LIVE Studio overlay bağlantısı yorum olaylarını sağlamaz. Gerçek yorum entegrasyonu **yoktur**; panelde manuel cevap ve açıkça işaretli DEMO cevap girişi bulunur. `LiveProvider` sınırı ileride doğrulanmış bir sağlayıcı eklenmesine hazırdır.
- Hız puanı, yorumun yerel sunucuya ulaştığı zamana göre hesaplanır. Platform olay zamanı olmadığı için yayın gecikmesine karşı kesin adalet garantisi verilmez.
- Yarışma başlangıcı, yeni soru, son 10 saniye, süre sonu, cevap açıklaması, aşama ve şampiyon olayları mevcut Ses Efektleri yuvalarına ayrı ayrı bağlanabilir veya kapatılabilir.

## Merkezi LIVE olay motoru

- Bütün modüller tek `LiveService` ve `LiveEventHub` kullanır; modüller TikTok'a ayrı bağlantı açmaz.
- Gerçek zamanlı resmî TikTok LIVE etkileşim API'si doğrulanmadığından gerçek mod bağlantı kurmaz. Demo ve manuel sağlayıcılar aynı olay/puanlama motorunu çalıştırır.
- Yorumlar Bilgi Arenası ve Sohbet Stüdyosu'na, hediyeler ortak GiftEngine ve TeamEngine'e dağıtılır.
- Hediye tekrarları ve kümülatif seri bildirimleri çift puanlanmaz. Takım puanları yayıncının kurallarıdır, parasal değer değildir.
- Ayrıntılı mimari, güvenlik ve güncel resmî erişim sınırları: [docs/LIVE-EVENT-ARCHITECTURE.md](docs/LIVE-EVENT-ARCHITECTURE.md).

## Bilinen sınırlar

- TikTok LIVE Studio'da localhost, şeffaflık ve canlı güncelleme **henüz doğrulanmadı** (bkz. TIKTOK-TEST.md).
- Gerçek TikTok verisi (yorum, hediye, izleyici) okunmaz; her şey elle yönetilir.
- Geliştirme için canlı yeniden yükleme (Vite dev) yok; kod değişince `npm run build`.
- Bilgi Arenası dahil son yerel değişiklikler Vercel'e henüz deploy edilmedi; canlı Vercel overlay eski sürümde kalır.
