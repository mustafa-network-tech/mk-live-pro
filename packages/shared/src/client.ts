// Tarayıcı tarafı WebSocket istemcisi (overlay ve stüdyo ortak kullanır).
// Bağlantı koparsa sessizce yeniden dener; son durum çağıran tarafta korunur.
import { DEFAULT_STATE, sanitizeState } from './state.ts';
import type { ServerMessage, StatePatch, StudioState } from './state.ts';

export interface StateClient {
  /** Yamayı gönderir; bağlı değilse false döner. */
  send(patch: StatePatch): boolean;
  /** Yerel medya dosyasını WebSocket üzerinden ister. */
  requestMedia(id: string): boolean;
  close(): void;
}

interface Handlers {
  onState(state: StudioState): void;
  onStatus(connected: boolean): void;
  onMedia?(media: { id: string; mime: string; data: string }): void;
}

const HEARTBEAT_TIMEOUT_MS = 40_000; // sunucu 15 sn'de bir 'hb' yollar

export function connectState(role: 'overlay' | 'studio', handlers: Handlers): StateClient {
  // Overlay Vercel gibi uzak bir https adresinden sunulursa yerel sunucuya (127.0.0.1) bağlanır.
  const isLocalPage = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  const port = new URLSearchParams(location.search).get('port') || '4173';
  const url = isLocalPage
    ? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?role=${role}`
    : `ws://127.0.0.1:${/^\d{2,5}$/.test(port) ? port : '4173'}/ws?role=${role}`;
  let ws: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let lastMessage = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  function detach(sock: WebSocket) {
    sock.onopen = sock.onmessage = sock.onclose = sock.onerror = null;
  }

  function scheduleRetry() {
    if (closed) return;
    clearTimeout(retryTimer);
    const delay = Math.min(5000, 500 * 2 ** Math.min(attempt, 4));
    attempt++;
    retryTimer = setTimeout(open, delay);
  }

  function dropAndRetry() {
    if (ws) {
      detach(ws);
      try {
        ws.close();
      } catch {
        /* yok say */
      }
      ws = null;
    }
    handlers.onStatus(false);
    scheduleRetry();
  }

  function open() {
    if (closed) return;
    let sock: WebSocket;
    try {
      sock = new WebSocket(url);
    } catch {
      scheduleRetry();
      return;
    }
    ws = sock;
    sock.onopen = () => {
      attempt = 0;
      lastMessage = Date.now();
      handlers.onStatus(true);
    };
    sock.onmessage = (ev) => {
      lastMessage = Date.now();
      try {
        const msg = JSON.parse(String(ev.data)) as ServerMessage;
        if (msg.type === 'state') {
          // Eski bir yerel sunucu yeni panelle aynı anda açık kalmışsa eksik alanları
          // varsayılanlarla tamamla; panel/overlay siyah ekrana düşmesin.
          const safe = sanitizeState(msg.state, DEFAULT_STATE);
          safe.rev = typeof msg.state?.rev === 'number' && Number.isFinite(msg.state.rev) ? Math.max(0, Math.trunc(msg.state.rev)) : 0;
          handlers.onState(safe);
        }
        if (msg.type === 'media') handlers.onMedia?.(msg);
      } catch {
        /* bozuk mesajı yok say */
      }
    };
    sock.onerror = () => sock.close();
    sock.onclose = () => {
      if (ws === sock) dropAndRetry();
    };
  }

  // Yarı açık (sessizce ölmüş) bağlantıları yakala.
  const watchdog = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN && Date.now() - lastMessage > HEARTBEAT_TIMEOUT_MS) dropAndRetry();
  }, 10_000);

  open();

  return {
    send(patch) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify({ type: 'patch', patch }));
      return true;
    },
    requestMedia(id) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify({ type: 'media:get', id }));
      return true;
    },
    close() {
      closed = true;
      clearTimeout(retryTimer);
      clearInterval(watchdog);
      if (ws) {
        detach(ws);
        ws.close();
      }
    },
  };
}
