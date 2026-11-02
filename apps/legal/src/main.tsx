import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './legal.css';

type Language = 'tr' | 'en';
type LegalPage = 'terms' | 'privacy';
type Copy = {
  title: string;
  eyebrow: string;
  summary: string;
  sections: Array<{ title: string; paragraphs?: string[]; bullets?: string[] }>;
};

const identityNotice = {
  tr: 'İşletme: MK Digital Systems · İşletme sahibi: Mustafa Öner · Adres: Bolu Merkez / Bolu / Türkiye · Destek, hukuk ve KVKK başvuruları: iletisim@mk-digitalsystems.com',
  en: 'Business: MK Digital Systems · Proprietor: Mustafa Öner · Address: Bolu Merkez / Bolu / Türkiye · Support, legal, and KVKK requests: iletisim@mk-digitalsystems.com',
};

const terms: Record<Language, Copy> = {
  tr: {
    title: 'Kullanım Koşulları',
    eyebrow: 'MK LIVE PRO · Yasal',
    summary: 'Bu koşullar, MK LIVE PRO’nun yerel yayın yönetimi, sahne, yarışma ve etkileşim araçlarının kullanımını düzenler.',
    sections: [
      { title: '1. Hizmetin tanımı', paragraphs: ['MK LIVE PRO; yayıncıların yayın sahnelerini, overlay’leri, bilgi yarışmalarını, sohbet kartlarını, hediye ve takım puanı kurallarını kendi bilgisayarlarında yönetmelerine yardımcı olan bir yayın aracıdır. Mevcut sürüm ağırlıklı olarak yerel Node.js, WebSocket ve JSON mimarisiyle çalışır.', 'Hizmet, TikTok’ta yayın açma hakkı vermez ve TikTok hesabı, internet bağlantısı, yayın ekipmanı veya üçüncü taraf platform erişimi sağlamaz.'] },
      { title: '2. Hesap ve kullanım sorumluluğu', bullets: ['Yayıncı, kullandığı TikTok veya diğer platform hesabının sahibi ya da yetkili kullanıcısı olmalıdır.', 'Hesap güvenliği, yayın içeriği, moderasyon kararları, katılımcı bilgilendirmeleri ve gerekli izinler yayıncının sorumluluğundadır.', 'Yerel panel ve bilgisayar erişimi korunmalı; yayın kontrolü yetkisiz kişilerle paylaşılmamalıdır.'] },
      { title: '3. Yarışma, sohbet, hediye ve yayın araçları', paragraphs: ['Bilgi Arenası puanları, takım puanları ve hediye eşlemeleri yalnızca yayın içi eğlence ve etkileşim amaçlıdır. Bunlar TikTok’un resmî parasal değeri, çekiliş sonucu, kamuoyu araştırması veya seçim sonucu değildir.', 'Yayıncı; soru doğruluğunu, yarışma kurallarını, mesaj filtrelerini, ekranda gösterilen yorumları ve telif hakkı bulunan ses/görselleri kontrol etmekle yükümlüdür.'] },
      { title: '4. TikTok ve üçüncü taraflardan bağımsızlık', paragraphs: ['MK LIVE PRO, TikTok veya ByteDance tarafından geliştirilmiş, desteklenmiş, onaylanmış ya da sponsor edilmiş değildir. TikTok adı ve hizmetleri ilgili hak sahiplerine aittir.', 'Mevcut sürümde gerçek TikTok LIVE yorum ve hediye bağlantısı etkin değildir. Demo ve manuel olaylar gerçek izleyici etkinliği olarak sunulmaz. Gelecekte yalnızca izinleri doğrulanmış bir bağlantı sağlanırsa ayrıca duyurulur.'] },
      { title: '5. Fikrî mülkiyet', paragraphs: ['MK LIVE PRO yazılımı, markası, özgün arayüzü ve belgeleri üzerindeki haklar MK Digital Systems’a veya ilgili lisans sahiplerine aittir. Yayıncıların yüklediği medya ve oluşturduğu içerikler üzerindeki hakları kendilerinde kalır.', 'Kullanıcı, yüklediği müzik, görsel, video, logo, metin ve diğer içerikler için gerekli kullanım ve yayın haklarına sahip olduğunu kabul eder.'] },
      { title: '6. Yasaklı kullanım', bullets: ['Hukuka aykırı, yanıltıcı, taciz edici, ayrımcı veya hak ihlal eden yayınlar;', 'Sahte hediye, puan, izleyici veya platform bağlantısı izlenimi oluşturmak;', 'Yetkisiz erişim, zararlı kod, güvenlik önlemlerini aşma veya hizmeti bozma girişimleri;', 'TikTok veya diğer platformların koşullarını, fikrî mülkiyetini ya da kullanıcı gizliliğini ihlal etmek;', 'Yasal izin olmadan kumar, bahis, çekiliş veya parasal ödül sistemi işletmek.'] },
      { title: '7. Erişilebilirlik ve teknik sınırlamalar', paragraphs: ['Hizmet “mevcut olduğu şekliyle” sunulur. Yerel ağ izinleri, tarayıcı politikaları, TikTok LIVE Studio, Vercel veya üçüncü taraf değişiklikleri bazı özellikleri etkileyebilir. Kesintisiz, hatasız veya her platform sürümüyle uyumlu çalışma garantisi verilmez.', 'Gerçek zamanlı platform verileri ancak resmî/yetkili erişim sağlandığında kullanılabilir. Test edilmemiş bağlantılar çalışıyor olarak gösterilmez.'] },
      { title: '8. Ticari lisans ve abonelikler', paragraphs: ['Şu anda bu sayfa üzerinden etkin bir ücretli abonelik, otomatik yenileme veya ticari lisans satışı sunulmamaktadır. İleride ücretli planlar sunulursa fiyat, kapsam, yenileme, iptal ve iade koşulları satın alma öncesinde ayrıca açıklanacaktır.', 'Bu koşullar, henüz sunulmayan ücretli özellikler için ödeme yükümlülüğü oluşturmaz.'] },
      { title: '9. Askıya alma ve sonlandırma', paragraphs: ['Güvenlik, hukuka uygunluk veya ciddi kötüye kullanım gerektirdiğinde hizmete erişim sınırlandırılabilir. Kullanıcı yerel yazılımı kullanmayı bırakabilir ve yerel kayıtlarını silebilir.', 'Sonlandırma; doğmuş ödeme yükümlülüklerini, fikrî mülkiyet hükümlerini veya niteliği gereği devam etmesi gereken hükümleri ortadan kaldırmaz.'] },
      { title: '10. Sorumluluğun sınırı', paragraphs: ['Emredici hukuk kuralları saklı kalmak üzere; yayın kesintisi, platform değişikliği, veri kaybı, hesap yaptırımı, gelir kaybı veya kullanıcı tarafından yüklenen içeriklerden doğan sonuçlar bakımından sorumluluk, uygulanabilir hukukun izin verdiği ölçüde sınırlıdır. Düzenli yerel yedek alma sorumluluğu yayıncıya aittir.'] },
      { title: '11. Uygulanacak hukuk ve yetki', paragraphs: ['Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Emredici yetki kuralları ile tüketicilerin kanundan doğan başvuru ve seçimlik hakları saklı kalmak üzere, bu koşullardan doğan uyuşmazlıklarda Bolu Mahkemeleri yetkilidir.'] },
      { title: '12. Değişiklikler, iletişim ve yürürlük', paragraphs: ['Koşullar ürün veya mevzuat değişikliklerine göre güncellenebilir. Önemli değişikliklerde yeni tarih bu sayfada yayımlanır.', 'Yürürlük tarihi: 2 Kasım 2026.', 'İşletme: MK Digital Systems. İşletme sahibi: Mustafa Öner. Adres: Bolu Merkez / Bolu / Türkiye. Destek, hukuk ve diğer bildirimler için: iletisim@mk-digitalsystems.com.'] },
    ],
  },
  en: {
    title: 'Terms of Service',
    eyebrow: 'MK LIVE PRO · Legal',
    summary: 'These terms govern the local broadcast management, scene, quiz, and interaction tools offered by MK LIVE PRO.',
    sections: [
      { title: '1. Service description', paragraphs: ['MK LIVE PRO helps broadcasters manage scenes, overlays, knowledge quizzes, chat cards, gift rules, and team scoring on their own computers. The current version primarily uses a local Node.js, WebSocket, and JSON architecture.', 'The service does not grant eligibility to stream on TikTok and does not provide a TikTok account, internet connection, broadcast equipment, or third-party platform access.'] },
      { title: '2. Account and user responsibilities', bullets: ['The broadcaster must own or be authorised to use every connected platform account.', 'Account security, broadcast content, moderation, participant notices, and required permissions remain the broadcaster’s responsibility.', 'Access to the local panel and computer must be protected from unauthorised users.'] },
      { title: '3. Quizzes, chat, gifts, and broadcast tools', paragraphs: ['Knowledge Arena scores, team points, and gift mappings are for in-stream entertainment and interaction only. They are not official TikTok monetary values, sweepstakes results, opinion polling, or election results.', 'The broadcaster must review question accuracy, competition rules, message filters, displayed comments, and the rights to all music and visual media used.'] },
      { title: '4. Independence from TikTok and third parties', paragraphs: ['MK LIVE PRO is not developed, supported, endorsed, or sponsored by TikTok or ByteDance. TikTok names and services belong to their respective owners.', 'Real TikTok LIVE comment and gift connectivity is not enabled in the current version. Demo and manual events are never represented as real viewer activity. Any future authorised integration will be disclosed separately.'] },
      { title: '5. Intellectual property', paragraphs: ['Rights in the MK LIVE PRO software, brand, original interface, and documentation belong to MK Digital Systems or the relevant licensors. Broadcasters retain rights in content they create or upload.', 'Users confirm that they hold all permissions required for music, images, videos, logos, text, and other material used in their broadcasts.'] },
      { title: '6. Prohibited use', bullets: ['Illegal, deceptive, harassing, discriminatory, or rights-infringing broadcasts;', 'Creating a false impression of gifts, scores, viewers, or platform connectivity;', 'Unauthorised access, malicious code, circumvention, or service disruption;', 'Violation of platform terms, intellectual property, or user privacy;', 'Running gambling, betting, prize draws, or monetary reward schemes without all legally required permissions.'] },
      { title: '7. Availability and technical limitations', paragraphs: ['The service is provided “as available”. Local-network permissions, browser policies, TikTok LIVE Studio, Vercel, or third-party changes may affect features. Uninterrupted, error-free operation or compatibility with every platform version is not guaranteed.', 'Real-time platform data can be used only after official or otherwise authorised access is confirmed. Untested connections are not presented as operational.'] },
      { title: '8. Commercial licences and subscriptions', paragraphs: ['No paid subscription, automatic renewal, or commercial licence is currently sold through this page. If paid plans are introduced, pricing, scope, renewal, cancellation, and refund terms will be shown before purchase.', 'These terms create no payment obligation for features that are not currently offered.'] },
      { title: '9. Suspension and termination', paragraphs: ['Access may be limited where necessary for security, legal compliance, or serious misuse. Users may stop using the local software and delete their local records.', 'Termination does not affect accrued payment obligations, intellectual-property provisions, or terms that by their nature should survive.'] },
      { title: '10. Limitation of liability', paragraphs: ['Subject to mandatory law, liability for broadcast interruption, platform changes, data loss, account action, loss of income, or user-supplied content is limited to the extent permitted by applicable law. Broadcasters are responsible for maintaining local backups.'] },
      { title: '11. Governing law and jurisdiction', paragraphs: ['These terms are governed by the laws of the Republic of Türkiye. Subject to mandatory jurisdiction rules and consumers’ statutory rights and remedies, the courts of Bolu have jurisdiction over disputes arising from these terms.'] },
      { title: '12. Changes, contact, and effective date', paragraphs: ['These terms may be updated for product or legal changes. Material revisions will carry a new date on this page.', 'Effective date: 2 November 2026.', 'Business: MK Digital Systems. Proprietor: Mustafa Öner. Address: Bolu Merkez / Bolu / Türkiye. Support, legal notices, and other communications: iletisim@mk-digitalsystems.com.'] },
    ],
  },
};

const privacy: Record<Language, Copy> = {
  tr: {
    title: 'Gizlilik Politikası',
    eyebrow: 'MK LIVE PRO · Gizlilik',
    summary: 'Bu politika, mevcut yerel mimaride hangi verilerin işlendiğini, hangi verilerin henüz toplanmadığını ve KVKK kapsamındaki hakları açıklar.',
    sections: [
      { title: '1. Veri sorumlusu ve iletişim', paragraphs: ['Veri sorumlusu MK Digital Systems’tır. İşletme sahibi Mustafa Öner’dir. Adres: Bolu Merkez / Bolu / Türkiye.', 'Destek, gizlilik ve KVKK kapsamındaki ilgili kişi başvuruları için iletisim@mk-digitalsystems.com adresi kullanılır.'] },
      { title: '2. Mevcut ürünün veri modeli', paragraphs: ['MK LIVE PRO’nun mevcut masaüstü/yerel sunucu sürümü, yayın durumunu ve yapılandırmaları esas olarak yayıncının bilgisayarında JSON dosyalarında saklar. Studio ve overlay arasında yerel WebSocket bağlantısı kullanılır.', 'Herkese açık yasal sayfalar form, hesap açma, reklam analitiği veya takip pikseli içermez.'] },
      { title: '3. İşlenebilecek veri kategorileri ve amaçlar', bullets: ['Yayıncı yapılandırmaları: sahne başlıkları, tema, takım ve yarışma kuralları; yayını oluşturmak ve yerel ayarları korumak için.', 'Yerel teknik bilgiler: bağlantı durumu, hata bilgisi, olay zamanı ve oturum kimliği; güvenlik, hata ayıklama ve tekrar ayıklama için.', 'Manuel/demo kullanıcı verileri: test kullanıcı adı, görünen ad, yorum ve hediye olayı; merkezi EventBus, yarışma, sohbet ve hediye motorlarını yerelde test etmek için.', 'Yayıncının yüklediği medya: görsel, video ve ses dosyaları; yayın sahnesinde kullanmak için.'] },
      { title: '4. TikTok hesabı ve erişim izinleri', paragraphs: ['Mevcut sürümde gerçek TikTok LIVE yorum veya hediye bağlantısı etkin değildir. TikTok erişim tokenı, hesabın parolası veya gerçek izleyici olayları bu özellik kapsamında toplanmamaktadır.', 'Panelde girilen yayıncı kullanıcı adı, gerçek bağlantı mevcut olmadığı sürece yalnızca yerel bağlantı yapılandırması/uygunluk durumu için kullanılabilir. Gelecekte resmî veya yetkili bağlantı etkinleştirilmeden önce bu politika; izinler, hukuki sebep, aktarım ve saklama bilgileriyle güncellenecektir.'] },
      { title: '5. İzleyici yorumları, kullanıcı adları ve hediyeler', paragraphs: ['Şu anda otomatik olarak gerçek TikTok izleyici yorumu, kullanıcı adı veya hediye olayı alınmaz. Demo ve manuel olaylar açıkça bu şekilde etiketlenir.', 'Yetkili gerçek entegrasyon ileride açılırsa; yorum metni, platform kullanıcı kimliği/kullanıcı adı, görünen ad, olay zamanı, hediye kimliği/adedi ve yayın oturumu bilgisi yarışma puanlama, moderasyon, sohbet gösterimi ve hediye/takım kuralları için işlenebilir. Bu değişiklik gerçekleşmeden önce gerekli aydınlatma yapılacaktır.'] },
      { title: '6. Hukuki sebepler', paragraphs: ['Her işleme faaliyeti, uygulanabilir mevzuatta geçerli bir hukuki sebebe dayanmalıdır. Mevcut yerel yapılandırmalar hizmetin kurulması/çalıştırılması, güvenlik ve kullanıcının talep ettiği işlevlerin sağlanması amacıyla işlenir.', 'Açık rıza gerektiren yeni bir faaliyet, rıza alınmadan başlatılmaz. Gerçek TikTok entegrasyonu veya yeni bir veri akışı etkinleştirilmeden önce hukuki sebep matrisi ayrıca doğrulanmalıdır.'] },
      { title: '7. Saklama yeri ve süreleri', paragraphs: ['Yerel uygulama kayıtları varsayılan olarak yayıncının bilgisayarındaki data klasöründe tutulur; yeni bir bulut veritabanı kullanılmaz. Mevcut teknik sınırlar: son olay günlüğü en fazla 500 kayıt ve yedi gün, hediye kaydı en fazla 500 kayıt, sohbet akışı en fazla 200 kayıt. Yapılandırmalar ve puan kayıtları kullanıcı sıfırlayana/silene veya işleme amacı sona erene kadar yerelde kalabilir.', 'Vercel tarafından sunulan herkese açık sayfalara ilişkin standart erişim/güvenlik loglarının süresi Vercel hesabı ve hizmet koşullarına bağlıdır. Veri akışları veya sağlayıcı ayarları değiştiğinde saklama ve imha bilgileri bu politikada güncellenir.'] },
      { title: '8. Üçüncü taraf hizmet sağlayıcıları', paragraphs: ['Herkese açık web içeriğinin barındırılması için Vercel kullanılmaktadır. TikTok LIVE Studio ve TikTok, yayıncının ayrı ilişki kurduğu üçüncü taraf platformlardır. Her sağlayıcı kendi koşulları ve gizlilik politikası kapsamında ayrıca veri işleyebilir.', 'Mevcut sürümde gerçek TikTok LIVE olay bağlayıcısı veya bu amaçla üçüncü taraf imza hizmeti etkin değildir.'] },
      { title: '9. Uluslararası veri aktarımı', paragraphs: ['Vercel gibi küresel altyapı sağlayıcıları, teknik erişim verilerini Türkiye dışında işleyebilir. Aktarım ülkeleri, hesap bölgesi ve uygulanabilir güvenceler ilgili sağlayıcının güncel sözleşmeleri ile KVKK’nın 9. maddesi kapsamında değerlendirilir.', 'Gerçek TikTok entegrasyonu etkinleştirilirse oluşabilecek yeni uluslararası aktarımlar ayrıca değerlendirilecek; KVKK’nın güncel 9. maddesindeki şartlar ve uygun güvenceler sağlanmadan başlatılmayacaktır.'] },
      { title: '10. Güvenlik önlemleri', bullets: ['Yerel sunucunun yalnızca 127.0.0.1 üzerinde dinlemesi ve Host/Origin kontrolleri;', 'Overlay’in salt okunur olması ve bağlantı/hesap ayrıntılarının overlay’den çıkarılması;', 'Olay kimliğiyle tekrar ayıklama, giriş doğrulama ve kayıt boyutu sınırları;', 'Kimlik bilgilerinin tarayıcıya veya overlay’e gönderilmemesi;', 'Yerel medya ve JSON dosyalarına erişimin yayıncının bilgisayar güvenliğine bağlı olması.'] },
      { title: '11. Çerezler ve yerel depolama', paragraphs: ['MK LIVE PRO’nun mevcut arayüzü reklam veya davranışsal analiz çerezi kullanmaz. Tarayıcı localStorage alanı son geçerli overlay durumunu ve arayüz tercihlerini cihazda saklamak için kullanılabilir.', 'Vercel veya tarayıcı güvenlik işlevleri zorunlu teknik veriler/çerezler kullanabilir. Analitik veya isteğe bağlı çerezler ileride eklenirse, gerekli bilgilendirme ve tercih mekanizması sağlanacaktır.'] },
      { title: '12. KVKK kapsamındaki haklar ve başvuru', paragraphs: ['6698 sayılı Kanun’un 11. maddesi kapsamında ilgili kişiler; verilerinin işlenip işlenmediğini öğrenme, bilgi talep etme, amacı ve aktarılan üçüncü kişileri öğrenme, düzeltme, şartları varsa silme/yok etme, üçüncü kişilere bildirim, münhasıran otomatik analiz sonucuna itiraz ve hukuka aykırı işleme nedeniyle zararın giderilmesini talep etme haklarına sahiptir.', 'Başvurular, konu satırında “KVKK Başvurusu” belirtilerek iletisim@mk-digitalsystems.com adresine gönderilebilir. Başvuru sahibinin kimliğini ve talebini doğrulamaya yetecek bilgiler istenebilir; gereksiz kişisel veri talep edilmez.', 'Resmî bilgi: https://www.kvkk.gov.tr/Icerik/2062/Basvuru-Hakki'] },
      { title: '13. Çocukların verileri', paragraphs: ['Hizmet çocuklara yönelik bir hesap hizmeti olarak tasarlanmamıştır. Yayıncılar, reşit olmayan katılımcılar veya izleyicilerle ilgili içeriklerde uygulanabilir yaş, veli izni ve platform kurallarını gözetmelidir.'] },
      { title: '14. Politika güncellemeleri ve yürürlük', paragraphs: ['Ürün, sağlayıcı veya hukuki gereklilikler değiştiğinde politika güncellenebilir. Gerçek TikTok bağlantısı etkinleştirilmeden önce veri akışlarını yansıtan yeni sürüm yayımlanmalıdır.', 'Yürürlük tarihi: 2 Kasım 2026.'] },
    ],
  },
  en: {
    title: 'Privacy Policy',
    eyebrow: 'MK LIVE PRO · Privacy',
    summary: 'This policy explains what the current local architecture processes, what it does not yet collect, and the rights available under Türkiye’s data-protection framework.',
    sections: [
      { title: '1. Data controller and contact', paragraphs: ['The data controller is MK Digital Systems. Its proprietor is Mustafa Öner. Address: Bolu Merkez / Bolu / Türkiye.', 'The contact channel for support, privacy, and KVKK data-subject requests is iletisim@mk-digitalsystems.com.'] },
      { title: '2. Current product data model', paragraphs: ['The current desktop/local-server version stores broadcast state and configuration mainly in JSON files on the broadcaster’s computer. Studio and overlay communicate through a local WebSocket connection.', 'The public legal pages contain no form, user registration, advertising analytics, or tracking pixel.'] },
      { title: '3. Data categories and purposes', bullets: ['Broadcaster configuration: scene titles, themes, team and quiz rules, used to create a broadcast and retain local settings.', 'Local technical data: connection status, errors, event times, and session identifiers, used for security, diagnostics, and deduplication.', 'Manual/demo data: test username, display name, comment, and gift event, used locally to test the EventBus, quiz, chat, and gift engines.', 'Broadcaster-supplied media: images, videos, and audio used in broadcast scenes.'] },
      { title: '4. TikTok account and permissions', paragraphs: ['Real TikTok LIVE comment and gift connectivity is not enabled in the current version. TikTok access tokens, account passwords, and real viewer events are not collected by that feature.', 'A broadcaster username entered in the panel is used only for local connection configuration/eligibility status while no real connection exists. Before an official or authorised integration is enabled, this policy will be updated with its permissions, legal basis, transfers, and retention.'] },
      { title: '5. Viewer comments, usernames, and gifts', paragraphs: ['No real TikTok viewer comment, username, or gift event is currently received automatically. Demo and manual events are explicitly labelled.', 'If an authorised integration is enabled later, comment text, platform user ID/username, display name, event time, gift identifier/count, and live-session information may be processed for quiz scoring, moderation, chat display, and gift/team rules. Required notice will be provided before that change.'] },
      { title: '6. Legal bases', paragraphs: ['Every processing activity must rely on a valid basis under applicable law. Current local settings are processed to establish and operate the requested service, provide requested functions, and maintain security.', 'A new activity requiring explicit consent will not begin without consent. The legal-basis matrix must be reviewed before any real TikTok integration or new data flow is enabled.'] },
      { title: '7. Storage locations and retention', paragraphs: ['Local records are stored by default in the data folder on the broadcaster’s computer; no new cloud database is used. Current technical limits are: up to 500 recent events retained for seven days, up to 500 gift records, and up to 200 chat entries. Configuration and scores may remain locally until reset/deleted or their purpose ends.', 'Retention of standard access/security logs for the Vercel-hosted public pages depends on the Vercel account and service terms. Retention and deletion information will be updated in this policy whenever data flows or provider settings change.'] },
      { title: '8. Third-party providers', paragraphs: ['Vercel hosts the public web content. TikTok LIVE Studio and TikTok are separate platforms used under the broadcaster’s own relationship with those providers, which may independently process data under their own terms and privacy policies.', 'No real TikTok LIVE event connector or third-party signing service is enabled in the current version.'] },
      { title: '9. International transfers', paragraphs: ['Global infrastructure providers such as Vercel may process technical access data outside Türkiye. Transfer countries, account regions, and applicable safeguards are assessed under the provider’s current agreements and Article 9 of the KVKK.', 'Any new transfer created by a future TikTok integration will be assessed separately and will not begin without satisfying the current requirements and safeguards under Article 9 of the KVKK.'] },
      { title: '10. Security measures', bullets: ['The local server listens only on 127.0.0.1 and applies Host/Origin checks;', 'The overlay is read-only and connection/account details are excluded from it;', 'Event-ID deduplication, input validation, and bounded logs;', 'Credentials are not sent to the browser or overlay;', 'Local media and JSON files remain dependent on the broadcaster’s device security.'] },
      { title: '11. Cookies and local storage', paragraphs: ['The current MK LIVE PRO interface uses no advertising or behavioural-analytics cookies. Browser localStorage may retain the last valid overlay state and interface preferences on the device.', 'Vercel or browser security functions may use essential technical data/cookies. If analytics or optional cookies are introduced, the required notice and choice mechanism will be added.'] },
      { title: '12. KVKK data-subject rights and requests', paragraphs: ['Under Article 11 of Law No. 6698, individuals may ask whether their data is processed, request information, learn purposes and recipients, seek correction or deletion where conditions apply, request notification to recipients, object to solely automated adverse analysis, and seek compensation for unlawful processing.', 'Requests may be sent to iletisim@mk-digitalsystems.com with “KVKK Request” in the subject line. Information sufficient to verify the requester’s identity and request may be required; unnecessary personal data will not be requested.', 'Official information: https://www.kvkk.gov.tr/Icerik/2062/Basvuru-Hakki'] },
      { title: '13. Children’s data', paragraphs: ['The service is not designed as an account service for children. Broadcasters must observe applicable age, parental-permission, and platform requirements when content involves minors.'] },
      { title: '14. Updates and effective date', paragraphs: ['This policy may be updated as the product, providers, or legal requirements change. A new version reflecting actual data flows must be published before real TikTok connectivity is enabled.', 'Effective date: 2 November 2026.'] },
    ],
  },
};

function LegalApp({ page }: { page: LegalPage }) {
  const [language, setLanguage] = useState<Language>('tr');
  const copy = page === 'terms' ? terms[language] : privacy[language];
  const otherHref = page === 'terms' ? '/privacy' : '/terms';
  const otherLabel = page === 'terms' ? (language === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy') : (language === 'tr' ? 'Kullanım Koşulları' : 'Terms of Service');

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = page === 'terms'
      ? (language === 'tr' ? 'MK LIVE PRO — Kullanım Koşulları' : 'MK LIVE PRO — Terms of Service')
      : (language === 'tr' ? 'MK LIVE PRO — Gizlilik Politikası' : 'MK LIVE PRO — Privacy Policy');
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = copy.summary;
  }, [copy.summary, language, page]);

  return <div className="legal-shell">
    <header className="legal-header">
      <a className="legal-brand" href="/" aria-label="MK LIVE PRO ana sayfa">
        <span>MK</span><div><strong>MK LIVE PRO</strong><small>MK Digital Systems</small></div>
      </a>
      <nav aria-label={language === 'tr' ? 'Yasal sayfalar' : 'Legal pages'}>
        <a href="/terms">{language === 'tr' ? 'Koşullar' : 'Terms'}</a>
        <a href="/privacy">{language === 'tr' ? 'Gizlilik' : 'Privacy'}</a>
      </nav>
      <div className="language-switch" role="group" aria-label="Language">
        <button type="button" aria-pressed={language === 'tr'} onClick={() => setLanguage('tr')}>TR</button>
        <button type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
      </div>
    </header>

    <main>
      <section className="legal-hero">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="legal-summary">{copy.summary}</p>
        <div className="draft-badge">{language === 'tr' ? 'YÜRÜRLÜK · 2 KASIM 2026 · TR / EN' : 'EFFECTIVE · 2 NOVEMBER 2026 · TR / EN'}</div>
      </section>

      <aside className="verification-notice" role="note"><strong>{language === 'tr' ? 'İşletme ve iletişim' : 'Business and contact'}</strong><p>{identityNotice[language]}</p></aside>

      <article className="legal-document">
        {copy.sections.map((section) => <section key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs?.map((paragraph) => paragraph.startsWith('http') || paragraph.startsWith('Resmî bilgi: http') || paragraph.startsWith('Official information: http')
            ? <p key={paragraph}><a href={paragraph.slice(paragraph.indexOf('http'))} target="_blank" rel="noreferrer">{paragraph}</a></p>
            : <p key={paragraph}>{paragraph}</p>)}
          {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
        </section>)}
      </article>

      <div className="legal-next"><span>{language === 'tr' ? 'İlgili diğer belge' : 'Related document'}</span><a href={otherHref}>{otherLabel} →</a></div>
    </main>

    <footer>
      <a href="/">{language === 'tr' ? 'Ana sayfa' : 'Home'}</a>
      <a href="/terms">{language === 'tr' ? 'Kullanım Koşulları' : 'Terms of Service'}</a>
      <a href="/privacy">{language === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}</a>
      <span>© 2026 MK Digital Systems</span>
    </footer>
  </div>;
}

const page = document.body.dataset.page === 'privacy' ? 'privacy' : 'terms';
createRoot(document.getElementById('root')!).render(<LegalApp page={page} />);
