"use client";

import { useEffect } from "react";
import { useCalibration, type CalibrationResult } from "@/hooks/useCalibration";

interface CalibrationModalProps {
  onComplete: (result: CalibrationResult) => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function CalibrationModal({
  onComplete,
  onSkip,
  onClose,
}: CalibrationModalProps) {
  const { phase, progress, result, start, cancel, error } = useCalibration();

  // マウント時に自動開始
  useEffect(() => {
    start();
    return () => cancel();
  }, [start, cancel]);

  // 完了時にコールバック
  useEffect(() => {
    if (phase === "done" && result) {
      const timer = setTimeout(() => {
        onComplete(result);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [phase, result, onComplete]);

  const progressPercent = Math.round(progress * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-xl p-6"
        style={{
          background: "linear-gradient(180deg, #16161e 0%, #101018 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-5">
          <h3
            className="text-sm font-bold tracking-wider"
            style={{ color: "#00e5ff" }}
          >
            MIC CALIBRATION
          </h3>
          <button
            onClick={() => {
              cancel();
              onClose();
            }}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{ color: "#555", background: "transparent", border: "none", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* 計測中 */}
        {phase === "measuring" && (
          <>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: "#777" }}>
              環境ノイズを計測中です。
              <br />
              静かにしてお待ちください...
            </p>

            {/* プログレスバー */}
            <div
              className="h-2 rounded-full overflow-hidden mb-3"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.04)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${progressPercent}%`,
                  background: "linear-gradient(90deg, #00e5ff, #00b8d4)",
                  boxShadow: "0 0 8px rgba(0, 229, 255, 0.3)",
                }}
              />
            </div>

            {/* レベルメーターアニメーション */}
            <div className="flex items-center justify-center gap-[3px] h-8 mb-4">
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-sm"
                  style={{
                    backgroundColor: "#00e5ff",
                    opacity: 0.4,
                    height: "4px",
                    animation: `calibration-bar 1.2s ease-in-out ${i * 0.06}s infinite alternate`,
                  }}
                />
              ))}
            </div>

            <p className="text-center text-xs" style={{ color: "#555" }}>
              {progressPercent}%
            </p>
          </>
        )}

        {/* 完了 */}
        {phase === "done" && result && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(0, 200, 120, 0.15)" }}
              >
                <span style={{ color: "#00c878", fontSize: "12px" }}>✓</span>
              </div>
              <p className="text-xs" style={{ color: "#00c878" }}>
                キャリブレーション完了
              </p>
            </div>

            <div
              className="rounded-lg p-3 mb-4"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.04)",
              }}
            >
              <div className="flex justify-between text-[11px] mb-1.5">
                <span style={{ color: "#555" }}>ノイズフロア</span>
                <span style={{ color: "#aaa" }}>
                  {result.noiseFloor.toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] mb-1.5">
                <span style={{ color: "#555" }}>設定閾値</span>
                <span style={{ color: "#00e5ff" }}>
                  {result.threshold.toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span style={{ color: "#555" }}>サンプル数</span>
                <span style={{ color: "#aaa" }}>
                  {result.sampleCount}
                </span>
              </div>
            </div>
          </>
        )}

        {/* エラー */}
        {phase === "error" && (
          <>
            <p className="text-xs mb-4" style={{ color: "#ff3d71" }}>
              {error}
            </p>
            <div className="flex gap-2">
              <button
                onClick={start}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wider cursor-pointer"
                style={{
                  backgroundColor: "rgba(0, 229, 255, 0.12)",
                  border: "1px solid rgba(0, 229, 255, 0.25)",
                  color: "#00e5ff",
                }}
              >
                RETRY
              </button>
              <button
                onClick={onSkip}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wider cursor-pointer"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#555",
                }}
              >
                SKIP
              </button>
            </div>
          </>
        )}

        {/* アイドル（初回表示用。通常は自動開始なので表示されない） */}
        {phase === "idle" && (
          <div className="flex gap-2">
            <button
              onClick={start}
              className="flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wider cursor-pointer"
              style={{
                backgroundColor: "rgba(0, 229, 255, 0.12)",
                border: "1px solid rgba(0, 229, 255, 0.25)",
                color: "#00e5ff",
              }}
            >
              START CALIBRATION
            </button>
            <button
              onClick={onSkip}
              className="flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wider cursor-pointer"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#555",
              }}
            >
              SKIP
            </button>
          </div>
        )}

        {/* スキップリンク（計測中のみ） */}
        {phase === "measuring" && (
          <button
            onClick={() => {
              cancel();
              onSkip();
            }}
            className="w-full mt-3 text-center text-[10px] cursor-pointer"
            style={{ color: "#444", background: "transparent", border: "none" }}
          >
            スキップしてデフォルト値を使用
          </button>
        )}

        <style>{`
          @keyframes calibration-bar {
            0% { height: 4px; opacity: 0.3; }
            50% { height: 20px; opacity: 0.6; }
            100% { height: 4px; opacity: 0.3; }
          }
        `}</style>
      </div>
    </div>
  );
}
