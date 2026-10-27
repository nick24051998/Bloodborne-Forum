# Website

Static project website for the forum: home page, install guide, FAQ, changelog,
legal notice (Impressum), privacy policy. Built with [Astro](https://astro.build), same Bloodborne look as the
forum, no JavaScript in the browser, no cookies, no external fonts.

Tested with Google Lighthouse (mobile and desktop): SEO 100, Accessibility 100,
Best Practices 100, Performance 99–100.

## Editing texts

| What | File |
|---|---|
| Name, address, Discord, forum and download link, Google description | `site.config.mjs` |
| Community page (forum/Discord, help notes) | `src/pages/community.astro` |
| Supermedo's projects and NativeRetro | `src/data/supermedo.js` (ports, classics, tools), page `src/pages/supermedo.astro` |
| Home page (intro, feature cards) | `src/pages/index.astro` (the `features` list at the top, the sentence with `TODO` in the hero) |
| Install guide and system requirements | `src/texts/install.md` |
| "Will it run on my PC?" (graphics cards, processors, rules) | `src/data/hardware.js` (new card: add one line) |
| Home page gallery (texts, order; images in `src/assets/showcase/`) | `src/texts/showcase.md` |
| FAQ (question/answer list at the top of the file) | `src/texts/faq.md` |
| Changelog (only the short summaries; version, download and the list of all releases come from GitHub automatically, see `scripts/fetch-releases.mjs`) | `src/texts/changelog.md` |
| Contact / privacy | `src/texts/contact.md`, `src/texts/privacy.md` |

The `.md` files are plain text (Markdown): `## Heading`, `**bold**`, `- list`,
`[link text](https://…)`. The title and description for Google go between the `---` lines at the top.

**Without your own computer:** open the file on GitHub, click the pencil, make the change, then
"Commit changes" at the bottom. GitHub rebuilds the site in about a minute.

**What's still missing:** Everything marked `TODO` is a placeholder. You get a list with:

```bash
cd website && npm run todo
```

## View locally (optional)

Requirement: Node.js 22.22 or newer.

```bash
cd website
npm install
npm run dev        # http://localhost:4321, changes show up right away
npm run build      # finished site goes to dist/
```

## Publishing with GitHub Pages (free, no custom domain)

The website is built and published automatically on every push to `main`
(`.github/workflows/website.yml`). Turn it on once:

1. On GitHub, open the repository → **Settings** → **Pages** on the left.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. At the top of the repo, **Actions** → **Website** on the left → **Run workflow** → **Run workflow**.
   After about a minute the site is online:

   **https://nick24051998.github.io/Bloodborne-Forum/**

Requirement: the repository is public (for private repos, GitHub Pages needs a
paid account). Every later change to `website/` goes online automatically.

As long as `forumUrl` and `discordUrl` in `site.config.mjs` are empty, the website hides the
forum and Discord buttons. Links in the text point to the `/community/` page, which shows what
is available right now. That way there are no dead links.

## Custom domain: bbport.de

Since 19 October 2026 the website runs at **https://bbport.de** (and `www.bbport.de`), and the forum
at **https://forum.bbport.de**. The domain is registered with checkdomain; its DNS is on
Cloudflare.

1. `site.config.mjs`: `url: 'https://bbport.de'`, `base: '/'`, `forumUrl: 'https://forum.bbport.de'`.
2. GitHub → **Settings → Pages → Custom domain** → `bbport.de` → Save → **Enforce HTTPS**.
3. Cloudflare DNS for `bbport.de`, all with a grey cloud (otherwise GitHub can't issue a
   certificate): four `A` records `185.199.108.153` to `185.199.111.153`, four `AAAA` records
   `2606:50c0:8000::153` to `2606:50c0:8003::153`, `www` as a `CNAME` to `nick24051998.github.io`.
   `forum` is a `CNAME` to the Cloudflare tunnel (orange cloud).

The old addresses `bbport.nrnetworks.de` and `bbport-forum.nrnetworks.de` redirect permanently (301)
to the new ones, path included, via Redirect Rules in the Cloudflare zone `nrnetworks.de`.
This keeps old links and Google results working.

## Registering with Google

1. [Google Search Console](https://search.google.com/search-console) → **Add property** →
   type **Domain** → `bbport.de` → verify with a DNS `TXT` record in Cloudflare. This covers
   the website and the forum together.
2. Under **Sitemaps**, submit `https://bbport.de/sitemap-index.xml` and `https://forum.bbport.de/sitemap.xml`.

## Checks before going live

Before every deploy, GitHub builds the site and tests it in a browser with Playwright (Chromium, desktop and
mobile, tests in `tests/`, settings in `playwright.config.mjs`). It checks:

- every page from the sitemap: loads without console or script errors, all images and internal links
  work, nothing sticks out over the side edge, canonical and preview image point to the real domain,
  no old nrnetworks addresses
- 404 page, sitemap and robots.txt
- hardware check (selection, result, shared link), gallery with full-size view, "reduce motion"

If a check fails, the workflow stops and the old site stays online. Which check
failed is shown in the workflow run on GitHub (Actions → Website), with screenshots in the artifact
"playwright-results". Pull requests and `ci/…` branches are only tested, not published.

Locally (Node.js 22.22 or newer): `npm run build`, once
`npm install --no-save @playwright/test@1.56.1 && npx playwright install chromium`, then `npm test`.

## Technical notes (for reference)

- Every page has its own title, its own description, a canonical link and a
  social preview for Discord, X and others (`public/og-image.jpg`, made from the Discord server's invite background, generated with `python3 media/brand.py`).
- Structured data for Google: `WebSite` and `Organization`, plus `FAQPage` on the FAQ page.
- `sitemap-index.xml` and `robots.txt` are generated automatically during the build.
- The fonts Cinzel, Inter and VT323 (terminal font of the Supermedo page) are under the SIL Open Font License (`public/fonts/OFL-*.txt`).
