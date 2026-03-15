export interface MidiNote {
  midi: number; // MIDIノート番号
  name: string; // "C4", "D#5" など
  startTime: number; // 秒
  duration: number; // 秒
  velocity: number; // 0-127
}

export interface MidiTrack {
  name: string;
  notes: MidiNote[];
  duration: number; // トラック全体の長さ（秒）
  bpm: number;
}
