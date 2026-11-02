import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './site.css';

type Language = 'tr' | 'en';
type Page = 'home' | 'about' | 'support';

const copy = {
  tr: {
    nav: { home: 'Ürün', about: 'Hakkımızda', support: 'Destek', terms: 'Koşullar', privacy: 'Gizlilik' },
    home: {
      eyebrow: 'DESKTOP-FIRST YAYIN YÖNETİMİ',
      title: 'Canlı yayınınızı tek merkezden yönetin.',
      intro: 'MK LIVE PRO; sahneleri, Bilgi Arenası’nı, sohbet akışını, hediye kurallarını ve takım puanlarını yerel bir masaüstü çalışma alanında birleştirir.',
      primary: 'Ürünü keşfet', secondary: 'Destek ve iletişim',
      status: 'Güncel durum', statusText: 'Masaüstü çekirdeği, demo ve manuel olaylarla çalışır. Yetkilendirilmiş gerçek TikTok LIVE veri bağlantısı henüz etkin değildir.',
      capabilitiesTitle: 'Yayın sırasında ihtiyaç duyulan parçalar, aynı akışta',
      capabilitiesIntro: 'Her modül aynı merkezi olay modelini kullanacak şekilde tasarlanır; yayıncı tek bir kontrol noktasından ilerler.',
      capabilities: [
        ['Bilgi Arenası', 'Sorular, cevap süreleri, puanlama ve liderlik akışını yayın sahnesiyle birlikte yönetir.'],
        ['Hediye ve takımlar', 'Hediye kurallarını takım puanlarına dönüştürür; tekrarları ve seri hediyeleri kontrollü işler.'],
        ['Sohbet stüdyosu', 'Seçilen mesajları yayın katmanına taşır; moderasyon ve gösterim kontrolü yayıncıda kalır.'],
        ['Sahne ve overlay', 'TikTok LIVE Studio veya uyumlu yayın yazılımında kullanılabilen tarayıcı tabanlı yayın katmanı sunar.'],
      ],
      flowTitle: 'Yerel, ölçülü ve izlenebilir mimari',
      flow: [['01', 'Studio', 'Yayıncı sahneyi ve etkileşim kurallarını yönetir.'], ['02', 'EventBus', 'Olaylar tek bir merkezi akışta normalleştirilir.'], ['03', 'Oyun motorları', 'Yarışma, hediye, takım ve sohbet kuralları uygulanır.'], ['04', 'Overlay', 'Yalnızca yayında gösterilmesi gereken sonuçlar ekrana gider.']],
      transparencyTitle: 'Entegrasyon durumu açıkça belirtilir',
      transparencyText: 'Demo ve manuel olaylar gerçek izleyici etkinliği olarak raporlanmaz. Gerçek TikTok LIVE yorum ve hediye erişimi ancak resmî veya açıkça yetkilendirilmiş bir yöntem doğrulandığında etkinleştirilecektir.',
      availabilityTitle: 'Platform yaklaşımı',
      availability: [['Desktop', 'Ana ürün', 'Yerel kontrol, düşük gecikme ve yayın yazılımlarıyla çalışma.'], ['Web', 'Resmî site', 'Ürün bilgileri, destek ve yasal belgeler.'], ['Android', 'Yol haritası', 'Henüz sunulmuyor; ileride yardımcı uzaktan kontrol deneyimi olarak değerlendiriliyor.']],
    },
    about: {
      eyebrow: 'MK DIGITAL SYSTEMS', title: 'Yayıncı odaklı, şeffaf ve yerel.',
      intro: 'MK LIVE PRO, yayıncının kontrolünü koruyan etkileşim araçları geliştirmek amacıyla MK Digital Systems tarafından yürütülen masaüstü yazılım projesidir.',
      sections: [
        ['Amacımız', 'Yarışma, sohbet, hediye ve sahne yönetimini dağınık araçlar yerine tutarlı bir yayın iş akışında birleştirmek.'],
        ['Ürün yaklaşımı', 'Yerel çalışma, açık bağlantı durumu, sınırlı veri saklama ve demo/gerçek olay ayrımı temel tasarım ilkeleridir.'],
        ['Bağımsızlık', 'MK LIVE PRO, TikTok veya ByteDance tarafından geliştirilmiş, desteklenmiş, onaylanmış ya da sponsor edilmiş değildir.'],
      ],
      factsTitle: 'Kurumsal bilgiler', facts: [['İşletme', 'MK Digital Systems'], ['İşletme sahibi', 'Mustafa Öner'], ['Merkez', 'Bolu Merkez / Bolu / Türkiye'], ['İletişim', 'iletisim@mk-digitalsystems.com']],
      roadmapTitle: 'Platform yol haritası', roadmap: [['Şimdi', 'Desktop yayın motoru ve herkese açık ürün sitesi'], ['Sonraki', 'Güvenli Web yardımcı paneli ve hesap akışları'], ['Gelecek', 'Android yardımcı kontrol uygulaması; yayımlanmadan önce ayrıca duyurulacaktır']],
    },
    support: {
      eyebrow: 'DESTEK', title: 'Doğrudan yardım ve açık ürün durumu.',
      intro: 'Kurulum, kullanım, gizlilik veya hukuk talepleri için tek iletişim kanalımızı kullanabilirsiniz.',
      contactTitle: 'İletişim', contactText: 'Tüm destek, hukuk ve KVKK başvuruları için:',
      startTitle: 'Başlangıç akışı', steps: [['1', 'Yerel sunucuyu başlatın', 'MK LIVE PRO masaüstü çalışma alanını kendi bilgisayarınızda çalıştırın.'], ['2', 'Studio’yu açın', 'Sahne, yarışma, sohbet ve takım kurallarını kontrol panelinden hazırlayın.'], ['3', 'Overlay’i ekleyin', 'Yerel overlay adresini yayın yazılımınıza tarayıcı kaynağı olarak ekleyin.']],
      faqTitle: 'Sık sorulanlar', faq: [
        ['Gerçek TikTok yorumları şu anda bağlanıyor mu?', 'Hayır. Yetkilendirilmiş gerçek TikTok LIVE yorum ve hediye bağlantısı henüz etkin değildir.'],
        ['Demo olayları gerçek izleyici verisi midir?', 'Hayır. Demo ve manuel olaylar ayrı kaynak olarak etiketlenir ve gerçek etkinlik olarak raporlanmaz.'],
        ['Veriler nerede tutulur?', 'Mevcut masaüstü sürümündeki yapılandırma ve yayın kayıtları esas olarak yayıncının kendi bilgisayarında tutulur.'],
        ['Android uygulaması var mı?', 'Hayır. Android yardımcı uygulaması yalnızca gelecek yol haritasındadır.'],
      ],
    },
    footer: 'MK LIVE PRO, MK Digital Systems tarafından geliştirilmektedir.',
  },
  en: {
    nav: { home: 'Product', about: 'About', support: 'Support', terms: 'Terms', privacy: 'Privacy' },
    home: {
      eyebrow: 'DESKTOP-FIRST BROADCAST MANAGEMENT',
      title: 'Run your live show from one control point.',
      intro: 'MK LIVE PRO brings scenes, Knowledge Arena, chat, gift rules, and team scoring into one local desktop workspace.',
      primary: 'Explore the product', secondary: 'Support and contact',
      status: 'Current status', statusText: 'The desktop core works with demo and manual events. Authorised real TikTok LIVE data connectivity is not yet enabled.',
      capabilitiesTitle: 'The essential show controls, working in one flow',
      capabilitiesIntro: 'Each module is designed around the same central event model, giving broadcasters one consistent control point.',
      capabilities: [
        ['Knowledge Arena', 'Runs questions, answer timing, scoring, and leader changes alongside the broadcast scene.'],
        ['Gifts and teams', 'Maps gift rules to team points while controlling duplicates and cumulative gift series.'],
        ['Chat studio', 'Moves selected messages to the broadcast layer while moderation remains under broadcaster control.'],
        ['Scenes and overlay', 'Provides a browser-based broadcast layer for TikTok LIVE Studio or compatible production software.'],
      ],
      flowTitle: 'Local, bounded, and observable by design',
      flow: [['01', 'Studio', 'The broadcaster controls scenes and interaction rules.'], ['02', 'EventBus', 'Events are normalised through one central stream.'], ['03', 'Engines', 'Quiz, gift, team, and chat rules are applied.'], ['04', 'Overlay', 'Only broadcast-safe output reaches the screen.']],
      transparencyTitle: 'Integration status is stated plainly',
      transparencyText: 'Demo and manual events are not reported as real viewer activity. Real TikTok LIVE comments and gifts will be enabled only after an official or explicitly authorised method is confirmed.',
      availabilityTitle: 'Platform approach',
      availability: [['Desktop', 'Core product', 'Local control, low latency, and production-software compatibility.'], ['Web', 'Official site', 'Product information, support, and legal documents.'], ['Android', 'Roadmap', 'Not currently offered; considered as a future companion remote.']],
    },
    about: {
      eyebrow: 'MK DIGITAL SYSTEMS', title: 'Broadcaster-first, transparent, and local.',
      intro: 'MK LIVE PRO is a desktop software project developed by MK Digital Systems to create interaction tools that keep broadcasters in control.',
      sections: [
        ['Our purpose', 'Unify quiz, chat, gift, and scene management in a consistent broadcast workflow instead of fragmented tools.'],
        ['Product approach', 'Local operation, visible connection state, bounded storage, and clear separation of demo and real events are core principles.'],
        ['Independence', 'MK LIVE PRO is not developed, supported, endorsed, or sponsored by TikTok or ByteDance.'],
      ],
      factsTitle: 'Business information', facts: [['Business', 'MK Digital Systems'], ['Proprietor', 'Mustafa Öner'], ['Location', 'Bolu Merkez / Bolu / Türkiye'], ['Contact', 'iletisim@mk-digitalsystems.com']],
      roadmapTitle: 'Platform roadmap', roadmap: [['Now', 'Desktop broadcast engine and public product website'], ['Next', 'Secure Web companion panel and account flows'], ['Future', 'Android companion controller; it will be announced separately before release']],
    },
    support: {
      eyebrow: 'SUPPORT', title: 'Direct help and a clear product status.',
      intro: 'Use our single contact channel for setup, product, privacy, or legal questions.',
      contactTitle: 'Contact', contactText: 'For support, legal notices, and KVKK requests:',
      startTitle: 'Getting started', steps: [['1', 'Start the local server', 'Run the MK LIVE PRO desktop workspace on your own computer.'], ['2', 'Open Studio', 'Prepare scenes, quizzes, chat, and team rules in the control panel.'], ['3', 'Add the overlay', 'Add the local overlay URL to your production software as a browser source.']],
      faqTitle: 'Frequently asked questions', faq: [
        ['Are real TikTok comments connected today?', 'No. Authorised real TikTok LIVE comment and gift connectivity is not yet enabled.'],
        ['Are demo events real viewer data?', 'No. Demo and manual events are labelled separately and never reported as real activity.'],
        ['Where is data stored?', 'Configuration and broadcast records in the current desktop version are stored mainly on the broadcaster’s own computer.'],
        ['Is there an Android app?', 'No. An Android companion is only part of the future roadmap.'],
      ],
    },
    footer: 'MK LIVE PRO is developed by MK Digital Systems.',
  },
} as const;

function Header({ language, setLanguage }: { language: Language; setLanguage: (value: Language) => void }) {
  const nav = copy[language].nav;
  return <header className="site-header">
    <a className="brand" href="/"><span>MK</span><div><strong>MK LIVE PRO</strong><small>MK Digital Systems</small></div></a>
    <nav aria-label={language === 'tr' ? 'Ana menü' : 'Main navigation'}>
      <a href="/">{nav.home}</a><a href="/about">{nav.about}</a><a href="/support">{nav.support}</a><a href="/terms">{nav.terms}</a><a href="/privacy">{nav.privacy}</a>
    </nav>
    <div className="language"><button aria-pressed={language === 'tr'} onClick={() => setLanguage('tr')}>TR</button><button aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button></div>
  </header>;
}

function Home({ language }: { language: Language }) {
  const c = copy[language].home;
  return <>
    <section className="hero section"><div className="hero-copy"><p className="eyebrow">{c.eyebrow}</p><h1>{c.title}</h1><p className="lead">{c.intro}</p><div className="actions"><a className="button primary" href="#capabilities">{c.primary}</a><a className="button" href="/support">{c.secondary}</a></div></div>
      <div className="product-window" aria-label={language === 'tr' ? 'Ürün akışı gösterimi' : 'Product flow illustration'}><div className="window-top"><i></i><i></i><i></i><span>LIVE CONTROL / DEMO</span></div><div className="window-body"><aside><b>SAHNELER</b><span className="active">Bilgi Arenası</span><span>Sohbet</span><span>Takımlar</span></aside><div className="event-panel"><div className="metric"><small>EVENTBUS</small><strong>Tek merkez</strong></div><div className="event"><i className="gold"></i><span><b>COMMENT_RECEIVED</b><small>Demo · B cevabı</small></span><time>şimdi</time></div><div className="event"><i></i><span><b>GIFT_RECEIVED</b><small>Manuel · Gül × 2</small></span><time>+1s</time></div><div className="event"><i className="pink"></i><span><b>LEADER_CHANGED</b><small>Takım puanı güncellendi</small></span><time>+1s</time></div></div></div></div>
    </section>
    <section className="status-strip"><strong>{c.status}</strong><p>{c.statusText}</p></section>
    <section className="section" id="capabilities"><p className="eyebrow">MK LIVE PRO</p><h2>{c.capabilitiesTitle}</h2><p className="section-intro">{c.capabilitiesIntro}</p><div className="card-grid">{c.capabilities.map(([title, text], index) => <article className="feature" key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="section flow-section"><div><p className="eyebrow">WORKFLOW</p><h2>{c.flowTitle}</h2></div><div className="flow">{c.flow.map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="section transparency"><div><p className="eyebrow">TRANSPARENCY</p><h2>{c.transparencyTitle}</h2></div><p>{c.transparencyText}</p></section>
    <section className="section"><p className="eyebrow">PLATFORMS</p><h2>{c.availabilityTitle}</h2><div className="platform-grid">{c.availability.map(([name, state, text]) => <article key={name}><div><h3>{name}</h3><span>{state}</span></div><p>{text}</p></article>)}</div></section>
  </>;
}

function About({ language }: { language: Language }) {
  const c = copy[language].about;
  return <><section className="page-hero section"><p className="eyebrow">{c.eyebrow}</p><h1>{c.title}</h1><p className="lead">{c.intro}</p></section><section className="section card-grid">{c.sections.map(([title, text]) => <article className="feature" key={title}><h2>{title}</h2><p>{text}</p></article>)}</section><section className="section split"><div><p className="eyebrow">IDENTITY</p><h2>{c.factsTitle}</h2></div><dl>{c.facts.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value.includes('@') ? <a href={`mailto:${value}`}>{value}</a> : value}</dd></div>)}</dl></section><section className="section"><p className="eyebrow">ROADMAP</p><h2>{c.roadmapTitle}</h2><div className="roadmap">{c.roadmap.map(([when, title]) => <article key={when}><span>{when}</span><p>{title}</p></article>)}</div></section></>;
}

function Support({ language }: { language: Language }) {
  const c = copy[language].support;
  return <><section className="page-hero section"><p className="eyebrow">{c.eyebrow}</p><h1>{c.title}</h1><p className="lead">{c.intro}</p></section><section className="section contact-card"><div><p className="eyebrow">EMAIL</p><h2>{c.contactTitle}</h2><p>{c.contactText}</p></div><a href="mailto:iletisim@mk-digitalsystems.com">iletisim@mk-digitalsystems.com</a></section><section className="section"><p className="eyebrow">SETUP</p><h2>{c.startTitle}</h2><div className="steps">{c.steps.map(([number, title, text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section><section className="section"><p className="eyebrow">FAQ</p><h2>{c.faqTitle}</h2><div className="faq">{c.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section></>;
}

function App() {
  const page = (document.body.dataset.page ?? 'home') as Page;
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('mk-language') === 'en' || (!localStorage.getItem('mk-language') && !navigator.language.toLowerCase().startsWith('tr')) ? 'en' : 'tr');
  useEffect(() => { document.documentElement.lang = language; localStorage.setItem('mk-language', language); }, [language]);
  const nav = copy[language].nav;
  return <div className="site-shell"><Header language={language} setLanguage={setLanguage} /><main>{page === 'about' ? <About language={language} /> : page === 'support' ? <Support language={language} /> : <Home language={language} />}</main><footer><div><strong>MK LIVE PRO</strong><p>{copy[language].footer}</p></div><nav><a href="/about">{nav.about}</a><a href="/support">{nav.support}</a><a href="/terms">{nav.terms}</a><a href="/privacy">{nav.privacy}</a></nav><span>© 2026 MK Digital Systems</span></footer></div>;
}

createRoot(document.getElementById('root')!).render(<App />);
