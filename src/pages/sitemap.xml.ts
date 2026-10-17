import type { APIRoute } from 'astro';
import { pandals } from '../data/pandals';

// Every public page; listed pandals are picked up automatically.
const pages: [path: string, priority: string][] = [
  ['/', '1.0'],
  ['/card', '0.9'],
  ['/story', '0.8'],
  ['/add', '0.7'],
  ['/para', '0.7'],
  ['/passport', '0.5'],
  ...pandals.map((p): [string, string] => [`/pandal/${p.slug}`, '0.8']),
];

export const GET: APIRoute = ({ site }) => {
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages
    .map(([path, priority]) => `  <url><loc>${new URL(path, site).href}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>${priority}</priority></url>`)
    .join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
