"use client";

import { useRef, useEffect } from "react";

/**
 * バーの拍位置に連動してクリック音を鳴らすメトロノーム
 * elapsedTime が拍の境界を跨いだときに発音する
 */
export function useMetronome(
  bpm: number,
  enabled: boolean,
  elapsedTime: number
) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeatRef = useRef(-1);

  // AudioContext の生成・破棄
  useEffect(() => {
    if (enabled) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
    } else {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      lastBeatRef.current = -1;
    }

    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [enabled]);

  // elapsedTime の変化で拍の境界を検出
  useEffect(() => {
    if (!enabled || !audioCtxRef.current) return;

    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const beatDuration = 60 / bpm;
    const currentBeat = Math.floor(elapsedTime / beatDuration);

    if (currentBeat !== lastBeatRef.current && currentBeat >= 0) {
      lastBeatRef.current = currentBeat;

      // 4拍子で小節頭（0拍目）にアクセント
      const accent = currentBeat % 4 === 0;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = accent ? 1000 : 800;
      osc.type = "square";

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(accent ? 0.3 : 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.start(now);
      osc.stop(now + 0.05);
    }
  }, [enabled, bpm, elapsedTime]);
}
