import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { DEFAULT_STATE, STAGE_HEIGHT, STAGE_WIDTH, sanitizeState } from '../../../packages/shared/src/index.ts';
import type { StudioState } from '../../../packages/shared/src/index.ts';
import { connectState } from '../../../packages/shared/src/client.ts';
import type { StateClient } from '../../../packages/shared/src/client.ts';
import { FONT_STACKS } from '../../../packages/themes/src/index.ts';

const CACHE_KEY = 'mk-live-pro:last-state';

/** Sunucuya ulaşılamasa bile (ör. yayın ortasında yeniden başlatma) son geçerli durum gösterilir. */
function readCache(): StudioState | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? sanitizeState(JSON.parse(raw), DEFAULT_STATE) : null;
  } catch {
    return null;
  }
}

function useStageTransform() {
  const [t, setT] = useState({ scale: 1, x: 0, y: 0 });
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth || STAGE_WIDTH;
      const h = window.innerHeight || STAGE_HEIGHT;
      const scale = Math.min(w / STAGE_WIDTH, h / STAGE_HEIGHT);
      setT({ scale, x: (w - STAGE_WIDTH * scale) / 2, y: (h - STAGE_HEIGHT * scale) / 2 });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return t;
}

/** Metni, en fazla `maxLines` satıra sığana kadar küçültür; taşma olmaz. */
function FitText({ text, className, size, maxLines, fitKey }: { text: string; className: string; size: number; maxLines: number; fitKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let s = size;
    el.style.fontSize = `${s}px`;
    for (let i = 0; i < 40 && s > 24; i++) {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) / parseFloat(getComputedStyle(el).fontSize) || 1.15;
      if (el.offsetHeight <= maxLines * s * lineHeight + 2 && el.scrollWidth <= el.clientWidth + 1) break;
      s *= 0.94;
      el.style.fontSize = `${s}px`;
    }
  }, [text, size, maxLines, fitKey]);
  return (
    <div ref={ref} className={className}>
      {text}
    </div>
  );
}

function Countdown({ endsAt, active }: { endsAt: number; active: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active || !endsAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [active, endsAt]);
  const seconds = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
  if (!active) return null;
  return <div className={`contest-timer${seconds <= 10 ? ' urgent' : ''}`}>{seconds}</div>;
}

export default function App() {
  const [state, setState] = useState<StudioState | null>(readCache);
  const [photo, setPhoto] = useState<{ id: string; url: string; mime: string } | null>(null);
  const wantedPhoto = useRef('');
  const loadedPhoto = useRef('');
  const t = useStageTransform();

  useEffect(() => {
    let client: StateClient | null = null;
    client = connectState('overlay', {
      onState: (s) => {
        setState(s);
        const id = s.poem.photoMode === 'off' ? '' : s.poem.photoId;
        const changed = id !== wantedPhoto.current;
        wantedPhoto.current = id;
        if (changed) {
          loadedPhoto.current = '';
          setPhoto(null);
        }
        if (id && loadedPhoto.current !== id) client?.requestMedia(id);
        else if (!id) setPhoto(null);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(s));
        } catch {
          /* depolama kapalı olabilir */
        }
      },
      onStatus: (connected) => {
        if (connected && wantedPhoto.current) client?.requestMedia(wantedPhoto.current);
      },
      onMedia: (media) => {
        if (media.id === wantedPhoto.current && /^(image\/(jpeg|png|webp)|video\/(mp4|webm))$/.test(media.mime)) {
          loadedPhoto.current = media.id;
          setPhoto({ id: media.id, url: `data:${media.mime};base64,${media.data}`, mime: media.mime });
        }
      },
    });
    return () => client?.close();
  }, []);

  if (!state) return null; // İlk durum gelene kadar hiçbir şey çizme (yanlış başlık yanıp sönmesin)

  const { safeArea: sa, position, font, layers, theme } = state;
  const safeW = Math.max(200, STAGE_WIDTH - sa.left - sa.right);
  const safeH = Math.max(200, STAGE_HEIGHT - sa.top - sa.bottom);
  const person = state.activeParticipant >= 0 ? state.participants[state.activeParticipant] : '';
  const isPoem = state.concept === 'siir';
  const isContest = state.concept === 'yarisma';
  const isChat = state.concept === 'sohbet';
  const isTurku = state.concept === 'turku';
  const nextPoemReader = state.poem.queue[0] ?? '';
  const contestWinner = state.contest.players.find((player) => player.id === state.contest.winnerId);
  const nextTurku = state.turku.queue[0] ?? null;
  const customColor = font.color !== '';

  const stageStyle: CSSProperties & Record<string, string | number> = {
    transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
    '--mk-size': `${font.size}px`,
    ...(customColor ? { '--mk-color': font.color } : {}),
    ...(font.family !== 'theme' ? { '--mk-font': FONT_STACKS[font.family] } : {}),
  };
  const fitKey = `${theme}|${font.family}|${safeW}`;

  return (
    <div className="stage" data-theme={theme} style={stageStyle}>
      <div className="safe" style={{ left: sa.left, top: sa.top, width: safeW, height: safeH }}>
        {isPoem && (
          <div
            key={`${state.poem.status}:${state.poem.theme}:${state.poem.photoMode}:${state.poem.photoId}:${state.poem.reader}:${nextPoemReader}`}
            className={`poem-atmosphere status-${state.poem.status}`}
            data-poem-theme={state.poem.theme}
          >
            {photo?.id === state.poem.photoId && state.poem.photoMode !== 'off' && (photo.mime.startsWith('video/') ? (
              <video
                className={`poem-photo mode-${state.poem.photoMode}`}
                src={photo.url}
                autoPlay
                muted
                loop
                playsInline
                style={{ '--poem-photo-opacity': state.poem.photoOpacity / 100 } as CSSProperties}
              />
            ) : (
              <img
                className={`poem-photo mode-${state.poem.photoMode}`}
                src={photo.url}
                alt=""
                style={{ '--poem-photo-opacity': state.poem.photoOpacity / 100 } as CSSProperties}
              />
            ))}
            <div className="poem-visual" aria-hidden="true"><i /><i /><i /><i /></div>
            {state.poem.reader && (
              <div className="poem-reader-panel">
                <div className="poem-panel-label">
                  {state.poem.status === 'live' ? 'Şimdi okuyor' : state.poem.status === 'finished' ? 'Okuma tamamlandı' : 'Hazırlanıyor'}
                </div>
                <div className="poem-reader-name">{state.poem.reader}</div>
              </div>
            )}
            {state.poem.showNext && nextPoemReader && (
              <div className="poem-next-panel"><span>Sıradaki</span><strong>{nextPoemReader}</strong></div>
            )}
          </div>
        )}
        {isContest && (
          <div key={`${state.contest.status}:${state.contest.prompt}:${state.contest.reveal}:${state.contest.winnerId}`} className={`module-scene contest-scene status-${state.contest.status}`}>
            <div className="contest-card">
              <div className="module-kicker">{state.contest.mode === 'word' ? 'Kelime tahmini' : state.contest.mode === 'poem' ? 'Şiir tamamlama' : state.contest.mode === 'folk' ? 'Türkü tahmini' : 'Soru-cevap'}</div>
              {state.contest.prompt && <FitText text={state.contest.prompt} className="module-main-text" size={70} maxLines={4} fitKey={`contest:${safeW}`} />}
              {state.contest.hint && state.contest.status === 'live' && <div className="contest-hint">İpucu: {state.contest.hint}</div>}
              {state.contest.status === 'revealed' && state.contest.reveal && <div className="contest-reveal"><span>Doğru cevap</span><strong>{state.contest.reveal}</strong></div>}
              <Countdown endsAt={state.contest.endsAt} active={state.contest.status === 'live'} />
            </div>
            {state.contest.showScores && state.contest.players.length > 0 && (
              <div className="overlay-scoreboard">
                <div className="module-kicker">Skor tablosu</div>
                {[...state.contest.players].sort((a, b) => b.score - a.score).slice(0, 8).map((player, index) => (
                  <div className="overlay-score" key={player.id}><span>{index + 1}. {player.name}</span><strong>{player.score}</strong></div>
                ))}
              </div>
            )}
            {contestWinner && <div className="winner-banner"><span>🏆 Kazanan</span><strong>{contestWinner.name}</strong></div>}
          </div>
        )}
        {isChat && (
          <div key={`${state.chat.topic}:${state.chat.question}`} className="module-scene chat-scene">
            {state.chat.showTopic && state.chat.topic && <div className="topic-card"><div className="module-kicker">Günün konusu</div><FitText text={state.chat.topic} className="module-main-text" size={66} maxLines={4} fitKey={`topic:${safeW}`} /></div>}
            {state.chat.showQuestion && state.chat.question && <div className="question-card"><div className="question-mark">?</div><FitText text={state.chat.question} className="chat-question-text" size={55} maxLines={5} fitKey={`question:${safeW}`} /></div>}
          </div>
        )}
        {isTurku && (
          <div key={`${state.turku.status}:${state.turku.current?.id ?? ''}:${nextTurku?.id ?? ''}`} className={`module-scene turku-scene status-${state.turku.status}`}>
            {state.turku.current && (
              <div className="turku-card">
                <div className="module-kicker">{state.turku.status === 'live' ? 'Şimdi çalıyor' : state.turku.status === 'finished' ? 'Eser tamamlandı' : 'Sıradaki eser'}</div>
                <FitText text={state.turku.current.title} className="module-main-text" size={70} maxLines={3} fitKey={`turku:${safeW}`} />
                {state.turku.current.artist && <div className="turku-artist">{state.turku.current.artist}</div>}
                <div className="turku-meta">{[state.turku.current.region, state.turku.current.requester && `İsteyen: ${state.turku.current.requester}`].filter(Boolean).join(' · ')}</div>
              </div>
            )}
            {state.turku.showNext && nextTurku && <div className="turku-next"><span>Sıradaki</span><strong>{nextTurku.title}</strong>{nextTurku.requester && <small>İsteyen: {nextTurku.requester}</small>}</div>}
          </div>
        )}
        {(layers.title || layers.subtitle || layers.decor) && (
          <div
            className={`block align-${position.align}`}
            style={{ top: `${position.y}%`, transform: `translateY(-${position.y}%)` }}
          >
            {layers.title && state.title && (
              <FitText key={`t:${state.title}`} text={state.title} size={font.size} maxLines={3} fitKey={fitKey} className={`title${customColor ? ' custom-color' : ''}`} />
            )}
            {layers.decor && <div key={`d:${theme}:${state.title}`} className="decor" />}
            {layers.subtitle && state.subtitle && (
              <FitText key={`s:${state.subtitle}`} text={state.subtitle} size={font.size * 0.36} maxLines={2} fitKey={fitKey} className="subtitle" />
            )}
          </div>
        )}
        {layers.participant && !isPoem && !isContest && !isChat && !isTurku && person && (
          <div key={`p:${person}`} className={`person align-${position.align}`}>
            <div className="person-card">
              <div className="person-label">Şimdi sahnede</div>
              <div className="person-name">{person}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
