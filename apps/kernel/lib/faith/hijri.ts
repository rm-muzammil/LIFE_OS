import type { HijriDate } from '@/lib/faith/types';

const MONTH_NAMES = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  'Dhul Qadah',
  'Dhul Hijjah',
] as const;

const MONTH_NAMES_AR = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
] as const;

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

interface AladhanResponse {
  data?: {
    hijri?: {
      day?: string;
      year?: string;
      month?: { number?: number };
    };
  };
}

function monthName(month: number): string {
  return MONTH_NAMES[Math.min(month - 1, MONTH_NAMES.length - 1)] ?? MONTH_NAMES[0];
}

function monthNameAr(month: number): string {
  return MONTH_NAMES_AR[Math.min(month - 1, MONTH_NAMES_AR.length - 1)] ?? MONTH_NAMES_AR[0];
}

function weekday(date: Date): string {
  return DAY_NAMES[date.getDay()];
}

function formatHijri(
  day: number,
  month: number,
  year: number,
  dayName: string,
  source: HijriDate['source']
): HijriDate {
  const suffix = source === 'calculated' ? ' (est.)' : '';
  return {
    day,
    month,
    year,
    monthName: monthName(month),
    monthNameAr: monthNameAr(month),
    dayName,
    formatted: `${day} ${monthName(month)} ${year}${suffix}`,
    formattedAr: `${day} ${monthNameAr(month)} ${year}`,
    source,
  };
}

function gregorianToJulianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const adjustedYear = year + 4800 - a;
  const adjustedMonth = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * adjustedMonth + 2) / 5) +
    365 * adjustedYear +
    Math.floor(adjustedYear / 4) -
    Math.floor(adjustedYear / 100) +
    Math.floor(adjustedYear / 400) -
    32045
  );
}

function calculateHijriDate(date: Date): HijriDate {
  const julianDay = gregorianToJulianDay(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
  const l = julianDay - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const ll = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - ll) / 5316) * Math.floor((50 * ll) / 17719) +
    Math.floor(ll / 5670) * Math.floor((43 * ll) / 15238);
  const lll =
    ll -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * lll) / 709);
  const day = lll - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return formatHijri(day, month, year, weekday(date), 'calculated');
}

function pakistanDate(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
}

function dateParts(dateString: string): { day: string; month: string; year: string } {
  const [year, month, day] = dateString.split('-');
  return { day, month, year };
}

function weekdayForPakistanDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return DAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function manualOverride(
  date: Date,
  settings: Record<string, string> | undefined
): HijriDate | null {
  const override = settings?.[`hijri_override_${date.toISOString().slice(0, 10)}`];
  if (!override) return null;
  const [day, month, year] = override.split('-').map(Number);
  if (!day || !month || !year) return null;
  return formatHijri(day, month, year, weekday(date), 'manual');
}

async function aladhanDate(date: Date, adjustment: number): Promise<HijriDate | null> {
  const gregorianDate = pakistanDate(date);
  const { day, month, year } = dateParts(gregorianDate);
  const requestDate = `${day}-${month}-${year}`;
  try {
    const response = await fetch(
      `https://api.aladhan.com/v1/gToH/${requestDate}?adjustment=${adjustment}`,
      { next: { revalidate: 43200 } }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as AladhanResponse;
    const hijri = payload.data?.hijri;
    const hijriDay = Number(hijri?.day);
    const hijriMonth = Number(hijri?.month?.number);
    const hijriYear = Number(hijri?.year);
    if (!hijriDay || !hijriMonth || !hijriYear) return null;
    return formatHijri(hijriDay, hijriMonth, hijriYear, weekdayForPakistanDate(gregorianDate), 'api');
  } catch {
    return null;
  }
}

export async function getHijriDate(
  date: Date = new Date(),
  settingMap?: Record<string, string>
): Promise<HijriDate> {
  const override = manualOverride(date, settingMap);
  if (override) return override;

  const rawAdjustment = settingMap?.hijri_adjustment;
  const parsedAdjustment = rawAdjustment === undefined ? -1 : Number(rawAdjustment);
  const adjustment = Number.isSafeInteger(parsedAdjustment) ? parsedAdjustment : -1;
  return (await aladhanDate(date, adjustment)) ?? calculateHijriDate(date);
}

export function getIslamicContext(hijri: HijriDate): string[] {
  const contexts: string[] = [];
  if (hijri.dayName === 'Friday') {
    contexts.push('Jumu’ah: read Surah Al-Kahf and increase salawat.');
  }
  if (hijri.dayName === 'Monday' || hijri.dayName === 'Thursday') {
    contexts.push('Sunnah fasting is encouraged today.');
  }
  if (hijri.day >= 13 && hijri.day <= 15) contexts.push('Ayyam al-Bid: the middle days of the lunar month.');
  if (hijri.month === 1 && hijri.day <= 10) contexts.push('The first ten days of Muharram.');
  if (hijri.month === 1 && hijri.day === 10) contexts.push('Ashura.');
  if (hijri.month === 7) contexts.push('Rajab.');
  if (hijri.month === 8) contexts.push('Sha’ban.');
  if (hijri.month === 9) contexts.push('Ramadan.');
  if (hijri.month === 9 && hijri.day >= 21 && hijri.day % 2 === 1) {
    contexts.push('A possible night of Laylat al-Qadr.');
  }
  if (hijri.month === 12 && hijri.day >= 1 && hijri.day <= 10) {
    contexts.push('The first ten days of Dhul Hijjah.');
  }
  if (hijri.month === 12 && hijri.day === 9) contexts.push('The Day of Arafah.');
  if (hijri.month === 12 && hijri.day === 10) contexts.push('Eid al-Adha.');
  if (hijri.month === 10 && hijri.day === 1) contexts.push('Eid al-Fitr.');
  return contexts;
}
