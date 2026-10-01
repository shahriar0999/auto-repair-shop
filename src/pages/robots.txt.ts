import type { APIRoute } from 'astro';

// Uses the "site" value from astro.config.mjs, so the domain is set in one place only.
export const GET: APIRoute = ({ site }) => {
  const base = site?.href ?? 'https://example.com/';
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /search-index.json',
    '',
    `Sitemap: ${new URL('sitemap.xml', base).href}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
