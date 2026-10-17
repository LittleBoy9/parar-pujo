// Hand-drawn puja stickers, drawn as vectors so they stay crisp at any size.
// Each draws centred on (0,0) inside a box of roughly ±50 units; callers scale.

export interface Sticker {
  id: string;
  bn: string;
  draw(ctx: CanvasRenderingContext2D): void;
}

const TAU = Math.PI * 2;
const INK = '#2b1a10';

function line(ctx: CanvasRenderingContext2D, w = 2.5) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

export const STICKERS: Sticker[] = [
  {
    id: 'dhak',
    bn: 'ঢাক',
    draw(ctx) {
      line(ctx);
      ctx.fillStyle = '#fffaf0';
      for (const [x, tip] of [[-14, -48], [0, -54], [14, -48]]) {
        ctx.beginPath();
        ctx.moveTo(x - 4, -18);
        ctx.quadraticCurveTo(x - 14, tip + 10, x + (x / 3), tip);
        ctx.quadraticCurveTo(x + 10, tip + 16, x + 5, -18);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#b3261e';
      ctx.beginPath();
      ctx.ellipse(0, 12, 44, 30, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#efb128';
      ctx.lineWidth = 5;
      for (const y of [2, 22]) {
        ctx.beginPath();
        ctx.moveTo(-42, y);
        ctx.quadraticCurveTo(0, y + 18, 42, y);
        ctx.stroke();
      }
      line(ctx);
      ctx.fillStyle = '#f1dcc0';
      ctx.beginPath();
      ctx.ellipse(-44, 12, 8, 26, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    },
  },
  {
    id: 'prodip',
    bn: 'প্রদীপ',
    draw(ctx) {
      const glow = ctx.createRadialGradient(0, -22, 2, 0, -22, 42);
      glow.addColorStop(0, 'rgba(255,220,120,.9)');
      glow.addColorStop(1, 'rgba(255,180,70,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -22, 42, 0, TAU);
      ctx.fill();
      line(ctx);
      ctx.fillStyle = '#ffd36b';
      ctx.beginPath();
      ctx.moveTo(0, -46);
      ctx.quadraticCurveTo(12, -24, 0, -12);
      ctx.quadraticCurveTo(-12, -24, 0, -46);
      ctx.fill();
      ctx.fillStyle = '#c8662e';
      ctx.beginPath();
      ctx.moveTo(-46, 4);
      ctx.quadraticCurveTo(0, 46, 46, 4);
      ctx.quadraticCurveTo(30, -2, 0, 0);
      ctx.quadraticCurveTo(-30, -2, -46, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#f2b632';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-30, 14);
      ctx.quadraticCurveTo(0, 30, 30, 14);
      ctx.stroke();
    },
  },
  {
    id: 'shiuli',
    bn: 'শিউলি',
    draw(ctx) {
      const flower = (x: number, y: number, s: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = '#fffaf0';
        ctx.strokeStyle = 'rgba(120,90,60,.45)';
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
      };
      flower(-16, -10, 34, 0.2);
      flower(22, 18, 26, 1.1);
      flower(-20, 30, 18, 2);
    },
  },
  {
    id: 'kash',
    bn: 'কাশফুল',
    draw(ctx) {
      for (const [x, lean, h] of [[-18, -14, 92], [0, 4, 100], [18, 18, 86]]) {
        ctx.strokeStyle = '#6e7a3a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, 50);
        ctx.quadraticCurveTo(x + lean * 0.3, 50 - h * 0.6, x + lean, 50 - h);
        ctx.stroke();
        ctx.fillStyle = '#fffaf0';
        ctx.strokeStyle = '#d9cdb4';
        ctx.lineWidth = 1.2;
        const tx = x + lean;
        const ty = 50 - h;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx - 14, ty + 22, tx - 4, ty + 50);
        ctx.quadraticCurveTo(tx + 6, ty + 26, tx, ty);
        ctx.quadraticCurveTo(tx + 14, ty + 22, tx + 6, ty + 46);
        ctx.fill();
        ctx.stroke();
      }
    },
  },
  {
    id: 'chokh',
    bn: 'মায়ের চোখ',
    draw(ctx) {
      line(ctx, 5);
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.moveTo(-48, 14);
      ctx.quadraticCurveTo(0, -20, 48, 14);
      ctx.quadraticCurveTo(0, 34, -48, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(0, 12, 11, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-44, -8);
      ctx.quadraticCurveTo(0, -38, 46, -6);
      ctx.stroke();
      ctx.fillStyle = '#b3261e';
      ctx.beginPath();
      ctx.moveTo(0, -50);
      ctx.quadraticCurveTo(9, -38, 0, -26);
      ctx.quadraticCurveTo(-9, -38, 0, -50);
      ctx.fill();
      ctx.stroke();
    },
  },
  {
    id: 'shankha',
    bn: 'শাঁখ',
    draw(ctx) {
      line(ctx, 3);
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.moveTo(-40, -6);
      ctx.bezierCurveTo(-30, -44, 30, -40, 44, -6);
      ctx.bezierCurveTo(50, 14, 30, 30, 8, 32);
      ctx.lineTo(-30, 44);
      ctx.bezierCurveTo(-26, 26, -48, 14, -40, -6);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-18, -20);
      ctx.bezierCurveTo(0, -30, 26, -22, 30, -2);
      ctx.moveTo(-22, 0);
      ctx.bezierCurveTo(-4, -10, 18, -6, 22, 12);
      ctx.stroke();
      ctx.fillStyle = '#e8731c';
      ctx.beginPath();
      ctx.arc(-30, 44, 6, 0, TAU);
      ctx.fill();
    },
  },
  {
    id: 'dhunuchi',
    bn: 'ধুনুচি',
    draw(ctx) {
      ctx.strokeStyle = 'rgba(120,120,120,.55)';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.bezierCurveTo(-24, -26, 20, -38, -4, -56);
      ctx.moveTo(10, -14);
      ctx.bezierCurveTo(30, -30, 4, -40, 22, -58);
      ctx.stroke();
      const fire = ctx.createRadialGradient(0, -8, 2, 0, -8, 26);
      fire.addColorStop(0, '#fff0a0');
      fire.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = fire;
      ctx.beginPath();
      ctx.arc(0, -8, 26, 0, TAU);
      ctx.fill();
      line(ctx);
      ctx.fillStyle = '#9c4a22';
      ctx.beginPath();
      ctx.moveTo(-34, -6);
      ctx.lineTo(34, -6);
      ctx.quadraticCurveTo(26, 22, 6, 26);
      ctx.lineTo(10, 46);
      ctx.lineTo(-10, 46);
      ctx.lineTo(-6, 26);
      ctx.quadraticCurveTo(-26, 22, -34, -6);
      ctx.fill();
      ctx.stroke();
    },
  },
  {
    id: 'padma',
    bn: 'পদ্ম',
    draw(ctx) {
      line(ctx, 2);
      const petal = (rot: number, len: number, color: string) => {
        ctx.save();
        ctx.translate(0, 26);
        ctx.rotate(rot);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-16, -len * 0.55, 0, -len);
        ctx.quadraticCurveTo(16, -len * 0.55, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };
      for (const r of [-1.2, 1.2]) petal(r, 52, '#f4a7b9');
      for (const r of [-0.6, 0.6]) petal(r, 66, '#ef8aa3');
      petal(0, 74, '#e86a8a');
      ctx.fillStyle = '#5e8f63';
      ctx.beginPath();
      ctx.ellipse(0, 34, 46, 10, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    },
  },
];

export const stickerById = (id: string) => STICKERS.find((s) => s.id === id) ?? STICKERS[0];
