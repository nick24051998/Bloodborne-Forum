import { absolute } from '../lib/url.js';

export function GET() {
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${absolute('sitemap-index.xml')}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
