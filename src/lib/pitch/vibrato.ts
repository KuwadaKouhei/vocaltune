export interface VibratoInfo {
  isVibrato: boolean;
  /** ビブラートレート (Hz) */
  rate: number;
  /** ビブラート振幅 (セント) */
  extent: number;
  /** ビブラート区間のピッチ中心周波数 (Hz) */
  centerFrequency: number;
}

// ビブラート判定パラメータ
const MIN_EXTENT_CENTS = 20;
const MAX_EXTENT_CENTS = 100;
const MIN_RATE_HZ = 4;
const MAX_RATE_HZ = 8;
const MIN_CYCLES = 3;

/**
 * ピッチ系列からビブラートを検出する
 * ゼロクロス法で周期的変動を検出し、振幅・レート・サイクル数で判定
 */
export function detectVibrato(
  pitches: { time: number; frequency: number }[]
): VibratoInfo {
  const none: VibratoInfo = { isVibrato: false, rate: 0, extent: 0, centerFrequency: 0 };

  if (pitches.length < 6) return none;

  // 平均周波数（中心）を計算
  const avgFreq = pitches.reduce((s, p) => s + p.frequency, 0) / pitches.length;
  if (avgFreq <= 0) return none;

  // セント偏差を計算
  const cents = pitches.map((p) => 1200 * Math.log2(p.frequency / avgFreq));

  // ゼロクロスを検出
  const crossings: number[] = [];
  for (let i = 1; i < cents.length; i++) {
    if ((cents[i - 1] < 0 && cents[i] >= 0) || (cents[i - 1] >= 0 && cents[i] < 0)) {
      // 線形補間でゼロクロス時刻を推定
      const frac = Math.abs(cents[i - 1]) / (Math.abs(cents[i - 1]) + Math.abs(cents[i]));
      const crossTime = pitches[i - 1].time + frac * (pitches[i].time - pitches[i - 1].time);
      crossings.push(crossTime);
    }
  }

  // 2つのゼロクロスで半周期 → サイクル数は crossings / 2
  const halfCycles = crossings.length - 1;
  if (halfCycles < MIN_CYCLES * 2) return none;

  // 半周期の間隔からレートを計算
  const halfPeriods: number[] = [];
  for (let i = 1; i < crossings.length; i++) {
    halfPeriods.push(crossings[i] - crossings[i - 1]);
  }

  const avgHalfPeriod = halfPeriods.reduce((s, p) => s + p, 0) / halfPeriods.length;
  if (avgHalfPeriod <= 0) return none;

  const rate = 1 / (avgHalfPeriod * 2); // 全周期 = 半周期 * 2

  // 振幅（セント偏差のピーク平均）
  const absCents = cents.map(Math.abs);
  // 上位75%の値の平均を振幅とする（外れ値の影響を軽減）
  absCents.sort((a, b) => b - a);
  const top75Count = Math.max(1, Math.floor(absCents.length * 0.25));
  const extent = absCents.slice(0, top75Count).reduce((s, v) => s + v, 0) / top75Count;

  // 判定
  const isVibrato =
    rate >= MIN_RATE_HZ &&
    rate <= MAX_RATE_HZ &&
    extent >= MIN_EXTENT_CENTS &&
    extent <= MAX_EXTENT_CENTS;

  return {
    isVibrato,
    rate: Math.round(rate * 10) / 10,
    extent: Math.round(extent * 10) / 10,
    centerFrequency: avgFreq,
  };
}
