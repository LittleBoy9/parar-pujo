// Honest site counters: visits (unique per person per day) and posters made.
import { istDay, json, visitorId } from './http';

const POSTERS_PER_DAY = 40; // per person — stops one phone inflating the count

async function counts(env: Env) {
  const { results } = await env.DB.prepare(`SELECT key, value FROM stats WHERE key IN ('visits', 'posters')`).all<{ key: string; value: number }>();
  const get = (k: string) => results.find((r) => r.key === k)?.value ?? 0;
  return { visits: get('visits'), posters: get('posters') };
}

/** POST /api/visit — count this person once per day, return the totals. */
export async function recordVisit(request: Request, env: Env): Promise<Response> {
  const who = await visitorId(request, env);
  const res = await env.DB.prepare('INSERT OR IGNORE INTO visitor_days (day, ip_hash) VALUES (?1, ?2)').bind(istDay(Date.now()), who).run();
  if (res.meta.changes > 0) await env.DB.prepare(`UPDATE stats SET value = value + 1 WHERE key = 'visits'`).run();
  return json(await counts(env));
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
