"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Recording } from "@/lib/db/schema";

interface ScoreChartProps {
  recordings: Recording[];
}

type PeriodFilter = "7d" | "30d" | "all";

function filterByPeriod(
  recordings: Recording[],
  period: PeriodFilter
): Recording[] {
  if (period === "all") return recordings;
  const now = Date.now();
  const ms = period === "7d" ? 7 * 86400000 : 30 * 86400000;
  return recordings.filter(
    (r) => now - new Date(r.createdAt).getTime() < ms
  );
}

export default function ScoreChart({ recordings }: ScoreChartProps) {
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [titleFilter, setTitleFilter] = useState<string>("");

  // ユニークなタイトル一覧
  const titles = useMemo(() => {
    const set = new Set(recordings.map((r) => r.title));
    return Array.from(set).sort();
  }, [recordings]);

  // フィルタ適用 + 時系列ソート（古い順）
  const chartData = useMemo(() => {
    let filtered = filterByPeriod(recordings, period);
    if (titleFilter) {
      filtered = filtered.filter((r) => r.title === titleFilter);
    }
    // 時系列順（古い→新しい）
    return [...filtered]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      .map((r) => ({
        date: formatChartDate(new Date(r.createdAt)),
        score: r.score,
        title: r.title,
      }));
  }, [recordings, period, titleFilter]);

  if (recordings.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* フィルターコントロール */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 期間切り替え */}
        <div className="flex gap-1">
          {(["7d", "30d", "all"] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{
                fontFamily: "monospace",
                color: period === p ? "#00e5ff" : "#555555",
                backgroundColor:
                  period === p
                    ? "rgba(0, 229, 255, 0.1)"
                    : "rgba(255, 255, 255, 0.04)",
              }}
            >
              {p === "7d" ? "7日" : p === "30d" ? "30日" : "全期間"}
            </button>
          ))}
        </div>

        {/* 曲名フィルタ */}
        {titles.length > 1 && (
          <select
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
            className="text-xs px-2 py-1 rounded border-none outline-none"
            style={{
              fontFamily: "monospace",
              color: "#e0e0e0",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            <option value="">すべての曲</option>
            {titles.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* グラフ */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#555555", fontSize: 10, fontFamily: "monospace" }}
              stroke="rgba(255,255,255,0.06)"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#555555", fontSize: 10, fontFamily: "monospace" }}
              stroke="rgba(255,255,255,0.06)"
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a2e",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                fontFamily: "monospace",
                fontSize: 11,
                color: "#e0e0e0",
              }}
              labelStyle={{ color: "#555555" }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#00e5ff"
              strokeWidth={2}
              dot={{ fill: "#00e5ff", r: 3 }}
              activeDot={{ fill: "#ffffff", r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div
          className="text-center py-4 text-xs"
          style={{ color: "#555555", fontFamily: "monospace" }}
        >
          該当するデータがありません
        </div>
      )}
    </div>
  );
}

function formatChartDate(date: Date): string {
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${m}/${d}`;
}
