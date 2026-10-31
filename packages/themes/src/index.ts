import type { Concept, FontId, ThemeId } from '../../shared/src/index.ts';

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
    bestFor: ['yarisma', 'sarki'],
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
  sarki: 'Şarkı Gecesi',
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
