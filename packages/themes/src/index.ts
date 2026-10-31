import type { Concept, FontId, PoemThemeId, ThemeId } from '../../shared/src/index.ts';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  swatch: [string, string, string];
  bestFor: Concept[];
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'elegant-gold',
    name: 'Elegant Gold',
    description: 'Siyah ve altın; serif başlık, yavaş belirme. Şiir ve nostalji için.',
    swatch: ['#0b0906', '#d4af37', '#f6e7b4'],
    bestFor: ['siir'],
  },
  {
    id: 'modern-neon',
    name: 'Modern Neon',
    description: 'Mor-mavi ışık, kalın sans başlık, hızlı giriş. Yarışma ve müzik için.',
    swatch: ['#12062b', '#a855f7', '#38bdf8'],
    bestFor: ['yarisma'],
  },
  {
    id: 'warm-acoustic',
    name: 'Warm Acoustic',
    description: 'Sıcak doğal tonlar, yumuşak yazı ve kart. Türkü ve sohbet için.',
    swatch: ['#3b2616', '#e0a45a', '#fff1dc'],
    bestFor: ['turku', 'sohbet'],
  },
];

export const CONCEPT_LABELS: Record<Concept, string> = {
  siir: 'Şiir Gecesi',
  yarisma: 'Yarışma',
  sohbet: 'Sohbet',
  turku: 'Türkü Gecesi',
};

/** Yalnızca Windows ile gelen sistem yazı tipleri; dış bağlantı gerektirmez. */
export const FONT_STACKS: Record<Exclude<FontId, 'theme'>, string> = {
  classic: "Georgia, 'Times New Roman', serif",
  modern: "Bahnschrift, 'Segoe UI', Arial, sans-serif",
  elegant: "'Palatino Linotype', Palatino, 'Book Antiqua', serif",
  humanist: "Candara, 'Trebuchet MS', 'Segoe UI', sans-serif",
};

export const FONT_LABELS: Record<FontId, string> = {
  theme: 'Temanın kendi yazı tipi',
  classic: 'Klasik (Georgia)',
  modern: 'Modern (Bahnschrift)',
  elegant: 'Zarif (Palatino)',
  humanist: 'Samimi (Candara)',
};

export interface PoemThemeMeta {
  id: PoemThemeId;
  name: string;
  description: string;
  swatch: [string, string, string];
}

export const POEM_THEMES: PoemThemeMeta[] = [
  { id: 'rain', name: 'Yağmur', description: 'Serin mavi, cam dokusu ve ince damla çizgileri.', swatch: ['#101c2d', '#6fa8c9', '#d8edf7'] },
  { id: 'autumn', name: 'Sonbahar', description: 'Kehribar, bakır ve sıcak yaprak tonları.', swatch: ['#2a150d', '#b96832', '#f1c27d'] },
  { id: 'night', name: 'Gece', description: 'Lacivert, ay ışığı ve sakin bir sahne.', swatch: ['#090b21', '#7777bd', '#ece9ff'] },
  { id: 'nostalgia', name: 'Nostalji', description: 'Sepya tonları ve klasik kart görünümü.', swatch: ['#251b16', '#a67c52', '#ead8b8'] },
];
