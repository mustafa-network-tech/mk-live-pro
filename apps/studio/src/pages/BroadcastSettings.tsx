import { useState } from 'react';
import { LIMITS } from '../../../../packages/shared/src/index.ts';
import type { PageProps, PreviewUi } from '../App.tsx';
import { Preview } from '../Preview.tsx';

const SIDES = [
  ['top', 'Üst boşluk (TikTok üst arayüzü)'],
  ['bottom', 'Alt boşluk (yorumlar / etkileşim)'],
  ['left', 'Sol boşluk'],
  ['right', 'Sağ boşluk'],
] as const;

const BGS: [PreviewUi['bg'], string][] = [['checker', 'Dama (şeffaflık)'], ['dark', 'Koyu'], ['light', 'Açık']];

export function BroadcastSettings({ s, update, ui, setUi }: PageProps) {
  const overlayUrl = `${location.origin}/overlay`;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* pano erişimi yoksa kullanıcı adresi elle seçer */
    }
  };

  return (
    <div className="grid-2">
      <section className="col">
        <div className="card">
          <h2>TikTok LIVE Studio adresi</h2>
          <div className="row">
            <input readOnly value={overlayUrl} onFocus={(e) => e.currentTarget.select()} />
            <button className="btn" onClick={copy}>{copied ? 'Kopyalandı ✓' : 'Kopyala'}</button>
          </div>
          <ol className="steps">
            <li>TikTok LIVE Studio'da sahneye <b>Kaynak Ekle → Bağlantı</b> ile gidin.</li>
            <li>Yukarıdaki adresi yapıştırın; genişlik <b>1080</b>, yükseklik <b>1920</b> olsun.</li>
            <li>Kaynağı sahne üzerinde tam ekran 9:16 olacak şekilde yerleştirin ve kameranın <b>üstünde</b> durmasını sağlayın.</li>
          </ol>
          <p className="hint">Şeffaflık ve localhost erişimi TikTok LIVE Studio içinde sizin tarafınızdan doğrulanmalıdır; docs/TIKTOK-TEST.md dosyasındaki adımları izleyin.</p>
        </div>

        <div className="card">
          <h2>Güvenli alan boşlukları</h2>
          <p className="hint">TikTok arayüzünün kapladığı alan cihaza göre değişir; bu değerler sabit varsayılmaz. Önizlemede rehberlere bakarak ayarlayın.</p>
          {SIDES.map(([key, label]) => (
            <label key={key}>
              {label} <small>{s.safeArea[key]}px</small>
              <input type="range" min={LIMITS.safe[0]} max={LIMITS.safe[1]} step={4} value={s.safeArea[key]} onChange={(e) => update({ safeArea: { ...s.safeArea, [key]: Number(e.target.value) } })} />
            </label>
          ))}
        </div>

        <div className="card">
          <h2>Önizleme görünümü <small>(yayına yansımaz)</small></h2>
          <label className="check">
            <input type="checkbox" checked={ui.guides} onChange={(e) => setUi({ ...ui, guides: e.target.checked })} />
            Güvenli alan rehberlerini göster
          </label>
          <div className="chips">
            {BGS.map(([id, label]) => (
              <button key={id} className={`chip${ui.bg === id ? ' on' : ''}`} onClick={() => setUi({ ...ui, bg: id })}>{label}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="col sticky">
        <div className="card center">
          <h2>Canlı önizleme</h2>
          <Preview s={s} ui={ui} />
        </div>
      </section>
    </div>
  );
}
