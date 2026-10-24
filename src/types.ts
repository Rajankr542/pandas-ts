export type ReleaseStage = 'pre-alpha' | 'alpha' | 'beta' | 'stable';
export type Backend = 'native' | 'wasm' | 'js';
export interface BuildInfo {
  readonly version: string;
  readonly stage: ReleaseStage;
  readonly availableBackends: readonly Backend[];
  readonly plannedBackends: readonly Backend[];
}
