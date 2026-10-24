import { Index } from './index.js';

export class Int64Index extends Index {
  constructor(data: number[], options: { name?: string } = {}) {
    super(data, options);
  }
  override get dtype(): string { return 'int64'; }
  override get inferred_type(): string { return 'integer'; }
  override toString(): string {
    return `Int64Index([${this._data.slice(0,10).join(', ')}${this._data.length > 10 ? ', ...' : ''}], dtype='int64')`;
  }
}
