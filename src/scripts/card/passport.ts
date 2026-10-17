// Shareable image of someone's ঠাকুর দেখা passport (story size).
import { toBnDigits } from '../../lib/bangla';
import { INK, SERIF, SIGN, SINDOOR, UI, W, text } from './kit';

const H = 1920;

export interface PassportInput {
  stamps: { nameBn: string; color: string; seen: boolean }[];
  seenCount: number;
  total: number;
  rank: string;
  site: string;
}

export function drawPassport(canvas: HTMLCanvasElement, p: PassportInput) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const navy = '#1f2a5a';
  ctx.fillStyle = navy;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fdf6e7';
  ctx.fillRect(60, 60, W - 120, H - 120);

  text(ctx, 'ঠাকুর দেখা পাসপোর্ট', W / 2, 220, `96px ${SIGN}`, navy);
  text(ctx, `${toBnDigits(p.seenCount)}/${toBnDigits(p.total)}`, W / 2, 440, `220px ${SIGN}`, SINDOOR);
  text(ctx, 'ঠাকুর দেখা হল', W / 2, 530, `56px ${SERIF}`, INK);
  text(ctx, p.rank, W / 2, 620, `600 48px ${UI}`, navy);

  const cols = 3;
  const size = 250;
  const gap = 40;
  const gx = (W - (cols * size + (cols - 1) * gap)) / 2;
  const maxRows = Math.floor((H - 260 - 720) / (size + gap));
  p.stamps.slice(0, maxRows * cols).forEach((s, i) => {
    const x = gx + (i % cols) * (size + gap) + size / 2;
    const y = 720 + Math.floor(i / cols) * (size + gap) + size / 2;
    ctx.save();
    ctx.translate(x, y);
    if (s.seen) {
      ctx.rotate((((i * 37) % 30) - 15) * (Math.PI / 180));
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, size / 2 - 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, size / 2 - 24, 0, Math.PI * 2);
      ctx.stroke();
      text(ctx, s.nameBn, 0, -6, `44px ${SIGN}`, s.color, { maxW: size - 70, lh: 48 });
    } else {
      ctx.setLineDash([12, 12]);
      ctx.strokeStyle = 'rgba(31,42,90,.3)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, size / 2 - 8, 0, Math.PI * 2);
      ctx.stroke();
      text(ctx, toBnDigits(i + 1), 0, 24, `80px ${SIGN}`, 'rgba(31,42,90,.3)');
    }
    ctx.restore();
  });

  text(ctx, `#পাড়ারপুজো · ${p.site}`, W / 2, H - 120, `600 36px ${UI}`, navy);
}
