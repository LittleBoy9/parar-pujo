// Parar Pujo Worker: serves the static site (via the ASSETS binding) plus a small API
// for stories, community pujas, the crowd meter, approvals and the Telegram bot.
import { archive, queue, review } from './admin';
import { CROWD_WINDOW, getCrowd, voteCrowd } from './crowd';
import { approver, fail } from './http';
import { createPuja, listPujas } from './pujas';
import { createStory, listStories, reportStory } from './stories';
import { recordPoster, recordVisit, sweepStats } from './stats';
import { handleWebhook, setup as setupTelegram } from './telegram';

const ID = '([0-9a-f-]{36})';
const DAY = 24 * 60 * 60 * 1000;

async function route(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const { pathname } = new URL(request.url);
  const method = request.method;
  let m: RegExpMatchArray | null;

  if (pathname.startsWith('/media/') && method === 'GET') return serveMedia(env, pathname.slice('/media/'.length));

  if (pathname === '/api/stories') {
    if (method === 'GET') return listStories(env);
    if (method === 'POST') return createStory(request, env, ctx);
  }
  if ((m = pathname.match(new RegExp(`^/api/stories/${ID}/report$`))) && method === 'POST') {
    return reportStory(request, env, ctx, m[1]);
  }

  if (pathname === '/api/pujas') {
    if (method === 'GET') return listPujas(env);
    if (method === 'POST') return createPuja(request, env, ctx);
  }

  if (pathname === '/api/crowd') {
    if (method === 'GET') return getCrowd(env);
    if (method === 'POST') return voteCrowd(request, env);
  }

  if (pathname === '/api/visit' && method === 'POST') return recordVisit(request, env);
  if (pathname === '/api/poster' && method === 'POST') return recordPoster(request, env);

  if (pathname === '/api/telegram/hook' && method === 'POST') return handleWebhook(request, env);

  if (pathname.startsWith('/api/admin/')) {
    const name = await approver(request, env);
    if (!name) return fail(401, 'unauthorized', 'চাবি ভুল।');
    if (pathname === '/api/admin/queue' && method === 'GET') return queue(env, name);
    if (pathname === '/api/admin/archive' && method === 'GET') return archive(request, env);
    if (pathname === '/api/admin/telegram/setup' && method === 'POST') return setupTelegram(request, env);
    if ((m = pathname.match(new RegExp(`^/api/admin/(stories|pujas)/${ID}$`))) && method === 'POST') {
      return review(request, env, name, m[1] as 'stories' | 'pujas', m[2]);
    }
  }

  return fail(404, 'not_found', 'Not found');
}

async function serveMedia(env: Env, key: string): Promise<Response> {
  if (!/^(stories\/\d{4}-\d{2}-\d{2}|pujas)\/[0-9a-f-]{36}\.jpg$/.test(key)) return new Response('Not found', { status: 404 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('x-content-type-options', 'nosniff');
  return new Response(object.body, { headers });
}

async function deleteRows(env: Env, table: 'stories' | 'puja_submissions', rows: { id: string; media_key: string }[]) {
  if (!rows.length) return;
  await env.MEDIA.delete(rows.map((r) => r.media_key));
  const ids = rows.map((r) => r.id);
  const marks = ids.map((_, i) => `?${i + 1}`).join(',');
  const statements = [env.DB.prepare(`DELETE FROM ${table} WHERE id IN (${marks})`).bind(...ids)];
  if (table === 'stories') statements.unshift(env.DB.prepare(`DELETE FROM story_reports WHERE story_id IN (${marks})`).bind(...ids));
  await env.DB.batch(statements);
}

/** Hourly: clear rejected stories, stale puja submissions with their photos, and old meter readings. */
async function sweep(env: Env) {
  const now = Date.now();
  // Stories are never deleted on a timer: after 24h they leave the site but stay in the
  // admin archive, and unreviewed ones wait in the queue. Only rejected rows go (their photo
  // was deleted at rejection; the row is kept a day so rate limits still count it).
  const stories = await env.DB.prepare(
    `SELECT id, media_key FROM stories WHERE status = 'rejected' AND reviewed_at < ?1 LIMIT 500`,
  )
    .bind(now - DAY)
    .all<{ id: string; media_key: string }>();
  await deleteRows(env, 'stories', stories.results);

  // Unreviewed puja submissions wait a week; rejected ones are kept a day for rate limits.
  const pujas = await env.DB.prepare(
    `SELECT id, media_key FROM puja_submissions
      WHERE (status = 'pending' AND created_at < ?1) OR (status = 'rejected' AND reviewed_at < ?2)
      LIMIT 500`,
  )
    .bind(now - 7 * DAY, now - DAY)
    .all<{ id: string; media_key: string }>();
  await deleteRows(env, 'puja_submissions', pujas.results);

  await env.DB.batch([
    env.DB.prepare('DELETE FROM crowd_votes WHERE created_at < ?1').bind(now - 4 * CROWD_WINDOW),
    env.DB.prepare(`DELETE FROM upload_days WHERE day < date('now', '-7 days')`),
  ]);
  await sweepStats(env);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env, ctx);
    } catch (err) {
      console.error(err);
      return fail(500, 'server', 'সার্ভারে গোলমাল — একটু পরে আবার চেষ্টা করুন।');
    }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sweep(env));
  },
} satisfies ExportedHandler<Env>;
