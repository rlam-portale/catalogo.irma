// Proxy Airtable: il token resta nelle env di Vercel, mai nel browser.
// Il client chiama /api/airtable?p=<percorso Airtable già codificato> con
// l'header x-app-password. Metodo e body vengono inoltrati così come sono.
export default async function handler(req, res) {
  const pw = req.headers['x-app-password'] || '';
  if (!process.env.APP_PASSWORD || pw !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: { type: 'AUTH', message: 'Password non valida o assente.' } });
  }
  const base = process.env.AIRTABLE_BASE;
  const token = process.env.AIRTABLE_TOKEN;
  if (!base || !token) {
    return res.status(500).json({ error: { message: 'Config server mancante (AIRTABLE_BASE / AIRTABLE_TOKEN).' } });
  }
  const p = req.query.p;
  if (!p) return res.status(400).json({ error: { message: 'Parametro "p" mancante.' } });

  const url = `https://api.airtable.com/v0/${base}/${p}`;
  const init = { method: req.method, headers: { Authorization: `Bearer ${token}` } };
  if (!['GET', 'HEAD'].includes(req.method)) {
    init.headers['Content-Type'] = 'application/json';
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  }
  try {
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: { message: 'Airtable irraggiungibile: ' + e.message } });
  }
}
