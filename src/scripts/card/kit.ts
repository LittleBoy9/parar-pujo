// Shared canvas toolkit for the share cards. Every card is 1080 wide; only the height
// changes per format, so templates lay out vertically and use `pick()` per size.
import { toBnDigits } from '../../lib/bangla';

export const W = 1080;

// Safari before 16 has no ctx.roundRect — add a small stand-in (every radius treated as one value).
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x: number, y: number, w: number, h: number, radii?: number | DOMPointInit | (number | DOMPointInit)[]) {
    const r0 = Array.isArray(radii) ? radii[0] : radii;
    const r = Math.max(0, Math.min(typeof r0 === 'number' ? r0 : (r0?.x ?? 0), Math.abs(w) / 2, Math.abs(h) / 2));
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}

export type Format = 'story' | 'post' | 'square';
export const FORMATS: Record<Format, { h: number; bn: string; en: string }> = {
  story: { h: 1920, bn: 'স্টোরি / স্ট্যাটাস', en: '9:16 · Insta story, WhatsApp status' },
  post: { h: 1350, bn: 'পোস্ট / ছবি', en: '4:5 · Insta post, WhatsApp photo' },
  square: { h: 1080, bn: 'চৌকো', en: '1:1 · gallery, DP' },
};

export type Img = CanvasImageSource & { width: number; height: number };

export interface CardPalette {
  bg: string;
  ink: string;
  accent: string;
  deep: string;
  soft: string;
}

/** A photo plus how the person has adjusted it (zoom, drag position, mirror). */
export interface PhotoInput {
  img: Img;
  zoom: number; // 1 = just fills the slot
  fx: number; // 0–1 horizontal crop anchor (dragging moves this)
  fy: number; // 0–1 vertical crop anchor
  flip: boolean; // mirror — front-camera selfies come out flipped
}

/** Where a template drew photo slot `i` — used to drag photos on the preview. */
export interface SlotRect {
  i: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Someone's restyle of a design's printed text. */
export interface TextStyle {
  family?: string; // CSS family, e.g. "PP Atma"
  weight?: number;
  color?: string;
  dx?: number; // moved by, in 1080-wide canvas units
  dy?: number;
  scale?: number; // resized (1 = as designed)
  rot?: number; // rotated, degrees
}

/** Where a design's editable text landed (canvas units), so a tap can find it. */
export interface TextRect {
  key: string;
  def: string; // what the design would print by default
  value: string; // what's printed now
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CardData {
  pujaBn: string; // puja / committee name
  areaBn: string; // para or locality (optional)
  greeting: string; // e.g. "শুভ সপ্তমী"
  line: string; // a line of their own (optional)
  from: string; // ইতি — their name (optional)
  to: string; // প্রিয় — who it's for (optional, used by the postcard)
  photos: PhotoInput[]; // slot 0 is the main photo; templates may use up to 4
  palette: CardPalette;
  site: string; // short URL printed on the card
  yearBn: string; // Bangla sal, e.g. "১৪৩৩"
  texts?: Record<string, string>; // person's own wording for a design's text, by key ('' = hidden)
  textStyles?: Record<string, TextStyle>; // and their font / colour for it
  slots?: SlotRect[]; // filled in while drawing
  textRects?: TextRect[]; // filled in while drawing
  scale?: number; // canvas → 1080-wide units, set by drawCard
}

export interface Template {
  id: string;
  bn: string;
  /** Labels for the photo slots this design uses (default: one main photo). */
  slots?: string[];
  draw(ctx: CanvasRenderingContext2D, H: number, d: CardData): void;
}

export const photoInput = (img: Img, fx = 0.5, fy = 0.5): PhotoInput => ({ img, zoom: 1, fx, fy, flip: false });

export const SIGN = 'Galada';
export const SERIF = '"Tiro Bangla"';
export const UI = '"Hind Siliguri"';
export const INK = '#2b1a10';
export const SINDOOR = '#b3261e';
export const HALDI = '#efb128';

/** Choose a value by format: story (1920), post (1350) or square (1080). */
export const pick = <T>(H: number, story: T, post: T, square: T): T => (H >= 1900 ? story : H >= 1300 ? post : square);

export const calendarYearBn = () => toBnDigits(new Date().getFullYear());

export async function loadFonts() {
  const sample = 'পাড়ার পুজো abc';
  await Promise.all([
    document.fonts.load(`80px ${SIGN}`, sample),
    document.fonts.load(`40px ${SERIF}`, sample),
    document.fonts.load(`600 36px ${UI}`, sample),
  ]);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Rasterise an inline <svg> on the page (used for the drawn placeholder art). */
export function svgToImage(svg: SVGSVGElement, w = 900, h = 1200): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  const xml = new XMLSerializer().serializeToString(clone);
  return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`);
}

/** Small seeded PRNG so decorations (confetti, flowers) don't jump around between redraws. */
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draw a photo to fill the box (object-fit: cover), honouring zoom, drag position and mirror. */
export function drawPhoto(ctx: CanvasRenderingContext2D, p: PhotoInput, x: number, y: number, w: number, h: number) {
  const { img } = p;
  const s = Math.max(w / img.width, h / img.height) * Math.max(1, p.zoom);
  const sw = w / s;
  const sh = h / s;
  const sx = (img.width - sw) * Math.min(1, Math.max(0, p.fx));
  const sy = (img.height - sh) * Math.min(1, Math.max(0, p.fy));
  if (!p.flip) {
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    return;
  }
  ctx.save();
  ctx.translate(x + w, y);
  ctx.scale(-1, 1);
  ctx.drawImage(img, img.width - sx - sw, sy, sw, sh, 0, 0, w, h);
  ctx.restore();
}

/** Template helper: draw photo slot `i` into a box and remember where it went. */
export function photo(ctx: CanvasRenderingContext2D, d: CardData, i: number, x: number, y: number, w: number, h: number) {
  const slot = d.photos[i] ? i : 0;
  d.slots?.push({ i: slot, x, y, w, h });
  drawPhoto(ctx, d.photos[slot], x, y, w, h);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

export interface TextOpts {
  fit?: { max: number; min: number; w?: number }; // shrink to fit one line (w defaults to maxW)
  maxW?: number;
  lh?: number; // line height in px
  maxLines?: number;
  align?: CanvasTextAlign;
  shadow?: string; // offset solid shadow colour
  shadowOffset?: number;
  stroke?: string;
  strokeWidth?: number;
}

/** Draws (wrapped) text with its first baseline at y; returns the y just below the last line. */
export function text(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, font: string, color: string, o: TextOpts = {}): number {
  ctx.font = font;
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = 'alphabetic';
  const size = parseInt(font.match(/(\d+)px/)?.[1] ?? '40', 10);
  let lines = o.maxW ? wrap(ctx, str, o.maxW) : str.split('\n');
  if (o.maxLines && lines.length > o.maxLines) {
    lines = lines.slice(0, o.maxLines);
    lines[lines.length - 1] = lines[lines.length - 1].replace(/\s*\S*$/, '…');
  }
  const lh = o.lh ?? size * 1.3;
  lines.forEach((l, i) => {
    const ly = y + i * lh;
    if (o.stroke) {
      ctx.lineWidth = o.strokeWidth ?? 10;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = o.stroke;
      ctx.strokeText(l, x, ly);
    }
    if (o.shadow) {
      const off = o.shadowOffset ?? Math.max(3, size / 18);
      ctx.fillStyle = o.shadow;
      ctx.fillText(l, x + off, ly + off);
    }
    ctx.fillStyle = color;
    ctx.fillText(l, x, ly);
  });
  return y + (lines.length - 1) * lh + size * 0.45;
}

/** Largest font size (≤ max, ≥ min) at which `str` fits on one line in maxW. */
export function fitSize(ctx: CanvasRenderingContext2D, str: string, family: string, max: number, min: number, maxW: number, weight = ''): number {
  for (let s = max; s > min; s -= 4) {
    ctx.font = `${weight} ${s}px ${family}`.trim();
    if (ctx.measureText(str).width <= maxW) return s;
  }
  return min;
}

/** The words a design will print for `key` — the person's own if they changed them. */
export const textOf = (d: CardData, key: string, def: string) => d.texts?.[key] ?? def;
export const shows = (d: CardData, key: string, def: string) => textOf(d, key, def).trim().length > 0;

/**
 * Editable design text. Same as text(), but the person can reword it, restyle it or hide it
 * (by key), and we remember where it landed so tapping it on the preview selects it.
 */
export function label(ctx: CanvasRenderingContext2D, d: CardData, key: string, def: string, x: number, y: number, font: string, color: string, o: TextOpts = {}): number {
  const value = textOf(d, key, def);
  const m = font.match(/^(?:(\d+)\s+)?(\d+)px\s+(.+)$/);
  let weight = m?.[1] ? Number(m[1]) : 400;
  let size = m ? Number(m[2]) : 40;
  let family = m ? m[3] : SIGN;
  const st = d.textStyles?.[key];
  if (st?.family) {
    family = `"${st.family}"`;
    weight = st.weight ?? 400;
  }
  if (!value.trim()) {
    d.textRects?.push({ key, def, value: '', x: 0, y: 0, w: 0, h: 0 });
    return y;
  }
  if (o.fit) size = fitSize(ctx, value, family, o.fit.max, o.fit.min, o.fit.w ?? o.maxW ?? 960, String(weight));
  const css = `${weight} ${size}px ${family}`;

  // the box the text will occupy, so a move / resize / turn pivots on its centre
  ctx.font = css;
  let lines = o.maxW ? wrap(ctx, value, o.maxW) : value.split('\n');
  if (o.maxLines) lines = lines.slice(0, o.maxLines);
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const w = o.maxW ? Math.min(o.maxW, widest) : widest;
  const align = o.align ?? 'center';
  const left = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  const top = y - size * 0.95;
  const bottom = y + (lines.length - 1) * (o.lh ?? size * 1.3) + size * 0.6;

  const moved = Boolean(st && (st.dx || st.dy || (st.scale && st.scale !== 1) || st.rot));
  if (moved) {
    const cx = left + w / 2;
    const cy = (top + bottom) / 2;
    ctx.save();
    ctx.translate(cx + (st!.dx ?? 0), cy + (st!.dy ?? 0));
    ctx.rotate(((st!.rot ?? 0) * Math.PI) / 180);
    ctx.scale(st!.scale ?? 1, st!.scale ?? 1);
    ctx.translate(-cx, -cy);
  }
  const end = text(ctx, value, x, y, css, st?.color ?? color, o);

  if (d.textRects) {
    // through any rotation the template applied, back to 1080-wide canvas units
    const t = ctx.getTransform();
    const k = d.scale ?? 1;
    const pts = [
      [left, top],
      [left + w, top],
      [left, bottom],
      [left + w, bottom],
    ].map(([px, py]) => [(t.a * px + t.c * py + t.e) / k, (t.b * px + t.d * py + t.f) / k]);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    d.textRects.push({ key, def, value, x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) });
  }
  if (moved) ctx.restore();
  return end;
}

let noiseTile: HTMLCanvasElement | null = null;
/** Paper grain from a cached noise tile. */
export function grain(ctx: CanvasRenderingContext2D, H: number, alpha = 0.07) {
  if (!noiseTile) {
    noiseTile = document.createElement('canvas');
    noiseTile.width = noiseTile.height = 160;
    const n = noiseTile.getContext('2d')!;
    const img = n.createImageData(160, 160);
    const r = rng(42);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() > 0.5 ? 255 : 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = r() * 90;
    }
    n.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ctx.createPattern(noiseTile, 'repeat')!;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

let dotTile: HTMLCanvasElement | null = null;
/** Printed-halftone dots over a box (magazine look). */
export function halftone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  if (!dotTile) {
    dotTile = document.createElement('canvas');
    dotTile.width = dotTile.height = 9;
    const d = dotTile.getContext('2d')!;
    d.fillStyle = 'rgba(0,0,0,.28)';
    d.beginPath();
    d.arc(4.5, 4.5, 1.6, 0, Math.PI * 2);
    d.fill();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = ctx.createPattern(dotTile, 'repeat')!;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Rotate drawing by `deg` around (cx, cy) for the duration of `fn`. */
export function rotated(ctx: CanvasRenderingContext2D, deg: number, cx: number, cy: number, fn: () => void) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  fn();
  ctx.restore();
}

/** Puja name, then para, own line and "ইতি" — each only if it fits above maxY. All editable. */
export function credits(
  ctx: CanvasRenderingContext2D,
  d: CardData,
  y: number,
  maxY: number,
  c: { name: string; area: string; ink: string },
  nameMax = 96,
): number {
  y = label(ctx, d, 'name', d.pujaBn, W / 2, y, `${nameMax}px ${SIGN}`, c.name, { maxW: 960, maxLines: 2, fit: { max: nameMax, min: 56 } }) + 24;
  if (shows(d, 'area', d.areaBn) && y + 44 < maxY) y = label(ctx, d, 'area', d.areaBn, W / 2, y + 30, `44px ${SERIF}`, c.area) + 22;
  if (shows(d, 'line', d.line) && y + 48 < maxY) y = label(ctx, d, 'line', d.line, W / 2, y + 36, `48px ${SERIF}`, c.ink, { maxW: 920, maxLines: 2 }) + 22;
  const from = d.from ? `— ইতি, ${d.from}` : '';
  if (shows(d, 'from', from) && y + 42 < maxY) y = label(ctx, d, 'from', from, W / 2, y + 30, `42px ${SERIF}`, c.ink) + 10;
  return y;
}

/** "#পাড়ারপুজো · site" along the bottom. */
export function tag(ctx: CanvasRenderingContext2D, H: number, d: CardData, color: string, y = H - 52) {
  text(ctx, `#পাড়ারপুজো · ${d.site}`, W / 2, y, `600 30px ${UI}`, color);
}

export async function shareOrDownload(canvas: HTMLCanvasElement, filename: string, title: string, mode: 'share' | 'save' = 'share') {
  const type = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.92));
  if (!blob) return;
  const file = new File([blob], filename, { type });
  // On phones the share sheet is also the nicest way to "Save Image" to the gallery
  if (mode === 'share' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // user closed the share sheet
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
