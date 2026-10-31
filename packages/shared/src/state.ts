// Yayın durumu: tek doğruluk kaynağı. Sunucu, stüdyo ve overlay aynı tipi kullanır.
// Not: Bu dosya Node'un type-stripping özelliğiyle de çalışır (enum/namespace yok).

export const STAGE_WIDTH = 1080;
export const STAGE_HEIGHT = 1920;

export const CONCEPTS = ['siir', 'yarisma', 'sohbet', 'turku', 'sarki'] as const;
export type Concept = (typeof CONCEPTS)[number];

export const THEME_IDS = ['elegant-gold', 'modern-neon', 'warm-acoustic'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const FONT_IDS = ['theme', 'classic', 'modern', 'elegant', 'humanist'] as const;
export type FontId = (typeof FONT_IDS)[number];

export const ALIGNS = ['left', 'center', 'right'] as const;
export type Align = (typeof ALIGNS)[number];

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
};

export const LIMITS = {
  title: 120,
  subtitle: 160,
  participantName: 60,
  participants: 50,
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
  };
}

// --- Protokol ---------------------------------------------------------------

export type ServerMessage = { type: 'state'; state: StudioState } | { type: 'hb' };
export type ClientMessage = { type: 'patch'; patch: StatePatch };
