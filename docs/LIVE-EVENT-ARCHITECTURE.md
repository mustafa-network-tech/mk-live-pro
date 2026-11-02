# Merkezi LIVE olay mimarisi

Tarih: 2026-11-02

## Akış

`DemoProvider / ManualProvider` → `LiveService` → `LiveEventHub` → Bilgi Arenası, GiftEngine, TeamEngine, ChatEngine → WebSocket → Studio ve overlay.

- `apps/local-server/src/live-provider.ts`: Yerel demo ve manuel sağlayıcılar. Gerçek entegrasyon olduklarını iddia etmezler.
- `apps/local-server/src/live-event-hub.ts`: Olay doğrulama, normalizasyon, `eventId` tekrar ayıklama ve abonelere dağıtım.
- `apps/local-server/src/live-service.ts`: Tek bağlantı durumu, sağlayıcı seçimi, olay kaydı, hediye/seri işleme, takım puanı, lider değişimi ve sohbet dağıtımı.
- `packages/shared/src/live.ts`: Ortak olay, bağlantı, hediye, takım, sohbet ve WebSocket komut tipleri.
- `data/live-events.json`: En çok 500 olay/hediye, 200 sohbet ile sınırlı yerel kayıt. Olaylar ayrıca yedi günden eskiyse budanır.

Modüller TikTok'a veya yerel sağlayıcılara doğrudan bağlanmaz. Bilgi Arenası `COMMENT_RECEIVED`, hediye ve takım motorları `GIFT_RECEIVED`, Sohbet Stüdyosu ise yorum, katılım ve hediye olaylarını ortak merkezden alır.

## Güvenlik

- Sunucu yalnızca `127.0.0.1` üzerinde dinler.
- Olay üretme ve motor komutları yalnızca `role=studio` WebSocket istemcisine açıktır; overlay salt okunurdur.
- Yabancı Host ve Origin reddedilir. Ayrı bir HTTP test olayı uç noktası açılmamıştır.
- TikTok sırrı/tokenı için tarayıcı alanı veya protokolü yoktur.
- Otomatik gösterilecek metinler kontrol karakterlerinden arındırılır, uzunluk sınırına alınır, engelli kelimeler işaretlenir ve yayıncı seçimi olmadan seçili yorum olarak overlay'e çıkmaz.
- Takım hediye kuralları para değeri değildir. Aynı hediye iki takıma atanırsa yapılandırma reddedilir.

## Resmî TikTok durumu

2 Kasım 2026 tarihinde incelenen herkese açık TikTok for Developers belgelerinde gerçek zamanlı LIVE yorum, hediye, beğeni, takip, katılım veya paylaşım akışı sağlayan genel bir ürün/uç nokta belgelenmemiştir. Bu, belgelerin kapsamından yapılan bir çıkarımdır; özel/partner erişimi bulunmadığı anlamına gelmez.

- Webhook olay listesi yetki kaldırma, video yayınlama/yükleme ve veri taşınabilirliği gibi olayları belgeler; LIVE etkileşim olaylarını listelemez: https://developers.tiktok.com/docs/en/webhooks-events
- Research API yorum ucu, yayın yorumlarını değil yayınlanmış videoların yorumlarını sorgular ve araştırmacı onayı gerektirir: https://developers.tiktok.com/docs/en/research-api-specs-query-video-comments
- Research API çevrim içi yarışma akışı için tasarlanmamıştır; arşiv verilerinde gecikmeler belgelenir: https://developers.tiktok.com/docs/en/research-api-faq
- Data Portability, kullanıcının arşivindeki LIVE geçmişi/veri kategorilerini açıklar; gerçek zamanlı olay akışı değildir: https://developers.tiktok.com/docs/en/data-portability-data-types
- Üretim API erişimleri ürün/scope ve uygulama incelemesine tabidir: https://developers.tiktok.com/docs/en/getting-started-create-an-app

Bu nedenle `LIVE` modu bağlantı kurmaz ve bütün LIVE etkileşim yeteneklerini `available: false` gösterir. Onaylanmış resmî/partner erişimi sağlanırsa yeni sağlayıcı yalnızca `LiveProvider` sınırına eklenmeli; modüller değiştirilmemelidir.

## Doğrulanan senaryolar

`npm test` aşağıdakileri aynı WebSocket/EventBus akışıyla doğrular:

- Cevap yalnızca cevap süresinde alınır; ilk geçerli cevap sayılır.
- Doğru cevap 10–1 hız puanı alır, yanlış cevap sıfır alır; sayaçlar ve sıralama studio/overlay'e gider.
- Tekrarlanan hediye `eventId` ile, seri hediye ise kümülatif seri adediyle çift puanlanmaz.
- Takıma atanmış hediye puanlanır ve lider değişim olayı üretilir.
- Yorum ve hediye teşekkürü Sohbet Stüdyosu akışına gider.
- Kaynak modu uyuşmayan olay reddedilir.
- Kopma durumu doğru görünür; yeniden bağlantıda arena/takım puanları kaybolmaz.
- Yeniden başlatmada sağlayıcı bağlı görünmez; JSON puanları geri yüklenir.
- Gerçek TikTok yetenekleri destekleniyor gibi gösterilmez.

Gerçek TikTok LIVE hesabıyla doğrulama yapılmamıştır.

Gerçek bağlantı seçeneklerinin güncel teknik, lisans ve kullanım koşulu değerlendirmesi: [TIKTOK-REAL-CONNECTION-REVIEW.md](TIKTOK-REAL-CONNECTION-REVIEW.md).
