# Catalogo Dajlani — deploy su Vercel

L'app è ora una pagina statica (`index.html`) + tre funzioni serverless in `/api`
che fanno da **proxy** verso Airtable e Discogs. I token restano nelle variabili
d'ambiente di Vercel: nel browser c'è solo una **password condivisa**.

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
| `AIRTABLE_TOKEN` | Personal Access Token Airtable (scope `data.records:read` + `data.records:write` sulla base) |
| `AIRTABLE_BASE`  | `appI6zidIy0DriyoG` (la base "Biblioteca Personale") |
| `DISCOGS_TOKEN`  | token Discogs (facoltativo, migliora il riconoscimento dischi) |
| `APP_PASSWORD`   | la password condivisa che digiterai in famiglia |

Dopo averle inserite fai **Redeploy** (le env si applicano al deploy successivo).

## 3. Dominio (facoltativo)
In Project → Settings → Domains puoi aggiungere es. `catalogo.rlam.site`.

## Note
- La vecchia pubblicazione su **GitHub Pages** non serve più (lì le `/api` non
  funzionano): usa l'URL Vercel.
- Se cambi la password, aggiorna `APP_PASSWORD` su Vercel e reinseriscila sui PC.
- I token esposti in passato andrebbero rigenerati su Airtable/Discogs prima di
  incollarli qui.
