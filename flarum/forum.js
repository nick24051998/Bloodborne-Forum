// Wird über flarum/extend.php ins Forum eingebunden (kein Build-Schritt nötig).
// - Kopfzeile wie auf der Website (ein Menü für beide): links neben dem Logo Install, Guide, Best settings, FAQ,
//   Changelog, Supermedo, Forum (aktiv) in derselben Schrift, ohne Symbole; rechts die Aktionen, hier Suche, Anmelden und als letzter
//   Knopf Discord wie auf der Website. Website-Links im selben Tab, Discord in einem neuen
//   (auf dem Handy im Seitenmenü, dort zusätzlich "Website")
// - Discord-only-Registrierung: Das Registrieren-Fenster zeigt nur den Discord-Button
// - Live-Zahlen von The Hunter's Dream (aus /api/hunters-dream, siehe extend.php): als Kasten
//   in der Seitenleiste, auf schmalen Bildschirmen als Zeile unter dem Willkommens-Banner
// - Abzeichen: nur die sichtbaren Team-Rollen von Discord (siehe flarum/discord-roles.php)
// - Wegweiser „Where does my post go?“ unter dem Banner der Startseite: Known Fixes, Help & Support, Suggestions,
//   Bug Reports mit je einem Satz; lässt sich ausblenden (merkt sich der Browser)
// - Team (wer in Known Fixes Themen starten darf, also Mods und Admins): Block „Team“ in der Seitenleiste mit
//   Arbeitslisten (ohne Antwort, ungelöst, offene Bugs, Vorschläge) und an Hilfe-Themen „Save as Known Fix“
// - Logo-Contest: Seite /logo-contest mit allen Werken (erstes Bild im Eröffnungsbeitrag eines Themas im Bereich
//   Logo Contest), Einreichen und Abstimmen; Regeln und Daten in flarum/contest.php, Link in der Seitenleiste
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
  var DiscussionControls = compat['forum/utils/DiscussionControls'];
  var DiscussionComposer = compat['forum/components/DiscussionComposer'];
  var Button = compat['common/components/Button'];
  var Separator = compat['common/components/Separator'];
  var Stream = compat['common/utils/Stream'];
  var SignUpModal = compat['forum/components/SignUpModal'];
  var LogInModal = compat['forum/components/LogInModal'];
  var Page = compat['common/components/Page'];
  var Link = compat['common/components/Link'];
  var LoadingIndicator = compat['common/components/LoadingIndicator'];
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

  // Wegweiser: welcher Bereich wofür ist. Nur Bereiche, die es gibt (Setup legt sie an), in dieser Reihenfolge.
  var GUIDE = [
    ['known-fixes', 'Search here first', 'Solutions that worked, checked by a helper.'],
    ['help-support', "Something doesn't work", 'Crash, error, setup or performance. One problem per topic.'],
    ['suggestions', 'You have an idea', 'For the port, the launcher, this forum or Discord.'],
    ['bug-reports', 'Confirmed bugs', 'With their status, from Open to Fixed. The team moves them here from Help.'],
  ];
  var GUIDE_KEY = 'bbforum.guideHidden';

  function guideHidden() {
    try { return localStorage.getItem(GUIDE_KEY) === '1'; } catch (e) { return false; }
  }

  function postGuide() {
    var tags = app.store.all('tags');
    var cards = GUIDE.map(function (entry) {
      var tag = tags.filter(function (t) { return t.slug() === entry[0]; })[0];
      if (!tag) return null;
      return m('a.bb-guide-card', { href: app.route('tag', { tags: tag.slug() }), style: { '--tag': tag.color() || '' } }, [
        tag.icon() ? icon(tag.icon(), { className: 'bb-guide-icon' }) : null,
        m('span.bb-guide-name', tag.name()),
        m('strong', entry[1]),
        m('span.bb-guide-text', entry[2]),
      ]);
    }).filter(Boolean);
    if (!cards.length) return null;
    return m('div.bb-guide', m('div.container', [
      m('div.bb-guide-head', [
        m('h2', 'Where does my post go?'),
        m('button.bb-guide-hide', {
          type: 'button',
          'aria-label': 'Hide this guide',
          onclick: function () {
            try { localStorage.setItem(GUIDE_KEY, '1'); } catch (e) {}
            m.redraw();
          },
        }, 'Hide'),
      ]),
      m('div.bb-guide-cards', cards),
    ]));
  }

  function tagBySlug(slug) {
    return app.store.all('tags').filter(function (t) { return t.slug() === slug; })[0];
  }

  // Zum Team gehört, wer in Known Fixes Themen starten darf (setup-inside.sh: nur Mods, Admins immer)
  function isTeam() {
    var fixes = tagBySlug('known-fixes');
    return !!(app.session.user && fixes && fixes.canStartDiscussion());
  }

  // Arbeitslisten fürs Team: Suche mit Gambits (is:unanswered aus extend.php, is:solved von Best Answer)
  var TEAM_LISTS = [
    ['bbTeamUnanswered', 'Waiting for an answer', { q: 'tag:help-support is:unanswered', sort: 'oldest' }, 'fas fa-hourglass-half'],
    ['bbTeamUnsolved', 'Help not solved yet', { q: 'tag:help-support -is:solved', sort: 'latest' }, 'fas fa-life-ring'],
    ['bbTeamBugs', 'Open bugs', { q: 'tag:bug-reports tag:status-open', sort: 'latest' }, 'fas fa-bug'],
    ['bbTeamIdeas', 'New suggestions', { q: 'tag:suggestions', sort: 'newest' }, 'fas fa-lightbulb'],
  ];

  function teamNavItems(items) {
    items.add('bbTeamSeparator', Separator.component(), -40);
    items.add('bbTeamTitle', m('span.bb-teamTitle', 'Team'), -41);
    TEAM_LISTS.forEach(function (list, i) {
      items.add(list[0], LinkButton.component({ href: app.route('index', list[2]), icon: list[3] }, list[1]), -42 - i);
    });
  }

  // Aus einem Hilfe-Thema einen Known Fix machen: Composer in Known Fixes, Titel und Link vorausgefüllt
  function saveAsKnownFix(discussion) {
    var fixes = tagBySlug('known-fixes');
    var link = app.forum.attribute('baseUrl') + app.route.discussion(discussion);
    app.composer.load(DiscussionComposer, {
      user: app.session.user,
      originalContent: '**Problem:** \n**Fix:** \n**Port version:** \n**Found in:** ' + link + '\n',
    });
    // Wie Flarum selbst beim Start aus einem Bereich: Tags und Titel als Felder des Composers
    app.composer.fields.tags = [fixes];
    app.composer.fields.title = Stream(discussion.title());
    app.composer.show();
  }

  // --- Logo-Contest ---------------------------------------------------------------------------------------
  var CONTEST_TAG = 'logo-contest';
  var ENTRY_TEMPLATE = '**Name of the logo:** \n**Idea:** (what it shows, in one or two sentences)\n\n'
    + '**Preview:** attach a PNG, 1024 × 1024, transparent background (the first picture is shown in the gallery)\n'
    + '**Source:** attach the SVG (or AI/PSD) in a zip\n';

  function contestDate(key) {
    var value = app.forum.attribute(key);
    return value ? new Date(value) : null;
  }

  // submit = Einsendungen offen, vote = Abstimmung, closed = vorbei (oder keine Daten gesetzt)
  function contestPhase() {
    var submit = contestDate('bbContestSubmitUntil');
    var vote = contestDate('bbContestVoteUntil');
    var now = new Date();
    if (!submit || !vote) return 'closed';
    return now <= submit ? 'submit' : now <= vote ? 'vote' : 'closed';
  }

  function dayText(date) {
    return date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }) : '';
  }

  // Das Werk = das erste Bild im Eröffnungsbeitrag
  function entryImage(discussion) {
    var post = discussion.firstPost && discussion.firstPost();
    var match = post && /<img[^>]+src="([^"]+)"/.exec(post.contentHtml() || '');
    return match ? match[1].replace(/&amp;/g, '&') : null;
  }

  function submitEntry() {
    if (!app.session.user) return app.modal.show(LogInModal);
    var tag = tagBySlug(CONTEST_TAG);
    app.composer.load(DiscussionComposer, {
      user: app.session.user,
      originalContent: (tag && tag.attribute('template')) || ENTRY_TEMPLATE,
    });
    app.composer.fields.tags = tag ? [tag] : [];
    app.composer.show();
  }

  class LogoContestPage extends Page {
    oninit(vnode) {
      super.oninit(vnode);
      this.entries = null;
      this.rules = null;
      this.sort = 'votes';
      this.busy = null;
      app.setTitle('Logo contest');
      app.setTitleCount(0);
      this.load();
    }

    load() {
      var page = this;
      return app.store.find('discussions', { filter: { tag: CONTEST_TAG }, include: 'firstPost,user,tags', page: { limit: 50 } })
        .then(function (list) {
          page.rules = list.filter(function (d) { return d.isSticky(); })[0] || null;
          page.entries = list.filter(function (d) { return !d.isSticky(); });
        })
        .catch(function () { page.entries = []; })
        .then(function () { m.redraw(); });
    }

    // Stimme geben oder zurücknehmen (= „Gefällt mir“ auf dem Eröffnungsbeitrag); danach neu laden, weil eine neue
    // Stimme die alte für ein anderes Werk entfernt
    vote(discussion) {
      var page = this;
      if (!app.session.user) return app.modal.show(LogInModal);
      var post = app.store.getById('posts', discussion.attribute('bbFirstPostId'));
      if (!post) return;
      page.busy = discussion.id();
      post.save({ isLiked: !discussion.attribute('bbVoted') })
        .then(function () { return page.load(); })
        .catch(function () {})
        .then(function () { page.busy = null; m.redraw(); });
    }

    card(discussion, phase) {
      var page = this;
      var img = entryImage(discussion);
      var votes = discussion.attribute('bbVotes') || 0;
      var voted = discussion.attribute('bbVoted');
      var own = app.session.user && discussion.user() === app.session.user;
      var user = discussion.user();
      var url = app.route.discussion(discussion);
      return m('article.bb-entry' + (voted ? '.is-voted' : ''), [
        m(Link, { className: 'bb-entry-art', href: url }, img ? m('img', { src: img, alt: discussion.title(), loading: 'lazy' }) : m('span', 'No picture yet')),
        m('div.bb-entry-info', [
          m('h3', m(Link, { href: url }, discussion.title())),
          m('p', 'by ' + (user ? user.displayName() : 'a former member') + ' · ' + (discussion.commentCount() - 1) + ' comments'),
        ]),
        phase !== 'submit' ? m('div.bb-entry-vote', [
          m('span.bb-entry-votes', votes + (votes === 1 ? ' vote' : ' votes')),
          phase === 'vote' ? Button.component({
            className: 'Button' + (voted ? ' Button--primary' : ''),
            disabled: page.busy === discussion.id() || own || (app.session.user && !voted && !discussion.attribute('bbCanVote')),
            title: own ? 'You cannot vote for your own logo' : '',
            onclick: function () { page.vote(discussion); },
          }, voted ? 'Your vote' : app.session.user ? 'Vote' : 'Log in to vote') : null,
        ]) : null,
      ]);
    }

    view() {
      var page = this;
      var phase = contestPhase();
      var submit = contestDate('bbContestSubmitUntil');
      var vote = contestDate('bbContestVoteUntil');
      var site = app.forum.attribute('bbforumWebsiteUrl');
      var entries = (this.entries || []).slice().sort(this.sort === 'votes' && phase !== 'submit'
        ? function (a, b) { return (b.attribute('bbVotes') || 0) - (a.attribute('bbVotes') || 0) || b.createdAt() - a.createdAt(); }
        : function (a, b) { return b.createdAt() - a.createdAt(); });
      var status = phase === 'submit'
        ? 'Send in your logo until ' + dayText(submit) + '. Then every member votes until ' + dayText(vote) + ': one vote each, and you can move it.'
        : phase === 'vote'
          ? 'Submissions are closed. Vote until ' + dayText(vote) + ': one vote each, and you can move it.'
          : 'The contest has ended. Thank you to everyone who took part!';

      return m('div.bb-contest', [
        m('div.bb-contest-hero', m('div.container', [
          m('p.bb-contest-eyebrow', 'Community contest'),
          m('h1', 'Design the new launcher logo'),
          m('p.bb-contest-lead', 'The launcher gets a new logo, and you can make it. The winning design becomes the new launcher logo, credited with your name.'),
          m('p.bb-contest-status', status),
          m('div.bb-contest-actions', [
            phase === 'submit' ? Button.component({ className: 'Button Button--primary', onclick: submitEntry }, 'Submit your logo') : null,
            this.rules ? m(Link, { className: 'Button', href: app.route.discussion(this.rules) }, 'Rules & requirements') : null,
            site ? m('a.Button', { href: site + '/logo-contest-template.svg', download: 'logo-contest-template.svg' }, 'Download the template') : null,
          ]),
        ])),
        m('div.container.bb-contest-body', [
          m('div.bb-contest-toolbar', [
            m('span', this.entries ? entries.length + (entries.length === 1 ? ' entry' : ' entries') : ''),
            phase !== 'submit' ? m('div.bb-contest-sort', [
              Button.component({ className: 'Button' + (this.sort === 'votes' ? ' is-active' : ''), onclick: function () { page.sort = 'votes'; } }, 'Most votes'),
              Button.component({ className: 'Button' + (this.sort === 'new' ? ' is-active' : ''), onclick: function () { page.sort = 'new'; } }, 'Newest'),
            ]) : null,
          ]),
          this.entries === null
            ? m(LoadingIndicator)
            : entries.length
              ? m('div.bb-contest-grid', entries.map(function (d) { return page.card(d, phase); }))
              : m('p.bb-contest-empty', phase === 'submit' ? 'No entries yet. Yours could be the first.' : 'No entries.'),
        ]),
      ]);
    }
  }

  app.initializers.add('bbforum', function () {
    app.routes.logoContest = { path: '/logo-contest', component: LogoContestPage };

    extend(HeaderPrimary.prototype, 'items', function (items) {
      var site = app.forum.attribute('bbforumWebsiteUrl');
      var discord = app.forum.attribute('bbforumDiscordUrl');

      // Dieselben Menüpunkte wie auf der Website, "Forum" als aktiver Punkt. "Website" gibt es nur
      // auf dem Handy (im Seitenmenü fehlt das Logo), sonst führt das Logo zur Website.
      if (site) {
        items.add('bb-home', externalLink(site + '/', 'Website'), 60);
        items.add('bb-install', externalLink(site + '/install/', 'Install'), 50);
        items.add('bb-guide', externalLink(site + '/guide/', 'Guide'), 45);
        items.add('bb-best', externalLink(site + '/best-settings/', 'Best settings'), 42);
        items.add('bb-faq', externalLink(site + '/faq/', 'FAQ'), 40);
        items.add('bb-changelog', externalLink(site + '/changelog/', 'Changelog'), 30);
        items.add('bb-supermedo', externalLink(site + '/supermedo/', 'Supermedo'), 25);
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

    // Team-Block in der Seitenleiste (Startseite und Bereiche); für alle der Link zum Logo-Contest, solange er läuft
    extend(IndexPage.prototype, 'navItems', function (items) {
      if (contestPhase() !== 'closed') {
        items.add('bbLogoContest', LinkButton.component({ href: app.route('logoContest'), icon: 'fas fa-trophy' }, 'Logo contest'), 95);
      }
      if (isTeam()) teamNavItems(items);
    });

    // Gelöstes oder beantwortetes Hilfe-Thema als Known Fix sichern (wie „Save the fix“ im Discord)
    extend(DiscussionControls, 'moderationControls', function (items, discussion) {
      var tags = discussion.tags ? discussion.tags() || [] : [];
      var isHelp = tags.some(function (t) { return t && t.slug() === 'help-support'; });
      if (!isHelp || !isTeam()) return;
      items.add('bbSaveFix', Button.component({
        icon: 'bbicon bbicon-key',
        onclick: function () { saveAsKnownFix(discussion); },
      }, 'Save as Known Fix'));
    });

    // Unter dem Banner: Hunter's Dream (schmale Bildschirme) und auf der Startseite (nicht in einem Bereich) der Wegweiser
    override(IndexPage.prototype, 'hero', function (original) {
      var inTag = this.currentTag && this.currentTag();
      return [original(), hd.data ? huntersDreamStrip(hd.data) : null, inTag || guideHidden() ? null : postGuide()];
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
