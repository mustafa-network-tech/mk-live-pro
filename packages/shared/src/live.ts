export const LIVE_EVENT_TYPES = [
  'COMMENT_RECEIVED',
  'GIFT_RECEIVED',
  'LIKE_RECEIVED',
  'FOLLOW_RECEIVED',
  'VIEWER_JOINED',
  'SHARE_RECEIVED',
  'LIVE_CONNECTED',
  'LIVE_DISCONNECTED',
  'LIVE_ENDED',
  'LEADER_CHANGED',
] as const;

export type LiveEventType = (typeof LIVE_EVENT_TYPES)[number];
export type LiveSourceMode = 'LIVE' | 'DEMO' | 'MANUAL';
export type LiveConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'unsupported';

export interface LiveEvent {
  eventId: string;
  eventType: LiveEventType;
  provider: string;
  liveSessionId: string;
  userId: string;
  username: string;
  displayName: string;
  timestamp: number;
  payload: Record<string, unknown>;
  sourceMode: LiveSourceMode;
}

export interface LiveCapability {
  eventType: Exclude<LiveEventType, 'LEADER_CHANGED'>;
  available: boolean;
  note: string;
}

export interface GiftPayload {
  giftId: string;
  giftName: string;
  count: number;
  seriesId: string;
  seriesComplete: boolean;
  verifiedValue: number | null;
}

export interface ProcessedGift {
  eventId: string;
  liveSessionId: string;
  userId: string;
  displayName: string;
  giftId: string;
  giftName: string;
  count: number;
  scoredCount: number;
  seriesId: string;
  seriesComplete: boolean;
  verifiedValue: number | null;
  processedAt: number;
  sourceMode: LiveSourceMode;
  status: 'processed' | 'duplicate-series';
}

export interface TeamGiftRule {
  giftId: string;
  giftName: string;
  points: number;
}

export interface LiveTeam {
  id: string;
  name: string;
  color: string;
  logo: string;
  leaderSoundId: string;
  giftRules: TeamGiftRule[];
}

export interface TeamScore {
  teamId: string;
  score: number;
}

export interface LiveChatMessage {
  eventId: string;
  userId: string;
  displayName: string;
  text: string;
  timestamp: number;
  sourceMode: LiveSourceMode;
  kind: 'comment' | 'welcome' | 'gift-thanks';
  blocked: boolean;
}

export interface LiveConnectionState {
  status: LiveConnectionStatus;
  mode: LiveSourceMode;
  provider: string;
  accountId: string;
  liveSessionId: string;
  connectedAt: number;
  lastEventAt: number;
  eventCount: number;
  reconnectAttempt: number;
  nextReconnectAt: number;
  errors: string[];
  capabilities: LiveCapability[];
}

export interface LiveStudioState {
  rev: number;
  connection: LiveConnectionState;
  lastComment: LiveEvent | null;
  lastGift: LiveEvent | null;
  lastRealComment: LiveEvent | null;
  lastRealGift: LiveEvent | null;
  recentEvents: LiveEvent[];
  gifts: ProcessedGift[];
  teams: LiveTeam[];
  teamScores: TeamScore[];
  leaderTeamId: string;
  chatMessages: LiveChatMessage[];
  selectedChatEventId: string;
  tickerText: string;
  blockedWords: string[];
}

export type LiveCommand =
  | { type: 'connect'; mode: Exclude<LiveSourceMode, 'LIVE'>; accountId?: string; liveSessionId?: string }
  | { type: 'try-live'; accountId?: string }
  | { type: 'disconnect' }
  | { type: 'emit-comment'; sourceMode: Exclude<LiveSourceMode, 'LIVE'>; userId: string; username?: string; displayName: string; comment: string; eventId?: string }
  | { type: 'emit-gift'; sourceMode: Exclude<LiveSourceMode, 'LIVE'>; userId: string; username?: string; displayName: string; giftId: string; giftName: string; count: number; seriesId?: string; seriesComplete?: boolean; verifiedValue?: number | null; eventId?: string }
  | { type: 'emit-viewer-joined'; sourceMode: Exclude<LiveSourceMode, 'LIVE'>; userId: string; username?: string; displayName: string; eventId?: string }
  | { type: 'set-teams'; teams: LiveTeam[] }
  | { type: 'select-chat-message'; eventId: string }
  | { type: 'set-chat-settings'; tickerText?: string; blockedWords?: string[] }
  | { type: 'clear-live-session' };

export interface LiveCommandResult {
  ok: boolean;
  message: string;
}
