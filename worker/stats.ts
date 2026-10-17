// Honest site counters: visits (each browser once a day) and posters made.
import { istDay, json, visitorId } from './http';

const POSTERS_PER_DAY = 40; // per person — stops one phone inflating the count
// The owner's choice: the public visit count starts from this head start (the admin page shows the real number too).
export const VISITS_HEAD_START = 856;

export async function counts(env: Env) {
  const { results } = await env.DB.prepare(`SELECT key, value FROM stats WHERE key IN ('visits', 'posters')`).all<{ key: string; value: number }>();
  const get = (k: string) => results.find((r) => r.key === k)?.value ?? 0;
  return { visits: get('visits'), posters: get('posters') };
}

const BROWSERS_PER_IP = 300; // a day; mobile networks put many phones behind one IP, but no more than this

/** POST /api/visit {v: per-browser random id} — count each browser once per day, return the public totals. */
export async function recordVisit(request: Request, env: Env): Promise<Response> {
  const ip = (await visitorId(request, env)).slice(0, 16);
  let browser = 'none';
  try {
    const { v } = await request.json<{ v?: unknown }>();
    if (typeof v === 'string' && /^[0-9a-f-]{36}$/.test(v)) browser = v.replace(/-/g, '').slice(0, 16);
  } catch {
    // no body: count the connection only
  }
  const day = istDay(Date.now());
  const seen = await env.DB.prepare(`SELECT COUNT(*) AS n FROM visitor_days WHERE day = ?1 AND ip_hash >= ?2 AND ip_hash < ?3`)
    .bind(day, `${ip}:`, `${ip};`)
    .first<{ n: number }>();
  if ((seen?.n ?? 0) < BROWSERS_PER_IP) {
    const res = await env.DB.prepare('INSERT OR IGNORE INTO visitor_days (day, ip_hash) VALUES (?1, ?2)').bind(day, `${ip}:${browser}`).run();
    if (res.meta.changes > 0) await env.DB.prepare(`UPDATE stats SET value = value + 1 WHERE key = 'visits'`).run();
  }
  const real = await counts(env);
  return json({ ...real, visits: real.visits + VISITS_HEAD_START });
}

/** POST /api/poster — someone shared or saved a poster. */
export async function recordPoster(request: Request, env: Env): Promise<Response> {
  const who = await visitorId(request, env);
  const row = await env.DB.prepare(
    `INSERT INTO poster_days (day, ip_hash, n) VALUES (?1, ?2, 1)
     ON CONFLICT (day, ip_hash) DO UPDATE SET n = n + 1 RETURNING n`,
  )
    .bind(istDay(Date.now()), who)
    .first<{ n: number }>();
  if ((row?.n ?? 0) <= POSTERS_PER_DAY) await env.DB.prepare(`UPDATE stats SET value = value + 1 WHERE key = 'posters'`).run();
  return json({ ok: true });
}

/** Hourly sweep: past days' dedupe rows aren't needed any more (the totals stay in `stats`). */
export async function sweepStats(env: Env) {
  const today = istDay(Date.now());
  await env.DB.batch([
    env.DB.prepare('DELETE FROM visitor_days WHERE day < ?1').bind(today),
    env.DB.prepare('DELETE FROM poster_days WHERE day < ?1').bind(today),
  ]);
}
