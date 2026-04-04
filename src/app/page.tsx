"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoin = () => {
    const id = joinId.trim();
    if (!id) {
      setJoinError("ルームIDを入力してください");
      return;
    }
    router.push(`/room/${id}`);
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-lg mx-4">
        {/* タイトル */}
        <div className="text-center mb-10">
          <h1
            className="text-3xl font-bold tracking-widest mb-2"
            style={{ color: "#00e5ff", fontFamily: "monospace" }}
          >
            VocalTune
          </h1>
          <p
            className="text-sm"
            style={{ color: "#555555", fontFamily: "monospace" }}
          >
            Vocal Pitch Trainer for DTM Creators
          </p>
        </div>

        {/* モード選択カード */}
        <div className="flex flex-col gap-4">
          {/* ソロモード */}
          <Link
            href="/solo"
            className="block"
            style={{ textDecoration: "none" }}
          >
            <div
              className="rounded-xl p-6 transition-all"
              style={{
                backgroundColor: "rgba(0, 229, 255, 0.04)",
                border: "1px solid rgba(0, 229, 255, 0.12)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(0, 229, 255, 0.08)";
                e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(0, 229, 255, 0.04)";
                e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.12)";
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "rgba(0, 229, 255, 0.1)" }}
                >
                  <span className="text-2xl" style={{ color: "#00e5ff" }}>
                    1
                  </span>
                </div>
                <div>
                  <h2
                    className="text-base font-bold mb-1"
                    style={{ color: "#00e5ff", fontFamily: "monospace" }}
                  >
                    Solo Mode
                  </h2>
                  <p
                    className="text-xs"
                    style={{ color: "#666666", fontFamily: "monospace" }}
                  >
                    1人でピッチ練習。MIDI読み込み・採点・履歴保存に対応。
                  </p>
                </div>
              </div>
            </div>
          </Link>

          {/* コープモード */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: "rgba(255, 110, 199, 0.04)",
              border: "1px solid rgba(255, 110, 199, 0.12)",
            }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(255, 110, 199, 0.1)" }}
              >
                <span className="text-2xl" style={{ color: "#ff6ec7" }}>
                  2
                </span>
              </div>
              <div>
                <h2
                  className="text-base font-bold mb-1"
                  style={{ color: "#ff6ec7", fontFamily: "monospace" }}
                >
                  Co-op Mode
                </h2>
                <p
                  className="text-xs"
                  style={{ color: "#666666", fontFamily: "monospace" }}
                >
                  2人でリアルタイム共同編集。ターゲットカーブ・設定を同期。
                </p>
              </div>
            </div>

            {/* ルーム作成 / 参加 */}
            <div className="flex gap-2 ml-16">
              <Link
                href="/room/new"
                className="flex-1 py-2.5 rounded-lg text-xs font-bold text-center transition-colors"
                style={{
                  fontFamily: "monospace",
                  backgroundColor: "rgba(255, 110, 199, 0.12)",
                  border: "1px solid rgba(255, 110, 199, 0.25)",
                  color: "#ff6ec7",
                  textDecoration: "none",
                }}
              >
                Create Room
              </Link>
              <div className="flex-1 flex gap-1">
                <input
                  type="text"
                  value={joinId}
                  onChange={(e) => {
                    setJoinId(e.target.value);
                    setJoinError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  placeholder="Room ID"
                  className="flex-1 px-3 py-2 rounded-lg text-xs"
                  style={{
                    fontFamily: "monospace",
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    border: `1px solid ${joinError ? "rgba(255, 61, 113, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                    color: "#ffffff",
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleJoin}
                  className="px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                  style={{
                    fontFamily: "monospace",
                    backgroundColor: "rgba(255, 110, 199, 0.12)",
                    border: "1px solid rgba(255, 110, 199, 0.25)",
                    color: "#ff6ec7",
                  }}
                >
                  Join
                </button>
              </div>
            </div>
            {joinError && (
              <p
                className="text-xs mt-2 ml-16"
                style={{ color: "#ff3d71", fontFamily: "monospace" }}
              >
                {joinError}
              </p>
            )}
          </div>
        </div>

        {/* フッタリンク */}
        <div
          className="flex justify-center gap-6 mt-8"
          style={{ fontFamily: "monospace" }}
        >
          <Link
            href="/visualizer"
            className="text-xs"
            style={{ color: "#444444", textDecoration: "none" }}
          >
            3D Visualizer
          </Link>
          <Link
            href="/history"
            className="text-xs"
            style={{ color: "#444444", textDecoration: "none" }}
          >
            History
          </Link>
        </div>
      </div>
    </div>
  );
}
