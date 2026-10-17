// Builds the share-preview images (Open Graph, 1200×630) for every page, plus app icons.
// Runs before `astro build`. Uses the site's own poster templates so previews look like the site.
//
// Output: public/og/<name>.<hash>.jpg + src/data/og-manifest.json (name → URL), and
//         public/icons/{apple-touch-icon,icon-192,icon-512}.png
// The hash in the filename changes when the image changes, so WhatsApp/Facebook re-fetch it.
import { build } from 'esbuild';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = join(ROOT, 'node_modules/@fontsource');
const OUT = join(ROOT, 'public/og');
const ICONS = join(ROOT, 'public/icons');
const CACHE = join(ROOT, 'node_modules/.cache/og');

// ---------- fonts: Bengali + a Latin twin for each, so mixed text never shows boxes ----------
const fontFiles = [
  ['galada/files/galada-bengali-400-normal.woff2', 'Galada'],
  ['galada/files/galada-latin-400-normal.woff2', 'Galada Latin'],
  ['tiro-bangla/files/tiro-bangla-bengali-400-normal.woff2', 'Tiro Bangla'],
  ['tiro-bangla/files/tiro-bangla-latin-400-normal.woff2', 'Tiro Latin'],
  ['hind-siliguri/files/hind-siliguri-bengali-600-normal.woff2', 'Hind Siliguri'],
  ['hind-siliguri/files/hind-siliguri-latin-600-normal.woff2', 'Hind Latin'],
];
for (const [file, family] of fontFiles) GlobalFonts.register(readFileSync(join(FONTS, file)), family);
const SIGN = 'Galada, "Galada Latin"';
const SERIF = '"Tiro Bangla", "Tiro Latin"';
const UI = '"Hind Siliguri", "Hind Latin"';

// ---------- bundle the site's TypeScript (templates + data) for Node ----------
mkdirSync(CACHE, { recursive: true });
await build({
  stdin: {
    contents: [
      "export * from './src/scripts/card/templates.ts';",
      "export * from './src/scripts/card/kit.ts';",
      "export { pandals } from './src/data/pandals.ts';",
      "export { palettes } from './src/data/palettes.ts';",
      "export { site, creator } from './src/data/site.ts';",
    ].join('\n'),
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: join(CACHE, 'bundle.mjs'),
  logLevel: 'warning',
  plugins: [
    {
      name: 'og-node',
      setup(b) {
        // font file imports (`?url`) aren't needed here
        b.onResolve({ filter: /\?url$/ }, (a) => ({ path: a.path, namespace: 'url' }));
        b.onLoad({ filter: /.*/, namespace: 'url' }, () => ({ contents: 'export default ""', loader: 'js' }));
        // templates draw with these families — give them their Latin twins here
        b.onLoad({ filter: /card[\\/]kit\.ts$/ }, async (a) => ({
          loader: 'ts',
          contents: readFileSync(a.path, 'utf8')
            .replace("export const SIGN = 'Galada';", `export const SIGN = '${SIGN}';`)
            .replace(`export const SERIF = '"Tiro Bangla"';`, `export const SERIF = '${SERIF}';`)
            .replace(`export const UI = '"Hind Siliguri"';`, `export const UI = '${UI}';`),
        }));
      },
    },
  ],
});
globalThis.document = { createElement: () => createCanvas(1, 1) }; // kit's grain/halftone tiles
const m = await import(join(CACHE, 'bundle.mjs') + `?t=${Date.now()}`);
const { TEMPLATES, drawCard, photoInput, pandals, palettes, site, creator } = m;

// ---------- shared pieces ----------
const W = 1200;
const H = 630;
const INK = '#2b1a10';
const SINDOOR = '#b3261e';
const HALDI = '#efb128';
const PAPER = '#f6ecd6';
const host = new URL(site.url).host;

const photos = Object.fromEntries(await Promise.all(pandals.map(async (p) => [p.slug, await loadImage(join(ROOT, 'public', p.photos[0]))])));
const focusY = (p) => (p.focus ? parseFloat(p.focus.split(' ')[1]) / 100 : 0.5);
const avatar = await loadImage(join(ROOT, 'public', creator.photoSm));

/** One story-size poster from the real templates, as an image we can place on the card. */
function poster(templateId, pandal, others = pandals) {
  const t = TEMPLATES.find((x) => x.id === templateId);
  const c = createCanvas(1, 1);
  const list = [pandal, ...others.filter((o) => o !== pandal)];
  const ph = [0, 1, 2, 3].map((i) => {
    const p = list[i % list.length];
    return photoInput(photos[p.slug], 0.5, focusY(p));
  });
  drawCard(c, t, 1920, {
    pujaBn: pandal.nameBn,
    areaBn: pandal.areaBn,
    greeting: 'শুভ শারদীয়া',
    line: '',
    from: '',
    to: '',
    photos: ph,
    palette: palettes[pandal.palette],
    site: host,
    yearBn: site.yearBn,
  }, 0.36);
  return c;
}

function wrapLines(ctx, text, maxW) {
  const out = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const t = line ? `${line} ${word}` : word;
    if (ctx.measureText(t).width > maxW && line) {
      out.push(line);
      line = word;
    } else line = t;
  }
  if (line) out.push(line);
  return out;
}

function lalpaar(ctx, y, h) {
  ctx.fillStyle = SINDOOR;
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = HALDI;
  for (let x = h / 2; x < W; x += h) {
    ctx.beginPath();
    ctx.arc(x, y + h / 2, h * 0.17, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * The share card: title + page headline on the left, real posters fanned on the right,
 * creator credit and the address along the bottom.
 */
function card({ headline, sub, posters, bigName = false }) {
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(950, 330, 40, 950, 330, 520);
  glow.addColorStop(0, 'rgba(239,177,40,.45)');
  glow.addColorStop(1, 'rgba(239,177,40,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  lalpaar(ctx, 0, 26);
  lalpaar(ctx, H - 26, 26);

  // posters, fanned
  const spots = posters.length === 1 ? [[905, 318, 3]] : posters.length === 2 ? [[830, 330, -7], [1010, 318, 6]] : [[760, 340, -10], [915, 312, 0], [1070, 340, 10]];
  posters.forEach((p, i) => {
    const [cx, cy, rot] = spots[i];
    const w = posters.length === 1 ? 300 : 250;
    const h = (w * 16) / 9 > 520 ? 520 : (w * 16) / 9;
    const pw = (h * 9) / 16;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.shadowColor = 'rgba(43,26,16,.35)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = INK;
    ctx.fillRect(-pw / 2 - 4, -h / 2 - 4, pw + 8, h + 8);
    ctx.shadowColor = 'transparent';
    ctx.drawImage(p, -pw / 2, -h / 2, pw, h);
    ctx.restore();
  });

  // left column
  const x = 64;
  ctx.textBaseline = 'alphabetic';
  // kicker pill
  ctx.font = `600 24px ${UI}`;
  const kicker = `দুর্গাপুজো · শারদীয়া ${site.yearBn}`;
  const kw = ctx.measureText(kicker).width + 36;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(x, 70, kw, 44, 22);
  ctx.fill();
  ctx.fillStyle = '#fffaf0';
  ctx.fillText(kicker, x + 18, 101);

  // site title
  ctx.font = `${bigName ? 64 : 112}px ${SIGN}`;
  const title = 'পাড়ার পুজো';
  const ty = bigName ? 186 : 236;
  ctx.fillStyle = INK;
  ctx.fillText(title, x + 7, ty + 7);
  ctx.fillStyle = HALDI;
  ctx.fillText(title, x + 4, ty + 4);
  ctx.fillStyle = SINDOOR;
  ctx.fillText(title, x, ty);

  // page headline
  let y = ty + (bigName ? 96 : 76);
  ctx.font = bigName ? `92px ${SIGN}` : `46px ${SERIF}`;
  ctx.fillStyle = bigName ? SINDOOR : INK;
  for (const l of wrapLines(ctx, headline, 600).slice(0, 2)) {
    ctx.fillText(l, x, y);
    y += bigName ? 98 : 58;
  }
  if (sub) {
    ctx.font = `600 27px ${UI}`;
    ctx.fillStyle = '#6b5442';
    for (const l of wrapLines(ctx, sub, 600).slice(0, 2)) {
      ctx.fillText(l, x, y + 4);
      y += 38;
    }
  }

  // creator + address
  const by = H - 92;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + 26, by, 26, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(avatar, x, by - 26, 52, 52);
  ctx.restore();
  ctx.strokeStyle = HALDI;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + 26, by, 27, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `600 24px ${UI}`;
  ctx.fillStyle = INK;
  ctx.fillText(`বানিয়েছেন ${creator.nameBn} · @${creator.instagram}`, x + 66, by - 4);
  ctx.font = `600 22px ${UI}`;
  ctx.fillStyle = SINDOOR;
  ctx.fillText(host, x + 66, by + 26);
  return c;
}

// ---------- the pages ----------
const [p1, p2] = [pandals[0], pandals[1] ?? pandals[0]];
const templateFor = (p) => ({ chalchitra: 'chalchitra', pujabarshiki: 'sharadiya', stamp: 'stamp', marquee: 'marquee', alpona: 'alpona' })[p.frame] ?? 'chalchitra';

const pages = {
  home: card({ headline: 'নিজের পুজোর পোস্টার বানান', sub: 'সেলফি · বাংলা লেখা · ১৫টা ডিজাইন · পাড়ার স্টোরি', posters: [poster('duo', p1), poster('chokh', p2), poster('parikrama', p1)] }),
  card: card({ headline: 'পুজো পরিক্রমার পোস্টার', sub: 'ছবি দিন, নিজের মতো লিখুন — স্টোরি, স্ট্যাটাস, পোস্ট', posters: [poster('postcard', p2), poster('album', p1), poster('marquee', p2)] }),
  story: card({ headline: 'পাড়ার স্টোরিতে ছবি দিন', sub: 'প্যান্ডেলের সামনে সেলফি — ২৪ ঘণ্টার পুজো স্টোরি', posters: [poster('album', p1), poster('chalchitra', p2)] }),
  add: card({ headline: 'আপনার পাড়ার পুজো যোগ করুন', sub: 'নাম আর একটা ছবি পাঠান — সবাই দেখতে পাবে', posters: [poster('stamp', p1), poster('sharadiya', p2)] }),
  para: card({ headline: 'আমাদের পাড়ার ঠাকুর', sub: `${site.areaBn} — রুট ম্যাপ আর ঠাকুর দেখা পাসপোর্ট`, posters: [poster(templateFor(p1), p1), poster(templateFor(p2), p2)] }),
  passport: card({ headline: 'ঠাকুর দেখা পাসপোর্ট', sub: 'কটা ঠাকুর দেখলেন? ছাপ মারুন, শেয়ার করুন', posters: [poster('ticket', p1), poster('ticket', p2)] }),
};
for (const p of pandals) {
  pages[`pandal-${p.slug}`] = card({ headline: p.nameBn, sub: `${p.areaBn} · দুর্গাপুজো ${site.yearBn}`, posters: [poster(templateFor(p), p)], bigName: true });
}

// ---------- write images + manifest ----------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const manifest = {};
for (const [name, canvas] of Object.entries(pages)) {
  const jpg = canvas.toBuffer('image/jpeg', 86);
  const hash = createHash('sha1').update(jpg).digest('hex').slice(0, 8);
  const file = `${name}.${hash}.jpg`;
  writeFileSync(join(OUT, file), jpg);
  manifest[name] = `/og/${file}`;
}
writeFileSync(join(ROOT, 'src/data/og-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

// ---------- app icons: Ma's eye on sindoor, like the favicon ----------
mkdirSync(ICONS, { recursive: true });
for (const size of [180, 192, 512]) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');
  const s = size / 64;
  ctx.scale(s, s);
  ctx.fillStyle = SINDOOR;
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.moveTo(10, 36);
  ctx.quadraticCurveTo(32, 14, 54, 36);
  ctx.quadraticCurveTo(32, 46, 10, 36);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(32, 34, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = HALDI;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(32, 6);
  ctx.quadraticCurveTo(38, 14, 32, 22);
  ctx.quadraticCurveTo(26, 14, 32, 6);
  ctx.fill();
  ctx.stroke();
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  writeFileSync(join(ICONS, name), c.toBuffer('image/png'));
}

const sizes = readdirSync(OUT).map((f) => `${f} ${Math.round(readFileSync(join(OUT, f)).length / 1024)}KB`);
console.log(`og: ${sizes.length} share images\n  ${sizes.join('\n  ')}\nicons: apple-touch-icon, 192, 512`);
