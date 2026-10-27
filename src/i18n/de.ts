import { en, type Dict } from './en';

// German UI strings. Only the Abi-Rechner (/de/abi-rechner/) is in German, so just the shared chrome
// (layout, SEO, header, footer) is translated; calculator strings fall back to English and are unused.
export const de: Dict = {
  ...en,
  htmlLang: 'de',
  ogLocale: 'de_DE',
  langName: 'Deutsch',
  seo: {
    title: 'Abi-Rechner: Abiturschnitt online berechnen',
    description: 'Kostenloser Abi-Rechner: Abiturschnitt aus Block I und Block II berechnen, mit Leistungskursen, 4 oder 5 Prüfungsfächern und Zulassungsprüfung.',
    appName: 'Abi-Rechner',
    imageAlt: 'HS GPA Calc: kostenloser Abi-Rechner für den Abiturschnitt',
  },
  skip: 'Zum Rechner springen',
  header: { about: 'Über uns', contact: 'Kontakt', toggleTheme: 'Dunkelmodus umschalten', mainNav: 'Hauptmenü', language: 'Sprache' },
  footer: {
    nav: 'Fußzeile',
    about: 'Über uns',
    contact: 'Kontakt',
    privacy: 'Datenschutz',
    terms: 'Nutzungsbedingungen',
    note: 'Deine Punkte werden nur in deinem Browser gespeichert. Alle Ergebnisse sind Schätzungen; verbindlich ist die Berechnung deiner Schule.',
  },
  lastUpdated: 'Zuletzt aktualisiert:',
};
