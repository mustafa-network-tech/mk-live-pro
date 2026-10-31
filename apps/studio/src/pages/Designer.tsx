import { ALIGNS, FONT_IDS, LIMITS } from '../../../../packages/shared/src/index.ts';
import type { Align } from '../../../../packages/shared/src/index.ts';
import { FONT_LABELS, THEMES } from '../../../../packages/themes/src/index.ts';
import type { PageProps } from '../App.tsx';
import { Preview } from '../Preview.tsx';

const ALIGN_LABELS: Record<Align, string> = { left: 'Sol', center: 'Orta', right: 'Sağ' };
const LAYERS = [
  ['title', 'Ana başlık'],
  ['subtitle', 'Alt başlık'],
  ['participant', 'Sahnedeki katılımcı kartı'],
  ['decor', 'Tema süsü (çizgi / ışık)'],
] as const;

export function Designer({ s, update, ui }: PageProps) {
  return (
    <div className="grid-2">
      <section className="col">
        <div className="card">
          <h2>Tema</h2>
          <div className="themes">
            {THEMES.map((t) => (
              <button key={t.id} className={`theme-card${s.theme === t.id ? ' on' : ''}`} onClick={() => update({ theme: t.id })}>
                <div className="swatch">{t.swatch.map((c) => <span key={c} style={{ background: c }} />)}</div>
                <strong>{t.name}</strong>
                <small>{t.description}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Yazı</h2>
          <label>
            Yazı tipi
            <select value={s.font.family} onChange={(e) => update({ font: { ...s.font, family: e.target.value as typeof s.font.family } })}>
              {FONT_IDS.map((f) => <option key={f} value={f}>{FONT_LABELS[f]}</option>)}
            </select>
          </label>
          <label>
            Başlık boyutu <small>{s.font.size}px (uzun başlıklar otomatik küçülür)</small>
            <input type="range" min={LIMITS.fontSize[0]} max={LIMITS.fontSize[1]} value={s.font.size} onChange={(e) => update({ font: { ...s.font, size: Number(e.target.value) } })} />
          </label>
          <div className="row">
            <label className="grow">
              Başlık rengi
              <input type="color" value={s.font.color || '#ffffff'} onChange={(e) => update({ font: { ...s.font, color: e.target.value } })} />
            </label>
            <button className="btn" disabled={!s.font.color} onClick={() => update({ font: { ...s.font, color: '' } })}>
              Temanın rengine dön
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Konum</h2>
          <label>
            Dikey konum <small>{s.position.y}% (güvenli alan içinde)</small>
            <input type="range" min={0} max={100} value={s.position.y} onChange={(e) => update({ position: { ...s.position, y: Number(e.target.value) } })} />
          </label>
          <div className="chips">
            {ALIGNS.map((a) => (
              <button key={a} className={`chip${s.position.align === a ? ' on' : ''}`} onClick={() => update({ position: { ...s.position, align: a } })}>
                {ALIGN_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Katmanlar</h2>
          {LAYERS.map(([key, label]) => (
            <label className="check" key={key}>
              <input type="checkbox" checked={s.layers[key]} onChange={(e) => update({ layers: { ...s.layers, [key]: e.target.checked } })} />
              {label}
            </label>
          ))}
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
