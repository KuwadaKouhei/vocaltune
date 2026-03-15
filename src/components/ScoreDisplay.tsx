"use client";

import type { SessionScore } from "@/lib/scoring/engine";

interface ScoreDisplayProps {
  score: SessionScore | null;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "#00e5ff";
  if (score >= 70) return "#ffc400";
  return "#ff3d71";
}

export default function ScoreDisplay({ score }: ScoreDisplayProps) {
  if (!score) return null;

  const color = getScoreColor(score.totalScore);

  return (
    <div
      className="flex flex-col gap-3 rounded-lg p-4"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      {/* 総合スコア */}
      <div className="flex items-baseline gap-2">
        <span
          className="text-3xl font-bold"
          style={{ color, fontFamily: "monospace" }}
        >
          {score.totalScore}
        </span>
        <span
          className="text-sm"
          style={{ color: "#555555", fontFamily: "monospace" }}
        >
          / 100
        </span>
      </div>

      {/* 統計 */}
      <div
        className="flex gap-4 text-xs"
        style={{ fontFamily: "monospace" }}
      >
        <div>
          <span style={{ color: "#555555" }}>Perfect: </span>
          <span style={{ color: "#00e5ff" }}>
            {score.perfectNotes}/{score.totalNotes}
          </span>
        </div>
      </div>

      {/* ノートごとのスコアバー */}
      {score.noteScores.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          <span
            className="text-xs mb-1"
            style={{ color: "#555555", fontFamily: "monospace" }}
          >
            Note Accuracy
          </span>
          <div className="flex gap-[2px] items-end h-8">
            {score.noteScores.map((ns) => {
              const barColor = getScoreColor(ns.accuracy);
              return (
                <div
                  key={ns.noteIndex}
                  className="flex-1 min-w-[3px] rounded-sm"
                  style={{
                    height: `${Math.max(ns.accuracy, 2)}%`,
                    backgroundColor: barColor,
                    opacity: 0.7,
                  }}
                  title={`Note ${ns.noteIndex + 1}: ${Math.round(ns.accuracy)}% (avg ${ns.avgCentsDiff}¢)`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
