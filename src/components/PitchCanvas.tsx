"use client";

import { useRef, useEffect, useCallback } from "react";
import { freqToNote } from "@/lib/pitch/notes";
import type { MidiNote } from "@/lib/midi/types";
import type { TimestampedPitch } from "@/lib/scoring/engine";

/** 目標ピッチのデータポイント（x比率 0〜1, MIDIノート番号） */
export interface TargetPoint {
  xRatio: number;
  midi: number;
}

interface PitchCanvasProps {
  pitchHistory: (number | null)[];
  timestampedPitches?: TimestampedPitch[];
  midiNotes?: MidiNote[];
  elapsedTime?: number;
  bpm?: number;
  bars?: number;
  /** 編集モード */
  editMode?: boolean;
  /** 目標ピッチデータ（ストローク単位） */
  targetStrokes?: TargetPoint[][];
  /** 目標ピッチデータ変更コールバック */
  onTargetStrokesChange?: (strokes: TargetPoint[][]) => void;
  /** 半音あたりのピクセル高 */
  semitoneHeight?: number;
}

// 1半音あたりのピクセル高（固定）
const SEMITONE_HEIGHT = 16;
const DEFAULT_CENTER = 66;
const LERP_SPEED = 0.06;

const DEFAULT_BPM = 120;
const DEFAULT_BARS = 2;
const BEATS_PER_BAR = 4;

const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
];

function lerp(current: number, target: number, t: number): number {
  return current + (target - current) * t;
}

export default function PitchCanvas({
  pitchHistory,
  timestampedPitches,
  midiNotes,
  elapsedTime = 0,
  bpm = DEFAULT_BPM,
  bars = DEFAULT_BARS,
  editMode = false,
  targetStrokes = [],
  onTargetStrokesChange,
  semitoneHeight = SEMITONE_HEIGHT,
}: PitchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  const displayCenterRef = useRef(DEFAULT_CENTER);
  const targetCenterRef = useRef(DEFAULT_CENTER);

  // 編集用: ドラッグ中フラグ & 現在描画中のストローク
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<TargetPoint[]>([]);

  // 描画ループ内で使う座標変換関数をrefで共有（マウスイベントから参照）
  const centerRef = useRef(DEFAULT_CENTER);

  const updateSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    sizeRef.current = { width: rect.width, height: rect.height };

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(container);
    updateSize();

    return () => observer.disconnect();
  }, [updateSize]);

  // マウス座標 → TargetPoint
  const mouseToPoint = useCallback((e: MouseEvent | React.MouseEvent): TargetPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { width, height } = sizeRef.current;
    if (width === 0 || height === 0) return null;

    const xRatio = Math.max(0, Math.min(1, x / width));
    const center = centerRef.current;
    const midiRaw = center + (height / 2 - y) / semitoneHeight;
    const midi = Math.round(midiRaw);

    return { xRatio, midi };
  }, [semitoneHeight]);

  // 既存ストロークからxRatio範囲が重複する部分を除去
  const eraseOverlap = useCallback((strokes: TargetPoint[][], xMin: number, xMax: number): TargetPoint[][] => {
    const result: TargetPoint[][] = [];
    for (const stroke of strokes) {
      // 重複しないポイントだけ残す（連続する非重複部分を別ストロークに分割）
      let current: TargetPoint[] = [];
      for (const p of stroke) {
        if (p.xRatio < xMin || p.xRatio > xMax) {
          current.push(p);
        } else {
          // 重複範囲に入った → ここまでのセグメントを保存
          if (current.length > 0) {
            result.push(current);
            current = [];
          }
        }
      }
      if (current.length > 0) {
        result.push(current);
      }
    }
    return result;
  }, []);

  // 描画範囲の追跡用ref
  const strokeXMinRef = useRef(0);
  const strokeXMaxRef = useRef(0);
  const baseStrokesRef = useRef<TargetPoint[][]>([]);

  // 編集モードのマウスイベント
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !editMode) return;

    const handleMouseDown = (e: MouseEvent) => {
      isDrawingRef.current = true;
      const point = mouseToPoint(e);
      if (point && onTargetStrokesChange) {
        currentStrokeRef.current = [point];
        strokeXMinRef.current = point.xRatio;
        strokeXMaxRef.current = point.xRatio;
        // 既存ストロークから重複を除去してベースとして保存
        const cleaned = eraseOverlap(targetStrokes, point.xRatio - 0.002, point.xRatio + 0.002);
        baseStrokesRef.current = cleaned;
        onTargetStrokesChange([...cleaned, [point]]);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawingRef.current) return;
      const point = mouseToPoint(e);
      if (point && onTargetStrokesChange) {
        const last = currentStrokeRef.current[currentStrokeRef.current.length - 1];
        if (!last || Math.abs(point.xRatio - last.xRatio) > 0.002) {
          currentStrokeRef.current = [...currentStrokeRef.current, point];
          // 描画範囲を拡張
          strokeXMinRef.current = Math.min(strokeXMinRef.current, point.xRatio);
          strokeXMaxRef.current = Math.max(strokeXMaxRef.current, point.xRatio);
          // ベースストロークから新しい範囲の重複を除去
          const cleaned = eraseOverlap(baseStrokesRef.current, strokeXMinRef.current - 0.002, strokeXMaxRef.current + 0.002);
          baseStrokesRef.current = cleaned;
          onTargetStrokesChange([...cleaned, currentStrokeRef.current]);
        }
      }
    };

    const handleMouseUp = () => {
      isDrawingRef.current = false;
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [editMode, mouseToPoint, onTargetStrokesChange, targetStrokes, eraseOverlap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId: number;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { width, height } = sizeRef.current;
      if (width === 0 || height === 0) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      // 表示範囲の計算
      const visibleSemitones = height / semitoneHeight;
      const edgeMargin = 2;
      const currentCenter = displayCenterRef.current;
      const viewTop = currentCenter + visibleSemitones / 2 - edgeMargin;
      const viewBottom = currentCenter - visibleSemitones / 2 + edgeMargin;

      // 直近のピッチを取得
      let currentMidi: number | null = null;
      for (let i = pitchHistory.length - 1; i >= 0; i--) {
        const freq = pitchHistory[i];
        if (freq !== null) {
          const note = freqToNote(freq);
          currentMidi = note.midi + note.cents / 100;
          break;
        }
      }

      if (currentMidi !== null) {
        if (currentMidi > viewTop) {
          targetCenterRef.current = currentMidi - visibleSemitones / 2 + edgeMargin;
        } else if (currentMidi < viewBottom) {
          targetCenterRef.current = currentMidi + visibleSemitones / 2 - edgeMargin;
        }
      }

      displayCenterRef.current = lerp(displayCenterRef.current, targetCenterRef.current, LERP_SPEED);

      const center = displayCenterRef.current;
      centerRef.current = center;

      const midiToY = (midiValue: number): number => {
        return height / 2 - (midiValue - center) * semitoneHeight;
      };

      const midiMin = center - visibleSemitones / 2;
      const midiMax = center + visibleSemitones / 2;
      const noteRange = visibleSemitones;

      const freqToY = (freq: number): number => {
        const note = freqToNote(freq);
        const midiValue = note.midi + note.cents / 100;
        return midiToY(midiValue);
      };

      const beatDuration = 60 / bpm;
      const totalBeats = bars * BEATS_PER_BAR;
      const loopDuration = totalBeats * beatDuration;

      const loopPos = elapsedTime % loopDuration;
      const loopStart = elapsedTime - loopPos;

      const timeToX = (time: number): number => {
        const t = time - loopStart;
        return (t / loopDuration) * width;
      };

      const barX = (loopPos / loopDuration) * width;

      ctx.clearRect(0, 0, width, height);

      // === 拍ガイド線 ===
      for (let beat = 0; beat <= totalBeats; beat++) {
        const x = (beat / totalBeats) * width;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);

        const isBarLine = beat % BEATS_PER_BAR === 0;
        ctx.strokeStyle = isBarLine
          ? "rgba(255, 255, 255, 0.15)"
          : "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = isBarLine ? 1 : 0.5;
        ctx.stroke();

        ctx.fillStyle = isBarLine
          ? "rgba(255, 255, 255, 0.3)"
          : "rgba(255, 255, 255, 0.15)";
        ctx.font = "9px monospace";
        if (beat < totalBeats) {
          const bar = Math.floor(beat / BEATS_PER_BAR) + 1;
          const beatInBar = (beat % BEATS_PER_BAR) + 1;
          ctx.fillText(`${bar}.${beatInBar}`, x + 3, height - 4);
        }
      }

      // === 音階背景色 + グリッドライン ===
      const NOTE_BG_COLORS: Record<number, string> = {
        0: "rgba(255, 60, 60, 0.07)",
        1: "rgba(255, 60, 60, 0.03)",
        2: "rgba(255, 220, 0, 0.07)",
        3: "rgba(255, 220, 0, 0.03)",
        4: "rgba(0, 200, 80, 0.07)",
        5: "rgba(255, 150, 0, 0.07)",
        6: "rgba(255, 150, 0, 0.03)",
        7: "rgba(0, 200, 230, 0.07)",
        8: "rgba(0, 200, 230, 0.03)",
        9: "rgba(180, 80, 255, 0.07)",
        10: "rgba(180, 80, 255, 0.03)",
        11: "rgba(255, 255, 255, 0.07)",
      };

      const gridMin = Math.floor(midiMin);
      const gridMax = Math.ceil(midiMax);

      for (let midi = gridMin; midi <= gridMax; midi++) {
        const noteIndex = midi % 12;
        const bgColor = NOTE_BG_COLORS[noteIndex];
        if (bgColor) {
          const yTop = midiToY(midi + 0.5);
          const yBottom = midiToY(midi - 0.5);
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, yTop, width, yBottom - yTop);
        }
      }

      for (let midi = gridMin; midi <= gridMax; midi++) {
        const y = midiToY(midi);
        const noteIndex = midi % 12;
        const isC = noteIndex === 0;

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);

        if (isC) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
          ctx.lineWidth = 0.5;
        }
        ctx.stroke();

        const isBlackKey = [1, 3, 6, 8, 10].includes(noteIndex);
        const octave = Math.floor(midi / 12) - 1;

        if (isC) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.font = "bold 14px monospace";
          ctx.fillText(`C${octave}`, 4, y + 5);
        } else if (!isBlackKey) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          ctx.font = "13px monospace";
          ctx.fillText(`${NOTE_NAMES[noteIndex]}${octave}`, 4, y + 4);
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
          ctx.font = "11px monospace";
          ctx.fillText(`${NOTE_NAMES[noteIndex]}${octave}`, 4, y + 4);
        }
      }

      // === 目標ピッチライン描画（ストローク単位、同一音程区間をまとめた矩形） ===
      if (targetStrokes.length > 0) {
        ctx.fillStyle = "rgba(255, 200, 0, 0.25)";
        ctx.strokeStyle = "rgba(255, 200, 0, 0.6)";
        ctx.lineWidth = 1;

        for (const stroke of targetStrokes) {
          if (stroke.length === 0) continue;

          let segStart = 0;
          for (let i = 1; i <= stroke.length; i++) {
            if (i === stroke.length || stroke[i].midi !== stroke[segStart].midi) {
              const midi = stroke[segStart].midi;
              const x1 = stroke[segStart].xRatio * width;
              const x2 = i < stroke.length
                ? stroke[i].xRatio * width
                : stroke[i - 1].xRatio * width + 2;
              const rectWidth = Math.max(x2 - x1, 1);

              const yTop = midiToY(midi + 0.5);
              const yBottom = midiToY(midi - 0.5);

              ctx.fillRect(x1, yTop, rectWidth, yBottom - yTop);
              ctx.strokeRect(x1, yTop, rectWidth, yBottom - yTop);

              segStart = i;
            }
          }
        }
      }

      // === MIDIノート オーバーレイ ===
      if (midiNotes && midiNotes.length > 0) {
        const loopEnd = loopStart + loopDuration;

        for (const note of midiNotes) {
          const noteEnd = note.startTime + note.duration;

          if (noteEnd < loopStart || note.startTime > loopEnd) continue;
          if (note.midi < midiMin - 1 || note.midi > midiMax + 1) continue;

          const x1 = Math.max(0, timeToX(note.startTime));
          const x2 = Math.min(width, timeToX(noteEnd));
          const noteHeight = height / noteRange;
          const y = midiToY(note.midi) - noteHeight / 2;

          ctx.fillStyle = "rgba(0, 229, 255, 0.08)";
          ctx.fillRect(x1, y, x2 - x1, noteHeight);

          ctx.strokeStyle = "rgba(0, 229, 255, 0.25)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x1, y, x2 - x1, noteHeight);

          if (x2 - x1 > 30) {
            ctx.fillStyle = "rgba(0, 229, 255, 0.4)";
            ctx.font = "9px monospace";
            ctx.fillText(note.name, x1 + 3, y + noteHeight - 3);
          }
        }
      }

      // === ピッチトレイル ===
      const pitches = timestampedPitches;
      if (pitches && pitches.length > 0) {
        ctx.beginPath();
        let drawing = false;

        for (let i = 0; i < pitches.length; i++) {
          const p = pitches[i];

          if (p.time < loopStart) continue;
          if (p.time > elapsedTime) break;

          if (p.frequency === null) {
            drawing = false;
            continue;
          }

          const x = timeToX(p.time);
          const y = freqToY(p.frequency);

          if (!drawing) {
            ctx.stroke();
            ctx.beginPath();
            ctx.strokeStyle = "rgba(0, 229, 255, 0.7)";
            ctx.lineWidth = 2;
            ctx.moveTo(x, y);
            drawing = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // === 再生バー ===
      ctx.beginPath();
      ctx.moveTo(barX, 0);
      ctx.lineTo(barX, height);
      ctx.strokeStyle = "rgba(0, 229, 255, 0.15)";
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(barX, 0);
      ctx.lineTo(barX, height);
      ctx.strokeStyle = "rgba(0, 229, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (pitches && pitches.length > 0) {
        const last = pitches[pitches.length - 1];
        if (last && last.frequency !== null && elapsedTime - last.time < 0.1) {
          const y = freqToY(last.frequency);

          ctx.beginPath();
          ctx.arc(barX, y, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          ctx.beginPath();
          ctx.arc(barX, y, 10, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0, 229, 255, 0.25)";
          ctx.fill();
        }
      }

      // 編集モード時のカーソル表示
      if (editMode) {
        ctx.fillStyle = "rgba(255, 200, 0, 0.08)";
        ctx.fillRect(0, 0, width, height);
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [pitchHistory, timestampedPitches, midiNotes, elapsedTime, targetStrokes, editMode, bpm, bars, semitoneHeight]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[300px]">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ cursor: editMode ? "crosshair" : "default" }}
      />
    </div>
  );
}
