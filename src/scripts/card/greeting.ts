// Today's puja greeting (IST), shared by the card maker and story frames.

const BY_TITHI: Record<string, string> = {
  mahalaya: 'শুভ মহালয়া',
  shashthi: 'শুভ ষষ্ঠী',
  saptami: 'শুভ সপ্তমী',
  ashtami: 'শুভ মহাষ্টমী',
  navami: 'শুভ মহানবমী',
  dashami: 'শুভ বিজয়া',
};

export interface TithiDate {
  key: string;
  dates: string[]; // YYYY-MM-DD; a tithi can span two days
}

export function pujaToday(tithis: TithiDate[]) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const tithi = tithis.find((t) => t.dates.includes(today));
  const last = tithis[tithis.length - 1].dates;
  const afterDashami = today > last[last.length - 1];
  return {
    tithiKey: tithi?.key ?? null,
    isBijoya: afterDashami || tithi?.key === 'dashami',
    greeting: tithi ? BY_TITHI[tithi.key] : afterDashami ? 'শুভ বিজয়া' : 'শুভ শারদীয়া',
  };
}
