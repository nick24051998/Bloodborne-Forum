// Wird über flarum/extend.php ins Forum eingebunden (kein Build-Schritt nötig).
// - Kopfzeile wie auf der Website (ein Menü für beide): links neben dem Logo Install, Guide, FAQ, Changelog,
//   Forum (aktiv) in derselben Schrift, ohne Symbole; rechts die Aktionen, hier Suche, Anmelden und als letzter
//   Knopf Discord wie auf der Website. Website-Links im selben Tab, Discord in einem neuen
//   (auf dem Handy im Seitenmenü, dort zusätzlich "Website")
// - Discord-only-Registrierung: Das Registrieren-Fenster zeigt nur den Discord-Button
// - Live-Zahlen von The Hunter's Dream (aus /api/hunters-dream, siehe extend.php): als Kasten
//   in der Seitenleiste, auf schmalen Bildschirmen als Zeile unter dem Willkommens-Banner
// - Abzeichen: nur die sichtbaren Team-Rollen von Discord (siehe flarum/discord-roles.php)
// Die Adressen setzt scripts/setup-forum.sh (WEBSITE_URL, DISCORD_INVITE_URL aus .env).
(function () {
  var compat = flarum.core.compat;
  var app = compat['forum/app'];
  var extend = compat['common/extend'].extend;
  var override = compat['common/extend'].override;
  var icon = compat['common/helpers/icon'];
  var HeaderPrimary = compat['forum/components/HeaderPrimary'];
  var HeaderSecondary = compat['forum/components/HeaderSecondary'];
  var LinkButton = compat['common/components/LinkButton'];
  var IndexPage = compat['forum/components/IndexPage'];
  var SignUpModal = compat['forum/components/SignUpModal'];
  var User = compat['common/models/User'];

  var HD_URL = 'https://thehuntersdream.com';

  // Website-Links öffnen im selben Tab (Website und Forum sollen wie eine Seite wirken),
  // fremde Dienste wie Discord in einem neuen
  function externalLink(href, label) {
    return m('a.Button.Button--link.bb-navLink', { href: href }, m('span.Button-label', label));
  }

  // Discord als Knopf ganz rechts, wie auf der Website (Knopf-Regel: Discord-Blau, siehe theme/custom.less)
  function discordButton(href) {
    return m('a.Button.bb-discordButton', { href: href, target: '_blank', rel: 'noopener' }, [
      icon('fab fa-discord', { className: 'Button-icon' }),
      m('span.Button-label', 'Discord'),
    ]);
  }

  // Zahlen höchstens einmal pro Minute neu laden; ohne Daten (Server weg, Fehler) bleibt alles ausgeblendet
  var hd = { data: null, fact: null, loadedAt: 0, loading: false };
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function loadHuntersDream() {
    if (hd.loading || Date.now() - hd.loadedAt < 60000) return;
    hd.loading = true;
    fetch(app.forum.attribute('apiUrl') + '/hunters-dream')
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        hd.data = data;
        // Der Jagd-Fakt wechselt bei jedem Laden der Seite, nicht bei jeder Aktualisierung
        if (data && !hd.fact) hd.fact = pickFact(data);
      })
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

  function pickFact(d) {
    var facts = [];
    if (d.deadliestArea) facts.push('Deadliest area: ' + d.deadliestArea.name + ' (' + number(d.deadliestArea.count) + ' deaths)');
    if (d.mostSlainBoss) facts.push('Most slain boss: ' + d.mostSlainBoss.name + ' (' + number(d.mostSlainBoss.count) + ' times)');
    if (d.mostHunted) facts.push('Most hunted: ' + d.mostHunted.name + ' (' + number(d.mostHunted.count) + ' slain)');
    if (d.levelPeak) facts.push('Most hunters are ' + d.levelPeak.replace('-', '–'));
    if (d.chaliceDungeons) facts.push(number(d.chaliceDungeons) + ' chalice dungeons shared');
    if (d.ghosts) facts.push(number(d.ghosts) + ' ghosts seen in the streets');
    return facts.length ? facts[Math.floor(Math.random() * facts.length)] : null;
  }

  // Zahl beim ersten Erscheinen von 0 hochzählen (900 ms, langes Auslaufen); danach steht sie einfach da
  function countUp(value) {
    return {
      oncreate: function (vnode) {
        if (reducedMotion || !value) return;
        // Den vorhandenen Textknoten ändern statt textContent zu ersetzen, damit Mithril später
        // neue Zahlen (Aktualisierung jede Minute) weiter in denselben Knoten schreibt
        var node = vnode.dom.firstChild;
        if (!node || node.nodeType !== 3) return;
        var start = performance.now();
        node.nodeValue = '0';
        (function step(now) {
          var t = Math.min(1, (now - start) / 900);
          var eased = 1 - Math.pow(1 - t, 3);
          node.nodeValue = t < 1 ? number(Math.round(value * eased)) : number(value);
          if (t < 1) requestAnimationFrame(step);
        })(start);
      },
    };
  }

  function statusLine(d) {
    return m('span.bb-hd-status' + (d.serverOnline ? '.is-online' : ''), [
      m('span.bb-hd-lamp', { 'aria-hidden': 'true' }),
      d.serverOnline ? m('span', [m('span', countUp(d.online), number(d.online)), ' hunters online']) : 'Server offline',
    ]);
  }

  function huntersDreamCard(d) {
    // Glocken nur, solange der Server läuft: wie viele gerade Mitspieler (Koop) oder Eindringlinge rufen
    var rows = d.serverOnline ? [['Co-op signs now', d.coopSigns], ['Sinister bells now', d.sinisterBells]] : [];
    rows.push(['Prey slaughtered (24 h)', d.bossClears24h], ['Beasts slain (24 h)', d.kills24h]);

    return m('div.bb-hd', [
      m('a.bb-hd-title', { href: HD_URL, target: '_blank', rel: 'noopener' }, "The Hunter's Dream"),
      statusLine(d),
      m('dl.bb-hd-stats', rows.map(function (row) {
        return m('div', [m('dt', row[0]), m('dd', countUp(row[1]), number(row[1]))]);
      }).concat(d.deadliestFoe ? [m('div', [m('dt', 'Deadliest foe'), m('dd', d.deadliestFoe.name)])] : [])),
      hd.fact ? m('p.bb-hd-fact', hd.fact) : null,
      d.newestGlyph ? m('p.bb-hd-glyph', [
        'Newest glyph ',
        m('a', { href: HD_URL + '/chalice/' + d.newestGlyph.id, target: '_blank', rel: 'noopener' }, m('code', d.newestGlyph.glyph)),
        d.newestGlyph.dungeon ? m('span', ' ' + d.newestGlyph.dungeon) : null,
      ]) : null,
      m('a.bb-hd-more', { href: HD_URL + '/leaderboards', target: '_blank', rel: 'noopener' }, 'Leaderboards →'),
    ]);
  }

  function huntersDreamStrip(d) {
    var extra = d.serverOnline && d.coopSigns ? number(d.coopSigns) + ' co-op signs ringing' : number(d.bossClears24h) + ' prey slaughtered (24 h)';
    return m('div.bb-hdStrip', m('div.container', [
      m('a', { href: HD_URL, target: '_blank', rel: 'noopener' }, [
        statusLine(d),
        m('span.bb-hdStrip-name', " on The Hunter's Dream"),
      ]),
      m('span.bb-hdStrip-stat', ' · ' + extra),
    ]));
  }

  app.initializers.add('bbforum', function () {
    extend(HeaderPrimary.prototype, 'items', function (items) {
      var site = app.forum.attribute('bbforumWebsiteUrl');
      var discord = app.forum.attribute('bbforumDiscordUrl');

      // Dieselben Menüpunkte wie auf der Website, "Forum" als aktiver Punkt. "Website" gibt es nur
      // auf dem Handy (im Seitenmenü fehlt das Logo), sonst führt das Logo zur Website.
      if (site) {
        items.add('bb-home', externalLink(site + '/', 'Website'), 60);
        items.add('bb-install', externalLink(site + '/install/', 'Install'), 50);
        items.add('bb-guide', externalLink(site + '/guide/', 'Guide'), 45);
        items.add('bb-faq', externalLink(site + '/faq/', 'FAQ'), 40);
        items.add('bb-changelog', externalLink(site + '/changelog/', 'Changelog'), 30);
        items.add('bb-forum', LinkButton.component({
          href: app.route('index'),
          className: 'Button Button--link bb-navLink bb-navLink--current',
        }, 'Forum'), 20);
      }
    });

    // Rechts, nach Suche und Anmelden: Discord als letzter Knopf, wie auf der Website
    extend(HeaderSecondary.prototype, 'items', function (items) {
      var discord = app.forum.attribute('bbforumDiscordUrl');
      if (discord) items.add('bb-discord', discordButton(discord), -100);
    });

    // Logo oben links: zur Website wie auf der Website selbst. Erst nach dem Start (app.forum gibt es
    // im Initializer noch nicht), daher beim ersten Zeichnen der Kopfzeile. Flarum fängt Klicks aufs
    // Logo ab und springt zur Forum-Startseite; der Listener in der Capture-Phase kommt vorher und
    // lässt den Browser dem Link normal folgen.
    extend(HeaderPrimary.prototype, 'oncreate', function () {
      var homeLink = document.getElementById('home-link');
      var site = app.forum.attribute('bbforumWebsiteUrl');
      if (!homeLink || !site) return;
      homeLink.setAttribute('href', site + '/');
      document.addEventListener('click', function (e) {
        if (e.target instanceof Element && e.target.closest('#home-link')) e.stopPropagation();
      }, true);
    });

    // Hunter's Dream: Kasten in der Seitenleiste (breite Bildschirme), Zeile unter dem Banner (schmale)
    extend(IndexPage.prototype, 'sidebarItems', function (items) {
      loadHuntersDream();
      if (hd.data) items.add('bbHuntersDream', huntersDreamCard(hd.data), -100);
    });

    override(IndexPage.prototype, 'hero', function (original) {
      return [original(), hd.data ? huntersDreamStrip(hd.data) : null];
    });

    // Abzeichen: Versteckte Gruppen (Waffen-, GPU-, Setup-Rollen von Discord) nie, auch nicht für Admins und
    // Mods, die sie sehen dürfen, sonst stapeln sich dort ein Dutzend graue Kreise. Flarums eigenes Admin- und
    // Mod-Abzeichen nur ohne Team-Rolle von Discord, die sagt dasselbe (Gruppen ab ID 5 kommen aus Discord).
    extend(User.prototype, 'badges', function (items) {
      var groups = (this.groups() || []).filter(Boolean);
      var discordTeam = groups.some(function (g) { return Number(g.id()) > 4 && !g.isHidden(); });
      groups.forEach(function (g) {
        var key = 'group' + g.id();
        if (!items.has(key)) return;
        if (g.isHidden() || (discordTeam && (g.id() === '1' || g.id() === '4'))) items.remove(key);
      });
    });

    // Das E-Mail-Formular blendet custom.less aus, sobald ein Login-Button (Discord) da ist
    override(SignUpModal.prototype, 'className', function (original) {
      return original() + (app.forum.attribute('bbforumDiscordOnly') ? ' SignUpModal--discordOnly' : '');
    });
  });
})();

// Flarum erwartet von jedem eingebundenen Skript ein Modul-Objekt (sonst bricht der Start ab)
module.exports = {};
