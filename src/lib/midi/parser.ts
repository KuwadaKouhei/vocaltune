import { Midi } from "@tonejs/midi";
import type { MidiNote, MidiTrack } from "./types";

/**
 * MIDIファイル（ArrayBuffer）をパースし、最初のトラックのノート情報を抽出
 */
export function parseMidi(arrayBuffer: ArrayBuffer): MidiTrack {
  const midi = new Midi(arrayBuffer);

  // 最初のノートを含むトラックを使用
  const track =
    midi.tracks.find((t) => t.notes.length > 0) ?? midi.tracks[0];

  const notes: MidiNote[] = track.notes.map((n) => ({
    midi: n.midi,
    name: n.name,
    startTime: n.time,
    duration: n.duration,
    velocity: n.velocity * 127,
  }));

  const bpm = midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 120;
  const duration =
    notes.length > 0
      ? Math.max(...notes.map((n) => n.startTime + n.duration))
      : 0;

  return {
    name: track.name || "Track 1",
    notes,
    duration,
    bpm,
  };
}

/**
 * ドラッグ＆ドロップまたはファイル選択で取得した File を ArrayBuffer に変換してパース
 */
export async function parseMidiFile(file: File): Promise<MidiTrack> {
  const arrayBuffer = await file.arrayBuffer();
  return parseMidi(arrayBuffer);
}
