import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_STATE } from '../../../packages/shared/src/index.ts';
import type { StatePatch, StudioState } from '../../../packages/shared/src/index.ts';
import type { ArenaCommand, ArenaStudioState } from '../../../packages/shared/src/index.ts';
import { connectState } from '../../../packages/shared/src/client.ts';
import type { StateClient } from '../../../packages/shared/src/client.ts';

const FLUSH_MS = 120; // yazarken her tuşta değil, kısa aralıklarla gönder
const LOCAL_WINS_MS = 600; // düzenleme sırasında sunucu yankısı alanı ezmesin

/**
 * Not: iç içe nesneler (font, position, layers, safeArea) her zaman bütün olarak gönderilir,
 * bu yüzden üst düzey birleştirme yeterlidir.
 */
export type Update = (patch: Partial<Omit<StudioState, 'rev'>>) => void;

export function useStudio() {
  const [state, setState] = useState<StudioState>(DEFAULT_STATE);
  const [connected, setConnected] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [arena, setArena] = useState<ArenaStudioState | null>(null);
  const [arenaError, setArenaError] = useState('');
  const clientRef = useRef<StateClient | null>(null);
  const previousArena = useRef<ArenaStudioState | null>(null);
  const outbox = useRef<StatePatch>({});
  const lastEdit = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(() => {
    timer.current = undefined;
    if (Object.keys(outbox.current).length === 0) return;
    if (clientRef.current?.send(outbox.current)) outbox.current = {};
    // Gönderilemediyse outbox'ta kalır; bağlantı gelince tekrar denenir.
  }, []);

  useEffect(() => {
    const client = connectState('studio', {
      onState: (s) => {
        setLoaded(true);
        const editing = Object.keys(outbox.current).length > 0 || Date.now() - lastEdit.current < LOCAL_WINS_MS;
        if (!editing) setState(s);
      },
      onStatus: (ok) => {
        setConnected(ok);
        if (ok) setTimeout(flush, 0);
      },
      onArenaStudio: (next) => {
        const previous = previousArena.current;
        if (previous) {
          let event = '';
          if (previous.tournamentStatus === 'idle' && next.tournamentStatus === 'running') event = 'start';
          else if (previous.currentQuestionPrivate?.id !== next.currentQuestionPrivate?.id || (previous.phase !== 'reading' && next.phase === 'reading')) event = 'question';
          else if (previous.phase === 'answering' && previous.remainingSeconds > 10 && next.remainingSeconds <= 10) event = 'last10';
          else if (previous.phase === 'answering' && next.phase === 'locked') event = 'timeout';
          else if (previous.phase !== 'revealed' && next.phase === 'revealed') event = 'reveal';
          else if (previous.phase !== 'stage-results' && next.phase === 'stage-results') event = 'stage';
          else if (previous.phase !== 'final-results' && next.phase === 'final-results') event = 'champion';
          if (event) window.dispatchEvent(new CustomEvent('mk-live-pro:arena-event', { detail: event }));
        }
        previousArena.current = next;
        setArena(next);
        setArenaError('');
      },
      onArenaError: setArenaError,
    });
    clientRef.current = client;
    return () => {
      clearTimeout(timer.current);
      client.close();
    };
  }, [flush]);

  const update = useCallback<Update>(
    (patch) => {
      lastEdit.current = Date.now();
      setState((prev) => ({ ...prev, ...patch }));
      outbox.current = { ...outbox.current, ...patch };
      timer.current ??= setTimeout(flush, FLUSH_MS);
    },
    [flush],
  );

  const sendArena = useCallback((command: ArenaCommand) => {
    setArenaError('');
    if (!clientRef.current?.sendArena(command)) setArenaError('Bilgi Arenası komutu gönderilemedi; sunucu bağlantısını kontrol edin.');
  }, []);

  return { state, connected, loaded, update, arena, arenaError, sendArena };
}
