"use client";

import { useState, useRef, useCallback } from "react";
import {
  startMicrophone,
  stopMicrophone,
  type MicrophoneHandle,
} from "@/lib/audio/microphone";
import { calculateRMS, DEFAULT_RMS_THRESHOLD } from "@/lib/pitch/detector";

/** キャリブレーション設定 */
const CALIBRATION_DURATION_MS = 2000; // 計測時間
const SAMPLE_INTERVAL_MS = 30; // サンプリング間隔
const HEADROOM_MULTIPLIER = 3; // ノイズフロアの何倍を閾値にするか
const MIN_THRESHOLD = DEFAULT_RMS_THRESHOLD; // 下限（デフォルト以下にはしない）

export type CalibrationPhase = "idle" | "measuring" | "done" | "error";

export interface CalibrationResult {
  /** キャリブレーション済みRMS閾値 */
  threshold: number;
  /** 計測されたノイズフロアRMS */
  noiseFloor: number;
  /** 計測サンプル数 */
  sampleCount: number;
}

export interface UseCalibrationReturn {
  phase: CalibrationPhase;
  /** 計測進捗 0-1 */
  progress: number;
  /** キャリブレーション結果 */
  result: CalibrationResult | null;
  /** キャリブレーション開始 */
  start: () => Promise<void>;
  /** キャリブレーション中止 */
  cancel: () => void;
  /** 結果をリセット */
  reset: () => void;
  error: string | null;
}

/**
 * マイクキャリブレーションフック
 *
 * 環境ノイズを一定時間計測し、ノイズフロアを上回る最適なRMS閾値を算出する。
 * 閾値 = max(ノイズフロアRMS × HEADROOM_MULTIPLIER, DEFAULT_RMS_THRESHOLD)
 */
export function useCalibration(): UseCalibrationReturn {
  const [phase, setPhase] = useState<CalibrationPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const micRef = useRef<MicrophoneHandle | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (micRef.current) {
      stopMicrophone(micRef.current);
      micRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    cleanup();
    setPhase("idle");
    setProgress(0);
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setPhase("idle");
    setProgress(0);
    setResult(null);
    setError(null);
  }, [cleanup]);

  const start = useCallback(async () => {
    try {
      cleanup();
      cancelledRef.current = false;
      setError(null);
      setResult(null);
      setProgress(0);
      setPhase("measuring");

      const mic = await startMicrophone();
      micRef.current = mic;

      const buffer = new Float32Array(mic.analyser.fftSize);
      const rmsSamples: number[] = [];
      const startTime = performance.now();

      await new Promise<void>((resolve, reject) => {
        timerRef.current = setInterval(() => {
          if (cancelledRef.current) {
            reject(new Error("cancelled"));
            return;
          }

          const elapsed = performance.now() - startTime;
          setProgress(Math.min(elapsed / CALIBRATION_DURATION_MS, 1));

          // RMSサンプルを収集
          mic.analyser.getFloatTimeDomainData(buffer);
          const rms = calculateRMS(buffer);
          rmsSamples.push(rms);

          if (elapsed >= CALIBRATION_DURATION_MS) {
            resolve();
          }
        }, SAMPLE_INTERVAL_MS);
      });

      cleanup();

      if (cancelledRef.current || rmsSamples.length === 0) return;

      // ノイズフロアを算出（上位10%を外れ値として除外し、残りの最大値を使用）
      const sorted = [...rmsSamples].sort((a, b) => a - b);
      const trimIndex = Math.floor(sorted.length * 0.9);
      const trimmed = sorted.slice(0, trimIndex);
      const noiseFloor = trimmed.length > 0 ? trimmed[trimmed.length - 1] : sorted[0];

      // 閾値を算出: ノイズフロア × ヘッドルーム
      const threshold = Math.max(noiseFloor * HEADROOM_MULTIPLIER, MIN_THRESHOLD);

      const calibrationResult: CalibrationResult = {
        threshold,
        noiseFloor,
        sampleCount: rmsSamples.length,
      };

      setResult(calibrationResult);
      setProgress(1);
      setPhase("done");
    } catch (e) {
      cleanup();
      if (cancelledRef.current) return;

      let message: string;
      if (e instanceof DOMException) {
        if (e.name === "NotAllowedError") {
          message = "マイクの使用が許可されていません。";
        } else if (e.name === "NotFoundError") {
          message = "マイクが見つかりません。";
        } else {
          message = `マイクエラー: ${e.message}`;
        }
      } else {
        message = "キャリブレーションに失敗しました。";
      }
      setError(message);
      setPhase("error");
    }
  }, [cleanup]);

  return { phase, progress, result, start, cancel, reset, error };
}
