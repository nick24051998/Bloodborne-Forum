// Wird über flarum/extend.php ins Forum eingebunden (kein Build-Schritt nötig).
// - Links zur Projekt-Website und zu Discord in der Kopfzeile (auf dem Handy im Seitenmenü)
// - Discord-only-Registrierung: Das Registrieren-Fenster zeigt nur den Discord-Button
// Die Adressen setzt scripts/setup-forum.sh (WEBSITE_URL, DISCORD_INVITE_URL aus .env).
(function () {
  var compat = flarum.core.compat;
  var app = compat['forum/app'];
  var extend = compat['common/extend'].extend;
  var override = compat['common/extend'].override;
  var icon = compat['common/helpers/icon'];
  var HeaderPrimary = compat['forum/components/HeaderPrimary'];
  var SignUpModal = compat['forum/components/SignUpModal'];

  function externalLink(href, iconName, label) {
    return m('a.Button.Button--link.bb-navLink', { href: href, target: '_blank', rel: 'noopener' }, [
      icon(iconName, { className: 'Button-icon' }),
      m('span.Button-label', label),
    ]);
  }

  app.initializers.add('bbforum', function () {
    extend(HeaderPrimary.prototype, 'items', function (items) {
      var site = app.forum.attribute('bbforumWebsiteUrl');
      var discord = app.forum.attribute('bbforumDiscordUrl');

      if (site) {
        items.add('bb-website', externalLink(site + '/', 'fas fa-home', 'Website'), 30);
        items.add('bb-install', externalLink(site + '/install/', 'fas fa-download', 'Install guide'), 20);
        items.add('bb-faq', externalLink(site + '/faq/', 'fas fa-question-circle', 'FAQ'), 10);
      }
      if (discord) {
        items.add('bb-discord', externalLink(discord, 'fab fa-discord', 'Discord'), 0);
      }
    });

    // Das E-Mail-Formular blendet custom.less aus, sobald ein Login-Button (Discord) da ist
    override(SignUpModal.prototype, 'className', function (original) {
      return original() + (app.forum.attribute('bbforumDiscordOnly') ? ' SignUpModal--discordOnly' : '');
    });
  });
})();

// Flarum erwartet von jedem eingebundenen Skript ein Modul-Objekt (sonst bricht der Start ab)
module.exports = {};
