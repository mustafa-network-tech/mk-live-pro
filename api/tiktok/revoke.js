import { credentials, prepare, readJson, tiktokForm } from './_shared.js';

export default async function handler(req, res) {
  prepare(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const { clientKey, clientSecret } = credentials();
  if (!clientKey || !clientSecret) return res.status(503).json({ error: 'server_not_configured' });
  const token = readJson(req).token;
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) return res.status(400).json({ error: 'invalid_request' });
  try {
    const { response, data } = await tiktokForm('https://open.tiktokapis.com/v2/oauth/revoke/', {
      client_key: clientKey,
      client_secret: clientSecret,
      token,
    });
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch {
    return res.status(502).json({ error: 'tiktok_unavailable' });
  }
}
