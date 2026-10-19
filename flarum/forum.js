// Wird über flarum/extend.php ins Forum eingebunden (kein Build-Schritt nötig).
// - Links zur Projekt-Website und zu Discord in der Kopfzeile (auf dem Handy im Seitenmenü)
// - Discord-only-Registrierung: Das Registrieren-Fenster zeigt nur den Discord-Button
// - Live-Zahlen von The Hunter's Dream (aus /api/hunters-dream, siehe extend.php): als Kasten
//   in der Seitenleiste, auf schmalen Bildschirmen als Zeile unter dem Willkommens-Banner
// Die Adressen setzt scripts/setup-forum.sh (WEBSITE_URL, DISCORD_INVITE_URL aus .env).
(function () {
  var compat = flarum.core.compat;
  var app = compat['forum/app'];
  var extend = compat['common/extend'].extend;
  var override = compat['common/extend'].override;
  var icon = compat['common/helpers/icon'];
  var HeaderPrimary = compat['forum/components/HeaderPrimary'];
  var IndexPage = compat['forum/components/IndexPage'];
  var SignUpModal = compat['forum/components/SignUpModal'];

  var HD_URL = 'https://thehuntersdream.com';

  function externalLink(href, iconName, label) {
    return m('a.Button.Button--link.bb-navLink', { href: href, target: '_blank', rel: 'noopener' }, [
      icon(iconName, { className: 'Button-icon' }),
      m('span.Button-label', label),
    ]);
  }

  // Zahlen höchstens einmal pro Minute neu laden; ohne Daten (Server weg, Fehler) bleibt alles ausgeblendet
  var hd = { data: null, loadedAt: 0, loading: false };

  function loadHuntersDream() {
    if (hd.loading || Date.now() - hd.loadedAt < 60000) return;
    hd.loading = true;
    fetch(app.forum.attribute('apiUrl') + '/hunters-dream')
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) { hd.data = data; })
      .catch(function () {})
      .then(function () {
        hd.loading = false;
        hd.loadedAt = Date.now();
        m.redraw();
      });
  }

  function number(value) {
    return Number(value).toLocaleString('en-US');
  }

  function statusLine(d) {
    return m('span.bb-hd-status' + (d.serverOnline ? '.is-online' : ''), [
      m('span.bb-hd-lamp', { 'aria-hidden': 'true' }),
      d.serverOnline ? number(d.online) + ' hunters online' : 'Server offline',
    ]);
  }

  function huntersDreamCard(d) {
    var rows = [
      ['Prey slaughtered (24 h)', number(d.bossClears24h)],
      ['Beasts slain (24 h)', number(d.kills24h)],
    ];
    if (d.deadliestFoe) rows.push(['Deadliest foe', d.deadliestFoe.name]);

    return m('div.bb-hd', [
      m('a.bb-hd-title', { href: HD_URL, target: '_blank', rel: 'noopener' }, "The Hunter's Dream"),
      statusLine(d),
      m('dl.bb-hd-stats', rows.map(function (row) {
        return m('div', [m('dt', row[0]), m('dd', row[1])]);
      })),
      m('a.bb-hd-more', { href: HD_URL + '/leaderboards', target: '_blank', rel: 'noopener' }, 'Leaderboards →'),
    ]);
  }

  function huntersDreamStrip(d) {
    return m('div.bb-hdStrip', m('div.container', [
      m('a', { href: HD_URL, target: '_blank', rel: 'noopener' }, [
        statusLine(d),
        m('span.bb-hdStrip-name', " on The Hunter's Dream"),
      ]),
      m('span.bb-hdStrip-stat', ' · ' + number(d.bossClears24h) + ' prey slaughtered (24 h)'),
    ]));
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

    // Hunter's Dream: Kasten in der Seitenleiste (breite Bildschirme), Zeile unter dem Banner (schmale)
    extend(IndexPage.prototype, 'sidebarItems', function (items) {
      loadHuntersDream();
      if (hd.data) items.add('bbHuntersDream', huntersDreamCard(hd.data), -100);
    });

    override(IndexPage.prototype, 'hero', function (original) {
      return [original(), hd.data ? huntersDreamStrip(hd.data) : null];
    });

    // Das E-Mail-Formular blendet custom.less aus, sobald ein Login-Button (Discord) da ist
    override(SignUpModal.prototype, 'className', function (original) {
      return original() + (app.forum.attribute('bbforumDiscordOnly') ? ' SignUpModal--discordOnly' : '');
    });
  });
})();

// Flarum erwartet von jedem eingebundenen Skript ein Modul-Objekt (sonst bricht der Start ab)
module.exports = {};
