import { useState } from 'react';
import { useStudio } from './useStudio.ts';
import type { Update } from './useStudio.ts';
import type { StudioState } from '../../../packages/shared/src/index.ts';
import { Dashboard } from './pages/Dashboard.tsx';
import { Designer } from './pages/Designer.tsx';
import { BroadcastSettings } from './pages/BroadcastSettings.tsx';
import { Placeholder } from './pages/Placeholder.tsx';
import { PoemStudio } from './pages/PoemStudio.tsx';
import { AudioDock } from './AudioDock.tsx';
import { ContestStudio } from './pages/ContestStudio.tsx';
import { ChatStudio } from './pages/ChatStudio.tsx';
import { TurkuStudio } from './pages/TurkuStudio.tsx';

export interface PreviewUi {
  guides: boolean;
  bg: 'checker' | 'dark' | 'light';
}
export interface PageProps {
  s: StudioState;
  update: Update;
  ui: PreviewUi;
  setUi: (ui: PreviewUi) => void;
}

const UI_KEY = 'mk-live-pro:studio-ui';
function loadUi(): PreviewUi {
  try {
    return { guides: true, bg: 'checker', ...JSON.parse(localStorage.getItem(UI_KEY) ?? '{}') };
  } catch {
    return { guides: true, bg: 'checker' };
  }
}

const MENU = [
  { id: 'dashboard', label: 'Gösterge Paneli', icon: '▦' },
  { id: 'siir', label: 'Şiir Stüdyosu', icon: '✒' },
  { id: 'yarisma', label: 'Yarışma Merkezi', icon: '🏆' },
  { id: 'sohbet', label: 'Sohbet Stüdyosu', icon: '💬' },
  { id: 'turku', label: 'Türkü Stüdyosu', icon: '🎻' },
  { id: 'designer', label: 'Sahne Tasarımcısı', icon: '🎨' },
  { id: 'media', label: 'Medya Kütüphanesi', icon: '🖼', phase: 'Sonraki faz' },
  { id: 'settings', label: 'Yayın Ayarları', icon: '⚙' },
] as const;

export default function App() {
  const { state, connected, loaded, update } = useStudio();
  const requestedPage = new URLSearchParams(location.search).get('page');
  const initialPage = MENU.some((item) => item.id === requestedPage) ? requestedPage as (typeof MENU)[number]['id'] : 'dashboard';
  const [page, setPage] = useState<(typeof MENU)[number]['id']>(initialPage);
  const [ui, setUiState] = useState<PreviewUi>(loadUi);
  const setUi = (next: PreviewUi) => {
    setUiState(next);
    try {
      localStorage.setItem(UI_KEY, JSON.stringify(next));
    } catch {
      /* yok say */
    }
  };
  const props: PageProps = { s: state, update, ui, setUi };
  const current = MENU.find((m) => m.id === page)!;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">MK</div>
          <div>
            <div className="brand-name">MK LIVE PRO</div>
            <div className="brand-sub">Sahnen hazır.</div>
          </div>
        </div>
        <nav>
          {MENU.map((m) => (
            <button
              key={m.id}
              className={`nav-item${m.id === page ? ' active' : ''}`}
              onClick={() => {
                setPage(m.id);
                if (m.id === 'siir' || m.id === 'yarisma' || m.id === 'sohbet' || m.id === 'turku') update({ concept: m.id });
              }}
            >
              <span className="nav-icon">{m.icon}</span>
              <span>{m.label}</span>
              {'phase' in m && <span className="nav-phase">{m.phase}</span>}
            </button>
          ))}
        </nav>
        <div className={`conn ${connected ? 'ok' : 'bad'}`}>
          <span className="dot" /> {connected ? 'Yayın katmanına bağlı' : 'Sunucuyla bağlantı yok'}
        </div>
      </aside>
      <main className="main">
        {!connected && (
          <div className="banner">
            {loaded ? 'Bağlantı koptu, yeniden deneniyor. Yaptığınız değişiklikler bağlantı gelince gönderilecek.' : 'Sunucuya bağlanılıyor…'}
          </div>
        )}
        <h1>{current.label}</h1>
        {page === 'dashboard' && <Dashboard {...props} />}
        {page === 'siir' && <PoemStudio {...props} />}
        {page === 'yarisma' && <ContestStudio {...props} />}
        {page === 'sohbet' && <ChatStudio {...props} />}
        {page === 'turku' && <TurkuStudio {...props} />}
        {page === 'designer' && <Designer {...props} />}
        {page === 'settings' && <BroadcastSettings {...props} />}
        {'phase' in current && <Placeholder title={current.label} phase={current.phase} />}
      </main>
      <AudioDock />
    </div>
  );
}
