-- Sezione "Elettrodomestici ed elettronica" del Catalogo Dajlani.
-- Eseguire una volta nel SQL Editor di Supabase (schema `catalogo`).
-- I nomi colonna corrispondono a norm() di api/_mappa.js. I campi a scelta
-- restano text SENZA vincolo CHECK: le opzioni le impone l'app.

create table if not exists catalogo.elettronica (
  airtable_id  text primary key,
  creato_il    timestamptz default now(),
  titolo                   text,
  codice                   integer,
  tipologia                text,
  marca                    text,
  modello                  text,
  numero_di_serie          text,
  alimentazione            text,
  anno_o_epoca             text,
  altezza_cm               numeric,
  larghezza_cm             numeric,
  profondita_cm            numeric,
  peso_kg                  numeric,
  stato_di_conservazione   text,
  funzionante              text,
  accessori_e_cavi         text,
  difetti                  text,
  specifiche_tecniche      text,
  ambiente                 text,
  provenienza              text,
  data_acquisizione        date,
  prezzo_acquisto          numeric,
  valore_stimato           numeric,
  data_stima               date,
  note                     text
);

-- tabella-ponte per il campo Collocazione
create table if not exists catalogo.collocazioni__elettronica (
  src text,
  dst text,
  primary key (src, dst)
);

-- ricarica la cache dello schema dell'API PostgREST
notify pgrst, 'reload schema';

-- NB: se il server usa la chiave ANON con RLS attivo, replica su
-- catalogo.elettronica le stesse policy di una tabella esistente.
