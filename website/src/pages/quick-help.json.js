// /quick-help.json: everything BB Helper (src/components/HelpBot.astro) needs, loaded the first time a visitor opens it:
// the steps (src/data/helpbot.js), every FAQ answer (for the steps and for typed questions), the FAQ's error code list
// and the tips from the BB Report Tool's knowledge. The FAQ's links are written for the FAQ page; here they work from
// every page.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter } from '../texts/faq.md';
import { START, STEPS } from '../data/helpbot.js';
import { withDownloadLinks } from '../lib/releases.js';
import { link } from '../lib/url.js';

const fixLinks = (html) => withDownloadLinks(html).replace(/href="([^"]+)"/g, (all, href) => {
  if (href.startsWith('#')) return `href="${link('faq/')}${href}"`;
  if (href.startsWith('../')) return `href="${link(href.slice(3))}"`;
  return all;
});
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<')
  .replace(/\s+/g, ' ').trim();

export function GET() {
  const faq = Object.fromEntries((frontmatter.questions ?? []).map(({ id, q, a }) => [id, { q, a: fixLinks(a), text: text(a) }]));
  // One entry per item of the FAQ's error code list; the button shows what is bold ("Code 3", "device lost")
  const codes = [...(faq['error-codes']?.a ?? '').matchAll(/<li>([\s\S]*?)<\/li>/g)].map(([, html]) => ({
    label: text(html.match(/<strong>([\s\S]*?)<\/strong>/)?.[1] ?? '').replace(/^"|"$/g, ''),
    html: html.trim(),
    text: text(html),
  }));

  // The English advice from the knowledge this site publishes (fetched and its signature checked before every build);
  // a tip whose check the knowledge no longer has is left out
  let checks = [];
  try {
    checks = JSON.parse(readFileSync(join(process.cwd(), 'public/tool/knowledge.json'), 'utf8')).knowledge?.checks ?? [];
  } catch {
    // Without the knowledge the answers come from the FAQ alone
  }
  const advice = Object.fromEntries(checks.map((c) => [c.id, c.advice?.en]).filter(([, a]) => a));

  const steps = {};
  for (const [id, step] of Object.entries(STEPS)) {
    for (const f of step.faq ?? []) if (!faq[f]) throw new Error(`BB Helper: step "${id}" names the FAQ answer "${f}", which faq.md doesn't have`);
    for (const [, next] of step.choices ?? []) if (!STEPS[next]) throw new Error(`BB Helper: step "${id}" leads to "${next}", which doesn't exist`);
    steps[id] = {
      ...step,
      tips: (step.tips ?? []).filter(([check]) => advice[check]).map(([check, title]) => ({ title, text: advice[check] })),
      links: (step.links ?? []).map(([label, page]) => ({ label, href: link(page) })),
    };
  }
  if (!steps[START]) throw new Error(`BB Helper: the first step "${START}" doesn't exist`);

  return new Response(JSON.stringify({ start: START, steps, faq, codes }), { headers: { 'Content-Type': 'application/json' } });
}
