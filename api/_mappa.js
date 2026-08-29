// Mappa di traduzione fra i nomi dei campi che l'interfaccia usa (quelli
// storici di Airtable) e il database Supabase dove i dati vivono oggi
// (schema `catalogo`). Generata dagli schemi durante la migrazione di
// agosto 2026. I collegamenti fra tabelle stanno in "tabelle ponte" con
// colonne src/dst; gli allegati nella tabella `allegati` + storage.

export const SCHEMA = 'catalogo';
export const BUCKET = 'catalogo';

/* nome campo/tabella Airtable -> nome colonna/tabella Postgres */
export function norm(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const TABELLE = {
  'Collocazioni': {
    fields: ['Nome', 'Stanza', 'Mobile', 'Ripiano', 'Note'],
    links: {
      'Libri': { bridge: 'collocazioni__libri', role: 'src' },
      'Quadri': { bridge: 'collocazioni__quadri', role: 'src' },
      'Tappeti': { bridge: 'collocazioni__tappeti', role: 'src' },
      'Sculture': { bridge: 'collocazioni__sculture', role: 'src' },
      'Mobili': { bridge: 'collocazioni__mobili', role: 'src' },
      'Ceramiche': { bridge: 'collocazioni__ceramiche', role: 'src' },
      'Accessori': { bridge: 'collocazioni__accessori', role: 'src' },
      'Supporti Musicali': { bridge: 'collocazioni__supporti_musicali', role: 'src' },
      'Numismatica': { bridge: 'collocazioni__numismatica', role: 'src' },
    },
    attachments: [],
    multi: [],
  },
  'Libri': {
    fields: ['Titolo', 'Autore', 'ISBN', 'Editore', 'Anno', 'Pagine', 'Lingua',
      'Genere', 'Possesso', 'Stato', 'Valutazione', 'Data inizio lettura',
      'Data fine lettura', 'Prezzo', 'Copertina', 'Note', 'Descrizione',
      'Tag', 'Codice'],
    links: {
      'Collocazione': { bridge: 'collocazioni__libri', role: 'dst' },
      'Prestiti': { bridge: 'libri__prestiti', role: 'src' },
      'Autore (archivio)': { bridge: 'libri__autore_archivio', role: 'src' },
    },
    attachments: ['Scansioni', 'Documenti'],
    multi: ['Genere', 'Tag'],
  },
  'Prestiti': {
    fields: ['Prestito', 'Prestato a', 'Contatto', 'Data prestito',
      'Restituzione prevista', 'Data restituzione', 'Stato', 'Note'],
    links: { 'Libro': { bridge: 'libri__prestiti', role: 'dst' } },
    attachments: [],
    multi: [],
  },
  'Quadri': {
    fields: ['Titolo', 'Codice', 'Autore', 'Ambito', 'Soggetto', 'Tecnica',
      'Anno', 'Epoca', 'Altezza cm', 'Larghezza cm', 'Cornice',
      'Firma e iscrizioni', 'Stato di conservazione', 'Provenienza',
      'Data acquisizione', 'Prezzo acquisto', 'Valore stimato', 'Note',
      'Attribuzione', 'Note di conservazione', 'Data stima',
      "Informazioni biografiche sull'autore", 'Fonti'],
    links: {
      'Collocazione': { bridge: 'collocazioni__quadri', role: 'dst' },
      'Autore (archivio)': { bridge: 'quadri__autore_archivio', role: 'src' },
    },
    attachments: ['Foto', 'Documenti'],
    multi: [],
  },
  'Tappeti': {
    fields: ['Titolo', 'Codice', 'Origine', 'Materiale', 'Annodatura',
      'Densità nodi', 'Lunghezza cm', 'Larghezza cm', 'Epoca', 'Decoro',
      'Stato di conservazione', 'Provenienza', 'Data acquisizione',
      'Prezzo acquisto', 'Valore stimato', 'Note', 'Data stima'],
    links: { 'Collocazione': { bridge: 'collocazioni__tappeti', role: 'dst' } },
    attachments: ['Foto', 'Documenti'],
    multi: [],
  },
  'Sculture': {
    fields: ['Titolo', 'Codice', 'Autore', 'Soggetto', 'Materiale', 'Tecnica',
      'Epoca', 'Altezza cm', 'Dimensioni', 'Firma e iscrizioni', 'Base',
      'Stato di conservazione', 'Provenienza', 'Data acquisizione',
      'Prezzo acquisto', 'Valore stimato', 'Note', 'Data stima'],
    links: {
      'Collocazione': { bridge: 'collocazioni__sculture', role: 'dst' },
      'Autore (archivio)': { bridge: 'sculture__autore_archivio', role: 'src' },
    },
    attachments: ['Foto', 'Documenti'],
    multi: [],
  },
  'Mobili': {
    fields: ['Titolo', 'Codice', 'Ambiente', 'Epoca', 'Materiali',
      'Altezza cm', 'Larghezza cm', 'Profondità cm', 'Interventi di restauro',
      'Stato di conservazione', 'Provenienza', 'Data acquisizione',
      'Prezzo acquisto', 'Valore stimato', 'Note', 'Data stima',
      'Stile e manifattura', 'Caratteristiche'],
    links: { 'Collocazione': { bridge: 'collocazioni__mobili', role: 'dst' } },
    attachments: ['Foto', 'Documenti'],
    multi: [],
  },
  'Ceramiche': {
    fields: ['Titolo', 'Codice', 'Manifattura', 'Marchio', 'Tipologia',
      'Materiale', 'Decoro', 'Epoca', 'Altezza cm', 'Diametro cm',
      'Integrità', 'Stato di conservazione', 'Provenienza',
      'Data acquisizione', 'Prezzo acquisto', 'Valore stimato', 'Note',
      'Data stima'],
    links: { 'Collocazione': { bridge: 'collocazioni__ceramiche', role: 'dst' } },
    attachments: ['Foto', 'Documenti'],
    multi: [],
  },
  'Accessori': {
    fields: ['Titolo', 'Codice', 'Categoria', 'Stile e epoca',
      'Materiale principale', 'Colore e finitura', 'Altezza cm',
      'Larghezza cm', 'Profondità cm', 'Peso kg', 'Stato di conservazione',
      'Ambiente', 'Datazione', 'Provenienza', 'Data acquisizione',
      'Prezzo acquisto', 'Valore stimato', 'Data stima', 'Note'],
    links: { 'Collocazione': { bridge: 'collocazioni__accessori', role: 'dst' } },
    attachments: ['Foto', 'Documenti'],
    multi: [],
  },
  'Supporti Musicali': {
    fields: ['Titolo', 'Codice', 'Artista', 'Tipologia supporto',
      'Anno di rilascio', 'Genere musicale', 'Etichetta',
      'Codice di catalogo', 'Paese di stampa', 'Codice a barre', 'Tracklist',
      'Stato di conservazione', 'Stato del supporto', 'Difetti e note',
      'Ambiente', 'Provenienza', 'Data acquisizione', 'Prezzo acquisto',
      'Valore stimato', 'Data stima', 'Note', 'Crediti', 'Quotazione',
      'Copertina', 'Numero posizione'],
    links: {
      'Collocazione': { bridge: 'collocazioni__supporti_musicali', role: 'dst' },
      'Autore (archivio)': { bridge: 'supporti_musicali__autore_archivio', role: 'src' },
    },
    attachments: ['Foto', 'Documenti'],
    multi: [],
  },
  'Autori': {
    fields: ['Nome', 'Nascita', 'Morte', 'Nazionalità', 'Biografia', 'Note'],
    links: {
      'Quadri': { bridge: 'quadri__autore_archivio', role: 'dst' },
      'Sculture': { bridge: 'sculture__autore_archivio', role: 'dst' },
      'Supporti Musicali': { bridge: 'supporti_musicali__autore_archivio', role: 'dst' },
      'Libri': { bridge: 'libri__autore_archivio', role: 'dst' },
    },
    attachments: ['Foto'],
    multi: [],
  },
  'Numismatica': {
    fields: ['Titolo', 'Codice', 'Data di catalogazione',
      'Stato nella collezione', 'Set o serie', 'Denominazione',
      'Autorità emittente', 'Sovrano o magistrato', 'Anno o millesimo',
      'Datazione critica', 'Zecca', 'Incisore o officina',
      'Nominale e sistema monetario', 'Metallo o lega', 'Titolo metallico',
      'Catalogo — sigla', 'Catalogo — numero', 'Riferimenti secondari',
      'Numero esemplari noti', 'Grado di rarità', 'Diametro mm', 'Peso g',
      'Spessore mm', 'Asse di conio', 'Bordo o taglio', 'Forma',
      'Tecnica di conio', 'Dritto — descrizione', 'Dritto — leggenda',
      'Rovescio — descrizione', 'Rovescio — leggenda',
      'Contromarche o punzoni', 'Graffiti e segni', 'Varianti note',
      'Stato di conservazione', 'Conservazione dichiarata dal venditore',
      'Difetti', 'Patina', 'Interventi', 'Sigillatura o perizia',
      'Autenticità', 'Modalità di acquisizione', 'Venditore o cedente',
      'Asta e lotto', 'Valuta e cambio', 'Pedigree',
      'Documentazione di provenienza', 'Valore di catalogo',
      'Fonte della stima', 'Valore assicurato', 'Note di mercato',
      'Ubicazione', 'Contenitore', 'Posizione', 'Tipo di alloggiamento',
      'Bibliografia specifica', 'Note storiche', 'Provenienza',
      'Data acquisizione', 'Prezzo acquisto', 'Valore stimato', 'Data stima',
      'Note', 'Grado Sheldon'],
    links: { 'Collocazione': { bridge: 'collocazioni__numismatica', role: 'dst' } },
    attachments: ['Foto', 'Documenti'],
    multi: [],
  },
  'Strumenti di lavoro EON': {
    fields: ['Descrizione', 'Codice', 'Categoria', 'Data acquisizione',
      'Presente in casa Irma', 'Proprietario', 'Note'],
    links: {},
    attachments: ['Foto', 'Documenti'],
    multi: [],
  },
};

/** Ritorna la voce di mappa per un nome tabella Airtable (case esatto). */
export function tabella(nome) {
  const t = TABELLE[nome];
  if (!t) throw new Error(`Tabella sconosciuta: ${nome}`);
  return t;
}
