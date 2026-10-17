// Small shared helpers for the Worker.

export const HOUR = 60 * 60 * 1000;
export const STORY_LIFETIME = 24 * HOUR;

export function json(data: unknown, init: ResponseInit & { cache?: number } = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', init.cache ? `public, max-age=${init.cache}` : 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

/** Error with a Bengali message the page can show as-is. */
export function fail(status: number, code: string, message: string): Response {
  return json({ error: code, message }, { status });
}

const encoder = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Salted hash of the visitor's IP — enough for rate limits, never stored raw. */
export async function visitorId(request: Request, env: Env): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  return (await sha256Hex(`${env.IP_SALT}:${ip}`)).slice(0, 32);
}

/** Calendar day in India, e.g. "2026-10-18". */
export function istDay(ms: number): string {
  return new Date(ms + 5.5 * HOUR).toISOString().slice(0, 10);
}

/** Trim, collapse whitespace, drop control characters, cap length (by character, not byte). */
export function cleanText(value: string | File | null, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value
    .replace(/[\u0000-\u001f\u007f\u200b-\u200d\u2060\ufeff]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? [...text].slice(0, max).join('') : null;
}

export function mediaUrl(env: Env, key: string): string {
  const base: string = env.MEDIA_BASE; // typed as the literal "" from wrangler.jsonc
  return base ? `${base.replace(/\/$/, '')}/${key}` : `/media/${key}`;
}

/** Returns the approver's name for a valid `Authorization: Bearer <key>`, else null. */
export async function approver(request: Request, env: Env): Promise<string | null> {
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!given || !env.ADMIN_KEYS) return null;
  const givenHash = encoder.encode(await sha256Hex(given));
  for (const pair of env.ADMIN_KEYS.split(',')) {
    const [name, key] = pair.split(':').map((s) => s.trim());
    if (!name || !key) continue;
    const keyHash = encoder.encode(await sha256Hex(key));
    // equal-length digests, so a constant-time compare is safe
    if (crypto.subtle.timingSafeEqual(givenHash, keyHash)) return name;
  }
  return null;
}
