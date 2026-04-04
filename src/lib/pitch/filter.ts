const MEDIAN_WINDOW = 5;

/**
 * メディアンフィルタによるピッチジッター除去
 * 直近windowSize個の非null値の中央値を返す
 */
export function medianFilter(
  buffer: (number | null)[],
  windowSize: number = MEDIAN_WINDOW
): number | null {
  const values: number[] = [];
  const start = Math.max(0, buffer.length - windowSize);
  for (let i = start; i < buffer.length; i++) {
    if (buffer[i] !== null) {
      values.push(buffer[i] as number);
    }
  }

  // 非null値が半数未満ならnull
  if (values.length < Math.ceil(windowSize / 2)) {
    return null;
  }

  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? (values[mid - 1] + values[mid]) / 2
    : values[mid];
}
