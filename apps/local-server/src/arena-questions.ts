import type { ArenaQuestion, ArenaTestId } from '../../../packages/shared/src/index.ts';

type Seed = [string, string, string, string, string, string, string, 'A' | 'B' | 'C' | 'D'];

const TESTS: Record<ArenaTestId, { difficulty: ArenaQuestion['difficulty']; rows: Seed[] }> = {
  1: {
    difficulty: 'kolay-orta',
    rows: [
      ['Coğrafya', "Türkiye'nin yüz ölçümü bakımından en büyük ili hangisidir?", 'Sivas', 'Konya', 'Ankara', 'Erzurum', 'Konya', 'B'],
      ['Edebiyat', 'Kürk Mantolu Madonna romanının yazarı kimdir?', 'Sabahattin Ali', 'Peyami Safa', 'Orhan Kemal', 'Yaşar Kemal', 'Sabahattin Ali', 'A'],
      ['Bilim', 'Periyodik tabloda Au sembolü hangi elementi temsil eder?', 'Gümüş', 'Bakır', 'Altın', 'Alüminyum', 'Altın', 'C'],
      ['Tarih', "Türkiye Cumhuriyeti'nin ilk başbakanı kimdir?", 'Celal Bayar', 'Fevzi Çakmak', 'Fethi Okyar', 'İsmet İnönü', 'İsmet İnönü', 'D'],
      ['Coğrafya', 'Pamukkale travertenleri hangi ilimizdedir?', 'Aydın', 'Denizli', 'Muğla', 'Uşak', 'Denizli', 'B'],
      ['Sanat', 'Mona Lisa tablosunun ressamı kimdir?', 'Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Vincent van Gogh', 'Leonardo da Vinci', 'A'],
      ['Türk Kültürü', 'Karagöz ve Hacivat hangi geleneksel gösteri sanatının karakterleridir?', 'Meddah', 'Orta oyunu', 'Gölge oyunu', 'Kukla tiyatrosu', 'Gölge oyunu', 'C'],
      ['Bilim', 'İnsan vücudundaki en büyük organ hangisidir?', 'Karaciğer', 'Akciğer', 'Beyin', 'Deri', 'Deri', 'D'],
      ['Coğrafya', 'Dünyanın en büyük okyanusu hangisidir?', 'Atlas Okyanusu', 'Büyük Okyanus', 'Hint Okyanusu', 'Arktik Okyanusu', 'Büyük Okyanus', 'B'],
      ['Müzik', 'Türk halk müziğinde uzun saplı veya kısa saplı çeşitleri bulunan telli çalgı hangisidir?', 'Bağlama', 'Ney', 'Kemençe', 'Zurna', 'Bağlama', 'A'],
    ],
  },
  2: {
    difficulty: 'orta',
    rows: [
      ['Tarih', "Osmanlı Devleti'nin ilk Türkçe resmî gazetesinin adı nedir?", 'Tercüman-ı Ahval', 'Ceride-i Havadis', 'Takvim-i Vekayi', 'Tasvir-i Efkâr', 'Takvim-i Vekayi', 'C'],
      ['Edebiyat', "Divânu Lugâti't-Türk adlı eserin yazarı kimdir?", 'Yusuf Has Hacib', 'Kaşgarlı Mahmud', 'Ali Şîr Nevâî', 'Edip Ahmed Yüknekî', 'Kaşgarlı Mahmud', 'B'],
      ['Coğrafya', 'Dünyanın en derin gölü hangisidir?', 'Baykal Gölü', 'Superior Gölü', 'Van Gölü', 'Tanganika Gölü', 'Baykal Gölü', 'A'],
      ['Bilim', 'Işığın boşluktaki hızı yaklaşık kaç kilometre/saniyedir?', '30.000', '150.000', '200.000', '300.000', '300.000', 'D'],
      ['Tarih', "Osmanlı Devleti'nde Kanun-ı Esasi hangi yıl ilan edilmiştir?", '1839', '1856', '1876', '1908', '1876', 'C'],
      ['Müzik', 'Bozlak geleneği en çok hangi bölgeyle ilişkilendirilir?', 'Orta Anadolu', 'Doğu Karadeniz', 'Trakya', 'Güney Marmara', 'Orta Anadolu', 'A'],
      ['Edebiyat', 'Eylül adlı romanın yazarı kimdir?', 'Halit Ziya Uşaklıgil', 'Mehmet Rauf', 'Recaizade Mahmut Ekrem', 'Hüseyin Rahmi Gürpınar', 'Mehmet Rauf', 'B'],
      ['Bilim', 'Hangi gezegenin kendi ekseni etrafındaki dönüş süresi yaklaşık 243 Dünya günüdür?', 'Mars', 'Jüpiter', 'Merkür', 'Venüs', 'Venüs', 'D'],
      ['Coğrafya', 'Göbeklitepe arkeolojik alanı hangi ilimizdedir?', 'Mardin', 'Adıyaman', 'Şanlıurfa', 'Gaziantep', 'Şanlıurfa', 'C'],
      ['Sanat', 'Kaplumbağa Terbiyecisi tablosunun ressamı kimdir?', 'Osman Hamdi Bey', 'İbrahim Çallı', 'Şeker Ahmet Paşa', 'Bedri Rahmi Eyüboğlu', 'Osman Hamdi Bey', 'A'],
    ],
  },
  3: {
    difficulty: 'orta-zor',
    rows: [
      ['Tarih', "Anadolu Selçuklu Devleti'nin Konya'dan önceki başkenti hangisidir?", 'Sivas', 'İznik', 'Kayseri', 'Erzurum', 'İznik', 'B'],
      ['Sanat', '1934 yılında sahnelenen Özsoy operasının bestecisi kimdir?', 'Ulvi Cemal Erkin', 'Cemal Reşit Rey', 'Necil Kazım Akses', 'Ahmet Adnan Saygun', 'Ahmet Adnan Saygun', 'D'],
      ['Bilim', 'Radyoaktivite terimini bilimsel literatüre kazandıran bilim insanı kimdir?', 'Marie Curie', 'Albert Einstein', 'Isaac Newton', 'Niels Bohr', 'Marie Curie', 'A'],
      ['Edebiyat', 'Saatleri Ayarlama Enstitüsü romanının yazarı kimdir?', 'Oğuz Atay', 'Yusuf Atılgan', 'Ahmet Hamdi Tanpınar', 'Kemal Tahir', 'Ahmet Hamdi Tanpınar', 'C'],
      ['Coğrafya', "Türkiye'nin en büyük tatlı su gölü hangisidir?", 'Van Gölü', 'Beyşehir Gölü', 'Eğirdir Gölü', 'İznik Gölü', 'Beyşehir Gölü', 'B'],
      ['Tarih', "Osmanlı Devleti'nin ilk sürekli büyükelçisi Yusuf Agâh Efendi hangi şehre gönderilmiştir?", 'Paris', 'Viyana', 'Berlin', 'Londra', 'Londra', 'D'],
      ['Bilim', 'Elektrik direncinin SI birimi hangisidir?', 'Ohm', 'Volt', 'Amper', 'Watt', 'Ohm', 'A'],
      ['Türk Kültürü', "Dede Korkut Hikâyeleri'nde Bamsı Beyrek'in babasının adı nedir?", 'Kazan Bey', 'Dirse Han', 'Bay Büre Bey', 'Salur Kazan', 'Bay Büre Bey', 'C'],
      ['Coğrafya', 'Dünyanın en büyük adası hangisidir? Kıtalar hariç tutulacaktır.', 'Madagaskar', 'Grönland', 'Borneo', 'Yeni Gine', 'Grönland', 'B'],
      ['Tarih', "Türkiye Büyük Millet Meclisi'nin ilk başkanı kimdir?", 'Rauf Orbay', 'İsmet İnönü', 'Ali Fuat Cebesoy', 'Mustafa Kemal Atatürk', 'Mustafa Kemal Atatürk', 'D'],
    ],
  },
};

export const DEFAULT_ARENA_QUESTIONS: ArenaQuestion[] = Object.entries(TESTS).flatMap(([testIdRaw, test]) => {
  const testId = Number(testIdRaw) as ArenaTestId;
  return test.rows.map(([category, question, A, B, C, D, accepted, correctOption], index) => ({
    id: `arena-${testId}-${String(index + 1).padStart(2, '0')}`,
    testId,
    order: index + 1,
    category,
    difficulty: test.difficulty,
    question,
    options: { A, B, C, D },
    correctOption,
    acceptedAnswers: [accepted],
    readingSeconds: 10,
    answeringSeconds: 50,
    maximumPoints: 10,
  }));
});
