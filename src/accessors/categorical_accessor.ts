/**
 * CategoricalAccessor — mirrors pandas Series.cat accessor.
 */
import { Series } from '../series.js';
import { isMissing } from '../na.js';

// Per-series categorical state stored externally so mutations persist across accessor instances
const _catState = new WeakMap<Series, { categories: string[] }>();

function getState(series: Series): { categories: string[] } {
  let state = _catState.get(series);
  if (!state) {
    const cats = series.unique().filter(v => !isMissing(v)).map(String).sort();
    state = { categories: cats };
    _catState.set(series, state);
  }
  return state;
}

export class CategoricalAccessor {
  private _series: Series;

  constructor(series: Series) {
    this._series = series;
    // ensure state is initialized
    getState(series);
  }

  get categories(): string[] { return [...getState(this._series).categories]; }
  get ordered(): boolean { return false; }

  get codes(): Series {
    const cats = getState(this._series).categories;
    const codes = Array.from({ length: this._series.size }, (_, i) => {
      const v = (this._series as any)._getAt(i);
      if (isMissing(v)) return -1;
      return cats.indexOf(String(v));
    });
    return new Series(codes, { index: this._series.index });
  }

  rename_categories(new_categories: string[]): Series {
    const cats = getState(this._series).categories;
    const map = new Map(cats.map((c, i) => [c, new_categories[i] ?? c]));
    const vals = Array.from({ length: this._series.size }, (_, i) => {
      const v = (this._series as any)._getAt(i);
      return isMissing(v) ? v : map.get(String(v)) ?? v;
    });
    return new Series(vals, { index: this._series.index });
  }

  reorder_categories(new_order: string[]): Series {
    getState(this._series).categories = new_order;
    return this._series;
  }

  add_categories(new_cats: string[]): Series {
    const state = getState(this._series);
    state.categories = [...new Set([...state.categories, ...new_cats])];
    return this._series;
  }

  remove_categories(removals: string[]): Series {
    const state = getState(this._series);
    state.categories = state.categories.filter(c => !removals.includes(c));
    const vals = Array.from({ length: this._series.size }, (_, i) => {
      const v = (this._series as any)._getAt(i);
      return (isMissing(v) || removals.includes(String(v))) ? null : v;
    });
    return new Series(vals, { index: this._series.index });
  }

  set_categories(new_cats: string[]): Series {
    getState(this._series).categories = new_cats;
    return this._series;
  }

  as_ordered(): Series { return this._series; }
  as_unordered(): Series { return this._series; }
}
