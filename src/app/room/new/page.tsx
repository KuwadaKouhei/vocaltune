"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket, disconnectSocket } from "@/lib/collab/socket";

export default function NewRoomPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.on("connect", () => {
      socket.emit("room:create", (roomId: string) => {
        // ソケットを切断（/room/[roomId]ページで再接続する）
        disconnectSocket();
        router.replace(`/room/${roomId}`);
      });
    });

    socket.on("connect_error", () => {
      setError("サーバーに接続できません。Collabサーバーが起動しているか確認してください。");
    });

    socket.connect();

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      disconnectSocket();
    };
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div
        className="text-center p-8 rounded-lg"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          fontFamily: "monospace",
        }}
      >
        {error ? (
          <div>
            <p className="text-sm mb-4" style={{ color: "#ff3d71" }}>{error}</p>
            <p className="text-xs" style={{ color: "#555555" }}>
              npm run dev:collab で両方のサーバーを起動してください
            </p>
          </div>
        ) : (
          <div>
            <div
              className="inline-block w-6 h-6 border-2 rounded-full animate-spin mb-3"
              style={{
                borderColor: "rgba(0, 229, 255, 0.2)",
                borderTopColor: "#00e5ff",
              }}
            />
            <p className="text-sm" style={{ color: "#888888" }}>
              ルームを作成中...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
