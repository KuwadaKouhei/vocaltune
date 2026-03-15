"use client";

import type { Recording } from "@/lib/db/schema";

interface RecordingListProps {
  recordings: Recording[];
  onSelect: (recording: Recording) => void;
  onDelete: (id: number) => void;
  selectedId?: number;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "#00e5ff";
  if (score >= 70) return "#ffc400";
  return "#ff3d71";
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RecordingList({
  recordings,
  onSelect,
  onDelete,
  selectedId,
}: RecordingListProps) {
  if (recordings.length === 0) {
    return (
      <div
        className="text-center py-8 text-xs"
        style={{ color: "#555555", fontFamily: "monospace" }}
      >
        まだ録音がありません
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {recordings.map((rec) => (
        <div
          key={rec.id}
          className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors"
          style={{
            backgroundColor:
              selectedId === rec.id
                ? "rgba(0, 229, 255, 0.06)"
                : "transparent",
            border:
              selectedId === rec.id
                ? "1px solid rgba(0, 229, 255, 0.15)"
                : "1px solid transparent",
            fontFamily: "monospace",
          }}
          onClick={() => onSelect(rec)}
        >
          {/* スコア */}
          <span
            className="text-lg font-bold w-10 text-right shrink-0"
            style={{ color: getScoreColor(rec.score) }}
          >
            {rec.score}
          </span>

          {/* タイトル + メタ */}
          <div className="flex flex-col flex-1 min-w-0">
            <span
              className="text-xs truncate"
              style={{ color: "#e0e0e0" }}
            >
              {rec.title}
            </span>
            <span className="text-xs" style={{ color: "#555555" }}>
              {formatDate(rec.createdAt)} · {formatDuration(rec.duration)}
              {rec.midiFileName && ` · ${rec.midiFileName}`}
            </span>
          </div>

          {/* 削除ボタン */}
          <button
            className="text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity shrink-0"
            style={{
              color: "#ff3d71",
              backgroundColor: "rgba(255, 61, 113, 0.1)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (rec.id !== undefined) onDelete(rec.id);
            }}
          >
            Del
          </button>
        </div>
      ))}
    </div>
  );
}
