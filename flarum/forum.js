// Included in the forum via flarum/extend.php (no build step needed).
// - Header like on the website (one menu for both): to the left of the logo Install, Launcher, Best settings, Online,
//   FAQ, Changelog, Forum (active) in the same font, without icons; on the right the actions, here Search,
//   Log in and, as the last button, Discord like on the website. Website links open in the same tab, Discord in a new
//   one (on phones in the side menu, where "Website" is added as well)
// - Discord-only sign-up: the sign-up window shows only the Discord button
// - Live numbers from SuperMedo Server (from /api/bb-server/summary, see flarum/server-stats.php): as a box in the
//   sidebar, on narrow screens as a line below the welcome banner, leading to bbport.de/server/ (until 29.10.2026 this
//   showed The Hunter's Dream)
// - No group badges: role shields at the name, earned marks after it (flarum/profiles.php)
// - Overview below the banner of the home page: four blocks (new help questions, top suggestions, new Known Fixes,
//   News) with three topics each; can be hidden (the browser remembers it). Sidebar: "Start here" with the guides,
//   only the sections (topic tags such as Crash are available as tabs and in the Known Fixes index), the server box
//   collapsible
// - Votes: 👍 on the opening post (flarum/overview.php). Suggestions show a votes box and are sorted by
//   votes, new ones from the last 7 days are highlighted above them; tabs (?tab=) above Suggestions,
//   Help & Support (Open/Solved/Closed) and Bug Reports; labels Solved, Waiting for an answer, Closed, New
// - Known Fixes: instead of the list a reference sorted by topic, with search and "Worked for me"
// - Profiles (flarum/profiles.php): banner, profile colour and avatar decoration from Discord; earned effects (blood
//   moon frame and glowing name for Boosters, brass lantern for the team, moonlight name for contest winners); Hunter
//   card (weapon, graphics card, VRAM) in the profile. "Profile look" in the settings: what Nitro can do, for everyone
//   (animated profile and cover image, two profile colours), with preview; "Customize profile" on your own profile
// - Team (who may start topics in Known Fixes, i.e. mods and admins): "Team" block in the sidebar with
//   work lists (unanswered, unsolved, open bugs, suggestions) and "Save as Known Fix" on help topics
// - Logo contest: page /logo-contest with all entries (first image in the opening post of a topic in the section
//   Logo Contest), submitting and voting; rules and data in flarum/contest.php, link in the sidebar
// - Top helpers (flarum/helpers.php): box with the top 5 of the last 30 days below the server box (wide screens,
//   otherwise a link in the menu), page /top-helpers (last 30 days and all time), mark for the top 3
// - "My game account" in the member's menu (flarum/supermedo-account.php): to their account on SuperMedo Server,
//   already signed in; only while the forum has the shared key
// The addresses are set by scripts/setup-forum.sh (WEBSITE_URL, DISCORD_INVITE_URL from .env).
(function () {
  var compat = flarum.core.compat;
  var app = compat['forum/app'];
  var extend = compat['common/extend'].extend;
  var override = compat['common/extend'].override;
  var icon = compat['common/helpers/icon'];
  var avatar = compat['common/helpers/avatar'];
  var HeaderPrimary = compat['forum/components/HeaderPrimary'];
  var HeaderSecondary = compat['forum/components/HeaderSecondary'];
  var SessionDropdown = compat['forum/components/SessionDropdown'];
  var LinkButton = compat['common/components/LinkButton'];
  var IndexPage = compat['forum/components/IndexPage'];
  var DiscussionControls = compat['forum/utils/DiscussionControls'];
  var DiscussionComposer = compat['forum/components/DiscussionComposer'];
  var Button = compat['common/components/Button'];
  var SelectDropdown = compat['common/components/SelectDropdown'];
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
  var DiscussionPage = compat['forum/components/DiscussionPage'];
  var DiscussionHero = compat['forum/components/DiscussionHero'];
  var PostStream = compat['forum/components/PostStream'];
  var UserCard = compat['forum/components/UserCard'];
  var SettingsPage = compat['forum/components/SettingsPage'];
  var FieldSet = compat['common/components/FieldSet'];
  var AvatarEditor = compat['forum/components/AvatarEditor'];
  var NotificationGrid = compat['forum/components/NotificationGrid'];
  var Notification = compat['forum/components/Notification'];

  // Website links open in the same tab (website and forum should feel like one site),
  // third-party services such as Discord in a new one
  function externalLink(href, label) {
    return m('a.Button.Button--link.bb-navLink', { href: href }, m('span.Button-label', label));
  }

  // Discord as a button on the far right, like on the website (button rule: Discord blue, see theme/custom.less)
  function discordButton(href) {
    return m('a.Button.bb-discordButton', { href: href, target: '_blank', rel: 'noopener' }, [
      icon('fab fa-discord', { className: 'Button-icon' }),
      m('span.Button-label', 'Discord'),
    ]);
  }

  // Support our server (Medo, 29.10.2026): Supermedo's Buy Me a Coffee, yellow next to Discord. In the header of wide
  // screens the full words don't fit: there the cup with a short "Support" where there is room, otherwise the cup
  // alone; the full words stay as tooltip and for screen readers (theme/custom.less; UX review 29.10.2026: the cup
  // alone only explained itself on hover)
  var SUPPORT_URL = 'https://buymeacoffee.com/supermedo';
  function supportButton() {
    return m('a.Button.bb-supportButton', { href: SUPPORT_URL, target: '_blank', rel: 'noopener', title: 'Support our server' }, [
      m('span.Button-icon', { 'aria-hidden': 'true' }, '\u2615'),
      m('span.Button-label', 'Support our server'),
      m('span.bb-supportShort', { 'aria-hidden': 'true' }, 'Support'),
    ]);
  }

  // "My game account" (flarum/supermedo-account.php): the forum signs the member in on SuperMedo Server. Guests who
  // open the address come back with ?gameAccount=login, log in and then continue there (the tab remembers it for
  // 10 minutes); members without a Discord login come back with ?gameAccount=no-discord and get a notice.
  var GAME_ACCOUNT_STORE = 'bbGameAccount';

  function gameAccountUrl() {
    return app.forum.attribute('baseUrl') + '/supermedo-account';
  }

  function gameAccountReturn() {
    if (!app.forum.attribute('bbSupermedoAccount')) return;
    var params = new URLSearchParams(window.location.search);
    var reason = params.get('gameAccount');
    if (reason) {
      params.delete('gameAccount');
      var rest = params.toString();
      window.history.replaceState(window.history.state, '', window.location.pathname + (rest ? '?' + rest : '') + window.location.hash);
    }
    if (reason === 'no-discord') {
      app.alerts.show({ type: 'error' }, 'Your forum account isn\'t linked to Discord, so SuperMedo Server can\'t tell which game account is yours.');
      return;
    }
    var since = 0;
    try { since = Number(window.sessionStorage.getItem(GAME_ACCOUNT_STORE)) || 0; } catch (e) {}
    if (app.session.user) {
      if (reason !== 'login' && !since) return;
      try { window.sessionStorage.removeItem(GAME_ACCOUNT_STORE); } catch (e) {}
      if (reason === 'login' || Date.now() - since < 600000) window.location.href = gameAccountUrl();
    } else if (reason === 'login') {
      try { window.sessionStorage.setItem(GAME_ACCOUNT_STORE, String(Date.now())); } catch (e) {}
      app.modal.show(LogInModal);
    }
  }

  // Live numbers in the sidebar box and the line on narrow screens (SuperMedo Server, see serverCard below)
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function number(value) {
    return Number(value).toLocaleString('en-US');
  }

  // Count the number up from 0 when it first appears (900 ms, long ease-out); after that it simply stays put
  function countUp(value) {
    return {
      oncreate: function (vnode) {
        if (reducedMotion || !value) return;
        // Change the existing text node instead of replacing textContent, so that Mithril keeps writing
        // later new numbers (refresh every minute) into the same node
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

  // SuperMedo Server (flarum/server-stats.php): box in the sidebar, numbers from
  // /api/bb-server/summary; the title leads to the statistics on the website (/server/, same tab)
  var srv = { data: null, loadedAt: 0, loading: false };

  function loadServer() {
    if (srv.loading || Date.now() - srv.loadedAt < 60000) return;
    srv.loading = true;
    fetch(app.forum.attribute('apiUrl') + '/bb-server/summary')
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) { srv.data = data; })
      .catch(function () {})
      .then(function () {
        srv.loading = false;
        srv.loadedAt = Date.now();
        m.redraw();
      });
  }

  var SRV_KEY = 'bbforum.srvCollapsed';
  var srvClosed = null;

  function srvIsCollapsed() {
    if (srvClosed === null) {
      try { srvClosed = localStorage.getItem(SRV_KEY) === '1'; } catch (e) { srvClosed = false; }
    }
    return srvClosed;
  }

  function toggleSrv() {
    srvClosed = !srvIsCollapsed();
    try { localStorage.setItem(SRV_KEY, srvClosed ? '1' : '0'); } catch (e) {}
  }

  // Opening day ("2026-10-28", set in flarum/server-stats.php, the API has none) and the start of the current run, with
  // date and time, so a young server's numbers aren't measured against old servers (Nick, 29.10.2026)
  function openedDay(iso) {
    var date = new Date(iso + 'T12:00:00Z');
    var year = date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: year });
  }

  function stamp(seconds) {
    return new Date(seconds * 1000).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // The first 30 days after the opening, the server is called new
  function serverIsNew(d) {
    return !!d.opened && Date.now() - Date.parse(d.opened + 'T00:00:00Z') < 30 * 86400000;
  }

  function serverCard(d) {
    var page = (app.forum.attribute('bbforumWebsiteUrl') || '') + '/server/';
    var online = d.status === 'online';
    var closed = srvIsCollapsed();
    var when = [];
    if (d.opened) when.push('Opened ' + openedDay(d.opened));
    if (online && d.awakeSince) when.push('Online since ' + stamp(d.awakeSince));
    // Hosts searching only while the server runs: then a helper knows ringing the Small Resonant Bell pays off
    var rows = [['Record at once', d.peakEver || 0], ['Played today', d.playedToday]];
    if (d.registered) rows.push(['Hunters joined', d.registered]);
    if (online) rows.unshift(['Hosts want help now', (d.bells || {}).hosts_searching || 0]);

    return m('div.bb-hd.bb-srv' + (closed ? '.is-collapsed' : ''), [
      m('div.bb-hd-head', [
        m('a.bb-hd-title', { href: page }, 'SuperMedo Server'),
        m('button.bb-hd-toggle', {
          type: 'button',
          'aria-expanded': closed ? 'false' : 'true',
          title: closed ? 'Show the numbers' : 'Hide the numbers',
          onclick: toggleSrv,
        }, icon(closed ? 'fas fa-chevron-down' : 'fas fa-chevron-up')),
      ]),
      statusLine({ serverOnline: online, online: d.online }),
      when.length ? m('p.bb-srv-new', when.map(function (line) { return m('span', line); })) : null,
      closed ? null : [
        m('dl.bb-hd-stats', rows.map(function (row) {
          return m('div', [m('dt', row[0]), m('dd', countUp(row[1]), number(row[1]))]);
        }).concat(d.fastest ? [m('div', [m('dt', 'Kills fastest'), m('dd', d.fastest.name)])] : [])),
        m('a.bb-hd-more', { href: page }, 'Statistics →'),
      ],
    ]);
  }

  // Narrow screens (no sidebar): one line below the welcome banner, leading to the statistics on the website
  function serverStrip(d) {
    var page = (app.forum.attribute('bbforumWebsiteUrl') || '') + '/server/';
    var online = d.status === 'online';
    var hosts = (d.bells || {}).hosts_searching || 0;
    var extra = online && hosts ? number(hosts) + (hosts === 1 ? ' host wants help' : ' hosts want help') : number(d.playedToday) + ' played today';
    // A new server: its opening and the record say more than the hosts searching right now
    if (serverIsNew(d)) extra = 'opened ' + openedDay(d.opened) + (d.peakEver ? ', record ' + number(d.peakEver) : '');
    return m('div.bb-hdStrip', m('div.container', [
      m('a', { href: page }, [
        statusLine({ serverOnline: online, online: d.online }),
        m('span.bb-hdStrip-name', ' on SuperMedo Server'),
      ]),
      m('span.bb-hdStrip-stat', ' · ' + extra),
    ]));
  }

  // Overview of the home page: four sections with three topics each and a sentence on what the section is for (five
  // until 29.10.2026; titles now wrap to two lines instead of being cut off, phones show only the four headings).
  // [section, heading, sort, sentence, bbview]; only sections that exist (setup creates them).
  var DASH = [
    ['help-support', 'New questions', '-createdAt', "Something doesn't work: one topic per problem, with your report zip (launcher: Help → Save a report)."],
    ['suggestions', 'Top suggestions', '-bbVotes', 'Ideas for the port, the launcher, this forum or Discord. Vote with 👍.', 'active'],
    ['known-fixes', 'New known fixes', '-createdAt', 'Solutions that worked, checked by a helper. Search here first.'],
    ['announcements', 'News', '-createdAt', 'Releases and news from the team.'],
  ];
  var GUIDE_KEY = 'bbforum.guideHidden';
  var dash = { lists: {}, loadedAt: 0, loading: false };

  function guideHidden() {
    try { return localStorage.getItem(GUIDE_KEY) === '1'; } catch (e) { return false; }
  }

  // Reload at most every two minutes (when returning to the home page)
  function loadDashboard() {
    if (dash.loading || Date.now() - dash.loadedAt < 120000) return;
    dash.loading = true;
    Promise.all(DASH.map(function (block) {
      var filter = { tag: block[0] };
      if (block[4]) filter.bbview = block[4];
      return app.store.find('discussions', { filter: filter, include: 'tags', sort: block[2], page: { limit: 3 } })
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
      : statusChip(discussion, true);
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

  // The team is whoever may start topics in Known Fixes (setup-inside.sh: mods only, admins always)
  function isTeam() {
    var fixes = tagBySlug('known-fixes');
    return !!(app.session.user && fixes && fixes.canStartDiscussion());
  }

  // Work lists for the team: search with gambits (is:unanswered from extend.php, is:solved from Best Answer)
  // Closed help topics (7 days without a post, flarum/overview.php) no longer count as open
  var TEAM_LISTS = [
    ['bbTeamUnanswered', 'Waiting for an answer', { q: 'tag:help-support is:unanswered -is:locked', sort: 'oldest' }, 'bbicon bbicon-hourglass'],
    ['bbTeamUnsolved', 'Help not solved yet', { q: 'tag:help-support -is:solved -is:locked', sort: 'latest' }, 'bbicon bbicon-lantern'],
    ['bbTeamBugs', 'Open bugs', { q: 'tag:bug-reports tag:status-open', sort: 'latest' }, 'bbicon bbicon-spider'],
    ['bbTeamIdeas', 'New suggestions', { q: 'tag:suggestions', sort: 'newest' }, 'bbicon bbicon-candle'],
  ];

  function teamNavItems(items) {
    items.add('bbTeamSeparator', Separator.component(), -40);
    items.add('bbTeamTitle', m('span.bb-teamTitle', 'Team'), -41);
    TEAM_LISTS.forEach(function (list, i) {
      items.add(list[0], LinkButton.component({ href: app.route('index', list[2]), icon: list[3] }, list[1]), -42 - i);
    });
  }

  // Status of a suggestion or bug = a status tag (setup-inside.sh: only the team may set them). One click
  // replaces the previous status, a click on the current one removes it. Done, Not planned, Duplicate and Fixed
  // drop out of "Top", "New" and the overview (bbview active) and only appear in their own tab (Nick, 26.10.2026).
  var STATUSES = {
    suggestions: [
      ['status-planned', 'Planned', 'fas fa-map-signs'],
      ['status-in-progress', 'In progress', 'fas fa-hammer'],
      ['status-done', 'Done', 'fas fa-check'],
      ['status-not-planned', 'Not planned', 'fas fa-ban'],
      ['status-duplicate', 'Duplicate', 'far fa-clone'],
    ],
    'bug-reports': [
      ['status-open', 'Open', 'fas fa-bug'],
      ['status-in-progress', 'In progress', 'fas fa-hammer'],
      ['status-fixed', 'Fixed', 'fas fa-check'],
      ['status-duplicate', 'Duplicate', 'far fa-clone'],
    ],
    // Tested mod list (Nick, 28.10.2026): set by the modding role and the mods
    'mods-patches': [
      ['status-works', 'Works', 'fas fa-check'],
      ['status-limits', 'Works with limits', 'fas fa-exclamation-triangle'],
      ['status-broken', 'Doesn\'t work', 'fas fa-ban'],
      ['status-retest', 'Retest', 'fas fa-redo'],
    ],
  };
  var STATUS_HINTS = {
    'mods-patches': 'Modding and mods only. Write the port version and the date of your test in the topic.',
  };

  // The page ships only sections and the most-used extra tags, not the status tags: load all of them once.
  // Topic lists bring along only the statuses they show (Done, Not planned and Duplicate rarely), so check every
  // status of the area, not just the first one (a helper saw only Planned and In progress, 28.10.2026)
  var statusTagsLoading = false;

  function statusOptions(discussion) {
    var slugs = tagSlugs(discussion);
    var area = Object.keys(STATUSES).filter(function (s) { return slugs.indexOf(s) !== -1; })[0];
    if (!area || !discussion.canTag || !discussion.canTag()) return null;
    var missing = STATUSES[area].some(function (s) { return !tagBySlug(s[0]); });
    if (missing && !statusTagsLoading) {
      statusTagsLoading = true;
      (app.tagList ? app.tagList.load(['parent']) : app.store.find('tags')).then(function () { m.redraw(); });
    }
    return STATUSES[area].filter(function (s) {
      var tag = tagBySlug(s[0]);
      return tag && (!tag.canAddToDiscussion || tag.canAddToDiscussion());
    });
  }

  function setStatus(discussion, slug) {
    if (discussion.bbBusy) return;
    var tags = (discussion.tags() || []).filter(function (t) { return t && t.slug().indexOf('status-') !== 0; });
    if (tagSlugs(discussion).indexOf(slug) === -1) tags.push(tagBySlug(slug));
    discussion.bbBusy = true;
    discussion.save({ relationships: { tags: tags } })
      .then(function () {
        // Flarum writes the change into the topic as an event; reload the home page lists on the next visit
        var stream = app.current.get('stream');
        if (stream) stream.update();
        dash.loadedAt = 0;
        newIdeas.loadedAt = 0;
      })
      .catch(function () {}) // Flarum shows the error itself
      .then(function () {
        discussion.bbBusy = false;
        m.redraw();
      });
  }

  // In the topic's menu (phone: ⋮ at the top right, desktop: arrow next to "Reply")
  function statusButtons(discussion, options) {
    var current = tagSlugs(discussion);
    return options.map(function (s) {
      var active = current.indexOf(s[0]) !== -1;
      return Button.component({
        icon: active ? 'fas fa-times' : s[2],
        onclick: function () { setStatus(discussion, s[0]); },
      }, active ? 'Remove status “' + s[1] + '”' : 'Mark as ' + s[1].toLowerCase());
    });
  }

  // Sidebar of the topic (desktop): all states at a glance, the current one highlighted
  function statusPanel(discussion, options) {
    var current = tagSlugs(discussion);
    var area = Object.keys(STATUSES).filter(function (s) { return current.indexOf(s) !== -1; })[0];
    return m('div.bb-statusPanel', [
      m('div.bb-statusPanel-title', 'Status'),
      m('div.bb-statusPanel-options', options.map(function (s) {
        var active = current.indexOf(s[0]) !== -1;
        return m('button.bb-statusOpt' + (active ? '.is-active' : ''), {
          type: 'button',
          disabled: !!discussion.bbBusy,
          'aria-pressed': active ? 'true' : 'false',
          title: active ? 'Click again to remove this status' : 'Set the status to ' + s[1],
          onclick: function () { setStatus(discussion, s[0]); },
        }, [icon(s[2]), ' ', s[1]]);
      })),
      m('p.bb-statusPanel-hint', STATUS_HINTS[area] || 'Team only. Done, Fixed, Not planned and Duplicate take it out of the open lists.'),
    ]);
  }

  // Turn a help topic into a Known Fix: composer in Known Fixes, title and link pre-filled
  function saveAsKnownFix(discussion) {
    var fixes = tagBySlug('known-fixes');
    var link = app.forum.attribute('baseUrl') + app.route.discussion(discussion);
    app.composer.load(DiscussionComposer, {
      user: app.session.user,
      originalContent: '**Problem:** \n**Fix:** \n**Port version:** \n**Found in:** ' + link + '\n',
    });
    // Like Flarum itself when starting from a section: tags and title as fields of the composer
    app.composer.fields.tags = [fixes];
    app.composer.fields.title = Stream(discussion.title());
    app.composer.show();
  }

  // --- Logo contest ---------------------------------------------------------------------------------------
  var CONTEST_TAG = 'logo-contest';
  var ENTRY_TEMPLATE = '**Name of the logo:** \n**Idea:** (what it shows, in one or two sentences)\n\n'
    + '**Preview:** attach a PNG, 1024 × 1024, transparent background (the first picture is shown in the gallery)\n'
    + '**Source:** attach the SVG (or AI/PSD) in a zip\n';

  function contestDate(key) {
    var value = app.forum.attribute(key);
    return value ? new Date(value) : null;
  }

  // submit = submissions open, vote = voting, closed = over (or no dates set)
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

  // The entry = the first image in the opening post
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
          // The rules: pinned or (since they are no longer pinned, home page) recognised by their title
          page.rules = list.filter(function (d) { return d.isSticky() || /^Logo contest: rules/i.test(d.title()); })[0] || null;
          page.entries = list.filter(function (d) { return d !== page.rules && !d.isSticky(); });
        })
        .catch(function () { page.entries = []; })
        .then(function () { m.redraw(); });
    }

    // Give or take back a vote (= "like" on the opening post); then reload, because a new
    // vote removes the old one for another entry
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

  // --- Overview: votes, tabs, labels, Known Fixes index, Start here (Nick, 26.10.2026) -----------------------------
  var DAY = 86400000;

  // Tabs above the lists: [key in ?tab=, label, {sort, view}]; the first one applies without ?tab=.
  // view goes to the API as filter bbview (flarum/overview.php), sort is a key of the sort order (votes = 👍).
  var TABS = {
    suggestions: [
      ['top', 'Top', { view: 'active', sort: 'votes' }],
      ['new', 'New', { view: 'active', sort: 'newest' }],
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
    'mods-patches': [
      ['all', 'All', {}],
      ['works', 'Works', { view: 'status-works' }],
      ['limits', 'Works with limits', { view: 'status-limits' }],
      ['broken', 'Doesn\'t work', { view: 'status-broken' }],
      ['retest', 'Retest', { view: 'status-retest' }],
    ],
  };

  // The active tab (the first one without ?tab=); null outside these sections and during a search
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

  // Label in the topic row: state of a help question, "New" on suggestions from the last 7 days.
  // short: compact for the narrow columns of the overview, so the title stays readable
  function statusChip(discussion, short) {
    var slugs = tagSlugs(discussion);
    if (slugs.indexOf('help-support') !== -1 && !(discussion.isSticky && discussion.isSticky())) {
      if (discussion.attribute('hasBestAnswer')) return m('span.bb-chip.bb-chip--solved', 'Solved');
      if (discussion.attribute('isLocked')) return m('span.bb-chip.bb-chip--closed', 'Closed');
      if (discussion.commentCount() <= 1) {
        return m('span.bb-chip.bb-chip--waiting', { title: 'Waiting for an answer' }, short ? 'No answer' : 'Waiting for an answer');
      }
    }
    if (slugs.indexOf('suggestions') !== -1 && isNew(discussion)) return m('span.bb-chip.bb-chip--new', 'New');
    return null;
  }

  // Give or take back a vote: "like" on the opening post. Show it immediately, revert on an error
  // (Flarum reports it itself, e.g. missing permissions).
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

  // label: button with text (Known Fixes: "Worked for me") instead of the box with the number
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

  // New suggestions from the last 7 days above the list sorted by votes, so they don't get buried
  var newIdeas = { list: null, loadedAt: 0, loading: false };

  function newIdeasStrip() {
    if (!newIdeas.loading && Date.now() - newIdeas.loadedAt > 120000) {
      newIdeas.loading = true;
      app.store.find('discussions', { filter: { tag: 'suggestions', bbview: 'active' }, include: 'tags', sort: '-createdAt', page: { limit: 5 } })
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

  // Known Fixes as a reference: grouped by topic, within each group first what helped most often
  // (👍 "Worked for me" plus "solved N× on Discord" from the imported entries); search over title and text.
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

  // Fix taken from the opening post (template **Problem:** / **Fix:**), otherwise its first line; once per topic
  function fixInfo(discussion) {
    if (!discussion.bbFix) {
      var post = discussion.firstPost && discussion.firstPost();
      var html = ((post && post.contentHtml()) || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|h\d)>/gi, '\n');
      var text = new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
      // The fix can span several lines (list under "Fix:"): up to the next field, collapsed into one line
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

  // Above search results (UX review 29.10.2026): for an error code or message from the FAQ's list a short answer
  // with the link to the FAQ, and the known fixes that match the search, so the checked fix comes before the topics
  // (before, the known fix for code 3 stood at place 16). The normal list follows below unchanged.
  // [pattern, heading, [[case, answer, FAQ anchor]]]. The texts follow the FAQ (website/src/texts/faq.md: error-codes,
  // code-3, crashes): change both together.
  var CODES = [
    [/\bcode\s*1\b|60 ?fps patch/i, 'Error code 1', [
      [null, "The port refuses an eboot.bin with Lance McDonald's 60 fps patch on purpose. Use the clean 1.09 file.", 'game-files'],
    ]],
    [/\b(?:code|error)\s*3\b/i, 'Error code 3', [
      ['Closes right after you press PLAY', 'Windows gives the port too little memory for the start. Let Windows manage the page file, then restart the PC.', 'code-3'],
      ['Crashes later while playing', 'Update to the newest version first: 1.9.5 fixed the most common random crash.', 'crashes'],
    ]],
    [/\b(?:code|error)\s*21\b|error 487/i, 'Error code 21', [
      [null, 'Another program sits where the game needs its memory. From 1.9.5 on the game restarts itself and gets past it, so update.', 'error-codes'],
    ]],
    [/\b(?:code|error)\s*23\b|assertion failed/i, 'Error code 23', [
      [null, "A crash in the graphics part. Its cause isn't known yet and there is no sure fix: update the port and your graphics driver, close overlays like MSI Afterburner and RTSS, and set Advanced > Two-stage GPU pipeline to \"Off (more stable)\". If it keeps happening, post your report zip.", 'error-codes'],
    ]],
    [/device ?lost/i, '"device lost"', [
      [null, "The graphics driver stopped. Update the driver and restart the PC, use the card's standard clocks and close overlays. Some NVIDIA cards still hit it in fights, a known problem that isn't fixed yet: send a report.", 'error-codes'],
    ]],
    [/failed to connect to (?:the )?bloodborne server|certificate is not trusted|ssl server verification/i, '"Failed to connect to Bloodborne server"', [
      [null, "Fixed in 1.9.6: the port now trusts SuperMedo Server and The Hunter's Dream even where Windows hasn't downloaded the newest root certificates yet. Update (the launcher offers it), then try again.", 'online-connection'],
    ]],
    [/rejected this client|login error (?:code )?5\b/i, 'Login error code 5', [
      [null, "shadNet doesn't accept the port. Choose SuperMedo Server.", 'online-connection'],
    ]],
  ];
  // Known fixes for the current search: loaded once per search text; on an error the block simply stays away
  var kfSearch = { q: null, list: null };

  function searchHelp(q) {
    var code = CODES.filter(function (c) { return c[0].test(q); })[0];
    if (kfSearch.q !== q) {
      kfSearch.q = q;
      kfSearch.list = null;
      app.store.find('discussions', { filter: { q: q + ' tag:known-fixes' }, include: 'tags,firstPost', page: { limit: 6 } })
        .then(function (list) { if (kfSearch.q === q) kfSearch.list = list; })
        .catch(function () { if (kfSearch.q === q) kfSearch.list = []; })
        .then(function () { m.redraw(); });
    }
    // Only fixes that contain every word of the search, like the Known Fixes page; for an error code only fixes
    // about that code ("code 3" also finds the fix for code 23, and any fix that mentions 1.9.3)
    var words = q.toLowerCase().split(/\s+/).filter(Boolean);
    var fixes = (kfSearch.list || []).filter(function (d) {
      var text = fixInfo(d).search;
      return code ? code[0].test(text) : words.every(function (w) { return text.indexOf(w) !== -1; });
    }).slice(0, 3);
    if (!code && !fixes.length) return null;
    var site = app.forum.attribute('bbforumWebsiteUrl') || '';
    // The grid inside the container: Flarum's container has clearfix pseudo-elements that would become grid cells
    return m('div.bb-searchHelp', m('div.container', m('div.bb-searchHelp-grid', [
      code ? m('section.bb-answer', [
        m('p.bb-answer-kicker', 'From the FAQ'),
        m('h2.bb-answer-title', code[1]),
        m('div.bb-answer-cases', code[2].map(function (c) {
          return m('div.bb-answer-case', [
            c[0] ? m('h3', c[0]) : null,
            m('p', c[1]),
            m('a', { href: site + '/faq/#' + c[2] }, 'Read it in the FAQ'),
          ]);
        })),
        m('p.bb-answer-ask', [
          "Didn't help? ",
          m(Link, { href: app.route('tag', { tags: 'help-support' }) }, 'Ask in Help & Support'),
          ' with your report zip (launcher: Help → Save a report).',
        ]),
      ]) : null,
      fixes.length ? m('section.bb-kf.bb-searchFixes', [
        m('h2', ['Known fixes', m('span', 'checked by a helper')]),
        fixes.map(fixRow),
        m(Link, { className: 'bb-searchFixes-all', href: app.route('tag', { tags: 'known-fixes' }) }, 'All known fixes'),
      ]) : null,
    ])));
  }

  // --- Profiles: earned effects and Discord decoration (Nick, 26.10.2026: effects only when earned) ----------------
  function perksOf(user) {
    return (user && user.attribute && user.attribute('bbPerks')) || [];
  }

  // One frame (the Discord decoration replaces it, otherwise Booster before lantern) and one name effect
  // (winner before Booster)
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

  // Role shield at the name (instead of Flarum's badges, which for Discord roles were only colour dots above the
  // profile picture); the full name of the role ("Great Hunter · Admin") on hover
  function rolePill(role) {
    return m('span.bb-role.bb-role--' + role.key, { title: role.title }, role.label);
  }

  // Earned marks: [icon, name, what it means]. Insight carries its level (1–4) along.
  var MARKS = {
    booster: ['fas fa-gem', 'Server Booster', 'Boosts our Discord server and keeps the Dream alive. Thank you!'],
    insight: ['fas fa-eye', 'Insight', 'Earned by helping other hunters. Grows with every level.'],
    beta: ['fas fa-flask', 'Beta tester', 'Tests new builds before they are released.'],
    winner: ['fas fa-moon', 'Contest winner', 'Won a community contest.'],
    tophelper: ['fas fa-hands-helping', 'Top helper', 'One of the three members who helped most in the last 30 days. Thank you!'],
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

  // On a post: small icons after the name, explanation on hover
  function markIcons(user) {
    var marks = marksOf(user);
    return marks.length ? m('span.bb-marks', marks.map(function (mark) {
      return m('span.bb-mark.bb-mark--' + mark.key, { title: mark.name + ': ' + mark.text }, [
        icon(mark.icon),
        mark.level ? m('sup', mark.level) : null,
      ]);
    })) : null;
  }

  // In the profile: the marks with names, explanation on hover
  function markList(user) {
    var marks = marksOf(user);
    return marks.length ? m('div.bb-markList', marks.map(function (mark) {
      return m('span.bb-markItem.bb-mark--' + mark.key, { title: mark.text }, [icon(mark.icon), ' ', mark.name]);
    })) : null;
  }

  // Graphics card and VRAM of the author in help and bug topics: the helpers see the machine without having to ask.
  // For the team only if they opened the topic themselves (otherwise the helper's machine is just noise).
  function rigItem(post) {
    var user = post.user && post.user();
    var discussion = post.discussion && post.discussion();
    var rig = user && user.attribute('bbRig');
    if (!rig || !discussion) return null;
    if (user.attribute('bbRole') && discussion.user && discussion.user() !== user) return null;
    var slugs = tagSlugs(discussion);
    if (slugs.indexOf('help-support') === -1 && slugs.indexOf('bug-reports') === -1) return null;
    return m('span.bb-rig', { title: 'Graphics card and video memory, from their Discord roles' }, [icon('fas fa-desktop'), ' ', rig]);
  }

  // --- Profile look: what Discord Nitro can do for a profile, for everyone (Nick, 26.10.2026) -----------------------
  // Profile colours like Nitro's "Profile themes": [name, top, bottom]
  var THEMES = [
    ['Blood moon', '#8a1118', '#1a0507'],
    ["Hunter's Dream", '#b89a64', '#2b2a35'],
    ['Moonlight', '#9fb3c8', '#121820'],
    ['Cainhurst', '#6b7f9e', '#1b1f2b'],
    ['Nightmare', '#4a2d5c', '#0d0812'],
    ['Old Yharnam', '#9a5a2a', '#1a0f08'],
    ['Byrgenwerth', '#3f6b4a', '#0c140f'],
    ['Fishing Hamlet', '#2f5e6b', '#081215'],
  ];
  // theme: draft (preview only, until "Save colours")
  var look = { theme: null, busy: false, coverBusy: false };

  function themeOf(user) {
    if (look.theme && app.session.user && app.session.user === user) return look.theme;
    return user.attribute('bbTheme');
  }

  function saveTheme(user, theme) {
    look.busy = true;
    user.save({ bbTheme: theme })
      .then(function () { look.theme = null; })
      .catch(function () {})
      .then(function () {
        look.busy = false;
        m.redraw();
      });
  }

  // Cover image via the interface of the cover image plugin (sycho/flarum-profile-cover)
  function coverRequest(user, method, file) {
    var body;
    if (file) {
      body = new FormData();
      body.append('cover', file);
    }
    look.coverBusy = true;
    app.request({
      method: method,
      url: app.forum.attribute('apiUrl') + '/users/' + user.id() + '/cover',
      serialize: function (raw) { return raw; },
      body: body,
    })
      .then(function (payload) { if (payload) app.store.pushPayload(payload); })
      .catch(function () {})
      .then(function () {
        look.coverBusy = false;
        m.redraw();
      });
  }

  function lookRow(label, content) {
    return m('div.bb-look-row', [m('div.bb-look-label', label), m('div.bb-look-field', content)]);
  }

  function profileLook(user) {
    var theme = themeOf(user);
    var saved = user.attribute('bbTheme');
    var draft = !!look.theme;
    var hasCover = !!user.attribute('cover');
    var maxCover = Math.round((parseFloat(app.forum.attribute('sycho-profile-cover.max_size')) || 2048) / 1024);
    return m('div.bb-look', [
      m('p.helpText', 'Everything Discord Nitro lets you change on your profile, free for every hunter here. Until you pick '
        + 'something yourself, the forum uses your Discord picture, banner and colour.'),
      m('div.bb-look-grid', [
        m('div.bb-look-controls', [
          lookRow('Avatar', [
            AvatarEditor.component({ user: user, className: 'bb-look-avatar' }),
            m('p.helpText', 'Click it to change it. JPG, PNG or GIF: animated GIFs stay animated (up to 2 MB).'),
          ]),
          lookRow('Banner', [
            m('div.bb-look-buttons', [
              m('label.Button' + (look.coverBusy ? '.disabled' : ''), [
                icon('fas fa-image'), ' ', hasCover ? 'Change banner' : 'Upload banner',
                m('input[type=file][accept=image/*].bb-look-file', {
                  disabled: look.coverBusy,
                  onchange: function (e) {
                    var file = e.target.files && e.target.files[0];
                    if (file) coverRequest(user, 'POST', file);
                    e.target.value = '';
                  },
                }),
              ]),
              hasCover ? Button.component({
                className: 'Button Button--link',
                disabled: look.coverBusy,
                onclick: function () { coverRequest(user, 'DELETE'); },
              }, user.attribute('bbBanner') ? 'Use my Discord banner' : 'Remove') : null,
            ]),
            m('p.helpText', 'A wide picture, about 3:1. Animated GIFs stay animated (up to ' + maxCover + ' MB).'),
          ]),
          lookRow('Profile colours', [
            m('div.bb-look-swatches', THEMES.map(function (t) {
              var active = theme && theme[0] === t[1] && theme[1] === t[2];
              return m('button.bb-look-swatch' + (active ? '.is-active' : ''), {
                type: 'button',
                title: t[0],
                'aria-label': t[0],
                style: { background: 'linear-gradient(160deg, ' + t[1] + ', ' + t[2] + ')' },
                onclick: function () { look.theme = [t[1], t[2]]; },
              });
            })),
            m('div.bb-look-pickers', [
              m('label', ['Top ', m('input[type=color]', {
                value: (theme || ['#8a1118'])[0],
                oninput: function (e) { look.theme = [e.target.value, (theme || [null, '#1a0507'])[1]]; },
              })]),
              m('label', ['Bottom ', m('input[type=color]', {
                value: (theme || [null, '#1a0507'])[1],
                oninput: function (e) { look.theme = [(theme || ['#8a1118'])[0], e.target.value]; },
              })]),
            ]),
            m('div.bb-look-buttons', [
              Button.component({
                className: 'Button Button--primary',
                disabled: !draft || look.busy,
                onclick: function () { saveTheme(user, look.theme); },
              }, 'Save colours'),
              draft ? Button.component({
                className: 'Button Button--link',
                onclick: function () { look.theme = null; },
              }, 'Cancel') : null,
              !draft && saved ? Button.component({
                className: 'Button Button--link',
                disabled: look.busy,
                onclick: function () { saveTheme(user, null); },
              }, 'Use my Discord colour') : null,
            ]),
          ]),
          lookRow('About me', m('p.helpText', [
            'Write a few lines on ',
            m(Link, { href: app.route.user(user) }, 'your profile'),
            ' (click the empty "Write something about yourself" box).',
          ])),
        ]),
        m('div.bb-look-preview', [
          m('div.bb-look-label', 'Preview'),
          UserCard.component({ user: user, className: 'bb-look-card', controlsButtonClassName: 'Button Button--icon Button--flat' }),
        ]),
      ]),
    ]);
  }

  function hunterCard(user) {
    var hunter = user.attribute('bbHunter');
    if (!hunter) return null;
    // Insight is already shown above as a mark
    var rows = [['Weapon', hunter.weapon], ['GPU', hunter.gpu], ['VRAM', hunter.vram]]
      .filter(function (row) { return row[1]; });
    return rows.length ? m('div.bb-hunter', rows.map(function (row) {
      return m('span.bb-hunter-item', [m('span', row[0]), m('strong', row[1])]);
    })) : null;
  }

  // "Start here" in the sidebar: the guides that used to be pinned at the top
  var START = [
    [3, 'Read first: common fixes', 'bbicon bbicon-scroll'],
    [2, 'Install guide', 'bbicon bbicon-download'],
    [124, 'Best settings', 'bbicon bbicon-gears'],
    [1, 'Forum rules', 'bbicon bbicon-gavel'],
    [4, 'Post a performance report', 'bbicon bbicon-chart'],
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

  // Sections inside a topic too (Zed, 28.10.2026: switch sections without going back): the home page's sidebar list
  // (navItems) with the topic's section highlighted, as a column on the left; custom.less shows it on wide screens
  // only. flarum/tags takes the active section from currentTag(), the other navItems extensions need nothing from
  // the page.
  function sectionNav(discussion) {
    var section = (discussion.tags() || []).filter(function (t) { return t && t.position() !== null && !t.isChild(); })[0];
    var index = Object.create(IndexPage.prototype);
    index.currentTag = function () { return section; };
    return m('nav.sideNav.bb-sectionNav', { 'aria-label': 'Forum sections' }, m('ul', m('li.item-nav', SelectDropdown.component({
      buttonClassName: 'Button',
      accessibleToggleLabel: app.translator.trans('core.forum.index.toggle_sidenav_dropdown_accessible_label'),
    }, IndexPage.prototype.navItems.call(index).toArray()))));
  }

  // --- Top helpers (flarum/helpers.php, Nick 28.10.2026) ----------------------------------------------------------
  // Reload at most every 10 minutes (the server recalculates every 30); without data the box stays hidden
  var helpers = { data: null, loadedAt: 0, loading: false };

  function loadHelpers() {
    if (helpers.loading || Date.now() - helpers.loadedAt < 600000) return;
    helpers.loading = true;
    // No error box for visitors if the list can't be loaded: the box simply stays away
    app.request({ method: 'GET', url: app.forum.attribute('apiUrl') + '/bb-top-helpers', errorHandler: function () {} })
      .then(function (payload) {
        app.store.pushPayload(payload);
        helpers.data = payload.meta || null;
      })
      .catch(function () {})
      .then(function () {
        helpers.loading = false;
        helpers.loadedAt = Date.now();
        m.redraw();
      });
  }

  // [{user, solved, fixes, topics, points}] for 'month' (last 30 days) or 'all'
  function helperList(period) {
    return ((helpers.data && helpers.data[period]) || []).map(function (row) {
      return Object.assign({ user: app.store.getById('users', String(row.id)) }, row);
    }).filter(function (row) { return row.user; });
  }

  function count(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  // Short in the box (solved and topics, one line), complete on the page
  function helperStats(row, full) {
    var parts = [];
    if (row.solved) parts.push(full ? count(row.solved, 'solution', 'solutions') : row.solved + ' solved');
    if (full && row.fixes) parts.push(count(row.fixes, 'Known Fix', 'Known Fixes'));
    if (row.topics) parts.push((full ? 'helped in ' : '') + count(row.topics, 'topic', 'topics'));
    return parts.join(' · ');
  }

  var HELPERS_RULE = "How it counts: a solution (your reply is the best answer in someone else's topic) 5 points, a Known " +
    'Fix you wrote 3, every Help & Support or Bug Reports topic of another member you replied in 1. ' +
    'BB-Helper and the admins are not ranked.';

  function helpersCard() {
    var rows = helperList('month').slice(0, 5);
    if (!rows.length) return null;
    return m('div.bb-hd.bb-helpers', [
      m(Link, { className: 'bb-hd-title', href: app.route('topHelpers') }, 'Top helpers'),
      m('p.bb-helpers-period', 'Last 30 days'),
      m('ol.bb-helpers-list', rows.map(function (row, i) {
        return m('li', m(Link, { href: app.route.user(row.user), title: helperStats(row, true) }, [
          m('span.bb-helpers-rank', i + 1),
          avatar(row.user, { loading: 'lazy' }),
          m('span.bb-helpers-who', [
            m('span.bb-helpers-name', row.user.displayName()),
            m('span.bb-helpers-stats', helperStats(row)),
          ]),
        ]));
      })),
      m(Link, { className: 'bb-hd-more', href: app.route('topHelpers') }, 'All top helpers →'),
    ]);
  }

  class TopHelpersPage extends Page {
    oninit(vnode) {
      super.oninit(vnode);
      this.period = 'month';
      app.setTitle('Top helpers');
      app.setTitleCount(0);
      // Fresh numbers when the page opens
      helpers.loadedAt = 0;
      loadHelpers();
    }

    role(user) {
      var role = user.attribute('bbRole');
      return role ? rolePill(role) : null;
    }

    view() {
      var page = this;
      var rows = helperList(this.period);
      var body;
      if (!helpers.data) {
        body = helpers.loading ? m(LoadingIndicator) : m('p.bb-helpers-empty', 'The list could not be loaded. Please try again later.');
      } else if (!rows.length) {
        body = m('p.bb-helpers-empty', 'Nobody has helped enough to be listed yet. Answer a question in Help & Support and you could be first.');
      } else {
        body = [
          m('ol.bb-helpers-top', rows.slice(0, 3).map(function (row, i) {
            return m('li', m(Link, { href: app.route.user(row.user) }, [
              m('span.bb-helpers-place', i + 1),
              avatar(row.user),
              m('strong.bb-helpers-name', row.user.displayName()),
              page.role(row.user),
              m('span.bb-helpers-stats', helperStats(row, true)),
              m('span.bb-helpers-points', count(row.points, 'point', 'points')),
            ]));
          })),
          rows.length > 3 ? m('ol.bb-helpers-rows', rows.slice(3).map(function (row, i) {
            return m('li', m(Link, { href: app.route.user(row.user) }, [
              m('span.bb-helpers-rank', i + 4),
              avatar(row.user, { loading: 'lazy' }),
              m('span.bb-helpers-who', [m('span.bb-helpers-name', row.user.displayName()), page.role(row.user)]),
              m('span.bb-helpers-stats', helperStats(row, true)),
              m('span.bb-helpers-points', count(row.points, 'pt', 'pts')),
            ]));
          })) : null,
        ];
      }

      return m('div.bb-helpersPage', [
        m('div.bb-contest-hero', m('div.container', [
          m('p.bb-contest-eyebrow', 'Thank you'),
          m('h1', 'Top helpers'),
          m('p.bb-contest-lead', 'They answer questions, test fixes and write them down, so the next hunter finds the answer faster. A lot of what works here works because of them.'),
        ])),
        m('div.container.bb-helpers-body', [
          m('nav.bb-tabs', { 'aria-label': 'Period' }, [['month', 'Last 30 days'], ['all', 'All time']].map(function (p) {
            return m('button.bb-tab' + (page.period === p[0] ? '.is-active' : ''), {
              type: 'button',
              'aria-pressed': page.period === p[0] ? 'true' : 'false',
              onclick: function () { page.period = p[0]; },
            }, p[1]);
          })),
          body,
          m('p.bb-helpers-rule', [
            HELPERS_RULE + ' The top 3 of the last 30 days wear the Top helper mark ',
            m('span.bb-mark.bb-mark--tophelper', icon('fas fa-hands-helping')),
            ' next to their name.',
          ]),
        ]),
      ]);
    }
  }

  app.initializers.add('bbforum', function () {
    app.routes.logoContest = { path: '/logo-contest', component: LogoContestPage };
    app.routes.topHelpers = { path: '/top-helpers', component: TopHelpersPage };

    // --- Overview ---
    if (app.translator.addTranslations) {
      app.translator.addTranslations({ 'core.forum.index_sort.votes_button': 'Most votes' });
    }

    extend(DiscussionListState.prototype, 'sortMap', function (map) {
      map.votes = '-bbVotes';
    });

    // ?tab= is added to the list's parameters; without a sort of its own, the tab's sort applies (Suggestions: votes)
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

    // The first page preloaded by the server knows neither tabs nor the votes sort: so load it ourselves
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

    // Tabs before the sort; in Known Fixes the switch between index and list instead of the sort
    extend(IndexPage.prototype, 'viewItems', function (items) {
      var params = app.search.params();
      var tabs = tabBar(params);
      if (tabs) items.add('bbTabs', tabs, 10);
      // Best Answer's own filter ("All questions") would do the same as the tabs
      if (tabs && items.has('solved-filter')) items.remove('solved-filter');
      // Bring back the hidden overview (home page; "Hide" would otherwise be permanent, Nick 26.10.2026)
      if (!params.tags && !params.q && guideHidden()) {
        items.add('bbShowGuide', Button.component({
          className: 'Button',
          icon: 'fas fa-th-large',
          onclick: function () {
            try { localStorage.removeItem(GUIDE_KEY); } catch (e) {}
          },
        }, 'Show overview'), 5);
      }
      // Suggestions: Top and New replace the sort ("Latest" would otherwise fall back to sorting by votes)
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
    // On a post: frame and name effect as classes, Discord decoration and eyes sit above the avatar,
    // vial at the name
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

    // Profile card (profile, and the card when hovering over a name): Discord banner, otherwise Discord colour; a
    // custom cover image (sycho/flarum-profile-cover, attribute cover) takes precedence. The decoration sits above
    // the avatar via CSS.
    extend(UserCard.prototype, 'view', function (vdom) {
      var user = this.attrs.user;
      if (!user) return;
      var style = Object.assign({}, vdom.attrs.style || {});
      var classes = perkClasses(user);
      var banner = user.attribute('bbBanner');
      var accent = user.attribute('bbAccent');
      var deco = user.attribute('bbDecoration');
      var theme = themeOf(user);
      if (user.attribute('cover')) {
        classes += ' bb-hasCover';
      } else if (banner) {
        style['--background-image'] = 'url("' + banner + '")';
        classes += ' bb-hasBanner';
      } else if (accent && !theme) {
        style['--usercard-bg'] = accent;
      }
      // Custom profile colours: gradient on the card; with an image on it they tint the darkening at the bottom
      if (theme) {
        style['--bb-theme1'] = theme[0];
        style['--bb-theme2'] = theme[1];
        classes += ' bb-themed';
      }
      if (deco) style['--bb-deco'] = 'url("' + deco + '")';
      vdom.attrs.style = style;
      vdom.attrs.className = (vdom.attrs.className || '') + ' ' + classes;
    });

    // Profile card: all role shields at the top, below them the marks, the Hunter card and, for the team,
    // the Discord link
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
      // On your own profile, the way to "Profile look" (not in the settings themselves)
      if (app.session.user === user && !app.current.matches(SettingsPage)) {
        items.add('bbCustomize', m(Link, { className: 'bb-customizeLink', href: app.route('settings') }, [
          icon('fas fa-paint-brush'), ' Customize profile',
        ]), -40);
      }
    });

    // Notifications (flarum/discord-notify.php): column "Discord" instead of "Email" (the forum sends no
    // emails). As long as the messages in Discord are still off, only admins see the column (to preview it).
    function discordNotifyVisible() {
      return !!app.forum.attribute('bbDiscordNotify') || !!(app.session.user && app.session.user.isAdmin());
    }

    extend(NotificationGrid.prototype, 'notificationMethods', function (items) {
      if (items.has('email')) items.remove('email');
      if (discordNotifyVisible()) {
        items.add('discord', { name: 'discord', icon: 'fab fa-discord', label: 'Discord' });
      }
    });

    extend(NotificationGrid.prototype, 'notificationTypes', function (items) {
      items.add('statusChanged', {
        name: 'statusChanged',
        icon: 'fas fa-flag',
        label: 'Someone changes the status of my suggestion or bug report',
      });
    });

    override(NotificationGrid.prototype, 'view', function (original) {
      var vdom = original();
      if (!discordNotifyVisible()) return vdom;
      var note = app.forum.attribute('bbDiscordNotify')
        ? 'Discord: BB Helper pings you in your own private “Forum inbox” thread on our Discord server. Other members can’t see it.'
        : 'Discord column: only admins see it until the Discord inbox is switched on.';
      return m('div', [vdom, m('p.helpText.bb-discordNote', [icon('fab fa-discord'), ' ', note])]);
    });

    // Notification in the bell: status of a suggestion or bug changed
    class StatusChangedNotification extends Notification {
      icon() {
        return 'fas fa-flag';
      }

      href() {
        var discussion = this.attrs.notification.subject();
        return discussion ? app.route.discussion(discussion) : '';
      }

      content() {
        var user = this.attrs.notification.fromUser();
        var status = (this.attrs.notification.content() || {}).status || '';
        var name = (tagBySlug(status) && tagBySlug(status).name()) || status.replace(/^status-/, '').replace(/-/g, ' ');
        return [m('strong', user ? user.displayName() : 'Someone'), ' set the status to ', m('strong', name)];
      }

      excerpt() {
        var discussion = this.attrs.notification.subject();
        return discussion && discussion.title ? discussion.title() : null;
      }
    }
    app.notificationComponents.statusChanged = StatusChangedNotification;

    // Settings: "Profile look" as the first section
    extend(SettingsPage.prototype, 'settingsItems', function (items) {
      if (!app.session.user) return;
      items.add('bbLook', FieldSet.component({ label: 'Profile look', className: 'Settings-bbLook' }, profileLook(app.session.user)), 110);
    });

    // Sidebar: "Start here" and only the sections; no topic tags (Crash, Graphics …) and no "More…"
    extend(IndexPage.prototype, 'navItems', function (items) {
      startItems(items);
      app.store.all('tags').forEach(function (tag) {
        if (tag.position() === null && items.has('tag' + tag.id())) items.remove('tag' + tag.id());
      });
      if (items.has('moreTags')) items.remove('moreTags');
      // "Tags" in the same icon set as the sections (flarum/tags brings a Font Awesome icon)
      var tagsLink = items.has('tags') ? items.get('tags') : null;
      if (tagsLink && tagsLink.attrs) tagsLink.attrs.icon = 'bbicon bbicon-tag';
    });

    extend(HeaderPrimary.prototype, 'items', function (items) {
      var site = app.forum.attribute('bbforumWebsiteUrl');
      var discord = app.forum.attribute('bbforumDiscordUrl');

      // The same menu items as on the website, "Forum" as the active item. "Website" exists only
      // on phones (the side menu has no logo), otherwise the logo leads to the website.
      if (site) {
        items.add('bb-home', externalLink(site + '/', 'Website'), 60);
        items.add('bb-install', externalLink(site + '/install/', 'Install'), 50);
        items.add('bb-guide', externalLink(site + '/guide/', 'Launcher'), 45);
        items.add('bb-best', externalLink(site + '/best-settings/', 'Best settings'), 42);
        items.add('bb-online', externalLink(site + '/server/', 'Online'), 41);
        items.add('bb-faq', externalLink(site + '/faq/', 'FAQ'), 40);
        items.add('bb-changelog', externalLink(site + '/changelog/', 'Changelog'), 30);
        items.add('bb-forum', LinkButton.component({
          href: app.route('index'),
          className: 'Button Button--link bb-navLink bb-navLink--current',
        }, 'Forum'), 20);
      }
    });

    // On the right, after Search and Log in: Discord as the last button, like on the website
    extend(HeaderSecondary.prototype, 'items', function (items) {
      var discord = app.forum.attribute('bbforumDiscordUrl');
      items.add('bb-support', supportButton(), -99);
      if (discord) items.add('bb-discord', discordButton(discord), -100);
    });

    // "My game account" in the member's menu, below the profile; SuperMedo Server is a third-party service, so a new
    // tab like Discord. Only while the forum has the key (forum attribute, flarum/supermedo-account.php)
    extend(SessionDropdown.prototype, 'items', function (items) {
      if (!app.forum.attribute('bbSupermedoAccount')) return;
      items.add('bbGameAccount', LinkButton.component({
        href: gameAccountUrl(),
        icon: 'fas fa-gamepad',
        external: true,
        target: '_blank',
        rel: 'noopener',
      }, 'My game account'), 90);
    });

    // Back from /supermedo-account (?gameAccount=…): after startup, when the login window can open
    extend(HeaderSecondary.prototype, 'oncreate', function () {
      setTimeout(gameAccountReturn, 0);
    });

    // Logo at the top left: leads to the website, like on the website itself. Only after startup (app.forum does
    // not exist yet in the initializer), hence on the first render of the header. Flarum intercepts clicks on the
    // logo and jumps to the forum home page; the listener in the capture phase runs first and
    // lets the browser follow the link normally.
    extend(HeaderPrimary.prototype, 'oncreate', function () {
      var homeLink = document.getElementById('home-link');
      var site = app.forum.attribute('bbforumWebsiteUrl');
      if (!homeLink || !site) return;
      homeLink.setAttribute('href', site + '/');
      document.addEventListener('click', function (e) {
        if (e.target instanceof Element && e.target.closest('#home-link')) e.stopPropagation();
      }, true);
    });

    // Phones: a search button next to the menu button. The search field sits in the side menu, where nobody saw it
    // (UX review 29.10.2026); the button opens the menu with the cursor in the field. Wider screens: custom.less hides it.
    extend(IndexPage.prototype, 'sidebarItems', function (items) {
      items.add('bbMobileSearch', Button.component({
        className: 'Button Button--icon bb-mobileSearch',
        icon: 'fas fa-search',
        'aria-label': 'Search the forum',
        // Like Flarum's menu button: without stopPropagation the same click closes the menu again
        onclick: function (e) {
          e.stopPropagation();
          app.drawer.show();
          setTimeout(function () {
            var input = document.querySelector('.App-drawer .Search-input input');
            if (input) input.focus();
          }, 50);
        },
      }), 90);
    });

    // Solved help topics: "Solved · Jump to the solution" below the title (the solution can sit far down in a long
    // topic). At the end of every help topic, for everyone but its author: one topic per problem, with the report zip
    // (UX review 29.10.2026: "same here" replies in solved topics got no answers matched to the PC).
    extend(DiscussionHero.prototype, 'items', function (items) {
      var discussion = this.attrs.discussion;
      var best = discussion.attribute('hasBestAnswer') && discussion.bestAnswerPost && discussion.bestAnswerPost();
      if (!best || !best.number) return;
      items.add('bbSolved', m('p.bb-solvedLine', [
        icon('fas fa-check'), ' Solved · ',
        m('a', {
          href: app.route.discussion(discussion, best.number()),
          onclick: function (e) {
            var stream = app.current.get('stream');
            if (!stream) return;
            e.preventDefault();
            stream.goToNumber(best.number());
          },
        }, 'Jump to the solution'),
      ]), -10);
    });

    extend(PostStream.prototype, 'view', function (vdom) {
      var discussion = this.attrs.discussion;
      var user = app.session.user;
      if (!this.stream.viewingEnd() || tagSlugs(discussion).indexOf('help-support') === -1) return;
      if (user && discussion.user() === user) return;
      vdom.children.push(m('div.PostStream-item.bb-ownTopic', { key: 'bbOwnTopic' }, m('p', [
        m('strong', 'Same problem? '),
        'Start your own topic with your report zip (launcher: Help → Save a report), so the helpers see your PC and version. ',
        m(Link, { href: app.route('tag', { tags: 'help-support' }) }, 'Ask in Help & Support'),
      ])));
    });

    // SuperMedo Server: box in the sidebar (wide screens), line below the banner (narrow ones)
    extend(IndexPage.prototype, 'sidebarItems', function (items) {
      loadServer();
      if (srv.data) items.add('bbServer', serverCard(srv.data), -100);
    });

    // Top helpers: box below the server box (wide screens); narrower screens get a link in the menu instead
    extend(IndexPage.prototype, 'sidebarItems', function (items) {
      loadHelpers();
      var card = helpersCard();
      if (card) items.add('bbTopHelpersCard', card, -110);
    });

    extend(IndexPage.prototype, 'navItems', function (items) {
      items.add('bbTopHelpers', LinkButton.component({ href: app.route('topHelpers'), icon: 'fas fa-hands-helping' }, 'Top helpers'), -20);
    });

    // Team block in the sidebar (home page and sections); for everyone the link to the logo contest while it runs
    extend(IndexPage.prototype, 'navItems', function (items) {
      if (contestPhase() !== 'closed') {
        items.add('bbLogoContest', LinkButton.component({ href: app.route('logoContest'), icon: 'bbicon bbicon-trophy' }, 'Logo contest'), 95);
      }
      if (isTeam()) teamNavItems(items);
    });

    // Save a solved or answered help topic as a Known Fix (like "Save the fix" on Discord)
    extend(DiscussionControls, 'moderationControls', function (items, discussion) {
      var tags = discussion.tags ? discussion.tags() || [] : [];
      var isHelp = tags.some(function (t) { return t && t.slug() === 'help-support'; });
      if (!isHelp || !isTeam()) return;
      items.add('bbSaveFix', Button.component({
        icon: 'bbicon bbicon-key',
        onclick: function () { saveAsKnownFix(discussion); },
      }, 'Save as Known Fix'));
    });

    // Set the status: in the topic's menu and, on desktop, as a block in the sidebar
    extend(DiscussionControls, 'moderationControls', function (items, discussion) {
      var options = statusOptions(discussion);
      if (!options || !options.length) return;
      statusButtons(discussion, options).forEach(function (button, i) { items.add('bbStatus' + i, button, 50 - i); });
    });

    extend(DiscussionPage.prototype, 'sidebarItems', function (items) {
      var discussion = this.discussion;
      var options = discussion && statusOptions(discussion);
      if (options && options.length) items.add('bbStatus', statusPanel(discussion, options), -10);
    });

    // The sections on the left of the topic (wide screens, see sectionNav)
    extend(DiscussionPage.prototype, 'mainContent', function (items) {
      if (this.discussion) items.add('bbSections', sectionNav(this.discussion), 200);
    });

    // Tags and status straight from the topic list (Zed, 28.10.2026): whoever may change a topic's tags (team,
    // helpers, Modding in its section) sees the topic's ⋮ menu with Edit Tags and the status buttons all the time,
    // not only on hover. Touch screens hide it (phones reach it only by swiping): there it is a plain button
    // instead of the swipe (custom.less .bb-quickEdit).
    function quickEdit(discussion) {
      return !!(app.session.user && discussion.canTag && discussion.canTag());
    }

    extend(DiscussionListItem.prototype, 'elementAttrs', function (attrs) {
      if (quickEdit(this.attrs.discussion)) attrs.className = (attrs.className || '') + ' bb-quickEdit';
    });

    override(DiscussionListItem.prototype, 'isSlidableEnabled', function (original) {
      return original() && !quickEdit(this.attrs.discussion);
    });

    // Below the banner: SuperMedo Server (narrow screens) and, on the home page (not inside a section, no
    // search), the overview. The welcome banner only for guests, and no banner or server line above search
    // results: members know the forum, and a search shows its results first (UX review 29.10.2026; before, the
    // banner pushed the first topic to 807 px on a 900 px screen). Sections keep their own banner. Above results of
    // a search over all sections: the FAQ answer and the matching known fixes (searchHelp).
    override(IndexPage.prototype, 'hero', function (original) {
      var inTag = this.currentTag && this.currentTag();
      var q = app.search.params().q;
      var home = !inTag && !q && !guideHidden();
      var banner = !q && (inTag || !app.session.user) ? original() : null;
      return [banner, srv.data && !q ? serverStrip(srv.data) : null, home ? dashboard() : null, q && !inTag ? searchHelp(q) : null];
    });

    // No group badges: as colour dots they sat above the profile picture and said nothing (Nick, 26.10.2026).
    // The role appears as a shield at the name (bbRole/bbRoles), Booster and Beta as marks; other badges stay.
    extend(User.prototype, 'badges', function (items) {
      (this.groups() || []).filter(Boolean).forEach(function (g) {
        if (items.has('group' + g.id())) items.remove('group' + g.id());
      });
    });

    // custom.less hides the email form as soon as a login button (Discord) is present
    override(SignUpModal.prototype, 'className', function (original) {
      return original() + (app.forum.attribute('bbforumDiscordOnly') ? ' SignUpModal--discordOnly' : '');
    });
  });
})();

// Flarum expects a module object from every included script (otherwise startup aborts)
module.exports = {};
