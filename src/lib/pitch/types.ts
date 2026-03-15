export interface PitchResult {
  frequency: number; // Hz
  confidence: number; // 0-1
}

export interface NoteInfo {
  noteName: string; // "C", "C#", "D", ...
  octave: number; // 3, 4, 5, ...
  cents: number; // -50 ~ +50
  midi: number; // MIDIノート番号
  frequency: number; // Hz
}
