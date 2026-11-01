import { useState } from 'react';
import { LIMITS } from '../../../../packages/shared/src/index.ts';
import type { TurkuRequest, TurkuState } from '../../../../packages/shared/src/index.ts';
import type { PageProps } from '../App.tsx';
import { Preview } from '../Preview.tsx';
import { SceneBackgroundPicker } from '../SceneBackgroundPicker.tsx';

const emptyRequest = (): Omit<TurkuRequest, 'id'> => ({ title: '', artist: '', region: '', requester: '' });

export function TurkuStudio({ s, update, ui }: PageProps) {
  const [draft, setDraft] = useState(emptyRequest);
  const setTurku = (patch: Partial<TurkuState>) => update({ turku: { ...s.turku, ...patch } });

  const add = () => {
    if (!draft.title.trim() || s.turku.queue.length >= LIMITS.turkuQueue) return;
    const request: TurkuRequest = { id: crypto.randomUUID(), ...draft, title: draft.title.trim() };
    setTurku({ queue: [...s.turku.queue, request] });
    setDraft(emptyRequest());
  };

  const take = (index: number) => {
    const current = s.turku.queue[index];
    if (!current) return;
    update({ concept: 'turku', turku: { ...s.turku, current, queue: s.turku.queue.filter((_, itemIndex) => itemIndex !== index), status: 'waiting' } });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= s.turku.queue.length) return;
    const queue = [...s.turku.queue];
    [queue[index], queue[target]] = [queue[target], queue[index]];
    setTurku({ queue });
  };

  const setCurrent = (patch: Partial<TurkuRequest>) => {
    if (!s.turku.current) return;
    setTurku({ current: { ...s.turku.current, ...patch } });
  };

  return (
    <div className="grid-2">
      <section className="col">
        <SceneBackgroundPicker concept="turku" s={s} update={update} />
        <div className="card">
          <div className="status-strip">
            <div><h2>Şimdi sahnede</h2><strong>{s.turku.current?.title || 'Eser seçilmedi'}</strong></div>
            <span className={`status-pill ${s.turku.status === 'live' ? 'live' : s.turku.status === 'waiting' ? 'waiting' : 'finished'}`}>{s.turku.status === 'live' ? 'Çalıyor' : s.turku.status === 'finished' ? 'Tamamlandı' : 'Hazırlık'}</span>
          </div>
          {s.turku.current ? (
            <div className="form-grid">
              <label>Eser adı<input value={s.turku.current.title} maxLength={LIMITS.turkuTitle} onChange={(event) => setCurrent({ title: event.target.value })} /></label>
              <label>Sanatçı / kaynak<input value={s.turku.current.artist} maxLength={LIMITS.turkuArtist} onChange={(event) => setCurrent({ artist: event.target.value })} /></label>
              <label>Yöre<input value={s.turku.current.region} maxLength={LIMITS.turkuRegion} onChange={(event) => setCurrent({ region: event.target.value })} /></label>
              <label>İstek sahibi<input value={s.turku.current.requester} maxLength={LIMITS.turkuRequester} onChange={(event) => setCurrent({ requester: event.target.value })} /></label>
            </div>
          ) : <p className="hint">Sıradan bir eseri sahneye alın veya aşağıdan yeni istek ekleyin.</p>}
          <div className="poem-actions">
            <button className="btn primary" disabled={!s.turku.current} onClick={() => update({ concept: 'turku', turku: { ...s.turku, status: 'live' } })}>Eseri başlat</button>
            <button className="btn danger" disabled={!s.turku.current || s.turku.status !== 'live'} onClick={() => setTurku({ status: 'finished' })}>Eseri bitir</button>
            <button className="btn" disabled={!s.turku.queue.length} onClick={() => take(0)}>Sıradakini sahneye al</button>
          </div>
        </div>

        <div className="card">
          <h2>Yeni türkü / eser isteği</h2>
          <div className="form-grid">
            <label>Eser adı *<input value={draft.title} maxLength={LIMITS.turkuTitle} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Örn. Mihriban" /></label>
            <label>Sanatçı / kaynak<input value={draft.artist} maxLength={LIMITS.turkuArtist} onChange={(event) => setDraft({ ...draft, artist: event.target.value })} placeholder="Örn. Musa Eroğlu" /></label>
            <label>Yöre<input value={draft.region} maxLength={LIMITS.turkuRegion} onChange={(event) => setDraft({ ...draft, region: event.target.value })} placeholder="Örn. İç Anadolu" /></label>
            <label>İstek sahibi<input value={draft.requester} maxLength={LIMITS.turkuRequester} onChange={(event) => setDraft({ ...draft, requester: event.target.value })} placeholder="İzleyici adı" /></label>
          </div>
          <button className="btn primary" disabled={!draft.title.trim()} onClick={add}>İstek sırasına ekle</button>
        </div>

        <div className="card">
          <div className="status-strip">
            <div><h2>İstek sırası</h2><span className="hint">{s.turku.queue.length} eser bekliyor</span></div>
            <label className="check compact"><input type="checkbox" checked={s.turku.showNext} onChange={(event) => setTurku({ showNext: event.target.checked })} />Sıradakini göster</label>
          </div>
          {s.turku.queue.length === 0 && <p className="hint">İstek sırası boş.</p>}
          <div className="request-list">
            {s.turku.queue.map((request, index) => (
              <div className="request-row" key={request.id}>
                <span className="queue-index">{index + 1}</span>
                <div className="request-info"><strong>{request.title}</strong><span>{[request.artist, request.region, request.requester && `İsteyen: ${request.requester}`].filter(Boolean).join(' · ') || 'Detay yok'}</span></div>
                <button className="btn" onClick={() => take(index)}>Sahneye al</button>
                <button className="btn ghost square" disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
                <button className="btn ghost square" disabled={index === s.turku.queue.length - 1} onClick={() => move(index, 1)}>↓</button>
                <button className="btn ghost square" onClick={() => setTurku({ queue: s.turku.queue.filter((item) => item.id !== request.id) })}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="col sticky"><div className="card center"><h2>Canlı önizleme</h2><Preview s={s} ui={ui} /></div></section>
    </div>
  );
}
