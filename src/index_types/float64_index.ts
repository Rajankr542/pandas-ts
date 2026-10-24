import { Index } from './index.js';

export class Float64Index extends Index {
  constructor(data: number[], options: { name?: string } = {}) {
    super(data, options);
  }
  override get dtype(): string { return 'float64'; }
  override get inferred_type(): string { return 'floating'; }
}
