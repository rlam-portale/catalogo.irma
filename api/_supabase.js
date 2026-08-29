// Accesso a Supabase (schema `catalogo`) per le funzioni /api.
// Espone letture e scritture nel FORMATO che l'interfaccia si aspetta
// (quello storico di Airtable): record { id, createdTime, fields } con i
// nomi campo originali, collegamenti come array di id `rec...`, allegati
// come array { id, url, filename, size, type, thumbnails? } con URL
// firmati validi un'ora.
import { SCHEMA, BUCKET, TABELLE, tabella, norm } from './_mappa.js';

const SCADENZA_URL = 3600;

function cfg() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error('Config server mancante (SUPABASE_URL / SUPABASE_KEY).');
  }
  return { url, key };
}

async function rest(path, { method = 'GET', body, headers = {} } = {}) {
  const { url, key } = cfg();
  const h = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Accept-Profile': SCHEMA,
    'Content-Profile': SCHEMA,
    ...headers,
  };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const r = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const txt = await r.text();
  if (!r.ok) {
    throw new Error(`Database (${r.status}): ${txt.slice(0, 300)}`);
  }
  return txt ? JSON.parse(txt) : null;
}

/* ---------- allegati ---------- */

async function firmaUrls(paths) {
  if (paths.length === 0) return new Map();
  const { url, key } = cfg();
  const r = await fetch(`${url}/storage/v1/object/sign/${BUCKET}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: SCADENZA_URL, paths }),
  });
  if (!r.ok) throw new Error(`Firma URL allegati (${r.status})`);
  const list = await r.json();
  const out = new Map();
  for (const item of list) {
    if (item.signedURL) {
      out.set(item.path, `${url}/storage/v1${item.signedURL}`);
    }
  }
  return out;
}

function toAttachment(row, url) {
  const att = {
    id: String(row.id),
    url,
    filename: row.nome_file,
    size: row.byte ?? 0,
    type: row.mime ?? 'application/octet-stream',
  };
  if ((row.mime ?? '').startsWith('image/')) {
    const t = { url, width: 0, height: 0 };
    att.thumbnails = { small: t, large: t, full: t };
  }
  return att;
}

/** record_id -> campo(colonna) -> [allegati] */
async function leggiAllegati(tabCol, recordIds) {
  let q = `allegati?select=*&tabella=eq.${encodeURIComponent(tabCol)}&order=posizione.asc`;
  if (recordIds && recordIds.length === 1) {
    q += `&record_id=eq.${encodeURIComponent(recordIds[0])}`;
  }
  const rows = await rest(q);
  const paths = rows.map((r) => r.storage_path);
  const urls = await firmaUrls(paths);
  const out = new Map();
  for (const row of rows) {
    const u = urls.get(row.storage_path);
    if (!u) continue;
    let per = out.get(row.record_id);
    if (!per) { per = new Map(); out.set(row.record_id, per); }
    const arr = per.get(row.campo) ?? [];
    arr.push(toAttachment(row, u));
    per.set(row.campo, arr);
  }
  return out;
}

export async function caricaAllegato({ tabellaNome, recordId, campoNome, contentType, base64, filename }) {
  const { url, key } = cfg();
  const tabCol = norm(tabellaNome);
  const campoCol = norm(campoNome);
  const sicuro = String(filename || 'file').replace(/[^\w.\-]+/g, '_').slice(0, 120) || 'file';
  const path = `${tabCol}/${recordId}/${Date.now()}_${sicuro}`;
  const buf = Buffer.from(base64, 'base64');
  const up = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': contentType || 'application/octet-stream',
    },
    body: buf,
  });
  if (!up.ok) throw new Error(`Caricamento file (${up.status}): ${(await up.text()).slice(0, 200)}`);

  const esistenti = await rest(
    `allegati?select=posizione&tabella=eq.${encodeURIComponent(tabCol)}&campo=eq.${encodeURIComponent(campoCol)}&record_id=eq.${encodeURIComponent(recordId)}&order=posizione.desc&limit=1`
  );
  const posizione = esistenti.length ? (esistenti[0].posizione ?? 0) + 1 : 0;
  await rest('allegati', {
    method: 'POST',
    body: {
      tabella: tabCol,
      campo: campoCol,
      record_id: recordId,
      nome_file: filename || 'file',
      storage_path: path,
      mime: contentType || 'application/octet-stream',
      byte: buf.byteLength,
      posizione,
    },
    headers: { Prefer: 'return=minimal' },
  });
}

/* ---------- lettura record ---------- */

async function leggiPonte(bridge, role, soloId) {
  const mia = role === 'src' ? 'src' : 'dst';
  const altra = role === 'src' ? 'dst' : 'src';
  let q = `${bridge}?select=src,dst`;
  if (soloId) q += `&${mia}=eq.${encodeURIComponent(soloId)}`;
  const rows = await rest(q);
  const out = new Map();
  for (const r of rows) {
    const arr = out.get(r[mia]) ?? [];
    arr.push(r[altra]);
    out.set(r[mia], arr);
  }
  return out;
}

function vuoto(v) {
  return v === null || v === undefined || v === '' || v === false ||
    (Array.isArray(v) && v.length === 0);
}

export async function leggiRecords(tabellaNome, soloId) {
  const t = tabella(tabellaNome);
  const tabCol = norm(tabellaNome);
  let q = `${tabCol}?select=*`;
  if (soloId) q += `&airtable_id=eq.${encodeURIComponent(soloId)}`;
  const [rows, allegati, ...ponti] = await Promise.all([
    rest(q),
    t.attachments.length
      ? leggiAllegati(tabCol, soloId ? [soloId] : undefined)
      : Promise.resolve(new Map()),
    ...Object.values(t.links).map((l) => leggiPonte(l.bridge, l.role, soloId)),
  ]);
  const nomiLink = Object.keys(t.links);
  return rows.map((row) => {
    const id = row.airtable_id;
    const fields = {};
    for (const f of t.fields) {
      const v = row[norm(f)];
      if (!vuoto(v)) fields[f] = v;
    }
    nomiLink.forEach((nome, i) => {
      const ids = ponti[i].get(id);
      if (ids && ids.length) fields[nome] = ids;
    });
    const per = allegati.get(id);
    if (per) {
      for (const f of t.attachments) {
        const arr = per.get(norm(f));
        if (arr && arr.length) fields[f] = arr;
      }
    }
    return { id, createdTime: row.creato_il ?? undefined, fields };
  });
}

/* ---------- scrittura ---------- */

function nuovoRecId() {
  const alf = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let s = 'rec';
  for (let i = 0; i < 14; i++) s += alf[Math.floor(Math.random() * alf.length)];
  return s;
}

function dividi(tabellaNome, fields) {
  const t = tabella(tabellaNome);
  const scalari = {};
  const link = [];
  const allegati = [];
  for (const [nome, valore] of Object.entries(fields || {})) {
    if (valore === undefined) continue;
    if (nome in t.links) {
      link.push({ info: t.links[nome], ids: valore === null ? [] : valore });
    } else if (t.attachments.includes(nome)) {
      allegati.push({ campo: norm(nome), valore: valore === null ? [] : valore });
    } else if (t.fields.includes(nome)) {
      scalari[norm(nome)] = valore;
    } else {
      throw new Error(`Campo sconosciuto per ${tabellaNome}: ${nome}`);
    }
  }
  return { scalari, link, allegati };
}

async function scriviLink(recordId, { info, ids }) {
  const mia = info.role === 'src' ? 'src' : 'dst';
  const altra = info.role === 'src' ? 'dst' : 'src';
  await rest(`${info.bridge}?${mia}=eq.${encodeURIComponent(recordId)}`, { method: 'DELETE' });
  if (ids.length) {
    await rest(info.bridge, {
      method: 'POST',
      body: ids.map((x) => ({ [mia]: recordId, [altra]: x })),
      headers: { Prefer: 'return=minimal' },
    });
  }
}

/** Allinea gli allegati di un campo all'elenco di id passato (rimozioni). */
async function sincronizzaAllegati(tabCol, recordId, campoCol, valore) {
  const rows = await rest(
    `allegati?select=id&tabella=eq.${encodeURIComponent(tabCol)}&campo=eq.${encodeURIComponent(campoCol)}&record_id=eq.${encodeURIComponent(recordId)}`
  );
  const daTenere = new Set((valore || []).filter((v) => v.id).map((v) => String(v.id)));
  const daEliminare = rows.map((r) => String(r.id)).filter((id) => !daTenere.has(id));
  if (daEliminare.length) {
    await rest(`allegati?id=in.(${daEliminare.join(',')})`, { method: 'DELETE' });
  }
}

export async function creaRecord(tabellaNome, fields) {
  const { scalari, link, allegati } = dividi(tabellaNome, fields);
  const id = nuovoRecId();
  await rest(norm(tabellaNome), {
    method: 'POST',
    body: { airtable_id: id, ...scalari },
    headers: { Prefer: 'return=minimal' },
  });
  for (const l of link) await scriviLink(id, l);
  for (const a of allegati) {
    await sincronizzaAllegati(norm(tabellaNome), id, a.campo, a.valore);
  }
  const [rec] = await leggiRecords(tabellaNome, id);
  return rec;
}

export async function aggiornaRecord(tabellaNome, id, fields) {
  const { scalari, link, allegati } = dividi(tabellaNome, fields);
  if (Object.keys(scalari).length) {
    await rest(`${norm(tabellaNome)}?airtable_id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: scalari,
      headers: { Prefer: 'return=minimal' },
    });
  }
  for (const l of link) await scriviLink(id, l);
  for (const a of allegati) {
    await sincronizzaAllegati(norm(tabellaNome), id, a.campo, a.valore);
  }
  const [rec] = await leggiRecords(tabellaNome, id);
  if (!rec) throw new Error(`Record non trovato: ${tabellaNome}/${id}`);
  return rec;
}

export async function eliminaRecord(tabellaNome, id) {
  const t = tabella(tabellaNome);
  for (const info of Object.values(t.links)) {
    const mia = info.role === 'src' ? 'src' : 'dst';
    await rest(`${info.bridge}?${mia}=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
  if (t.attachments.length) {
    await rest(
      `allegati?tabella=eq.${encodeURIComponent(norm(tabellaNome))}&record_id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
  }
  await rest(`${norm(tabellaNome)}?airtable_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}
