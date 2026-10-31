// Yayın durumu: tek doğruluk kaynağı. Sunucu, stüdyo ve overlay aynı tipi kullanır.
// Not: Bu dosya Node'un type-stripping özelliğiyle de çalışır (enum/namespace yok).

export const STAGE_WIDTH = 1080;
export const STAGE_HEIGHT = 1920;

export const CONCEPTS = ['siir', 'yarisma', 'sohbet', 'turku'] as const;
export type Concept = (typeof CONCEPTS)[number];

export const THEME_IDS = ['elegant-gold', 'modern-neon', 'warm-acoustic'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const FONT_IDS = ['theme', 'classic', 'modern', 'elegant', 'humanist'] as const;
export type FontId = (typeof FONT_IDS)[number];

export const ALIGNS = ['left', 'center', 'right'] as const;
export type Align = (typeof ALIGNS)[number];

export const POEM_THEME_IDS = ['rain', 'autumn', 'night', 'nostalgia'] as const;
export type PoemThemeId = (typeof POEM_THEME_IDS)[number];

export const POEM_STATUSES = ['waiting', 'live', 'finished'] as const;
export type PoemStatus = (typeof POEM_STATUSES)[number];

export const POEM_PHOTO_MODES = ['off', 'background', 'card'] as const;
export type PoemPhotoMode = (typeof POEM_PHOTO_MODES)[number];

export interface PoemState {
  reader: string;
  queue: string[];
  status: PoemStatus;
  theme: PoemThemeId;
  showNext: boolean;
  photoId: string;
  photoMode: PoemPhotoMode;
  photoOpacity: number;
}

export const CONTEST_MODES = ['word', 'poem', 'folk', 'quiz'] as const;
export type ContestMode = (typeof CONTEST_MODES)[number];
export const CONTEST_STATUSES = ['setup', 'live', 'revealed', 'finished'] as const;
export type ContestStatus = (typeof CONTEST_STATUSES)[number];

export interface ContestPlayer {
  id: string;
  name: string;
  score: number;
}

export interface ContestState {
  mode: ContestMode;
  prompt: string;
  hint: string;
  reveal: string;
  status: ContestStatus;
  duration: number;
  endsAt: number;
  showScores: boolean;
  players: ContestPlayer[];
  winnerId: string;
}

export interface ChatState {
  topic: string;
  question: string;
  questions: string[];
  showTopic: boolean;
  showQuestion: boolean;
}

export const TURKU_STATUSES = ['waiting', 'live', 'finished'] as const;
export type TurkuStatus = (typeof TURKU_STATUSES)[number];

export interface TurkuRequest {
  id: string;
  title: string;
  artist: string;
  region: string;
  requester: string;
}

export interface TurkuState {
  current: TurkuRequest | null;
  queue: TurkuRequest[];
  status: TurkuStatus;
  showNext: boolean;
}

export interface StudioState {
  /** Sunucu tarafından artırılır; istemci yamalarında yok sayılır. */
  rev: number;
  concept: Concept;
  title: string;
  subtitle: string;
  theme: ThemeId;
  font: { family: FontId; size: number; color: string };
  /** y: güvenli alan içinde dikey konum (0 = üst, 100 = alt). */
  position: { y: number; align: Align };
  layers: { title: boolean; subtitle: boolean; participant: boolean; decor: boolean };
  /** 1080x1920 referans sahnesinde piksel cinsinden boşluklar. */
  safeArea: { top: number; bottom: number; left: number; right: number };
  participants: string[];
  /** Sahnedeki katılımcının dizini; -1 = kimse. */
  activeParticipant: number;
  poem: PoemState;
  contest: ContestState;
  chat: ChatState;
  turku: TurkuState;
}

export type StatePatch = { [K in keyof StudioState]?: Partial<StudioState[K]> | StudioState[K] };

export const DEFAULT_STATE: StudioState = {
  rev: 0,
  concept: 'siir',
  title: 'Şiir Gecesi',
  subtitle: 'MK Digital Systems',
  theme: 'elegant-gold',
  font: { family: 'theme', size: 110, color: '' },
  position: { y: 12, align: 'center' },
  layers: { title: true, subtitle: true, participant: true, decor: true },
  safeArea: { top: 180, bottom: 520, left: 64, right: 64 },
  participants: [],
  activeParticipant: -1,
  poem: {
    reader: '',
    queue: [],
    status: 'waiting',
    theme: 'night',
    showNext: true,
    photoId: '',
    photoMode: 'off',
    photoOpacity: 72,
  },
  contest: {
    mode: 'quiz',
    prompt: '',
    hint: '',
    reveal: '',
    status: 'setup',
    duration: 60,
    endsAt: 0,
    showScores: true,
    players: [],
    winnerId: '',
  },
  chat: {
    topic: '',
    question: '',
    questions: [],
    showTopic: true,
    showQuestion: true,
  },
  turku: {
    current: null,
    queue: [],
    status: 'waiting',
    showNext: true,
  },
};

export const LIMITS = {
  title: 120,
  subtitle: 160,
  participantName: 60,
  participants: 50,
  poemReader: 60,
  poemQueue: 50,
  photoOpacity: [10, 100] as const,
  contestPrompt: 240,
  contestHint: 160,
  contestReveal: 160,
  contestPlayers: 30,
  contestScore: [-999, 9999] as const,
  contestDuration: [10, 600] as const,
  chatTopic: 180,
  chatQuestion: 260,
  chatQuestions: 50,
  turkuQueue: 50,
  turkuTitle: 120,
  turkuArtist: 100,
  turkuRegion: 80,
  turkuRequester: 60,
  fontSize: [40, 200] as const,
  safe: [0, 800] as const,
};

// --- Doğrulama yardımcıları -------------------------------------------------

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function text(v: unknown, max: number, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
}

function num(v: unknown, [min, max]: readonly [number, number], fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

function oneOf<T extends string>(v: unknown, list: readonly T[], fallback: T): T {
  return typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function safeId(v: unknown, fallback = ''): string {
  return typeof v === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(v) ? v : fallback;
}

function sanitizeTurkuRequest(value: unknown, fallback: TurkuRequest | null = null): TurkuRequest | null {
  if (value === null) return null;
  if (!isObj(value)) return fallback;
  const id = safeId(value.id, fallback?.id ?? '');
  if (!id) return fallback;
  return {
    id,
    title: text(value.title, LIMITS.turkuTitle, fallback?.title ?? ''),
    artist: text(value.artist, LIMITS.turkuArtist, fallback?.artist ?? ''),
    region: text(value.region, LIMITS.turkuRegion, fallback?.region ?? ''),
    requester: text(value.requester, LIMITS.turkuRequester, fallback?.requester ?? ''),
  };
}

/**
 * `input` içindeki geçerli alanları `base` üzerine uygular; geçersiz/eksik alanlar base'den kalır.
 * Hem yama birleştirmede hem diskten okumada kullanılır. Her zaman tam ve geçerli bir durum döner.
 */
export function sanitizeState(input: unknown, base: StudioState): StudioState {
  const i = isObj(input) ? input : {};
  const font = isObj(i.font) ? i.font : {};
  const pos = isObj(i.position) ? i.position : {};
  const layers = isObj(i.layers) ? i.layers : {};
  const safe = isObj(i.safeArea) ? i.safeArea : {};
  const poem = isObj(i.poem) ? i.poem : {};
  const contest = isObj(i.contest) ? i.contest : {};
  const chat = isObj(i.chat) ? i.chat : {};
  const turku = isObj(i.turku) ? i.turku : {};

  const participants = Array.isArray(i.participants)
    ? i.participants
        .filter((p): p is string => typeof p === 'string')
        .slice(0, LIMITS.participants)
        .map((p) => text(p, LIMITS.participantName, ''))
    : base.participants;

  const active =
    typeof i.activeParticipant === 'number' && Number.isFinite(i.activeParticipant)
      ? Math.trunc(i.activeParticipant)
      : base.activeParticipant;

  const poemQueue = Array.isArray(poem.queue)
    ? poem.queue
        .filter((p): p is string => typeof p === 'string')
        .slice(0, LIMITS.poemQueue)
        .map((p) => text(p, LIMITS.poemReader, ''))
    : base.poem.queue;

  const contestPlayers = Array.isArray(contest.players)
    ? contest.players.slice(0, LIMITS.contestPlayers).flatMap((value): ContestPlayer[] => {
        if (!isObj(value)) return [];
        const id = safeId(value.id);
        if (!id) return [];
        return [{
          id,
          name: text(value.name, LIMITS.participantName, ''),
          score: num(value.score, LIMITS.contestScore, 0),
        }];
      })
    : base.contest.players;

  const chatQuestions = Array.isArray(chat.questions)
    ? chat.questions
        .filter((value): value is string => typeof value === 'string')
        .slice(0, LIMITS.chatQuestions)
        .map((value) => text(value, LIMITS.chatQuestion, ''))
        .filter((value) => value.trim() !== '')
    : base.chat.questions;

  const turkuQueue = Array.isArray(turku.queue)
    ? turku.queue.slice(0, LIMITS.turkuQueue).flatMap((value): TurkuRequest[] => {
        const request = sanitizeTurkuRequest(value);
        return request ? [request] : [];
      })
    : base.turku.queue;

  const color = typeof font.color === 'string' && /^(#[0-9a-fA-F]{6})?$/.test(font.color) ? font.color : base.font.color;

  return {
    rev: base.rev,
    concept: oneOf(i.concept, CONCEPTS, base.concept),
    title: text(i.title, LIMITS.title, base.title),
    subtitle: text(i.subtitle, LIMITS.subtitle, base.subtitle),
    theme: oneOf(i.theme, THEME_IDS, base.theme),
    font: {
      family: oneOf(font.family, FONT_IDS, base.font.family),
      size: num(font.size, LIMITS.fontSize, base.font.size),
      color,
    },
    position: {
      y: num(pos.y, [0, 100], base.position.y),
      align: oneOf(pos.align, ALIGNS, base.position.align),
    },
    layers: {
      title: bool(layers.title, base.layers.title),
      subtitle: bool(layers.subtitle, base.layers.subtitle),
      participant: bool(layers.participant, base.layers.participant),
      decor: bool(layers.decor, base.layers.decor),
    },
    safeArea: {
      top: num(safe.top, LIMITS.safe, base.safeArea.top),
      bottom: num(safe.bottom, LIMITS.safe, base.safeArea.bottom),
      left: num(safe.left, LIMITS.safe, base.safeArea.left),
      right: num(safe.right, LIMITS.safe, base.safeArea.right),
    },
    participants,
    activeParticipant: active >= -1 && active < participants.length ? active : -1,
    poem: {
      reader: text(poem.reader, LIMITS.poemReader, base.poem.reader),
      queue: poemQueue,
      status: oneOf(poem.status, POEM_STATUSES, base.poem.status),
      theme: oneOf(poem.theme, POEM_THEME_IDS, base.poem.theme),
      showNext: bool(poem.showNext, base.poem.showNext),
      photoId: typeof poem.photoId === 'string' && /^(|[a-f0-9-]{36})$/.test(poem.photoId) ? poem.photoId : base.poem.photoId,
      photoMode: oneOf(poem.photoMode, POEM_PHOTO_MODES, base.poem.photoMode),
      photoOpacity: num(poem.photoOpacity, LIMITS.photoOpacity, base.poem.photoOpacity),
    },
    contest: {
      mode: oneOf(contest.mode, CONTEST_MODES, base.contest.mode),
      prompt: text(contest.prompt, LIMITS.contestPrompt, base.contest.prompt),
      hint: text(contest.hint, LIMITS.contestHint, base.contest.hint),
      reveal: text(contest.reveal, LIMITS.contestReveal, base.contest.reveal),
      status: oneOf(contest.status, CONTEST_STATUSES, base.contest.status),
      duration: num(contest.duration, LIMITS.contestDuration, base.contest.duration),
      endsAt: num(contest.endsAt, [0, 4_102_444_800_000], base.contest.endsAt),
      showScores: bool(contest.showScores, base.contest.showScores),
      players: contestPlayers,
      winnerId: contestPlayers.some((player) => player.id === contest.winnerId) ? String(contest.winnerId) : '',
    },
    chat: {
      topic: text(chat.topic, LIMITS.chatTopic, base.chat.topic),
      question: text(chat.question, LIMITS.chatQuestion, base.chat.question),
      questions: chatQuestions,
      showTopic: bool(chat.showTopic, base.chat.showTopic),
      showQuestion: bool(chat.showQuestion, base.chat.showQuestion),
    },
    turku: {
      current: sanitizeTurkuRequest(turku.current, base.turku.current),
      queue: turkuQueue,
      status: oneOf(turku.status, TURKU_STATUSES, base.turku.status),
      showNext: bool(turku.showNext, base.turku.showNext),
    },
  };
}

// --- Protokol ---------------------------------------------------------------

export type ServerMessage =
  | { type: 'state'; state: StudioState }
  | { type: 'media'; id: string; mime: string; data: string }
  | { type: 'hb' };
export type ClientMessage = { type: 'patch'; patch: StatePatch } | { type: 'media:get'; id: string };
