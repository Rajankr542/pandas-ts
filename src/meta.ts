import type { BuildInfo } from './types.js';

export const VERSION = '0.0.2';

export function info(): BuildInfo {
  return {
    version: VERSION,
    stage: 'pre-alpha',
    availableBackends: ['js'],
    plannedBackends: ['native', 'wasm'],
  };
}

export function isNativeAvailable(): boolean {
  return false;
}
