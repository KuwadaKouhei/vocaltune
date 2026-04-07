"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Animated waveform background canvas ─── */
function WaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    timeRef.current += 0.008;
    const t = timeRef.current;

    ctx.clearRect(0, 0, w, h);

    // 複数の正弦波を描画
    const waves = [
      { amp: 18, freq: 0.008, speed: 1, y: h * 0.35, color: "rgba(0,229,255,0.06)" },
      { amp: 12, freq: 0.012, speed: 1.4, y: h * 0.35, color: "rgba(0,229,255,0.04)" },
      { amp: 22, freq: 0.006, speed: 0.7, y: h * 0.65, color: "rgba(255,110,199,0.05)" },
      { amp: 10, freq: 0.015, speed: 1.8, y: h * 0.65, color: "rgba(255,110,199,0.03)" },
    ];

    for (const wave of waves) {
      ctx.beginPath();
      ctx.moveTo(0, wave.y);
      for (let x = 0; x <= w; x += 2) {
        const y =
          wave.y +
          Math.sin(x * wave.freq + t * wave.speed) * wave.amp +
          Math.sin(x * wave.freq * 2.3 + t * wave.speed * 0.7) * (wave.amp * 0.4);
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

/* ─── Animated VU meter bars ─── */
const VU_HEIGHTS = [65, 85, 50, 95, 72];

function VuBars({ color, count = 5 }: { color: string; count?: number }) {
  return (
    <div className="flex items-end gap-[3px] h-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-sm"
          style={{
            backgroundColor: color,
            opacity: 0.5,
            height: `${VU_HEIGHTS[i % VU_HEIGHTS.length]}%`,
            animation: `vu-bounce 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Screw decorations ─── */
function Screw() {
  return (
    <div
      className="w-2 h-2 rounded-full shrink-0"
      style={{
        background: "radial-gradient(circle at 35% 35%, #2a2a30, #16161a)",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6), 0 0.5px 0 rgba(255,255,255,0.05)",
      }}
    />
  );
}

/* ─── Signal line decoration ─── */
function SignalLine({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center py-1">
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}`,
            animation: "signal-pulse 2s ease-in-out infinite",
          }}
        />
        <div
          className="h-px w-16"
          style={{
            background: `linear-gradient(90deg, ${color}, transparent)`,
          }}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleJoin = () => {
    const id = joinId.trim();
    if (!id) {
      setJoinError("ルームIDを入力してください");
      return;
    }
    router.push(`/room/${id}`);
  };

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes vu-bounce {
          0% { transform: scaleY(0.5); }
          100% { transform: scaleY(1); }
        }
        @keyframes signal-pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-breathe {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .rack-unit {
          background: linear-gradient(180deg, rgba(22,22,28,0.95) 0%, rgba(16,16,22,0.98) 100%);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.03) inset,
            0 -1px 0 rgba(0,0,0,0.4) inset,
            0 8px 32px rgba(0,0,0,0.4);
        }
        .rack-unit:hover {
          border-color: rgba(255,255,255,0.1);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.05) inset,
            0 -1px 0 rgba(0,0,0,0.4) inset,
            0 12px 40px rgba(0,0,0,0.5);
        }
        .btn-rack {
          background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 2px 4px rgba(0,0,0,0.3);
          transition: all 0.15s ease;
        }
        .btn-rack:hover {
          background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%);
          border-color: rgba(255,255,255,0.14);
          box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 4px 8px rgba(0,0,0,0.3);
          transform: translateY(-1px);
        }
        .btn-rack:active {
          transform: translateY(0px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.02) inset, 0 1px 2px rgba(0,0,0,0.3);
        }
        .input-rack {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 2px 4px rgba(0,0,0,0.3) inset;
          transition: all 0.2s ease;
        }
        .input-rack:focus {
          border-color: rgba(255,110,199,0.3);
          box-shadow: 0 2px 4px rgba(0,0,0,0.3) inset, 0 0 0 1px rgba(255,110,199,0.1);
        }
        .link-subtle {
          position: relative;
          transition: color 0.2s ease;
        }
        .link-subtle::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 1px;
          background: currentColor;
          transition: width 0.3s ease;
        }
        .link-subtle:hover::after {
          width: 100%;
        }
      `}</style>

      <WaveCanvas />

      <div className="relative z-10 flex items-center justify-center h-full">
        <div
          className="w-full max-w-xl mx-5"
          style={{
            animation: mounted ? "fade-up 0.6s ease-out both" : "none",
          }}
        >
          {/* ─── Header / Brand ─── */}
          <div className="text-center mb-14">
            {/* ロゴマーク */}
            <div className="inline-flex items-center justify-center mb-5">
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #0a0a12 0%, #12121a 100%)",
                    border: "1px solid rgba(0,229,255,0.15)",
                    boxShadow:
                      "0 0 40px rgba(0,229,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path
                      d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
                      stroke="url(#mic-grad)"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M19 10v2a7 7 0 0 1-14 0v-2"
                      stroke="url(#mic-grad)"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="12" x2="12" y1="19" y2="22"
                      stroke="url(#mic-grad)"
                      strokeWidth="1.5"
                    />
                    <defs>
                      <linearGradient id="mic-grad" x1="5" y1="2" x2="19" y2="22">
                        <stop offset="0%" stopColor="#00e5ff" />
                        <stop offset="100%" stopColor="#ff6ec7" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                {/* グローリング */}
                <div
                  className="absolute -inset-1 rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(0,229,255,0.12), rgba(255,110,199,0.08))",
                    filter: "blur(8px)",
                    zIndex: -1,
                    animation: "glow-breathe 4s ease-in-out infinite",
                  }}
                />
              </div>
            </div>

            <h1
              className="text-[2.5rem] font-bold tracking-[0.25em] mb-3 leading-none"
              style={{
                color: "#e8e8ea",
                textShadow: "0 0 60px rgba(0,229,255,0.1)",
              }}
            >
              VOCAL
              <span style={{ color: "#00e5ff" }}>TUNE</span>
            </h1>
            <p
              className="text-[11px] uppercase tracking-[0.4em]"
              style={{ color: "#4a4a52" }}
            >
              Pitch Trainer for DTM Creators
            </p>
          </div>

          {/* ─── Solo Mode — Rack Unit ─── */}
          <div
            style={{ animationDelay: "0.1s", animation: mounted ? "fade-up 0.6s ease-out both" : "none" }}
          >
            <Link href="/solo" className="block no-underline group">
              <div className="rack-unit rounded-xl p-5 transition-all duration-300 cursor-pointer">
                {/* ラックヘッダー */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Screw />
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.3em]"
                      style={{ color: "#4a4a52" }}
                    >
                      CH-01
                    </span>
                    <div
                      className="h-px flex-1 min-w-[40px]"
                      style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <VuBars color="#00e5ff" />
                    <Screw />
                  </div>
                </div>

                {/* メインコンテンツ */}
                <div className="flex items-center gap-5">
                  {/* LEDインジケーター */}
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300"
                    style={{
                      background: "rgba(0,229,255,0.06)",
                      border: "1px solid rgba(0,229,255,0.12)",
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: "#00e5ff",
                        boxShadow: "0 0 10px rgba(0,229,255,0.5), 0 0 20px rgba(0,229,255,0.2)",
                        animation: "glow-breathe 3s ease-in-out infinite",
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2
                      className="text-base font-bold tracking-wider mb-1"
                      style={{ color: "#00e5ff" }}
                    >
                      SOLO MODE
                    </h2>
                    <p
                      className="text-[11px] leading-relaxed"
                      style={{ color: "#5a5a62" }}
                    >
                      1人でピッチ練習。MIDI読み込み・採点・履歴保存に対応
                    </p>
                  </div>

                  {/* Arrow */}
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-all duration-300 group-hover:translate-x-0.5"
                    style={{
                      background: "rgba(0,229,255,0.04)",
                      border: "1px solid rgba(0,229,255,0.08)",
                    }}
                  >
                    <svg
                      width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="#00e5ff" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                      className="transition-transform duration-300 group-hover:translate-x-0.5"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* ─── Signal Line ─── */}
          <SignalLine color="#00e5ff" />

          {/* ─── Co-op Mode — Rack Unit ─── */}
          <div
            style={{ animationDelay: "0.2s", animation: mounted ? "fade-up 0.6s ease-out both" : "none" }}
          >
            <div className="rack-unit rounded-xl p-5 transition-all duration-300">
              {/* ラックヘッダー */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Screw />
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.3em]"
                    style={{ color: "#4a4a52" }}
                  >
                    CH-02
                  </span>
                  <div
                    className="h-px flex-1 min-w-[40px]"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{
                      color: "#ff6ec7",
                      backgroundColor: "rgba(255,110,199,0.08)",
                      border: "1px solid rgba(255,110,199,0.12)",
                    }}
                  >
                    Beta
                  </span>
                  <Screw />
                </div>
              </div>

              {/* メインコンテンツ */}
              <div className="flex items-start gap-5 mb-5">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(255,110,199,0.06)",
                    border: "1px solid rgba(255,110,199,0.12)",
                  }}
                >
                  <div className="flex gap-[3px]">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: "#ff6ec7",
                        boxShadow: "0 0 8px rgba(255,110,199,0.4)",
                        animation: "glow-breathe 3s ease-in-out 0.3s infinite",
                      }}
                    />
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: "#ff6ec7",
                        boxShadow: "0 0 8px rgba(255,110,199,0.4)",
                        animation: "glow-breathe 3s ease-in-out 0.6s infinite",
                      }}
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h2
                    className="text-base font-bold tracking-wider mb-1"
                    style={{ color: "#ff6ec7" }}
                  >
                    CO-OP MODE
                  </h2>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "#5a5a62" }}
                  >
                    2人でリアルタイム共同編集。ターゲットカーブ・設定を同期
                  </p>
                </div>
              </div>

              {/* ルーム操作パネル */}
              <div
                className="rounded-lg p-3"
                style={{
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.03)",
                }}
              >
                <div className="flex gap-2">
                  <Link
                    href="/room/new"
                    className="btn-rack flex-1 py-2.5 rounded-md text-[11px] font-bold text-center no-underline tracking-wide"
                    style={{ color: "#ff6ec7" }}
                  >
                    + Create Room
                  </Link>

                  <div
                    className="w-px"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                  />

                  <div className="flex-1 flex gap-1.5">
                    <input
                      type="text"
                      value={joinId}
                      onChange={(e) => {
                        setJoinId(e.target.value);
                        setJoinError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                      placeholder="Room ID"
                      className={`input-rack flex-1 px-3 py-2 rounded-md text-[11px] outline-none ${
                        joinError ? "!border-[rgba(255,61,113,0.3)]" : ""
                      }`}
                      style={{ color: "#c0c0c4" }}
                    />
                    <button
                      onClick={handleJoin}
                      className="btn-rack px-4 py-2 rounded-md text-[11px] font-bold tracking-wide cursor-pointer"
                      style={{ color: "#ff6ec7" }}
                    >
                      Join
                    </button>
                  </div>
                </div>
                {joinError && (
                  <p
                    className="text-[10px] mt-2 pl-1"
                    style={{ color: "#ff3d71" }}
                  >
                    {joinError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ─── Signal Line ─── */}
          <SignalLine color="#ff6ec7" />

          {/* ─── Footer navigation ─── */}
          <div
            className="flex items-center justify-center gap-8 mb-2"
            style={{ animationDelay: "0.3s", animation: mounted ? "fade-up 0.6s ease-out both" : "none" }}
          >
            <Link
              href="/visualizer"
              className="link-subtle text-[11px] no-underline tracking-wider"
              style={{ color: "#3a3a42" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#00e5ff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#3a3a42")}
            >
              3D VISUALIZER
            </Link>
            <div
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            />
            <Link
              href="/history"
              className="link-subtle text-[11px] no-underline tracking-wider"
              style={{ color: "#3a3a42" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#00e5ff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#3a3a42")}
            >
              HISTORY
            </Link>
          </div>

          <p
            className="text-center text-[9px] tracking-[0.3em] uppercase"
            style={{ color: "#2a2a30" }}
          >
            v0.1.0 · Phase 1
          </p>
        </div>
      </div>
    </>
  );
}
