# TikTok Login Kit Sandbox kurulumu

Bu entegrasyon yalnızca TikTok hesabıyla giriş ve `user.info.basic` izni içindir. TikTok LIVE yorumlarına, hediyelerine, beğenilerine, takiplerine veya katılım olaylarına erişim sağlamaz.

## Developer Portal

- Platform: Desktop
- Ürün: Login Kit
- Kapsam: `user.info.basic`
- Redirect URI: `http://127.0.0.1:4173/auth/tiktok/callback`
- Sandbox Target user: Testte kullanılacak TikTok hesabı

## Yerel uygulama

Repo kökünde `.env.example` dosyasını `.env.local` adıyla kopyalayın. Yalnızca Sandbox **Client key** değerini `TIKTOK_CLIENT_KEY` alanına yazın.

Client Secret değerini `.env.local`, kaynak kod, Git veya masaüstü uygulamasına yazmayın.

## Vercel ortam değişkenleri

Vercel Project Settings > Environment Variables alanında şu değerleri tanımlayın:

- `TIKTOK_CLIENT_KEY`: Sandbox Client key
- `TIKTOK_CLIENT_SECRET`: Sandbox Client secret
- `TIKTOK_REDIRECT_URI`: `http://127.0.0.1:4173/auth/tiktok/callback`

Değerleri Production, Preview ve Development ortamlarına yalnızca ihtiyaç duyulan kapsamda ekleyin. Değerleri ekledikten sonra yeni deployment gerekir.

## Demo akışı

1. `npm start` ile yerel uygulamayı başlatın.
2. `http://127.0.0.1:4173/studio?page=live` adresini açın.
3. **TikTok ile Sandbox giriş** düğmesine basın.
4. Target user hesabıyla TikTok girişini ve izin ekranını tamamlayın.
5. Yerel callback ekranından MK LIVE PRO Studio'ya dönün.
6. TikTok görünen adı/avatarı ile `user.info.basic` izninin gösterildiğini doğrulayın.
7. **TikTok hesabını ayır** düğmesiyle token iptalini gösterin.

## Güvenlik notları

- OAuth isteği her seferinde yeni `state` ve PKCE `code_verifier` üretir.
- TikTok'un istediği SHA-256 hex `code_challenge` kullanılır.
- Client Secret yalnızca Vercel sunucu fonksiyonunda okunur.
- Token yanıtları önbelleğe alınmaz ve Studio arayüzüne aktarılmaz.
- Sandbox oturumu yalnızca yerel sunucu belleğinde tutulur; uygulama kapanınca temizlenir.
- Üretim öncesinde güvenli kalıcı token kasası, yenileme akışı, hız sınırlama ve operasyonel izleme ayrıca tamamlanmalıdır.
