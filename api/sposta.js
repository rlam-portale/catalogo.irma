// Sposta un pezzo da una sezione (tabella) a un'altra dentro lo schema `catalogo`.
// 1) crea il record nella tabella di destinazione (con i campi già mappati dal client);
// 2) ri-punta gli allegati (tabella + record_id) al nuovo record: i file restano
//    nello storage, non si ricaricano;
// 3) elimina il record di origine (ponti e righe residue).
import { creaRecord, eliminaRecord, leggiRecords } from './_supabase.js';
import { norm, tabella } from './_mappa.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const pw = req.headers['x-app-password'] || '';
  if (!process.env.APP_PASSWORD || pw !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: { message: 'Password non valida o assente.' } });
  }
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { fromTable, recordId, toTable, data } = b;
  if (!fromTable || !recordId || !toTable || !data) {
    return res.status(400).json({ error: { message: 'Parametri mancanti (fromTable / recordId / toTable / data).' } });
  }
  try {
    tabella(fromTable); tabella(toTable);   // esistono nella mappa? (lancia se no)
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_KEY;
    if (!url || !key) throw new Error('Config server mancante (SUPABASE_URL / SUPABASE_KEY).');

    // 1) nuovo record nella destinazione
    const nuovo = await creaRecord(toTable, data);

    // 2) sposta gli allegati (ri-punta tabella + record_id; storage_path invariato)
    const fromCol = norm(fromTable), toCol = norm(toTable);
    const rp = await fetch(
      `${url}/rest/v1/allegati?tabella=eq.${encodeURIComponent(fromCol)}&record_id=eq.${encodeURIComponent(recordId)}`,
      { method: 'PATCH',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
          'Accept-Profile': 'catalogo', 'Content-Profile': 'catalogo', Prefer: 'return=minimal' },
        body: JSON.stringify({ tabella: toCol, record_id: nuovo.id }) }
    );
    if (!rp.ok) throw new Error('Spostamento allegati non riuscito (' + rp.status + '): ' + (await rp.text()).slice(0, 200));

    // 3) elimina l'originale (gli allegati sono già stati ri-puntati, quindi non vengono cancellati)
    await eliminaRecord(fromTable, recordId);

    const [rec] = await leggiRecords(toTable, nuovo.id);
    res.status(200).json({ record: rec || nuovo });
  } catch (e) {
    res.status(502).json({ error: { message: e.message } });
  }
}
