import { CONCEPTS, LIMITS } from '../../../../packages/shared/src/index.ts';
import type { PageProps } from '../App.tsx';
import { Preview } from '../Preview.tsx';
import { CONCEPT_LABELS, THEMES } from '../../../../packages/themes/src/index.ts';

export function Dashboard({ s, update, ui }: PageProps) {
  const setParticipant = (i: number, name: string) => update({ participants: s.participants.map((p, k) => (k === i ? name : p)) });
  const remove = (i: number) =>
    update({
      participants: s.participants.filter((_, k) => k !== i),
      activeParticipant: s.activeParticipant === i ? -1 : s.activeParticipant > i ? s.activeParticipant - 1 : s.activeParticipant,
    });

  return (
    <div className="grid-2">
      <section className="col">
        <div className="card">
          <h2>Yayın konsepti</h2>
          <div className="chips">
            {CONCEPTS.map((c) => (
              <button
                key={c}
                className={`chip${s.concept === c ? ' on' : ''}`}
                onClick={() => update({ concept: c, theme: THEMES.find((t) => t.bestFor.includes(c))?.id ?? s.theme })}
              >
                {CONCEPT_LABELS[c]}
              </button>
            ))}
          </div>
          <p className="hint">Konsept seçimi uygun temayı da önerir; başlığınıza dokunmaz. Temayı Sahne Tasarımcısı'ndan değiştirebilirsiniz.</p>
        </div>

        <div className="card">
          <h2>Başlık</h2>
          <label>
            Ana başlık <small>{s.title.length}/{LIMITS.title}</small>
            <input value={s.title} maxLength={LIMITS.title} onChange={(e) => update({ title: e.target.value })} placeholder="Örn. Türkü Gecesi" />
          </label>
          <label>
            Alt başlık <small>{s.subtitle.length}/{LIMITS.subtitle}</small>
            <input value={s.subtitle} maxLength={LIMITS.subtitle} onChange={(e) => update({ subtitle: e.target.value })} placeholder="Örn. Hoş geldiniz" />
          </label>
        </div>

        <div className="card">
          <h2>Katılımcılar</h2>
          {s.participants.length === 0 && <p className="hint">Henüz katılımcı yok.</p>}
          {s.participants.map((p, i) => (
            <div className={`row${s.activeParticipant === i ? ' active' : ''}`} key={i}>
              <input value={p} maxLength={LIMITS.participantName} onChange={(e) => setParticipant(i, e.target.value)} placeholder={`Katılımcı ${i + 1}`} />
              <button className="btn" onClick={() => update({ activeParticipant: s.activeParticipant === i ? -1 : i })}>
                {s.activeParticipant === i ? 'Sahneden al' : 'Sahneye al'}
              </button>
              <button className="btn ghost" title="Sil" onClick={() => remove(i)}>✕</button>
            </div>
          ))}
          <div className="actions">
            <button className="btn" disabled={s.participants.length >= LIMITS.participants} onClick={() => update({ participants: [...s.participants, ''] })}>
              + Katılımcı ekle
            </button>
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
