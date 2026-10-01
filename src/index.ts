/**
 * pandas-ts
 *
 * A 100% pandas-compatible DataFrame & Series library for TypeScript and
 * JavaScript, powered by a high-performance C++ core.
 *
 * NOTE: This is the initial (pre-alpha) release that reserves the package
 * name. The DataFrame / Series APIs are under active development and are
 * NOT available yet. See the README for the roadmap.
 *
 * @packageDocumentation
 */

/** Current version of pandas-ts. Kept in sync with package.json. */
export const VERSION = '0.0.1';

/** Development stage of the library. */
export type ReleaseStage = 'pre-alpha' | 'alpha' | 'beta' | 'stable';

/** Execution backends planned for pandas-ts. */
export type Backend = 'native' | 'wasm' | 'js';

/** Information about the installed pandas-ts build. */
export interface BuildInfo {
  /** Package version. */
  readonly version: string;
  /** Current release stage. */
  readonly stage: ReleaseStage;
  /** Backends that are available in this build. */
  readonly availableBackends: readonly Backend[];
  /** Backends that are planned for upcoming releases. */
  readonly plannedBackends: readonly Backend[];
}

/**
 * Returns information about the installed pandas-ts build.
 *
 * @example
 * ```ts
 * import { info } from 'pandas-ts';
 * console.log(info().version); // "0.0.1"
 * ```
 */
export function info(): BuildInfo {
  return {
    version: VERSION,
    stage: 'pre-alpha',
    availableBackends: [],
    plannedBackends: ['native', 'wasm', 'js'],
  };
}

/**
 * Returns `true` when the native C++ core is loaded.
 *
 * Always `false` in this pre-alpha release; the native core is not shipped yet.
 */
export function isNativeAvailable(): boolean {
  return false;
}
