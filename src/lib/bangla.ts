const DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBnDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => DIGITS[Number(d)]);
}

const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

/** ["2026-10-17", "2026-10-18"] → "১৭–১৮ অক্টোবর" (same month), one date → "১৭ অক্টোবর" */
export function bnDateRange(dates: string[]): string {
  if (dates.length < 2) return bnDate(dates[0]);
  const [, m1, d1] = dates[0].split('-').map(Number);
  const [, m2, d2] = dates[dates.length - 1].split('-').map(Number);
  return m1 === m2 ? `${toBnDigits(d1)}–${toBnDigits(d2)} ${MONTHS_BN[m2 - 1]}` : `${bnDate(dates[0])} – ${bnDate(dates[dates.length - 1])}`;
}

/** "2026-10-17" → "১৭ অক্টোবর" */
export function bnDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${toBnDigits(d)} ${MONTHS_BN[m - 1]}`;
}
