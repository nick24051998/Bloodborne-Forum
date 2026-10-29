// Central settings of the website. Please replace everything marked "TODO".
export const SITE = {
  // Name of the project (home page heading, logo, footer)
  name: 'Bloodborne PC Port',
  // Name for search engines: appears in every page title and is the site name on Google (WebSite data).
  // "bbport" is what the port calls itself ("Bloodborne (bbport) for Windows") and is the domain.
  brand: 'bbport',
  alternateNames: ['bbport.de', 'Bloodborne PC Port', 'Bloodborne for Windows'],

  // Address of the website (GitHub Pages with a custom domain, see README).
  // Without a custom domain: url: 'https://nick24051998.github.io', base: '/Bloodborne-Forum/'
  url: 'https://bbport.de',
  base: '/',

  // Default description for Google (max. ~155 characters)
  description:
    'bbport.de is the community hub for bbport, the native Bloodborne PC port for Windows by Supermedo: download, install guide, FAQ and forum.',

  // Links: leave empty while they don't exist yet (the buttons/menu items are then hidden)
  forumUrl: 'https://forum.bbport.de',
  discordUrl: 'https://discord.gg/WtYT4fXhEN', // never expires (checked 29.10.2026; the old yTMG8c4Bqm had expired)
  downloadUrl: 'https://github.com/Supermedo/bloodborne_pc/releases/latest', // always the latest release
  githubUrl: '', // optional: a GitHub profile of the community itself (not the port's)

  // The port this site is about: Bloodborne for Windows by Supermedo. Shown on the home page and in the
  // footer, so it is clear which port is meant and where to get it.
  portName: 'Bloodborne for Windows',
  portAuthor: 'Supermedo',
  portAuthorUrl: 'https://github.com/Supermedo',
  portRepoUrl: 'https://github.com/Supermedo/bloodborne_pc',
  // Supermedo's Buy Me a Coffee (Nick, 29.10.2026): yellow "Support our server" in the header next to Discord (Medo;
  // only there, not with the home page buttons), footer, FAQ "support", the Supermedo page; in the forum
  // flarum/forum.js (header) and content/footer.html
  supportUrl: 'https://buymeacoffee.com/supermedo',

  // Contact for questions, deletion requests and privacy (footer). Also appears in
  // src/texts/contact.md, src/texts/privacy.md and content/footer.html (forum): update those too when changing it.
  contactEmail: 'bbport@supermedo.com',

  // Supermedo's own online server (SuperMedo Server). The /server/ page (menu item "Server"), /server/hunter/ and
  // the band on the home page load its statistics through the forum (forumUrl + '/api/bb-server', see
  // flarum/server-stats.php), which asks the server once a minute; see src/texts/privacy.md.
  // Its account pages: make an account, and a new password by email
  superMedoAccountUrl: 'https://game.supermedo.com/account',
};
