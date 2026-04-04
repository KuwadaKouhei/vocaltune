"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "vocaltune_onboarded";

interface OnboardingProps {
  onLoadDemo: () => void;
}

const steps = [
  {
    title: "マイクを使用します",
    description:
      "このアプリはマイクで歌声を拾い、リアルタイムにピッチを検出します。ブラウザのマイク許可を求められたら「許可」してください。",
  },
  {
    title: "歌ってピッチを確認",
    description:
      "STARTボタンを押して歌うと、ピアノロール上にピッチが表示されます。音名とセント偏差もリアルタイムで確認できます。",
  },
  {
    title: "MIDIファイルで採点",
    description:
      "MIDIファイルをドロップすると、お手本メロディが表示され、歌い終わった後にスコアが出ます。まずはデモ曲で試してみましょう!",
  },
];

export default function Onboarding({ onLoadDemo }: OnboardingProps) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) setShow(true);
    }
  }, []);

  if (!show) return null;

  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(STORAGE_KEY, "1");
      setShow(false);
      onLoadDemo();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
    >
      <div
        className="max-w-md w-full mx-4 rounded-xl p-6"
        style={{
          backgroundColor: "#12121a",
          border: "1px solid rgba(0, 229, 255, 0.15)",
          fontFamily: "monospace",
        }}
      >
        {/* ステップインジケータ */}
        <div className="flex gap-2 mb-6 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor:
                  i === step ? "#00e5ff" : "rgba(255, 255, 255, 0.15)",
              }}
            />
          ))}
        </div>

        {/* コンテンツ */}
        <div className="text-center mb-6">
          <h2
            className="text-lg font-bold mb-3"
            style={{ color: "#00e5ff" }}
          >
            {steps[step].title}
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "#aaaaaa" }}
          >
            {steps[step].description}
          </p>
        </div>

        {/* ボタン */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-2.5 rounded-lg text-xs transition-colors"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#555555",
            }}
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors"
            style={{
              backgroundColor: "rgba(0, 229, 255, 0.15)",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              color: "#00e5ff",
            }}
          >
            {isLast ? "Demo Start" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
