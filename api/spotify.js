// Proxy Spotify: Client ID/Secret restano nelle env di Vercel (SPOTIFY_CLIENT_ID,
// SPOTIFY_CLIENT_SECRET). Flusso "Client Credentials": solo ricerca del catalogo
// pubblico, nessun login utente. Il client chiama /api/spotify?q=<query>&type=album.
let _tok = { value: '', exp: 0 };

async function getToken() {
  const now = Date.now();
  if (_tok.value && now < _tok.exp) return _tok.value;
  const id = process.env.SPOTIFY_CLIENT_ID, secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error('Credenziali Spotify assenti sul server (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET).');
  const basic = Buffer.from(id + ':' + secret).toString('base64');
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('Token Spotify non ottenuto: ' + (j.error_description || j.error || r.status));
  _tok = { value: j.access_token, exp: now + Math.max(30, (j.expires_in || 3600) - 60) * 1000 };
  return _tok.value;
}

export default async function handler(req, res) {
  const pw = req.headers['x-app-password'] || '';
  if (!process.env.APP_PASSWORD || pw !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: { message: 'Password non valida o assente.' } });
  }
  const q = (req.query.q || '').toString().trim();
  const type = (req.query.type || 'album').toString();
  const market = (req.query.market || 'IT').toString();
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 8));
  if (!q) return res.status(400).json({ error: { message: 'Parametro "q" mancante.' } });
  try {
    const token = await getToken();
    const url = 'https://api.spotify.com/v1/search'
      + '?type=' + encodeURIComponent(type)
      + '&limit=' + limit
      + '&market=' + encodeURIComponent(market)
      + '&q=' + encodeURIComponent(q);
    const r = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
    const text = await r.text();
    res.status(r.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: { message: 'Spotify irraggiungibile: ' + e.message } });
  }
}
