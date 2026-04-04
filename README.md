こっみｔ# VocalTune — ボーカルピッチトレーナー

DTM制作者向けのリアルタイムボーカルピッチトレーナーWebアプリ。ブラウザ完結で動作し、バックエンド不要。

## 技術領域

### 音声処理 (Web Audio API)

- **マイク入力**: `getUserMedia` によるリアルタイム音声キャプチャ
  - エコーキャンセル・ノイズサプレッション・オートゲイン全OFF（DAW的な生音入力）
- **ピッチ検出**: YIN自己相関アルゴリズム（DSP）
  - FFTサイズ: 4096サンプル / 検出範囲: 60Hz〜1200Hz (C2〜C6)
  - 累積平均正規化差分関数 (CMNDF) + 放物線補間による精密化
  - 検出レイテンシ: 約93ms (4096/44100Hz)
- **メトロノーム**: Web Audio API `OscillatorNode` によるクリック音合成
  - 矩形波 (square) / アクセント1000Hz・通常800Hz
  - バー位置との同期（拍境界検出: `Math.floor(elapsedTime / beatDuration)`）

### リアルタイム描画 (Canvas 2D)

- **ピアノロール**: `requestAnimationFrame` による60fps描画
  - 拍ベースの横軸（BPM・小節数設定可能）
  - 固定半音高さ + エッジ検出スクロール（表示範囲外時のみY軸移動）
  - Lerp補間による滑らかな表示遷移
  - `ResizeObserver` + `devicePixelRatio` 対応の高解像度描画
- **音階カラーリング**: 各音名ごとの背景色（C=赤, D=黄, E=緑, F=橙, G=水, A=紫, B=白、半音は薄色）
- **編集モード**: クリック/ドラッグによる目標ピッチライン描画
  - 半音グリッドスナップ / 複数ストローク対応
- **ピッチ履歴バッファ**: 200フレーム固定長リングバッファ

### MIDI処理

- **MIDIパース**: `@tonejs/midi` によるMIDIファイル読み込み
- **お手本オーバーレイ**: MIDIノートを半透明矩形でCanvas上に重ね描画
- **採点エンジン**: セント差ベースの精度計算（ノート区間ごと加重平均）

### 3Dビジュアライザー (Three.js / React Three Fiber)

- `@react-three/fiber` + `@react-three/drei` によるWebGLピッチ可視化
- ピッチリボン・現在ピッチオーブ・3Dグリッド
- 動的表示範囲（サブコンポーネントごとの独立Lerp）

### データ永続化 (IndexedDB)

- **Dexie.js**: 練習記録のCRUD操作
- **スキーマ**: 録音タイトル・スコア・ピッチ履歴・MIDIファイル名・タグ

### グラフ・可視化 (Recharts)

- スコア推移 `LineChart`（7日/30日/全期間フィルタ）
- 曲名フィルタによる同一曲の成長推移

### PWA

- Web App Manifest + Service Worker（Network-first + キャッシュフォールバック）
- オフライン対応・ホーム画面追加

## 技術スタック

| レイヤー | 技術 | バージョン |
|---|---|---|
| フレームワーク | Next.js (App Router) | 16.x |
| 言語 | TypeScript | 5.x |
| UI | Tailwind CSS (ダークテーマ) | 4.x |
| ピッチ検出 | Web Audio API + YIN | ブラウザAPI |
| 描画 | Canvas 2D | ブラウザAPI |
| 3D | React Three Fiber + drei | 9.x / 10.x |
| MIDI | @tonejs/midi | 2.x |
| DB | Dexie.js (IndexedDB) | 4.x |
| グラフ | Recharts | 3.x |

## ディレクトリ構成

```
src/
├── app/
│   ├── layout.tsx            # 共通レイアウト（ダークテーマ、JetBrains Mono）
│   ├── page.tsx              # メインページ
│   ├── history/page.tsx      # 練習履歴ページ
│   └── visualizer/page.tsx   # 3Dビジュアライザーページ
├── components/
│   ├── PitchMonitor.tsx      # メイン画面（設定UI・制御）
│   ├── PitchCanvas.tsx       # ピアノロール描画（編集モード含む）
│   ├── CentsMeter.tsx        # セントメーター（SVG）
│   ├── NoteDisplay.tsx       # 音名・周波数表示
│   ├── ScoreDisplay.tsx      # 採点結果表示
│   ├── RecordingList.tsx     # 録音一覧
│   ├── ScoreChart.tsx        # スコア推移グラフ
│   ├── Visualizer3D.tsx      # 3Dビジュアライザー
│   └── ServiceWorkerRegistrar.tsx
├── hooks/
│   ├── usePitchDetection.ts  # ピッチ検出フック
│   ├── useMetronome.ts       # メトロノームフック
│   └── useRecordings.ts      # IndexedDB操作フック
└── lib/
    ├── pitch/
    │   ├── detector.ts       # YINピッチ検出エンジン
    │   ├── notes.ts          # 音名変換ユーティリティ
    │   └── types.ts          # PitchResult, NoteInfo型
    ├── audio/
    │   └── microphone.ts     # マイク入力管理
    ├── midi/
    │   ├── parser.ts         # MIDIパーサー
    │   └── types.ts          # MidiNote型
    ├── scoring/
    │   └── engine.ts         # 採点ロジック
    └── db/
        ├── schema.ts         # Dexieスキーマ
        └── recordings.ts     # CRUD操作
```

## セットアップ

```bash
npm install
npm run dev
```

http://localhost:3000 でアクセス。マイク許可が必要。

## デプロイ

Vercelにデプロイ可能。`next.config.ts` にPermissions-Policyヘッダー設定済み。
