import type { TargetPoint } from "@/components/PitchCanvas";

/** ルームの同期状態 */
export interface RoomState {
  bpm: number;
  bars: number;
  semitoneHeight: number;
  metronomeOn: boolean;
  editMode: boolean;
  targetStrokes: TargetPoint[][];
  midiFile: { data: ArrayBuffer; fileName: string } | null;
}

/** スカラー状態のキー */
export type ScalarStateKey = "bpm" | "bars" | "semitoneHeight" | "metronomeOn" | "editMode";

/** ルームに参加しているユーザー */
export interface RoomUser {
  userId: string;
  socketId: string;
  color: string;
}

/** リモートカーソル情報 */
export interface RemoteCursor {
  userId: string;
  point: TargetPoint;
  color: string;
}

/** サーバーからクライアントへのイベント */
export interface ServerToClientEvents {
  "room:user-joined": (data: { userId: string; userCount: number; color: string }) => void;
  "room:user-left": (data: { userId: string; userCount: number }) => void;
  "state:updated": (data: { key: ScalarStateKey; value: number | boolean; userId: string }) => void;
  "stroke:updated": (data: { targetStrokes: TargetPoint[][]; userId: string }) => void;
  "midi:uploaded": (data: { data: ArrayBuffer; fileName: string; userId: string }) => void;
  "midi:cleared": (data: { userId: string }) => void;
  "cursor:moved": (data: { userId: string; point: TargetPoint; color: string }) => void;
}

/** クライアントからサーバーへのイベント */
export interface ClientToServerEvents {
  "room:create": (callback: (roomId: string) => void) => void;
  "room:join": (data: { roomId: string }, callback: (result: { ok: boolean; state?: RoomState; userId?: string; users?: RoomUser[]; error?: string }) => void) => void;
  "room:leave": () => void;
  "state:update": (data: { key: ScalarStateKey; value: number | boolean }) => void;
  "stroke:update": (data: { targetStrokes: TargetPoint[][] }) => void;
  "midi:upload": (data: { data: ArrayBuffer; fileName: string }) => void;
  "midi:clear": () => void;
  "cursor:move": (data: { point: TargetPoint }) => void;
}
