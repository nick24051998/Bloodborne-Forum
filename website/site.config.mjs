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
  discordUrl: 'https://discord.gg/yTMG8c4Bqm', // permanent invite, does not expire
  downloadUrl: 'https://github.com/Supermedo/bloodborne_pc/releases/latest', // always the latest release
  githubUrl: '', // optional: a GitHub profile of the community itself (not the port's)

  // The port this site is about: Bloodborne for Windows by Supermedo. Shown on the home page and in the
  // footer, so it is clear which port is meant and where to get it.
  portName: 'Bloodborne for Windows',
  portAuthor: 'Supermedo',
  portAuthorUrl: 'https://github.com/Supermedo',
  portRepoUrl: 'https://github.com/Supermedo/bloodborne_pc',

  // Contact for questions, deletion requests and privacy (footer). Also appears in
  // src/texts/contact.md, src/texts/privacy.md and content/footer.html (forum): update those too when changing it.
  contactEmail: 'bbportpc@gmail.com',

  // Online server the community plays on. The live numbers on the home page are fetched by the
  // browser via the forum (forumUrl + '/api/hunters-dream', see flarum/extend.php).
  // Forum only for now; to switch it on for the website, enter 'https://thehuntersdream.com'.
  huntersDreamUrl: '',
};
