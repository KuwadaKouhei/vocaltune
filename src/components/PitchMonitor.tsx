"use client";

import { useState, useCallback, useRef, useEffect, type DragEvent } from "react";
import { usePitchDetection } from "@/hooks/usePitchDetection";
import { useRecordings } from "@/hooks/useRecordings";
import { parseMidiFile } from "@/lib/midi/parser";
import { calculateScore } from "@/lib/scoring/engine";
import type { MidiTrack } from "@/lib/midi/types";
import type { SessionScore } from "@/lib/scoring/engine";
import { useMetronome } from "@/hooks/useMetronome";
import PitchCanvas, { type TargetPoint } from "./PitchCanvas";
import NoteDisplay from "./NoteDisplay";
import ScoreDisplay from "./ScoreDisplay";
import Image from "next/image";
import type { RemoteCursor } from "@/lib/collab/types";
import Onboarding from "./Onboarding";

export interface PitchMonitorProps {
  /** 共同編集モード時の外部状態 */
  collabState?: {
    bpm: number;
    bars: number;
    semitoneHeight: number;
    metronomeOn: boolean;
    editMode: boolean;
    targetStrokes: TargetPoint[][];
    midiFile: { data: ArrayBuffer; fileName: string } | null;
    setBpm: (value: number) => void;
    setBars: (value: number) => void;
    setSemitoneHeight: (value: number) => void;
    setMetronomeOn: (value: boolean) => void;
    setEditMode: (value: boolean) => void;
    setTargetStrokes: (strokes: TargetPoint[][]) => void;
    uploadMidi: (data: ArrayBuffer, fileName: string) => void;
    clearMidi: () => void;
    sendCursorMove?: (point: TargetPoint) => void;
    remoteCursors?: RemoteCursor[];
    userId?: string | null;
  };
  /** ヘッダー上部に追加表示するノード */
  statusBar?: React.ReactNode;
}

export default function PitchMonitor({ collabState, statusBar }: PitchMonitorProps = {}) {
  const {
    isListening,
    currentNote,
    pitchHistory,
    timestampedPitches,
    elapsedTime,
    startListening,
    stopListening,
    resetSession,
    error,
  } = usePitchDetection();

  const { save } = useRecordings();

  const [midiTrack, setMidiTrackLocal] = useState<MidiTrack | null>(null);
  const [midiFileName, setMidiFileName] = useState<string | null>(null);
  const [score, setScore] = useState<SessionScore | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [bpmInput, setBpmInput] = useState(collabState ? String(collabState.bpm) : "120");
  const [bpmError, setBpmError] = useState<string | null>(null);
  const [metronomeOnLocal, setMetronomeOnLocal] = useState(false);
  const [barsInput, setBarsInput] = useState(collabState ? String(collabState.bars) : "2");
  const [barsError, setBarsError] = useState<string | null>(null);
  const [editModeLocal, setEditModeLocal] = useState(false);
  const [targetStrokesLocal, setTargetStrokesLocal] = useState<TargetPoint[][]>([]);
  const [semitoneHeightLocal, setSemitoneHeightLocal] = useState(16);
  const [snapToGrid, setSnapToGrid] = useState(false);

  // Undo/Redo
  const strokeHistoryRef = useRef<TargetPoint[][][]>([]);
  const redoStackRef = useRef<TargetPoint[][][]>([]);
  const HISTORY_LIMIT = 50;

  // collabState優先: collabがあればcollab側を使い、なければローカルstate
  const metronomeOn = collabState?.metronomeOn ?? metronomeOnLocal;
  const editMode = collabState?.editMode ?? editModeLocal;
  const targetStrokes = collabState?.targetStrokes ?? targetStrokesLocal;
  const semitoneHeight = collabState?.semitoneHeight ?? semitoneHeightLocal;

  const setMetronomeOn = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    const val = typeof v === "function" ? v(collabState?.metronomeOn ?? metronomeOnLocal) : v;
    if (collabState) {
      collabState.setMetronomeOn(val);
    } else {
      setMetronomeOnLocal(val);
    }
  }, [collabState, metronomeOnLocal]);

  const setEditMode = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    const val = typeof v === "function" ? v(collabState?.editMode ?? editModeLocal) : v;
    if (collabState) {
      collabState.setEditMode(val);
    } else {
      setEditModeLocal(val);
    }
  }, [collabState, editModeLocal]);

  const setTargetStrokes = useCallback((strokes: TargetPoint[][]) => {
    if (collabState) {
      collabState.setTargetStrokes(strokes);
    } else {
      setTargetStrokesLocal(strokes);
    }
  }, [collabState]);

  // ストローク確定時にhistoryに追加
  const handleStrokeCommit = useCallback(() => {
    strokeHistoryRef.current = [
      ...strokeHistoryRef.current.slice(-(HISTORY_LIMIT - 1)),
      targetStrokes,
    ];
    redoStackRef.current = [];
  }, [targetStrokes]);

  const handleUndo = useCallback(() => {
    if (strokeHistoryRef.current.length === 0) return;
    const prev = strokeHistoryRef.current.pop()!;
    redoStackRef.current.push(targetStrokes);
    setTargetStrokes(prev);
  }, [targetStrokes, setTargetStrokes]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    strokeHistoryRef.current.push(targetStrokes);
    setTargetStrokes(next);
  }, [targetStrokes, setTargetStrokes]);

  const setSemitoneHeight = useCallback((v: number) => {
    if (collabState) {
      collabState.setSemitoneHeight(v);
    } else {
      setSemitoneHeightLocal(v);
    }
  }, [collabState]);

  const setMidiTrack = useCallback((track: MidiTrack | null) => {
    setMidiTrackLocal(track);
  }, []);

  // collabからMIDIファイルが来た場合にパース
  const collabMidiFileRef = useRef<{ data: ArrayBuffer; fileName: string } | null>(null);
  useEffect(() => {
    if (!collabState?.midiFile) {
      if (collabMidiFileRef.current !== null) {
        // リモートでMIDIがクリアされた
        collabMidiFileRef.current = null;
        setMidiTrackLocal(null);
        setMidiFileName(null);
      }
      return;
    }
    // 同じファイルなら再パースしない
    if (collabMidiFileRef.current?.fileName === collabState.midiFile.fileName) return;

    collabMidiFileRef.current = collabState.midiFile;
    const { data, fileName } = collabState.midiFile;
    (async () => {
      try {
        const { parseMidi } = await import("@/lib/midi/parser");
        const track = parseMidi(data);
        setMidiTrackLocal(track);
        setMidiFileName(fileName);
        setBpmInput(Math.round(track.bpm).toString());
        setBpmError(null);
      } catch {
        setMidiError("リモートMIDIファイルの読み込みに失敗しました。");
      }
    })();
  }, [collabState?.midiFile]);

  // BPM入力のバリデーション
  const handleBpmChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBpmInput(value);

    if (value === "") {
      setBpmError(null);
      return;
    }

    if (!/^\d+$/.test(value)) {
      setBpmError("半角数字のみ入力してください");
      return;
    }

    const num = parseInt(value, 10);
    if (num < 20 || num > 300) {
      setBpmError("20〜300の範囲で入力してください");
      return;
    }

    setBpmError(null);
    collabState?.setBpm(num);
  }, [collabState]);

  // 小節数入力のバリデーション
  const handleBarsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBarsInput(value);

    if (value === "") {
      setBarsError(null);
      return;
    }

    if (!/^\d+$/.test(value)) {
      setBarsError("半角数字のみ入力してください");
      return;
    }

    const num = parseInt(value, 10);
    if (num < 1 || num > 32) {
      setBarsError("1〜32の範囲で入力してください");
      return;
    }

    setBarsError(null);
    collabState?.setBars(num);
  }, [collabState]);

  // collabからのBPM/Bars変更をinputに反映
  const prevCollabBpmRef = useRef(collabState?.bpm);
  const prevCollabBarsRef = useRef(collabState?.bars);
  useEffect(() => {
    if (collabState && collabState.bpm !== prevCollabBpmRef.current) {
      prevCollabBpmRef.current = collabState.bpm;
      setBpmInput(String(collabState.bpm));
      setBpmError(null);
    }
  }, [collabState?.bpm, collabState]);
  useEffect(() => {
    if (collabState && collabState.bars !== prevCollabBarsRef.current) {
      prevCollabBarsRef.current = collabState.bars;
      setBarsInput(String(collabState.bars));
      setBarsError(null);
    }
  }, [collabState?.bars, collabState]);

  // 有効なBPM値を算出
  const effectiveBpm = (() => {
    if (midiTrack) return midiTrack.bpm;
    if (collabState) return collabState.bpm;
    const num = parseInt(bpmInput, 10);
    if (!isNaN(num) && num >= 20 && num <= 300) return num;
    return 120;
  })();

  // 有効な小節数を算出
  const effectiveBars = (() => {
    if (collabState) return collabState.bars;
    const num = parseInt(barsInput, 10);
    if (!isNaN(num) && num >= 1 && num <= 32) return num;
    return 2;
  })();

  // Undo/Redo キーボードショートカット
  useEffect(() => {
    if (!editMode) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editMode, handleUndo, handleRedo]);

  // メトロノーム
  useMetronome(effectiveBpm, metronomeOn, elapsedTime);

  // MIDI ファイルの読み込み
  const loadMidiFile = useCallback(async (file: File) => {
    try {
      setMidiError(null);
      const track = await parseMidiFile(file);
      setMidiTrack(track);
      setMidiFileName(file.name);
      setBpmInput(Math.round(track.bpm).toString());
      setBpmError(null);
      setScore(null);

      // collabモード時はArrayBufferも送信
      if (collabState) {
        const arrayBuffer = await file.arrayBuffer();
        collabState.uploadMidi(arrayBuffer, file.name);
      }
    } catch {
      setMidiError("MIDIファイルの読み込みに失敗しました。");
    }
  }, [collabState]);

  // ドラッグ＆ドロップ
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".mid") || file.name.endsWith(".midi"))) {
        loadMidiFile(file);
      } else {
        setMidiError(".mid / .midi ファイルをドロップしてください。");
      }
    },
    [loadMidiFile]
  );

  // ファイル選択
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadMidiFile(file);
      e.target.value = "";
    },
    [loadMidiFile]
  );

  // 採点実行
  const handleScore = useCallback(() => {
    if (!midiTrack) return;
    const result = calculateScore(midiTrack.notes, timestampedPitches);
    setScore(result);
  }, [midiTrack, timestampedPitches]);

  // START / STOP
  const handleToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      setSaved(false);
      if (midiTrack) {
        setTimeout(() => {
          handleScore();
        }, 50);
      }
    } else {
      setScore(null);
      setSaved(false);
      resetSession();
      startListening();
    }
  }, [isListening, stopListening, startListening, resetSession, midiTrack, handleScore]);

  // 録音保存
  const handleSave = useCallback(async () => {
    if (!score || !midiTrack) return;

    const title = midiFileName?.replace(/\.(mid|midi)$/i, "") || "Untitled";

    await save({
      title,
      createdAt: new Date(),
      duration: elapsedTime,
      score: score.totalScore,
      noteScores: score.noteScores,
      pitchData: pitchHistory,
      midiFileName: midiFileName || undefined,
    });

    setSaved(true);
  }, [score, midiTrack, midiFileName, elapsedTime, pitchHistory, save]);

  // デモ曲ロード
  const loadDemo = useCallback(async () => {
    try {
      const res = await fetch("/demo.mid");
      const arrayBuffer = await res.arrayBuffer();
      const { parseMidi } = await import("@/lib/midi/parser");
      const track = parseMidi(arrayBuffer);
      setMidiTrack(track);
      setMidiFileName("demo.mid");
      setBpmInput(Math.round(track.bpm).toString());
      setBpmError(null);
      setScore(null);
      if (collabState) {
        collabState.uploadMidi(arrayBuffer, "demo.mid");
      }
    } catch {
      // デモ曲が見つからない場合は無視
    }
  }, [collabState, setMidiTrack]);

  // MIDIクリア
  const handleClearMidi = useCallback(() => {
    setMidiTrack(null);
    setMidiFileName(null);
    setScore(null);
    setMidiError(null);
    setSaved(false);
    collabState?.clearMidi();
  }, [collabState]);

  return (
    <div className="flex flex-col h-full gap-4">
      <Onboarding onLoadDemo={loadDemo} />

      {/* コラボステータスバー */}
      {statusBar}

      {/* エラー表示 */}
      {(error || midiError) && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            backgroundColor: "rgba(255, 61, 113, 0.1)",
            border: "1px solid rgba(255, 61, 113, 0.2)",
            color: "#ff3d71",
            fontFamily: "monospace",
          }}
        >
          {error || midiError}
        </div>
      )}

      <div className="flex flex-1 gap-4 min-h-0">
        {/* 左パネル: 音名表示 + コントロール */}
        <div
          className="relative w-[200px] shrink-0 rounded-lg p-4"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <NoteDisplay note={currentNote} />

          {/* BPM入力 + 小節数 + メトロノーム（絶対位置で固定） */}
          <div className="absolute left-4 right-4" style={{ top: "180px" }}>
            <label
              className="block text-xs mb-1"
              style={{ color: "#555555", fontFamily: "monospace" }}
            >
              BPM
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={bpmInput}
              onChange={handleBpmChange}
              disabled={isListening}
              className="w-full px-3 py-2 rounded-lg text-sm text-center"
              style={{
                fontFamily: "monospace",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: `1px solid ${bpmError ? "rgba(255, 61, 113, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                color: bpmError ? "#ff3d71" : "#ffffff",
                outline: "none",
              }}
              placeholder="120"
            />
            {bpmError && (
              <div
                className="text-xs mt-1"
                style={{ color: "#ff3d71", fontFamily: "monospace" }}
              >
                {bpmError}
              </div>
            )}
            <label
              className="block text-xs mb-1 mt-3"
              style={{ color: "#555555", fontFamily: "monospace" }}
            >
              小節数
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={barsInput}
              onChange={handleBarsChange}
              disabled={isListening}
              className="w-full px-3 py-2 rounded-lg text-sm text-center"
              style={{
                fontFamily: "monospace",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: `1px solid ${barsError ? "rgba(255, 61, 113, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                color: barsError ? "#ff3d71" : "#ffffff",
                outline: "none",
              }}
              placeholder="2"
            />
            {barsError && (
              <div
                className="text-xs mt-1"
                style={{ color: "#ff3d71", fontFamily: "monospace" }}
              >
                {barsError}
              </div>
            )}
            <label
              className="block text-xs mb-1 mt-3"
              style={{ color: "#555555", fontFamily: "monospace" }}
            >
              半音高さ (px)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={4}
                max={64}
                value={semitoneHeight}
                onChange={(e) => setSemitoneHeight(parseInt(e.target.value, 10))}
                className="flex-1"
                style={{ accentColor: "#00e5ff" }}
              />
              <span
                className="text-xs w-6 text-right"
                style={{ color: "#888888", fontFamily: "monospace" }}
              >
                {semitoneHeight}
              </span>
            </div>
            <button
              onClick={() => setMetronomeOn((v) => !v)}
              className="w-full mt-2 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              style={{
                backgroundColor: metronomeOn
                  ? "rgba(0, 229, 255, 0.15)"
                  : "rgba(255, 255, 255, 0.04)",
                border: `1px solid ${metronomeOn ? "rgba(0, 229, 255, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
              }}
              title={metronomeOn ? "メトロノーム OFF" : "メトロノーム ON"}
            >
              <Image
                src="/metronome.png"
                alt="metronome"
                width={20}
                height={20}
                style={{
                  opacity: metronomeOn ? 1 : 0.35,
                  filter: metronomeOn ? "invert(1) brightness(2)" : "invert(1) brightness(0.6)",
                }}
              />
              <span
                className="text-xs"
                style={{
                  fontFamily: "monospace",
                  color: metronomeOn ? "#00e5ff" : "#555555",
                }}
              >
                {metronomeOn ? "ON" : "OFF"}
              </span>
            </button>
            <button
              onClick={() => setEditMode((v) => !v)}
              className="w-full mt-2 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              style={{
                backgroundColor: editMode
                  ? "rgba(255, 200, 0, 0.15)"
                  : "rgba(255, 255, 255, 0.04)",
                border: `1px solid ${editMode ? "rgba(255, 200, 0, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
              }}
              title={editMode ? "編集モード OFF" : "編集モード ON"}
            >
              <Image
                src="/edit.svg"
                alt="edit"
                width={18}
                height={18}
                style={{
                  opacity: editMode ? 1 : 0.35,
                  filter: editMode ? "invert(1) brightness(2) sepia(1) saturate(5) hue-rotate(10deg)" : "invert(1) brightness(0.6)",
                }}
              />
              <span
                className="text-xs"
                style={{
                  fontFamily: "monospace",
                  color: editMode ? "#ffc800" : "#555555",
                }}
              >
                {editMode ? "EDIT" : "EDIT"}
              </span>
            </button>
            {editMode && (
              <>
                <button
                  onClick={() => setSnapToGrid((v) => !v)}
                  className="w-full mt-1 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  style={{
                    backgroundColor: snapToGrid
                      ? "rgba(0, 200, 120, 0.15)"
                      : "rgba(255, 255, 255, 0.04)",
                    border: `1px solid ${snapToGrid ? "rgba(0, 200, 120, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
                  }}
                  title={snapToGrid ? "グリッドスナップ OFF" : "グリッドスナップ ON"}
                >
                  <span
                    className="text-xs"
                    style={{
                      fontFamily: "monospace",
                      color: snapToGrid ? "#00c878" : "#555555",
                    }}
                  >
                    SNAP {snapToGrid ? "ON" : "OFF"}
                  </span>
                </button>
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={handleUndo}
                    className="flex-1 py-1.5 rounded-lg text-xs transition-colors"
                    style={{
                      fontFamily: "monospace",
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: strokeHistoryRef.current.length > 0 ? "#888888" : "#333333",
                    }}
                    title="Undo (Ctrl+Z)"
                  >
                    Undo
                  </button>
                  <button
                    onClick={handleRedo}
                    className="flex-1 py-1.5 rounded-lg text-xs transition-colors"
                    style={{
                      fontFamily: "monospace",
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: redoStackRef.current.length > 0 ? "#888888" : "#333333",
                    }}
                    title="Redo (Ctrl+Shift+Z)"
                  >
                    Redo
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 下部固定: スコア + ボタン */}
          <div className="absolute left-4 right-4 bottom-4 flex flex-col gap-2">
            {/* スコア表示 */}
            {score && <ScoreDisplay score={score} />}
            {/* 経過時間 */}
            {(isListening || elapsedTime > 0) && (
              <div
                className="text-center text-xs"
                style={{ color: "#555555", fontFamily: "monospace" }}
              >
                {formatTime(elapsedTime)}
              </div>
            )}

            <button
              onClick={handleToggle}
              className="w-full py-3 rounded-lg text-sm font-bold tracking-wider transition-colors"
              style={{
                fontFamily: "monospace",
                backgroundColor: isListening
                  ? "rgba(255, 61, 113, 0.15)"
                  : "rgba(0, 229, 255, 0.15)",
                border: `1px solid ${isListening ? "rgba(255, 61, 113, 0.3)" : "rgba(0, 229, 255, 0.3)"}`,
                color: isListening ? "#ff3d71" : "#00e5ff",
              }}
            >
              {isListening ? "■ STOP" : "● START"}
            </button>

            {/* 保存ボタン（スコアがあり、未保存のときのみ表示） */}
            {score && !isListening && !saved && (
              <button
                onClick={handleSave}
                className="w-full py-2 rounded-lg text-xs font-bold tracking-wider transition-colors"
                style={{
                  fontFamily: "monospace",
                  backgroundColor: "rgba(0, 229, 255, 0.1)",
                  border: "1px solid rgba(0, 229, 255, 0.2)",
                  color: "#00e5ff",
                }}
              >
                SAVE
              </button>
            )}
            {saved && (
              <div
                className="text-center text-xs py-2"
                style={{ color: "#555555", fontFamily: "monospace" }}
              >
                Saved!
              </div>
            )}
          </div>
        </div>

        {/* 右パネル: ピアノロール */}
        <div className="flex flex-1 flex-col gap-4 min-h-0">
          <div
            className="flex-1 rounded-lg overflow-hidden min-h-0"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <PitchCanvas
              pitchHistory={pitchHistory}
              timestampedPitches={timestampedPitches}
              midiNotes={midiTrack?.notes}
              elapsedTime={elapsedTime}
              bpm={effectiveBpm}
              bars={effectiveBars}
              editMode={editMode}
              targetStrokes={targetStrokes}
              onTargetStrokesChange={setTargetStrokes}
              semitoneHeight={semitoneHeight}
              snapToGrid={snapToGrid}
              onStrokeCommit={handleStrokeCommit}
              remoteCursors={collabState?.remoteCursors}
              onCursorMove={collabState?.sendCursorMove}
              localUserId={collabState?.userId ?? null}
            />
          </div>

          {/* MIDIドロップゾーン */}
          <div
            className="rounded-lg p-3 flex items-center gap-3 shrink-0"
            style={{
              backgroundColor: isDragOver
                ? "rgba(0, 229, 255, 0.06)"
                : "rgba(255, 255, 255, 0.02)",
              border: `1px ${isDragOver ? "solid" : "dashed"} ${isDragOver ? "rgba(0, 229, 255, 0.3)" : "rgba(255, 255, 255, 0.06)"}`,
              transition: "all 0.15s",
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {midiTrack ? (
              <>
                <span
                  className="text-xs flex-1"
                  style={{ color: "#00e5ff", fontFamily: "monospace" }}
                >
                  ♪ {midiFileName} — {midiTrack.notes.length} notes,{" "}
                  {midiTrack.bpm.toFixed(0)} BPM,{" "}
                  {formatTime(midiTrack.duration)}
                </span>
                <button
                  onClick={handleClearMidi}
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    color: "#555555",
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    fontFamily: "monospace",
                  }}
                >
                  ✕ Clear
                </button>
              </>
            ) : (
              <>
                <span
                  className="text-xs flex-1"
                  style={{ color: "#555555", fontFamily: "monospace" }}
                >
                  Drop MIDI file here
                </span>
                <label
                  className="text-xs px-3 py-1 rounded cursor-pointer"
                  style={{
                    color: "#00e5ff",
                    backgroundColor: "rgba(0, 229, 255, 0.1)",
                    fontFamily: "monospace",
                  }}
                >
                  Browse
                  <input
                    type="file"
                    accept=".mid,.midi"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
