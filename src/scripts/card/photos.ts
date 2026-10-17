// Getting people's photos ready for the poster: right way up, sensible size, optional filter.
import { SIGN, UI } from './kit';
import { tr } from '../../lib/i18n';

export type Filter = 'none' | 'bright' | 'bw' | 'vintage';

export const FILTERS: { id: Filter; bn: string; en: string }[] = [
  { id: 'none', bn: 'স্বাভাবিক', en: 'Normal' },
  { id: 'bright', bn: 'ঝলমলে', en: 'Bright' },
  { id: 'bw', bn: 'সাদা-কালো', en: 'B&W' },
  { id: 'vintage', bn: 'পুরনো দিন', en: 'Vintage' },
];

const MAX_SIDE = 1600; // plenty for a 1080-wide poster, and keeps editing smooth

/**
 * Decode a photo the right way up. Newer browsers: createImageBitmap honouring EXIF rotation.
 * Older Safari (no options support): an <img>, which Safari has rotated by EXIF since iOS 13.4.
 */
export async function decodePhoto(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  }
}

/** Decode a picked/captured photo upright and scaled down to a canvas. */
export async function loadUserPhoto(file: File): Promise<HTMLCanvasElement> {
  const photo = await decodePhoto(file);
  const s = Math.min(1, MAX_SIDE / Math.max(photo.width, photo.height));
  const c = document.createElement('canvas');
  c.width = Math.round(photo.width * s);
  c.height = Math.round(photo.height * s);
  c.getContext('2d')!.drawImage(photo.source, 0, 0, c.width, c.height);
  photo.done();
  return c;
}

/** Returns a filtered copy (pixel maths, so it works in every browser incl. Safari). */
export function applyFilter(src: HTMLCanvasElement, filter: Filter): HTMLCanvasElement {
  if (filter === 'none') return src;
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (filter === 'bright') {
      // a little brighter, more contrast, richer colour — festival lights
      r = lum + (r - lum) * 1.25;
      g = lum + (g - lum) * 1.25;
      b = lum + (b - lum) * 1.25;
      r = (r - 128) * 1.08 + 140;
      g = (g - 128) * 1.08 + 136;
      b = (b - 128) * 1.08 + 130;
    } else if (filter === 'bw') {
      const v = (lum - 128) * 1.15 + 128;
      r = g = b = v;
    } else {
      // sepia, lifted blacks, warm — an old family album print
      const sr = 0.393 * r + 0.769 * g + 0.189 * b;
      const sg = 0.349 * r + 0.686 * g + 0.168 * b;
      const sb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = sr * 0.8 + 34;
      g = sg * 0.8 + 26;
      b = sb * 0.8 + 18;
    }
    d[i] = clamp(r);
    d[i + 1] = clamp(g);
    d[i + 2] = clamp(b);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Stand-in for an empty slot: a soft card that says "ছবি দিন". */
export function slotPlaceholder(label: string, bg: string, ink: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 900;
  c.height = 1200;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 900, 1200);
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 10;
  ctx.setLineDash([30, 22]);
  ctx.strokeRect(40, 40, 820, 1120);
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.85;
  // camera
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.roundRect(300, 440, 300, 210, 30);
  ctx.moveTo(380, 440);
  ctx.lineTo(405, 400);
  ctx.lineTo(495, 400);
  ctx.lineTo(520, 440);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(450, 545, 62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.font = `110px ${SIGN}`;
  ctx.fillText(tr('ছবি দিন', 'Add a photo'), 450, 820);
  ctx.font = `600 48px ${UI}`;
  ctx.fillText(label, 450, 900);
  return c;
}
