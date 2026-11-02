import { useCallback, useEffect, useState } from 'react';
import type { LiveTeam } from '../../../../packages/shared/src/index.ts';
import type { PageProps } from '../App.tsx';

const STATUS_LABELS = {
  disconnected: 'Bağlı değil',
  connecting: 'Bağlanıyor',
  connected: 'Bağlı',
  reconnecting: 'Yeniden bağlanıyor',
  unsupported: 'Desteklenmiyor',
} as const;

function time(value: number) {
  return value ? new Date(value).toLocaleTimeString('tr-TR') : '—';
}

interface TikTokAuthStatus {
  configured: boolean;
  authenticated: boolean;
  sandboxOnly: true;
  redirectUri: string;
  scope: string;
  expiresAt: number;
  profile: { openId: string; displayName: string; avatarUrl: string } | null;
  error: string;
}

export function LiveConnection({ live, liveError, sendLive }: PageProps) {
  const [auth, setAuth] = useState<TikTokAuthStatus | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [liveUsername, setLiveUsername] = useState('');
  const [comment, setComment] = useState('A');
  const [giftId, setGiftId] = useState('rose');
  const [giftName, setGiftName] = useState('Gül');
  const [giftCount, setGiftCount] = useState(1);
  const [teams, setTeams] = useState<LiveTeam[]>([]);
  const teamSignature = JSON.stringify(live?.teams ?? []);
  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/tiktok/auth/status', { cache: 'no-store' });
      const next = await response.json() as TikTokAuthStatus;
      if (!response.ok) throw new Error('TikTok hesap durumu alınamadı.');
      setAuth(next);
      setAuthError(next.error || '');
    } catch (err) {
      setAuthError((err as Error).message);
    }
  }, []);
  useEffect(() => { if (live) setTeams(live.teams); }, [teamSignature]);
  useEffect(() => { if (live?.connection.accountId) setLiveUsername(live.connection.accountId); }, [live?.connection.accountId]);
  useEffect(() => {
    void refreshAuth();
    const onFocus = () => void refreshAuth();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshAuth]);

  if (!live) return <div className="card"><p>Merkezi LIVE motoruna bağlanılıyor…</p></div>;
  const connection = live.connection;
  const sourceMode = connection.mode === 'MANUAL' ? 'MANUAL' : 'DEMO';
  const connected = connection.status === 'connected';

  const updateTeam = (index: number, patch: Partial<LiveTeam>) => setTeams((current) => current.map((team, itemIndex) => itemIndex === index ? { ...team, ...patch } : team));
  const updateRule = (index: number, field: 'giftId' | 'giftName' | 'points', value: string | number) => setTeams((current) => current.map((team, itemIndex) => {
    if (itemIndex !== index) return team;
    const rule = team.giftRules[0] ?? { giftId: '', giftName: '', points: 1 };
    return { ...team, giftRules: [{ ...rule, [field]: value }] };
  }));

  const disconnectTikTok = async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await fetch('/api/tiktok/auth/disconnect', { method: 'POST' });
      const next = await response.json() as TikTokAuthStatus;
      if (!response.ok) throw new Error('TikTok bağlantısı kesilemedi.');
      setAuth(next);
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setAuthBusy(false);
    }
  };

  return <div className="live-grid">
    <section className="col">
      {liveError && <div className="banner">{liveError}</div>}
      <div className="card tiktok-auth-card">
        <div className="status-strip">
          <div><h2>TikTok hesabı</h2><strong>{auth?.authenticated ? 'Sandbox hesabı bağlı' : 'Hesap bağlı değil'}</strong></div>
          <span className="live-mode mode-live">LOGIN KIT</span>
        </div>
        {auth?.profile && <div className="tiktok-profile">
          {auth.profile.avatarUrl ? <img src={auth.profile.avatarUrl} alt="TikTok profil görseli" referrerPolicy="no-referrer" /> : <span className="tiktok-avatar">TT</span>}
          <div><strong>{auth.profile.displayName}</strong><small>İzin: {auth.scope}</small></div>
        </div>}
        <div className="live-actions">
          {!auth?.authenticated && <button className="btn primary" disabled={authBusy || auth?.configured === false} onClick={() => { window.location.href = '/api/tiktok/auth/start'; }}>TikTok ile Sandbox giriş</button>}
          {auth?.authenticated && <button className="btn ghost" disabled={authBusy} onClick={() => void disconnectTikTok()}>TikTok hesabını ayır</button>}
          <button className="btn ghost" disabled={authBusy} onClick={() => void refreshAuth()}>Durumu yenile</button>
        </div>
        {auth?.configured === false && <p className="live-error">Sandbox Client Key henüz yerel .env.local dosyasında yapılandırılmamış.</p>}
        {authError && <p className="live-error">{authError}</p>}
        <p className="hint">Login Kit yalnızca yayıncı hesabının kimliğini ve temel profil iznini doğrular. LIVE yorum, hediye, beğeni, takip veya katılım olaylarına erişim sağlamaz.</p>
        <small className="auth-uri">Callback: {auth?.redirectUri ?? 'http://127.0.0.1:4173/auth/tiktok/callback'}</small>
      </div>
      <div className="card">
        <div className="status-strip">
          <div><h2>Merkezi bağlantı</h2><strong>{STATUS_LABELS[connection.status]}</strong></div>
          <span className={`live-mode mode-${connection.mode.toLowerCase()}`}>{connection.mode}</span>
        </div>
        <label>TikTok yayıncı kullanıcı adı<input value={liveUsername} maxLength={80} onChange={(event) => setLiveUsername(event.target.value.replace(/^@/, ''))} placeholder="kullaniciadi" /></label>
        <div className="live-actions">
          <button className="btn primary" disabled={!liveUsername.trim()} onClick={() => sendLive({ type: 'try-live', accountId: liveUsername.trim() })}>Gerçek LIVE'a bağlan</button>
          <button className="btn ghost" disabled={connection.status === 'disconnected'} onClick={() => sendLive({ type: 'disconnect' })}>Bağlantıyı kes</button>
        </div>
        <p className="hint">Yalnızca TikTok tarafından yazılı olarak onaylanmış veya yetkili partner üzerinden sağlanan gerçek bağlantı etkinleştirilebilir. Gayriresmî tersine mühendislik bağlayıcısı kurulmamıştır.</p>
        <div className="metric-grid">
          <div><span>Sağlayıcı</span><strong>{connection.provider}</strong></div>
          <div><span>Oturum</span><strong>{connection.liveSessionId || '—'}</strong></div>
          <div><span>Son olay</span><strong>{time(connection.lastEventAt)}</strong></div>
          <div><span>Olay sayısı</span><strong>{connection.eventCount}</strong></div>
          <div><span>Yeniden deneme</span><strong>{connection.reconnectAttempt || '—'}</strong></div>
          <div><span>Hesap</span><strong>{connection.accountId || '—'}</strong></div>
        </div>
        <div className="metric-grid">
          <div><span>Son gerçek yorum</span><strong>{String(live.lastRealComment?.payload.comment ?? '—')}</strong></div>
          <div><span>Son gerçek hediye</span><strong>{String(live.lastRealGift?.payload.giftName ?? '—')}</strong></div>
        </div>
        {connection.errors.map((error) => <p className="live-error" key={error}>{error}</p>)}
      </div>

      <div className="card">
        <h2>Yerel test sağlayıcıları</h2>
        <div className="live-actions">
          <button className="btn" onClick={() => sendLive({ type: 'connect', mode: 'DEMO' })}>Demo bağla</button>
          <button className="btn" onClick={() => sendLive({ type: 'connect', mode: 'MANUAL' })}>Manuel bağla</button>
        </div>
        <p className="hint">Aşağıdaki olaylar yalnızca DEMO/MANUAL olarak etiketlenir ve gerçek izleyici etkinliği sayılmaz.</p>
        <label>Yorum<input value={comment} maxLength={500} onChange={(event) => setComment(event.target.value)} /></label>
        <button className="btn primary" disabled={!connected || !comment.trim()} onClick={() => sendLive({ type: 'emit-comment', sourceMode, userId: 'demo-viewer-1', username: 'demo_viewer_1', displayName: 'Demo İzleyici', comment })}>Yorumu EventBus'a gönder</button>
        <div className="live-form-row">
          <label>Hediye kimliği<input value={giftId} onChange={(event) => setGiftId(event.target.value)} /></label>
          <label>Hediye adı<input value={giftName} onChange={(event) => setGiftName(event.target.value)} /></label>
          <label>Adet<input type="number" min={1} max={100000} value={giftCount} onChange={(event) => setGiftCount(Math.max(1, Number(event.target.value) || 1))} /></label>
        </div>
        <button className="btn" disabled={!connected || !giftId.trim() || !giftName.trim()} onClick={() => sendLive({ type: 'emit-gift', sourceMode, userId: 'demo-viewer-1', username: 'demo_viewer_1', displayName: 'Demo İzleyici', giftId, giftName, count: giftCount })}>Hediyeyi EventBus'a gönder</button>
      </div>

      <div className="card">
        <h2>Takım Arenası kuralları</h2>
        <p className="hint">Hediye puanları yalnızca yayın içi yarışma puanıdır; TikTok parasal değeri değildir. Aynı hediye iki takıma kaydedilemez.</p>
        {teams.map((team, index) => <div className="team-rule" key={team.id}>
          <input className="team-color" type="color" value={team.color} onChange={(event) => updateTeam(index, { color: event.target.value })} />
          <input value={team.name} maxLength={80} onChange={(event) => updateTeam(index, { name: event.target.value })} />
          <input placeholder="Hediye kimliği" value={team.giftRules[0]?.giftId ?? ''} onChange={(event) => updateRule(index, 'giftId', event.target.value)} />
          <input placeholder="Hediye adı" value={team.giftRules[0]?.giftName ?? ''} onChange={(event) => updateRule(index, 'giftName', event.target.value)} />
          <input type="number" min={1} max={1000000} value={team.giftRules[0]?.points ?? 1} onChange={(event) => updateRule(index, 'points', Math.max(1, Number(event.target.value) || 1))} />
          <strong>{live.teamScores.find((score) => score.teamId === team.id)?.score ?? 0} puan</strong>
          <input className="team-wide" placeholder="Logo dosyası / medya kimliği" value={team.logo} onChange={(event) => updateTeam(index, { logo: event.target.value })} />
          <input className="team-wide" placeholder="Lider değişimi ses kimliği" value={team.leaderSoundId} onChange={(event) => updateTeam(index, { leaderSoundId: event.target.value })} />
        </div>)}
        <button className="btn primary" onClick={() => sendLive({ type: 'set-teams', teams })}>Takım kurallarını kaydet</button>
      </div>
    </section>

    <section className="col">
      <div className="card">
        <h2>Desteklenen olaylar</h2>
        <div className="capability-list">{connection.capabilities.map((capability) => <div key={capability.eventType}><span>{capability.eventType}</span><b className={capability.available ? 'supported' : 'unsupported'}>{capability.available ? 'Destekleniyor' : 'Desteklenmiyor'}</b><small>{capability.note}</small></div>)}</div>
      </div>
      <div className="card">
        <h2>Son olaylar</h2>
        <p><b>Son yorum:</b> {String(live.lastComment?.payload.comment ?? '—')}</p>
        <p><b>Son hediye:</b> {String(live.lastGift?.payload.giftName ?? '—')}</p>
        <div className="event-list">{[...live.recentEvents].reverse().slice(0, 20).map((event) => <div key={event.eventId}><b>{event.eventType}</b><span>{event.displayName || event.provider}</span><small>{event.sourceMode} · {time(event.timestamp)}</small></div>)}</div>
      </div>
    </section>
  </div>;
}
