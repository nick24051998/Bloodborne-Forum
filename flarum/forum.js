// Included in the forum via flarum/extend.php (no build step needed).
// - Header like on the website (one menu for both): to the left of the logo Install, Guide, Best settings, FAQ,
//   Changelog, Supermedo, Forum (active) in the same font, without icons; on the right the actions, here Search,
//   Log in and, as the last button, Discord like on the website. Website links open in the same tab, Discord in a new
//   one (on phones in the side menu, where "Website" is added as well)
// - Discord-only sign-up: the sign-up window shows only the Discord button
// - Live numbers from The Hunter's Dream (from /api/hunters-dream, see extend.php): as a box
//   in the sidebar, on narrow screens as a line below the welcome banner
// - No group badges: role shields at the name, earned marks after it (flarum/profiles.php)
// - Overview below the banner of the home page: four blocks (new help questions, top suggestions, new Known Fixes,
//   News) with five topics each; can be hidden (the browser remembers it). Sidebar: "Start here" with the guides,
//   only the sections (topic tags such as Crash are available as tabs and in the Known Fixes index), Hunter's Dream
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
// The addresses are set by scripts/setup-forum.sh (WEBSITE_URL, DISCORD_INVITE_URL from .env).
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
  var DiscussionPage = compat['forum/components/DiscussionPage'];
  var UserCard = compat['forum/components/UserCard'];
  var SettingsPage = compat['forum/components/SettingsPage'];
  var FieldSet = compat['common/components/FieldSet'];
  var AvatarEditor = compat['forum/components/AvatarEditor'];
  var NotificationGrid = compat['forum/components/NotificationGrid'];
  var Notification = compat['forum/components/Notification'];

  var HD_URL = 'https://thehuntersdream.com';

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

  // Reload the numbers at most once a minute; without data (server gone, error) everything stays hidden
  var hd = { data: null, fact: null, loadedAt: 0, loading: false };
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function loadHuntersDream() {
    if (hd.loading || Date.now() - hd.loadedAt < 60000) return;
    hd.loading = true;
    fetch(app.forum.attribute('apiUrl') + '/hunters-dream')
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        hd.data = data;
        // The hunting fact changes on every page load, not on every refresh
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

  // The box can be collapsed to title and status (the browser remembers it)
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
    // Bells only while the server is running: how many are currently calling for fellow players (co-op) or invaders
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

  // Overview of the home page: four sections with five topics each and a sentence on what the section is for.
  // [section, heading, sort, sentence, bbview]; only sections that exist (setup creates them).
  var DASH = [
    ['help-support', 'New questions', '-createdAt', "Something doesn't work: one topic per problem, with your BB Report Tool zip."],
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
      return app.store.find('discussions', { filter: filter, include: 'tags', sort: block[2], page: { limit: 5 } })
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
  };

  // The page ships only sections and the most-used extra tags, not the status tags: load all of them once
  var statusTagsLoading = false;

  function statusOptions(discussion) {
    var slugs = tagSlugs(discussion);
    var area = Object.keys(STATUSES).filter(function (s) { return slugs.indexOf(s) !== -1; })[0];
    if (!area || !discussion.canTag || !discussion.canTag()) return null;
    if (!tagBySlug(STATUSES[area][0][0]) && !statusTagsLoading) {
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
      m('p.bb-statusPanel-hint', 'Team only. Done, Fixed, Not planned and Duplicate take it out of the open lists.'),
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
    });

    extend(HeaderPrimary.prototype, 'items', function (items) {
      var site = app.forum.attribute('bbforumWebsiteUrl');
      var discord = app.forum.attribute('bbforumDiscordUrl');

      // The same menu items as on the website, "Forum" as the active item. "Website" exists only
      // on phones (the side menu has no logo), otherwise the logo leads to the website.
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

    // On the right, after Search and Log in: Discord as the last button, like on the website
    extend(HeaderSecondary.prototype, 'items', function (items) {
      var discord = app.forum.attribute('bbforumDiscordUrl');
      if (discord) items.add('bb-discord', discordButton(discord), -100);
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

    // Hunter's Dream: box in the sidebar (wide screens), line below the banner (narrow ones)
    extend(IndexPage.prototype, 'sidebarItems', function (items) {
      loadHuntersDream();
      if (hd.data) items.add('bbHuntersDream', huntersDreamCard(hd.data), -100);
    });

    // Team block in the sidebar (home page and sections); for everyone the link to the logo contest while it runs
    extend(IndexPage.prototype, 'navItems', function (items) {
      if (contestPhase() !== 'closed') {
        items.add('bbLogoContest', LinkButton.component({ href: app.route('logoContest'), icon: 'fas fa-trophy' }, 'Logo contest'), 95);
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

    // Below the banner: Hunter's Dream (narrow screens) and, on the home page (not inside a section, no
    // search), the overview
    override(IndexPage.prototype, 'hero', function (original) {
      var inTag = this.currentTag && this.currentTag();
      var home = !inTag && !app.search.params().q && !guideHidden();
      return [original(), hd.data ? huntersDreamStrip(hd.data) : null, home ? dashboard() : null];
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
