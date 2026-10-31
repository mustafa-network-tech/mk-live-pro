// Şiir kütüphanesi yalnızca yerel stüdyo panelinde kullanılır; overlay durumuna dahil edilmez.
export interface PoemEntry {
  id: string;
  title: string;
  poet: string;
  body: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const POEM_LIBRARY_LIMITS = {
  entries: 500,
  title: 160,
  poet: 100,
  body: 20_000,
  notes: 2_000,
} as const;
