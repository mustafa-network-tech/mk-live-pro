# TikTok LIVE Studio entegrasyon testi (elle yapılır)

Bu adımlar TikTok LIVE Studio'yu programla kontrol edemediğimiz için **sizin tarafınızdan** yapılmalıdır.
Sonuçları işaretleyin; işaretlenmemiş madde "doğrulanmadı" demektir.

Canlı yayını BAŞLATMAYIN. LIVE Studio'nun önizleme/hazırlık ekranı yeterlidir.

1. `start.bat` ile MK LIVE PRO'yu açın (veya `npm run build` + `npm start`). Panel: http://127.0.0.1:4173/studio
2. TikTok LIVE Studio → mobil yayın görünümü → **Kaynak Ekle → Bağlantı**.
3. Adres: `http://127.0.0.1:4173/overlay` (varsayılan boyut yerine 1080 × 1920 girin, alan varsa).
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

## Sorun giderme

- **Sayfa yüklenmiyor / boş**: LIVE Studio'nun gömülü tarayıcısı localhost'a izin vermiyor olabilir. Bunu bize bildirin;
  alternatif olarak `127.0.0.1` yerine `localhost` adresini deneyin: `http://localhost:4173/overlay`.
- **Beyaz/siyah zemin görünüyor**: Kaynağın şeffaflığı desteklenmiyor olabilir. Bildirin; chroma-key (yeşil perde) yedeği eklenebilir.
- **Güncelleme gelmiyor**: Panelin sol altında "Yayın katmanına bağlı" yazıyor mu? Tarayıcıda `http://127.0.0.1:4173/api/health` açın.
