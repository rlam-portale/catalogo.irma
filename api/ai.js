// Catalogazione assistita dall'AI (Claude vision + ricerca web).
// Riceve l'immagine dell'opera, indicazioni preliminari e lo schema dei campi;
// fa ricerche sul web e restituisce un JSON con i campi dell'opera + la scheda autore.
export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  const pw = req.headers['x-app-password'] || '';
  if (!process.env.APP_PASSWORD || pw !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: { message: 'Password non valida o assente.' } });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: { message: 'Config server mancante (ANTHROPIC_API_KEY).' } });

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { catLabel, sing, titolo, hints, imageUrl, campi, currentFields, autore } = b;

  // 1) scarica l'immagine (se presente) e convertila in base64 per Claude
  let imgBlock = null;
  if (imageUrl) {
    try {
      const ir = await fetch(imageUrl);
      if (ir.ok) {
        const ab = await ir.arrayBuffer();
        let mt = (ir.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
        if (!/^image\/(jpeg|png|gif|webp)$/.test(mt)) mt = 'image/jpeg';
        imgBlock = { type: 'image', source: { type: 'base64', media_type: mt, data: Buffer.from(ab).toString('base64') } };
      }
    } catch (e) { /* si prosegue senza immagine */ }
  }

  // 2) schema dei campi che l'AI può compilare
  const schema = (campi || []).map(c => {
    const t = c.t || 'text';
    const extra = c.ch ? ` — SCEGLI uno tra: ${c.ch.join(' | ')}` : '';
    return `- "${c.k}" (${c.l}; tipo ${t}${extra})`;
  }).join('\n');

  const correnti = JSON.stringify(currentFields || {}, null, 0);
  const autoreCorr = autore && Object.keys(autore).length ? JSON.stringify(autore, null, 0) : '(nessun autore collegato)';

  const system = `Sei un catalogatore museale esperto di storia dell'arte, antiquariato e mercato dell'arte.
Il tuo compito è schedare un bene (categoria: ${catLabel || 'opera'}) nel modo più completo, accurato e documentato possibile.
Procedi così:
1. Osserva con attenzione l'immagine fornita (soggetto, tecnica, stile, firma/iscrizioni, cornice, stato).
2. Tieni conto delle INDICAZIONI PRELIMINARI dell'utente (ipotesi di attribuzione, provenienza, note): sono spunti, non certezze — valutale criticamente.
3. USA la ricerca web per confermare o approfondire: autore, datazione, soggetto iconografico, opere analoghe, quotazioni di mercato, bibliografia.
4. Compila i campi dello schema. Non inventare: se un dato non è determinabile, ometti il campo. Distingui i fatti dalle ipotesi e segnala il grado di certezza nei testi.
5. Redigi anche una scheda dell'AUTORE (biografia sintetica ma ricca, date, nazionalità) da salvare nell'archivio autori. La biografia può usare Markdown (grassetto, corsivo, elenchi).

Regole di output IMPORTANTI:
- Rispondi ESCLUSIVAMENTE con un unico oggetto JSON valido, senza testo prima o dopo, senza blocchi di codice.
- Nelle chiavi di "opera" usa ESATTAMENTE i nomi di campo dello schema (tra virgolette). Ometti i campi che non sai compilare.
- Per i campi con valori ammessi, usa solo uno di quelli.
- I campi numerici (dimensioni, anno) come numero o stringa numerica.`;

  const userText = `INDICAZIONI PRELIMINARI dell'utente:
${hints || '(nessuna)'}

TITOLO/denominazione provvisoria: ${titolo || '(non indicato)'}

VALORI GIÀ PRESENTI nella scheda (da confermare o completare, non cancellare senza motivo):
${correnti}

AUTORE attualmente collegato:
${autoreCorr}

CAMPI COMPILABILI (schema):
${schema}

Restituisci un JSON con questa forma:
{
  "opera": { "<nome campo>": "<valore>", ... },
  "autore": { "Nome": "...", "Nascita": "...", "Morte": "...", "Nazionalità": "...", "Biografia": "...(anche Markdown)...", "Note": "..." },
  "confidenza": "alta|media|bassa",
  "riepilogo": "2-3 frasi su cosa hai riconosciuto e con quale certezza",
  "fonti": ["url", "url"]
}
Se non riesci a identificare l'autore, lascia "autore" con i soli campi che conosci o vuoto.`;

  const payload = {
    model: process.env.AI_MODEL || 'claude-sonnet-5',
    max_tokens: 4096,
    system,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
    messages: [{ role: 'user', content: [{ type: 'text', text: userText }, ...(imgBlock ? [imgBlock] : [])] }]
  };

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: { message: (j.error && j.error.message) || ('Errore AI ' + r.status) } });

    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    let parsed = null;
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch (e) { /* sotto */ } }
    if (!parsed) return res.status(502).json({ error: { message: 'Risposta AI non interpretabile.' }, raw: text.slice(0, 2000) });
    res.status(200).json({ result: parsed });
  } catch (e) {
    res.status(502).json({ error: { message: 'AI irraggiungibile: ' + e.message } });
  }
}
