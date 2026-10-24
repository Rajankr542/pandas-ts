/**
 * StringAccessor — mirrors pandas Series.str accessor.
 * All 57 pandas str methods.
 */
import { Series } from '../series.js';
import { bool_ } from '../dtype.js';
import { isMissing, NA } from '../na.js';
import { ValueError } from '../errors.js';

export class StringAccessor {
  private _series: Series;

  constructor(series: Series) {
    this._series = series;
  }

  private _map(fn: (s: string, i?: number) => unknown): Series {
    const vals: unknown[] = [];
    for (let i = 0; i < this._series.size; i++) {
      const v = (this._series as any)._getAt(i);
      vals.push(isMissing(v) ? NA : fn(String(v), i));
    }
    return new Series(vals, { index: this._series.index });
  }

  private _mapBool(fn: (s: string) => boolean): Series {
    const result = new Uint8Array(this._series.size);
    for (let i = 0; i < this._series.size; i++) {
      const v = (this._series as any)._getAt(i);
      result[i] = isMissing(v) ? 0 : (fn(String(v)) ? 1 : 0);
    }
    return new Series(result, { dtype: bool_, index: this._series.index });
  }

  // ── Case ──────────────────────────────────────────────────────────────────────
  lower(): Series { return this._map(s => s.toLowerCase()); }
  upper(): Series { return this._map(s => s.toUpperCase()); }
  title(): Series { return this._map(s => s.replace(/\w\S*/g, w => (w[0] ?? '').toUpperCase() + w.slice(1).toLowerCase())); }
  capitalize(): Series { return this._map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()); }
  swapcase(): Series { return this._map(s => s.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('')); }
  casefold(): Series { return this._map(s => s.toLowerCase()); }

  // ── Search ────────────────────────────────────────────────────────────────────
  contains(pat: string, options: { case?: boolean; regex?: boolean; na?: unknown } = {}): Series {
    const caseSensitive = options.case ?? true;
    const useRegex = options.regex ?? true;
    const result = new Uint8Array(this._series.size);
    for (let i = 0; i < this._series.size; i++) {
      const v = (this._series as any)._getAt(i);
      if (isMissing(v)) { result[i] = 0; continue; }
      const s = String(v);
      if (useRegex) {
        const flags = caseSensitive ? '' : 'i';
        result[i] = new RegExp(pat, flags).test(s) ? 1 : 0;
      } else {
        result[i] = caseSensitive ? (s.includes(pat) ? 1 : 0) : (s.toLowerCase().includes(pat.toLowerCase()) ? 1 : 0);
      }
    }
    return new Series(result, { dtype: bool_, index: this._series.index });
  }

  startswith(pat: string): Series { return this._mapBool(s => s.startsWith(pat)); }
  endswith(pat: string): Series { return this._mapBool(s => s.endsWith(pat)); }

  find(sub: string): Series { return this._map(s => s.indexOf(sub)); }
  rfind(sub: string): Series { return this._map(s => s.lastIndexOf(sub)); }
  index(sub: string): Series {
    return this._map(s => {
      const i = s.indexOf(sub);
      if (i === -1) throw new ValueError(`substring not found`);
      return i;
    });
  }
  rindex(sub: string): Series {
    return this._map(s => {
      const i = s.lastIndexOf(sub);
      if (i === -1) throw new ValueError(`substring not found`);
      return i;
    });
  }

  count(pat: string): Series {
    return this._map(s => {
      const re = new RegExp(pat, 'g');
      return (s.match(re) ?? []).length;
    });
  }

  // ── Replace / extract ─────────────────────────────────────────────────────────
  replace(pat: string, repl: string, options: { regex?: boolean; case?: boolean } = {}): Series {
    return this._map(s => {
      if (options.regex ?? true) {
        const flags = (options.case ?? true) ? 'g' : 'gi';
        return s.replace(new RegExp(pat, flags), repl);
      }
      return s.split(pat).join(repl);
    });
  }

  extract(pat: string, flags = ''): Series {
    return this._map(s => {
      const m = s.match(new RegExp(pat, flags));
      return m ? (m[1] ?? m[0]) : NA;
    });
  }

  extractall(pat: string): Series {
    return this._map(s => {
      const re = new RegExp(pat, 'g');
      const matches: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(s)) !== null) matches.push(m[1] ?? m[0]);
      return matches;
    });
  }

  findall(pat: string): Series {
    return this._map(s => s.match(new RegExp(pat, 'g')) ?? []);
  }

  match(pat: string): Series {
    return this._mapBool(s => new RegExp(`^${pat}`).test(s));
  }

  fullmatch(pat: string): Series {
    return this._mapBool(s => new RegExp(`^${pat}$`).test(s));
  }

  // ── Split ─────────────────────────────────────────────────────────────────────
  split(sep?: string, options: { expand?: boolean; n?: number } = {}): Series {
    if (options.expand) {
      return this._map(s => sep ? s.split(sep) : s.split(/\s+/));
    }
    return this._map(s => {
      const parts = sep ? s.split(sep) : s.split(/\s+/);
      return options.n !== undefined ? parts.slice(0, options.n + 1) : parts;
    });
  }

  rsplit(sep?: string, options: { expand?: boolean; n?: number } = {}): Series {
    return this._map(s => {
      const parts = sep ? s.split(sep) : s.split(/\s+/);
      const n = options.n;
      if (n !== undefined && parts.length > n + 1) {
        const head = parts.slice(0, parts.length - n - 1).join(sep ?? ' ');
        return [head, ...parts.slice(parts.length - n - 1)];
      }
      return parts;
    });
  }

  partition(sep: string): Series {
    return this._map(s => {
      const idx = s.indexOf(sep);
      return idx === -1 ? [s, '', ''] : [s.slice(0, idx), sep, s.slice(idx + sep.length)];
    });
  }

  rpartition(sep: string): Series {
    return this._map(s => {
      const idx = s.lastIndexOf(sep);
      return idx === -1 ? ['', '', s] : [s.slice(0, idx), sep, s.slice(idx + sep.length)];
    });
  }

  // ── Strip ─────────────────────────────────────────────────────────────────────
  strip(chars?: string): Series {
    return chars
      ? this._map(s => s.replace(new RegExp(`^[${chars}]+|[${chars}]+$`, 'g'), ''))
      : this._map(s => s.trim());
  }
  lstrip(chars?: string): Series {
    return chars
      ? this._map(s => s.replace(new RegExp(`^[${chars}]+`, 'g'), ''))
      : this._map(s => s.trimStart());
  }
  rstrip(chars?: string): Series {
    return chars
      ? this._map(s => s.replace(new RegExp(`[${chars}]+$`, 'g'), ''))
      : this._map(s => s.trimEnd());
  }

  // ── Pad / align ───────────────────────────────────────────────────────────────
  pad(width: number, side: 'left' | 'right' | 'both' = 'left', fillchar = ' '): Series {
    return this._map(s => {
      if (s.length >= width) return s;
      const pad = fillchar.repeat(width - s.length);
      if (side === 'left') return pad + s;
      if (side === 'right') return s + pad;
      const left = fillchar.repeat(Math.floor((width - s.length) / 2));
      const right = fillchar.repeat(Math.ceil((width - s.length) / 2));
      return left + s + right;
    });
  }
  center(width: number, fillchar = ' '): Series { return this.pad(width, 'both', fillchar); }
  ljust(width: number, fillchar = ' '): Series { return this.pad(width, 'right', fillchar); }
  rjust(width: number, fillchar = ' '): Series { return this.pad(width, 'left', fillchar); }
  zfill(width: number): Series { return this._map(s => s.padStart(width, '0')); }

  // ── Slice ─────────────────────────────────────────────────────────────────────
  slice(start?: number, stop?: number, step?: number): Series {
    return this._map(s => {
      if (step && step !== 1) {
        let result = '';
        const len = s.length;
        const st = start ?? (step < 0 ? len - 1 : 0);
        const en = stop ?? (step < 0 ? -len - 1 : len);
        for (let i = st; step > 0 ? i < en : i > en; i += step) {
          if (i >= 0 && i < len) result += s[i];
        }
        return result;
      }
      return s.slice(start, stop);
    });
  }

  slice_replace(start?: number, stop?: number, repl = ''): Series {
    return this._map(s => s.slice(0, start ?? 0) + repl + s.slice(stop ?? s.length));
  }

  get(i: number): Series {
    return this._map(s => s[i < 0 ? s.length + i : i] ?? NA);
  }

  // ── Predicates ────────────────────────────────────────────────────────────────
  isalpha(): Series { return this._mapBool(s => /^[a-zA-Z]+$/.test(s)); }
  isdigit(): Series { return this._mapBool(s => /^\d+$/.test(s)); }
  isalnum(): Series { return this._mapBool(s => /^[a-zA-Z0-9]+$/.test(s)); }
  isspace(): Series { return this._mapBool(s => /^\s+$/.test(s)); }
  islower(): Series { return this._mapBool(s => s === s.toLowerCase() && s !== s.toUpperCase()); }
  isupper(): Series { return this._mapBool(s => s === s.toUpperCase() && s !== s.toLowerCase()); }
  istitle(): Series { return this._mapBool(s => s === s.replace(/\w\S*/g, w => (w[0] ?? '').toUpperCase() + w.slice(1).toLowerCase())); }
  isnumeric(): Series { return this._mapBool(s => /^[0-9\u00B2\u00B3\u00B9\u00BC-\u00BE\u2150-\u2189]+$/.test(s)); }
  isdecimal(): Series { return this._mapBool(s => /^\d+$/.test(s)); }
  isascii(): Series { return this._mapBool(s => /^[\x00-\x7F]*$/.test(s)); }

  // ── Join / cat ────────────────────────────────────────────────────────────────
  join(sep: string): Series {
    return this._map(s => {
      if (Array.isArray(s)) return (s as string[]).join(sep);
      return s.split('').join(sep);
    });
  }

  cat(others?: Series | string[], options: { sep?: string; na_rep?: string } = {}): Series {
    const sep = options.sep ?? '';
    const na_rep = options.na_rep ?? '';
    if (!others) {
      return new Series([Array.from({ length: this._series.size }, (_, i) => {
        const v = (this._series as any)._getAt(i);
        return isMissing(v) ? na_rep : String(v);
      }).join(sep)], { index: [0] });
    }
    const otherVals = others instanceof Series
      ? Array.from({ length: others.size }, (_, i) => (others as any)._getAt(i))
      : others;
    return this._map((s, i) => {
      const o = otherVals[i ?? 0];
      return s + sep + (isMissing(o) ? na_rep : String(o));
    });
  }

  // ── Repeat ────────────────────────────────────────────────────────────────────
  repeat(n: number): Series { return this._map(s => s.repeat(n)); }

  // ── Prefix/suffix ─────────────────────────────────────────────────────────────
  removeprefix(prefix: string): Series { return this._map(s => s.startsWith(prefix) ? s.slice(prefix.length) : s); }
  removesuffix(suffix: string): Series { return this._map(s => s.endsWith(suffix) ? s.slice(0, -suffix.length) : s); }

  // ── Wrap ──────────────────────────────────────────────────────────────────────
  wrap(width: number): Series {
    return this._map(s => {
      const words = s.split(' ');
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        if (line.length + w.length + (line ? 1 : 0) > width) { lines.push(line); line = w; }
        else line = line ? `${line} ${w}` : w;
      }
      if (line) lines.push(line);
      return lines.join('\n');
    });
  }

  // ── Encode/decode (stub) ──────────────────────────────────────────────────────
  encode(_encoding = 'utf-8'): Series { return this._map(s => Buffer.from(s, 'utf-8')); }
  decode(_encoding = 'utf-8'): Series { return this._map(s => Buffer.isBuffer(s as any) ? (s as any).toString('utf-8') : s); }

  // ── Unicode normalize ─────────────────────────────────────────────────────────
  normalize(form: 'NFC' | 'NFD' | 'NFKC' | 'NFKD' = 'NFC'): Series {
    return this._map(s => s.normalize(form));
  }

  // ── len ───────────────────────────────────────────────────────────────────────
  len(): Series { return this._map(s => s.length); }

  // ── get_dummies ───────────────────────────────────────────────────────────────
  get_dummies(sep = '|'): Record<string, number[]> {
    const allVals = new Set<string>();
    for (let i = 0; i < this._series.size; i++) {
      const v = (this._series as any)._getAt(i);
      if (!isMissing(v)) String(v).split(sep).forEach(s => allVals.add(s.trim()));
    }
    const cols = [...allVals].sort();
    const data: Record<string, number[]> = {};
    for (const col of cols) {
      data[col] = Array.from({ length: this._series.size }, (_, i) => {
        const v = (this._series as any)._getAt(i);
        return isMissing(v) ? 0 : String(v).split(sep).map(s => s.trim()).includes(col) ? 1 : 0;
      });
    }
    return data;
  }

  // ── translate ─────────────────────────────────────────────────────────────────
  translate(table: Record<string, string>): Series {
    return this._map(s => s.split('').map(c => table[c] ?? c).join(''));
  }
}
