// Telegram bot: sends each new story / puja to the approver's phone with ✓ / ✕ buttons,
// and handles those taps. Does nothing until TELEGRAM_BOT_TOKEN is set and /admin setup is run.
import { reviewPuja, reviewStory, type Action } from './admin';
import { fail, json } from './http';
import { getSetting, setSetting } from './settings';

type Kind = 's' | 'p'; // story | puja
type Button = { text: string; callback_data: string };

const encoder = new TextEncoder();

async function tg<T = unknown>(env: Env, method: string, body: FormData | Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    ...(body instanceof FormData ? { body } : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
  });
  const data = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!data.ok) throw new Error(`telegram ${method}: ${data.description}`);
  return data.result;
}

/** Secret Telegram must echo on every webhook call — derived, so there's no extra secret to manage. */
async function webhookSecret(env: Env): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${env.TELEGRAM_BOT_TOKEN}:${env.IP_SALT}:hook`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 48);
}

const buttons = (kind: Kind, id: string, approve = '✓ অনুমোদন', reject = '✕ বাতিল'): Button[][] => [
  [
    { text: approve, callback_data: `a:${kind}:${id}` },
    { text: reject, callback_data: `r:${kind}:${id}` },
  ],
];

/** Send a photo + caption + buttons to the approver. Silently skipped if the bot isn't set up. */
export async function notify(env: Env, photo: Uint8Array, caption: string, keyboard: Button[][]): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  const chat = await getSetting(env, 'telegram_chat');
  if (!chat) return;
  const form = new FormData();
  form.set('chat_id', chat);
  form.set('caption', caption.slice(0, 1000));
  form.set('reply_markup', JSON.stringify({ inline_keyboard: keyboard }));
  form.set('photo', new Blob([photo as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }), 'photo.jpg');
  await tg(env, 'sendPhoto', form);
}

export const notifyStory = (env: Env, id: string, photo: Uint8Array, pandalName: string, caption: string | null, author: string | null) =>
  notify(env, photo, ['📸 নতুন স্টোরি (সেলফি চলবে · লুকিয়ে তোলা / আপত্তিকর হলে ✕)', `ঠাকুর: ${pandalName}`, caption && `“${caption}”`, author && `— ${author}`].filter(Boolean).join('\n'), buttons('s', id));

export const notifyReported = (env: Env, id: string, photo: Uint8Array, pandalName: string) =>
  notify(env, photo, `⚑ ৩ জন রিপোর্ট করেছে — স্টোরিটা সরিয়ে রাখা হয়েছে\nঠাকুর: ${pandalName}`, buttons('s', id, '↺ আবার চালু', '✕ মুছে দিন'));

export const notifyPuja = (
  env: Env,
  id: string,
  photo: Uint8Array,
  p: { nameBn: string; nameEn: string | null; areaBn: string; themeBn: string | null; mapUrl: string | null; submitter: string | null },
) =>
  notify(
    env,
    photo,
    [
      '🪔 নতুন পুজো যোগ করার অনুরোধ',
      `${p.nameBn}${p.nameEn ? ` (${p.nameEn})` : ''}`,
      `পাড়া: ${p.areaBn}`,
      p.themeBn && `থিম: ${p.themeBn}`,
      p.mapUrl && `ম্যাপ: ${p.mapUrl}`,
      p.submitter && `পাঠিয়েছেন: ${p.submitter}`,
    ]
      .filter(Boolean)
      .join('\n'),
    buttons('p', id, '✓ সাইটে দিন', '✕ বাতিল'),
  );

interface CallbackQuery {
  id: string;
  from: { id: number; first_name?: string };
  data?: string;
  message?: { message_id: number; chat: { id: number }; caption?: string };
}

/** POST /api/telegram/hook — button taps from the approver. */
export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.TELEGRAM_BOT_TOKEN || request.headers.get('x-telegram-bot-api-secret-token') !== (await webhookSecret(env))) {
    return fail(401, 'unauthorized', 'no');
  }
  const update = (await request.json()) as { callback_query?: CallbackQuery; message?: { chat: { id: number } } };
  const cq = update.callback_query;
  if (!cq?.data) return json({ ok: true }); // plain messages are ignored

  const chat = await getSetting(env, 'telegram_chat');
  if (String(cq.from.id) !== chat) {
    await tg(env, 'answerCallbackQuery', { callback_query_id: cq.id, text: 'অনুমতি নেই' }).catch(() => {});
    return json({ ok: true });
  }

  const m = cq.data.match(/^([ar]):([sp]):([0-9a-f-]{36})$/);
  if (!m) return json({ ok: true });
  const action: Action = m[1] === 'a' ? 'approve' : 'reject';
  const by = `telegram:${cq.from.first_name ?? cq.from.id}`;
  const result = m[2] === 's' ? await reviewStory(env, m[3], action, by) : await reviewPuja(env, m[3], action, by);

  const verdict = !result.ok
    ? result.message
    : result.status === 'live'
      ? m[2] === 's'
        ? '✓ অনুমোদিত — ২৪ ঘণ্টা সবাই দেখবে'
        : '✓ সাইটে যোগ হয়েছে'
      : '✕ বাতিল — ছবি মুছে দেওয়া হয়েছে';

  await tg(env, 'answerCallbackQuery', { callback_query_id: cq.id, text: verdict }).catch(() => {});
  if (cq.message) {
    await tg(env, 'editMessageCaption', {
      chat_id: cq.message.chat.id,
      message_id: cq.message.message_id,
      caption: `${cq.message.caption ?? ''}\n\n${verdict}`.slice(0, 1000),
      reply_markup: { inline_keyboard: [] },
    }).catch(() => {});
  }
  return json({ ok: true });
}

/**
 * POST /api/admin/telegram/setup {code} — run once from /admin. The approver first sends
 * "/start <code>" to the bot; the code proves which chat is theirs. That chat becomes the
 * approver and the bot's webhook is pointed at this site.
 */
export async function setup(request: Request, env: Env): Promise<Response> {
  if (!env.TELEGRAM_BOT_TOKEN) return fail(400, 'no_token', 'TELEGRAM_BOT_TOKEN সেট করা নেই।');
  const { code } = await request.json<{ code?: unknown }>().catch(() => ({ code: undefined }));
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return fail(400, 'bad_code', 'কোডটা ঠিক নেই।');

  // getUpdates only works while no webhook is set
  await tg(env, 'deleteWebhook', {});
  type Msg = { text?: string; chat: { id: number; first_name?: string; type: string } };
  const updates = await tg<{ message?: Msg }[]>(env, 'getUpdates', {});
  const last = [...updates]
    .reverse()
    .map((u) => u.message)
    .find((m) => m?.chat.type === 'private' && m.text?.replace('/start', '').trim() === code)?.chat;
  if (!last) return fail(400, 'no_start', `টেলিগ্রামে বটকে "/start ${code}" পাঠান, তারপর আবার চাপুন।`);

  await setSetting(env, 'telegram_chat', String(last.id));
  const origin = new URL(request.url).origin;
  await tg(env, 'setWebhook', {
    url: `${origin}/api/telegram/hook`,
    secret_token: await webhookSecret(env),
    allowed_updates: ['callback_query', 'message'],
    drop_pending_updates: true,
  });
  await tg(env, 'sendMessage', {
    chat_id: last.id,
    text: `নমস্কার ${last.first_name ?? ''}! 🙏\nপাড়ার পুজোর নতুন স্টোরি আর পুজো এবার থেকে এখানে আসবে — ✓ বা ✕ চাপলেই হবে।`,
  });
  return json({ ok: true, chat: last.first_name ?? String(last.id) });
}
