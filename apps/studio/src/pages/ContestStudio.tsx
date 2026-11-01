import { useEffect, useMemo, useState } from 'react';
import { ARENA_OPTION_KEYS, CONTEST_MODES, GUESS_PACKS, LIMITS } from '../../../../packages/shared/src/index.ts';
import type { ArenaQuestion, ArenaTestId, ContestMode, ContestState, GuessPackKind } from '../../../../packages/shared/src/index.ts';
import type { PageProps } from '../App.tsx';
import { Preview } from '../Preview.tsx';
import { SceneBackgroundPicker } from '../SceneBackgroundPicker.tsx';

const MODE_LABELS: Record<ContestMode, string> = {
  word: 'Kelime tahmini',
  folk: 'Türkü tahmini',
  quiz: 'Soru-cevap',
};

function ClassicContestStudio({ s, update, ui }: PageProps) {
  const [privateAnswer, setPrivateAnswer] = useState(() => localStorage.getItem('mk-live-pro:contest-answer') ?? '');
  const [newPlayer, setNewPlayer] = useState('');
  const [now, setNow] = useState(Date.now());
  const [packIndexes, setPackIndexes] = useState<Record<GuessPackKind, number>>({ word: 0, folk: 0 });
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
    contest: { ...s.contest, arenaActive: false, status: 'live', reveal: '', winnerId: '', endsAt: Date.now() + s.contest.duration * 1000 },
  });

  const selectPackQuestion = (kind: GuessPackKind, requestedIndex: number) => {
    const pack = GUESS_PACKS[kind];
    const index = ((requestedIndex % pack.length) + pack.length) % pack.length;
    const question = pack[index];
    setPackIndexes((current) => ({ ...current, [kind]: index }));
    setPrivateAnswer(question.answer);
    update({
      concept: 'yarisma',
      contest: { ...s.contest, arenaActive: false, mode: kind, prompt: question.prompt, hint: question.hint, reveal: '', status: 'setup', endsAt: 0, winnerId: '' },
    });
  };

  const selectMode = (mode: ContestMode) => {
    if (mode === 'word' || mode === 'folk') selectPackQuestion(mode, packIndexes[mode]);
    else setContest({ arenaActive: false, mode, prompt: '', hint: '', reveal: '', status: 'setup', endsAt: 0 });
  };

  const activePackKind: GuessPackKind | null = s.contest.mode === 'word' || s.contest.mode === 'folk' ? s.contest.mode : null;
  const activePackQuestion = activePackKind ? GUESS_PACKS[activePackKind][packIndexes[activePackKind]] : null;

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
            {CONTEST_MODES.map((mode) => <button key={mode} className={`chip${s.contest.mode === mode ? ' on' : ''}`} onClick={() => selectMode(mode)}>{MODE_LABELS[mode]}</button>)}
          </div>
        </div>

        {activePackKind && activePackQuestion && <div className="card guess-pack-card">
          <div className="status-strip">
            <div><h2>{MODE_LABELS[activePackKind]} soru paketi</h2><strong>40 sorudan {activePackQuestion.order}. soru</strong></div>
            <span className="private-pill">{activePackQuestion.category} · {activePackQuestion.difficulty}</span>
          </div>
          <select value={packIndexes[activePackKind]} onChange={(event) => selectPackQuestion(activePackKind, Number(event.target.value))}>
            {GUESS_PACKS[activePackKind].map((question, index) => <option value={index} key={question.id}>{question.order}. {question.answer} — {question.category}</option>)}
          </select>
          <p className="guess-pack-preview">{activePackQuestion.prompt}</p>
          <div className="arena-actions">
            <button className="btn primary" onClick={() => selectPackQuestion(activePackKind, packIndexes[activePackKind])}>Bu soruyu yükle</button>
            <button className="btn" onClick={() => selectPackQuestion(activePackKind, packIndexes[activePackKind] - 1)}>← Önceki</button>
            <button className="btn" onClick={() => selectPackQuestion(activePackKind, Math.floor(Math.random() * GUESS_PACKS[activePackKind].length))}>🎲 Rastgele soru</button>
            <button className="btn" onClick={() => selectPackQuestion(activePackKind, packIndexes[activePackKind] + 1)}>Sonraki →</button>
          </div>
          <p className="hint">“Bu soruyu yükle” ile soru, ipucu ve özel cevap aşağıdaki alanlara aktarılır. Gizli cevap overlay'e gönderilmez.</p>
        </div>}

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

const PHASE_LABELS = {
  idle: 'Hazır değil', hidden: 'Soru bekliyor', reading: 'Soruyu dinleyin', answering: 'Cevaplar açık', paused: 'Duraklatıldı',
  locked: 'Cevaplar kilitli', revealed: 'Doğru cevap açık', results: 'Soru sonuçları', 'stage-results': 'Aşama sonuçları', 'final-results': 'Final sonuçları',
} as const;

const TEST_LABELS: Record<ArenaTestId, string> = {
  1: 'Test 1 — Isınma Turu',
  2: 'Test 2 — Mücadele Turu',
  3: 'Test 3 — Büyük Final',
};

function ArenaStudio({ s, update, ui, arena, arenaError, sendArena }: PageProps) {
  const [questions, setQuestions] = useState<ArenaQuestion[]>([]);
  const [questionError, setQuestionError] = useState('');
  const [draft, setDraft] = useState<ArenaQuestion | null>(null);
  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [comment, setComment] = useState('');
  const [correctionReason, setCorrectionReason] = useState('Sunucu düzeltmesi');

  const loadQuestions = async () => {
    try {
      const response = await fetch('/api/arena/questions');
      if (!response.ok) throw new Error('Soru paketi okunamadı.');
      setQuestions(await response.json() as ArenaQuestion[]);
      setQuestionError('');
    } catch (error) {
      setQuestionError((error as Error).message);
    }
  };

  useEffect(() => { void loadQuestions(); }, []);

  const currentQuestion = useMemo(() => {
    if (!arena) return null;
    return questions.find((question) => question.testId === arena.selectedTestId && question.order === arena.questionNumber) ?? arena.currentQuestionPrivate;
  }, [arena, questions]);

  useEffect(() => {
    if (currentQuestion) setDraft(structuredClone(currentQuestion));
  }, [currentQuestion?.id]);

  if (!arena) return <div className="card"><p>Bilgi Arenası sunucusuna bağlanılıyor…</p></div>;

  const command = (value: Parameters<typeof sendArena>[0]) => {
    update({ concept: 'yarisma', contest: { ...s.contest, arenaActive: true } });
    sendArena(value);
  };

  const submit = (source: 'manual' | 'demo' = 'manual') => {
    const id = source === 'demo' ? `demo-${crypto.randomUUID()}` : userId.trim();
    const name = source === 'demo' ? `DEMO ${arena.answerCount + 1}` : displayName.trim();
    const answer = source === 'demo' ? ARENA_OPTION_KEYS[Math.floor(Math.random() * ARENA_OPTION_KEYS.length)] : comment.trim();
    if (!id || !name || !answer) return;
    command({ type: 'submit-comment', userId: id, displayName: name, comment: answer, source });
    if (source === 'manual') setComment('');
  };

  const saveQuestion = async () => {
    if (!draft) return;
    const safeDraft = { ...draft, acceptedAnswers: [draft.options[draft.correctOption]] };
    const next = questions.map((question) => question.id === safeDraft.id ? safeDraft : question);
    try {
      const response = await fetch('/api/arena/questions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      const body = await response.json() as ArenaQuestion[] | { error?: string };
      if (!response.ok) throw new Error('error' in body ? body.error : 'Soru paketi kaydedilemedi.');
      setQuestions(body as ArenaQuestion[]);
      setQuestionError('Soru paketi yerelde kaydedildi.');
    } catch (error) {
      setQuestionError((error as Error).message);
    }
  };

  const exportQuestions = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mk-live-pro-bilgi-arenasi-sorular.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="arena-layout">
      <section className="col">
        <div className="card arena-provider-warning">
          <strong>⚠ Gerçek TikTok yorum entegrasyonu bağlı değil</strong>
          <p>Yanıtlar yalnızca aşağıdaki manuel girişten veya açıkça işaretli DEMO düğmesinden gelir. Hız puanı, yorumun yerel sunucuya ulaştığı zamana göredir; yayın gecikmesi nedeniyle kesin adalet garantisi yoktur.</p>
        </div>

        {arenaError && <div className="banner">{arenaError}</div>}

        <div className="card">
          <div className="status-strip">
            <div><h2>Bilgi Arenası — Turnuva yönetimi</h2><strong>{TEST_LABELS[arena.selectedTestId]}</strong></div>
            <span className={`status-pill ${arena.phase === 'answering' ? 'live' : arena.phase === 'idle' ? 'waiting' : 'finished'}`}>{PHASE_LABELS[arena.phase]}</span>
          </div>
          <div className="chips arena-tests">
            {([1, 2, 3] as ArenaTestId[]).map((testId) => <button key={testId} className={`chip${arena.selectedTestId === testId ? ' on' : ''}`} onClick={() => command({ type: 'select-test', testId })}>{TEST_LABELS[testId]}</button>)}
          </div>
          <div className="arena-actions">
            <button className="btn primary" onClick={() => command({ type: 'start-tournament' })}>Turnuvayı başlat</button>
            <button className="btn" onClick={() => command({ type: 'pause-tournament' })}>Turnuvayı duraklat</button>
            <button className="btn danger" onClick={() => command({ type: 'finish-tournament' })}>Turnuvayı bitir</button>
            <button className="btn" onClick={() => command({ type: 'previous-question' })}>← Önceki soru</button>
            <button className="btn" onClick={() => command({ type: 'next-question' })}>Sonraki soru →</button>
            <button className="btn" onClick={() => command({ type: 'restart-question' })}>Soruyu yeniden başlat</button>
            <button className="btn danger" onClick={() => { if (window.confirm('Turnuva, cevaplar, puanlar ve düzeltme geçmişi tamamen sıfırlansın mı?')) command({ type: 'reset-tournament' }); }}>Turnuvayı sıfırla</button>
          </div>
        </div>

        <div className="card">
          <div className="status-strip">
            <div><h2>Soru kontrolü</h2><strong>{currentQuestion ? `${currentQuestion.order}/10 · ${currentQuestion.category}` : 'Soru bekleniyor'}</strong></div>
            <div className={`arena-countdown phase-${arena.phase}`}>{arena.remainingSeconds}</div>
          </div>
          {currentQuestion && <div className="arena-question-summary"><span>{currentQuestion.question}</span><small>Doğru: {currentQuestion.correctOption} — {currentQuestion.options[currentQuestion.correctOption]}</small></div>}
          <label className="check"><input type="checkbox" checked={arena.autoOpenAnswers} onChange={(event) => command({ type: 'set-auto-open', value: event.target.checked })} />Okuma bitince cevapları otomatik aç</label>
          <div className="arena-actions">
            <button className="btn" onClick={() => command({ type: 'show-question', value: !arena.questionVisible })}>{arena.questionVisible ? 'Soruyu gizle' : 'Soruyu göster'}</button>
            <button className="btn primary" onClick={() => command({ type: 'start-reading' })}>Okuma süresini başlat</button>
            <button className="btn" onClick={() => command({ type: 'extend-reading', seconds: 5 })}>Okumaya +5 sn</button>
            <button className="btn primary" onClick={() => command({ type: 'open-answers' })}>Cevapları aç</button>
            <button className="btn" onClick={() => command({ type: 'toggle-timer' })}>Sayacı duraklat/devam</button>
            <button className="btn" onClick={() => command({ type: 'lock-answers' })}>Cevapları kilitle</button>
            <button className="btn" onClick={() => command({ type: 'reveal-answer' })}>Doğru cevabı açıkla</button>
            <button className="btn" onClick={() => command({ type: 'show-results' })}>Sonuçları göster</button>
          </div>
        </div>

        <div className="card">
          <h2>Manuel / demo cevap girişi</h2>
          <div className="form-grid arena-answer-form">
            <label>Kararlı kullanıcı kimliği<input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="Örn. platform-user-123" /></label>
            <label>Görünen ad<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Kullanıcı adı" /></label>
          </div>
          <label>Yorum / cevap<input value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} placeholder="A, A şıkkı, Cevabım A veya cevap metni" /></label>
          <div className="arena-actions">
            <button className="btn primary" disabled={!userId.trim() || !displayName.trim() || !comment.trim()} onClick={() => submit('manual')}>Manuel cevabı gönder</button>
            <button className="btn" disabled={arena.phase !== 'answering'} onClick={() => submit('demo')}>1 DEMO cevap üret</button>
          </div>
        </div>

        <div className="card">
          <div className="status-strip"><div><h2>Katılımcılar ve cevaplar</h2><span className="hint">Her kullanıcı soru başına yalnızca bir kez sayılır.</span></div><strong>{arena.answers.length} geçerli cevap</strong></div>
          <label>Düzeltme gerekçesi<input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} maxLength={160} /></label>
          <div className="arena-table-wrap"><table className="arena-table"><thead><tr><th>Kullanıcı</th><th>Cevap</th><th>Süre</th><th>Soru puanı</th><th>Aşama</th><th>Toplam</th><th>Düzelt</th></tr></thead><tbody>
            {arena.answers.map((answer) => {
              const participant = arena.participants.find((item) => item.userId === answer.userId);
              return <tr key={answer.userId}><td>{answer.displayName}<small>{answer.source === 'demo' ? 'DEMO' : answer.userId}</small></td><td>{answer.option}</td><td>{(answer.elapsedMs / 1000).toFixed(1)} sn</td><td>{answer.points}</td><td>{participant?.stageScores[arena.selectedTestId - 1] ?? 0}</td><td>{participant?.totalScore ?? 0}</td><td><button className="btn square" onClick={() => command({ type: 'adjust-score', userId: answer.userId, delta: -1, reason: correctionReason })}>−1</button> <button className="btn square" onClick={() => command({ type: 'adjust-score', userId: answer.userId, delta: 1, reason: correctionReason })}>+1</button></td></tr>;
            })}
          </tbody></table></div>
          {arena.answers.length === 0 && <p className="hint">Bu soruda henüz geçerli cevap yok.</p>}
          <details className="arena-history"><summary>Düzeltme geçmişi ({arena.corrections.length})</summary>{arena.corrections.slice().reverse().map((item) => <div key={item.id}>{new Date(item.createdAt).toLocaleTimeString('tr-TR')} · {item.userId} · {item.appliedDelta > 0 ? '+' : ''}{item.appliedDelta} · {item.reason}</div>)}</details>
        </div>

        <div className="card">
          <h2>İstatistikler</h2>
          {arena.stats ? <div className="arena-stats">
            <span>Katılımcı<strong>{arena.stats.validParticipants}</strong></span>{ARENA_OPTION_KEYS.map((key) => <span key={key}>{key} şıkkı<strong>{arena.stats!.options[key]}</strong></span>)}
            <span>Doğru<strong>{arena.stats.correctCount}</strong></span><span>Yanlış<strong>{arena.stats.wrongCount}</strong></span><span>Doğru oranı<strong>%{arena.stats.correctPercent}</strong></span><span>Ortalama<strong>{arena.stats.averageAnswerSeconds} sn</strong></span>
          </div> : <p className="hint">İstatistikler doğru cevap açıklanınca görünür.</p>}
        </div>

        <details className="card arena-question-editor">
          <summary>Soru paketini düzenle / dışa aktar</summary>
          {draft && <div className="arena-editor-fields">
            <label>Kategori<input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label>
            <label>Soru<textarea value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} /></label>
            <div className="form-grid">{ARENA_OPTION_KEYS.map((key) => <label key={key}>{key} şıkkı<input value={draft.options[key]} onChange={(event) => setDraft({ ...draft, options: { ...draft.options, [key]: event.target.value } })} /></label>)}</div>
            <label>Doğru şık<select value={draft.correctOption} onChange={(event) => setDraft({ ...draft, correctOption: event.target.value as ArenaQuestion['correctOption'], acceptedAnswers: [draft.options[event.target.value as ArenaQuestion['correctOption']]] })}>{ARENA_OPTION_KEYS.map((key) => <option key={key}>{key}</option>)}</select></label>
            <div className="arena-actions"><button className="btn primary" onClick={() => void saveQuestion()}>Soruyu yerelde kaydet</button><button className="btn" onClick={() => void navigator.clipboard.writeText(JSON.stringify(draft, null, 2))}>Soruyu JSON kopyala</button><button className="btn" onClick={exportQuestions}>30 soruyu JSON dışa aktar</button></div>
          </div>}
          {questionError && <p className="hint">{questionError}</p>}
        </details>
      </section>
      <section className="col sticky">
        <div className="card center"><h2>Bilgi Arenası canlı önizleme</h2><Preview s={s} ui={ui} /></div>
        <div className="card"><h2>Aşama sıralaması</h2>{arena.stageRanking.slice(0, 10).map((row) => <div className="arena-ranking-row" key={row.userId}><span>{row.rank}. {row.displayName}{row.tied ? ' (eşit)' : ''}</span><strong>{row.stageScore}</strong></div>)}</div>
        <div className="card"><h2>Genel sıralama</h2>{arena.overallRanking.slice(0, 10).map((row) => <div className="arena-ranking-row" key={row.userId}><span>{row.rank}. {row.displayName}{row.tied ? ' (eşit)' : ''}</span><strong>{row.totalScore}</strong></div>)}</div>
      </section>
    </div>
  );
}

export function ContestStudio(props: PageProps) {
  const [section, setSection] = useState<'arena' | 'classic'>(() => new URLSearchParams(location.search).get('contest') === 'classic' ? 'classic' : 'arena');
  useEffect(() => {
    if (!props.loaded) return;
    props.update({ concept: 'yarisma', contest: { ...props.s.contest, arenaActive: section === 'arena' } });
  }, [section, props.loaded]);
  return <>
    <div className="contest-section-tabs">
      <button className={`chip${section === 'arena' ? ' on' : ''}`} onClick={() => setSection('arena')}>🧠 Bilgi Arenası — 3 Test</button>
      <button className={`chip${section === 'classic' ? ' on' : ''}`} onClick={() => setSection('classic')}>🎯 Diğer yarışmalar</button>
    </div>
    <div className="contest-background-control"><SceneBackgroundPicker concept="yarisma" s={props.s} update={props.update} /></div>
    {section === 'arena' ? <ArenaStudio {...props} /> : <ClassicContestStudio {...props} />}
  </>;
}
