/**
 * tseries.offsets — date offset classes mirroring pandas.tseries.offsets
 * Mirrors: BusinessDay, MonthEnd, MonthBegin, YearEnd, YearBegin,
 *          QuarterEnd, QuarterBegin, Week, Hour, Minute, Second, Milli
 */

export abstract class DateOffset {
  abstract n: number;
  abstract apply(date: Date): Date;
  abstract rollforward(date: Date): Date;
  abstract rollback(date: Date): Date;
  
  mul(n: number): DateOffset {
    const copy = Object.create(this);
    copy.n = this.n * n;
    return copy;
  }
}

export class BusinessDay extends DateOffset {
  override n: number;
  constructor(n = 1) { super(); this.n = n; }
  
  override apply(date: Date): Date {
    const d = new Date(date);
    let remaining = Math.abs(this.n);
    const dir = this.n >= 0 ? 1 : -1;
    while (remaining > 0) {
      d.setDate(d.getDate() + dir);
      if (d.getDay() !== 0 && d.getDay() !== 6) remaining--;
    }
    return d;
  }
  
  override rollforward(date: Date): Date {
    const d = new Date(date);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d;
  }
  
  override rollback(date: Date): Date {
    const d = new Date(date);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    return d;
  }
  
  override toString() { return `<BusinessDay: n=${this.n}>`; }
}

export const BDay = BusinessDay;

export class MonthEnd extends DateOffset {
  override n: number;
  constructor(n = 1) { super(); this.n = n; }
  
  override apply(date: Date): Date {
    const d = new Date(date);
    // day 0 of month M+1 = last day of month M
    // MonthEnd(1) from Jan 15 → Jan 31, from Jan 31 → Feb 29 (leap)
    const isAlreadyEnd = d.getDate() === new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const step = isAlreadyEnd ? this.n : this.n - 1;
    d.setMonth(d.getMonth() + step + 1, 0);
    return d;
  }
  
  override rollforward(date: Date): Date {
    const d = new Date(date);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    if (d.getDate() !== lastDay) d.setDate(lastDay);
    return d;
  }
  
  override rollback(date: Date): Date {
    const d = new Date(date);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    if (d.getDate() !== lastDay) {
      d.setDate(0); // go to last day of prev month
    }
    return d;
  }
  
  override toString() { return `<MonthEnd: n=${this.n}>`; }
}

export const ME = MonthEnd;

export class MonthBegin extends DateOffset {
  override n: number;
  constructor(n = 1) { super(); this.n = n; }
  
  override apply(date: Date): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + this.n, 1);
    return d;
  }
  
  override rollforward(date: Date): Date {
    const d = new Date(date);
    if (d.getDate() !== 1) d.setMonth(d.getMonth() + 1, 1);
    return d;
  }
  
  override rollback(date: Date): Date {
    const d = new Date(date);
    if (d.getDate() !== 1) d.setDate(1);
    return d;
  }
  
  override toString() { return `<MonthBegin: n=${this.n}>`; }
}

export const MS = MonthBegin;

export class YearEnd extends DateOffset {
  override n: number;
  month: number;
  constructor(n = 1, month = 12) { super(); this.n = n; this.month = month; }
  
  override apply(date: Date): Date {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + this.n, this.month - 1);
    d.setDate(new Date(d.getFullYear(), this.month, 0).getDate());
    return d;
  }
  
  override rollforward(date: Date): Date {
    const d = new Date(date);
    const yearEnd = new Date(d.getFullYear(), this.month, 0);
    if (d.getTime() > yearEnd.getTime()) {
      yearEnd.setFullYear(d.getFullYear() + 1);
    }
    return yearEnd;
  }
  
  override rollback(date: Date): Date {
    const d = new Date(date);
    const yearEnd = new Date(d.getFullYear(), this.month, 0);
    if (d.getTime() < yearEnd.getTime()) {
      yearEnd.setFullYear(d.getFullYear() - 1);
    }
    return yearEnd;
  }
  
  override toString() { return `<YearEnd: month=${this.month}, n=${this.n}>`; }
}

export const YE = YearEnd;

export class YearBegin extends DateOffset {
  override n: number;
  month: number;
  constructor(n = 1, month = 1) { super(); this.n = n; this.month = month; }
  
  override apply(date: Date): Date {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + this.n, this.month - 1, 1);
    return d;
  }
  
  override rollforward(date: Date): Date {
    const d = new Date(date);
    const yearBegin = new Date(d.getFullYear(), this.month - 1, 1);
    if (d.getTime() > yearBegin.getTime()) {
      yearBegin.setFullYear(d.getFullYear() + 1);
    }
    return yearBegin;
  }
  
  override rollback(date: Date): Date {
    const d = new Date(date);
    const yearBegin = new Date(d.getFullYear(), this.month - 1, 1);
    if (d.getTime() < yearBegin.getTime()) {
      yearBegin.setFullYear(d.getFullYear() - 1);
    }
    return yearBegin;
  }
  
  override toString() { return `<YearBegin: month=${this.month}, n=${this.n}>`; }
}

export const YS = YearBegin;

export class QuarterEnd extends DateOffset {
  override n: number;
  startingMonth: number;
  constructor(n = 1, startingMonth = 3) { super(); this.n = n; this.startingMonth = startingMonth; }
  
  override apply(date: Date): Date {
    const d = new Date(date);
    const quarterEnds = [3, 6, 9, 12]; // month numbers (1-based)
    let m = d.getMonth() + 1; // current month 1-based
    let steps = this.n;
    while (steps > 0) {
      const nextQE = quarterEnds.find(qe => qe > m) ?? quarterEnds[0]!;
      if (nextQE <= m) d.setFullYear(d.getFullYear() + 1);
      m = nextQE;
      steps--;
    }
    d.setMonth(m - 1);
    d.setDate(new Date(d.getFullYear(), m, 0).getDate());
    return d;
  }
  
  override rollforward(date: Date): Date { return this.apply(new Date(date.getTime() - 86400000)); }
  override rollback(date: Date): Date { return this.apply(new Date(date.getTime())); }
  override toString() { return `<QuarterEnd: n=${this.n}>`; }
}

export const QE = QuarterEnd;

export class QuarterBegin extends DateOffset {
  override n: number;
  startingMonth: number;
  constructor(n = 1, startingMonth = 3) { super(); this.n = n; this.startingMonth = startingMonth; }
  
  override apply(date: Date): Date {
    const d = new Date(date);
    const quarterStarts = [1, 4, 7, 10];
    let m = d.getMonth() + 1;
    let steps = this.n;
    while (steps > 0) {
      const nextQS = quarterStarts.find(qs => qs > m) ?? quarterStarts[0]!;
      if (nextQS <= m) d.setFullYear(d.getFullYear() + 1);
      m = nextQS;
      steps--;
    }
    d.setMonth(m - 1, 1);
    return d;
  }
  
  override rollforward(date: Date): Date { return this.apply(new Date(date.getTime() - 86400000)); }
  override rollback(date: Date): Date { return this.apply(new Date(date)); }
  override toString() { return `<QuarterBegin: n=${this.n}>`; }
}

export const QS = QuarterBegin;

export class Week extends DateOffset {
  override n: number;
  weekday: number | null;
  constructor(n = 1, weekday: number | null = null) { super(); this.n = n; this.weekday = weekday; }
  
  override apply(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + this.n * 7);
    if (this.weekday !== null) {
      while (d.getDay() !== this.weekday) d.setDate(d.getDate() + 1);
    }
    return d;
  }
  
  override rollforward(date: Date): Date {
    const d = new Date(date);
    if (this.weekday !== null) while (d.getDay() !== this.weekday) d.setDate(d.getDate() + 1);
    return d;
  }
  
  override rollback(date: Date): Date {
    const d = new Date(date);
    if (this.weekday !== null) while (d.getDay() !== this.weekday) d.setDate(d.getDate() - 1);
    return d;
  }
  
  override toString() { return `<Week: n=${this.n}>`; }
}

export class Day extends DateOffset {
  override n: number;
  constructor(n = 1) { super(); this.n = n; }
  override apply(date: Date): Date { const d = new Date(date); d.setDate(d.getDate() + this.n); return d; }
  override rollforward(date: Date): Date { return new Date(date); }
  override rollback(date: Date): Date { return new Date(date); }
  override toString() { return `<Day: n=${this.n}>`; }
}

export class Hour extends DateOffset {
  override n: number;
  constructor(n = 1) { super(); this.n = n; }
  override apply(date: Date): Date { return new Date(date.getTime() + this.n * 3_600_000); }
  override rollforward(date: Date): Date { return new Date(date); }
  override rollback(date: Date): Date { return new Date(date); }
  override toString() { return `<Hour: n=${this.n}>`; }
}

export const H = Hour;

export class Minute extends DateOffset {
  override n: number;
  constructor(n = 1) { super(); this.n = n; }
  override apply(date: Date): Date { return new Date(date.getTime() + this.n * 60_000); }
  override rollforward(date: Date): Date { return new Date(date); }
  override rollback(date: Date): Date { return new Date(date); }
  override toString() { return `<Minute: n=${this.n}>`; }
}

export const T = Minute;
export const Min = Minute;

export class Second extends DateOffset {
  override n: number;
  constructor(n = 1) { super(); this.n = n; }
  override apply(date: Date): Date { return new Date(date.getTime() + this.n * 1_000); }
  override rollforward(date: Date): Date { return new Date(date); }
  override rollback(date: Date): Date { return new Date(date); }
  override toString() { return `<Second: n=${this.n}>`; }
}

export const S = Second;

export class Milli extends DateOffset {
  override n: number;
  constructor(n = 1) { super(); this.n = n; }
  override apply(date: Date): Date { return new Date(date.getTime() + this.n); }
  override rollforward(date: Date): Date { return new Date(date); }
  override rollback(date: Date): Date { return new Date(date); }
  override toString() { return `<Milli: n=${this.n}>`; }
}

export const Millisecond = Milli;
export const ms = Milli;

export class Micro extends DateOffset {
  override n: number;
  constructor(n = 1) { super(); this.n = n; }
  override apply(date: Date): Date { return new Date(date.getTime() + this.n / 1000); }
  override rollforward(date: Date): Date { return new Date(date); }
  override rollback(date: Date): Date { return new Date(date); }
  override toString() { return `<Micro: n=${this.n}>`; }
}

export const Microsecond = Micro;
export const us = Micro;

export class Nano extends DateOffset {
  override n: number;
  constructor(n = 1) { super(); this.n = n; }
  override apply(date: Date): Date { return new Date(date.getTime() + this.n / 1_000_000); }
  override rollforward(date: Date): Date { return new Date(date); }
  override rollback(date: Date): Date { return new Date(date); }
  override toString() { return `<Nano: n=${this.n}>`; }
}

export const Nanosecond = Nano;
export const ns = Nano;

/** Business Hour */
export class BusinessHour extends DateOffset {
  override n: number;
  start: string;
  end: string;
  constructor(n = 1, start = '09:00', end = '17:00') { super(); this.n = n; this.start = start; this.end = end; }
  override apply(date: Date): Date { return new Date(date.getTime() + this.n * 3_600_000); }
  override rollforward(date: Date): Date { return new Date(date); }
  override rollback(date: Date): Date { return new Date(date); }
  override toString() { return `<BusinessHour: n=${this.n}>`; }
}

export const BH = BusinessHour;

/** Alias map */
export const offsets = {
  BusinessDay, BDay, MonthEnd, ME, MonthBegin, MS,
  YearEnd, YE, YearBegin, YS, QuarterEnd, QE, QuarterBegin, QS,
  Week, Day, Hour, H, Minute, T, Min, Second, S,
  Milli, Millisecond, Micro, Microsecond, Nano, Nanosecond,
  BusinessHour, BH,
};
