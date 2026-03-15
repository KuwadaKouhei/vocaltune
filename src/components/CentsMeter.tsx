"use client";

interface CentsMeterProps {
  cents: number; // -50 ~ +50
}

function getCentsColor(cents: number): string {
  const absCents = Math.abs(cents);
  if (absCents < 10) return "#00e5ff"; // ACCURATE
  if (absCents < 25) return "#ffc400"; // CLOSE
  return "#ff3d71"; // OFF PITCH
}

function getCentsLabel(cents: number): string {
  const absCents = Math.abs(cents);
  if (absCents < 10) return "ACCURATE";
  if (absCents < 25) return "CLOSE";
  return "OFF PITCH";
}

export default function CentsMeter({ cents }: CentsMeterProps) {
  const color = getCentsColor(cents);
  const label = getCentsLabel(cents);
  // ゲージ位置: -50 → 0%, 0 → 50%, +50 → 100%
  const position = ((cents + 50) / 100) * 100;

  return (
    <svg viewBox="0 0 200 60" className="w-full max-w-[200px]">
      {/* 背景トラック */}
      <rect x="10" y="20" width="180" height="4" rx="2" fill="rgba(255,255,255,0.08)" />

      {/* センターマーク */}
      <line x1="100" y1="14" x2="100" y2="30" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

      {/* 目盛り */}
      <line x1="55" y1="18" x2="55" y2="26" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      <line x1="145" y1="18" x2="145" y2="26" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

      {/* インジケーター */}
      <circle
        cx={10 + (position / 100) * 180}
        cy="22"
        r="6"
        fill={color}
      />

      {/* グロー */}
      <circle
        cx={10 + (position / 100) * 180}
        cy="22"
        r="10"
        fill={color}
        opacity="0.2"
      />

      {/* セント値テキスト */}
      <text
        x="100"
        y="48"
        textAnchor="middle"
        fill={color}
        fontSize="11"
        fontFamily="monospace"
      >
        {cents > 0 ? "+" : ""}{cents}¢ · {label}
      </text>
    </svg>
  );
}
