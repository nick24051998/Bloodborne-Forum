# Working on bbport.de and forum.bbport.de

This repo holds both the website (https://bbport.de) and the forum (https://forum.bbport.de).
Everything on `main` is live, so read this page once before your first change.

## What lives where

| Path | What it is | How it goes live |
|---|---|---|
| `website/` | The website (Astro, static). Pages in `src/pages/`, texts in `src/texts/*.md`, data in `src/data/`, styles in `src/styles/global.css`. Details: [`website/README.md`](website/README.md) | GitHub Actions builds it on every push to `main`, runs the browser tests in `website/tests/`, then publishes to GitHub Pages. A failing test means nothing is published. |
| `flarum/extend.php` and the other `flarum/*.php` | Forum backend (Flarum 1.8 extenders, API routes, scheduled commands) | The server pulls `main` every 5 minutes and applies it. |
| `flarum/forum.js` | Forum frontend (plain JavaScript, no build step) | Same as above. |
| `theme/custom.less` | Forum theme | Same as above. |
| `content/` | Forum texts: welcome banner, footer, pinned topics, templates | Same as above. |
| `scripts/` | Server setup and update scripts | Same as above. |
| `media/` | Logo, icons and brand rules (`media/BRAND.md`) | Not deployed by itself. |

If a forum update fails, the server goes back to the previous commit and only tries again when a new commit
arrives.

## How to make a change

1. Create a branch. A branch named `ci/<topic>` (for example `ci/server-pages`) gets the website built and
   tested on GitHub without publishing anything. Check the result under **Actions**.
2. Open a pull request into `main`.
3. Merging into `main` publishes it: the website about 2 minutes later, the forum within 5 minutes.

Small text fixes can go straight to `main`: open the file on GitHub, click the pencil, then "Commit changes".

To run the website on your own PC (Node.js 22.22 or newer):

```bash
cd website
npm ci
npm run dev                      # http://localhost:4321
npm run build                    # the finished site in dist/
npm install --no-save @playwright/test@1.56.1 && npx playwright install chromium
npx playwright test              # the same tests GitHub runs before publishing
```

There is no test copy of the forum. Before you push forum code, at least check the syntax:

```bash
php -l flarum/extend.php
node --check flarum/forum.js
```

## Forum admin panel or repo?

The update script sets the theme, tags, permissions, pinned topics and the extension list from this repo every
time it runs. If you change one of those only in the admin panel (forum.bbport.de/admin), the next update
overwrites it, so change them here.

Group membership follows the Discord roles. A sync runs every minute, so change roles in Discord. Two groups
are set by hand and not by the sync: Admin and Beta Testers.

Everything else in the admin panel, such as users, mail and extension settings, stays as you set it.

## Rules

- **No secrets in the repo.** It is public. Tokens, passwords and webhook URLs live in `.env` on the server or in
  the forum admin panel. Ask Nick for anything that needs the server.
- **Unreleased pages stay hidden.** This includes the online-service pages (registration, forgot password, admin):
  build them on a branch and merge them only when Nick says they can go public.
  - Until then, keep them off the menu and add `noindex`.
  - Keep them out of the sitemap with the `filter` in `website/astro.config.mjs`.
- **Beta builds** are announced only in the forum, never on the website. A test checks this.
- **Buttons follow one rule** on the website and in the forum.
  - Every button is a dark plate with a thin brass line: 10px corners, `rgba(194,168,120,.4)`, same font and
    height.
  - Blood red marks the main action, stone is used for everything else, and Discord blue only for Discord links.
- **No colored stripe on the left edge** of boxes or notices. Frame them all round instead. A test checks this.
- **Visitors only see English.** Code comments in this repo are mostly German, and English comments are fine too.
- **Forum LESS:** in custom properties, write values out. Don't use LESS variables or `fade()` there.
- **Commit messages** are short English sentences that say what changed, for example
  `Website: server status box on the start page`.

## Server access

The website needs no server. The forum server is Nick's, and you don't need it for code changes. Anything on it,
such as `.env`, tokens, the database or logs, goes through Nick.
