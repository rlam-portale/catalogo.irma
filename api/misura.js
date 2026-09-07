// Stima AI delle dimensioni di un oggetto da una fotografia (Claude vision).
// La chiave resta nelle env di Vercel (ANTHROPIC_API_KEY).
// È una STIMA: più affidabile se in foto c'è un riferimento di scala noto.
export const config = { maxDuration: 120 };

export default async function handler(req, res) {
  const pw = req.headers['x-app-password'] || '';
  if (!process.env.APP_PASSWORD || pw !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: { message: 'Password non valida o assente.' } });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: { message: 'Config server mancante (ANTHROPIC_API_KEY).' } });

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { image, mime, tipo, titolo, campi } = b;
  if (!image) return res.status(400).json({ error: { message: 'Immagine mancante.' } });
  const mt = /^image\/(jpeg|png|gif|webp)$/.test(mime || '') ? mime : 'image/jpeg';
  const listaCampi = (Array.isArray(campi) ? campi : []).map(c => `- "${c.k}" (${c.l}) in ${c.unit || 'cm'}`).join('\n')
    || '- "Altezza cm" (cm)\n- "Larghezza cm" (cm)';

  const system = `Sei un perito esperto di antiquariato. Stima le DIMENSIONI reali dell'oggetto principale nella fotografia.
Regole:
1. Se nella foto è presente un RIFERIMENTO di scala noto, usalo per stimare con più precisione e dichiaralo. Riferimenti comuni: righello/metro; moneta da 1€ (23,25 mm) o 2€ (25,75 mm); carta di credito (85,6 × 54 mm); foglio A4 (210 × 297 mm); mano adulta (~18–19 cm).
2. Se NON c'è un riferimento, stima dalle proporzioni tipiche di quel tipo di oggetto e ABBASSA la confidenza; non fingere precisione.
3. Non inventare: se una dimensione non è valutabile, ometti quel campo.
4. Compila SOLO i campi elencati, con NUMERI nell'unità indicata per ciascun campo (di norma cm; per la numismatica mm).

Rispondi ESCLUSIVAMENTE con un JSON valido, senza testo attorno:
{"misure":{"<nome campo>": <numero>, ...},"riferimento":"cosa hai usato come scala, o 'nessuno'","confidenza":"alta|media|bassa","note":"1-2 frasi"}`;

  const userText = `Oggetto: ${tipo || 'oggetto'}${titolo ? ' — ' + titolo : ''}.
Campi da stimare (usa ESATTAMENTE questi nomi come chiavi, valori numerici nell'unità indicata):
${listaCampi}`;

  const payload = {
    model: process.env.AI_MODEL || 'claude-sonnet-5',
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: [
      { type: 'text', text: userText },
      { type: 'image', source: { type: 'base64', media_type: mt, data: image } }
    ] }]
  };

  try {
    const RETRY = new Set([429, 500, 503, 529]);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let r, j, tent = 0;
    while (true) {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(payload)
      });
      j = await r.json();
      if (r.ok || !RETRY.has(r.status) || tent >= 3) break;
      tent++; await sleep(1500 * tent);
    }
    if (!r.ok) return res.status(r.status).json({ error: { message: (j.error && j.error.message) || ('Errore AI ' + r.status) } });
    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    const m = text.match(/\{[\s\S]*\}/);
    let parsed = null; if (m) { try { parsed = JSON.parse(m[0]); } catch (e) {} }
    if (!parsed) return res.status(502).json({ error: { message: 'Risposta AI non interpretabile.' } });
    res.status(200).json({ result: parsed });
  } catch (e) {
    res.status(502).json({ error: { message: 'AI irraggiungibile: ' + e.message } });
  }
}
