import type { PaletteName } from './palettes';

export type FrameStyle =
  | 'chalchitra' // the arched painted backdrop behind the idol
  | 'alpona' // round rice-paste floor art
  | 'terracotta' // Bishnupur-style temple facade
  | 'pujabarshiki' // vintage Sharadiya magazine cover
  | 'stamp' // postage stamp with a Parar Pujo postmark
  | 'marquee' // hand-painted signboard ringed with bulbs
  | 'ghat'; // Ganga ghat steps at dusk

export interface Timing {
  bn: string; // e.g. "অঞ্জলি"
  en: string; // e.g. "Anjali"
  time: string; // free text, e.g. "সকাল ৯টা"
}

export interface Pandal {
  slug: string; // used in the URL: /pandal/<slug>
  nameBn: string;
  nameEn: string;
  areaBn: string; // its para / locality, shown on cards, posters and the area filter
  areaEn: string;
  themeBn?: string; // this year's theme
  themeEn?: string;
  storyBn?: string; // a line or two — a memory, what makes this one special
  since?: number; // founding year, if known
  photos: string[]; // files in /public/pandals/<slug>/ — first one is the cover
  focus?: string; // CSS object-position for the cover crop, e.g. '50% 30%' (default centre)
  mapUrl?: string; // Google Maps share link
  frame: FrameStyle;
  palette: PaletteName;
  timings?: Timing[];
  sample?: boolean; // placeholder entry — remove once real data is in
}

/*
 * HOW TO ADD A REAL PANDAL
 * 1. Put photos in public/pandals/<slug>/ (e.g. public/pandals/ghoshpara/1.jpg)
 * 2. Add an entry below with photos: ['/pandals/ghoshpara/1.jpg', ...]
 * 3. Paste the Google Maps "Share" link into mapUrl
 * 4. Pick a frame + palette that no neighbouring entry uses
 * The order of this list is the suggested pandal-hopping route on the map.
 */
export const pandals: Pandal[] = [
  {
    slug: 'tarun-sangha',
    nameBn: 'তরুণ সংঘ',
    nameEn: 'Tarun Sangha',
    areaBn: 'ঘোষপুর',
    areaEn: 'Ghoshpur',
    // TODO: theme, story, map link, founding year — waiting on details
    frame: 'chalchitra', // the red-and-gold arch, first in the row
    palette: 'sindoor',
    photos: ['/pandals/tarun-sangha/1.jpg'],
    focus: '50% 38%', // keep the facade in frame, the tarp on the walkway out
  },
  {
    slug: 'jamuna-sangha',
    nameBn: 'যমুনা সংঘ',
    nameEn: 'Jamuna Sangha',
    areaBn: 'ঘোষপুর',
    areaEn: 'Ghoshpur',
    // TODO: theme, story, map link, founding year — waiting on details
    frame: 'pujabarshiki', // the haldi Sharadiya cover, second in the row
    palette: 'haldi',
    photos: ['/pandals/jamuna-sangha/1.jpg'],
    focus: '50% 70%', // the cover crops wide: show the whole pandal, less sky
  },
  {
    slug: 'united-club',
    nameBn: 'ইউনাইটেড ক্লাব',
    nameEn: 'United Club',
    areaBn: 'অরবিন্দ রোড',
    areaEn: 'Aurobindo Road',
    // TODO: theme, story, map link, founding year — waiting on details
    frame: 'marquee', // the bulb-lit cinema signboard, third in the row
    palette: 'neel', // deep blue so the Thakur's gold and purple glow
    photos: ['/pandals/united-club/1.jpg'],
    focus: '50% 38%', // a portrait close-up of the Thakur — keep Maa's face in frame
  },
];

export const getPandal = (slug: string) => pandals.find((p) => p.slug === slug);
