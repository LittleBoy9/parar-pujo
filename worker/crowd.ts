// ভিড়-মিটার — "how crowded is it right now?", from people standing there.
import { pandals } from '../src/data/pandals';
import { fail, json, visitorId } from './http';

const PANDALS = new Set(pandals.map((p) => p.slug));
export const CROWD_WINDOW = 45 * 60 * 1000; // older readings no longer describe "now"

/** GET /api/crowd — per pandal: level 1–3, how many readings, when the latest came in. */
export async function getCrowd(env: Env): Promise<Response> {
  const now = Date.now();
  const { results } = await env.DB.prepare(
    `SELECT pandal, AVG(level) AS avg, COUNT(*) AS votes, MAX(created_at) AS latest
       FROM crowd_votes WHERE created_at > ?1 GROUP BY pandal`,
  )
    .bind(now - CROWD_WINDOW)
    .all<{ pandal: string; avg: number; votes: number; latest: number }>();

  const crowd: Record<string, { level: 1 | 2 | 3; votes: number; latest: number }> = {};
  for (const r of results) {
    crowd[r.pandal] = { level: r.avg < 1.67 ? 1 : r.avg < 2.34 ? 2 : 3, votes: r.votes, latest: r.latest };
  }
  return json({ now, crowd }, { cache: 30 });
}

/** POST /api/crowd {pandal, level} — one live reading per person per pandal. */
export async function voteCrowd(request: Request, env: Env): Promise<Response> {
  let body: { pandal?: unknown; level?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, 'bad_body', 'আবার চেষ্টা করুন।');
  }
  const { pandal, level } = body;
  if (typeof pandal !== 'string' || !PANDALS.has(pandal)) return fail(400, 'bad_pandal', 'কোন ঠাকুর?');
  if (level !== 1 && level !== 2 && level !== 3) return fail(400, 'bad_level', 'ভিড় কেমন, বাছুন।');

  await env.DB.prepare(
    `INSERT INTO crowd_votes (pandal, ip_hash, level, created_at) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT (pandal, ip_hash) DO UPDATE SET level = excluded.level, created_at = excluded.created_at`,
  )
    .bind(pandal, await visitorId(request, env), level, Date.now())
    .run();
  return json({ ok: true });
}
