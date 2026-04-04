# VocalTune — ボーカルピッチトレーナー

DTM制作者向けのリアルタイムボーカルピッチトレーナーWebアプリ。ソロ練習と2人同時のCo-opモードに対応。

## 画面構成

| ルート | 画面 | 概要 |
|--------|------|------|
| `/` | ホーム | Solo / Co-op モード選択、ルーム作成・参加 |
| `/solo` | ソロモード | 1人でピッチ練習。MIDI読み込み・採点・履歴保存 |
| `/room/new` | ルーム作成 | Co-opルームを作成しリダイレクト |
| `/room/[roomId]` | Co-opモード | 2人でリアルタイム共同編集 |
| `/visualizer` | 3Dビジュアライザー | Three.jsによるピッチ3D可視化 |
| `/history` | 練習履歴 | スコア推移グラフ・録音再生 |

## 技術領域

### 音声処理 (Web Audio API)

- **マイク入力**: `getUserMedia` によるリアルタイム音声キャプチャ
  - エコーキャンセル・ノイズサプレッション・オートゲイン全OFF（DAW的な生音入力）
- **ピッチ検出**: YIN自己相関アルゴリズム（DSP）
  - FFTサイズ: 4096サンプル / 検出範囲: 60Hz〜1200Hz (C2〜C6)
  - 累積平均正規化差分関数 (CMNDF) + 放物線補間による精密化
  - 検出レイテンシ: 約93ms (4096/44100Hz)
  - **メディアンフィルタ**: ウィンドウサイズ5のジッター除去フィルタで安定化
- **ビブラート検出**: ゼロクロス法による周期的ピッチ変動の検出
  - 判定条件: レート4〜8Hz / 振幅20〜100セント / 3サイクル以上
  - 採点時にビブラート区間はピッチ中心値で評価（振幅ペナルティなし）
- **メトロノーム**: Web Audio API `OscillatorNode` によるクリック音合成
  - 矩形波 (square) / アクセント1000Hz・通常800Hz

### リアルタイム描画 (Canvas 2D)

- **ピアノロール**: `requestAnimationFrame` による60fps描画
  - 拍ベースの横軸（BPM・小節数設定可能）
  - 固定半音高さ + Lerp補間による滑らかな表示遷移
  - `ResizeObserver` + `devicePixelRatio` 対応の高解像度描画
- **音階カラーリング**: 各音名ごとの背景色（C=赤, D=黄, E=緑, F=橙, G=水, A=紫, B=白）
- **編集モード**: クリック/ドラッグによる目標ピッチライン描画
  - 半音グリッドスナップ（Y軸） / **拍グリッドスナップ ON/OFF切替**（X軸）
  - 複数ストローク対応 / 重複自動消去
  - **Undo/Redo**: ストローク単位の取り消し・やり直し（Ctrl+Z / Ctrl+Shift+Z）、上限50件
  - **ユーザー別色分け**: Co-opモードで自分=黄色・相手=シアンで描画
- **リモートカーソル**: 相手ユーザーのカーソルを十字+ドットで表示

### MIDI処理

- **MIDIパース**: `@tonejs/midi` によるMIDIファイル読み込み
- **お手本オーバーレイ**: MIDIノートを半透明矩形でCanvas上に重ね描画
- **採点エンジン**: セント差ベースの精度計算（ノート区間ごと加重平均）
  - ビブラート検出統合: ビブラート区間は中心周波数で評価

### リアルタイム共同編集 (Socket.io)

- **WebSocket通信**: 独立したSocket.ioサーバー（`server/`）による双方向リアルタイム同期
- **ルーム管理**: 最大2人のユーザーが招待リンクで接続
  - ホーム画面からルーム作成 or Room IDで参加
  - 切断検知・自動退出・5分間TTL後のルームGC
- **状態同期**:
  - スカラー値（BPM、小節数、半音高さ、メトロノーム、編集モード）: Last-writer-wins即時ブロードキャスト
  - ターゲットストローク: 30msスロットル付きオペレーション同期
  - MIDIファイル: ArrayBufferバイナリ転送、受信側で再パース

### UX

- **オンボーディング**: 初回起動時の3ステップガイド（マイク許可→使い方→採点説明）
- **デモ曲同梱**: Cメジャースケール（C4-C5）のMIDIファイルをガイド完了後に自動ロード

### 3Dビジュアライザー (Three.js / React Three Fiber)

- `@react-three/fiber` + `@react-three/drei` によるWebGLピッチ可視化
- ピッチリボン・現在ピッチオーブ・3Dグリッド

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
| ピッチ検出 | Web Audio API + YIN + メディアンフィルタ | ブラウザAPI |
| 描画 | Canvas 2D | ブラウザAPI |
| 3D | React Three Fiber + drei | 9.x / 10.x |
| MIDI | @tonejs/midi | 2.x |
| DB | Dexie.js (IndexedDB) | 4.x |
| グラフ | Recharts | 3.x |
| リアルタイム通信 | Socket.io | 4.x |

## アーキテクチャ

```
[User A Browser]  <--WebSocket-->  [Socket.io Server :3001]  <--WebSocket-->  [User B Browser]
    Next.js :3000                    standalone Node.js                         Next.js :3000
```

## ディレクトリ構成

```
src/
├── app/
│   ├── layout.tsx            # 共通レイアウト（ダークテーマ、JetBrains Mono）
│   ├── page.tsx              # ホーム画面（Solo / Co-op選択）
│   ├── solo/page.tsx         # ソロモード
│   ├── history/page.tsx      # 練習履歴ページ
│   ├── visualizer/page.tsx   # 3Dビジュアライザーページ
│   └── room/
│       ├── new/page.tsx      # ルーム作成ページ
│       └── [roomId]/page.tsx # 共同編集ページ（動的ルート）
├── components/
│   ├── PitchMonitor.tsx      # メイン画面（設定UI・制御・collab対応）
│   ├── PitchCanvas.tsx       # ピアノロール描画（編集・スナップ・Undo/Redo）
│   ├── CollabPitchMonitor.tsx # 共同編集ラッパー
│   ├── CollabStatusBar.tsx   # 接続状態・招待リンクUI
│   ├── Onboarding.tsx        # 初回オンボーディングモーダル
│   ├── CentsMeter.tsx        # セントメーター（SVG）
│   ├── NoteDisplay.tsx       # 音名・周波数表示
│   ├── ScoreDisplay.tsx      # 採点結果表示
│   ├── RecordingList.tsx     # 録音一覧
│   ├── ScoreChart.tsx        # スコア推移グラフ
│   ├── Visualizer3D.tsx      # 3Dビジュアライザー
│   └── ServiceWorkerRegistrar.tsx
├── hooks/
│   ├── usePitchDetection.ts  # ピッチ検出フック（メディアンフィルタ内蔵）
│   ├── useMetronome.ts       # メトロノームフック
│   ├── useRecordings.ts      # IndexedDB操作フック
│   └── useCollaboration.ts   # 共同編集フック（Socket.io接続・状態同期）
└── lib/
    ├── pitch/
    │   ├── detector.ts       # YINピッチ検出エンジン
    │   ├── filter.ts         # メディアンフィルタ（ジッター除去）
    │   ├── vibrato.ts        # ビブラート検出（ゼロクロス法）
    │   ├── notes.ts          # 音名変換ユーティリティ
    │   └── types.ts          # PitchResult, NoteInfo型
    ├── audio/
    │   └── microphone.ts     # マイク入力管理
    ├── midi/
    │   ├── parser.ts         # MIDIパーサー
    │   └── types.ts          # MidiNote型
    ├── scoring/
    │   └── engine.ts         # 採点ロジック（ビブラート考慮）
    ├── collab/
    │   ├── types.ts          # 共同編集用型定義
    │   └── socket.ts         # Socket.ioクライアント
    └── db/
        ├── schema.ts         # Dexieスキーマ
        └── recordings.ts     # CRUD操作

server/                       # Socket.ioサーバー（独立プロセス）
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts              # サーバーエントリポイント
    ├── room.ts               # ルーム管理
    └── types.ts              # 共有型定義
```

## セットアップ

```bash
# 依存インストール
npm install
cd server && npm install && cd ..

# ソロモードのみ
npm run dev

# Co-opモード対応（Next.js + Socket.ioサーバーを同時起動）
npm run dev:collab
```

http://localhost:3000 でホーム画面にアクセス。マイク許可が必要。

## 使い方

### ソロモード

1. ホーム画面で「Solo Mode」を選択
2. STARTボタンを押して歌う → ピアノロール上にリアルタイムでピッチ表示
3. MIDIファイルをドロップすると、お手本メロディが表示され採点可能

### Co-opモード

1. `npm run dev:collab` で両サーバーを起動
2. ホーム画面で「Create Room」をクリック → ルーム作成・自動参加
3. 「Copy Invite Link」で招待URLをコピー、または相手にRoom IDを共有
4. 別のブラウザ/タブでRoom IDを入力して「Join」→ 共同編集開始

### 同期される内容

- ターゲットカーブ描画（ユーザー別色分け）
- BPM、小節数、半音高さ、メトロノーム、編集モード
- MIDIファイル（ドラッグ＆ドロップで共有）
- カーソル位置（リアルタイム表示）

## デプロイ

- **Next.jsアプリ**: Vercelにデプロイ可能。`next.config.ts` にPermissions-Policyヘッダー設定済み。
- **Socket.ioサーバー**: Railway / Render / Fly.io 等のNode.jsホストに別途デプロイ。環境変数 `NEXT_PUBLIC_SOCKET_URL` でサーバーURLを指定。
