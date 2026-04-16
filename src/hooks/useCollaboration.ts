"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSocket, disconnectSocket } from "@/lib/collab/socket";
import type { RoomState, RoomUser, ScalarStateKey, RemoteCursor } from "@/lib/collab/types";
import type { TargetPoint } from "@/components/PitchCanvas";
import type { TimestampedPitch } from "@/lib/scoring/engine";

interface UseCollaborationOptions {
  roomId: string;
}

/** リモート録音状態 */
export interface RemoteRecording {
  active: boolean;
  userId: string;
  pitches: TimestampedPitch[];
  elapsedTime: number;
}

interface UseCollaborationReturn {
  /** 接続状態 */
  isConnected: boolean;
  /** 自分のユーザーID */
  userId: string | null;
  /** ルーム内のユーザー数 */
  userCount: number;
  /** 接続エラー */
  error: string | null;
  /** リモートカーソル */
  remoteCursors: RemoteCursor[];
  /** リモート録音状態 */
  remoteRecording: RemoteRecording | null;

  // 同期された状態
  bpm: number;
  bars: number;
  semitoneHeight: number;
  metronomeOn: boolean;
  editMode: boolean;
  targetStrokes: TargetPoint[][];
  midiFile: { data: ArrayBuffer; fileName: string } | null;

  // 状態更新関数（ローカル + リモート同期）
  setBpm: (value: number) => void;
  setBars: (value: number) => void;
  setSemitoneHeight: (value: number) => void;
  setMetronomeOn: (value: boolean) => void;
  setEditMode: (value: boolean) => void;
  setTargetStrokes: (strokes: TargetPoint[][]) => void;
  uploadMidi: (data: ArrayBuffer, fileName: string) => void;
  clearMidi: () => void;
  sendCursorMove: (point: TargetPoint) => void;
  emitRecordingStart: () => void;
  emitRecordingStop: () => void;
  emitRecordingPitch: (pitches: TimestampedPitch[], elapsedTime: number) => void;
}

export function useCollaboration({ roomId }: UseCollaborationOptions): UseCollaborationReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);

  // 同期状態
  const [bpm, setBpmLocal] = useState(120);
  const [bars, setBarsLocal] = useState(2);
  const [semitoneHeight, setSemitoneHeightLocal] = useState(16);
  const [metronomeOn, setMetronomeOnLocal] = useState(false);
  const [editMode, setEditModeLocal] = useState(false);
  const [targetStrokes, setTargetStrokesLocal] = useState<TargetPoint[][]>([]);
  const [midiFile, setMidiFile] = useState<{ data: ArrayBuffer; fileName: string } | null>(null);
  const [remoteRecording, setRemoteRecording] = useState<RemoteRecording | null>(null);
  const remotePitchesRef = useRef<TimestampedPitch[]>([]);

  // リモートからの更新中かどうかのフラグ（ループ防止）
  const isRemoteUpdateRef = useRef(false);

  // ストローク更新のスロットル用
  const strokeThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStrokesRef = useRef<TargetPoint[][] | null>(null);

  // 接続・ルーム参加
  useEffect(() => {
    const socket = getSocket();

    socket.on("connect", () => {
      setIsConnected(true);
      setError(null);

      // ルームに参加
      socket.emit("room:join", { roomId }, (result) => {
        if (result.ok && result.state && result.userId) {
          setUserId(result.userId);
          setUserCount(result.users?.length || 1);

          // サーバーの状態でローカルを初期化
          isRemoteUpdateRef.current = true;
          setBpmLocal(result.state.bpm);
          setBarsLocal(result.state.bars);
          setSemitoneHeightLocal(result.state.semitoneHeight);
          setMetronomeOnLocal(result.state.metronomeOn);
          setEditModeLocal(result.state.editMode);
          setTargetStrokesLocal(result.state.targetStrokes);
          setMidiFile(result.state.midiFile);
          isRemoteUpdateRef.current = false;
        } else {
          setError(result.error || "ルーム参加に失敗しました");
        }
      });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // リモートイベントハンドラ
    socket.on("room:user-joined", (data) => {
      setUserCount(data.userCount);
    });

    socket.on("room:user-left", (data) => {
      setUserCount(data.userCount);
      // 退出したユーザーのカーソルを除去
      setRemoteCursors((prev) => prev.filter((c) => c.userId !== data.userId));
    });

    socket.on("state:updated", (data) => {
      isRemoteUpdateRef.current = true;
      switch (data.key) {
        case "bpm":
          setBpmLocal(data.value as number);
          break;
        case "bars":
          setBarsLocal(data.value as number);
          break;
        case "semitoneHeight":
          setSemitoneHeightLocal(data.value as number);
          break;
        case "metronomeOn":
          setMetronomeOnLocal(data.value as boolean);
          break;
        case "editMode":
          setEditModeLocal(data.value as boolean);
          break;
      }
      isRemoteUpdateRef.current = false;
    });

    socket.on("stroke:updated", (data) => {
      isRemoteUpdateRef.current = true;
      setTargetStrokesLocal(data.targetStrokes);
      isRemoteUpdateRef.current = false;
    });

    socket.on("midi:uploaded", (data) => {
      isRemoteUpdateRef.current = true;
      setMidiFile({ data: data.data, fileName: data.fileName });
      isRemoteUpdateRef.current = false;
    });

    socket.on("midi:cleared", () => {
      isRemoteUpdateRef.current = true;
      setMidiFile(null);
      isRemoteUpdateRef.current = false;
    });

    socket.on("cursor:moved", (data) => {
      setRemoteCursors((prev) => {
        const filtered = prev.filter((c) => c.userId !== data.userId);
        return [...filtered, { userId: data.userId, point: data.point, color: data.color }];
      });
    });

    socket.on("recording:started", (data) => {
      remotePitchesRef.current = [];
      setRemoteRecording({
        active: true,
        userId: data.userId,
        pitches: [],
        elapsedTime: 0,
      });
    });

    socket.on("recording:stopped", (data) => {
      setRemoteRecording((prev) => {
        if (prev && prev.userId === data.userId) {
          return { ...prev, active: false };
        }
        return prev;
      });
    });

    socket.on("recording:pitch", (data) => {
      remotePitchesRef.current = [...remotePitchesRef.current, ...data.pitches];
      setRemoteRecording((prev) => {
        if (prev && prev.userId === data.userId) {
          return {
            ...prev,
            pitches: remotePitchesRef.current,
            elapsedTime: data.elapsedTime,
          };
        }
        return prev;
      });
    });

    socket.connect();

    return () => {
      socket.emit("room:leave");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room:user-joined");
      socket.off("room:user-left");
      socket.off("state:updated");
      socket.off("stroke:updated");
      socket.off("midi:uploaded");
      socket.off("midi:cleared");
      socket.off("cursor:moved");
      socket.off("recording:started");
      socket.off("recording:stopped");
      socket.off("recording:pitch");
      disconnectSocket();
    };
  }, [roomId]);

  // スカラー状態の更新関数（ローカル + サーバー送信）
  const emitScalar = useCallback((key: ScalarStateKey, value: number | boolean) => {
    if (isRemoteUpdateRef.current) return;
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("state:update", { key, value });
    }
  }, []);

  const setBpm = useCallback((value: number) => {
    setBpmLocal(value);
    emitScalar("bpm", value);
  }, [emitScalar]);

  const setBars = useCallback((value: number) => {
    setBarsLocal(value);
    emitScalar("bars", value);
  }, [emitScalar]);

  const setSemitoneHeight = useCallback((value: number) => {
    setSemitoneHeightLocal(value);
    emitScalar("semitoneHeight", value);
  }, [emitScalar]);

  const setMetronomeOn = useCallback((value: boolean) => {
    setMetronomeOnLocal(value);
    emitScalar("metronomeOn", value);
  }, [emitScalar]);

  const setEditMode = useCallback((value: boolean) => {
    setEditModeLocal(value);
    emitScalar("editMode", value);
  }, [emitScalar]);

  // ストローク更新（30msスロットル）
  const setTargetStrokes = useCallback((strokes: TargetPoint[][]) => {
    setTargetStrokesLocal(strokes);

    if (isRemoteUpdateRef.current) return;

    pendingStrokesRef.current = strokes;

    if (!strokeThrottleRef.current) {
      strokeThrottleRef.current = setTimeout(() => {
        const socket = getSocket();
        if (socket.connected && pendingStrokesRef.current) {
          socket.emit("stroke:update", { targetStrokes: pendingStrokesRef.current });
          pendingStrokesRef.current = null;
        }
        strokeThrottleRef.current = null;
      }, 30);
    }
  }, []);

  // MIDI
  const uploadMidi = useCallback((data: ArrayBuffer, fileName: string) => {
    setMidiFile({ data, fileName });
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("midi:upload", { data, fileName });
    }
  }, []);

  const clearMidi = useCallback(() => {
    setMidiFile(null);
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("midi:clear");
    }
  }, []);

  // カーソル送信
  const sendCursorMove = useCallback((point: TargetPoint) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("cursor:move", { point });
    }
  }, []);

  // 録音開始通知
  const emitRecordingStart = useCallback(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("recording:start");
    }
  }, []);

  // 録音停止通知
  const emitRecordingStop = useCallback(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("recording:stop");
    }
  }, []);

  // ピッチデータ送信（増分）
  const emitRecordingPitch = useCallback((pitches: TimestampedPitch[], elapsedTime: number) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("recording:pitch", { pitches, elapsedTime });
    }
  }, []);

  return {
    isConnected,
    userId,
    userCount,
    error,
    remoteCursors,
    remoteRecording,
    bpm,
    bars,
    semitoneHeight,
    metronomeOn,
    editMode,
    targetStrokes,
    midiFile,
    setBpm,
    setBars,
    setSemitoneHeight,
    setMetronomeOn,
    setEditMode,
    setTargetStrokes,
    uploadMidi,
    clearMidi,
    sendCursorMove,
    emitRecordingStart,
    emitRecordingStop,
    emitRecordingPitch,
  };
}
