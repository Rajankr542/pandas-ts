/**
 * Categorical dtype and array — mirrors pandas Categorical.
 */
import { Series } from './series.js';
import { isMissing, NA } from './na.js';
import { ValueError } from './errors.js';

export interface CategoricalOptions {
  categories?: string[];
  ordered?: boolean;
}

export class Categorical {
  private _values: (string | null)[];
  private _categories: string[];
  private _ordered: boolean;

  constructor(values: unknown[], options: CategoricalOptions = {}) {
    const strVals = values.map(v => isMissing(v) ? null : String(v));
    const uniqueVals = [...new Set(strVals.filter(v => v !== null) as string[])].sort();
    this._categories = options.categories ?? uniqueVals;
    this._ordered = options.ordered ?? false;
    this._values = strVals;
  }

  get categories(): string[] { return [...this._categories]; }
  get ordered(): boolean { return this._ordered; }
  get codes(): Int32Array {
    const codes = new Int32Array(this._values.length);
    for (let i = 0; i < this._values.length; i++) {
      const v = this._values[i] ?? null;
      codes[i] = v === null ? -1 : this._categories.indexOf(v);
    }
    return codes;
  }
  get dtype(): string { return 'category'; }

  toSeries(options: { name?: string; index?: (string | number)[] } = {}): Series {
    return new Series(this._values.map(v => v ?? NA), { name: options.name, index: options.index });
  }

  rename_categories(new_categories: string[]): Categorical {
    if (new_categories.length !== this._categories.length) throw new ValueError('Length mismatch');
    const map = new Map(this._categories.map((c, i) => [c, new_categories[i]]));
    const newVals = this._values.map(v => v === null ? null : map.get(v) ?? v);
    return new Categorical(newVals as string[], { categories: new_categories, ordered: this._ordered });
  }

  reorder_categories(new_order: string[]): Categorical {
    return new Categorical(this._values, { categories: new_order, ordered: this._ordered });
  }

  add_categories(new_cats: string[]): Categorical {
    const cats = [...new Set([...this._categories, ...new_cats])];
    return new Categorical(this._values, { categories: cats, ordered: this._ordered });
  }

  remove_categories(removals: string[]): Categorical {
    const newCats = this._categories.filter(c => !removals.includes(c));
    const newVals = this._values.map(v => v && removals.includes(v) ? null : v);
    return new Categorical(newVals as string[], { categories: newCats, ordered: this._ordered });
  }

  set_categories(new_cats: string[], ordered?: boolean): Categorical {
    return new Categorical(this._values, { categories: new_cats, ordered: ordered ?? this._ordered });
  }

  as_ordered(): Categorical { return new Categorical(this._values, { categories: this._categories, ordered: true }); }
  as_unordered(): Categorical { return new Categorical(this._values, { categories: this._categories, ordered: false }); }

  value_counts(): Series {
    const counts = new Map<string, number>();
    for (const v of this._values) {
      if (v !== null) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return new Series(sorted.map(([, v]) => v), { index: sorted.map(([k]) => k) });
  }

  isin(values: string[]): Series {
    const set = new Set(values);
    const result = new Uint8Array(this._values.length);
    for (let i = 0; i < this._values.length; i++) {
      result[i] = this._values[i] !== null && set.has(this._values[i]!) ? 1 : 0;
    }
    return new Series(result);
  }

  static from_codes(codes: number[], categories: string[]): Categorical {
    const vals = codes.map(c => c === -1 ? null : categories[c] ?? null);
    return new Categorical(vals as string[], { categories });
  }

  toString(): string {
    return `[${this._values.map(v => v ?? 'NaN').join(', ')}]\nCategories (${this._categories.length}, object): [${this._categories.join(', ')}]`;
  }

  get length(): number { return this._values.length; }
}
