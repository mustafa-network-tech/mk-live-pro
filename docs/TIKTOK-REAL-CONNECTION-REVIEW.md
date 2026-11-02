# Gerçek TikTok LIVE bağlantısı değerlendirmesi

Tarih: 2026-11-02

## Karar

Gerçek TikTok LIVE yorum/hediye sağlayıcısı etkinleştirilmedi. İncelenen herkese açık resmî TikTok geliştirici ürünlerinde gerçek zamanlı LIVE yorum, hediye, beğeni, takip veya katılım akışı bulunmuyor. Teknik olarak çalışan gayriresmî bağlayıcılar ise TikTok'un yazılı onay olmadan tersine mühendislik ve otomatik veri çıkarmayı yasaklayan koşullarıyla uyumlu olduğu doğrulanamadığı için üretim bağımlılığı olarak eklenmedi.

Bu karar teknik yetersizlikten değil, izin ve kullanım koşulu doğrulamasından kaynaklanır.

## Resmî seçenekler

TikTok for Developers ürün listesinde Share Kit, Login Kit, Content Posting API, Research API, Display API, Embed, Data Portability ve Commercial Content API yer alıyor; genel bir gerçek zamanlı LIVE Events ürünü listelenmiyor:

https://developers.tiktok.com/docs/en/get-started

TikTok Developer uygulamaları ürün/scope bazında inceleme ve onaya tabidir:

https://developers.tiktok.com/docs/en/our-guidelines-developer-guidelines

Research API video yorumlarını araştırma amacıyla sorgular; canlı yayın WebSocket akışı değildir. Data Portability ise kullanıcının arşiv verisini aktarır, gerçek zamanlı yayın olaylarını sağlamaz.

## `tiktok-live-connector` değerlendirmesi

Kaynaklar:

- NPM: https://www.npmjs.com/package/tiktok-live-connector
- GitHub: https://github.com/zerodytrash/TikTok-Live-Connector
- Lisans: https://github.com/zerodytrash/TikTok-Live-Connector/blob/ts-rewrite/LICENSE
- Sürümler: https://github.com/zerodytrash/TikTok-Live-Connector/releases

Teknik durum:

- Node.js/TypeScript projesine uyumlu ve yorum, hediye, üye katılımı, beğeni, takip, paylaşım ve yayın sonu olaylarını sunuyor.
- 2 Kasım 2026 incelemesinde NPM sürümü `2.5.0`; yakın tarihli yayın ve bakım faaliyeti var.
- TikTok'un dahili Webcast akışını tersine mühendislikle okuduğunu ve TikTok/ByteDance ile bağlantılı olmadığını açıkça belirtiyor.
- Bağlantı imzası için varsayılan olarak üçüncü taraf Euler Stream hizmetini kullanabiliyor. Kimliği doğrulanmış bağlantıda oturum cookie/OAuth bilgisinin imza hizmetine aktarılabilmesi ayrı bir güvenlik ve gizlilik riskidir.
- TikTok protokol değişiklikleri bağlantıyı habersiz bozabilir. Bölgesel WebSocket başarısızlıkları ve VPN gerektirdiğini bildiren kullanıcı sorunları bulunuyor.
- Yeniden bağlanma, hediye serisi ve tekrar ayıklama yine uygulama tarafından savunmalı biçimde ele alınmalıdır.

Lisans:

- `package.json` lisansı `AGPL-3.0-only` olarak bildiriliyor.
- Depodaki değiştirilmiş AGPL metni overlay/bot gibi bazı yerel entegrasyonlara ek izin veriyor; kapalı kaynak ticari SaaS, WebSocket relay ve veri API'si için istisnayı kaldırıyor.
- Bu lisans değerlendirmesi hukuk görüşü değildir; dağıtım modeli için ayrıca lisans incelemesi gerekir.

Kullanım koşulları:

TikTok'un güncel koşulları açık yazılı izin olmadan platform bileşenlerini tersine mühendislikle incelemeyi ve otomatik yazılımla veri çıkarmayı yasaklıyor:

https://t.tiktok.com/legal/page/us/terms-of-service/en

Bu nedenle yayın yalnızca kullanıcıya ait olsa bile `tiktok-live-connector` yönteminin TikTok tarafından izinli olduğu doğrulanmış değildir. Kütüphanenin açık kaynak lisansı, TikTok platform izninin yerine geçmez.

## Somut öneri

1. TikTok Developer/partner kanalı üzerinden MK LIVE PRO kullanım senaryosu için gerçek zamanlı LIVE yorum ve hediye erişimine yazılı onay isteyin.
2. Onay; sağlayıcı adı, uç nokta/protokol, izin verilen olay türleri, kullanıcı rızası, saklama süresi, oran sınırı ve üretim kullanım hakkını açıkça içermelidir.
3. Yetkili erişim verildiğinde tek bir `LiveProvider` uygulaması eklenmeli; olaylar mevcut `LiveEventHub` içine normalize edilmelidir. Arena, GiftEngine, TeamEngine ve ChatEngine değiştirilmemelidir.
4. Kimlik bilgileri yalnızca yerel sunucu ortamı/config dosyasında tutulmalı; Studio veya overlay WebSocket durumuna gönderilmemelidir.
5. Önce ayrı bir test yayınıyla yorum, hediye serisi, kopma/yeniden bağlanma ve tekrar ayıklama doğrulanmalı; ancak bundan sonra `LIVE` yetenekleri destekleniyor olarak işaretlenmelidir.

Studio paneli kullanıcı adını alır ve gerçek sağlayıcı durumunu dürüstçe gösterir; onaylı sağlayıcı bulunmadığı için bağlantı girişimi `unsupported` durumuyla sonuçlanır. Demo/manüel olaylar gerçek olay alanlarına yazılmaz.
