/**
 * Bridge between pandas-ts and @cyfora/numera.
 * All functions handle NaN/null gracefully.
 */
import {
  array, fromTypedArray, NDArray,
  mean, std, min, max, sum,
  argmax, argmin, prod,
  nanmean, nanstd, nansum, nanmin, nanmax,
  median, nanmedian,
  quantile, nanquantile,
  percentile, nanpercentile,
  corrcoef, cov,
  histogram, diff, cumsum, cumprod,
  argsort,
  interp, average,
  gradient, convolve, correlate,
  dot, matmul, linalg,
  searchsorted,
} from '@cyfora/numera';

/** Convert unknown[] (from Series._data) to a Float64Array, replacing NA with NaN */
export function toF64(data: unknown[], naMask?: Uint8Array | null): Float64Array {
  const n = data.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (naMask && naMask[i] === 1) { out[i] = NaN; continue; }
    const v = data[i];
    if (v === null || v === undefined) { out[i] = NaN; continue; }
    out[i] = Number(v);
  }
  return out;
}

/** Convert typed array buffer to numera NDArray */
export function toNDArray(f64: Float64Array): NDArray {
  return fromTypedArray(f64);
}

/** Get scalar from NDArray result */
export function scalar(nd: NDArray): number {
  return nd.item() as number;
}

/** Get array from NDArray result */
export function toArray(nd: NDArray): number[] {
  return nd.toArray() as number[];
}

export {
  mean, std, min, max, sum, prod,
  argmax, argmin,
  nanmean, nanstd, nansum, nanmin, nanmax,
  median, nanmedian,
  quantile, nanquantile,
  percentile, nanpercentile,
  corrcoef, cov,
  histogram, diff, cumsum, cumprod,
  argsort,
  interp, average,
  gradient, convolve, correlate,
  dot, matmul, linalg,
  searchsorted,
  array, fromTypedArray, NDArray,
};
