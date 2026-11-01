import type { ArenaAnswerSource, ArenaCommandResult, ArenaCommentEvent } from '../../../packages/shared/src/index.ts';

export interface CommentProvider {
  readonly id: string;
  readonly label: string;
  readonly isRealIntegration: boolean;
  start(onComment: (event: ArenaCommentEvent) => ArenaCommandResult): () => void;
}
export class LocalCommentProvider implements CommentProvider {
  readonly id: string;
  readonly label: string;
  readonly isRealIntegration = false;
  readonly source: ArenaAnswerSource;
  private listener: ((event: ArenaCommentEvent) => ArenaCommandResult) | null = null;

  constructor(source: ArenaAnswerSource) {
    this.source = source;
    this.id = source;
    this.label = source === 'manual' ? 'Manuel cevap girişi' : 'Açıkça işaretli demo akışı';
  }

  start(onComment: (event: ArenaCommentEvent) => ArenaCommandResult) {
    this.listener = onComment;
    return () => { this.listener = null; };
  }

  emit(input: Omit<ArenaCommentEvent, 'source' | 'receivedAt'>): ArenaCommandResult {
    if (!this.listener) return { ok: false, message: 'Yorum sağlayıcısı aktif değil.' };
    return this.listener({ ...input, source: this.source, receivedAt: Date.now() });
  }
}
