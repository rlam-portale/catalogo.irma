// Proxy per gli allegati Airtable (content.airtable.com uploadAttachment).
// Il client invia { recordId, field, contentType, file(base64), filename }.
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
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { recordId, field, contentType, file, filename } = b;
  if (!recordId || !field || !file) {
    return res.status(400).json({ error: { message: 'Parametri mancanti (recordId / field / file).' } });
  }
  const url = `https://content.airtable.com/v0/${base}/${recordId}/${encodeURIComponent(field)}/uploadAttachment`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: contentType || 'application/octet-stream', file, filename: filename || 'file' })
    });
    const text = await r.text();
    res.status(r.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: { message: 'Upload irraggiungibile: ' + e.message } });
  }
}
