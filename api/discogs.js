// Proxy Discogs: il token Discogs resta nelle env di Vercel.
// Il client chiama /api/discogs?p=<percorso Discogs già codificato>.
export default async function handler(req, res) {
  const pw = req.headers['x-app-password'] || '';
  if (!process.env.APP_PASSWORD || pw !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: { message: 'Password non valida o assente.' } });
  }
  const token = process.env.DISCOGS_TOKEN;
  const p = req.query.p;
  if (!p) return res.status(400).json({ error: { message: 'Parametro "p" mancante.' } });

  let url = 'https://api.discogs.com/' + p;
  if (token) url += (p.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'CatalogoDajlaniArezzo/1.0 +https://catalogo.rlam.site' } });
    const text = await r.text();
    res.status(r.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: { message: 'Discogs irraggiungibile: ' + e.message } });
  }
}
