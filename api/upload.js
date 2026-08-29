// Caricamento allegati: dal 29 agosto 2026 i file finiscono nello storage
// Supabase (bucket privato `catalogo`) e vengono registrati nella tabella
// `allegati`. Il client continua a inviare { recordId, field, contentType,
// file(base64), filename } come faceva con Airtable.
import { caricaAllegato } from './_supabase.js';

// Il client manda il nome della TABELLA? No: storicamente solo record+campo.
// Il campo pero' basta a risalire alla tabella: i nomi campo allegato sono
// univoci per la coppia (tabella, campo) e il record id e' globale, quindi
// la tabella la deduciamo cercando il record. Per evitare quel giro, il
// client ora puo' anche mandare `table`; se manca, si prova l'elenco delle
// tabelle che hanno quel campo allegato.
import { TABELLE, norm } from './_mappa.js';

async function tabellaDelRecord(recordId, campoNome) {
  const candidate = Object.entries(TABELLE)
    .filter(([, t]) => t.attachments.includes(campoNome))
    .map(([nome]) => nome);
  if (candidate.length === 1) return candidate[0];
  // piu' tabelle hanno questo campo: cerco il record per airtable_id
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  for (const nome of candidate) {
    const r = await fetch(
      `${url}/rest/v1/${norm(nome)}?select=airtable_id&airtable_id=eq.${encodeURIComponent(recordId)}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, 'Accept-Profile': 'catalogo' } }
    );
    if (r.ok && (await r.json()).length > 0) return nome;
  }
  throw new Error(`Record ${recordId} non trovato in nessuna tabella con campo ${campoNome}`);
}

export default async function handler(req, res) {
  const pw = req.headers['x-app-password'] || '';
  if (!process.env.APP_PASSWORD || pw !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: { type: 'AUTH', message: 'Password non valida o assente.' } });
  }
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { recordId, field, contentType, file, filename, table } = b;
  if (!recordId || !field || !file) {
    return res.status(400).json({ error: { message: 'Parametri mancanti (recordId / field / file).' } });
  }
  try {
    const tabellaNome = table || (await tabellaDelRecord(recordId, field));
    await caricaAllegato({
      tabellaNome,
      recordId,
      campoNome: field,
      contentType,
      base64: file,
      filename,
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: { message: e.message } });
  }
}
