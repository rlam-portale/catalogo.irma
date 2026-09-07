// Editing immagini con Google Gemini 2.5 Flash Image ("nano banana").
// La chiave resta nelle env di Vercel (GEMINI_API_KEY).
// Il client invia una foto (base64) e una modalità; riceve l'immagine modificata.
// Modalità: "scontorno" (oggetto su fondo bianco) | "ambientazione" (set fotografico da studio).
export const config = { maxDuration: 120 };

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

function istruzione(mode, ctx) {
  const fedelta = `Stai ritoccando la fotografia di un oggetto per un catalogo d'arte e antiquariato.
REGOLA FONDAMENTALE: mantieni l'oggetto ESATTAMENTE com'è — identici forma, proporzioni, materiali, colori, patina, usura e ogni dettaglio. Non aggiungere, togliere, "abbellire" o inventare nulla sull'oggetto. Modifica SOLO lo sfondo/ambientazione.`;
  const info = [ctx && ctx.tipo ? `L'oggetto è: ${ctx.tipo}.` : '', ctx && ctx.titolo ? `Titolo/denominazione: ${ctx.titolo}.` : '']
    .filter(Boolean).join(' ');
  const extra = ctx && ctx.hint ? ` Indicazioni di stile aggiuntive: ${ctx.hint}.` : '';
  const azione = mode === 'scontorno'
    ? `Rimuovi completamente lo sfondo e colloca l'oggetto su uno sfondo bianco puro e uniforme, con una leggera ombra di contatto naturale sotto l'oggetto. Inquadratura pulita e centrata.`
    : `Sostituisci lo sfondo con un'ambientazione professionale da studio di product photography: fondale continuo (seamless) grigio-caldo neutro con una morbida sfumatura, luce principale morbida e direzionale, e un'ombra/riflesso realistici e delicati sotto l'oggetto. Risultato fotorealistico, ben esposto, con l'oggetto centrato che riempie naturalmente l'inquadratura.`;
  return `${fedelta}\n${info}\n\n${azione}${extra}\n\nRestituisci SOLO la fotografia modificata, senza testo.`;
}

export default async function handler(req, res) {
  const pw = req.headers['x-app-password'] || '';
  if (!process.env.APP_PASSWORD || pw !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: { message: 'Password non valida o assente.' } });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: { message: 'Config server mancante (GEMINI_API_KEY).' } });

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { image, mode, mime, tipo, titolo, hint } = b;
  if (!image) return res.status(400).json({ error: { message: 'Immagine mancante.' } });
  const m = mode === 'scontorno' ? 'scontorno' : 'ambientazione';
  const mt = /^image\/(jpeg|png|webp)$/.test(mime || '') ? mime : 'image/jpeg';

  const payload = {
    contents: [{ parts: [
      { text: istruzione(m, { tipo, titolo, hint }) },
      { inline_data: { mime_type: mt, data: image } }
    ] }],
    generationConfig: { responseModalities: ['IMAGE'] }
  };

  try {
    const RETRY = new Set([429, 500, 503]);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let r, j, tent = 0;
    while (true) {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(payload)
      });
      j = await r.json().catch(() => ({}));
      if (r.ok || !RETRY.has(r.status) || tent >= 2) break;
      tent++;
      await sleep(1500 * tent);
    }
    if (!r.ok) {
      const msg = (j.error && (j.error.message || j.error.status)) || ('Errore Gemini ' + r.status);
      return res.status(r.status).json({ error: { message: msg } });
    }
    const cand = (j.candidates || [])[0];
    const parts = (cand && cand.content && cand.content.parts) || [];
    const imgPart = parts.find(p => p.inlineData || p.inline_data);
    if (!imgPart) {
      const txt = parts.filter(p => p.text).map(p => p.text).join(' ').trim();
      const blocked = (j.promptFeedback && j.promptFeedback.blockReason) || (cand && cand.finishReason);
      return res.status(502).json({ error: { message: 'Nessuna immagine restituita' + (blocked ? ' (' + blocked + ')' : '') + (txt ? ': ' + txt.slice(0, 300) : '.') } });
    }
    const inl = imgPart.inlineData || imgPart.inline_data;
    res.status(200).json({ image: inl.data, mime: inl.mimeType || inl.mime_type || 'image/png' });
  } catch (e) {
    res.status(502).json({ error: { message: 'Gemini irraggiungibile: ' + e.message } });
  }
}
