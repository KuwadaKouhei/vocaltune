"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { NoteInfo } from "@/lib/pitch/types";
import type { TimestampedPitch } from "@/lib/scoring/engine";
import { detectPitch } from "@/lib/pitch/detector";
import { freqToNote } from "@/lib/pitch/notes";
import {
  startMicrophone,
  stopMicrophone,
  type MicrophoneHandle,
} from "@/lib/audio/microphone";
import { medianFilter } from "@/lib/pitch/filter";

const HISTORY_LENGTH = 200;
const MEDIAN_WINDOW = 5;

export interface UsePitchDetectionReturn {
  isListening: boolean;
  currentNote: NoteInfo | null;
  pitchHistory: (number | null)[];
  /** タイムスタンプ付きピッチ記録（採点用） */
  timestampedPitches: TimestampedPitch[];
  /** セッション開始からの経過時間（秒） */
  elapsedTime: number;
  startListening: () => Promise<void>;
  stopListening: () => void;
  /** 経過時間とタイムスタンプ付き記録をリセット */
  resetSession: () => void;
  error: string | null;
}

export function usePitchDetection(): UsePitchDetectionReturn {
  const [isListening, setIsListening] = useState(false);
  const [currentNote, setCurrentNote] = useState<NoteInfo | null>(null);
  const [pitchHistory, setPitchHistory] = useState<(number | null)[]>([]);
  const [timestampedPitches, setTimestampedPitches] = useState<
    TimestampedPitch[]
  >([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const micRef = useRef<MicrophoneHandle | null>(null);
  const rafRef = useRef<number>(0);
  const historyRef = useRef<(number | null)[]>([]);
  const timestampedRef = useRef<TimestampedPitch[]>([]);
  const startTimeRef = useRef<number>(0);
  const rawBufferRef = useRef<(number | null)[]>([]);

  const resetSession = useCallback(() => {
    historyRef.current = [];
    timestampedRef.current = [];
    startTimeRef.current = 0;
    rawBufferRef.current = [];
    setPitchHistory([]);
    setTimestampedPitches([]);
    setElapsedTime(0);
  }, []);

  const stopListening = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (micRef.current) {
      stopMicrophone(micRef.current);
      micRef.current = null;
    }
    // 最終的なタイムスタンプ付きデータを確定
    setTimestampedPitches([...timestampedRef.current]);
    setIsListening(false);
    setCurrentNote(null);
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      const mic = await startMicrophone();
      micRef.current = mic;
      historyRef.current = [];
      timestampedRef.current = [];
      startTimeRef.current = performance.now();
      setIsListening(true);

      const buffer = new Float32Array(mic.analyser.fftSize);

      const loop = () => {
        if (!micRef.current) return;

        const now = performance.now();
        const elapsed = (now - startTimeRef.current) / 1000;

        mic.analyser.getFloatTimeDomainData(buffer);
        const result = detectPitch(buffer, mic.audioContext.sampleRate);

        // メディアンフィルタでジッター除去
        const rawFreq = result ? result.frequency : null;
        rawBufferRef.current.push(rawFreq);
        if (rawBufferRef.current.length > MEDIAN_WINDOW) {
          rawBufferRef.current = rawBufferRef.current.slice(-MEDIAN_WINDOW);
        }
        const filtered = medianFilter(rawBufferRef.current, MEDIAN_WINDOW);

        if (filtered !== null) {
          const note = freqToNote(filtered);
          setCurrentNote(note);
          historyRef.current.push(filtered);
          timestampedRef.current.push({
            time: elapsed,
            frequency: filtered,
          });
        } else {
          setCurrentNote(null);
          historyRef.current.push(null);
          timestampedRef.current.push({ time: elapsed, frequency: null });
        }

        if (historyRef.current.length > HISTORY_LENGTH) {
          historyRef.current = historyRef.current.slice(-HISTORY_LENGTH);
        }

        setPitchHistory([...historyRef.current]);
        // timestampedPitches はrefの参照を直接セット（毎フレームコピーを避ける）
        setTimestampedPitches(timestampedRef.current);
        setElapsedTime(elapsed);
        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      let message: string;
      if (e instanceof DOMException) {
        if (e.name === "NotAllowedError") {
          message = "マイクの使用が許可されていません。ブラウザの設定を確認してください。";
        } else if (e.name === "NotFoundError") {
          message = "マイクが見つかりません。マイクが接続されているか確認してください。";
        } else if (e.name === "NotReadableError") {
          message = "マイクにアクセスできません。他のアプリが使用中の可能性があります。";
        } else {
          message = `マイクエラー: ${e.name} - ${e.message}`;
        }
      } else {
        message = `マイクの初期化に失敗しました: ${e instanceof Error ? e.message : String(e)}`;
      }
      setError(message);
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (micRef.current) stopMicrophone(micRef.current);
    };
  }, []);

  return {
    isListening,
    currentNote,
    pitchHistory,
    timestampedPitches,
    elapsedTime,
    startListening,
    stopListening,
    resetSession,
    error,
  };
}
