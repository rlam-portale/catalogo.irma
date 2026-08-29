# Catalogo Dajlani — deploy su Vercel

L'app è una pagina statica (`index.html`) + funzioni serverless in `/api`.
Da agosto 2026 i dati non stanno più su Airtable ma su **Supabase**
(PostgreSQL, schema `catalogo` + storage `catalogo` per foto e documenti);
le funzioni `/api/airtable` e `/api/upload` mantengono il vecchio formato
di risposta, così la pagina non è cambiata. Le chiavi restano nelle
variabili d'ambiente di Vercel: nel browser c'è solo una **password
condivisa**.

Così il catalogo è raggiungibile da qualsiasi PC: si apre l'URL, si digita la
password una volta (viene ricordata sul dispositivo) e funziona.

## 1. Importare il repo su Vercel
1. Vai su https://vercel.com → **Add New… → Project**.
2. Importa il repository GitHub `rlam-portale/catalogo.irma`.
3. Framework preset: **Other** (nessun build; è tutto statico + funzioni `/api`).
4. Deploy.

## 2. Variabili d'ambiente (Project → Settings → Environment Variables)
| Nome | Valore |
|------|--------|
| `SUPABASE_URL` | `https://eioslyhjwctwnfmiaapr.supabase.co` (progetto "Db Paolo") |
| `SUPABASE_KEY` | la chiave *service role* del progetto Supabase (Settings → API) |
| `DISCOGS_TOKEN`  | token Discogs (facoltativo, migliora il riconoscimento dischi) |
| `APP_PASSWORD`   | la password condivisa che digiterai in famiglia |
| `ANTHROPIC_API_KEY` | chiave API Anthropic — serve alla catalogazione assistita dall'AI (quadri). Creala su https://console.anthropic.com |
| `AI_MODEL` | facoltativo. Default `claude-sonnet-5`; per la massima qualità metti `claude-opus-4-8` |

Dopo averle inserite fai **Redeploy** (le env si applicano al deploy successivo).

## 3. Dominio (facoltativo)
In Project → Settings → Domains puoi aggiungere es. `catalogo.rlam.site`.

## Note
- La vecchia pubblicazione su **GitHub Pages** non serve più (lì le `/api` non
  funzionano): usa l'URL Vercel.
- Se cambi la password, aggiorna `APP_PASSWORD` su Vercel e reinseriscila sui PC.
- I token esposti in passato andrebbero rigenerati su Airtable/Discogs prima di
  incollarli qui.
