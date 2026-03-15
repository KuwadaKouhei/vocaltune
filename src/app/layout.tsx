import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VocalTune — ボーカルピッチトレーナー",
  description: "DTM制作者向けリアルタイムボーカルピッチ可視化ツール",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VocalTune",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="icon" href="/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className={`${jetbrainsMono.variable} antialiased`}>
        <ServiceWorkerRegistrar />

        {/* ヘッダー */}
        <header
          className="flex items-center justify-between px-6 h-12 shrink-0"
          style={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-bold tracking-widest"
              style={{ color: "#00e5ff", textDecoration: "none" }}
            >
              VocalTune
            </Link>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                color: "#555555",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
              }}
            >
              PWA
            </span>
          </div>

          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs transition-colors"
              style={{ color: "#555555", fontFamily: "monospace", textDecoration: "none" }}
            >
              Monitor
            </Link>
            <Link
              href="/visualizer"
              className="text-xs transition-colors"
              style={{ color: "#555555", fontFamily: "monospace", textDecoration: "none" }}
            >
              3D
            </Link>
            <Link
              href="/history"
              className="text-xs transition-colors"
              style={{ color: "#555555", fontFamily: "monospace", textDecoration: "none" }}
            >
              History
            </Link>
          </nav>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 p-4" style={{ height: "calc(100vh - 48px)" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
