"use client";

import { useState } from "react";
import { useRecordings } from "@/hooks/useRecordings";
import RecordingList from "@/components/RecordingList";
import ScoreChart from "@/components/ScoreChart";
import PitchCanvas from "@/components/PitchCanvas";
import type { Recording } from "@/lib/db/schema";

export default function HistoryPage() {
  const { recordings, loading, remove } = useRecordings();
  const [selected, setSelected] = useState<Recording | null>(null);

  const handleDelete = async (id: number) => {
    await remove(id);
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* スコア推移グラフ */}
      <div
        className="rounded-lg p-4 shrink-0"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <h2
          className="text-xs font-bold tracking-wider mb-3"
          style={{ color: "#555555", fontFamily: "monospace" }}
        >
          SCORE HISTORY
        </h2>
        <ScoreChart recordings={recordings} />
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* 録音一覧 */}
        <div
          className="w-[360px] shrink-0 rounded-lg p-3 overflow-y-auto"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <h2
            className="text-xs font-bold tracking-wider mb-3"
            style={{ color: "#555555", fontFamily: "monospace" }}
          >
            RECORDINGS
            <span className="ml-2" style={{ color: "#00e5ff" }}>
              {recordings.length}
            </span>
          </h2>
          {loading ? (
            <div
              className="text-center py-4 text-xs"
              style={{ color: "#555555", fontFamily: "monospace" }}
            >
              Loading...
            </div>
          ) : (
            <RecordingList
              recordings={recordings}
              onSelect={setSelected}
              onDelete={handleDelete}
              selectedId={selected?.id}
            />
          )}
        </div>

        {/* ピッチ履歴再生パネル */}
        <div
          className="flex-1 rounded-lg overflow-hidden min-h-0 flex flex-col"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          {selected ? (
            <>
              <div
                className="px-4 py-3 flex items-center gap-3 shrink-0"
                style={{
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <span
                  className="text-sm font-bold"
                  style={{ color: "#e0e0e0", fontFamily: "monospace" }}
                >
                  {selected.title}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "#555555", fontFamily: "monospace" }}
                >
                  Score: {selected.score}
                </span>
              </div>
              <div className="flex-1 min-h-0">
                <PitchCanvas pitchHistory={selected.pitchData} />
              </div>
            </>
          ) : (
            <div
              className="flex items-center justify-center h-full text-xs"
              style={{ color: "#555555", fontFamily: "monospace" }}
            >
              録音を選択するとピッチ履歴が表示されます
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
