import type { MidiNote } from "@/lib/midi/types";
import { midiToFreq } from "@/lib/pitch/notes";
import { detectVibrato, type VibratoInfo } from "@/lib/pitch/vibrato";

export interface NoteScore {
  noteIndex: number;
  midi: number;
  accuracy: number; // 0-100
  avgCentsDiff: number;
  maxCentsDiff: number;
  vibrato?: { rate: number; extent: number };
}

export interface SessionScore {
  totalScore: number; // 0-100
  noteScores: NoteScore[];
  perfectNotes: number; // accuracy >= 90 のノート数
  totalNotes: number;
}

export interface TimestampedPitch {
  time: number; // 秒（セッション開始からの経過時間）
  frequency: number | null;
}

/**
 * 2つの周波数間のセント差を計算
 */
function centsDiff(freqA: number, freqB: number): number {
  return Math.abs(1200 * Math.log2(freqA / freqB));
}

/**
 * MIDIノートとピッチ検出結果を比較して採点
 *
 * 各MIDIノートの発音区間について:
 * 1. 対応する時間帯のピッチ検出結果を取得
 * 2. 各フレームのセント差を計算
 * 3. ノートごとの正確度 = max(0, 100 - 平均セント差 * 2)
 * 4. 総合スコア = 全ノート正確度の加重平均（duration で重み付け）
 */
export function calculateScore(
  midiNotes: MidiNote[],
  pitchData: TimestampedPitch[]
): SessionScore {
  if (midiNotes.length === 0 || pitchData.length === 0) {
    return { totalScore: 0, noteScores: [], perfectNotes: 0, totalNotes: 0 };
  }

  const noteScores: NoteScore[] = [];
  let weightedSum = 0;
  let totalDuration = 0;

  for (let i = 0; i < midiNotes.length; i++) {
    const note = midiNotes[i];
    const noteEndTime = note.startTime + note.duration;
    const targetFreq = midiToFreq(note.midi);

    // この区間に該当するピッチデータを抽出
    const matchingPitches = pitchData.filter(
      (p) =>
        p.time >= note.startTime &&
        p.time <= noteEndTime &&
        p.frequency !== null
    );

    if (matchingPitches.length === 0) {
      noteScores.push({
        noteIndex: i,
        midi: note.midi,
        accuracy: 0,
        avgCentsDiff: 100,
        maxCentsDiff: 100,
      });
      totalDuration += note.duration;
      continue;
    }

    // ビブラート検出
    const nonNullPitches = matchingPitches
      .filter((p): p is { time: number; frequency: number } => p.frequency !== null);
    const vibratoResult = nonNullPitches.length >= 6
      ? detectVibrato(nonNullPitches)
      : null;

    // セント差を計算（ビブラート時は中心周波数との差を使用）
    const compareFreq = vibratoResult?.isVibrato
      ? vibratoResult.centerFrequency
      : null;

    const centsDiffs = matchingPitches.map((p) => {
      if (vibratoResult?.isVibrato && compareFreq) {
        // ビブラート区間: 中心周波数とターゲットの差で評価（振幅をペナルティにしない）
        return centsDiff(compareFreq, targetFreq);
      }
      return centsDiff(p.frequency!, targetFreq);
    });

    const avgCents =
      centsDiffs.reduce((sum, c) => sum + c, 0) / centsDiffs.length;
    const maxCents = Math.max(...centsDiffs);
    const accuracy = Math.max(0, 100 - avgCents * 2);

    const noteScore: NoteScore = {
      noteIndex: i,
      midi: note.midi,
      accuracy,
      avgCentsDiff: Math.round(avgCents * 10) / 10,
      maxCentsDiff: Math.round(maxCents * 10) / 10,
    };

    if (vibratoResult?.isVibrato) {
      noteScore.vibrato = {
        rate: vibratoResult.rate,
        extent: vibratoResult.extent,
      };
    }

    noteScores.push(noteScore);

    weightedSum += accuracy * note.duration;
    totalDuration += note.duration;
  }

  const totalScore =
    totalDuration > 0 ? Math.round(weightedSum / totalDuration) : 0;
  const perfectNotes = noteScores.filter((s) => s.accuracy >= 90).length;

  return {
    totalScore,
    noteScores,
    perfectNotes,
    totalNotes: midiNotes.length,
  };
}
