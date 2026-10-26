// Wird über flarum/extend.php ins Forum eingebunden (kein Build-Schritt nötig).
// - Kopfzeile wie auf der Website (ein Menü für beide): links neben dem Logo Install, Guide, Best settings, FAQ,
//   Changelog, Supermedo, Forum (aktiv) in derselben Schrift, ohne Symbole; rechts die Aktionen, hier Suche, Anmelden und als letzter
//   Knopf Discord wie auf der Website. Website-Links im selben Tab, Discord in einem neuen
//   (auf dem Handy im Seitenmenü, dort zusätzlich "Website")
// - Discord-only-Registrierung: Das Registrieren-Fenster zeigt nur den Discord-Button
// - Live-Zahlen von The Hunter's Dream (aus /api/hunters-dream, siehe extend.php): als Kasten
//   in der Seitenleiste, auf schmalen Bildschirmen als Zeile unter dem Willkommens-Banner
// - Abzeichen: nur die sichtbaren Team-Rollen von Discord (siehe flarum/discord-roles.php)
// - Übersicht unter dem Banner der Startseite: vier Blöcke (neue Hilfe-Fragen, Top-Vorschläge, neue Known Fixes, News)
//   mit je fünf Themen; lässt sich ausblenden (merkt sich der Browser). Seitenleiste: „Start here“ mit den Anleitungen,
//   nur die Bereiche (Themen-Tags wie Crash gibt es als Reiter und im Known-Fixes-Index), Hunter's Dream einklappbar
// - Stimmen: 👍 auf dem Eröffnungsbeitrag (flarum/overview.php). Suggestions zeigen eine Stimmen-Box und sind nach
//   Stimmen sortiert, neue der letzten 7 Tage stehen hervorgehoben darüber; Reiter (?tab=) über Suggestions,
//   Help & Support (Open/Solved/Closed) und Bug Reports; Etiketten Solved, Waiting for an answer, Closed, New
// - Known Fixes: statt der Liste ein Nachschlagewerk nach Thema, mit Suche und „Worked for me“
// - Profile (flarum/profiles.php): Banner, Profilfarbe und Avatar-Deko von Discord; verdiente Effekte (Blutmond-Rahmen
//   und glühender Name für Booster, Messing-Laterne fürs Team, Augen je Insight-Stufe, Phiole für Beta-Tester,
//   Mondlicht-Name für Contest-Sieger); Hunter-Karte (Waffe, Insight, Grafikkarte, VRAM) im Profil
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
  var DiscussionListState = compat['forum/states/DiscussionListState'];
  var PaginatedListState = compat['common/states/PaginatedListState'];
  var GlobalSearchState = compat['forum/states/GlobalSearchState'];
  var DiscussionListItem = compat['forum/components/DiscussionListItem'];
  var PostUser = compat['forum/components/PostUser'];
  var CommentPost = compat['forum/components/CommentPost'];
  var UserCard = compat['forum/components/UserCard'];

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

  // Der Kasten lässt sich auf Titel und Status einklappen (merkt sich der Browser)
  var HD_KEY = 'bbforum.hdCollapsed';
  var hdClosed = null;

  function hdIsCollapsed() {
    if (hdClosed === null) {
      try { hdClosed = localStorage.getItem(HD_KEY) === '1'; } catch (e) { hdClosed = false; }
    }
    return hdClosed;
  }

  function toggleHd() {
    hdClosed = !hdIsCollapsed();
    try { localStorage.setItem(HD_KEY, hdClosed ? '1' : '0'); } catch (e) {}
  }

  function huntersDreamCard(d) {
    // Glocken nur, solange der Server läuft: wie viele gerade Mitspieler (Koop) oder Eindringlinge rufen
    var rows = d.serverOnline ? [['Co-op signs now', d.coopSigns], ['Sinister bells now', d.sinisterBells]] : [];
    rows.push(['Prey slaughtered (24 h)', d.bossClears24h], ['Beasts slain (24 h)', d.kills24h]);
    var closed = hdIsCollapsed();

    return m('div.bb-hd' + (closed ? '.is-collapsed' : ''), [
      m('div.bb-hd-head', [
        m('a.bb-hd-title', { href: HD_URL, target: '_blank', rel: 'noopener' }, "The Hunter's Dream"),
        m('button.bb-hd-toggle', {
          type: 'button',
          'aria-expanded': closed ? 'false' : 'true',
          title: closed ? 'Show the numbers' : 'Hide the numbers',
          onclick: toggleHd,
        }, icon(closed ? 'fas fa-chevron-down' : 'fas fa-chevron-up')),
      ]),
      statusLine(d),
      closed ? null : [
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
      ],
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

  // Übersicht der Startseite: vier Bereiche mit je fünf Themen und einem Satz, wofür der Bereich ist.
  // [Bereich, Überschrift, Sortierung, Satz]; nur Bereiche, die es gibt (Setup legt sie an).
  var DASH = [
    ['help-support', 'New questions', '-createdAt', "Something doesn't work: one topic per problem, with your BB Report Tool zip."],
    ['suggestions', 'Top suggestions', '-bbVotes', 'Ideas for the port, the launcher, this forum or Discord. Vote with 👍.'],
    ['known-fixes', 'New known fixes', '-createdAt', 'Solutions that worked, checked by a helper. Search here first.'],
    ['announcements', 'News', '-createdAt', 'Releases and news from the team.'],
  ];
  var GUIDE_KEY = 'bbforum.guideHidden';
  var dash = { lists: {}, loadedAt: 0, loading: false };

  function guideHidden() {
    try { return localStorage.getItem(GUIDE_KEY) === '1'; } catch (e) { return false; }
  }

  // Höchstens alle zwei Minuten neu laden (beim Zurückkehren auf die Startseite)
  function loadDashboard() {
    if (dash.loading || Date.now() - dash.loadedAt < 120000) return;
    dash.loading = true;
    Promise.all(DASH.map(function (block) {
      return app.store.find('discussions', { filter: { tag: block[0] }, include: 'tags', sort: block[2], page: { limit: 5 } })
        .then(function (list) { dash.lists[block[0]] = list; })
        .catch(function () { dash.lists[block[0]] = []; });
    })).then(function () {
      dash.loading = false;
      dash.loadedAt = Date.now();
      m.redraw();
    });
  }

  function dashRow(discussion, slug) {
    var right = slug === 'suggestions'
      ? m('span.bb-dash-votes', [icon('far fa-thumbs-up'), ' ', discussion.attribute('bbVotes') || 0])
      : statusChip(discussion);
    return m('li', [m(Link, { href: app.route.discussion(discussion) }, discussion.title()), right]);
  }

  function dashboard() {
    loadDashboard();
    var blocks = DASH.map(function (block) {
      var tag = tagBySlug(block[0]);
      if (!tag) return null;
      var list = dash.lists[block[0]];
      var href = app.route('tag', { tags: block[0] });
      return m('section.bb-dash-block', { style: { '--tag': tag.color() || '' } }, [
        m('div.bb-dash-head', [
          tag.icon() ? icon(tag.icon(), { className: 'bb-dash-icon' }) : null,
          m(Link, { className: 'bb-dash-title', href: href }, block[1]),
          m(Link, { className: 'bb-dash-all', href: href }, 'All'),
        ]),
        m('p.bb-dash-hint', block[3]),
        !list ? m('p.bb-dash-hint', '…')
          : list.length ? m('ul.bb-dash-list', list.map(function (d) { return dashRow(d, block[0]); }))
            : m('p.bb-dash-hint', 'No topics yet.'),
      ]);
    }).filter(Boolean);
    if (!blocks.length) return null;
    return m('div.bb-guide', m('div.container', [
      m('div.bb-guide-head', [
        m('h2', 'Overview'),
        m('button.bb-guide-hide', {
          type: 'button',
          'aria-label': 'Hide the overview',
          onclick: function () {
            try { localStorage.setItem(GUIDE_KEY, '1'); } catch (e) {}
            m.redraw();
          },
        }, 'Hide'),
      ]),
      m('div.bb-dash-blocks', blocks),
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
  // Geschlossene Hilfe-Themen (7 Tage ohne Beitrag, flarum/overview.php) zählen nicht mehr als offen
  var TEAM_LISTS = [
    ['bbTeamUnanswered', 'Waiting for an answer', { q: 'tag:help-support is:unanswered -is:locked', sort: 'oldest' }, 'fas fa-hourglass-half'],
    ['bbTeamUnsolved', 'Help not solved yet', { q: 'tag:help-support -is:solved -is:locked', sort: 'latest' }, 'fas fa-life-ring'],
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
          // Die Regeln: angepinnt oder (seit sie nicht mehr angepinnt sind, Startseite) am Titel erkannt
          page.rules = list.filter(function (d) { return d.isSticky() || /^Logo contest: rules/i.test(d.title()); })[0] || null;
          page.entries = list.filter(function (d) { return d !== page.rules && !d.isSticky(); });
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

  // --- Übersicht: Stimmen, Reiter, Etiketten, Known-Fixes-Index, Start here (Nick, 26.10.2026) ------------------------
  var DAY = 86400000;

  // Reiter über den Listen: [Schlüssel in ?tab=, Beschriftung, {sort, view}]; der erste gilt ohne ?tab=.
  // view geht als Filter bbview an die API (flarum/overview.php), sort ist ein Schlüssel der Sortierung (votes = 👍).
  var TABS = {
    suggestions: [
      ['top', 'Top', { sort: 'votes' }],
      ['new', 'New', { sort: 'newest' }],
      ['planned', 'Planned', { view: 'status-planned', sort: 'votes' }],
      ['progress', 'In progress', { view: 'status-in-progress', sort: 'votes' }],
      ['done', 'Done', { view: 'status-done', sort: 'newest' }],
      ['declined', 'Not planned', { view: 'status-not-planned', sort: 'newest' }],
    ],
    'help-support': [
      ['open', 'Open', { view: 'open' }],
      ['solved', 'Solved', { view: 'solved' }],
      ['closed', 'Closed', { view: 'closed' }],
      ['all', 'All', {}],
    ],
    'bug-reports': [
      ['open', 'Open', { view: 'status-open' }],
      ['progress', 'In progress', { view: 'status-in-progress' }],
      ['fixed', 'Fixed', { view: 'status-fixed' }],
      ['all', 'All', {}],
    ],
  };

  // Der aktive Reiter (ohne ?tab= der erste); null außerhalb dieser Bereiche und bei einer Suche
  function activeTab(params) {
    var tabs = params && TABS[params.tags];
    if (!tabs || params.q) return null;
    return tabs.filter(function (t) { return t[0] === params.tab; })[0] || tabs[0];
  }

  function tabBar(params) {
    var tab = activeTab(params);
    if (!tab) return null;
    return m('nav.bb-tabs', { 'aria-label': 'Show' }, TABS[params.tags].map(function (t, i) {
      var route = { tags: params.tags };
      if (i > 0) route.tab = t[0];
      return m(Link, { className: 'bb-tab' + (t === tab ? ' is-active' : ''), href: app.route('tag', route) }, t[1]);
    }));
  }

  function tagSlugs(discussion) {
    return ((discussion.tags && discussion.tags()) || []).filter(Boolean).map(function (t) { return t.slug(); });
  }

  function isNew(discussion) {
    return Date.now() - discussion.createdAt() < 7 * DAY;
  }

  // Etikett in der Themenzeile: Stand einer Hilfe-Frage, „New“ an Vorschlägen der letzten 7 Tage
  function statusChip(discussion) {
    var slugs = tagSlugs(discussion);
    if (slugs.indexOf('help-support') !== -1 && !(discussion.isSticky && discussion.isSticky())) {
      if (discussion.attribute('hasBestAnswer')) return m('span.bb-chip.bb-chip--solved', 'Solved');
      if (discussion.attribute('isLocked')) return m('span.bb-chip.bb-chip--closed', 'Closed');
      if (discussion.commentCount() <= 1) return m('span.bb-chip.bb-chip--waiting', 'Waiting for an answer');
    }
    if (slugs.indexOf('suggestions') !== -1 && isNew(discussion)) return m('span.bb-chip.bb-chip--new', 'New');
    return null;
  }

  // Stimme geben oder zurücknehmen: „Gefällt mir“ auf dem Eröffnungsbeitrag. Sofort zeigen, bei einem Fehler zurück
  // (Flarum meldet ihn selbst, z. B. fehlende Rechte).
  function toggleVote(discussion) {
    if (!app.session.user) return app.modal.show(LogInModal);
    if (discussion.bbBusy) return;
    var id = discussion.attribute('bbFirstPostId');
    var voted = !discussion.attribute('bbVoted');
    var shift = function (on) {
      discussion.pushAttributes({ bbVoted: on, bbVotes: Math.max(0, (discussion.attribute('bbVotes') || 0) + (on ? 1 : -1)) });
    };
    discussion.bbBusy = true;
    shift(voted);
    app.request({
      method: 'PATCH',
      url: app.forum.attribute('apiUrl') + '/posts/' + id,
      body: { data: { type: 'posts', id: String(id), attributes: { isLiked: voted } } },
    })
      .catch(function () { shift(!voted); })
      .then(function () {
        discussion.bbBusy = false;
        m.redraw();
      });
  }

  // label: Knopf mit Text (Known Fixes: „Worked for me“) statt der Box mit der Zahl
  function voteBox(discussion, label) {
    var voted = discussion.attribute('bbVoted');
    return m('button.bb-vote' + (label ? '.bb-vote--inline' : '') + (voted ? '.is-voted' : ''), {
      type: 'button',
      'aria-pressed': voted ? 'true' : 'false',
      title: voted ? 'Take back your 👍' : app.session.user ? 'Give it a 👍' : 'Log in to vote',
      onclick: function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleVote(discussion);
      },
    }, [icon('far fa-thumbs-up'), m('span', label || discussion.attribute('bbVotes') || 0)]);
  }

  function hasVoteBox(discussion) {
    return !!discussion.attribute('bbFirstPostId') && tagSlugs(discussion).indexOf('suggestions') !== -1;
  }

  // Neue Vorschläge der letzten 7 Tage über der nach Stimmen sortierten Liste, damit sie nicht untergehen
  var newIdeas = { list: null, loadedAt: 0, loading: false };

  function newIdeasStrip() {
    if (!newIdeas.loading && Date.now() - newIdeas.loadedAt > 120000) {
      newIdeas.loading = true;
      app.store.find('discussions', { filter: { tag: 'suggestions' }, include: 'tags', sort: '-createdAt', page: { limit: 5 } })
        .then(function (list) { newIdeas.list = list.filter(isNew); })
        .catch(function () { newIdeas.list = []; })
        .then(function () {
          newIdeas.loading = false;
          newIdeas.loadedAt = Date.now();
          m.redraw();
        });
    }
    if (!newIdeas.list || !newIdeas.list.length) return null;
    return m('div.bb-newIdeas', [
      m('div.bb-newIdeas-head', [m('strong', 'New this week'), m('span', 'Fresh ideas: have a look and give them a 👍.')]),
      newIdeas.list.map(function (d) {
        return m('div.bb-newIdeas-item', [
          voteBox(d),
          m(Link, { href: app.route.discussion(d) }, d.title()),
          m('span.bb-chip.bb-chip--new', 'New'),
        ]);
      }),
    ]);
  }

  // Known Fixes als Nachschlagewerk: nach Thema gruppiert, darin zuerst, was am häufigsten geholfen hat
  // (👍 „Worked for me“ plus „solved N× on Discord“ aus den übernommenen Einträgen); Suche über Titel und Text.
  var KF_GROUPS = [
    ['crash', 'Crash'], ['graphics', 'Graphics'], ['fps', 'Performance'], ['launcher', 'Launcher'],
    ['setup', 'Setup & install'], ['online', 'Online & co-op'], ['controls', 'Controls & input'], ['audio', 'Audio'],
    ['saves', 'Saves'], ['', 'Other'],
  ];
  var kf = { list: null, loading: false, query: '' };

  function loadKnownFixes() {
    if (kf.list || kf.loading) return;
    kf.loading = true;
    var all = [];
    var more = function (offset) {
      return app.store.find('discussions', {
        filter: { tag: 'known-fixes' }, include: 'tags,firstPost', sort: '-createdAt', page: { offset: offset, limit: 50 },
      }).then(function (list) {
        all = all.concat(list);
        var next = list.payload && list.payload.links && list.payload.links.next;
        return next && offset < 500 ? more(offset + 50) : null;
      });
    };
    more(0).catch(function () {}).then(function () {
      kf.list = all;
      kf.loading = false;
      m.redraw();
    });
  }

  // Lösung aus dem Eröffnungsbeitrag (Vorlage **Problem:** / **Fix:**), sonst seine erste Zeile; einmal je Thema
  function fixInfo(discussion) {
    if (!discussion.bbFix) {
      var post = discussion.firstPost && discussion.firstPost();
      var html = ((post && post.contentHtml()) || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|h\d)>/gi, '\n');
      var text = new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
      // Die Lösung kann mehrzeilig sein (Liste unter „Fix:“): bis zur nächsten Angabe, zu einer Zeile zusammengezogen
      var fix = /Fix:\s*([\s\S]*?)(?:\n\s*(?:Port version:|Found in:|From:|✅)|$)/i.exec(text);
      var solved = /solved (\d+)×/i.exec(text);
      discussion.bbFix = {
        fix: (fix ? fix[1] : text.trim().split('\n')[0]).replace(/\s+/g, ' ').trim(),
        search: (discussion.title() + ' ' + text).toLowerCase(),
        discord: solved ? Number(solved[1]) : 0,
      };
    }
    return discussion.bbFix;
  }

  function helped(discussion) {
    return (discussion.attribute('bbVotes') || 0) + fixInfo(discussion).discord;
  }

  function fixRow(discussion) {
    var n = helped(discussion);
    return m('div.bb-kf-item', [
      m('div.bb-kf-text', [
        m(Link, { className: 'bb-kf-title', href: app.route.discussion(discussion) }, discussion.title()),
        m('p', fixInfo(discussion).fix),
      ]),
      m('div.bb-kf-side', [
        n ? m('span.bb-kf-count', 'Worked for ' + n) : null,
        voteBox(discussion, 'Worked for me'),
      ]),
    ]);
  }

  function knownFixesIndex() {
    loadKnownFixes();
    if (!kf.list) return m(LoadingIndicator);
    var words = kf.query.toLowerCase().split(/\s+/).filter(Boolean);
    var found = kf.list.filter(function (d) {
      var text = fixInfo(d).search;
      return words.every(function (w) { return text.indexOf(w) !== -1; });
    }).sort(function (a, b) { return helped(b) - helped(a) || b.createdAt() - a.createdAt(); });
    var shown = {};
    var groups = KF_GROUPS.map(function (group) {
      var items = found.filter(function (d) {
        if (shown[d.id()] || (group[0] && tagSlugs(d).indexOf(group[0]) === -1)) return false;
        shown[d.id()] = true;
        return true;
      });
      return items.length ? m('section.bb-kf-group', [m('h3', [group[1], m('span', items.length)]), items.map(fixRow)]) : null;
    }).filter(Boolean);
    return m('div.bb-kf', [
      m('input.FormControl.bb-kf-search', {
        type: 'search',
        placeholder: 'Search a problem or a log line, e.g. code 3',
        'aria-label': 'Search the known fixes',
        value: kf.query,
        oninput: function (e) { kf.query = e.target.value; },
      }),
      groups.length ? groups : m('p.bb-kf-empty', [
        'Nothing found. ',
        m(Link, { href: app.route('tag', { tags: 'help-support' }) }, 'Ask in Help & Support'),
        ' – the helpers know more than this list.',
      ]),
    ]);
  }

  // --- Profile: verdiente Effekte und Discord-Deko (Nick, 26.10.2026: Effekte nur verdient) --------------------------
  function perksOf(user) {
    return (user && user.attribute && user.attribute('bbPerks')) || [];
  }

  // Ein Rahmen (die Discord-Deko ersetzt ihn, sonst Booster vor Laterne) und ein Namens-Effekt (Sieger vor Booster)
  function perkClasses(user) {
    var perks = perksOf(user);
    var classes = [];
    if (user && user.attribute && user.attribute('bbDecoration')) classes.push('bb-hasDeco');
    else if (perks.indexOf('booster') !== -1) classes.push('bb-frame--booster');
    else if (perks.indexOf('lantern') !== -1) classes.push('bb-frame--lantern');
    if (perks.indexOf('winner') !== -1) classes.push('bb-name--winner');
    else if (perks.indexOf('booster') !== -1) classes.push('bb-name--booster');
    return classes.join(' ');
  }

  // Rollen-Schild am Namen (statt Flarums Abzeichen, die bei Discord-Rollen nur Farbpunkte über dem Profilbild waren);
  // der volle Name der Rolle („Great Hunter · Admin“) beim Zeigen
  function rolePill(role) {
    return m('span.bb-role.bb-role--' + role.key, { title: role.title }, role.label);
  }

  // Verdiente Zeichen: [Symbol, Name, was es bedeutet]. Insight trägt seine Stufe (1–4) mit.
  var MARKS = {
    booster: ['fas fa-gem', 'Server Booster', 'Boosts our Discord server and keeps the Dream alive. Thank you!'],
    insight: ['fas fa-eye', 'Insight', 'Earned by helping other hunters. Grows with every level.'],
    beta: ['fas fa-flask', 'Beta tester', 'Tests new builds before they are released.'],
    winner: ['fas fa-moon', 'Contest winner', 'Won a community contest.'],
  };
  var INSIGHT_NAMES = ['Resonant Bell', 'Lamplighter', 'Old Hunter', 'Hunter of the Workshop'];

  function marksOf(user) {
    return perksOf(user).map(function (perk) {
      var level = /^insight(\d)$/.exec(perk);
      var mark = MARKS[level ? 'insight' : perk];
      if (!mark) return null;
      return {
        key: level ? 'insight' : perk,
        icon: mark[0],
        name: level ? 'Insight · ' + INSIGHT_NAMES[Number(level[1]) - 1] : mark[1],
        text: mark[2],
        level: level ? Number(level[1]) : 0,
      };
    }).filter(Boolean);
  }

  // Am Beitrag: kleine Symbole hinter dem Namen, Erklärung beim Zeigen
  function markIcons(user) {
    var marks = marksOf(user);
    return marks.length ? m('span.bb-marks', marks.map(function (mark) {
      return m('span.bb-mark.bb-mark--' + mark.key, { title: mark.name + ': ' + mark.text }, [
        icon(mark.icon),
        mark.level ? m('sup', mark.level) : null,
      ]);
    })) : null;
  }

  // Im Profil: die Zeichen mit Namen, Erklärung beim Zeigen
  function markList(user) {
    var marks = marksOf(user);
    return marks.length ? m('div.bb-markList', marks.map(function (mark) {
      return m('span.bb-markItem.bb-mark--' + mark.key, { title: mark.text }, [icon(mark.icon), ' ', mark.name]);
    })) : null;
  }

  // Grafikkarte und VRAM des Verfassers in Hilfe- und Bug-Themen: die Helfer sehen den Rechner, ohne zu fragen
  function rigItem(post) {
    var user = post.user && post.user();
    var discussion = post.discussion && post.discussion();
    var rig = user && user.attribute('bbRig');
    if (!rig || !discussion) return null;
    var slugs = tagSlugs(discussion);
    if (slugs.indexOf('help-support') === -1 && slugs.indexOf('bug-reports') === -1) return null;
    return m('span.bb-rig', { title: 'Graphics card and video memory, from their Discord roles' }, [icon('fas fa-desktop'), ' ', rig]);
  }

  function hunterCard(user) {
    var hunter = user.attribute('bbHunter');
    if (!hunter) return null;
    var rows = [['Weapon', hunter.weapon], ['Insight', hunter.insight], ['GPU', hunter.gpu], ['VRAM', hunter.vram]]
      .filter(function (row) { return row[1]; });
    return rows.length ? m('div.bb-hunter', rows.map(function (row) {
      return m('span.bb-hunter-item', [m('span', row[0]), m('strong', row[1])]);
    })) : null;
  }

  // „Start here“ in der Seitenleiste: die Anleitungen, die vorher oben angepinnt waren
  var START = [
    [3, 'Read first: common fixes', 'fas fa-first-aid'],
    [2, 'Install guide', 'fas fa-download'],
    [124, 'Best settings', 'fas fa-sliders-h'],
    [1, 'Forum rules', 'fas fa-gavel'],
    [4, 'Post a performance report', 'fas fa-tachometer-alt'],
  ];

  function startItems(items) {
    items.add('bbStartSeparator', Separator.component(), 93);
    items.add('bbStartTitle', m('span.bb-teamTitle', 'Start here'), 92);
    START.forEach(function (entry, i) {
      items.add('bbStart' + entry[0], LinkButton.component({
        href: app.route('discussion', { id: String(entry[0]) }),
        icon: entry[2],
      }, entry[1]), 91 - i);
    });
  }

  app.initializers.add('bbforum', function () {
    app.routes.logoContest = { path: '/logo-contest', component: LogoContestPage };

    // --- Übersicht ---
    if (app.translator.addTranslations) {
      app.translator.addTranslations({ 'core.forum.index_sort.votes_button': 'Most votes' });
    }

    extend(DiscussionListState.prototype, 'sortMap', function (map) {
      map.votes = '-bbVotes';
    });

    // ?tab= kommt mit in die Parameter der Liste; ohne eigene Sortierung gilt die des Reiters (Suggestions: Stimmen)
    extend(GlobalSearchState.prototype, 'params', function (params) {
      var tab = m.route.param('tab');
      if (tab) params.tab = tab;
      var active = activeTab({ tags: m.route.param('tags'), tab: tab, q: params.q });
      if (active && active[2].sort && !params.sort) params.sort = active[2].sort;
    });

    extend(DiscussionListState.prototype, 'requestParams', function (params) {
      var tab = activeTab(this.params);
      if (tab && tab[2].view) {
        params.filter = params.filter || {};
        params.filter.bbview = tab[2].view;
      }
    });

    // Die vom Server vorgeladene erste Seite kennt weder Reiter noch Stimmen-Sortierung: dann selbst laden
    override(DiscussionListState.prototype, 'loadPage', function (original, page) {
      if (activeTab(this.params) || this.params.sort === 'votes') {
        app.preloadedApiDocument();
        return PaginatedListState.prototype.loadPage.call(this, page);
      }
      return original(page);
    });

    extend(DiscussionListItem.prototype, 'elementAttrs', function (attrs) {
      if (hasVoteBox(this.attrs.discussion)) attrs.className = (attrs.className || '') + ' bb-hasVote';
    });

    extend(DiscussionListItem.prototype, 'contentItems', function (items) {
      if (hasVoteBox(this.attrs.discussion)) items.add('bbVote', voteBox(this.attrs.discussion), 110);
    });

    extend(DiscussionListItem.prototype, 'infoItems', function (items) {
      var chip = statusChip(this.attrs.discussion);
      if (chip) items.add('bbStatus', chip, 20);
    });

    // Reiter vor der Sortierung; in Known Fixes statt der Sortierung der Wechsel zwischen Index und Liste
    extend(IndexPage.prototype, 'viewItems', function (items) {
      var params = app.search.params();
      var tabs = tabBar(params);
      if (tabs) items.add('bbTabs', tabs, 10);
      // Suggestions: Top und New ersetzen die Sortierung („Latest“ fiele sonst wieder auf die Stimmen zurück)
      if (tabs && params.tags === 'suggestions') items.remove('sort');
      if (params.tags === 'known-fixes' && !params.q) {
        var asList = params.tab === 'list';
        items.remove('sort');
        items.add('bbKnownFixesView', m(Link, {
          className: 'Button',
          href: app.route('tag', asList ? { tags: 'known-fixes' } : { tags: 'known-fixes', tab: 'list' }),
        }, asList ? 'Show by topic' : 'Show as a list'), 10);
      }
    });

    extend(IndexPage.prototype, 'contentItems', function (items) {
      var params = app.search.params();
      if (params.tags === 'known-fixes' && !params.q && params.tab !== 'list') {
        items.remove('discussionList');
        items.add('bbKnownFixes', knownFixesIndex(), 90);
      }
      var tab = activeTab(params);
      if (params.tags === 'suggestions' && tab && tab[0] === 'top') {
        var strip = newIdeasStrip();
        if (strip) items.add('bbNewIdeas', strip, 95);
      }
    });

    // --- Profile ---
    // Am Beitrag: Rahmen und Namens-Effekt als Klassen, Discord-Deko und Augen liegen über dem Avatar, Phiole am Namen
    extend(PostUser.prototype, 'view', function (vdom) {
      var cls = perkClasses(this.attrs.post && this.attrs.post.user());
      if (cls) vdom.attrs.className = (vdom.attrs.className || '') + ' ' + cls;
    });

    extend(PostUser.prototype, 'linkChildren', function (items, user) {
      if (!user) return;
      var deco = user.attribute('bbDecoration');
      if (deco) items.add('bbDecoration', m('img.bb-deco', { src: deco, alt: '', 'aria-hidden': 'true', loading: 'lazy' }), 1000);
      var role = user.attribute('bbRole');
      if (role) items.add('bbRole', rolePill(role), -100);
      var marks = markIcons(user);
      if (marks) items.add('bbMarks', marks, -110);
    });

    extend(CommentPost.prototype, 'headerItems', function (items) {
      var rig = rigItem(this.attrs.post);
      if (rig) items.add('bbRig', rig, -50);
    });

    // Profilkarte (Profil und Karte beim Zeigen auf einen Namen): Discord-Banner, sonst Discord-Farbe; ein eigenes
    // Titelbild (sycho/flarum-profile-cover, Attribut cover) geht vor. Die Deko liegt per CSS über dem Avatar.
    extend(UserCard.prototype, 'view', function (vdom) {
      var user = this.attrs.user;
      if (!user) return;
      var style = Object.assign({}, vdom.attrs.style || {});
      var classes = perkClasses(user);
      var banner = user.attribute('bbBanner');
      var accent = user.attribute('bbAccent');
      var deco = user.attribute('bbDecoration');
      if (!user.attribute('cover')) {
        if (banner) {
          style['--background-image'] = 'url("' + banner + '")';
          classes += ' bb-hasBanner';
        } else if (accent) {
          style['--usercard-bg'] = accent;
        }
      }
      if (deco) style['--bb-deco'] = 'url("' + deco + '")';
      vdom.attrs.style = style;
      vdom.attrs.className = (vdom.attrs.className || '') + ' ' + classes;
    });

    // Profilkarte: alle Rollen-Schilder oben, darunter die Zeichen, die Hunter-Karte und fürs Team der Discord-Link
    extend(UserCard.prototype, 'infoItems', function (items) {
      var user = this.attrs.user;
      if (!user) return;
      var roles = user.attribute('bbRoles') || [];
      if (roles.length) items.add('bbRoles', m('span.bb-roles', roles.map(rolePill)), 200);
      var marks = markList(user);
      if (marks) items.add('bbMarks', marks, -15);
      var card = hunterCard(user);
      if (card) items.add('bbHunter', card, -20);
      var discord = user.attribute('bbDiscordUrl');
      if (discord) {
        items.add('bbDiscord', m('a.bb-discordLink', { href: discord, target: '_blank', rel: 'noopener', title: 'Only the team sees this' }, [
          icon('fab fa-discord'), ' Open on Discord',
        ]), -30);
      }
    });

    // Seitenleiste: „Start here“ und nur die Bereiche; Themen-Tags (Crash, Graphics …) und „More…“ nicht
    extend(IndexPage.prototype, 'navItems', function (items) {
      startItems(items);
      app.store.all('tags').forEach(function (tag) {
        if (tag.position() === null && items.has('tag' + tag.id())) items.remove('tag' + tag.id());
      });
      if (items.has('moreTags')) items.remove('moreTags');
    });

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

    // Unter dem Banner: Hunter's Dream (schmale Bildschirme) und auf der Startseite (nicht in einem Bereich, keine
    // Suche) die Übersicht
    override(IndexPage.prototype, 'hero', function (original) {
      var inTag = this.currentTag && this.currentTag();
      var home = !inTag && !app.search.params().q && !guideHidden();
      return [original(), hd.data ? huntersDreamStrip(hd.data) : null, home ? dashboard() : null];
    });

    // Keine Gruppen-Abzeichen: als Farbpunkte lagen sie über dem Profilbild und sagten nichts (Nick, 26.10.2026).
    // Die Rolle steht als Schild am Namen (bbRole/bbRoles), Booster und Beta als Zeichen; andere Abzeichen bleiben.
    extend(User.prototype, 'badges', function (items) {
      (this.groups() || []).filter(Boolean).forEach(function (g) {
        if (items.has('group' + g.id())) items.remove('group' + g.id());
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
