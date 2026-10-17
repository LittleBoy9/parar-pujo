import { pandals } from '../src/data/pandals';
import { cleanText, fail, istDay, json, mediaUrl, visitorId } from './http';
import { notifyReported, notifyStory } from './telegram';
import { checkRate, readForm, readPhoto, takeDailySlot } from './upload';

const PANDAL_NAMES = new Map(pandals.map((p) => [p.slug, p.nameBn]));
export const REPORTS_TO_HIDE = 3;

/** A listed pandal, or a visitor-submitted puja that's been approved. Returns its name. */
async function pujaName(env: Env, id: string): Promise<string | null> {
  if (PANDAL_NAMES.has(id)) return PANDAL_NAMES.get(id)!;
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const row = await env.DB.prepare(`SELECT name_bn FROM puja_submissions WHERE id = ?1 AND status = 'live'`).bind(id).first<{ name_bn: string }>();
  return row?.name_bn ?? null;
}

/** pandal = 'other' means a puja that isn't on the site; the visitor typed its name and location. */
export const OTHER = 'other';

interface StoryRow {
  id: string;
  pandal: string;
  puja_name: string | null;
  puja_area: string | null;
  media_key: string;
  caption: string | null;
  author: string | null;
  width: number;
  height: number;
  reviewed_at: number;
  expires_at: number;
}

/** GET /api/stories — every live story, oldest first (story order). */
export async function listStories(env: Env): Promise<Response> {
  const now = Date.now();
  const { results } = await env.DB.prepare(
    `SELECT id, pandal, puja_name, puja_area, media_key, caption, author, width, height, reviewed_at, expires_at
       FROM stories WHERE status = 'live' AND expires_at > ?1
      ORDER BY reviewed_at ASC LIMIT 500`,
  )
    .bind(now)
    .all<StoryRow>();

  return json(
    {
      now,
      stories: results.map((s) => ({
        id: s.id,
        pandal: s.pandal,
        pujaName: s.puja_name,
        pujaArea: s.puja_area,
        url: mediaUrl(env, s.media_key),
        caption: s.caption,
        author: s.author,
        width: s.width,
        height: s.height,
        postedAt: s.reviewed_at,
        expiresAt: s.expires_at,
      })),
    },
    { cache: 30 },
  );
}

/** POST /api/stories — multipart upload; lands in the approval queue (and on the approver's phone). */
export async function createStory(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const form = await readForm(request);
  if (form instanceof Response) return form;

  const pandal = form.get('pandal');
  let name: string | null = null;
  let customName: string | null = null;
  let customArea: string | null = null;
  if (pandal === OTHER) {
    customName = cleanText(form.get('pujaName'), 40);
    customArea = cleanText(form.get('pujaArea'), 40);
    if (!customName) return fail(400, 'no_name', 'পুজোর নামটা লিখুন।');
    if (!customArea) return fail(400, 'no_area', 'পুজোটা কোথায়, লিখুন।');
    name = `${customName} · ${customArea}`;
  } else if (typeof pandal === 'string') {
    name = await pujaName(env, pandal);
  }
  if (typeof pandal !== 'string' || !name) return fail(400, 'bad_pandal', 'কোন ঠাকুর, সেটা বাছুন।');
  if (form.get('consent') !== 'yes') return fail(400, 'no_consent', 'ছবি দেওয়ার আগে সম্মতিতে টিক দিন।');

  const jpeg = await readPhoto(form);
  if (jpeg instanceof Response) return jpeg;

  const who = await visitorId(request, env);
  const limited = (await checkRate(env, 'stories', who, 6, 20)) ?? (await takeDailySlot(env));
  if (limited) return limited;

  const now = Date.now();
  const id = crypto.randomUUID();
  const key = `stories/${istDay(now)}/${id}.jpg`;
  await env.MEDIA.put(key, jpeg.bytes, {
    httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400, immutable' },
  });

  const caption = cleanText(form.get('caption'), 80);
  const author = cleanText(form.get('author'), 30);
  await env.DB.prepare(
    `INSERT INTO stories (id, pandal, puja_name, puja_area, media_key, caption, author, width, height, ip_hash, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
  )
    .bind(id, pandal, customName, customArea, key, caption, author, jpeg.width, jpeg.height, who, now)
    .run();

  ctx.waitUntil(notifyStory(env, id, jpeg.bytes, name, caption, author).catch((e) => console.error(e)));
  return json({ id, status: 'pending' }, { status: 201 });
}

/** POST /api/stories/:id/report — enough distinct reports pull a story until re-reviewed. */
export async function reportStory(request: Request, env: Env, ctx: ExecutionContext, id: string): Promise<Response> {
  const who = await visitorId(request, env);
  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO story_reports (story_id, ip_hash, created_at)
     SELECT id, ?2, ?3 FROM stories WHERE id = ?1`,
  )
    .bind(id, who, Date.now())
    .run();

  if (inserted.meta.changes > 0) {
    const row = await env.DB.prepare(
      `UPDATE stories SET reports = reports + 1,
              status = CASE WHEN status = 'live' AND reports + 1 >= ?2 THEN 'hidden' ELSE status END
        WHERE id = ?1 RETURNING status, reports, pandal, puja_name, puja_area, media_key`,
    )
      .bind(id, REPORTS_TO_HIDE)
      .first<{ status: string; reports: number; pandal: string; puja_name: string | null; puja_area: string | null; media_key: string }>();

    // Tell the approver the moment a story gets pulled
    if (row?.status === 'hidden' && row.reports === REPORTS_TO_HIDE) {
      ctx.waitUntil(
        (async () => {
          const obj = await env.MEDIA.get(row.media_key);
          if (obj) await notifyReported(env, id, new Uint8Array(await obj.arrayBuffer()), (row.pandal === OTHER ? `${row.puja_name} · ${row.puja_area}` : await pujaName(env, row.pandal)) ?? row.pandal);
        })().catch((e) => console.error(e)),
      );
    }
  }
  return json({ ok: true });
}
