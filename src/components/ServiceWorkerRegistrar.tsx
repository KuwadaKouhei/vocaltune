"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW登録失敗は無視（開発環境やHTTP環境では失敗する）
      });
    }
  }, []);

  return null;
}
