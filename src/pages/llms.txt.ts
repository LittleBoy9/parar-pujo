import type { APIRoute } from 'astro';
import { pandals } from '../data/pandals';
import { creator, site, tithis } from '../data/site';

// A plain-text guide to the site for AI answer engines (https://llmstxt.org).
export const GET: APIRoute = ({ site: base }) => {
  const url = (path: string) => new URL(path, base).href;
  const dates = (key: string) => tithis.find((t) => t.key === key)?.dates ?? [];
  const lines = [
    `# ${site.titleEn} (${site.titleBn})`,
    '',
    `> A Bengali-first Durga Puja ${site.yearEn} website for every para (neighbourhood): make your own puja poster with a selfie and pandal photos, share 24-hour puja stories, and add your own para's puja. Made by ${creator.nameEn} (${creator.websiteLabel}, Instagram @${creator.instagram}).`,
    '',
    `Durga Puja ${site.yearEn}: Shashthi ${dates('shashthi').join(', ')}, Saptami ${dates('saptami').join(' and ')}, Ashtami ${dates('ashtami').join(', ')}, Navami ${dates('navami').join(', ')}, Dashami ${dates('dashami').join(', ')}.`,
    '',
    '## Main pages',
    `- [Puja poster maker](${url('/card')}): free, in the browser — add a selfie and pandal photos, Bengali text in different fonts and colours, stickers, 15 designs; save or share to Instagram story, WhatsApp status or posts.`,
    `- [Puja stories](${url('/story')}): share a puja selfie; after approval it shows on the home page for 24 hours.`,
    `- [Add your para's puja](${url('/add')}): submit any Durga Puja pandal with a photo, area and map link.`,
    `- [Home](${url('/')}): stories, the poster maker, puja dates and every para's puja.`,
    '',
    `## Pandals in ${site.areaEn}`,
    ...pandals.map((p) => `- [${p.nameEn} (${p.nameBn})](${url(`/pandal/${p.slug}`)}): Durga Puja pandal in ${p.areaEn}${p.themeEn ? ` — theme: ${p.themeEn}` : ''}.`),
    `- [Pandal-hopping guide and map](${url('/para')}) · [Pandal passport](${url('/passport')})`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
