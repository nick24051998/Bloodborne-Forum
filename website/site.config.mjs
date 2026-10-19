// Zentrale Einstellungen der Website. Alles, was mit "TODO" markiert ist, bitte ersetzen.
export const SITE = {
  // Name des Projekts (erscheint in Titeln, Google-Ergebnissen, Social-Vorschau)
  name: 'Bloodborne PC Port',

  // Adresse der Website (GitHub Pages mit eigener Domain, siehe README).
  // Ohne eigene Domain: url: 'https://nick24051998.github.io', base: '/Bloodborne-Forum/'
  url: 'https://bbport.nrnetworks.de',
  base: '/',

  // Standard-Beschreibung für Google (max. ~155 Zeichen)
  description:
    'Community hub for Bloodborne for Windows, the native PC port: download, install guide, system requirements, FAQ and changelog.',

  // Links – leer lassen, solange es sie noch nicht gibt (Buttons/Menüpunkte werden dann ausgeblendet)
  forumUrl: 'https://bbport-forum.nrnetworks.de',
  discordUrl: 'https://discord.gg/yTMG8c4Bqm', // dauerhafte Einladung, läuft nicht ab
  downloadUrl: 'https://github.com/Supermedo/bloodborne_pc/releases/latest', // immer das neueste Release
  githubUrl: '', // optional

  // Online-Server, auf dem die Community spielt. Die Live-Zahlen auf der Startseite holt der
  // Browser über das Forum (forumUrl + '/api/hunters-dream', siehe flarum/extend.php);
  // leer lassen, um den Abschnitt auszublenden.
  huntersDreamUrl: 'https://thehuntersdream.com',
};
