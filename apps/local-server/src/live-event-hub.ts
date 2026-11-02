import { LIVE_EVENT_TYPES } from '../../../packages/shared/src/index.ts';
import type { LiveEvent, LiveEventType } from '../../../packages/shared/src/index.ts';

type Listener = (event: LiveEvent) => void;

export function createLiveEventHub() {
  const listeners = new Map<LiveEventType | '*', Set<Listener>>();
  const processedIds = new Set<string>();
  const processedOrder: string[] = [];

  function normalize(input: LiveEvent): LiveEvent | null {
    if (!LIVE_EVENT_TYPES.includes(input.eventType)) return null;
    const eventId = String(input.eventId ?? '').trim().slice(0, 160);
    const provider = String(input.provider ?? '').trim().slice(0, 80);
    const liveSessionId = String(input.liveSessionId ?? '').trim().slice(0, 160);
    if (!eventId || !provider || !liveSessionId || !Number.isFinite(input.timestamp)) return null;
    return {
      eventId,
      eventType: input.eventType,
      provider,
      liveSessionId,
      userId: String(input.userId ?? '').trim().slice(0, 160),
      username: String(input.username ?? '').trim().slice(0, 80),
      displayName: String(input.displayName ?? '').trim().slice(0, 80),
      timestamp: Math.max(0, Math.trunc(input.timestamp)),
      payload: input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload) ? structuredClone(input.payload) : {},
      sourceMode: input.sourceMode,
    };
  }

  function emit(input: LiveEvent): boolean {
    const event = normalize(input);
    if (!event || processedIds.has(event.eventId)) return false;
    processedIds.add(event.eventId);
    processedOrder.push(event.eventId);
    while (processedOrder.length > 5000) {
      const oldest = processedOrder.shift();
      if (oldest) processedIds.delete(oldest);
    }
    for (const listener of listeners.get(event.eventType) ?? []) listener(event);
    for (const listener of listeners.get('*') ?? []) listener(event);
    return true;
  }

  function on(type: LiveEventType | '*', listener: Listener): () => void {
    const set = listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    listeners.set(type, set);
    return () => set.delete(listener);
  }

  function prime(eventIds: string[]) {
    for (const rawId of eventIds.slice(-5000)) {
      const eventId = String(rawId ?? '').trim().slice(0, 160);
      if (!eventId || processedIds.has(eventId)) continue;
      processedIds.add(eventId);
      processedOrder.push(eventId);
    }
  }

  return { emit, on, prime };
}

export type LiveEventHub = ReturnType<typeof createLiveEventHub>;
