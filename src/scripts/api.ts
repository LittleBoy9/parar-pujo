// Browser-side client for the Worker API. Every call fails soft: if the API is
// unreachable (e.g. plain `astro dev`), features hide themselves instead of breaking.
import { isEn, num, tr } from '../lib/i18n';

export interface Story {
  id: string;
  pandal: string; // a listed slug, a submitted puja id, or 'other'
  pujaName?: string | null; // for 'other': what the visitor typed
  pujaArea?: string | null;
  url: string;
  caption: string | null;
  author: string | null;
  width: number;
  height: number;
  postedAt: number;
  expiresAt: number;
}

export type CrowdLevel = 1 | 2 | 3;
export interface CrowdReading {
  level: CrowdLevel;
  votes: number;
  latest: number;
}

export const CROWD_LABELS: Record<CrowdLevel, { bn: string; en: string; emoji: string }> = {
  1: { bn: 'ফাঁকা', en: 'Quiet', emoji: '🙂' },
  2: { bn: 'মাঝারি', en: 'Busy', emoji: '😅' },
  3: { bn: 'ঠাসা ভিড়', en: 'Packed', emoji: '🥵' },
};

// The Worker answers in Bengali; English visitors get these, by error code.
const EN_ERRORS: Record<string, string> = {
  bad_body: 'Something went wrong — please try again.',
  bad_form: 'Something went wrong — please try again.',
  bad_level: 'Pick how crowded it is.',
  bad_map: 'Paste the Google Maps "Share" link (or leave it empty).',
  bad_pandal: 'Pick which puja this is.',
  bad_size: "This photo's size doesn't work. Try another photo.",
  no_area: 'Write where the puja is (para / area).',
  no_consent: 'Tick the consent box first.',
  no_name: 'Write the name of the puja.',
  no_photo: 'Choose a photo.',
  not_jpeg: "This photo can't be opened. Try another one.",
  quota: "Today's limit is reached! Send photos again tomorrow.",
  server: 'Server trouble — please try again in a bit.',
  slow_down: "You've sent a lot of photos — try again in a little while.",
  too_large: 'This photo is too big. Try another one.',
  network: 'Network problem — please try again.',
};

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(isEn() ? (EN_ERRORS[code] ?? 'Something went wrong — please try again.') : message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.error ?? 'network', body?.message ?? 'নেটওয়ার্কে সমস্যা — আবার চেষ্টা করুন।');
  return body as T;
}

// Both return null when the API is unreachable, so callers can hide the feature.
let storiesPromise: Promise<Story[] | null> | null = null;
/** One request per page view, shared by every component that needs stories. */
export function getStories(): Promise<Story[] | null> {
  storiesPromise ??= call<{ stories: Story[] }>('/api/stories')
    .then((r) => r.stories)
    .catch(() => null);
  return storiesPromise;
}

let crowdPromise: Promise<Record<string, CrowdReading> | null> | null = null;
export function getCrowd(): Promise<Record<string, CrowdReading> | null> {
  crowdPromise ??= call<{ crowd: Record<string, CrowdReading> }>('/api/crowd')
    .then((r) => r.crowd)
    .catch(() => null);
  return crowdPromise;
}

/** A visitor-submitted puja that's been approved. */
export interface CommunityPuja {
  id: string;
  nameBn: string;
  nameEn: string | null;
  areaBn: string;
  themeBn: string | null;
  mapUrl: string | null;
  url: string;
}

let pujasPromise: Promise<CommunityPuja[] | null> | null = null;
export function getPujas(): Promise<CommunityPuja[] | null> {
  pujasPromise ??= call<{ pujas: CommunityPuja[] }>('/api/pujas')
    .then((r) => r.pujas)
    .catch(() => null);
  return pujasPromise;
}

/** Ring colours for submitted pujas (listed pandals bring their own). */
export const COMMUNITY_COLORS = ['#2f5d3a', '#1f2a5a', '#b5562f', '#2c6e7a', '#efb128', '#b3261e'];

export function voteCrowd(pandal: string, level: CrowdLevel) {
  return call<{ ok: true }>('/api/crowd', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pandal, level }),
  });
}

export function reportStory(id: string) {
  return call<{ ok: true }>(`/api/stories/${id}/report`, { method: 'POST' });
}

/** Upload with progress (fetch can't report upload progress yet). */
export function uploadStory(form: FormData, onProgress: (fraction: number) => void): Promise<{ id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/stories');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let body: { id?: string; error?: string; message?: string } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // fall through
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.id) resolve({ id: body.id });
      else reject(new ApiError(body?.error ?? 'network', body?.message ?? 'আপলোড হয়নি — আবার চেষ্টা করুন।'));
    };
    xhr.onerror = () => reject(new ApiError('network', 'নেটওয়ার্কে সমস্যা — আবার চেষ্টা করুন।'));
    xhr.send(form);
  });
}

/** "৫ মিনিট আগে" / "5 min ago" */
export function timeAgo(ms: number, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - ms) / 60000));
  if (min < 1) return tr('এইমাত্র', 'just now');
  if (min < 60) return tr(`${num(min)} মিনিট আগে`, `${min} min ago`);
  const hr = Math.round(min / 60);
  return tr(`${num(hr)} ঘণ্টা আগে`, `${hr} hr ago`);
}
