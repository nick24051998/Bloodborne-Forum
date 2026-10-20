// Zentrale Einstellungen der Website. Alles, was mit "TODO" markiert ist, bitte ersetzen.
export const SITE = {
  // Name des Projekts (erscheint in Titeln, Google-Ergebnissen, Social-Vorschau)
  name: 'Bloodborne PC Port',

  // Adresse der Website (GitHub Pages mit eigener Domain, siehe README).
  // Ohne eigene Domain: url: 'https://nick24051998.github.io', base: '/Bloodborne-Forum/'
  url: 'https://bbport.de',
  base: '/',

  // Standard-Beschreibung für Google (max. ~155 Zeichen)
  description:
    'Community hub for Bloodborne for Windows, the native PC port: download, install guide, system requirements, FAQ and changelog.',

  // Links – leer lassen, solange es sie noch nicht gibt (Buttons/Menüpunkte werden dann ausgeblendet)
  forumUrl: 'https://forum.bbport.de',
  discordUrl: 'https://discord.gg/yTMG8c4Bqm', // dauerhafte Einladung, läuft nicht ab
  downloadUrl: 'https://github.com/Supermedo/bloodborne_pc/releases/latest', // immer das neueste Release
  githubUrl: '', // optional: ein eigenes GitHub-Profil der Community (nicht das des Ports)

  // Der Port, um den es hier geht: Bloodborne for Windows von Supermedo. Steht auf der Startseite und in der
  // Fußzeile, damit klar ist, welcher Port gemeint ist und wo es ihn gibt.
  portName: 'Bloodborne for Windows',
  portAuthor: 'Supermedo',
  portAuthorUrl: 'https://github.com/Supermedo',
  portRepoUrl: 'https://github.com/Supermedo/bloodborne_pc',

  // Kontakt für Fragen, Löschanfragen und Datenschutz (Fußzeile). Steht außerdem in
  // src/texts/contact.md, src/texts/privacy.md und content/footer.html (Forum): bei Änderung dort mitziehen.
  contactEmail: 'bbportpc@gmail.com',

  // Online-Server, auf dem die Community spielt. Die Live-Zahlen auf der Startseite holt der
  // Browser über das Forum (forumUrl + '/api/hunters-dream', siehe flarum/extend.php).
  // Vorerst nur im Forum; zum Einschalten auf der Website 'https://thehuntersdream.com' eintragen.
  huntersDreamUrl: '',
};
