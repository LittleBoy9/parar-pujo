// Everything about the para itself lives here — change once, updates everywhere.

export const site = {
  // live address — keep in sync with `site` in astro.config.mjs
  url: 'https://pararpujo.in',
  titleBn: 'পাড়ার পুজো',
  titleEn: 'Parar Pujo',
  // the site is for every para; this is our own, home to the /para guide
  areaBn: 'ঘোষপুর · চাতরা · অরবিন্দ রোড',
  areaEn: 'Ghoshpur · Chatra · Aurobindo Road, Serampore',
  taglineBn: 'আপনার পাড়া, আপনার পুজো — নিজের মতো করে',
  taglineEn: "Every para's puja — make your own poster, share your story.",
  yearBn: '১৪৩৩', // Bangla sal for Sharad 2026
  yearEn: '2026',
};

// Who made this — shown on every page (top section chip, home card, footer).
export const creator = {
  nameBn: 'সৌনক দাস',
  nameEn: 'Sounak Das',
  website: 'https://sounakdas.in',
  websiteLabel: 'sounakdas.in',
  instagram: 'frame.chor',
  instagramUrl: 'https://www.instagram.com/frame.chor/',
  facebookUrl: 'https://www.facebook.com/sounak.das.545',
  photo: '/creator/sounak.jpg', // 480px
  photoSm: '/creator/sounak-sm.jpg', // 120px
};

export interface Tithi {
  key: string;
  bn: string;
  en: string;
  dates: string[]; // YYYY-MM-DD, IST — a tithi can run over two days
}

// Durga Puja 2026 dates (per the local panjika — Saptami falls on two days). Check each year.
export const tithis: Tithi[] = [
  { key: 'mahalaya', bn: 'মহালয়া', en: 'Mahalaya', dates: ['2026-10-10'] },
  { key: 'shashthi', bn: 'ষষ্ঠী', en: 'Shashthi', dates: ['2026-10-16'] },
  { key: 'saptami', bn: 'সপ্তমী', en: 'Saptami', dates: ['2026-10-17', '2026-10-18'] }, // two-day Saptami this year
  { key: 'ashtami', bn: 'অষ্টমী', en: 'Ashtami', dates: ['2026-10-19'] },
  { key: 'navami', bn: 'নবমী', en: 'Navami', dates: ['2026-10-20'] },
  { key: 'dashami', bn: 'দশমী', en: 'Dashami', dates: ['2026-10-21'] },
];
