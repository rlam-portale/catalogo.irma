// Upscaling fedele di un'immagine con Real-ESRGAN su Replicate.
// La chiave resta nelle env di Vercel (REPLICATE_API_TOKEN).
// Riceve un'immagine (base64) + i riferimenti del record; ingrandisce, poi
// CARICA il risultato direttamente come nuovo allegato su Supabase (così
// l'immagine grande non deve tornare al browser). Restituisce solo l'esito.
import { caricaAllegato } from './_supabase.js';

export const config = { maxDuration: 300 };

const MODEL = process.env.REPLICATE_UPSCALE_MODEL || 'nightmareai/real-esrgan';

export default async function handler(req, res) {
  const pw = req.headers['x-app-password'] || '';
  if (!process.env.APP_PASSWORD || pw !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: { message: 'Password non valida o assente.' } });
  }
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return res.status(500).json({ error: { message: 'Config server mancante (REPLICATE_API_TOKEN).' } });

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { image, mime, scale, tabella, recordId, campo, filename } = b;
  if (!image) return res.status(400).json({ error: { message: 'Immagine mancante.' } });
  if (!tabella || !recordId || !campo) return res.status(400).json({ error: { message: 'Riferimenti record mancanti.' } });
  const mt = /^image\/(jpeg|png|webp)$/.test(mime || '') ? mime : 'image/png';
  const sc = Math.min(4, Math.max(2, parseInt(scale, 10) || 4));
  const dataUri = `data:${mt};base64,${image}`;

  try {
    // 1) crea la predizione, attendendo fino a 60s (Prefer: wait); poi eventuale polling
    let r = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'wait' },
      body: JSON.stringify({ input: { image: dataUri, scale: sc, face_enhance: false } })
    });
    let j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: { message: j.detail || j.title || ('Errore Replicate ' + r.status) } });

    const getUrl = j.urls && j.urls.get;
    const sleep = ms => new Promise(x => setTimeout(x, ms));
    let tent = 0;
    while (j.status && !['succeeded', 'failed', 'canceled'].includes(j.status) && getUrl && tent < 90) {
      await sleep(2000); tent++;
      const g = await fetch(getUrl, { headers: { 'Authorization': 'Bearer ' + token } });
      j = await g.json().catch(() => ({}));
    }
    if (j.status !== 'succeeded') {
      return res.status(502).json({ error: { message: 'Upscaling non riuscito' + (j.error ? ': ' + j.error : (j.status ? ' (' + j.status + ')' : '.')) } });
    }
    const out = Array.isArray(j.output) ? j.output[0] : j.output;
    if (!out) return res.status(502).json({ error: { message: 'Nessuna immagine dall\'upscaler.' } });

    // 2) scarica il risultato ingrandito
    const ir = await fetch(out);
    if (!ir.ok) return res.status(502).json({ error: { message: 'Download risultato upscaler (' + ir.status + ')' } });
    const ab = await ir.arrayBuffer();
    const omt = (ir.headers.get('content-type') || 'image/png').split(';')[0].trim();
    const base64 = Buffer.from(ab).toString('base64');

    // 3) carica come nuovo allegato sul record
    const ext = /png/i.test(omt) ? 'png' : (/webp/i.test(omt) ? 'webp' : 'jpg');
    const fn = filename || `ambientazione-hd-${recordId}-${Date.now()}.${ext}`;
    await caricaAllegato({ tabellaNome: tabella, recordId, campoNome: campo, contentType: omt, base64, filename: fn });

    res.status(200).json({ ok: true, filename: fn, scale: sc });
  } catch (e) {
    res.status(502).json({ error: { message: 'Upscaler irraggiungibile: ' + e.message } });
  }
}
