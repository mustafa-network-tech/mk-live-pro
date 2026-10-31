import { STAGE_HEIGHT, STAGE_WIDTH } from '../../../packages/shared/src/index.ts';
import type { StudioState } from '../../../packages/shared/src/index.ts';
import type { PreviewUi } from './App.tsx';

/**
 * Canlı önizleme: gerçek /overlay sayfasını iframe içinde gösterir (yayında görünenle aynı kod).
 * Güvenli alan rehberleri yalnızca burada çizilir, yayına girmez.
 */
export function Preview({ s, ui, width = 300 }: { s: StudioState; ui: PreviewUi; width?: number }) {
  const height = Math.round((width * STAGE_HEIGHT) / STAGE_WIDTH);
  const pct = (px: number, total: number) => `${(px / total) * 100}%`;
  const sa = s.safeArea;
  return (
    <div className="preview-wrap">
      <div className={`preview bg-${ui.bg}`} style={{ width, height }}>
        <iframe title="Yayın önizlemesi" src="/overlay?preview=1" style={{ width, height }} />
        {ui.guides && (
          <>
            <div
              className="guide-safe"
              style={{ left: pct(sa.left, STAGE_WIDTH), right: pct(sa.right, STAGE_WIDTH), top: pct(sa.top, STAGE_HEIGHT), bottom: pct(sa.bottom, STAGE_HEIGHT) }}
            />
            <div className="guide-zone top" style={{ height: pct(sa.top, STAGE_HEIGHT) }}>
              <span>Üst arayüz boşluğu</span>
            </div>
            <div className="guide-zone bottom" style={{ height: pct(sa.bottom, STAGE_HEIGHT) }}>
              <span>Yorum / etkileşim alanı</span>
            </div>
          </>
        )}
      </div>
      <div className="preview-caption">9:16 · 1080×1920 referans</div>
    </div>
  );
}
