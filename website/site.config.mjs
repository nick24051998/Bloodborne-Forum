// Zentrale Einstellungen der Website. Alles, was mit "TODO" markiert ist, bitte ersetzen.
export const SITE = {
  // Name des Projekts (Überschrift der Startseite, Logo, Fußzeile)
  name: 'Bloodborne PC Port',
  // Name für Suchmaschinen: steht in jedem Seitentitel und ist der Seitenname bei Google (WebSite-Daten).
  // "bbport" nennt der Port sich selbst ("Bloodborne (bbport) for Windows") und ist die Domain.
  brand: 'bbport',
  alternateNames: ['bbport.de', 'Bloodborne PC Port', 'Bloodborne for Windows'],

  // Adresse der Website (GitHub Pages mit eigener Domain, siehe README).
  // Ohne eigene Domain: url: 'https://nick24051998.github.io', base: '/Bloodborne-Forum/'
  url: 'https://bbport.de',
  base: '/',

  // Standard-Beschreibung für Google (max. ~155 Zeichen)
  description:
    'bbport.de is the community hub for bbport, the native Bloodborne PC port for Windows by Supermedo: download, install guide, FAQ and forum.',

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

  // Supermedos eigener Online-Server (SuperMedo Server). Die Seite /server/ (Menüpunkt "Server") holt seine
  // Live-Zahlen direkt von hier (nur Summen, keine Namen); siehe src/texts/privacy.md.
  superMedoStatsUrl: 'https://game.supermedo.com/public/stats',
};
