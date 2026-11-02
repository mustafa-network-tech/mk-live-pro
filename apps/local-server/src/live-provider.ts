import type { LiveSourceMode } from '../../../packages/shared/src/index.ts';

export interface LiveProvider {
  readonly id: string;
  readonly mode: LiveSourceMode;
  readonly isRealIntegration: boolean;
  connect(requestedSessionId?: string): string;
  disconnect(): void;
  isConnected(): boolean;
}

class LocalLiveProvider implements LiveProvider {
  readonly id: string;
  readonly mode: Exclude<LiveSourceMode, 'LIVE'>;
  readonly isRealIntegration = false as const;
  private connected = false;
  private sessionId = '';

  constructor(id: string, mode: Exclude<LiveSourceMode, 'LIVE'>) {
    this.id = id;
    this.mode = mode;
  }

  connect(requestedSessionId = ''): string {
    this.connected = true;
    this.sessionId = requestedSessionId.trim().slice(0, 160) || crypto.randomUUID();
    return this.sessionId;
  }

  disconnect() {
    this.connected = false;
    this.sessionId = '';
  }

  isConnected() {
    return this.connected;
  }
}

export class DemoProvider extends LocalLiveProvider {
  constructor() { super('demo-provider', 'DEMO'); }
}

export class ManualProvider extends LocalLiveProvider {
  constructor() { super('manual-provider', 'MANUAL'); }
}
