# Notes for Claude

Read [CONTRIBUTING.md](CONTRIBUTING.md) first: it covers the layout, how changes go live, and the house rules.
The details for the website are in [website/README.md](website/README.md), and for the forum in [README.md](README.md).

- **`main` is live.** Never push or merge to `main` unless the person you work for says so in this conversation.
  Work on a branch `ci/<topic>` and open a pull request.
- **Before a forum change:** run `php -l` on every changed PHP file and `node --check flarum/forum.js`.
  There is no staging forum, and a broken update rolls back on its own.
- **Before a website change:** run `npm run build` and the Playwright tests in `website/`. GitHub runs the same
  tests and publishes nothing when one fails.
- **Never commit secrets.** The repo is public. Server work (`.env`, database, logs) goes through Nick, the owner.
- **Online-service pages** (registration, forgot password, admin) stay unreleased until Nick says otherwise:
  keep them off the menu and add `noindex`, and leave them out of the sitemap.
- **Design rules:**
  - One button style, as described in CONTRIBUTING.md.
  - No colored left-edge stripes on boxes.
  - Visitor-facing text in English.
- **Settings in the forum admin panel:** theme, tags, permissions and pinned topics are set from this repo by
  `scripts/lib/setup-inside.sh`. Change them there, not only in the admin panel.
- Match the surrounding code: its comment style, naming and level of detail.
