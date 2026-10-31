import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { DEFAULT_STATE, STAGE_HEIGHT, STAGE_WIDTH, sanitizeState } from '../../../packages/shared/src/index.ts';
import type { StudioState } from '../../../packages/shared/src/index.ts';
import { connectState } from '../../../packages/shared/src/client.ts';
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

export default function App() {
  const [state, setState] = useState<StudioState | null>(readCache);
  const t = useStageTransform();

  useEffect(() => {
    const client = connectState('overlay', {
      onState: (s) => {
        setState(s);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(s));
        } catch {
          /* depolama kapalı olabilir */
        }
      },
      onStatus: () => {},
    });
    return () => client.close();
  }, []);

  if (!state) return null; // İlk durum gelene kadar hiçbir şey çizme (yanlış başlık yanıp sönmesin)

  const { safeArea: sa, position, font, layers, theme } = state;
  const safeW = Math.max(200, STAGE_WIDTH - sa.left - sa.right);
  const safeH = Math.max(200, STAGE_HEIGHT - sa.top - sa.bottom);
  const person = state.activeParticipant >= 0 ? state.participants[state.activeParticipant] : '';
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
        {layers.participant && person && (
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
