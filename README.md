# পাড়ার পুজো · Parar Pujo

Make your own Durga Puja poster — selfies, pandal photos, Bengali text, stickers, fifteen designs —
and share it to stories, status and posts. Every para's puja has a place here: anyone can add
theirs, post live photo stories, and our own para (Chatra, Aurobindo Road, Serampore) keeps its
hand-drawn guide at `/chatra`.

## Pages

| page | what |
|---|---|
| `/` | poster maker up front, design gallery, today's tithi, stories, "পাড়ায় পাড়ায় পুজো" directory |
| `/card` | **the poster maker** (`?t=<design>`, `?pandal=<slug>`, `?puja=<id>`, `?own=&area=`) |
| `/story` | post a selfie / photo story (approval first, gone in 24h) |
| `/add` | add your para's puja |
| `/chatra` | our para: pandal cards, crowd meter, hand-drawn route map, passport |
| `/pandal/<slug>` | one listed pandal |
| `/passport` | ঠাকুর দেখা passport |
| `/admin` | approvals (also via Telegram) |

## Run it

```sh
npm install
npm run dev        # site only, fast reload — stories & crowd meter hide themselves
npm run dev:full   # site + API with local database/storage → http://localhost:8787
npm run check      # type-check site and Worker
```

`dev:full` needs a `.dev.vars` file (not committed):

```
ADMIN_KEYS=yourname:some-long-random-key
IP_SALT=any-random-string
TELEGRAM_BOT_TOKEN=
```

## Adding a real pandal

1. Make a folder for photos: `public/pandals/<slug>/` (e.g. `public/pandals/ghoshpara/1.jpg`).
   The first photo is the cover. Resize to ~1600px on the long side before adding.
2. Add an entry in [src/data/pandals.ts](src/data/pandals.ts):

   ```ts
   {
     slug: 'ghoshpara',
     nameBn: 'ঘোষপাড়া সার্বজনীন',
     nameEn: 'Ghoshpara Sarbojonin',
     themeBn: '…', themeEn: '…',
     storyBn: 'একটা ছোট্ট স্মৃতি বা গল্প',
     photos: ['/pandals/ghoshpara/1.jpg', '/pandals/ghoshpara/2.jpg'],
     mapUrl: 'https://maps.app.goo.gl/…',
     frame: 'chalchitra',
     palette: 'sindoor',
     // optional: since: 1962, timings: [{ bn: 'অঞ্জলি', en: 'Anjali', time: 'সকাল ৯টা' }]
   },
   ```
3. Delete the `sample-*` entries once real ones are in.

The **order of the list is the hopping route** — it decides the pin numbers on the map
and the "পরের ঠাকুর" links.

### Frames — pick a different one for neighbouring pandals

| frame | look |
|---|---|
| `chalchitra` | painted arch behind the idol |
| `alpona` | round rice-paste floor art |
| `terracotta` | Bishnupur temple facade |
| `pujabarshiki` | old Sharadiya magazine cover |
| `stamp` | postage stamp with a Chatra postmark |
| `marquee` | cinema signboard with chasing bulbs |
| `ghat` | Ganga ghat at dusk, pandal reflected in the water |

Palettes (`src/data/palettes.ts`): `sindoor`, `haldi`, `lalpaar`, `neel`, `shiuli`, `kolapata`, `terracotta`, `ganga`.

## What's where

- `src/data/site.ts` — area name, tagline, puja dates (update each year)
- `src/components/frames/` — one file per frame style
- `src/components/PandalArt.astro` — drawn placeholder shown until a pandal has photos
- `src/components/ParaMap.astro` — hand-drawn route map (on `/chatra`)
- `src/components/PujaDirectory.astro` — every puja, listed + visitor-submitted, with area filters
- `src/components/DesignGallery.astro` — all poster designs, drawn live on the home page
- `src/pages/card.astro` + `src/scripts/card/` — **পুজো পরিক্রমার পোস্টার**, the poster maker (the site's headline feature):
  - `templates.ts` — 15 designs, each laid out for story (9:16), post (4:5) and square; some take 2–4 photos
  - `editor.ts` — drag / pinch photos and layers on the preview, tabs, export
  - `layers.ts` + `fonts.ts` — free Bengali text in 8 type styles (extra fonts load only when picked)
  - `stickers.ts` — ঢাক, প্রদীপ, শিউলি, কাশফুল, মায়ের চোখ, শাঁখ, ধুনুচি, পদ্ম (vector, drawn in code)
  - `photos.ts` — selfie/gallery loading, filters (ঝলমলে, সাদা-কালো, পুরনো দিন)
- `src/pages/passport.astro` + `src/scripts/passport.ts` — ঠাকুর দেখা passport (saved in the visitor's browser)
- `src/scripts/dhak.ts` + `public/audio/dhak.mp3` — the ঢাক button: a real recording ("Durga Puja Dhak Sound" by MythologyChallengerYT, [Pixabay](https://pixabay.com/sound-effects/musical-durga-puja-dhak-sound-9330/)), 40 s seamless loop

## পাড়ার স্টোরি & ভিড়-মিটার (the live part)

- **Stories** — anyone can post a photo for a pandal at `/story`. Nothing is public until an
  approver okays it at `/admin`; it then shows for **24 hours** and is deleted automatically.
- **ভিড়-মিটার** — people at a pandal tap ফাঁকা / মাঝারি / ঠাসা ভিড়; the last 45 minutes of
  readings are shown on each pandal.
- **Reports** — 3 different people reporting a story pulls it until an approver looks again.

Safety built in: photos are shrunk on the phone and stripped of GPS/EXIF (again on the server),
consent checkbox, 6 uploads/hour and 20/day per person, a hard daily cap (`DAILY_UPLOAD_CAP`),
and visitor IPs are only ever stored as salted hashes.

- **আরও পাড়ার পুজো** — anyone can submit a puja that isn't listed (`/add`: name, para, photo,
  optional theme + Google Maps link). Once approved it appears on the home page in one of the
  illustrated frames, with "কার্ড বানান" pre-filled for that puja.

### Approve from your phone (Telegram)

Every new story, new puja and reported story is sent to your Telegram with **✓ / ✕** buttons —
one tap and it's done, no need to open the site.

1. In Telegram, message **@BotFather** → `/newbot` → pick a name (e.g. *Parar Pujo Approvals*) →
   copy the token it gives you.
2. `npx wrangler secret put TELEGRAM_BOT_TOKEN` and paste the token.
3. Open `/admin` on the live site — it shows a code like `/start 482913`. Send exactly that to
   your new bot, then tap **"পাঠিয়েছি — টেলিগ্রাম চালু করুন"**. The bot greets you; done.

The code makes sure only *your* chat becomes the approver; taps from anyone else are ignored.
Approving still works from `/admin` too.

### Approvers

`ADMIN_KEYS` is a comma-separated list of `name:key` pairs — one per person, e.g.
`sounak:k8f…,rimi:p2x…`. Each approver opens `/admin` on their phone and enters their key once.
To remove someone, delete their pair and redeploy the secret. Make keys long and random:

```sh
openssl rand -base64 24
```

### How it's built

One Cloudflare Worker (`worker/`) serves the static Astro site and a small API:

| route | what |
|---|---|
| `GET /api/stories` | live stories |
| `POST /api/stories` | upload (multipart) → pending |
| `POST /api/stories/:id/report` | report |
| `GET/POST /api/crowd` | crowd meter |
| `GET /api/pujas`, `POST /api/pujas` | visitor-submitted pujas |
| `POST /api/telegram/hook` | Telegram button taps (secret-checked) |
| `GET /api/admin/queue`, `POST /api/admin/{stories,pujas}/:id`, `POST /api/admin/telegram/setup` | approvers only |
| `GET /media/...` | photos from R2 |

Data: **D1** (`migrations/`) for stories/votes, **R2** for photos. An hourly cron sweeps expired
stories. Static pages never touch the Worker, so they cost nothing.

## Deploy (one-time setup)

Everything fits Cloudflare's free tier for a para-sized crowd.

```sh
npx wrangler login
npx wrangler d1 create parar-pujo           # copy the database_id into wrangler.jsonc
npx wrangler r2 bucket create parar-pujo-media   # R2 asks for a card once; free tier still applies
npx wrangler secret put ADMIN_KEYS
npx wrangler secret put IP_SALT
npx wrangler secret put TELEGRAM_BOT_TOKEN       # optional, see "Approve from your phone"
npm run deploy                              # builds, migrates the DB, deploys
```

It goes live at `https://parar-pujo.<your-account>.workers.dev`.

## Browser support

Works on iOS 15+ / current Android. Older-Safari fallbacks are in place for canvas `roundRect`,
photo decoding (EXIF rotation), `<dialog>`, `color-mix()`, `svh` units, container-query units and
`backdrop-filter`.

## Before launch

- Set `site` in `astro.config.mjs` to the real URL (needed for WhatsApp/Instagram link previews).
- Once you have a domain on Cloudflare, connect it to the R2 bucket as a public custom domain
  (e.g. `media.yourdomain.in`) and put that URL in `MEDIA_BASE` in `wrangler.jsonc`. Photos are
  then served straight from R2 and don't use the Worker's 100k requests/day.
