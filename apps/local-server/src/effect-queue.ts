export interface EffectCue {
  id: string;
  sourceEventId: string;
  kind: 'gift-thanks' | 'leader-changed' | 'welcome' | 'comment-keyword';
  priority: number;
  createdAt: number;
  payload: Record<string, unknown>;
}

export function createEffectQueue(maxItems = 100) {
  const queue: EffectCue[] = [];
  const seen = new Set<string>();
  const recentByKind = new Map<EffectCue['kind'], number[]>();

  function enqueue(input: Omit<EffectCue, 'id' | 'createdAt'>): boolean {
    const dedupeKey = `${input.sourceEventId}:${input.kind}`;
    if (!input.sourceEventId || seen.has(dedupeKey)) return false;
    const now = Date.now();
    const recent = (recentByKind.get(input.kind) ?? []).filter((timestamp) => now - timestamp < 2000);
    if (recent.length >= 3) return false;
    recent.push(now);
    recentByKind.set(input.kind, recent);
    seen.add(dedupeKey);
    queue.push({ ...input, id: crypto.randomUUID(), createdAt: now, priority: Math.max(0, Math.min(100, Math.trunc(input.priority))) });
    queue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
    while (queue.length > maxItems) queue.pop();
    return true;
  }

  function next(): EffectCue | null {
    return queue.shift() ?? null;
  }

  return { enqueue, next, size: () => queue.length, snapshot: () => structuredClone(queue) };
}

export type EffectQueue = ReturnType<typeof createEffectQueue>;
