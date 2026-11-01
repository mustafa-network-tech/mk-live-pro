export type GuessPackKind = 'word' | 'folk';
export type GuessDifficulty = 'kolay' | 'orta' | 'zor';

export interface GuessQuestion {
  id: string;
  kind: GuessPackKind;
  order: number;
  category: string;
  difficulty: GuessDifficulty;
  prompt: string;
  hint: string;
  answer: string;
}

type GuessSeed = [string, GuessDifficulty, string, string, string];

function makePack(kind: GuessPackKind, seeds: GuessSeed[]): GuessQuestion[] {
  return seeds.map(([category, difficulty, prompt, hint, answer], index) => ({
    id: `${kind}-${String(index + 1).padStart(2, '0')}`,
    kind,
    order: index + 1,
    category,
    difficulty,
    prompt,
    hint,
    answer,
  }));
}

export const WORD_GUESS_QUESTIONS = makePack('word', [
  ['Araç', 'kolay', 'Yön bulmaya yarar; kuzeyi gösteren ibresi vardır. Bu kelime nedir?', '6 harf, P ile başlar.', 'Pusula'],
  ['Günlük hayat', 'kolay', 'Işık bir cisme çarptığında arkasında oluşan karanlık şekildir. Nedir?', '5 harf, G ile başlar.', 'Gölge'],
  ['Eşya', 'kolay', 'Bir kilidi açmak için kullanılan küçük metal araçtır. Nedir?', '7 harf, A ile başlar.', 'Anahtar'],
  ['Bilim', 'kolay', 'Sıcaklığı ölçen araçtır. Bu kelime nedir?', '10 harf, T ile başlar.', 'Termometre'],
  ['Bilim', 'orta', 'Çıplak gözle görülemeyecek kadar küçük nesneleri büyüten araçtır. Nedir?', '9 harf, M ile başlar.', 'Mikroskop'],
  ['Mekân', 'kolay', 'Kitapların düzenli biçimde saklandığı ve ödünç alınabildiği yerdir. Nedir?', '10 harf, K ile başlar.', 'Kütüphane'],
  ['Doğa', 'orta', 'Yer altındaki magmanın yüzeye çıkabildiği dağ yapısıdır. Nedir?', '8 harf, Y ile başlar.', 'Yanardağ'],
  ['Hayvan', 'kolay', 'Bulunduğu ortama göre rengini değiştirmesiyle tanınan sürüngendir. Nedir?', '9 harf, B ile başlar.', 'Bukalemun'],
  ['Hayvan', 'kolay', 'Uçamayan, iyi yüzen ve çoğunlukla soğuk bölgelerle anılan kuştur. Nedir?', '7 harf, P ile başlar.', 'Penguen'],
  ['Hayvan', 'kolay', 'Sekiz kolu bulunan deniz canlısıdır. Nedir?', '7 harf, A ile başlar.', 'Ahtapot'],
  ['Hayvan', 'kolay', 'Yaşayan kara hayvanları arasında en uzun boya sahip olanıdır. Nedir?', '6 harf, Z ile başlar.', 'Zürafa'],
  ['Hayvan', 'kolay', 'Yavrusunu karnındaki kesede taşımasıyla bilinen hayvandır. Nedir?', '7 harf, K ile başlar.', 'Kanguru'],
  ['Hayvan', 'kolay', 'Bal üretir, çiçeklerden nektar toplar ve koloniler hâlinde yaşar. Nedir?', '3 harf, A ile başlar.', 'Arı'],
  ['Hayvan', 'kolay', 'Kendi ağırlığından çok daha ağır yükleri taşıyabilen çalışkan böcektir. Nedir?', '7 harf, K ile başlar.', 'Karınca'],
  ['Doğa', 'kolay', 'Yağmurdan sonra gökyüzünde renkli bir yay şeklinde görülebilir. Nedir?', '10 harf, G ile başlar.', 'Gökkuşağı'],
  ['Doğa', 'kolay', 'Bulutlar arasında veya bulutla yer arasında oluşan çok kısa süreli parlak elektrik boşalmasıdır. Nedir?', '6 harf, Ş ile başlar.', 'Şimşek'],
  ['Doğa', 'orta', 'Yer kabuğundaki ani kırılmaların oluşturduğu sarsıntıdır. Nedir?', '6 harf, D ile başlar.', 'Deprem'],
  ['Bilim', 'orta', 'Solunum için gerekli, simgesi O olan kimyasal elementtir. Nedir?', '7 harf, O ile başlar.', 'Oksijen'],
  ['Uzay', 'kolay', 'Bir yıldızın çevresinde dolanan büyük gök cismidir. Nedir?', '7 harf, G ile başlar.', 'Gezegen'],
  ['Uzay', 'orta', 'Bir gezegenin çevresinde dolanan doğal veya insan yapımı cisimdir. Nedir?', '4 harf, U ile başlar.', 'Uydu'],
  ['Teknoloji', 'kolay', 'Bilgisayara harf, sayı ve komut girmek için kullanılan tuşlu aygıttır. Nedir?', '7 harf, K ile başlar.', 'Klavye'],
  ['Teknoloji', 'kolay', 'Dünya çapındaki bilgisayar ağlarını birbirine bağlayan iletişim sistemidir. Nedir?', '8 harf, İ ile başlar.', 'İnternet'],
  ['Teknoloji', 'kolay', 'Programlanmış görevleri otomatik olarak yerine getirebilen makinedir. Nedir?', '5 harf, R ile başlar.', 'Robot'],
  ['Teknoloji', 'zor', 'Bir problemi çözmek için izlenen sonlu ve sıralı adımlar bütünüdür. Nedir?', '9 harf, A ile başlar.', 'Algoritma'],
  ['Sanat', 'kolay', 'Bir anın ışık yardımıyla görüntü olarak kaydedilmesidir. Nedir?', '8 harf, F ile başlar.', 'Fotoğraf'],
  ['Sanat', 'kolay', 'Oyuncuların bir metni sahnede canlı olarak canlandırdığı sanat dalıdır. Nedir?', '7 harf, T ile başlar.', 'Tiyatro'],
  ['Sanat', 'kolay', 'Taş, metal, ahşap veya başka malzemelerden oluşturulan üç boyutlu sanat eseridir. Nedir?', '6 harf, H ile başlar.', 'Heykel'],
  ['Meslek', 'orta', 'Geçmiş uygarlıkları kazılar ve buluntular aracılığıyla araştıran uzmandır. Kimdir?', '8 harf, A ile başlar.', 'Arkeolog'],
  ['Meslek', 'kolay', 'Uzaya gitmek ve uzay görevlerinde çalışmak üzere eğitim alan kişidir. Kimdir?', '8 harf, A ile başlar.', 'Astronot'],
  ['Meslek', 'kolay', 'Bina ve diğer yapıların tasarımını yapan uzmandır. Kimdir?', '5 harf, M ile başlar.', 'Mimar'],
  ['Meslek', 'kolay', 'İlaçların hazırlanması ve doğru kullanımı konusunda uzman sağlık çalışanıdır. Kimdir?', '6 harf, E ile başlar.', 'Eczacı'],
  ['Meslek', 'kolay', 'Kumaşı ölçüp biçerek giysi diken kişidir. Kimdir?', '5 harf, T ile başlar.', 'Terzi'],
  ['Mekân', 'kolay', 'Ekmek ve hamur işlerinin pişirildiği iş yeri veya ocaktır. Nedir?', '5 harf, F ile başlar.', 'Fırın'],
  ['Yiyecek', 'kolay', 'Akdeniz ikliminde yetişen, yağı da üretilen küçük taneli meyvedir. Nedir?', '6 harf, Z ile başlar.', 'Zeytin'],
  ['Yiyecek', 'kolay', 'Sütün mayalanmasıyla elde edilen geleneksel besindir. Nedir?', '6 harf, Y ile başlar.', 'Yoğurt'],
  ['Yiyecek', 'orta', 'Ağaç kabuğundan elde edilen, tatlılarda kullanılan hoş kokulu baharattır. Nedir?', '6 harf, T ile başlar.', 'Tarçın'],
  ['Duygu', 'orta', 'Zorluklara karşı telaş etmeden dayanabilme gücüdür. Nedir?', '5 harf, S ile başlar.', 'Sabır'],
  ['Duygu', 'kolay', 'Yeni şeyleri öğrenme ve keşfetme isteğidir. Nedir?', '5 harf, M ile başlar.', 'Merak'],
  ['Değer', 'kolay', 'İnsanlar arasında güven, sevgi ve bağlılığa dayanan yakın ilişkidir. Nedir?', '7 harf, D ile başlar.', 'Dostluk'],
  ['Değer', 'orta', 'Kişinin doğru ile yanlışı değerlendirmesine yardım eden içsel ahlak duygusudur. Nedir?', '6 harf, V ile başlar.', 'Vicdan'],
]);

export const FOLK_GUESS_QUESTIONS = makePack('folk', [
  ['Aşk', 'kolay', 'Abdurrahim Karakoç adıyla ve Musa Eroğlu yorumuyla özdeşleşen eser hangisidir?', 'Tek kelime; M ile başlar.', 'Mihriban'],
  ['Kahramanlık', 'kolay', 'Adında Çanakkale ve “içinde” kelimesi bulunan tarihî ağıt hangisidir?', 'İki kelimelik yaygın adı Ç ile başlar.', 'Çanakkale İçinde'],
  ['Kına', 'kolay', 'Başlığında art arda iki kez “yüksek” sözcüğü ve tepeler bulunan kına türküsü hangisidir?', 'Üç kelime; Y ile başlar.', 'Yüksek Yüksek Tepelere'],
  ['Yol', 'kolay', 'Kayseri ile anılan, adında bağlar bulunan türkü hangisidir?', 'İki kelime; G ile başlar.', 'Gesi Bağları'],
  ['Âşık geleneği', 'kolay', 'Âşık Veysel’in hayat yolculuğunu “uzun”, “ince” ve “yol” sözcükleriyle anlatan eseri hangisidir?', 'Beş kelime; U ile başlar.', 'Uzun İnce Bir Yoldayım'],
  ['Karadeniz', 'kolay', 'Başlığında Rize’nin Çayeli ilçesi ve “öteye” sözcüğü bulunan türkü hangisidir?', 'İki kelime; Ç ile başlar.', 'Çayelinden Öteye'],
  ['Denizci', 'kolay', 'Başlığında ateş yakmak için bir ateş isteme cümlesi bulunan Rumeli türküsü hangisidir?', 'Dört kelime; “Bir” ile başlar.', 'Bir Ataş Ver'],
  ['Gelenek', 'kolay', 'Başlığında bir renk ve evlenen kadın anlamındaki sözcük bulunan türkü hangisidir?', 'İki kelime; S ile başlar.', 'Sarı Gelin'],
  ['Ağıt', 'kolay', 'Uzak cephede yaşanan ayrılıklarla anılan, adını bir ülke bölgesinden alan türkü hangisidir?', 'İki kelime; Y ile başlar.', 'Yemen Türküsü'],
  ['Tarih', 'orta', 'Başlığında “on beşli” yaş ifadesi bulunan Tokat’la anılan türkü hangisidir?', 'İki kelime; H ile başlar.', 'Hey Onbeşli'],
  ['Rumeli', 'kolay', 'Başlığında bir Balkan şehri ve köprü bulunan türkü hangisidir?', 'İki kelime; D ile başlar.', 'Drama Köprüsü'],
  ['Zeybek', 'kolay', 'İzmir Kültür Portalı’nın zeybek türküleri arasında saydığı, başlığında İzmir ve kavaklar bulunan eser hangisidir?', 'İki kelime; İ ile başlar.', 'İzmir’in Kavakları'],
  ['Turna', 'kolay', 'Başlığında kırmızı anlamındaki “allı” sözcüğüyle bir göçmen kuş birlikte geçer. Hangi türkü?', 'İki kelime; A ile başlar.', 'Allı Turnam'],
  ['Ankara', 'kolay', 'Ankara oyun havalarıyla anılan, tek kelimelik türkü adı hangisidir?', '6 harf; M ile başlar.', 'Misket'],
  ['Ankara', 'kolay', 'Ankara ile özdeşleşen, eğlenceli oyun havasının tek kelimelik adı nedir?', '7 harf; F ile başlar.', 'Fidayda'],
  ['Zeybek', 'kolay', 'İzmir ve Aydın çevresindeki zeybek geleneğinin en tanınmış adlarından biri olan eser hangisidir?', '10 harf; H ile başlar.', 'Harmandalı'],
  ['Nehir', 'orta', 'Başlığında Fırat Nehri’nin suyunun serin aktığını anlatan türkü hangisidir?', 'Beş kelime; Ş ile başlar.', 'Şu Fırat’ın Suyu Akar Serindir'],
  ['Konak', 'orta', 'Aydın İl Kültür Müdürlüğünün türkü listesinde de geçen, başlığında “koca konak” bulunan eser hangisidir?', 'Üç kelime; E ile başlar.', 'Eklemedir Koca Konak'],
  ['Ev', 'orta', 'Başlığında evlerin önü ve boyalı bir direk bulunan türkü hangisidir?', 'Dört kelime; E ile başlar.', 'Evlerinin Önü Boyalı Direk'],
  ['Yiyecek', 'kolay', 'Başlığında siyah renkli bir meyve ve onun tanesi anlamındaki sözcük bulunan türkü hangisidir?', 'Üç kelime; K ile başlar.', 'Kara Üzüm Habbesi'],
  ['Doğa', 'kolay', 'Başlığında bahçe ve yeşil bir çınar bulunan türkü hangisidir?', 'Üç kelime; B ile başlar.', 'Bahçada Yeşil Çınar'],
  ['Şanlıurfa', 'kolay', 'Kültür Bakanlığı kaynağında Şanlıurfa örneği olarak da geçen, “ezelden” sözcüğüyle bilinen türkü hangisidir?', 'İki kelime; U ile başlar.', 'Urfalıyam Ezelden'],
  ['Kale', 'orta', 'Başlığında bir kalenin savunma duvarları anlamına gelen sözcük bulunan türkü hangisidir?', 'İki kelime; K ile başlar.', 'Kalenin Bedenleri'],
  ['Ege', 'kolay', 'Başlığında denizin üstündeki köpükleri anlatan türkü hangisidir?', 'Üç kelime; D ile başlar.', 'Deniz Üstü Köpürür'],
  ['Kuş', 'kolay', 'Başlığında altın bir kafeste bulunan ötücü kuş vardır. Hangi türkü?', 'Üç kelime; B ile başlar.', 'Bülbülüm Altın Kafeste'],
  ['Şehir', 'kolay', 'Başlığında Kütahya ve şehrin su kaynakları bulunan türkü hangisidir?', 'İki kelime; K ile başlar.', 'Kütahya’nın Pınarları'],
  ['Ağıt', 'orta', 'Başlığında gökyüzünde bulut bulunmadığını söyleyen türkü hangisidir?', 'Üç kelime; H ile başlar.', 'Havada Bulut Yok'],
  ['Dağ', 'kolay', 'Başlığında dağlarda kar olma isteği bulunan türkü hangisidir?', 'Dört kelime; Ş ile başlar.', 'Şu Dağlarda Kar Olsaydım'],
  ['Aşk', 'kolay', 'Karacaoğlan adıyla anılan, başlığında ela gözlü sevgili bulunan eser hangisidir?', 'İki kelime; E ile başlar.', 'Ela Gözlüm'],
  ['Âşık geleneği', 'kolay', 'Neşet Ertaş yorumuyla özdeşleşen, başlığında gönül ve bir yeryüzü şekli bulunan türkü hangisidir?', 'İki kelime; G ile başlar.', 'Gönül Dağı'],
  ['Aşk', 'orta', 'Âşık Arap Mustafa’nın sevdiğine seslendiği, tek kelimelik adı Z ile başlayan türkü hangisidir?', '7 harf; Z ile başlar.', 'Zahidem'],
  ['Âşık geleneği', 'orta', 'Âşık Daimi’nin adıyla anılan ve başlığında “zülfü siyahım” hitabı bulunan eser hangisidir?', 'Altı kelime; N ile başlar.', 'Ne Ağlarsın Benim Zülfü Siyahım'],
  ['Dostluk', 'kolay', 'Pir Sultan Abdal deyişi olarak bilinen, aynı sözcüğün başlıkta iki kez tekrarlandığı eser hangisidir?', 'İki kelime de aynıdır; D ile başlar.', 'Dostum Dostum'],
  ['Kış', 'orta', 'Başlığında çok hafif biçimde kar yağmasını anlatan türkü hangisidir?', 'Dört kelime; İ ile başlar.', 'İncecikten Bir Kar Yağar'],
  ['Ege', 'orta', 'Manisa Kültür Müdürlüğünün yöre türküleri arasında saydığı, başlığında renkli bir tahıl bulunan eser hangisidir?', 'İki kelime; K ile başlar.', 'Kırmızı Buğday'],
  ['Ağıt', 'orta', 'Başlığında pencereden gelen bir taş bulunan türkü hangisidir?', 'Dört kelime; P ile başlar.', 'Pencereden Bir Taş Geldi'],
  ['Kale', 'orta', 'Başlığında kalenin dibinde taş olma isteği bulunan türkü hangisidir?', 'Beş kelime; K ile başlar.', 'Kalenin Dibinde Taş Ben Olaydım'],
  ['Çiçek', 'kolay', 'Başlığında bahçelerde yetişen mor renkli bir çiçek adı bulunan türkü hangisidir?', 'Üç kelime; B ile başlar.', 'Bahçalarda Mor Meni'],
  ['Turna', 'orta', 'Başlığında Mardin’e giden turnaya seslenilir. Hangi türkü?', 'Dört kelime; T ile başlar.', 'Turnam Gidersen Mardin’e'],
  ['Şehir', 'kolay', 'Başlığında Erzurum’un çarşısı ve pazarı birlikte geçer. Hangi türkü?', 'Üç kelime; E ile başlar.', 'Erzurum Çarşı Pazar'],
]);

export const GUESS_PACKS: Record<GuessPackKind, GuessQuestion[]> = {
  word: WORD_GUESS_QUESTIONS,
  folk: FOLK_GUESS_QUESTIONS,
};
