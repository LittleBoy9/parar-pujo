// Approval logic, shared by the /admin page and the Telegram buttons.
import { STORY_LIFETIME, fail, json, mediaUrl } from './http';
import { getSetting } from './settings';
import { VISITS_HEAD_START, counts } from './stats';

export type Action = 'approve' | 'reject';
export type ReviewResult = { ok: true; status: 'live' | 'rejected' } | { ok: false; message: string };

const GONE: ReviewResult = { ok: false, message: 'এটা আর লাইনে নেই — আগেই কেউ দেখে নিয়েছে।' };

/** Pending/hidden → live (24h from first approval), or reject and delete the photo. */
export async function reviewStory(env: Env, id: string, action: Action, by: string): Promise<ReviewResult> {
  const now = Date.now();
  if (action === 'approve') {
    // Hidden (reported) stories keep their original expiry when restored.
    const res = await env.DB.prepare(
      `UPDATE stories
          SET status = 'live', reviewed_at = COALESCE(reviewed_at, ?2), reviewed_by = ?3,
              expires_at = COALESCE(expires_at, ?2 + ?4), reports = 0
        WHERE id = ?1 AND status IN ('pending', 'hidden')`,
    )
      .bind(id, now, by, STORY_LIFETIME)
      .run();
    if (!res.meta.changes) return GONE;
    await env.DB.prepare('DELETE FROM story_reports WHERE story_id = ?1').bind(id).run();
    return { ok: true, status: 'live' };
  }
  const row = await env.DB.prepare(
    `UPDATE stories SET status = 'rejected', reviewed_at = ?2, reviewed_by = ?3
      WHERE id = ?1 AND status != 'rejected' RETURNING media_key`,
  )
    .bind(id, now, by)
    .first<{ media_key: string }>();
  if (!row) return GONE;
  // The photo goes now; the row stays a day so rate limits still count it.
  await env.MEDIA.delete(row.media_key);
  return { ok: true, status: 'rejected' };
}

/** Pending → listed on the site, or reject/remove and delete the photo. */
export async function reviewPuja(env: Env, id: string, action: Action, by: string): Promise<ReviewResult> {
  const now = Date.now();
  if (action === 'approve') {
    const res = await env.DB.prepare(
      `UPDATE puja_submissions SET status = 'live', reviewed_at = ?2, reviewed_by = ?3
        WHERE id = ?1 AND status = 'pending'`,
    )
      .bind(id, now, by)
      .run();
    return res.meta.changes ? { ok: true, status: 'live' } : GONE;
  }
  const row = await env.DB.prepare(
    `UPDATE puja_submissions SET status = 'rejected', reviewed_at = ?2, reviewed_by = ?3
      WHERE id = ?1 AND status != 'rejected' RETURNING media_key`,
  )
    .bind(id, now, by)
    .first<{ media_key: string }>();
  if (!row) return GONE;
  await env.MEDIA.delete(row.media_key);
  return { ok: true, status: 'rejected' };
}

interface StoryRow {
  id: string;
  pandal: string;
  pandal_name: string | null; // for visitor-submitted pujas
  media_key: string;
  caption: string | null;
  author: string | null;
  status: string;
  reports: number;
  created_at: number;
  reviewed_by: string | null;
  expires_at: number | null;
}

interface PujaRow {
  id: string;
  name_bn: string;
  name_en: string | null;
  area_bn: string;
  theme_bn: string | null;
  map_url: string | null;
  submitter: string | null;
  media_key: string;
  status: string;
  created_at: number;
  reviewed_by: string | null;
}

function toStory(env: Env, s: StoryRow) {
  return {
    id: s.id,
    pandal: s.pandal,
    pandalName: s.pandal_name,
    url: mediaUrl(env, s.media_key),
    caption: s.caption,
    author: s.author,
    status: s.status,
    reports: s.reports,
    createdAt: s.created_at,
    reviewedBy: s.reviewed_by,
    expiresAt: s.expires_at,
  };
}

const STORY_COLUMNS = `s.id, s.pandal, COALESCE(p.name_bn, s.puja_name || ' · ' || s.puja_area) AS pandal_name, s.media_key, s.caption,
              s.author, s.status, s.reports, s.created_at, s.reviewed_by, s.expires_at
         FROM stories s LEFT JOIN puja_submissions p ON p.id = s.pandal`;

/** GET /api/admin/queue — stories (reported, waiting, live) and puja submissions (waiting, listed). */
export async function queue(env: Env, name: string): Promise<Response> {
  const now = Date.now();
  const [stories, pujas, archived, chat, stats] = await Promise.all([
    env.DB.prepare(
      `SELECT ${STORY_COLUMNS}
        WHERE s.status IN ('pending', 'hidden') OR (s.status = 'live' AND s.expires_at > ?1)
        ORDER BY CASE s.status WHEN 'hidden' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, s.created_at ASC
        LIMIT 300`,
    )
      .bind(now)
      .all<StoryRow>(),
    env.DB.prepare(
      `SELECT id, name_bn, name_en, area_bn, theme_bn, map_url, submitter, media_key, status, created_at, reviewed_by
         FROM puja_submissions WHERE status IN ('pending', 'live')
        ORDER BY status = 'live', created_at ASC LIMIT 300`,
    ).all<PujaRow>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM stories WHERE status = 'live' AND expires_at <= ?1`).bind(now).first<{ n: number }>(),
    getSetting(env, 'telegram_chat'),
    counts(env),
  ]);

  return json({
    you: name,
    now,
    telegram: { tokenSet: Boolean(env.TELEGRAM_BOT_TOKEN), connected: Boolean(chat) },
    archived: archived?.n ?? 0,
    stats: { ...stats, shownVisits: stats.visits + VISITS_HEAD_START }, // real totals, and what the site shows
    stories: stories.results.map((s) => toStory(env, s)),
    pujas: pujas.results.map((p) => ({
      id: p.id,
      nameBn: p.name_bn,
      nameEn: p.name_en,
      areaBn: p.area_bn,
      themeBn: p.theme_bn,
      mapUrl: p.map_url,
      submitter: p.submitter,
      url: mediaUrl(env, p.media_key),
      status: p.status,
      createdAt: p.created_at,
      reviewedBy: p.reviewed_by,
    })),
  });
}

const ARCHIVE_PAGE = 60;

/** GET /api/admin/archive?before=<expires_at> — approved stories whose 24h are over, newest first. */
export async function archive(request: Request, env: Env): Promise<Response> {
  const before = Number(new URL(request.url).searchParams.get('before')) || Infinity;
  const { results } = await env.DB.prepare(
    `SELECT ${STORY_COLUMNS}
      WHERE s.status = 'live' AND s.expires_at < ?1
      ORDER BY s.expires_at DESC LIMIT ?2`,
  )
    .bind(Math.min(before, Date.now() + 1), ARCHIVE_PAGE + 1)
    .all<StoryRow>();
  return json({ stories: results.slice(0, ARCHIVE_PAGE).map((s) => toStory(env, s)), more: results.length > ARCHIVE_PAGE });
}

/** POST /api/admin/{stories|pujas}/:id {action} */
export async function review(request: Request, env: Env, name: string, kind: 'stories' | 'pujas', id: string): Promise<Response> {
  let action: unknown;
  try {
    ({ action } = await request.json<{ action?: unknown }>());
  } catch {
    return fail(400, 'bad_body', 'Bad request');
  }
  if (action !== 'approve' && action !== 'reject') return fail(400, 'bad_action', 'Unknown action');
  const result = kind === 'stories' ? await reviewStory(env, id, action, name) : await reviewPuja(env, id, action, name);
  return result.ok ? json(result) : fail(409, 'gone', result.message);
}
