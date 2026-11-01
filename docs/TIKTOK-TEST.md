# TikTok LIVE Studio entegrasyon testi (elle yapılır)

Bu adımlar TikTok LIVE Studio'yu programla kontrol edemediğimiz için **sizin tarafınızdan** yapılmalıdır.
Sonuçları işaretleyin; işaretlenmemiş madde "doğrulanmadı" demektir.

Canlı yayını BAŞLATMAYIN. LIVE Studio'nun önizleme/hazırlık ekranı yeterlidir.

1. `start.bat` ile MK LIVE PRO'yu açın (veya `npm run build` + `npm start`). Panel: http://127.0.0.1:4173/studio
2. TikTok LIVE Studio → mobil yayın görünümü → **Kaynak Ekle → Bağlantı**.
3. Yerel adres kabul edilirse `http://127.0.0.1:4173/overlay`; kabul edilmezse deploy edilmiş Vercel overlay adresini kullanın (varsayılan boyut yerine 1080 × 1920 girin, alan varsa).
4. Kaynağı sahnede kamera kaynağının **üstüne** yerleştirin ve tam kadraja uzatın.

## Kontrol listesi

| # | Test | Beklenen | Sonuç |
|---|------|----------|-------|
| 1 | localhost adresi yükleniyor mu? | "ŞİİR GECESİ" altın başlık görünür | [ ] |
| 2 | Arka plan şeffaf mı? | Kamera görüntüsü başlığın etrafında görünür, beyaz/siyah zemin yok | [ ] |
| 3 | Panelde başlığı "Türkü Gecesi" yapın | LIVE Studio önizlemesi yenilemeden ~1 sn içinde güncellenir | [ ] |
| 4 | Kamera kapanıyor mu? | Kamera yalnızca başlık/alt başlık/kart altında kalır | [ ] |
| 5 | Sahne Tasarımcısı'ndan tema değiştirin | Tema anında değişir | [ ] |
| 6 | Sunucuyu kapatıp açın (konsol penceresini kapatın, `start.bat`) | Başlık kaybolmaz; sunucu dönünce kendiliğinden bağlanır | [ ] |
| 7 | Yayın Ayarları'nda alt boşluğu artırın | Başlık bloğu / katılımcı kartı TikTok yorum alanının üstünde kalır | [ ] |

## Faz 1B — Şiir Stüdyosu kontrolü

Bu bölümde şiir metni hiçbir zaman yayında görünmemelidir. Vercel overlay testinden önce yeni sürümün kullanıcı onayıyla deploy edilmiş olması gerekir.

| # | Test | Beklenen | Sonuç |
|---|------|----------|-------|
| 1 | Şiir Stüdyosu'nda özel kütüphaneye bir şiir ekleyin | Şiir panelde kaydolur; overlay'de şiir metni görünmez | [ ] |
| 2 | Okuyan kişi ve üç kişilik sıra oluşturun | Yalnızca okuyan kişi ve “Sıradaki” bilgisi overlay'de görünür | [ ] |
| 3 | Sahneyi başlatın ve bitirin | Durum ve kartlar yenileme gerektirmeden yumuşak geçiş yapar | [ ] |
| 4 | Yağmur, sonbahar, gece ve nostalji temalarını sırayla seçin | Her atmosfer anında değişir, kamera alanı kullanılabilir kalır | [ ] |
| 5 | Yerel bir fotoğraf ekleyip “Çerçeveli görsel” seçin | Fotoğraf overlay'de görünür; Vercel'e dosya yüklenmez | [ ] |
| 6 | “Arka plan” ve görünürlük ayarını deneyin | Fotoğraf kadrajı doldurur ve seçilen saydamlığa uyar | [ ] |
| 7 | Yerel sunucuyu kapatıp açın | Şiir kütüphanesi, fotoğraflar, sıra ve sahne ayarları korunur | [ ] |
| 8 | Yayın hakkınız olan bir fon müziği ekleyip “Yumuşak başlat”a basın | Panelde müzik çalar; LIVE Studio ses ölçeri hareket eder | [ ] |
| 9 | Fon sesini değiştirip “Yumuşak duraklat”a basın | Ses seviyesi değişir ve müzik ani kesilmeden durur | [ ] |
| 10 | 30 MB'den küçük kısa bir MP4/WebM ekleyin | Video sessiz, otomatik ve döngülü oynar; fotoğraf modlarıyla aynı konum seçeneklerine uyar | [ ] |

Fon müziği testini gerçek yayına çıkmadan TikTok LIVE Studio Practice Mode'da yapın. Sistem/uygulama sesi kaynaklarda veya ses mikserinde kapalıysa panelde çalan müzik yayına gitmez.

## Faz 1C — Yarışma, Sohbet ve Türkü kontrolü

| # | Test | Beklenen | Sonuç |
|---|------|----------|-------|
| 1 | Yarışma Merkezi'nde soru, ipucu ve gizli cevap yazıp yarışmayı başlatın | Soru, ipucu ve geri sayım overlay'de görünür; gizli cevap görünmez | [ ] |
| 2 | “Cevabı göster”e basın | Doğru cevap overlay'de yalnızca bu işlemden sonra görünür | [ ] |
| 3 | Üç yarışmacı ekleyip puanları değiştirin | Skor tablosu puana göre sıralanır ve yenilemeden güncellenir | [ ] |
| 4 | Kazananı seçip yarışmayı bitirin | Kazanan kartı overlay'de animasyonla görünür | [ ] |
| 5 | Sohbet Stüdyosu'nda konu ve soru kartı gösterin | Konu ile soru ayrı kartlarda görünür; ayrı ayrı gizlenebilir | [ ] |
| 6 | Soru havuzuna birkaç soru ekleyip rastgele soru seçin | Seçilen soru aktif karta gelir ve panelden yayına alınabilir | [ ] |
| 7 | Türkü Stüdyosu'nda iki eser isteği ekleyin | Eser, sanatçı/kaynak, yöre ve istek sahibi bilgileri sırada görünür | [ ] |
| 8 | İlk eseri sahneye alıp başlatın | Şimdiki eser ve varsa sıradaki eser overlay'de görünür | [ ] |
| 9 | Eseri bitirip sıradakini sahneye alın | Durum ve eser bilgisi yenileme gerektirmeden değişir | [ ] |
| 10 | Sol menüyü kontrol edin | Ayrı Şarkı Stüdyosu yoktur; tek Türkü Stüdyosu bulunur | [ ] |
| 11 | Yarışma, Sohbet ve Türkü stüdyolarında farklı fotoğraflar seçin | Her stüdyo kendi fotoğrafını, görünürlük, karartma ve bulanıklık ayarını korur | [ ] |
| 12 | Fotoğrafı kapat düğmesine basın | Overlay yeniden şeffaf olur ve kamera alanı görünür kalır | [ ] |

## Global Ses Efektleri

Sağ alttaki “Ses Efektleri” paneli bütün stüdyo sayfalarında görünmelidir. Dosya atamadan altı düğmeyi de deneyin: alkış ve ding-dong sentezlenmiş efekt, tebrikler/hoş geldiniz/wow/kahkaha ise bilgisayarın yerel konuşma motoruyla çalışır. İstenirse her düğme yayın hakkı bulunan başka bir ses dosyasıyla değiştirilebilir. Fon müziği açıkken efektlere basın: fon kesilmeden efekt çalmalı ve LIVE Studio ses ölçeri hareket etmelidir.

## Bilgi Arenası kontrolü

Gerçek TikTok yorum bağlantısı henüz yoktur. Bu testte paneldeki manuel giriş kullanılır; DEMO girdileri gerçek katılımcı sayılmaz.

| # | Test | Beklenen | Sonuç |
|---|------|----------|-------|
| 1 | Yarışma Merkezi → Bilgi Arenası → Turnuvayı başlat | Bilgi Arenası bekleme ekranı açılır; Kelime ve Türkü Tahmini ayrı sekmede kalır | [ ] |
| 2 | Okuma süresini başlat | Soru ve A/B/C/D görünür, “SORUYU DİNLEYİN” yazar; doğru şık belli olmaz | [ ] |
| 3 | Okuma sırasında manuel cevap gönder | Cevap reddedilir ve puan oluşmaz | [ ] |
| 4 | Cevapları aç | Sayaç 50 saniyeden başlar ve “CEVABINI YORUMLARA YAZ” görünür | [ ] |
| 5 | Aynı kullanıcı kimliğiyle iki cevap gönder | Yalnızca ilk geçerli cevap kaydedilir | [ ] |
| 6 | Doğru ve yanlış cevaplar gönderip cevapları kilitle | Yeni cevap kabul edilmez; puanlar sunucuda hesaplanır | [ ] |
| 7 | Doğru cevabı açıkla, ardından sonuçları göster | Doğru seçenek yeşil olur; A/B/C/D dağılımı ve istatistikler görünür | [ ] |
| 8 | Soru 10'dan sonra sonraki soruya geç | Aşama ilk üçü ve aşama puanları görünür | [ ] |
| 9 | Test 3'ü bitir | “GECENİN ŞAMPİYONLARI” genel ilk üç ekranı görünür | [ ] |
| 10 | Ses Efektleri → Bilgi Arenası otomatik sesleri | Her olay ayrı kapatılabilir veya bir efekt yuvasına bağlanabilir | [ ] |
| 11 | Sunucuyu kapatıp yeniden aç | Turnuva, cevaplar, puanlar ve düzeltme geçmişi korunur | [ ] |

## Kelime ve Türkü Tahmini paketleri

| # | Test | Beklenen | Sonuç |
|---|------|----------|-------|
| 1 | Diğer yarışmalar → Kelime Tahmini | 40 soruluk paket, önceki/rastgele/sonraki kontrolleri ve gizli cevap görünür | [ ] |
| 2 | Bir kelime sorusunu başlatıp ipucunu gösterin | Soru ve ipucu overlay'de görünür; cevap açıklanmadan görünmez | [ ] |
| 3 | Diğer yarışmalar → Türkü Tahmini | 40 soruluk, şarkı sözü içermeyen türkü ipucu paketi açılır | [ ] |
| 4 | Bir türkü sorusunda “Cevabı göster”e basın | Türkü adı yalnızca açıklama komutundan sonra overlay'de görünür | [ ] |
| 5 | Yarışma modu düğmelerini kontrol edin | Şiir Tamamlama seçeneği bulunmaz | [ ] |

## Sorun giderme

- **Sayfa yüklenmiyor / boş**: LIVE Studio'nun gömülü tarayıcısı localhost'a izin vermiyor olabilir. Bunu bize bildirin;
  alternatif olarak `127.0.0.1` yerine `localhost` adresini deneyin: `http://localhost:4173/overlay`.
- **Beyaz/siyah zemin görünüyor**: Kaynağın şeffaflığı desteklenmiyor olabilir. Bildirin; chroma-key (yeşil perde) yedeği eklenebilir.
- **Güncelleme gelmiyor**: Panelin sol altında "Yayın katmanına bağlı" yazıyor mu? Tarayıcıda `http://127.0.0.1:4173/api/health` açın.
