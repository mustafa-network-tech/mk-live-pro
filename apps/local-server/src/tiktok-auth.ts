import crypto from 'node:crypto';

const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name';
const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:4173/auth/tiktok/callback';
const DEFAULT_TOKEN_BROKER = 'https://mk-live-pro.vercel.app/api/tiktok/token';
const DEFAULT_REVOKE_BROKER = 'https://mk-live-pro.vercel.app/api/tiktok/revoke';
const PENDING_TTL_MS = 10 * 60 * 1000;

interface PendingAuthorization {
  verifier: string;
  createdAt: number;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface TikTokProfile {
  openId: string;
  displayName: string;
  avatarUrl: string;
}

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshExpiresAt: number;
  scope: string;
  profile: TikTokProfile;
}

export interface TikTokAuthStatus {
  configured: boolean;
  authenticated: boolean;
  sandboxOnly: true;
  redirectUri: string;
  scope: string;
  expiresAt: number;
  profile: TikTokProfile | null;
  error: string;
}

function randomUrlSafe(bytes: number) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function safeMessage(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 500) : fallback;
}

export function createTikTokAuth() {
  const clientKey = String(process.env.TIKTOK_CLIENT_KEY ?? '').trim();
  const redirectUri = String(process.env.TIKTOK_REDIRECT_URI ?? DEFAULT_REDIRECT_URI).trim();
  const tokenBrokerUrl = String(process.env.TIKTOK_TOKEN_BROKER_URL ?? DEFAULT_TOKEN_BROKER).trim();
  const revokeBrokerUrl = String(process.env.TIKTOK_REVOKE_BROKER_URL ?? DEFAULT_REVOKE_BROKER).trim();
  const pending = new Map<string, PendingAuthorization>();
  let session: AuthSession | null = null;
  let lastError = '';

  function cleanupPending() {
    const oldest = Date.now() - PENDING_TTL_MS;
    for (const [state, item] of pending) if (item.createdAt < oldest) pending.delete(state);
  }

  function configured() {
    return Boolean(clientKey && /^http:\/\/(127\.0\.0\.1|localhost):\d+\/auth\/tiktok\/callback$/.test(redirectUri));
  }

  function status(): TikTokAuthStatus {
    if (session && session.expiresAt <= Date.now()) {
      lastError = 'TikTok erişim oturumunun süresi doldu. Yeniden bağlanın.';
      session = null;
    }
    return {
      configured: configured(),
      authenticated: Boolean(session),
      sandboxOnly: true,
      redirectUri,
      scope: session?.scope ?? 'user.info.basic',
      expiresAt: session?.expiresAt ?? 0,
      profile: session?.profile ?? null,
      error: lastError,
    };
  }

  function begin() {
    cleanupPending();
    if (!configured()) throw new Error('TikTok Client Key yapılandırılmamış veya Redirect URI geçersiz.');
    const state = randomUrlSafe(30);
    const verifier = randomUrlSafe(64).slice(0, 96);
    const challenge = crypto.createHash('sha256').update(verifier).digest('hex');
    pending.set(state, { verifier, createdAt: Date.now() });
    lastError = '';
    const url = new URL(AUTH_URL);
    url.searchParams.set('client_key', clientKey);
    url.searchParams.set('scope', 'user.info.basic');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  async function readProfile(accessToken: string, openId: string): Promise<TikTokProfile> {
    try {
      const response = await fetch(USER_INFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
      });
      const body = await response.json() as { data?: { user?: { open_id?: string; avatar_url?: string; display_name?: string } } };
      const user = body.data?.user;
      return {
        openId: safeMessage(user?.open_id, openId),
        displayName: safeMessage(user?.display_name, 'TikTok kullanıcısı'),
        avatarUrl: safeMessage(user?.avatar_url, ''),
      };
    } catch {
      return { openId, displayName: 'TikTok kullanıcısı', avatarUrl: '' };
    }
  }

  async function callback(params: URLSearchParams) {
    cleanupPending();
    const state = params.get('state') ?? '';
    const item = pending.get(state);
    if (item) pending.delete(state);
    if (!state || !item || Date.now() - item.createdAt > PENDING_TTL_MS) {
      lastError = 'TikTok dönüş doğrulaması başarısız oldu veya istek süresi doldu.';
      throw new Error(lastError);
    }
    const providerError = params.get('error');
    if (providerError) {
      lastError = safeMessage(params.get('error_description'), providerError);
      throw new Error(lastError);
    }
    const code = params.get('code');
    if (!code) {
      lastError = 'TikTok yetkilendirme kodu döndürmedi.';
      throw new Error(lastError);
    }
    const response = await fetch(tokenBrokerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: item.verifier, redirect_uri: redirectUri }),
      signal: AbortSignal.timeout(15_000),
    });
    const token = await response.json() as TokenResponse;
    if (!response.ok || !token.access_token) {
      lastError = safeMessage(token.error_description ?? token.error, 'TikTok token değişimi başarısız oldu.');
      throw new Error(lastError);
    }
    const now = Date.now();
    const profile = await readProfile(token.access_token, safeMessage(token.open_id, ''));
    session = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? '',
      expiresAt: now + Math.max(60, Number(token.expires_in) || 86_400) * 1000,
      refreshExpiresAt: now + Math.max(60, Number(token.refresh_expires_in) || 31_536_000) * 1000,
      scope: safeMessage(token.scope, 'user.info.basic'),
      profile,
    };
    lastError = '';
    return status();
  }

  async function disconnect() {
    const accessToken = session?.accessToken;
    session = null;
    lastError = '';
    if (!accessToken) return status();
    try {
      await fetch(revokeBrokerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // Yerel oturum yine de temizlenir; uzaktaki izin kullanıcı tarafından TikTok'tan kaldırılabilir.
    }
    return status();
  }

  return { begin, callback, disconnect, status };
}

export type TikTokAuth = ReturnType<typeof createTikTokAuth>;
