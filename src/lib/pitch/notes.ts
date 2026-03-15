import type { NoteInfo } from "./types";

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

/**
 * 周波数からNoteInfo（音名・オクターブ・セント偏差・MIDIノート番号）を算出
 */
export function freqToNote(freq: number): NoteInfo {
  const semitone = 12 * Math.log2(freq / 440);
  const midi = Math.round(semitone) + 69;
  const cents = Math.round((semitone - Math.round(semitone)) * 100);
  return {
    noteName: NOTE_NAMES[midi % 12],
    octave: Math.floor(midi / 12) - 1,
    cents,
    midi,
    frequency: freq,
  };
}

/**
 * MIDIノート番号から周波数(Hz)を算出
 */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
