import { Index } from './index.js';

export class StringIndex extends Index {
  constructor(data: string[], options: { name?: string } = {}) {
    super(data, options);
  }
  override get dtype(): string { return 'object'; }
  override get inferred_type(): string { return 'string'; }
}
