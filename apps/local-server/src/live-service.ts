import fs from 'node:fs';
import path from 'node:path';
import type {
  ArenaCommandResult,
  ArenaCommentEvent,
  GiftPayload,
  LiveCapability,
  LiveCommand,
  LiveCommandResult,
  LiveEvent,
  LiveSourceMode,
  LiveStudioState,
  LiveTeam,
} from '../../../packages/shared/src/index.ts';
import { createLiveEventHub } from './live-event-hub.ts';
import { DemoProvider, ManualProvider } from './live-provider.ts';
import { createEffectQueue } from './effect-queue.ts';

interface PersistentLiveState extends LiveStudioState {
  seriesTotals: Record<string, number>;
}

const REAL_UNAVAILABLE = 'Gerçek TikTok LIVE bağlantısı etkin değil: herkese açık resmi LIVE olay API’si belgelenmemiştir; gayriresmi tersine mühendislik bağlayıcısı kullanım koşulu riski nedeniyle kurulmadı. TikTok yazılı onayı veya yetkili partner erişimi gerekir.';
const EVENT_TYPES = ['COMMENT_RECEIVED', 'GIFT_RECEIVED', 'LIKE_RECEIVED', 'FOLLOW_RECEIVED', 'VIEWER_JOINED', 'SHARE_RECEIVED', 'LIVE_CONNECTED', 'LIVE_DISCONNECTED', 'LIVE_ENDED'] as const;

const DEFAULT_TEAMS: LiveTeam[] = [
  { id: 'galatasaray', name: 'Galatasaray', color: '#f5b800', logo: '', leaderSoundId: '', giftRules: [] },
  { id: 'fenerbahce', name: 'Fenerbahçe', color: '#173f8a', logo: '', leaderSoundId: '', giftRules: [] },
  { id: 'bursaspor', name: 'Bursaspor', color: '#168a4a', logo: '', leaderSoundId: '', giftRules: [] },
  { id: 'amedspor', name: 'Amedspor', color: '#d92735', logo: '', leaderSoundId: '', giftRules: [] },
];

function capabilities(mode: LiveSourceMode): LiveCapability[] {
  if (mode === 'LIVE') return EVENT_TYPES.map((eventType) => ({ eventType, available: false, note: REAL_UNAVAILABLE }));
  const implemented = ['COMMENT_RECEIVED', 'GIFT_RECEIVED', 'VIEWER_JOINED', 'LIVE_CONNECTED', 'LIVE_DISCONNECTED'];
  return EVENT_TYPES.map((eventType) => ({
    eventType,
    available: implemented.includes(eventType),
    note: implemented.includes(eventType) ? (mode === 'DEMO' ? 'Yerel demo üreticisi' : 'Yayıncı kontrollü manuel giriş') : 'Bu yerel sağlayıcıda uygulanmadı',
  }));
}

function initialState(): PersistentLiveState {
  return {
    rev: 0,
    connection: {
      status: 'disconnected', mode: 'DEMO', provider: 'demo-provider', accountId: '', liveSessionId: '',
      connectedAt: 0, lastEventAt: 0, eventCount: 0, reconnectAttempt: 0, nextReconnectAt: 0, errors: [], capabilities: capabilities('DEMO'),
    },
    lastComment: null,
    lastGift: null,
    lastRealComment: null,
    lastRealGift: null,
    recentEvents: [],
    gifts: [],
    teams: structuredClone(DEFAULT_TEAMS),
    teamScores: DEFAULT_TEAMS.map((team) => ({ teamId: team.id, score: 0 })),
    leaderTeamId: '',
    chatMessages: [],
    selectedChatEventId: '',
    tickerText: '',
    blockedWords: [],
    seriesTotals: {},
  };
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeGiftPayload(payload: Record<string, unknown>): GiftPayload | null {
  const giftId = cleanText(payload.giftId, 120);
  const giftName = cleanText(payload.giftName, 120);
  const count = Math.max(1, Math.min(100_000, Math.trunc(Number(payload.count) || 1)));
  if (!giftId || !giftName) return null;
  const verified = payload.verifiedValue;
  return {
    giftId,
    giftName,
    count,
    seriesId: cleanText(payload.seriesId, 160),
    seriesComplete: payload.seriesComplete === true,
    verifiedValue: typeof verified === 'number' && Number.isFinite(verified) && verified >= 0 ? verified : null,
  };
}

export function createLiveService(
  dataDir: string,
  submitArenaComment: (event: ArenaCommentEvent) => ArenaCommandResult,
  onChanged: () => void,
) {
  const file = path.join(dataDir, 'live-events.json');
  const hub = createLiveEventHub();
  const providers = { DEMO: new DemoProvider(), MANUAL: new ManualProvider() } as const;
  const effectQueue = createEffectQueue();
  let activeProvider: DemoProvider | ManualProvider | null = null;
  const arenaResults = new Map<string, ArenaCommandResult>();
  let state = load();
  hub.prime(state.recentEvents.map((event) => event.eventId));
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  function load(): PersistentLiveState {
    try {
      if (!fs.existsSync(file)) return initialState();
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<PersistentLiveState>;
      const base = initialState();
      const teams = Array.isArray(raw.teams) ? raw.teams : base.teams;
      return {
        ...base,
        ...raw,
        connection: { ...base.connection, ...raw.connection, status: 'disconnected', connectedAt: 0, nextReconnectAt: 0, capabilities: capabilities(raw.connection?.mode ?? 'DEMO') },
        recentEvents: Array.isArray(raw.recentEvents) ? raw.recentEvents.slice(-500) : [],
        gifts: Array.isArray(raw.gifts) ? raw.gifts.slice(-500) : [],
        teams,
        teamScores: Array.isArray(raw.teamScores) ? raw.teamScores : teams.map((team) => ({ teamId: team.id, score: 0 })),
        chatMessages: Array.isArray(raw.chatMessages) ? raw.chatMessages.slice(-200) : [],
        blockedWords: Array.isArray(raw.blockedWords) ? raw.blockedWords.map((word) => cleanText(word, 40)).filter(Boolean).slice(0, 100) : [],
        seriesTotals: raw.seriesTotals && typeof raw.seriesTotals === 'object' ? raw.seriesTotals : {},
      };
    } catch {
      try { fs.renameSync(file, `${file}.bozuk-${Date.now()}`); } catch { /* yedeklenemedi */ }
      return initialState();
    }
  }

  function flush() {
    clearTimeout(saveTimer);
    saveTimer = undefined;
    fs.mkdirSync(dataDir, { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  }

  function touch() {
    state.rev++;
    saveTimer ??= setTimeout(flush, 150);
    onChanged();
  }

  function publicState(): LiveStudioState {
    const { seriesTotals: _seriesTotals, ...visible } = state;
    return structuredClone(visible);
  }

  function overlayState(): LiveStudioState {
    const visible = publicState();
    const selected = visible.chatMessages.find((message) => message.eventId === visible.selectedChatEventId && !message.blocked);
    return {
      ...visible,
      connection: { ...visible.connection, accountId: '', liveSessionId: '', errors: [] },
      lastComment: null,
      lastGift: null,
      lastRealComment: null,
      lastRealGift: null,
      recentEvents: [],
      gifts: [],
      chatMessages: selected ? [selected] : [],
      blockedWords: [],
    };
  }

  function eventBase(eventType: LiveEvent['eventType'], sourceMode: LiveSourceMode, input: { eventId?: string; userId?: string; username?: string; displayName?: string; payload?: Record<string, unknown> }): LiveEvent {
    return {
      eventId: cleanText(input.eventId, 160) || crypto.randomUUID(),
      eventType,
      provider: sourceMode === 'DEMO' ? 'demo-provider' : sourceMode === 'MANUAL' ? 'manual-provider' : 'tiktok-live',
      liveSessionId: state.connection.liveSessionId,
      userId: cleanText(input.userId, 160),
      username: cleanText(input.username, 80),
      displayName: cleanText(input.displayName, 80),
      timestamp: Date.now(),
      payload: input.payload ?? {},
      sourceMode,
    };
  }

  hub.on('*', (event) => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    state.recentEvents.push(event);
    state.recentEvents = state.recentEvents.filter((item) => item.timestamp >= cutoff).slice(-500);
    state.connection.lastEventAt = event.timestamp;
    state.connection.eventCount++;
    if (event.eventType === 'COMMENT_RECEIVED') state.lastComment = event;
    if (event.eventType === 'GIFT_RECEIVED') state.lastGift = event;
    if (event.sourceMode === 'LIVE' && event.eventType === 'COMMENT_RECEIVED') state.lastRealComment = event;
    if (event.sourceMode === 'LIVE' && event.eventType === 'GIFT_RECEIVED') state.lastRealGift = event;
    touch();
  });

  hub.on('COMMENT_RECEIVED', (event) => {
    const comment = cleanText(event.payload.comment, 500);
    if (!comment || !event.userId || !event.displayName) return;
    const arenaResult = submitArenaComment({
      eventId: event.eventId,
      userId: event.userId,
      displayName: event.displayName,
      comment,
      source: event.sourceMode === 'DEMO' ? 'demo' : event.sourceMode === 'MANUAL' ? 'manual' : 'live',
      receivedAt: event.timestamp,
    });
    arenaResults.set(event.eventId, arenaResult);
    const lower = comment.toLocaleLowerCase('tr-TR');
    const blocked = state.blockedWords.some((word) => lower.includes(word.toLocaleLowerCase('tr-TR')));
    state.chatMessages.push({ eventId: event.eventId, userId: event.userId, displayName: event.displayName, text: comment, timestamp: event.timestamp, sourceMode: event.sourceMode, kind: 'comment', blocked });
    state.chatMessages = state.chatMessages.slice(-200);
    touch();
  });

  hub.on('VIEWER_JOINED', (event) => {
    if (!event.displayName) return;
    state.chatMessages.push({ eventId: event.eventId, userId: event.userId, displayName: event.displayName, text: `${event.displayName} hoş geldiniz`, timestamp: event.timestamp, sourceMode: event.sourceMode, kind: 'welcome', blocked: false });
    state.chatMessages = state.chatMessages.slice(-200);
    effectQueue.enqueue({ sourceEventId: event.eventId, kind: 'welcome', priority: 30, payload: { displayName: event.displayName } });
    touch();
  });

  hub.on('GIFT_RECEIVED', (event) => {
    const gift = safeGiftPayload(event.payload);
    if (!gift || !event.userId || !event.displayName) return;
    const seriesKey = gift.seriesId ? `${event.liveSessionId}:${event.userId}:${gift.giftId}:${gift.seriesId}` : '';
    const previousTotal = seriesKey ? Math.max(0, Number(state.seriesTotals[seriesKey]) || 0) : 0;
    const scoredCount = seriesKey ? Math.max(0, gift.count - previousTotal) : gift.count;
    if (seriesKey) state.seriesTotals[seriesKey] = Math.max(previousTotal, gift.count);
    state.gifts.push({
      eventId: event.eventId, liveSessionId: event.liveSessionId, userId: event.userId, displayName: event.displayName,
      ...gift, scoredCount, processedAt: Date.now(), sourceMode: event.sourceMode, status: scoredCount ? 'processed' : 'duplicate-series',
    });
    state.gifts = state.gifts.slice(-500);
    state.chatMessages.push({ eventId: `${event.eventId}:thanks`, userId: event.userId, displayName: event.displayName, text: `${event.displayName}, ${gift.giftName} hediyesi için teşekkürler`, timestamp: event.timestamp, sourceMode: event.sourceMode, kind: 'gift-thanks', blocked: false });
    state.chatMessages = state.chatMessages.slice(-200);
    effectQueue.enqueue({ sourceEventId: event.eventId, kind: 'gift-thanks', priority: 50, payload: { displayName: event.displayName, giftName: gift.giftName } });
    if (scoredCount > 0) {
      const matches = state.teams.flatMap((team) => team.giftRules.filter((rule) => rule.giftId === gift.giftId).map((rule) => ({ team, rule })));
      if (matches.length === 1) {
        const beforeLeader = state.leaderTeamId;
        const match = matches[0];
        const score = state.teamScores.find((item) => item.teamId === match.team.id);
        if (score) score.score += match.rule.points * scoredCount;
        const ordered = [...state.teamScores].sort((a, b) => b.score - a.score);
        state.leaderTeamId = ordered[0]?.score > 0 && ordered[0].score !== ordered[1]?.score ? ordered[0].teamId : '';
        if (state.leaderTeamId && state.leaderTeamId !== beforeLeader) {
          effectQueue.enqueue({ sourceEventId: event.eventId, kind: 'leader-changed', priority: 90, payload: { previousTeamId: beforeLeader, leaderTeamId: state.leaderTeamId } });
          hub.emit(eventBase('LEADER_CHANGED', event.sourceMode, { eventId: `${event.eventId}:leader:${state.leaderTeamId}`, payload: { previousTeamId: beforeLeader, leaderTeamId: state.leaderTeamId, score: ordered[0].score } }));
        }
      }
    }
    touch();
  });

  function emitLocal(event: LiveEvent): LiveCommandResult {
    if (state.connection.status !== 'connected' || !activeProvider?.isConnected()) return { ok: false, message: 'Merkezi LIVE bağlantısı açık değil.' };
    if (state.connection.mode !== event.sourceMode) return { ok: false, message: 'Olay kaynağı etkin bağlantı moduyla eşleşmiyor.' };
    if (!hub.emit(event)) return { ok: false, message: 'Olay geçersiz veya daha önce işlendi.' };
    if (event.eventType === 'COMMENT_RECEIVED') {
      const arenaResult = arenaResults.get(event.eventId);
      arenaResults.delete(event.eventId);
      if (arenaResult && !arenaResult.ok) return arenaResult;
    }
    return { ok: true, message: 'Olay merkezi akışa alındı.' };
  }

  function setTeams(teamsInput: LiveTeam[]): LiveCommandResult {
    if (!Array.isArray(teamsInput) || teamsInput.length < 1 || teamsInput.length > 16) return { ok: false, message: '1–16 takım tanımlayın.' };
    const teams: LiveTeam[] = teamsInput.map((team, index) => ({
      id: cleanText(team.id, 80) || `team-${index + 1}`,
      name: cleanText(team.name, 80) || `Takım ${index + 1}`,
      color: /^#[0-9a-f]{6}$/i.test(team.color) ? team.color : '#64748b',
      logo: cleanText(team.logo, 240),
      leaderSoundId: cleanText(team.leaderSoundId, 160),
      giftRules: Array.isArray(team.giftRules) ? team.giftRules.slice(0, 50).map((rule) => ({ giftId: cleanText(rule.giftId, 120), giftName: cleanText(rule.giftName, 120), points: Math.max(0, Math.min(1_000_000, Math.trunc(Number(rule.points) || 0))) })).filter((rule) => rule.giftId && rule.points > 0) : [],
    }));
    if (new Set(teams.map((team) => team.id)).size !== teams.length) return { ok: false, message: 'Takım kimlikleri benzersiz olmalıdır.' };
    const assigned = new Map<string, string>();
    for (const team of teams) for (const rule of team.giftRules) {
      const owner = assigned.get(rule.giftId);
      if (owner && owner !== team.id) return { ok: false, message: `${rule.giftName || rule.giftId} birden fazla takıma atanamaz; açık bir takım seçin.` };
      assigned.set(rule.giftId, team.id);
    }
    const oldScores = new Map(state.teamScores.map((item) => [item.teamId, item.score]));
    state.teams = teams;
    state.teamScores = teams.map((team) => ({ teamId: team.id, score: oldScores.get(team.id) ?? 0 }));
    if (!teams.some((team) => team.id === state.leaderTeamId)) state.leaderTeamId = '';
    touch();
    return { ok: true, message: 'Takım ve hediye kuralları kaydedildi.' };
  }

  function command(command: LiveCommand): LiveCommandResult {
    switch (command.type) {
      case 'connect': {
        if (state.connection.status === 'connected' && state.connection.mode === command.mode) return { ok: true, message: 'Bağlantı zaten açık.' };
        activeProvider?.disconnect();
        activeProvider = providers[command.mode];
        const sessionId = activeProvider.connect(cleanText(command.liveSessionId, 160));
        state.connection = {
          ...state.connection,
          status: 'connected', mode: command.mode, provider: activeProvider.id,
          accountId: cleanText(command.accountId, 120), liveSessionId: sessionId,
          connectedAt: Date.now(), reconnectAttempt: 0, nextReconnectAt: 0, errors: [], capabilities: capabilities(command.mode),
        };
        hub.emit(eventBase('LIVE_CONNECTED', command.mode, { payload: { accountId: state.connection.accountId } }));
        touch();
        return { ok: true, message: `${command.mode === 'DEMO' ? 'Demo' : 'Manuel'} sağlayıcı merkezi akışa bağlandı.` };
      }
      case 'try-live':
        if (state.connection.status === 'connected') hub.emit(eventBase('LIVE_DISCONNECTED', state.connection.mode, { payload: { reason: 'provider-switch' } }));
        activeProvider?.disconnect();
        activeProvider = null;
        state.connection = { ...state.connection, status: 'unsupported', mode: 'LIVE', provider: 'approved-tiktok-provider-required', accountId: cleanText(command.accountId, 120).replace(/^@/, ''), liveSessionId: '', connectedAt: 0, reconnectAttempt: 0, nextReconnectAt: 0, capabilities: capabilities('LIVE'), errors: [REAL_UNAVAILABLE] };
        touch();
        return { ok: false, message: REAL_UNAVAILABLE };
      case 'disconnect': {
        if (state.connection.status === 'connected') hub.emit(eventBase('LIVE_DISCONNECTED', state.connection.mode, { payload: { reason: 'manual' } }));
        activeProvider?.disconnect();
        activeProvider = null;
        state.connection.status = 'disconnected';
        state.connection.connectedAt = 0;
        state.connection.nextReconnectAt = 0;
        touch();
        return { ok: true, message: 'Merkezi sağlayıcı bağlantısı kapatıldı.' };
      }
      case 'emit-comment':
        return emitLocal(eventBase('COMMENT_RECEIVED', command.sourceMode, { ...command, payload: { comment: cleanText(command.comment, 500) } }));
      case 'emit-gift':
        return emitLocal(eventBase('GIFT_RECEIVED', command.sourceMode, { ...command, payload: { giftId: command.giftId, giftName: command.giftName, count: command.count, seriesId: command.seriesId ?? '', seriesComplete: command.seriesComplete === true, verifiedValue: command.verifiedValue ?? null } }));
      case 'emit-viewer-joined':
        return emitLocal(eventBase('VIEWER_JOINED', command.sourceMode, { ...command, payload: {} }));
      case 'set-teams':
        return setTeams(command.teams);
      case 'select-chat-message':
        state.selectedChatEventId = state.chatMessages.some((message) => message.eventId === command.eventId && !message.blocked) ? command.eventId : '';
        touch();
        return { ok: true, message: state.selectedChatEventId ? 'Yorum yayın için seçildi.' : 'Seçili yorum kaldırıldı.' };
      case 'set-chat-settings':
        if (command.tickerText !== undefined) state.tickerText = cleanText(command.tickerText, 240);
        if (command.blockedWords !== undefined) state.blockedWords = command.blockedWords.map((word) => cleanText(word, 40)).filter(Boolean).slice(0, 100);
        touch();
        return { ok: true, message: 'Sohbet ayarları kaydedildi.' };
      case 'clear-live-session':
        state.gifts = [];
        state.teamScores = state.teams.map((team) => ({ teamId: team.id, score: 0 }));
        state.leaderTeamId = '';
        state.chatMessages = [];
        state.selectedChatEventId = '';
        state.seriesTotals = {};
        touch();
        return { ok: true, message: 'Oturum puanları ve geçici olay kayıtları temizlendi.' };
    }
  }

  return { command, get: publicState, getPublic: overlayState, flush, hub, effectQueue };
}

export type LiveService = ReturnType<typeof createLiveService>;
