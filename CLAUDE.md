# CLAUDE.md — VocalTune プロジェクト

## このプロジェクトについて

DTM制作者向けのボーカルピッチトレーナーWebアプリ。ブラウザ完結MVP。

## 技術スタック

- Next.js 16 (App Router) + TypeScript
- React 19
- Tailwind CSS v4（ダークテーマ）
- Web Audio API + YIN自己相関（ピッチ検出）
- Canvas 2D（ピアノロール描画）
- @tonejs/midi（MIDIパース）
- Dexie.js（IndexedDB、録音履歴保存）
- Recharts（スコアグラフ）
- Socket.IO（Co-opモード リアルタイム同期）
- Three.js + @react-three/fiber（3D Visualizer）

## 開発方針

- バックエンドなし（フロント完結、Co-opモード用のsocketサーバーは `server/` に別途あり）
- `src/` ディレクトリ構成
- コンポーネントは `src/components/`、ロジックは `src/lib/`、フックは `src/hooks/`
- 日本語コメント可、変数名・関数名は英語

## 重要な技術的制約

- マイク入力は `echoCancellation: false, noiseSuppression: false, autoGainControl: false`
- ピッチ検出FFTサイズ: 4096（変更不可、精度に直結）
- Canvas描画は `requestAnimationFrame` のみ（setInterval禁止）
- ピッチ履歴バッファは200フレーム固定長
- RMS閾値はキャリブレーション機能で動的に設定（デフォルト: 0.0001）

## 現在のフェーズ

Phase 1: コアピッチ検出（MVP）
