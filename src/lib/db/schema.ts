import Dexie, { type EntityTable } from "dexie";
import type { NoteScore } from "@/lib/scoring/engine";

export interface Recording {
  id?: number;
  title: string; // 曲名
  createdAt: Date;
  duration: number; // 秒
  score: number; // 総合スコア 0-100
  noteScores: NoteScore[]; // 各ノートのスコア
  pitchData: (number | null)[]; // ピッチ履歴（周波数配列）
  midiFileName?: string; // お手本MIDIファイル名
  tags?: string[]; // 任意タグ
}

const db = new Dexie("VocalTuneDB") as Dexie & {
  recordings: EntityTable<Recording, "id">;
};

db.version(1).stores({
  recordings: "++id, title, createdAt, score, *tags",
});

export { db };
