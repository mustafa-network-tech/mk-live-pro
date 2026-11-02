import { credentials, prepare, readJson, tiktokForm, validCode, validVerifier } from './_shared.js';

export default async function handler(req, res) {
  prepare(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const { clientKey, clientSecret, redirectUri } = credentials();
  if (!clientKey || !clientSecret) return res.status(503).json({ error: 'server_not_configured' });
  const body = readJson(req);
  if (body.redirect_uri !== redirectUri || !validCode(body.code) || !validVerifier(body.code_verifier)) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  try {
    const { response, data } = await tiktokForm('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: clientKey,
      client_secret: clientSecret,
      code: body.code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: body.code_verifier,
    });
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch {
    return res.status(502).json({ error: 'tiktok_unavailable' });
  }
}
