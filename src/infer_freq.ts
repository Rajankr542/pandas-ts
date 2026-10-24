/**
 * pd.infer_freq — infer the frequency string of a DatetimeIndex or date array.
 */

export type FreqString = 'D' | 'B' | 'H' | 'T' | 'S' | 'MS' | 'ME' | 'QS' | 'QE' | 'YS' | 'YE' | 'W' | string | null;

const MS_SEC = 1_000;
const MS_MIN = 60 * MS_SEC;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;
const MS_WEEK = 7 * MS_DAY;

export function infer_freq(dates: Date[] | string[]): FreqString {
  const parsed = dates.map(d => d instanceof Date ? d : new Date(d as string));
  if (parsed.length < 2) return null;

  // ── Monthly start — check before equal-diff (months are unequal in ms) ────
  const isMonthStart = parsed.every(d => d.getDate() === 1 && d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0);
  if (isMonthStart) {
    let consecutive = true;
    for (let i = 1; i < parsed.length; i++) {
      const mDiff = (parsed[i]!.getFullYear() - parsed[i - 1]!.getFullYear()) * 12 +
        (parsed[i]!.getMonth() - parsed[i - 1]!.getMonth());
      if (mDiff !== 1) { consecutive = false; break; }
    }
    if (consecutive) return 'MS';
  }

  // ── Monthly end ────────────────────────────────────────────────────────────
  const isMonthEnd = parsed.every(d => {
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return d.getDate() === lastDay;
  });
  if (isMonthEnd) {
    let consecutive = true;
    for (let i = 1; i < parsed.length; i++) {
      const mDiff = (parsed[i]!.getFullYear() - parsed[i - 1]!.getFullYear()) * 12 +
        (parsed[i]!.getMonth() - parsed[i - 1]!.getMonth());
      if (mDiff !== 1) { consecutive = false; break; }
    }
    if (consecutive) return 'ME';
  }

  // ── Quarterly start ────────────────────────────────────────────────────────
  const isQStart = parsed.every(d => d.getDate() === 1 && d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && [0, 3, 6, 9].includes(d.getMonth()));
  if (isQStart) {
    let consecutive = true;
    for (let i = 1; i < parsed.length; i++) {
      const mDiff = (parsed[i]!.getFullYear() - parsed[i - 1]!.getFullYear()) * 12 +
        (parsed[i]!.getMonth() - parsed[i - 1]!.getMonth());
      if (mDiff !== 3) { consecutive = false; break; }
    }
    if (consecutive) return 'QS';
  }

  // ── Quarterly end ──────────────────────────────────────────────────────────
  const isQEnd = parsed.every(d => [2, 5, 8, 11].includes(d.getMonth()));
  if (isQEnd) {
    let consecutive = true;
    for (let i = 1; i < parsed.length; i++) {
      const mDiff = (parsed[i]!.getFullYear() - parsed[i - 1]!.getFullYear()) * 12 +
        (parsed[i]!.getMonth() - parsed[i - 1]!.getMonth());
      if (mDiff !== 3) { consecutive = false; break; }
    }
    if (consecutive) return 'QE';
  }

  // ── Yearly start ──────────────────────────────────────────────────────────
  const isYearStartDates = parsed.every(d => d.getDate() === 1 && d.getMonth() === 0);
  if (isYearStartDates) {
    // Only declare yearly if consecutive years
    let isYS = true;
    for (let i = 1; i < parsed.length; i++) {
      if (parsed[i]!.getFullYear() - parsed[i - 1]!.getFullYear() !== 1) { isYS = false; break; }
    }
    if (isYS) return 'YS';
  }

  // ── Yearly end ────────────────────────────────────────────────────────────
  if (parsed.every(d => d.getDate() === 31 && d.getMonth() === 11)) return 'YE';

  // ── Equal millisecond diffs ───────────────────────────────────────────────
  const diffs: number[] = [];
  for (let i = 1; i < parsed.length; i++) {
    diffs.push(parsed[i]!.getTime() - parsed[i - 1]!.getTime());
  }

  const allEqual = diffs.every(d => d === diffs[0]);
  if (!allEqual) return null;

  const diffMs = diffs[0]!;

  if (diffMs === MS_SEC) return 'S';
  if (diffMs === MS_MIN) return 'T';
  if (diffMs === MS_HOUR) return 'H';
  if (diffMs === MS_DAY) return 'D';
  if (diffMs === MS_WEEK) return 'W';

  return null;
}
