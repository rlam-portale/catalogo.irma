// Dal 29 agosto 2026 i dati non stanno più su Airtable ma su Supabase
// (PostgreSQL, schema `catalogo`). Questa funzione risponde però nello
// STESSO formato di prima, così la pagina non ha dovuto cambiare:
// il client continua a chiamare /api/airtable?p=<percorso stile Airtable>
// con l'header x-app-password, e riceve record { id, fields }.
import {
  leggiRecords,
  creaRecord,
  aggiornaRecord,
  eliminaRecord,
} from './_supabase.js';

function confronta(a, b) {
  const av = a === undefined || a === null || a === '';
  const bv = b === undefined || b === null || b === '';
  if (av && bv) return 0;
  if (av) return 1;
  if (bv) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'it', { sensitivity: 'base' });
}

export default async function handler(req, res) {
  const pw = req.headers['x-app-password'] || '';
  if (!process.env.APP_PASSWORD || pw !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: { type: 'AUTH', message: 'Password non valida o assente.' } });
  }
  const p = req.query.p;
  if (!p) return res.status(400).json({ error: { message: 'Parametro "p" mancante.' } });

  const qIdx = p.indexOf('?');
  const pathPart = qIdx === -1 ? p : p.slice(0, qIdx);
  const query = new URLSearchParams(qIdx === -1 ? '' : p.slice(qIdx + 1));
  const [tabEnc, recId] = pathPart.split('/');
  const tabellaNome = decodeURIComponent(tabEnc);

  try {
    if (req.method === 'GET' && recId) {
      const [rec] = await leggiRecords(tabellaNome, recId);
      if (!rec) return res.status(404).json({ error: { message: 'Record non trovato' } });
      return res.status(200).json(rec);
    }

    if (req.method === 'GET') {
      let records = await leggiRecords(tabellaNome);
      const sortField = query.get('sort[0][field]');
      if (sortField) {
        const dir = query.get('sort[0][direction]') === 'desc' ? -1 : 1;
        records.sort((a, b) => confronta(a.fields[sortField], b.fields[sortField]) * dir);
      }
      // Niente paginazione: si risponde tutto in una volta (i volumi sono
      // piccoli) e non si emette `offset`, così il ciclo del client termina.
      // `pageSize` indica solo la dimensione di pagina, NON un tetto totale:
      // va ignorato, altrimenti le tabelle oltre i 100 record si troncano.
      const maxRecords = Number(query.get('maxRecords'));
      if (Number.isFinite(maxRecords) && maxRecords > 0) {
        records = records.slice(0, maxRecords);
      }
      const soloCampi = query.getAll('fields[]');
      if (soloCampi.length) {
        records = records.map((r) => ({
          ...r,
          fields: Object.fromEntries(
            Object.entries(r.fields).filter(([k]) => soloCampi.includes(k))
          ),
        }));
      }
      return res.status(200).json({ records });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    if (req.method === 'POST') {
      if (Array.isArray(body.records)) {
        const out = [];
        for (const r of body.records) out.push(await creaRecord(tabellaNome, r.fields || {}));
        return res.status(200).json({ records: out });
      }
      const rec = await creaRecord(tabellaNome, body.fields || {});
      return res.status(200).json(rec);
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      if (!recId) return res.status(400).json({ error: { message: 'Id record mancante' } });
      const rec = await aggiornaRecord(tabellaNome, recId, body.fields || {});
      return res.status(200).json(rec);
    }

    if (req.method === 'DELETE') {
      if (!recId) return res.status(400).json({ error: { message: 'Id record mancante' } });
      await eliminaRecord(tabellaNome, recId);
      return res.status(200).json({ deleted: true, id: recId });
    }

    return res.status(405).json({ error: { message: `Metodo non gestito: ${req.method}` } });
  } catch (e) {
    return res.status(502).json({ error: { message: e.message } });
  }
}
