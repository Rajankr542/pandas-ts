import { Index } from './index.js';
import { ValueError, KeyError } from '../errors.js';

export class MultiIndex extends Index {
  private _levels: unknown[][];
  private _codes: Int32Array[];
  private _names: (string | null)[];

  constructor(
    levels: unknown[][],
    codes: (number[] | Int32Array)[],
    options: { names?: (string | null)[] } = {}
  ) {
    // Build flat tuples for base class
    const len = codes[0]?.length ?? 0;
    const tuples = Array.from({ length: len }, (_, i) =>
      levels.map((level, j) => {
        const code = codes[j]?.[i] ?? -1;
        return code === -1 ? null : level[code];
      })
    );
    super(tuples, {});
    this._levels = levels.map(l => [...l]);
    this._codes = codes.map(c => new Int32Array(c));
    this._names = options.names ?? levels.map(() => null);
  }

  get levels(): unknown[][] { return this._levels; }
  get codes(): Int32Array[] { return this._codes; }
  get names(): (string | null)[] { return this._names; }
  get nlevels(): number { return this._levels.length; }
  override get dtype(): string { return 'object'; }

  get_level_values(level: number | string): Index {
    const lvlIdx = typeof level === 'number' ? level : this._names.indexOf(level as string);
    if (lvlIdx === -1) throw new KeyError(`level '${level}' not found`);
    const values = Array.from(this._codes[lvlIdx] ?? [], code => this._levels[lvlIdx]?.[code] ?? null);
    return new Index(values, { name: typeof this._names[lvlIdx] === 'string' ? this._names[lvlIdx]! : undefined });
  }

  set_levels(levels: unknown[][], options: { level?: number } = {}): MultiIndex {
    const newLevels = [...this._levels];
    if (options.level !== undefined) newLevels[options.level] = levels[0] ?? [];
    else levels.forEach((l, i) => { newLevels[i] = l; });
    return new MultiIndex(newLevels, this._codes, { names: this._names });
  }

  set_names(names: (string | null)[], options: { level?: number } = {}): MultiIndex {
    const newNames = [...this._names];
    if (options.level !== undefined) newNames[options.level] = names[0] ?? null;
    else names.forEach((n, i) => { newNames[i] = n; });
    return new MultiIndex(this._levels, this._codes, { names: newNames });
  }

  droplevel(level: number | number[] = 0): Index {
    const levels = Array.isArray(level) ? level : [level];
    const remaining = this._levels.filter((_, i) => !levels.includes(i));
    const remainingCodes = this._codes.filter((_, i) => !levels.includes(i));
    const remainingNames = this._names.filter((_, i) => !levels.includes(i));
    if (remaining.length === 1) {
      return new Index(Array.from(remainingCodes[0] ?? [], code => remaining[0]?.[code] ?? null));
    }
    return new MultiIndex(remaining, remainingCodes, { names: remainingNames });
  }

  to_flat_index(): Index {
    return new Index(this._data.map(t => JSON.stringify(t)));
  }

  override tolist(): unknown[][] { return this._data as unknown[][]; }

  static from_tuples(tuples: unknown[][], options: { names?: (string | null)[] } = {}): MultiIndex {
    const nLevels = tuples[0]?.length ?? 0;
    const levelsSet: Set<unknown>[] = Array.from({ length: nLevels }, () => new Set());
    for (const t of tuples) {
      (t as unknown[]).forEach((v, i) => levelsSet[i]?.add(v));
    }
    const levels = levelsSet.map(s => [...s]);
    const codes = Array.from({ length: nLevels }, (_, j) =>
      new Int32Array(tuples.map(t => levels[j]!.indexOf((t as unknown[])[j])))
    );
    return new MultiIndex(levels, codes, options);
  }

  static from_arrays(arrays: unknown[][], options: { names?: (string | null)[] } = {}): MultiIndex {
    const levels = arrays.map(arr => [...new Set(arr)]);
    const codes = arrays.map((arr, i) =>
      new Int32Array(arr.map(v => levels[i]!.indexOf(v)))
    );
    return new MultiIndex(levels, codes, options);
  }

  static from_product(iterables: unknown[][], options: { names?: (string | null)[] } = {}): MultiIndex {
    const tuples: unknown[][] = [[]];
    for (const it of iterables) {
      const newTuples: unknown[][] = [];
      for (const t of tuples) for (const v of it) newTuples.push([...t, v]);
      tuples.length = 0;
      tuples.push(...newTuples);
    }
    return MultiIndex.from_tuples(tuples, options);
  }

  override toString(): string {
    const preview = (this._data as unknown[][]).slice(0, 5).map(t => `(${(t as unknown[]).join(', ')})`).join(', ');
    return `MultiIndex([${preview}${this._data.length > 5 ? ', ...' : ''}])`;
  }
}
