// Bengali type styles for poster text. The first three are already on every page;
// the rest are fetched only when someone picks them in the poster maker.
import atmaBn from '@fontsource/atma/files/atma-bengali-700-normal.woff2?url';
import atmaLa from '@fontsource/atma/files/atma-latin-700-normal.woff2?url';
import minaBn from '@fontsource/mina/files/mina-bengali-700-normal.woff2?url';
import minaLa from '@fontsource/mina/files/mina-latin-700-normal.woff2?url';
import balooBn from '@fontsource/baloo-da-2/files/baloo-da-2-bengali-800-normal.woff2?url';
import balooLa from '@fontsource/baloo-da-2/files/baloo-da-2-latin-800-normal.woff2?url';
import anekBn from '@fontsource/anek-bangla/files/anek-bangla-bengali-800-normal.woff2?url';
import anekLa from '@fontsource/anek-bangla/files/anek-bangla-latin-800-normal.woff2?url';
import notoBn from '@fontsource/noto-serif-bengali/files/noto-serif-bengali-bengali-700-normal.woff2?url';
import notoLa from '@fontsource/noto-serif-bengali/files/noto-serif-bengali-latin-700-normal.woff2?url';

export interface FontStyle {
  id: string;
  bn: string; // what it's called in the picker
  en: string; // and in English: the typeface's own name
  family: string; // CSS family name used on canvas
  weight: number;
  files?: { bengali: string; latin: string }; // absent = already loaded site-wide
}

export const FONTS: FontStyle[] = [
  { id: 'galada', bn: 'সাইনবোর্ড', en: 'Galada', family: 'Galada', weight: 400 },
  { id: 'tiro', bn: 'বইয়ের ছাপা', en: 'Tiro Bangla', family: 'Tiro Bangla', weight: 400 },
  { id: 'hind', bn: 'সোজা-সাপটা', en: 'Hind Siliguri', family: 'Hind Siliguri', weight: 600 },
  { id: 'atma', bn: 'গোলগাল', en: 'Atma', family: 'PP Atma', weight: 700, files: { bengali: atmaBn, latin: atmaLa } },
  { id: 'mina', bn: 'মোটা পোস্টার', en: 'Mina', family: 'PP Mina', weight: 700, files: { bengali: minaBn, latin: minaLa } },
  { id: 'baloo', bn: 'বাবলি', en: 'Baloo Da', family: 'PP Baloo', weight: 800, files: { bengali: balooBn, latin: balooLa } },
  { id: 'anek', bn: 'হেডলাইন', en: 'Anek Bangla', family: 'PP Anek', weight: 800, files: { bengali: anekBn, latin: anekLa } },
  { id: 'noto', bn: 'ক্লাসিক', en: 'Noto Serif', family: 'PP Noto Serif', weight: 700, files: { bengali: notoBn, latin: notoLa } },
];

export const fontById = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[0];

/** CSS font shorthand for canvas: `700 64px "PP Atma"` */
export const fontCss = (f: FontStyle, size: number) => `${f.weight} ${Math.round(size)}px "${f.family}"`;

const loading = new Map<string, Promise<void>>();

// Unicode ranges as published by Fontsource for its bengali / latin subsets
const BENGALI = 'U+0951-0952,U+0964-0965,U+0980-09FE,U+1CD0,U+1CD2,U+1CD5-1CD6,U+1CD8,U+1CE1,U+1CEA,U+1CED,U+1CF2,U+1CF5-1CF7,U+200C-200D,U+20B9,U+25CC,U+A8F1';
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

/** Make sure a style is ready to draw with (fetches it on first use). */
export function ensureFont(f: FontStyle): Promise<void> {
  if (!loading.has(f.id)) {
    const p = (async () => {
      if (f.files) {
        const faces = [
          new FontFace(f.family, `url(${f.files.bengali})`, { weight: String(f.weight), unicodeRange: BENGALI }),
          new FontFace(f.family, `url(${f.files.latin})`, { weight: String(f.weight), unicodeRange: LATIN }),
        ];
        for (const face of faces) document.fonts.add(await face.load());
      } else {
        await document.fonts.load(fontCss(f, 40), 'পুজো');
      }
    })().catch(() => {
      loading.delete(f.id); // allow a retry on flaky networks
    });
    loading.set(f.id, p);
  }
  return loading.get(f.id)!;
}
