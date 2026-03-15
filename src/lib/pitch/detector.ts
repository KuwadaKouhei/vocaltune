import type { PitchResult } from "./types";

const FFT_SIZE = 4096;
const MIN_FREQ = 60; // C2相当
const MAX_FREQ = 1200; // C6相当
const RMS_THRESHOLD = 0.0001;
const YIN_THRESHOLD = 0.25;

/**
 * RMS（二乗平均平方根）を計算し、無音判定に使用
 */
function calculateRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * YIN自己相関ベースのピッチ検出
 *
 * アルゴリズム:
 * 1. RMS計算 → 無音ならnull返却
 * 2. 差分関数を計算
 * 3. 累積平均正規化差分関数 (CMNDF) を計算
 * 4. 閾値以下の最初のディップを探索
 * 5. 放物線補間で精度向上
 * 6. 周波数 = sampleRate / tau
 */
export function detectPitch(
  buffer: Float32Array,
  sampleRate: number
): PitchResult | null {
  // 1. 無音判定
  if (calculateRMS(buffer) < RMS_THRESHOLD) {
    return null;
  }

  const halfSize = Math.floor(buffer.length / 2);

  // tau の探索範囲をサンプルレートと周波数範囲から算出
  const tauMin = Math.floor(sampleRate / MAX_FREQ);
  const tauMax = Math.min(Math.ceil(sampleRate / MIN_FREQ), halfSize);

  // 2. 差分関数 d(tau)
  const diff = new Float32Array(halfSize);
  for (let tau = 1; tau < halfSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // 3. 累積平均正規化差分関数 (CMNDF)
  const cmndf = new Float32Array(halfSize);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = runningSum === 0 ? 1 : (diff[tau] * tau) / runningSum;
  }

  // 4. 閾値以下の最初のディップ（極小値）を探索
  let tau = tauMin;
  while (tau < tauMax) {
    if (cmndf[tau] < YIN_THRESHOLD) {
      // ディップの底を見つける（値が上がり始めるまで進む）
      while (tau + 1 < tauMax && cmndf[tau + 1] < cmndf[tau]) {
        tau++;
      }
      break;
    }
    tau++;
  }

  // 閾値以下のディップが見つからなかった場合
  if (tau >= tauMax) {
    return null;
  }

  // 5. 放物線補間で精度向上
  const betterTau = parabolicInterpolation(cmndf, tau);

  // 6. 周波数算出
  const frequency = sampleRate / betterTau;

  // 検出範囲チェック
  if (frequency < MIN_FREQ || frequency > MAX_FREQ) {
    return null;
  }

  // 信頼度 = 1 - CMNDF値（0に近いほど高信頼）
  const confidence = 1 - cmndf[tau];

  return { frequency, confidence };
}

/**
 * 放物線補間によるtau値の精密化
 * 3点（tau-1, tau, tau+1）を通る放物線の頂点を求める
 */
function parabolicInterpolation(array: Float32Array, tau: number): number {
  if (tau <= 0 || tau >= array.length - 1) {
    return tau;
  }

  const s0 = array[tau - 1];
  const s1 = array[tau];
  const s2 = array[tau + 1];

  const adjustment = (s0 - s2) / (2 * (s0 - 2 * s1 + s2));

  if (Math.abs(adjustment) > 1) {
    return tau;
  }

  return tau + adjustment;
}

export { FFT_SIZE };
