/**
 * Index — base pandas Index class (immutable, 1-D labeled array).
 */
import { isMissing, NA } from '../na.js';
import { ValueError, KeyError } from '../errors.js';

export class Index {
  protected _data: unknown[];
  protected _name: string | null;

  constructor(data: unknown[], options: { name?: string } = {}) {
    this._data = [...data];
    this._name = options.name ?? null;
  }

  // ── Basic properties ─────────────────────────────────────────────────────────
  get length(): number { return this._data.length; }
  get size(): number { return this._data.length; }
  get ndim(): number { return 1; }
  get name(): string | null { return this._name; }
  get dtype(): string { return 'object'; }
  get shape(): [number] { return [this._data.length]; }
  get values(): unknown[] { return [...this._data]; }
  get is_unique(): boolean { return new Set(this._data).size === this._data.length; }
  get is_monotonic_increasing(): boolean {
    for (let i = 1; i < this._data.length; i++) {
      if ((this._data[i] as any) < (this._data[i-1] as any)) return false;
    }
    return true;
  }
  get is_monotonic_decreasing(): boolean {
    for (let i = 1; i < this._data.length; i++) {
      if ((this._data[i] as any) > (this._data[i-1] as any)) return false;
    }
    return true;
  }
  get has_duplicates(): boolean { return !this.is_unique; }
  get nbytes(): number { return this._data.length * 8; }
  get inferred_type(): string { return 'mixed'; }

  // ── Element access ────────────────────────────────────────────────────────────
  get(i: number): unknown { return this._data[i < 0 ? this._data.length + i : i]; }

  // ── Search ────────────────────────────────────────────────────────────────────
  get_loc(label: unknown): number {
    const i = this._data.indexOf(label);
    if (i === -1) throw new KeyError(`${label} not in index`);
    return i;
  }

  get_indexer(labels: unknown[]): number[] {
    return labels.map(l => {
      const i = this._data.indexOf(l);
      return i; // -1 if missing
    });
  }

  contains(label: unknown): boolean { return this._data.includes(label); }

  // ── Set operations ────────────────────────────────────────────────────────────
  union(other: Index): Index {
    const set = new Set([...this._data, ...other._data]);
    return new Index([...set]);
  }

  intersection(other: Index): Index {
    const set = new Set(other._data);
    return new Index(this._data.filter(v => set.has(v)));
  }

  difference(other: Index): Index {
    const set = new Set(other._data);
    return new Index(this._data.filter(v => !set.has(v)));
  }

  symmetric_difference(other: Index): Index {
    const a = new Set(this._data), b = new Set(other._data);
    const result: unknown[] = [];
    for (const v of a) if (!b.has(v)) result.push(v);
    for (const v of b) if (!a.has(v)) result.push(v);
    return new Index(result);
  }

  // ── Transformation ────────────────────────────────────────────────────────────
  sort_values(ascending = true): Index {
    const sorted = [...this._data].sort((a, b) => {
      if (a === b) return 0;
      return ascending ? ((a as any) < (b as any) ? -1 : 1) : ((a as any) > (b as any) ? -1 : 1);
    });
    return new Index(sorted, { name: this._name ?? undefined });
  }

  unique(): Index { return new Index([...new Set(this._data)]); }

  isin(values: unknown[]): boolean[] {
    const set = new Set(values);
    return this._data.map(v => set.has(v));
  }

  drop(labels: unknown | unknown[]): Index {
    const toDrop = new Set(Array.isArray(labels) ? labels : [labels]);
    return new Index(this._data.filter(v => !toDrop.has(v)));
  }

  append(other: Index): Index {
    return new Index([...this._data, ...other._data]);
  }

  delete(loc: number): Index {
    const d = [...this._data];
    d.splice(loc, 1);
    return new Index(d);
  }

  insert(loc: number, item: unknown): Index {
    const d = [...this._data];
    d.splice(loc, 0, item);
    return new Index(d);
  }

  rename(name: string): Index {
    const cls = Object.getPrototypeOf(this).constructor;
    return new cls(this._data, { name });
  }

  map(fn: (v: unknown, i: number) => unknown): Index {
    return new Index(this._data.map(fn));
  }

  where(cond: boolean[], other: unknown = null): Index {
    return new Index(this._data.map((v, i) => cond[i] ? v : other));
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────
  min(): unknown { return this._data.reduce((a, b) => (b as any) < (a as any) ? b : a); }
  max(): unknown { return this._data.reduce((a, b) => (b as any) > (a as any) ? b : a); }

  value_counts(): Map<unknown, number> {
    const m = new Map<unknown, number>();
    for (const v of this._data) m.set(v, (m.get(v) ?? 0) + 1);
    return m;
  }

  duplicated(keep: 'first' | 'last' | false = 'first'): boolean[] {
    const seen = new Map<unknown, number>();
    const result = new Array(this._data.length).fill(false);
    for (let i = 0; i < this._data.length; i++) {
      const v = this._data[i];
      if (seen.has(v)) {
        if (keep === 'first') result[i] = true;
        else if (keep === 'last') { result[seen.get(v)!] = true; seen.set(v, i); }
        else { result[i] = true; result[seen.get(v)!] = true; }
      } else { seen.set(v, i); }
    }
    return result;
  }

  // ── Type conversion ───────────────────────────────────────────────────────────
  toArray(): unknown[] { return [...this._data]; }
  tolist(): unknown[] { return [...this._data]; }
  astype(dtype: string): Index { return this; }

  // ── Repr ──────────────────────────────────────────────────────────────────────
  toString(): string {
    return `Index([${this._data.slice(0, 10).map(v => JSON.stringify(v)).join(', ')}${this._data.length > 10 ? ', ...' : ''}], dtype='object'${this._name ? `, name='${this._name}'` : ''})`;
  }

  // ── Slice ─────────────────────────────────────────────────────────────────────
  slice(start?: number, stop?: number, step?: number): Index {
    if (!step || step === 1) return new Index(this._data.slice(start, stop));
    const result: unknown[] = [];
    const s = start ?? 0, e = stop ?? this._data.length;
    for (let i = s; i < e; i += step) result.push(this._data[i]);
    return new Index(result);
  }

  // ── Equals ────────────────────────────────────────────────────────────────────
  equals(other: Index): boolean {
    if (this._data.length !== other._data.length) return false;
    return this._data.every((v, i) => v === other._data[i]);
  }

  // ── Iteration ─────────────────────────────────────────────────────────────────
  [Symbol.iterator](): Iterator<unknown> {
    let i = 0;
    const data = this._data;
    return {
      next(): IteratorResult<unknown> {
        if (i < data.length) return { value: data[i++], done: false };
        return { value: undefined, done: true };
      }
    };
  }
}
