"use client";

import type { NoteInfo } from "@/lib/pitch/types";
import CentsMeter from "./CentsMeter";

interface NoteDisplayProps {
  note: NoteInfo | null;
}

export default function NoteDisplay({ note }: NoteDisplayProps) {
  if (!note) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="text-4xl font-bold tracking-wider" style={{ color: "#555555", fontFamily: "monospace" }}>
          ---
        </div>
        <div className="text-sm" style={{ color: "#555555", fontFamily: "monospace" }}>
          --- Hz
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {/* 音名 + オクターブ */}
      <div className="text-4xl font-bold tracking-wider" style={{ color: "#e0e0e0", fontFamily: "monospace" }}>
        {note.noteName}
        <span className="text-2xl" style={{ color: "#555555" }}>{note.octave}</span>
      </div>

      {/* 周波数 */}
      <div className="text-sm" style={{ color: "#555555", fontFamily: "monospace" }}>
        {note.frequency.toFixed(1)} Hz
      </div>

      {/* セントメーター */}
      <CentsMeter cents={note.cents} />
    </div>
  );
}
