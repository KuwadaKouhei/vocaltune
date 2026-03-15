"use client";

import dynamic from "next/dynamic";
import { usePitchDetection } from "@/hooks/usePitchDetection";
import NoteDisplay from "@/components/NoteDisplay";

// Three.jsはSSR不可なのでdynamic importでクライアントのみ読み込み
const Visualizer3D = dynamic(() => import("@/components/Visualizer3D"), {
  ssr: false,
});

export default function VisualizerPage() {
  const {
    isListening,
    currentNote,
    pitchHistory,
    startListening,
    stopListening,
    error,
  } = usePitchDetection();

  return (
    <div className="flex flex-col h-full gap-4">
      {error && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            backgroundColor: "rgba(255, 61, 113, 0.1)",
            border: "1px solid rgba(255, 61, 113, 0.2)",
            color: "#ff3d71",
            fontFamily: "monospace",
          }}
        >
          {error}
        </div>
      )}

      <div className="flex flex-1 gap-4 min-h-0">
        {/* 左パネル: 音名 + コントロール */}
        <div
          className="flex flex-col items-center justify-between w-[200px] shrink-0 rounded-lg p-4"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <NoteDisplay note={currentNote} />

          <div className="flex flex-col gap-2 w-full mt-auto">
            {/* 操作ヒント */}
            <div
              className="text-center text-xs leading-relaxed"
              style={{ color: "#555555", fontFamily: "monospace" }}
            >
              {isListening
                ? "Drag to rotate"
                : "Scroll to zoom"}
            </div>

            <button
              onClick={isListening ? stopListening : startListening}
              className="w-full py-3 rounded-lg text-sm font-bold tracking-wider transition-colors"
              style={{
                fontFamily: "monospace",
                backgroundColor: isListening
                  ? "rgba(255, 61, 113, 0.15)"
                  : "rgba(0, 229, 255, 0.15)",
                border: `1px solid ${isListening ? "rgba(255, 61, 113, 0.3)" : "rgba(0, 229, 255, 0.3)"}`,
                color: isListening ? "#ff3d71" : "#00e5ff",
              }}
            >
              {isListening ? "■ STOP" : "● START"}
            </button>
          </div>
        </div>

        {/* 右パネル: 3Dビジュアライザー */}
        <div
          className="flex-1 rounded-lg overflow-hidden min-h-0"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <Visualizer3D
            pitchHistory={pitchHistory}
            currentNote={currentNote}
            isListening={isListening}
          />
        </div>
      </div>
    </div>
  );
}
