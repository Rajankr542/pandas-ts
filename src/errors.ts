/**
 * pandas-ts error hierarchy.
 * Mirrors pandas.errors module.
 */

export class PandasTsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValueError extends PandasTsError {}
export class PandasTypeError extends PandasTsError {}
export class IndexError extends PandasTsError {}
export class KeyError extends PandasTsError {}
export class MergeError extends PandasTsError {}
export class OutOfBoundsDatetime extends PandasTsError {}
export class NotImplementedError extends PandasTsError {}
export class ParserError extends PandasTsError {}
export class MemoryError extends PandasTsError {}
export class AttributeError extends PandasTsError {}
export class DtypeError extends PandasTsError {}
export class EmptyDataError extends PandasTsError {}
export class OptionError extends PandasTsError {}

// Alias for the pandas TypeError name (avoids collision with global TypeError)
export { PandasTypeError as TypeError };
