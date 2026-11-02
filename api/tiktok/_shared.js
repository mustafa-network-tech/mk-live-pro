const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:4173/auth/tiktok/callback';

export function prepare(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

export function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

export function credentials() {
  return {
    clientKey: String(process.env.TIKTOK_CLIENT_KEY || '').trim(),
    clientSecret: String(process.env.TIKTOK_CLIENT_SECRET || '').trim(),
    redirectUri: String(process.env.TIKTOK_REDIRECT_URI || DEFAULT_REDIRECT_URI).trim(),
  };
}

export function validCode(value) {
  return typeof value === 'string' && value.length >= 10 && value.length <= 2048;
}

export function validVerifier(value) {
  return typeof value === 'string' && value.length >= 43 && value.length <= 128 && /^[A-Za-z0-9._~-]+$/.test(value);
}

export async function tiktokForm(endpoint, values) {
  const body = new URLSearchParams(values);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json().catch(() => ({ error: 'invalid_tiktok_response' }));
  return { response, data };
}
