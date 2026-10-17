// Shared bits for anything visitors upload (stories, puja submissions).
import { cleanJpeg, type JpegInfo } from './jpeg';
import { HOUR, fail, istDay } from './http';

const MAX_BYTES = 900 * 1024; // the page sends ~200 KB; this is generous headroom

export async function readForm(request: Request): Promise<FormData | Response> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BYTES + 16 * 1024) return fail(413, 'too_large', 'ছবিটা খুব বড়। অন্য ছবি দিন।');
  try {
    return await request.formData();
  } catch {
    return fail(400, 'bad_form', 'কিছু একটা গোলমাল হয়েছে, আবার চেষ্টা করুন।');
  }
}

/** Validates the `photo` field and returns it with metadata (GPS etc.) stripped. */
export async function readPhoto(form: FormData): Promise<JpegInfo | Response> {
  const file = form.get('photo');
  if (!(file instanceof File) || file.size === 0) return fail(400, 'no_photo', 'একটা ছবি বাছুন।');
  if (file.size > MAX_BYTES) return fail(413, 'too_large', 'ছবিটা খুব বড়। অন্য ছবি দিন।');
  const jpeg = cleanJpeg(new Uint8Array(await file.arrayBuffer()));
  if (!jpeg) return fail(415, 'not_jpeg', 'এই ছবিটা খোলা যাচ্ছে না। অন্য ছবি দিন।');
  if (jpeg.width < 200 || jpeg.height < 200 || jpeg.width > 4000 || jpeg.height > 4000) {
    return fail(415, 'bad_size', 'ছবির মাপ ঠিক নেই। অন্য ছবি দিন।');
  }
  return jpeg;
}

/** Per-person limit across a table's recent rows. Returns an error response when over. */
export async function checkRate(env: Env, table: 'stories' | 'puja_submissions', who: string, perHour: number, perDay: number): Promise<Response | null> {
  const now = Date.now();
  const recent = await env.DB.prepare(
    `SELECT SUM(created_at > ?2) AS hour, COUNT(*) AS day FROM ${table} WHERE ip_hash = ?1 AND created_at > ?3`,
  )
    .bind(who, now - HOUR, now - 24 * HOUR)
    .first<{ hour: number | null; day: number }>();
  if ((recent?.hour ?? 0) >= perHour || (recent?.day ?? 0) >= perDay) {
    return fail(429, 'slow_down', 'অনেক ছবি পাঠিয়েছেন — একটু পরে আবার দিন।');
  }
  return null;
}

/** Counts toward the hard daily cap (all uploads, IST day). Returns an error response when full. */
export async function takeDailySlot(env: Env): Promise<Response | null> {
  const counter = await env.DB.prepare(
    `INSERT INTO upload_days (day, count) VALUES (?1, 1)
     ON CONFLICT (day) DO UPDATE SET count = count + 1 RETURNING count`,
  )
    .bind(istDay(Date.now()))
    .first<{ count: number }>();
  if ((counter?.count ?? 0) > Number(env.DAILY_UPLOAD_CAP || 1500)) {
    return fail(429, 'quota', 'আজকের কোটা শেষ! কাল আবার ছবি দিন।');
  }
  return null;
}
