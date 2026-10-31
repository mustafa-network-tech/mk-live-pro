import { useEffect, useState } from 'react';
import { CONTEST_MODES, LIMITS } from '../../../../packages/shared/src/index.ts';
import type { ContestMode, ContestState } from '../../../../packages/shared/src/index.ts';
import type { PageProps } from '../App.tsx';
import { Preview } from '../Preview.tsx';

const MODE_LABELS: Record<ContestMode, string> = {
  word: 'Kelime tahmini',
  poem: 'Şiir tamamlama',
  folk: 'Türkü tahmini',
  quiz: 'Soru-cevap',
};

export function ContestStudio({ s, update, ui }: PageProps) {
  const [privateAnswer, setPrivateAnswer] = useState(() => localStorage.getItem('mk-live-pro:contest-answer') ?? '');
  const [newPlayer, setNewPlayer] = useState('');
  const [now, setNow] = useState(Date.now());
  const setContest = (patch: Partial<ContestState>) => update({ contest: { ...s.contest, ...patch } });

  useEffect(() => {
    localStorage.setItem('mk-live-pro:contest-answer', privateAnswer);
  }, [privateAnswer]);

  useEffect(() => {
    if (s.contest.status !== 'live' || !s.contest.endsAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [s.contest.status, s.contest.endsAt]);

  const seconds = s.contest.endsAt ? Math.max(0, Math.ceil((s.contest.endsAt - now) / 1000)) : s.contest.duration;

  const addPlayer = () => {
    const name = newPlayer.trim();
    if (!name || s.contest.players.length >= LIMITS.contestPlayers) return;
    setContest({ players: [...s.contest.players, { id: crypto.randomUUID(), name, score: 0 }] });
    setNewPlayer('');
  };

  const score = (id: string, amount: number) => setContest({
    players: s.contest.players.map((player) => player.id === id ? { ...player, score: Math.min(9999, Math.max(-999, player.score + amount)) } : player),
  });

  const start = () => update({
    concept: 'yarisma',
    contest: { ...s.contest, status: 'live', reveal: '', winnerId: '', endsAt: Date.now() + s.contest.duration * 1000 },
  });

  return (
    <div className="grid-2">
      <section className="col">
        <div className="card">
          <div className="status-strip">
            <div><h2>Yarışma kontrolü</h2><strong>{MODE_LABELS[s.contest.mode]}</strong></div>
            <span className={`status-pill ${s.contest.status === 'live' ? 'live' : s.contest.status === 'setup' ? 'waiting' : 'finished'}`}>
              {s.contest.status === 'live' ? `${seconds} sn` : s.contest.status === 'revealed' ? 'Cevap açık' : s.contest.status === 'finished' ? 'Tamamlandı' : 'Hazırlık'}
            </span>
          </div>
          <div className="chips">
            {CONTEST_MODES.map((mode) => <button key={mode} className={`chip${s.contest.mode === mode ? ' on' : ''}`} onClick={() => setContest({ mode })}>{MODE_LABELS[mode]}</button>)}
          </div>
        </div>

        <div className="card">
          <h2>Soru ve cevap</h2>
          <label>Soru / görev <small>{s.contest.prompt.length}/{LIMITS.contestPrompt}</small><textarea value={s.contest.prompt} maxLength={LIMITS.contestPrompt} onChange={(event) => setContest({ prompt: event.target.value })} placeholder="Yarışmacılara gösterilecek soru…" /></label>
          <label>İpucu <small>{s.contest.hint.length}/{LIMITS.contestHint}</small><input value={s.contest.hint} maxLength={LIMITS.contestHint} onChange={(event) => setContest({ hint: event.target.value })} placeholder="İsteğe bağlı ipucu" /></label>
          <label className="private-answer">Gizli cevap <small>Overlay'e gönderilmez</small><input value={privateAnswer} maxLength={LIMITS.contestReveal} onChange={(event) => setPrivateAnswer(event.target.value)} placeholder="Yalnızca siz görürsünüz" /></label>
          <label>Süre <small>{s.contest.duration} saniye</small><input type="range" min={LIMITS.contestDuration[0]} max={LIMITS.contestDuration[1]} step={5} value={s.contest.duration} onChange={(event) => setContest({ duration: Number(event.target.value) })} /></label>
          <div className="poem-actions">
            <button className="btn primary" disabled={!s.contest.prompt.trim()} onClick={start}>Yarışmayı başlat</button>
            <button className="btn" disabled={!privateAnswer.trim()} onClick={() => setContest({ reveal: privateAnswer, status: 'revealed', endsAt: 0 })}>Cevabı göster</button>
            <button className="btn danger" onClick={() => setContest({ status: 'finished', endsAt: 0 })}>Bitir</button>
            <button className="btn" onClick={() => setContest({ status: 'setup', reveal: '', winnerId: '', endsAt: 0 })}>Sıfırla</button>
          </div>
        </div>

        <div className="card">
          <div className="status-strip">
            <div><h2>Yarışmacılar ve puanlar</h2><span className="hint">Puanlar yalnızca elle değiştirilir.</span></div>
            <label className="check compact"><input type="checkbox" checked={s.contest.showScores} onChange={(event) => setContest({ showScores: event.target.checked })} />Skoru göster</label>
          </div>
          <div className="row queue-add">
            <input value={newPlayer} maxLength={LIMITS.participantName} onChange={(event) => setNewPlayer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addPlayer(); }} placeholder="Yarışmacı adı" />
            <button className="btn" disabled={!newPlayer.trim()} onClick={addPlayer}>Yarışmacı ekle</button>
          </div>
          <div className="score-list">
            {s.contest.players.map((player) => (
              <div className={`score-row${s.contest.winnerId === player.id ? ' winner' : ''}`} key={player.id}>
                <input value={player.name} maxLength={LIMITS.participantName} onChange={(event) => setContest({ players: s.contest.players.map((item) => item.id === player.id ? { ...item, name: event.target.value } : item) })} />
                <strong>{player.score}</strong>
                <button className="btn square" onClick={() => score(player.id, -1)}>−1</button>
                <button className="btn square" onClick={() => score(player.id, 1)}>+1</button>
                <button className="btn" onClick={() => score(player.id, 5)}>+5</button>
                <button className="btn primary" onClick={() => update({ concept: 'yarisma', contest: { ...s.contest, winnerId: player.id, status: 'finished', endsAt: 0 } })}>Kazanan</button>
                <button className="btn ghost square" onClick={() => setContest({ players: s.contest.players.filter((item) => item.id !== player.id), winnerId: s.contest.winnerId === player.id ? '' : s.contest.winnerId })}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="col sticky"><div className="card center"><h2>Canlı önizleme</h2><Preview s={s} ui={ui} /></div></section>
    </div>
  );
}
