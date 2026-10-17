// "আপনার পাড়ার পুজো যোগ করুন" — pujas sent in by visitors, listed once approved.
import { cleanText, fail, json, mediaUrl, visitorId } from './http';
import { notifyPuja } from './telegram';
import { checkRate, readForm, readPhoto, takeDailySlot } from './upload';

// Only accept Google Maps links, so the field can't be used to post arbitrary URLs.
const MAP_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|maps\.google\.[a-z.]+|(www\.)?google\.[a-z.]+)$/;

function cleanMapUrl(value: string | File | null): string | null | 'invalid' {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || !MAP_HOSTS.test(url.hostname)) return 'invalid';
    if (/^(www\.)?google\./.test(url.hostname) && !url.pathname.startsWith('/maps')) return 'invalid';
    return url.href.slice(0, 300);
  } catch {
    return 'invalid';
  }
}

interface PujaRow {
  id: string;
  name_bn: string;
  name_en: string | null;
  area_bn: string;
  theme_bn: string | null;
  map_url: string | null;
  media_key: string;
  width: number;
  height: number;
}

/** GET /api/pujas — approved community pujas, newest approval first. */
export async function listPujas(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT id, name_bn, name_en, area_bn, theme_bn, map_url, media_key, width, height
       FROM puja_submissions WHERE status = 'live' ORDER BY reviewed_at DESC LIMIT 200`,
  ).all<PujaRow>();
  return json(
    {
      pujas: results.map((p) => ({
        id: p.id,
        nameBn: p.name_bn,
        nameEn: p.name_en,
        areaBn: p.area_bn,
        themeBn: p.theme_bn,
        mapUrl: p.map_url,
        url: mediaUrl(env, p.media_key),
        width: p.width,
        height: p.height,
      })),
    },
    { cache: 60 },
  );
}

/** POST /api/pujas — multipart submission; waits for approval. */
export async function createPuja(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const form = await readForm(request);
  if (form instanceof Response) return form;

  const nameBn = cleanText(form.get('nameBn'), 40);
  const areaBn = cleanText(form.get('areaBn'), 30);
  if (!nameBn) return fail(400, 'no_name', 'পুজোর নামটা লিখুন।');
  if (!areaBn) return fail(400, 'no_area', 'কোন পাড়া / এলাকা, লিখুন।');
  const mapUrl = cleanMapUrl(form.get('mapUrl'));
  if (mapUrl === 'invalid') return fail(400, 'bad_map', 'গুগল ম্যাপের "Share" লিংকটা দিন (বা ফাঁকা রাখুন)।');
  if (form.get('consent') !== 'yes') return fail(400, 'no_consent', 'সম্মতিতে টিক দিন।');

  const jpeg = await readPhoto(form);
  if (jpeg instanceof Response) return jpeg;

  const who = await visitorId(request, env);
  const limited = (await checkRate(env, 'puja_submissions', who, 3, 5)) ?? (await takeDailySlot(env));
  if (limited) return limited;

  const id = crypto.randomUUID();
  const key = `pujas/${id}.jpg`;
  await env.MEDIA.put(key, jpeg.bytes, {
    httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400, immutable' },
  });

  const row = {
    nameBn,
    nameEn: cleanText(form.get('nameEn'), 40),
    areaBn,
    themeBn: cleanText(form.get('themeBn'), 40),
    mapUrl,
    submitter: cleanText(form.get('submitter'), 30),
  };
  await env.DB.prepare(
    `INSERT INTO puja_submissions
       (id, name_bn, name_en, area_bn, theme_bn, map_url, submitter, media_key, width, height, ip_hash, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
  )
    .bind(id, row.nameBn, row.nameEn, row.areaBn, row.themeBn, row.mapUrl, row.submitter, key, jpeg.width, jpeg.height, who, Date.now())
    .run();

  ctx.waitUntil(notifyPuja(env, id, jpeg.bytes, row).catch((e) => console.error(e)));
  return json({ id, status: 'pending' }, { status: 201 });
}
