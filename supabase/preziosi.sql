-- Sezione "Orologi, gioielli e preziosi" del Catalogo Dajlani.
-- Eseguire una volta nel SQL Editor di Supabase (schema `catalogo`).
-- I nomi colonna corrispondono a norm() di api/_mappa.js. I campi a scelta
-- restano text SENZA vincolo CHECK: le opzioni le impone l'app (niente più
-- typecast di Airtable), così un valore fuori lista non blocca il salvataggio.

create table if not exists catalogo.preziosi (
  airtable_id  text primary key,
  creato_il    timestamptz default now(),
  titolo                       text,
  codice                       integer,
  tipologia                    text,
  marca                        text,
  modello_o_referenza          text,
  materiale                    text,
  titolo_metallico_o_caratura  text,
  pietre_e_gemme               text,
  peso_g                       numeric,
  punzoni_e_marchi             text,
  numero_di_serie              text,
  movimento                    text,
  diametro_cassa_mm            numeric,
  dimensioni                   text,
  epoca_o_anno                 text,
  stato_di_conservazione       text,
  funzionante                  text,
  scatola_e_documenti          text,
  certificazione_o_perizia     text,
  provenienza                  text,
  data_acquisizione            date,
  prezzo_acquisto              numeric,
  valore_stimato               numeric,
  data_stima                   date,
  note                         text
);

-- tabella-ponte per il campo Collocazione (come le altre sezioni)
create table if not exists catalogo.collocazioni__preziosi (
  src text,
  dst text,
  primary key (src, dst)
);

-- ricarica la cache dello schema dell'API PostgREST
notify pgrst, 'reload schema';

-- NB: se il server usa la chiave ANON (non service_role) e sulle altre tabelle
-- del catalogo è attivo RLS, replica qui le stesse policy di una tabella
-- esistente (es. catalogo.numismatica) per select/insert/update/delete.
