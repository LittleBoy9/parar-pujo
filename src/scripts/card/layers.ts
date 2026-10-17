// Things people add on top of a design: their own Bengali text and stickers.
// Positions are fractions of the canvas, so they survive switching story ↔ post ↔ square.
import { W } from './kit';
import { fontById, fontCss } from './fonts';
import { stickerById } from './stickers';

export type TextEffect = 'none' | 'outline' | 'shadow' | 'pill';

interface Base {
  id: string;
  fx: number; // centre, 0–1 of width
  fy: number; // centre, 0–1 of height
  rot: number; // degrees
}

export interface TextLayer extends Base {
  kind: 'text';
  text: string;
  font: string; // FontStyle id
  color: string;
  size: number; // px at 1080 wide
  effect: TextEffect;
}

export interface StickerLayer extends Base {
  kind: 'sticker';
  sticker: string;
  size: number; // px at 1080 wide
}

export type Layer = TextLayer | StickerLayer;

export const newId = () => Math.random().toString(36).slice(2, 10);

function isLight(hex: string): boolean {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

/** Contrasting colour for outlines, shadows and pills. */
export const contrastOf = (hex: string) => (isLight(hex) ? '#1b120c' : '#fffaf0');

const lines = (t: TextLayer) => (t.text || ' ').split('\n');

/** Half-width / half-height of a layer's box before rotation. */
export function halfSize(ctx: CanvasRenderingContext2D, l: Layer): { hw: number; hh: number } {
  if (l.kind === 'sticker') return { hw: l.size / 2, hh: l.size / 2 };
  ctx.font = fontCss(fontById(l.font), l.size);
  const widest = Math.max(...lines(l).map((s) => ctx.measureText(s).width));
  const pad = l.effect === 'pill' ? l.size * 0.45 : l.size * 0.12;
  return { hw: widest / 2 + pad, hh: (lines(l).length * l.size * 1.25) / 2 + pad * 0.6 };
}

export function drawLayer(ctx: CanvasRenderingContext2D, H: number, l: Layer) {
  ctx.save();
  ctx.translate(l.fx * W, l.fy * H);
  ctx.rotate((l.rot * Math.PI) / 180);

  if (l.kind === 'sticker') {
    const s = l.size / 100;
    ctx.scale(s, s);
    stickerById(l.sticker).draw(ctx);
    ctx.restore();
    return;
  }

  const font = fontById(l.font);
  ctx.font = fontCss(font, l.size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ls = lines(l);
  const lh = l.size * 1.25;
  const y0 = -((ls.length - 1) * lh) / 2;
  const contrast = contrastOf(l.color);

  if (l.effect === 'pill') {
    const { hw, hh } = halfSize(ctx, l);
    ctx.fillStyle = contrast;
    ctx.beginPath();
    ctx.roundRect(-hw, -hh, hw * 2, hh * 2, Math.min(hh, l.size * 0.5));
    ctx.fill();
  }
  ls.forEach((s, i) => {
    const y = y0 + i * lh;
    if (l.effect === 'outline') {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(4, l.size * 0.14);
      ctx.strokeStyle = contrast;
      ctx.strokeText(s, 0, y);
    }
    if (l.effect === 'shadow') {
      ctx.fillStyle = isLight(l.color) ? 'rgba(0,0,0,.65)' : 'rgba(255,250,240,.75)';
      ctx.fillText(s, l.size * 0.06, y + l.size * 0.06);
    }
    ctx.fillStyle = l.color;
    ctx.fillText(s, 0, y);
  });
  ctx.restore();
}

export function drawLayers(ctx: CanvasRenderingContext2D, H: number, layers: Layer[]) {
  for (const l of layers) drawLayer(ctx, H, l);
}

/** Dashed box + corner handles around the selected layer (preview only, never exported). */
export function drawSelection(ctx: CanvasRenderingContext2D, H: number, l: Layer) {
  const { hw, hh } = halfSize(ctx, l);
  ctx.save();
  ctx.translate(l.fx * W, l.fy * H);
  ctx.rotate((l.rot * Math.PI) / 180);
  ctx.setLineDash([14, 10]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(-hw - 10, -hh - 10, hw * 2 + 20, hh * 2 + 20);
  ctx.setLineDash([14, 10]);
  ctx.lineDashOffset = 12;
  ctx.strokeStyle = '#1b120c';
  ctx.strokeRect(-hw - 10, -hh - 10, hw * 2 + 20, hh * 2 + 20);
  ctx.restore();
}

/** Dashed box around a design's own text when it's selected for editing (preview only). */
export function drawBoxSelection(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.setLineDash([14, 10]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(x - 10, y - 8, w + 20, h + 16);
  ctx.lineDashOffset = 12;
  ctx.strokeStyle = '#1b120c';
  ctx.strokeRect(x - 10, y - 8, w + 20, h + 16);
  ctx.restore();
}

/** Topmost layer under a point (in 1080-wide canvas units), if any. */
export function hitTest(ctx: CanvasRenderingContext2D, H: number, layers: Layer[], x: number, y: number): Layer | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    const a = (-l.rot * Math.PI) / 180;
    const dx = x - l.fx * W;
    const dy = y - l.fy * H;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    const { hw, hh } = halfSize(ctx, l);
    const slop = 24; // easier to grab on a phone
    if (Math.abs(lx) <= hw + slop && Math.abs(ly) <= hh + slop) return l;
  }
  return null;
}
