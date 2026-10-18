// The nine share-card designs. Each lays itself out for story (1920), post (1350)
// and square (1080) heights — see `pick()` — rather than cropping one design.
import { toBnDigits } from '../../lib/bangla';
import {
  HALDI,
  INK,
  SERIF,
  SIGN,
  SINDOOR,
  UI,
  W,
  calendarYearBn,
  photo,
  credits,
  fitSize,
  grain,
  halftone,
  label,
  shows,
  textOf,
  pick,
  rng,
  rotated,
  tag,
  text,
  type CardData,
  type SlotRect,
  type TextRect,
  type Template,
} from './kit';

const TAU = Math.PI * 2;

// ---------- small drawing helpers ----------

function archPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, bottom: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.lineTo(cx + r, bottom);
  ctx.lineTo(cx - r, bottom);
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function shiuli(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#fffaf0';
  ctx.strokeStyle = 'rgba(120,90,60,.25)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    ctx.rotate(TAU / 6);
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.55, s * 0.28, s * 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#e8731c';
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Ma's eye with the third eye — used on stamps. */
function trinayan(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-34, 6);
  ctx.quadraticCurveTo(0, -22, 34, 6);
  ctx.quadraticCurveTo(0, 20, -34, 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 5, 8, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.quadraticCurveTo(8, -30, 0, -20);
  ctx.quadraticCurveTo(-8, -30, 0, -40);
  ctx.stroke();
  ctx.restore();
}

function postmark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ring: string, center: string, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.28);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = r * 0.045;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = r * 0.025;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, TAU);
  ctx.stroke();
  ctx.font = `600 ${Math.round(r * 0.2)}px ${UI}`;
  ctx.textAlign = 'center';
  const chars = [...ring];
  chars.forEach((ch, i) => {
    ctx.save();
    ctx.rotate((i / chars.length) * TAU);
    ctx.fillText(ch, 0, -r * 0.74);
    ctx.restore();
  });
  ctx.font = `${Math.round(r * 0.3)}px ${SIGN}`;
  ctx.fillText(center, 0, r * 0.1);
  ctx.restore();
}

// ---------- templates ----------

const chalchitra: Template = {
  id: 'chalchitra',
  bn: 'চালচিত্র',
  en: 'Chalchitra',
  draw(ctx, H, d) {
    const p = d.palette;
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, W, H);
    label(ctx, d, 'greeting', d.greeting, W / 2, pick(H, 170, 135, 115), `${pick(H, 110, 92, 80)}px ${SIGN}`, p.accent, { shadow: p.deep });

    const top = pick(H, 240, 190, 160);
    const bottom = H - pick(H, 560, 400, 330);
    const R = Math.min(470, bottom - top - 80);
    const cx = W / 2;
    const cy = top + R;

    ctx.fillStyle = p.deep;
    archPath(ctx, cx, cy, R, bottom);
    ctx.fill();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 40, Math.PI, 0);
    ctx.stroke();
    // painted bays between the rings
    ctx.strokeStyle = p.soft;
    ctx.lineWidth = 3;
    for (let a = 0; a <= 12; a++) {
      const t = Math.PI + (a / 12) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(t) * (R - 52), cy + Math.sin(t) * (R - 52));
      ctx.lineTo(cx + Math.cos(t) * (R * 0.8), cy + Math.sin(t) * (R * 0.8));
      ctx.stroke();
    }
    ctx.fillStyle = p.ink;
    for (let a = 0; a <= 20; a++) {
      const t = Math.PI + (a / 20) * Math.PI;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(t) * R, cy + Math.sin(t) * R, 15, 0, TAU);
      ctx.fill();
    }

    const r = R * 0.76;
    ctx.save();
    archPath(ctx, cx, cy, r, bottom);
    ctx.clip();
    photo(ctx, d, 0, cx - r, cy - r, r * 2, bottom - (cy - r));
    ctx.restore();

    ctx.fillStyle = p.accent;
    ctx.fillRect(cx - R - 30, bottom, (R + 30) * 2, 34);

    credits(ctx, d, bottom + pick(H, 140, 120, 105), H - 100, { name: p.ink, area: p.accent, ink: p.ink });
    grain(ctx, H);
    tag(ctx, H, d, p.ink);
  },
};

const stamp: Template = {
  id: 'stamp',
  bn: 'ডাকটিকিট',
  en: 'Postage stamp',
  draw(ctx, H, d) {
    const p = d.palette;
    const paper = '#f3e6c8';
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, W, H);
    label(ctx, d, 'greeting', d.greeting, W / 2, pick(H, 170, 135, 110), `${pick(H, 100, 86, 74)}px ${SIGN}`, SINDOOR);

    const w = pick(H, 780, 700, 600);
    const x = (W - w) / 2;
    const y = pick(H, 250, 190, 160);
    const h = H - pick(H, 560, 400, 330) - y;

    rotated(ctx, -2, W / 2, y + h / 2, () => {
      ctx.shadowColor = 'rgba(43,26,16,.25)';
      ctx.shadowOffsetX = 10;
      ctx.shadowOffsetY = 14;
      ctx.fillStyle = '#fffaf0';
      ctx.fillRect(x, y, w, h);
      ctx.shadowColor = 'transparent';
      // perforations
      ctx.fillStyle = paper;
      for (let i = 0; i <= w; i += 40) {
        ctx.beginPath();
        ctx.arc(x + i, y, 14, 0, TAU);
        ctx.arc(x + i, y + h, 14, 0, TAU);
        ctx.fill();
      }
      for (let i = 0; i <= h; i += 40) {
        ctx.beginPath();
        ctx.arc(x, y + i, 14, 0, TAU);
        ctx.arc(x + w, y + i, 14, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = p.bg;
      ctx.fillRect(x + 34, y + 34, w - 68, h - 68);
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 6;
      ctx.strokeRect(x + 34, y + 34, w - 68, h - 68);

      label(ctx, d, 'stamp.dak', 'পাড়ার ডাক', x + 66, y + 100, `44px ${SERIF}`, p.accent, { align: 'left' });
      const ph = h - 130 - pick(H, 150, 140, 125);
      photo(ctx, d, 0, x + 66, y + 128, w - 132, ph);
      ctx.strokeStyle = p.deep;
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 66, y + 128, w - 132, ph);
      label(ctx, d, 'stamp.value', '৫০', x + 66, y + h - 62, `${pick(H, 104, 96, 84)}px ${SIGN}`, p.accent, { align: 'left' });
      label(ctx, d, 'stamp.paisa', 'পয়সা', x + 66 + pick(H, 116, 108, 96), y + h - 66, `38px ${SIGN}`, p.accent, { align: 'left' });
    });

    postmark(ctx, x + w - 30, y + 70, pick(H, 125, 115, 100), `${d.areaBn || 'পাড়া'} · শারদীয়া ${calendarYearBn()} · `, 'পুজো', 'rgba(30,30,70,.62)');

    credits(ctx, d, y + h + pick(H, 130, 110, 95), H - 100, { name: p.deep, area: SINDOOR, ink: INK });
    grain(ctx, H, 0.05);
    tag(ctx, H, d, INK);
  },
};

const marquee: Template = {
  id: 'marquee',
  bn: 'সিনেমা বোর্ড',
  en: 'Cinema board',
  draw(ctx, H, d) {
    const p = d.palette;
    ctx.fillStyle = p.deep;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, H * 0.32, 50, W / 2, H * 0.32, H * 0.55);
    glow.addColorStop(0, p.soft);
    glow.addColorStop(1, p.bg);
    ctx.fillStyle = glow;
    ctx.fillRect(40, 40, W - 80, H - 80);

    const bulb = (bx: number, by: number) => {
      ctx.save();
      ctx.shadowColor = '#ffd36b';
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(bx, by, 14, 0, TAU);
      ctx.fill();
      ctx.restore();
    };
    for (let bx = 80; bx <= W - 80; bx += 64) {
      bulb(bx, 80);
      bulb(bx, H - 80);
    }
    for (let by = 144; by <= H - 144; by += 64) {
      bulb(80, by);
      bulb(W - 80, by);
    }

    let y = label(ctx, d, 'greeting', d.greeting, W / 2, pick(H, 210, 180, 165), `600 ${pick(H, 44, 40, 36)}px ${UI}`, p.ink);
    const size = fitSize(ctx, textOf(d, 'name', d.pujaBn), SIGN, pick(H, 124, 106, 90), 60, 820);
    y = label(ctx, d, 'name', d.pujaBn, W / 2, y + size * 0.95, `${size}px ${SIGN}`, p.accent, { maxW: 820, maxLines: 2, shadow: '#e8644f', fit: { max: size, min: 60 } });

    const top = y + 40;
    const bottom = H - pick(H, 430, 330, 260);
    photo(ctx, d, 0, 150, top, W - 300, bottom - top);
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 12;
    ctx.strokeRect(150, top, W - 300, bottom - top);

    const ry = bottom + pick(H, 95, 80, 70);
    rotated(ctx, -3, W / 2, ry, () => {
      ctx.fillStyle = '#e8644f';
      ctx.fillRect(W / 2 - 320, ry - 66, 640, 100);
      label(ctx, d, 'marquee.ribbon', 'সপরিবারে দেখুন!', W / 2, ry + 8, `${pick(H, 70, 64, 58)}px ${SIGN}`, '#fffaf0', { fit: { max: pick(H, 70, 64, 58), min: 30, w: 600 } });
    });

    let ly = ry + pick(H, 120, 95, 80);
    const extra: [string, string][] = [
      ['area', d.areaBn],
      ['line', d.line],
      ['from', d.from ? `— ইতি, ${d.from}` : ''],
    ];
    for (const [key, def] of extra) {
      if (!shows(d, key, def)) continue;
      if (ly > H - 150) break;
      ly = label(ctx, d, key, def, W / 2, ly, `${pick(H, 46, 42, 38)}px ${SERIF}`, p.ink, { maxW: 820, maxLines: 2 }) + 30;
    }
    tag(ctx, H, d, p.ink, H - 120);
  },
};

const postcard: Template = {
  id: 'postcard',
  bn: 'পোস্টকার্ড',
  en: 'Postcard',
  draw(ctx, H, d) {
    const buff = '#ecd49a';
    const brown = '#8a2d1f';
    const blue = '#1d3b8a';
    ctx.fillStyle = buff;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#b98f3e';
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, W - 56, H - 56);

    // picture side
    const ph = Math.round(H * pick(H, 0.5, 0.47, 0.45));
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(60, 60, W - 120, ph - 60);
    photo(ctx, d, 0, 78, 78, W - 156, ph - 96);

    // printed header
    label(ctx, d, 'postcard.head', 'পোস্ট কার্ড · POST CARD', W / 2, ph + 70, `600 ${pick(H, 36, 32, 28)}px ${UI}`, brown);
    ctx.strokeStyle = brown;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, ph + 110);
    ctx.lineTo(W / 2, H - 90);
    ctx.stroke();

    // message, handwritten
    const hs = pick(H, 56, 42, 36);
    const msg = [
      `প্রিয় ${d.to || 'বন্ধু'},`,
      d.line || `${d.greeting}! এবার পুজোয় ${d.pujaBn}-তে চলে এসো।`,
      'ইতি,',
      d.from || 'তোমার পাড়ার লোক',
    ].join('\n');
    label(ctx, d, 'postcard.msg', msg, 70, ph + 110 + hs * 1.4, `${hs}px ${SIGN}`, blue, { align: 'left', maxW: W / 2 - 110, lh: hs * 1.4, maxLines: pick(H, 12, 8, 7) });

    // printed stamp + postmark
    const s = pick(H, 1.25, 0.85, 0.72);
    const sw = 150 * s;
    const sh = 180 * s;
    const sx = W - 70 - sw;
    const sy = ph + 110;
    ctx.fillStyle = SINDOOR;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = '#fffaf0';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx + 8, sy + 8, sw - 16, sh - 16);
    trinayan(ctx, sx + sw / 2, sy + sh * 0.45, s * 1.3, '#fffaf0');
    label(ctx, d, 'postcard.paisa', '১৫ পয়সা', sx + sw / 2, sy + sh - 18 * s, `600 ${Math.round(22 * s)}px ${UI}`, '#fffaf0');
    postmark(ctx, sx - 30 * s, sy + sh * 0.6, 88 * s, `${d.areaBn || 'পাড়া'} · ${calendarYearBn()} · `, 'শারদীয়া', 'rgba(29,59,138,.55)');

    // address lines
    const ax = W / 2 + 40;
    const gap = pick(H, 120, 80, 62);
    let ay = sy + sh + pick(H, 110, 90, 70);
    const addr: [string, string][] = [
      ['postcard.to', `প্রাপক: ${d.to || 'সবাই'}`],
      ['name', d.pujaBn],
      ['area', d.areaBn || 'আমাদের পাড়া'],
    ];
    for (const [key, def] of addr) {
      if (ay > H - 90) break;
      const size = pick(H, 54, 40, 34);
      label(ctx, d, key, def, ax, ay, `${size}px ${SIGN}`, blue, { align: 'left', fit: { max: size, min: 24, w: W / 2 - 120 } });
      ctx.setLineDash([3, 8]);
      ctx.strokeStyle = brown;
      ctx.beginPath();
      ctx.moveTo(ax, ay + 14);
      ctx.lineTo(W - 70, ay + 14);
      ctx.stroke();
      ctx.setLineDash([]);
      ay += gap;
    }
    grain(ctx, H, 0.06);
    tag(ctx, H, d, '#6b4a1a', H - 44);
  },
};

const sharadiya: Template = {
  id: 'sharadiya',
  bn: 'শারদীয়া পত্রিকা',
  en: 'Sharadiya magazine',
  draw(ctx, H, d) {
    const p = d.palette;
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = p.deep;
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, W - 48, H - 48);
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, W - 80, H - 80);

    const ky = pick(H, 130, 112, 100);
    label(ctx, d, 'sharadiya.kicker', `${d.areaBn || 'আমাদের পাড়া'} · বিশেষ সংখ্যা`, 80, ky, `${pick(H, 40, 36, 32)}px ${SERIF}`, p.deep, { align: 'left', maxW: 720 });
    const ms = pick(H, 250, 200, 165);
    const my = ky + ms * 0.95;
    label(ctx, d, 'sharadiya.title', 'শারদীয়া', 70, my, `${ms}px ${SIGN}`, p.accent, { align: 'left', shadow: p.deep, shadowOffset: 7, fit: { max: ms, min: 60, w: 760 } });
    label(ctx, d, 'sharadiya.year', d.yearBn, W - 80, my, `${pick(H, 72, 62, 54)}px ${SERIF}`, p.deep, { align: 'right' });
    const rule = my + 40;
    ctx.strokeStyle = p.deep;
    ctx.lineWidth = 3;
    for (const off of [0, 10]) {
      ctx.beginPath();
      ctx.moveTo(70, rule + off);
      ctx.lineTo(W - 70, rule + off);
      ctx.stroke();
    }

    const top = rule + pick(H, 60, 45, 35);
    const bottom = H - pick(H, 470, 330, 260);
    photo(ctx, d, 0, 80, top, W - 160, bottom - top);
    halftone(ctx, 80, top, W - 160, bottom - top);
    ctx.lineWidth = 5;
    ctx.strokeRect(80, top, W - 160, bottom - top);

    // price roundel
    const pr = pick(H, 96, 86, 74);
    rotated(ctx, 12, W - 160, top + pr + 20, () => {
      ctx.fillStyle = p.accent;
      ctx.beginPath();
      ctx.arc(W - 160, top + pr + 20, pr, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = p.deep;
      ctx.lineWidth = 4;
      ctx.stroke();
      label(ctx, d, 'sharadiya.price', 'দাম\nভালোবাসা', W - 160, top + pr + 8, `${Math.round(pr * 0.36)}px ${SIGN}`, p.deep, { lh: pr * 0.42 });
    });

    let y = label(ctx, d, 'greeting', d.greeting, W / 2, bottom + pick(H, 85, 72, 62), `${pick(H, 54, 48, 42)}px ${SIGN}`, p.deep) + 16;
    const ns = pick(H, 84, 70, 58);
    y = label(ctx, d, 'name', d.pujaBn, W / 2, y + ns * 0.9, `${ns}px ${SERIF}`, p.deep, { maxW: 940, maxLines: 2, fit: { max: ns, min: 44 } }) + 20;
    const contents = d.line || 'এই সংখ্যায়: ঠাকুর দেখা · ভোগ · আড্ডা · ধুনুচি নাচ';
    if (y + 40 < H - 100) y = label(ctx, d, 'line', contents, W / 2, y + 36, `${pick(H, 38, 34, 30)}px ${SERIF}`, p.ink, { maxW: 900, maxLines: 2 }) + 16;
    const from = d.from ? `— ইতি, ${d.from}` : '';
    if (shows(d, 'from', from) && y + 40 < H - 100) label(ctx, d, 'from', from, W / 2, y + 34, `36px ${SERIF}`, p.ink);
    grain(ctx, H);
    tag(ctx, H, d, p.deep, H - 60);
  },
};

const album: Template = {
  id: 'album',
  bn: 'পুজোর অ্যালবাম',
  en: 'Puja album',
  draw(ctx, H, d) {
    const paper = '#f4ead5';
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, W, H);
    const r = rng(7);
    for (let i = 0; i < 22; i++) shiuli(ctx, r() * W, r() * H, 18 + r() * 16, r() * TAU);

    label(ctx, d, 'album.head', 'পুজোর অ্যালবাম থেকে', W / 2, pick(H, 140, 108, 90), `${pick(H, 42, 38, 34)}px ${SERIF}`, '#6b5442');

    const pw = pick(H, 860, 760, 620);
    const photoH = pick(H, 1010, 650, 470);
    const pad = 34;
    const foot = pick(H, 230, 170, 140);
    const x = (W - pw) / 2;
    const y = pick(H, 220, 165, 135);
    const ph = pad + photoH + foot;

    rotated(ctx, -3, W / 2, y + ph / 2, () => {
      ctx.shadowColor = 'rgba(43,26,16,.28)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 14;
      ctx.fillStyle = '#fffdf6';
      ctx.fillRect(x, y, pw, ph);
      ctx.shadowColor = 'transparent';
      photo(ctx, d, 0, x + pad, y + pad, pw - pad * 2, photoH);

      const blue = '#2b3a8a';
      const gy = y + pad + photoH + pick(H, 92, 80, 66);
      label(ctx, d, 'greeting', d.greeting, W / 2, gy, `${pick(H, 66, 58, 50)}px ${SIGN}`, blue, { fit: { max: pick(H, 66, 58, 50), min: 30, w: pw - 80 } });
      const caption = d.areaBn ? `${d.pujaBn}, ${d.areaBn}` : d.pujaBn;
      const ls = pick(H, 46, 40, 34);
      label(ctx, d, 'album.label', caption, W / 2, gy + pick(H, 70, 58, 48), `${ls}px ${SIGN}`, blue, { fit: { max: ls, min: 26, w: pw - 80 } });

      // tape
      ctx.fillStyle = 'rgba(239,177,40,.55)';
      for (const tx of [x + 40, x + pw - 160]) {
        rotated(ctx, tx < W / 2 ? -14 : 12, tx + 60, y, () => ctx.fillRect(tx, y - 22, 120, 44));
      }
    });

    let ty = y + ph + pick(H, 120, 90, 70);
    const below: [string, string][] = [
      ['line', d.line],
      ['from', d.from ? `— ইতি, ${d.from}` : ''],
    ];
    for (const [key, def] of below) {
      if (!shows(d, key, def)) continue;
      if (ty > H - 110) break;
      ty = label(ctx, d, key, def, W / 2, ty, `${pick(H, 48, 42, 36)}px ${SERIF}`, INK, { maxW: 900, maxLines: 2 }) + 34;
    }
    grain(ctx, H, 0.05);
    tag(ctx, H, d, '#6b5442');
  },
};

const alpona: Template = {
  id: 'alpona',
  bn: 'আলপনা',
  en: 'Alpona',
  draw(ctx, H, d) {
    const p = d.palette;
    const white = '#fffaf0';
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, W, H);
    label(ctx, d, 'greeting', d.greeting, W / 2, pick(H, 180, 140, 112), `${pick(H, 110, 92, 78)}px ${SIGN}`, p.accent, { shadow: p.deep });

    const cx = W / 2;
    const cy = pick(H, 800, 600, 478);
    const R = pick(H, 460, 400, 325);
    ctx.fillStyle = p.deep;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = white;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 12, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 12]);
    ctx.beginPath();
    ctx.arc(cx, cy, R - 30, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    // lotus petals
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 16; i++) {
      ctx.rotate(TAU / 16);
      const a = R * 0.7;
      const b = R * 0.93;
      const wdt = R * 0.1;
      ctx.fillStyle = white;
      ctx.beginPath();
      ctx.moveTo(0, -b);
      ctx.quadraticCurveTo(wdt, -(a + b) / 2, 0, -a);
      ctx.quadraticCurveTo(-wdt, -(a + b) / 2, 0, -b);
      ctx.fill();
      ctx.fillStyle = p.accent;
      ctx.beginPath();
      ctx.arc(0, -(a + b) / 2, R * 0.018, 0, TAU);
      ctx.fill();
      ctx.fillStyle = white;
      ctx.beginPath();
      ctx.arc(R * 0.13, -R * 0.66, R * 0.014, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    const r = R * 0.6;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.clip();
    photo(ctx, d, 0, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();

    credits(ctx, d, cy + R + pick(H, 130, 105, 95), H - 100, { name: p.ink, area: p.accent, ink: p.ink });
    grain(ctx, H);
    tag(ctx, H, d, p.ink);
  },
};

const ticket: Template = {
  id: 'ticket',
  bn: 'ঠাকুর দেখার টিকিট',
  en: 'Pandal-hopping ticket',
  draw(ctx, H, d) {
    const p = d.palette;
    const cream = '#fbf3e4';
    ctx.fillStyle = p.deep;
    ctx.fillRect(0, 0, W, H);
    const r = rng(11);
    const confetti = [p.accent, p.soft, '#fffaf0', HALDI];
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = confetti[i % confetti.length];
      ctx.globalAlpha = 0.5;
      ctx.fillRect(r() * W, r() * H, 6 + r() * 10, 6 + r() * 10);
    }
    ctx.globalAlpha = 1;

    const x = 90;
    const w = W - 180;
    const y0 = pick(H, 120, 80, 56);
    const y1 = H - pick(H, 150, 100, 76);
    const perf = y1 - pick(H, 230, 170, 130);

    roundRect(ctx, x, y0, w, y1 - y0, 30);
    ctx.fillStyle = cream;
    ctx.fill();

    const hh = pick(H, 200, 170, 140);
    ctx.save();
    roundRect(ctx, x, y0, w, y1 - y0, 30);
    ctx.clip();
    ctx.fillStyle = p.bg;
    ctx.fillRect(x, y0, w, hh);
    ctx.restore();
    label(ctx, d, 'ticket.title', 'ঠাকুর দেখার টিকিট', W / 2, y0 + hh * 0.55, `${pick(H, 84, 72, 60)}px ${SIGN}`, p.ink, { fit: { max: pick(H, 84, 72, 60), min: 36, w: w - 60 } });
    label(ctx, d, 'ticket.admit', 'ADMIT ONE  ·  একজন', W / 2, y0 + hh - 26, `600 ${pick(H, 28, 26, 22)}px ${UI}`, p.ink);

    const top = y0 + hh + 36;
    const photoH = pick(H, 760, 440, 300);
    photo(ctx, d, 0, x + 40, top, w - 80, photoH);

    // details
    const caption = (key: string, s: string, lx: number, ly: number) => label(ctx, d, key, s, lx, ly, `600 ${pick(H, 30, 26, 24)}px ${UI}`, '#8a6d55', { align: 'left' });
    const value = (key: string, s: string, lx: number, ly: number, maxW: number) => {
      const size = pick(H, 56, 48, 42);
      label(ctx, d, key, s, lx, ly, `${size}px ${SIGN}`, INK, { align: 'left', fit: { max: size, min: 24, w: maxW } });
    };
    const row = pick(H, 116, 96, 88);
    let ry = top + photoH + pick(H, 64, 52, 46);
    const lx = x + 50;
    const mid = W / 2 + 20;
    const vy = pick(H, 48, 44, 40);
    caption('ticket.l.puja', 'পুজো', lx, ry);
    value('name', d.pujaBn, lx, ry + vy, w - 100);
    ry += row;
    if (ry + 40 < perf - 10) {
      caption('ticket.l.area', 'জায়গা', lx, ry);
      value('area', d.areaBn || 'আমাদের পাড়া', lx, ry + vy, mid - lx - 30);
      caption('ticket.l.tithi', 'তিথি', mid, ry);
      value('ticket.tithi', d.greeting.replace(/^শুভ\s*/, ''), mid, ry + vy, x + w - mid - 40);
      ry += row;
    }
    if (ry + 40 < perf - 10) {
      caption('ticket.l.time', 'সময়', lx, ry);
      value('ticket.time', 'সারা রাত', lx, ry + vy, mid - lx - 30);
      caption('ticket.l.seat', 'সিট', mid, ry);
      value('ticket.seat', 'যেখানে খুশি', mid, ry + vy, x + w - mid - 40);
    }

    // perforation & notches
    ctx.setLineDash([14, 12]);
    ctx.strokeStyle = '#b7a387';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 40, perf);
    ctx.lineTo(x + w - 40, perf);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = p.deep;
    for (const nx of [x, x + w]) {
      ctx.beginPath();
      ctx.arc(nx, perf, 32, 0, TAU);
      ctx.fill();
    }

    // stub: serial + barcode
    const sy = perf + (y1 - perf) / 2;
    const serial = `নং ${toBnDigits(Math.floor(r() * 9000) + 1000)}`;
    label(ctx, d, 'ticket.serial', serial, lx, sy + 4, `${pick(H, 44, 40, 34)}px ${SIGN}`, SINDOOR, { align: 'left' });
    if (shows(d, 'from', d.from ? `— ${d.from}` : '')) label(ctx, d, 'from', d.from ? `— ${d.from}` : '', lx, sy + pick(H, 60, 50, 42), `${pick(H, 34, 30, 26)}px ${SERIF}`, INK, { align: 'left' });
    ctx.fillStyle = INK;
    let bx = W / 2 + 40;
    while (bx < x + w - 50) {
      const bw = 2 + Math.floor(r() * 6);
      ctx.fillRect(bx, sy - pick(H, 50, 40, 32), bw, pick(H, 100, 80, 64));
      bx += bw + 3 + Math.floor(r() * 5);
    }

    grain(ctx, H, 0.05);
    tag(ctx, H, d, p.ink, H - pick(H, 60, 40, 26));
  },
};

const bijoya: Template = {
  id: 'bijoya',
  bn: 'শুভ বিজয়া',
  en: 'Shubho Bijoya',
  draw(ctx, H, d) {
    const cream = '#fbf3e4';
    ctx.fillStyle = cream;
    ctx.fillRect(0, 0, W, H);

    // sindoor smudges
    const r = rng(23);
    for (let i = 0; i < 26; i++) {
      const sx = r() < 0.5 ? r() * 320 : W - r() * 320;
      const sy = r() * H;
      const sr = 30 + r() * 110;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      g.addColorStop(0, `rgba(200,30,30,${0.25 + r() * 0.35})`);
      g.addColorStop(1, 'rgba(200,30,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, TAU);
      ctx.fill();
    }

    // lal-paar border
    const band = 46;
    ctx.fillStyle = SINDOOR;
    ctx.fillRect(0, 0, W, band);
    ctx.fillRect(0, H - band, W, band);
    ctx.fillRect(0, 0, band, H);
    ctx.fillRect(W - band, 0, band, H);
    ctx.fillStyle = HALDI;
    for (let i = 23; i < W; i += 46) {
      ctx.beginPath();
      ctx.arc(i, 23, 6, 0, TAU);
      ctx.arc(i, H - 23, 6, 0, TAU);
      ctx.fill();
    }
    for (let i = 69; i < H - 46; i += 46) {
      ctx.beginPath();
      ctx.arc(23, i, 6, 0, TAU);
      ctx.arc(W - 23, i, 6, 0, TAU);
      ctx.fill();
    }

    const ts = pick(H, 170, 140, 116);
    const ty = pick(H, 270, 210, 175);
    label(ctx, d, 'bijoya.title', 'শুভ বিজয়া', W / 2, ty, `${ts}px ${SIGN}`, SINDOOR, { shadow: HALDI, shadowOffset: 6, fit: { max: ts, min: 50, w: 900 } });

    const top = ty + pick(H, 80, 60, 50);
    const bottom = H - pick(H, 520, 380, 300);
    ctx.save();
    roundRect(ctx, 150, top, W - 300, bottom - top, 60);
    ctx.clip();
    photo(ctx, d, 0, 150, top, W - 300, bottom - top);
    ctx.restore();
    roundRect(ctx, 150, top, W - 300, bottom - top, 60);
    ctx.strokeStyle = HALDI;
    ctx.lineWidth = 10;
    ctx.stroke();

    const y = label(ctx, d, 'bijoya.line', 'আসছে বছর আবার হবে', W / 2, bottom + pick(H, 110, 95, 80), `${pick(H, 72, 62, 54)}px ${SIGN}`, SINDOOR, { fit: { max: pick(H, 72, 62, 54), min: 30, w: 900 } }) + 10;
    credits(ctx, d, y + pick(H, 70, 60, 50), H - 100, { name: INK, area: SINDOOR, ink: INK }, pick(H, 60, 54, 48));
    grain(ctx, H, 0.05);
    tag(ctx, H, d, '#7a1712', H - 70);
  },
};


const duo: Template = {
  id: 'duo',
  bn: 'সেলফি জুটি',
  en: 'Selfie duo',
  slots: ['প্যান্ডেল / ঠাকুর', 'আপনার সেলফি'],
  slotsEn: ['Pandal / Thakur', 'Your selfie'],
  draw(ctx, H, d) {
    const p = d.palette;
    ctx.fillStyle = p.deep;
    ctx.fillRect(0, 0, W, H);

    const mainH = pick(H, 1240, 860, 650);
    photo(ctx, d, 0, 0, 0, W, mainH);
    // fade the photo into the ground colour, and darken the top for the greeting
    const fade = ctx.createLinearGradient(0, mainH - 320, 0, mainH);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, p.deep);
    ctx.fillStyle = fade;
    ctx.fillRect(0, mainH - 320, W, 320);
    const top = ctx.createLinearGradient(0, 0, 0, 300);
    top.addColorStop(0, 'rgba(0,0,0,.55)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, 300);
    label(ctx, d, 'greeting', d.greeting, W / 2, pick(H, 160, 130, 110), `${pick(H, 104, 90, 76)}px ${SIGN}`, p.accent, { shadow: 'rgba(0,0,0,.6)' });

    // selfie in a marigold garland, straddling the photo's edge
    const r = pick(H, 220, 190, 150);
    const cx = W / 2;
    const cy = mainH;
    const beads = 30;
    for (let i = 0; i < beads; i++) {
      const a = (i / beads) * TAU;
      ctx.fillStyle = i % 2 ? '#f59f1a' : '#e8731c';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * (r + 26), cy + Math.sin(a) * (r + 26), 22, 0, TAU);
      ctx.fill();
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.clip();
    photo(ctx, d, 1, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    ctx.strokeStyle = '#fffaf0';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();

    // the credits sit on the deep ground: light palettes (haldi, lal paar…) have a dark ink, so use their light bg there
    const onDeep = isDarkHex(p.ink) ? { name: p.bg, area: '#fffaf0', ink: '#fffaf0' } : { name: p.ink, area: p.accent, ink: p.ink };
    credits(ctx, d, cy + r + pick(H, 130, 105, 85), H - 100, onDeep);
    tag(ctx, H, d, onDeep.ink);
  },
};

/** Rough perceived lightness of a #rrggbb colour (0 dark … 1 light). */
function isDarkHex(hex: string): boolean {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

const parikrama: Template = {
  id: 'parikrama',
  bn: 'পুজো পরিক্রমা',
  en: 'Puja tour',
  slots: ['ছবি ১', 'ছবি ২', 'ছবি ৩', 'ছবি ৪'],
  slotsEn: ['Photo 1', 'Photo 2', 'Photo 3', 'Photo 4'],
  draw(ctx, H, d) {
    const paper = '#f6ecd6';
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = SINDOOR;
    ctx.fillRect(0, 0, W, 34);
    ctx.fillRect(0, H - 34, W, 34);
    ctx.fillStyle = HALDI;
    for (let x = 17; x < W; x += 34) {
      ctx.beginPath();
      ctx.arc(x, 17, 5, 0, TAU);
      ctx.arc(x, H - 17, 5, 0, TAU);
      ctx.fill();
    }

    label(ctx, d, 'parikrama.title', 'আমার পুজো পরিক্রমা', W / 2, pick(H, 170, 140, 118), `${pick(H, 104, 88, 74)}px ${SIGN}`, SINDOOR, { shadow: HALDI, shadowOffset: 4, fit: { max: pick(H, 104, 88, 74), min: 44, w: 940 } });
    label(ctx, d, 'parikrama.sub', `${d.greeting} · ${d.areaBn || d.pujaBn}`, W / 2, pick(H, 240, 198, 168), `${pick(H, 42, 38, 32)}px ${SERIF}`, INK, { maxW: 940, maxLines: 1 });

    const top = pick(H, 300, 240, 200);
    const bottom = H - pick(H, 330, 220, 120);
    const gap = 34;
    const cw = (W - 70 * 2 - gap) / 2;
    const ch = (bottom - top - gap) / 2;
    const tilts = [-3, 2.5, 2, -2.5];
    for (let i = 0; i < 4; i++) {
      const x = 70 + (i % 2) * (cw + gap);
      const y = top + Math.floor(i / 2) * (ch + gap);
      rotated(ctx, tilts[i], x + cw / 2, y + ch / 2, () => {
        ctx.shadowColor = 'rgba(43,26,16,.25)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = '#fffdf6';
        ctx.fillRect(x, y, cw, ch);
        ctx.shadowColor = 'transparent';
        const foot = pick(H, 64, 52, 40);
        photo(ctx, d, i, x + 14, y + 14, cw - 28, ch - 14 - foot);
        label(ctx, d, `parikrama.n${i + 1}`, `#${toBnDigits(i + 1)}`, x + cw / 2, y + ch - foot / 2 + 10, `${pick(H, 40, 34, 28)}px ${SIGN}`, '#2b3a8a', { fit: { max: pick(H, 40, 34, 28), min: 18, w: cw - 30 } });
      });
    }

    let y = bottom + pick(H, 110, 80, 0);
    if (H >= 1300) {
      const below: [string, string][] = [
        ['line', d.line],
        ['from', d.from ? `— ইতি, ${d.from}` : ''],
      ];
      for (const [key, def] of below) {
        if (!shows(d, key, def)) continue;
        if (y > H - 110) break;
        y = label(ctx, d, key, def, W / 2, y, `${pick(H, 48, 42, 36)}px ${SERIF}`, INK, { maxW: 920, maxLines: 2 }) + 34;
      }
    }
    grain(ctx, H, 0.05);
    tag(ctx, H, d, INK, H - 56);
  },
};

const reel: Template = {
  id: 'reel',
  bn: 'পুজোর রিল',
  en: 'Puja reel',
  slots: ['ছবি ১', 'ছবি ২', 'ছবি ৩'],
  slotsEn: ['Photo 1', 'Photo 2', 'Photo 3'],
  draw(ctx, H, d) {
    const p = d.palette;
    ctx.fillStyle = '#17110d';
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, H * 0.7);
    glow.addColorStop(0, p.deep);
    glow.addColorStop(1, '#17110d');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    label(ctx, d, 'reel.title', 'পুজোর রিল', W / 2, pick(H, 170, 135, 112), `${pick(H, 110, 92, 76)}px ${SIGN}`, HALDI, { shadow: SINDOOR, fit: { max: pick(H, 110, 92, 76), min: 40, w: 940 } });
    label(ctx, d, 'greeting', d.greeting, W / 2, pick(H, 240, 192, 160), `600 ${pick(H, 38, 34, 30)}px ${UI}`, '#fbe9c8');

    const top = pick(H, 290, 230, 190);
    const bottom = H - pick(H, 330, 240, 215);
    const sx = 170;
    const sw = W - 340;
    rotated(ctx, -2, W / 2, (top + bottom) / 2, () => {
      ctx.fillStyle = '#0b0908';
      ctx.fillRect(sx, top, sw, bottom - top);
      // sprocket holes
      ctx.fillStyle = '#f1e2c4';
      for (let y = top + 20; y < bottom - 30; y += 58) {
        roundRect(ctx, sx + 16, y, 26, 34, 6);
        ctx.fill();
        roundRect(ctx, sx + sw - 42, y, 26, 34, 6);
        ctx.fill();
      }
      const fx = sx + 64;
      const fw = sw - 128;
      const gap = 22;
      const fh = (bottom - top - gap * 4) / 3;
      for (let i = 0; i < 3; i++) {
        const fy = top + gap + i * (fh + gap);
        photo(ctx, d, i, fx, fy, fw, fh);
        ctx.fillStyle = '#e8731c';
        ctx.font = `600 18px ${UI}`;
        ctx.textAlign = 'left';
        ctx.fillText(`PARAR PUJO 400  ▸ ${i + 1}A`, fx, fy + fh + 17);
      }
    });

    credits(ctx, d, bottom + pick(H, 120, 100, 92), H - 100, { name: '#fbe9c8', area: HALDI, ink: '#fbe9c8' }, pick(H, 84, 74, 64));
    tag(ctx, H, d, '#fbe9c8');
  },
};

const patrika: Template = {
  id: 'patrika',
  bn: 'পাড়ার বার্তা',
  en: 'Para news',
  draw(ctx, H, d) {
    const paper = '#f1ead8';
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, W, H);

    const mast = pick(H, 190, 160, 135);
    label(ctx, d, 'patrika.title', 'পাড়ার বার্তা', W / 2, mast, `${pick(H, 150, 124, 104)}px ${SIGN}`, INK, { fit: { max: pick(H, 150, 124, 104), min: 50, w: 940 } });
    ctx.fillStyle = INK;
    ctx.fillRect(60, mast + 30, W - 120, 6);
    ctx.fillRect(60, mast + 42, W - 120, 2);
    const dateline = `${d.areaBn || 'আমাদের পাড়া'} · ${d.greeting} · দাম: এক ভাঁড় চা`;
    label(ctx, d, 'patrika.dateline', dateline, W / 2, mast + 86, `600 ${pick(H, 30, 28, 24)}px ${UI}`, INK, { maxW: W - 140, maxLines: 1 });
    ctx.fillRect(60, mast + 108, W - 120, 2);

    const headline = d.line || `${d.pujaBn}-এ উপচে পড়া ভিড়!`;
    const hs = pick(H, 92, 78, 64);
    let y = label(ctx, d, 'patrika.headline', headline, W / 2, mast + 108 + hs * 1.15, `${hs}px ${SERIF}`, INK, { maxW: W - 140, maxLines: 2, lh: hs * 1.15 }) + 24;

    const ph = pick(H, 760, 470, 360);
    photo(ctx, d, 0, 60, y, W - 120, ph);
    halftone(ctx, 60, y, W - 120, ph);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(60, y, W - 120, ph);
    y += ph;
    y = label(ctx, d, 'patrika.credit', `ছবি: ${d.from || 'পাড়ার চিত্রগ্রাহক'}`, 60, y + 36, `${pick(H, 26, 24, 22)}px ${SERIF}`, '#5a4a3a', { align: 'left' }) + 18;

    // the "report", in two columns, as far as space allows
    const storyDef = `নিজস্ব সংবাদদাতা, ${d.areaBn || 'পাড়া'}: ${d.greeting.replace(/^শুভ\s*/, '')}-র সন্ধেয় ${d.pujaBn}-র মণ্ডপে ঠাকুর দেখতে ভিড় জমালেন পাড়ার সবাই। ঢাকের তালে, ধুনুচি নাচে আর আলোর রোশনাইয়ে জমজমাট গোটা এলাকা। প্রবীণরা বলছেন, "এমন পুজো আগে দেখিনি!" খুদেরা বেলুন হাতে, বড়রা ভাঁড়ে চা — পুজো জমে ক্ষীর।`;
    const story = textOf(d, 'patrika.story', storyDef);
    const storyStyle = d.textStyles?.['patrika.story'];
    const colW = (W - 120 - 40) / 2;
    const bottomLimit = H - 100;
    if (y + 40 < bottomLimit) d.textRects?.push({ key: 'patrika.story', def: storyDef, value: story, x: 60, y, w: W - 120, h: story.trim() ? bottomLimit - y : 0 });
    if (y + 40 < bottomLimit && story.trim()) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y, W, bottomLimit - y);
      ctx.clip();
      const fs = pick(H, 30, 27, 24);
      ctx.font = storyStyle?.family ? `${storyStyle.weight ?? 400} ${fs}px "${storyStyle.family}"` : `${fs}px ${SERIF}`;
      const words = story.split(' ');
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        const t = line ? `${line} ${w}` : w;
        if (ctx.measureText(t).width > colW && line) {
          lines.push(line);
          line = w;
        } else line = t;
      }
      lines.push(line);
      const lh = fs * 1.45;
      const perCol = Math.max(1, Math.floor((bottomLimit - y - fs) / lh));
      ctx.fillStyle = storyStyle?.color ?? INK;
      ctx.textAlign = 'left';
      lines.slice(0, perCol * 2).forEach((l, i) => {
        const col = Math.floor(i / perCol);
        ctx.fillText(l, 60 + col * (colW + 40), y + fs + (i % perCol) * lh);
      });
      ctx.fillRect(W / 2 - 1, y, 2, Math.min(perCol, Math.ceil(lines.length / 2)) * lh);
      ctx.restore();
    }
    grain(ctx, H, 0.08);
    tag(ctx, H, d, '#5a4a3a', H - 50);
  },
};

const chokh: Template = {
  id: 'chokh',
  bn: 'মায়ের চোখ',
  en: "Maa's eyes",
  draw(ctx, H, d) {
    const p = d.palette;
    const bg = ctx.createRadialGradient(W / 2, H * 0.45, 80, W / 2, H * 0.45, H * 0.7);
    bg.addColorStop(0, p.soft);
    bg.addColorStop(1, p.bg);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    label(ctx, d, 'greeting', d.greeting, W / 2, pick(H, 190, 130, 104), `${pick(H, 110, 92, 76)}px ${SIGN}`, p.accent, { shadow: p.deep });

    const cx = W / 2;
    const cy = pick(H, 900, 650, 525);
    const hw = 440;
    const hh = pick(H, 290, 240, 195);

    // third eye, then the brow
    const ty = cy - hh - pick(H, 175, 135, 108);
    const th = pick(H, 70, 58, 46);
    ctx.fillStyle = SINDOOR;
    ctx.strokeStyle = '#120a06';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx, ty - th);
    ctx.quadraticCurveTo(cx + th * 0.6, ty, cx, ty + th);
    ctx.quadraticCurveTo(cx - th * 0.6, ty, cx, ty - th);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = HALDI;
    ctx.beginPath();
    ctx.arc(cx, ty, th * 0.22, 0, TAU);
    ctx.fill();
    ctx.lineWidth = pick(H, 26, 22, 18);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - hw + 30, cy - hh * 0.9);
    ctx.quadraticCurveTo(cx, cy - hh * 2.05, cx + hw - 10, cy - hh * 0.75);
    ctx.stroke();

    // the eye itself, with the photo inside
    const eye = () => {
      ctx.beginPath();
      ctx.moveTo(cx - hw, cy);
      ctx.quadraticCurveTo(cx, cy - hh * 2, cx + hw, cy);
      ctx.quadraticCurveTo(cx, cy + hh * 2, cx - hw, cy);
      ctx.closePath();
    };
    ctx.save();
    eye();
    ctx.clip();
    photo(ctx, d, 0, cx - hw, cy - hh, hw * 2, hh * 2);
    ctx.restore();
    eye();
    ctx.lineWidth = pick(H, 26, 22, 18);
    ctx.lineJoin = 'round';
    ctx.stroke();
    // kohl wing
    ctx.beginPath();
    ctx.moveTo(cx + hw - 8, cy);
    ctx.quadraticCurveTo(cx + hw + 34, cy - 10, cx + hw + 56, cy - hh * 0.5);
    ctx.stroke();
    ctx.lineCap = 'butt';

    credits(ctx, d, cy + hh + pick(H, 150, 115, 92), H - 100, { name: p.ink, area: p.accent, ink: p.ink });
    grain(ctx, H);
    tag(ctx, H, d, p.ink);
  },
};

const lalpaar: Template = {
  id: 'lalpaar',
  bn: 'লাল পাড়',
  en: 'Lal paar sari',
  draw(ctx, H, d) {
    const cream = '#fbf6ea';
    ctx.fillStyle = SINDOOR;
    ctx.fillRect(0, 0, W, H);
    const b = 64;
    ctx.fillStyle = cream;
    ctx.fillRect(b, b, W - b * 2, H - b * 2);
    // temple-tooth border inside the red
    ctx.fillStyle = SINDOOR;
    const tooth = 30;
    for (let x = b; x < W - b; x += tooth) {
      ctx.beginPath();
      ctx.moveTo(x, b);
      ctx.lineTo(x + tooth / 2, b + 22);
      ctx.lineTo(x + tooth, b);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, H - b);
      ctx.lineTo(x + tooth / 2, H - b - 22);
      ctx.lineTo(x + tooth, H - b);
      ctx.fill();
    }
    ctx.strokeStyle = HALDI;
    ctx.lineWidth = 4;
    ctx.strokeRect(b - 14, b - 14, W - (b - 14) * 2, H - (b - 14) * 2);

    label(ctx, d, 'greeting', d.greeting, W / 2, pick(H, 250, 200, 170), `${pick(H, 120, 100, 84)}px ${SIGN}`, SINDOOR);
    const top = pick(H, 320, 250, 210);
    const bottom = H - pick(H, 520, 360, 290);
    ctx.save();
    roundRect(ctx, 130, top, W - 260, bottom - top, 24);
    ctx.clip();
    photo(ctx, d, 0, 130, top, W - 260, bottom - top);
    ctx.restore();
    roundRect(ctx, 130, top, W - 260, bottom - top, 24);
    ctx.strokeStyle = SINDOOR;
    ctx.lineWidth = 6;
    ctx.stroke();

    credits(ctx, d, bottom + pick(H, 130, 105, 90), H - 120, { name: SINDOOR, area: '#8a5a1a', ink: INK });
    tag(ctx, H, d, '#fbe9c8', H - 22);
  },
};

export const TEMPLATES: Template[] = [duo, chalchitra, parikrama, postcard, patrika, chokh, stamp, reel, sharadiya, album, ticket, marquee, alpona, lalpaar, bijoya];

/** Draws a template; returns where photo slots and editable texts landed (for tapping on the preview). */
export function drawCard(canvas: HTMLCanvasElement, template: Template, H: number, d: CardData, scale = 1): { slots: SlotRect[]; texts: TextRect[] } {
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const slots: SlotRect[] = [];
  const texts: TextRect[] = [];
  template.draw(ctx, H, { ...d, slots, textRects: texts, scale });
  return { slots, texts };
}
