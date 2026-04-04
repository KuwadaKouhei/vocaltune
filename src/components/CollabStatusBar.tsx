"use client";

import { useState, useCallback } from "react";

interface CollabStatusBarProps {
  roomId: string;
  isConnected: boolean;
  userCount: number;
  error: string | null;
}

export default function CollabStatusBar({
  roomId,
  isConnected,
  userCount,
  error,
}: CollabStatusBarProps) {
  const [copied, setCopied] = useState(false);

  const copyInviteLink = useCallback(() => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomId]);

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs"
      style={{
        fontFamily: "monospace",
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        border: `1px solid ${error ? "rgba(255, 61, 113, 0.2)" : "rgba(255, 255, 255, 0.06)"}`,
      }}
    >
      {/* 接続状態 */}
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{
          backgroundColor: isConnected ? "#00e5ff" : "#ff3d71",
        }}
      />
      <span style={{ color: isConnected ? "#00e5ff" : "#ff3d71" }}>
        {isConnected ? "Connected" : "Disconnected"}
      </span>

      {/* ルームID */}
      <span style={{ color: "#555555" }}>|</span>
      <span style={{ color: "#888888" }}>Room: {roomId}</span>

      {/* ユーザー数 */}
      <span style={{ color: "#555555" }}>|</span>
      <span style={{ color: "#888888" }}>{userCount} user{userCount !== 1 ? "s" : ""}</span>

      {/* 招待リンクコピー */}
      <button
        onClick={copyInviteLink}
        className="ml-auto px-3 py-1 rounded transition-colors"
        style={{
          backgroundColor: copied
            ? "rgba(0, 229, 255, 0.15)"
            : "rgba(0, 229, 255, 0.08)",
          border: "1px solid rgba(0, 229, 255, 0.2)",
          color: "#00e5ff",
        }}
      >
        {copied ? "Copied!" : "Copy Invite Link"}
      </button>

      {/* エラー */}
      {error && (
        <span style={{ color: "#ff3d71" }}>{error}</span>
      )}
    </div>
  );
}
