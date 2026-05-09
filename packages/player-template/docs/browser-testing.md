# Browser Testing

## 目的

`packages/player-template` では、実ブラウザ上で `Scripts.rvdata2` を評価した結果を確認するために Playwright を使う。

目的は UI テストを厚く書くことではなく、次を素早く検知することにある。

- boot 時の例外
- guest script の評価失敗
- runtime error overlay の表示
- `demo` の title boot と最低限の入力遷移

## セットアップ

### 依存の導入

```bash
pnpm install
```

この repo の既定設定は、ローカルに入っている Google Chrome を使う。  
Chrome がない環境や bundled Chromium を使いたい環境では、必要に応じて次を実行する:

```bash
pnpm exec playwright install chromium
```

## 使い方

ブラウザテストは実行ごとに空いている port を選び、専用の Vite server を起動する。  
これにより複数の作業ツリーやエージェントが同時に実行しても、既定では port 8080 を取り合わない。

### headless 実行

```bash
pnpm --filter @rutan/rpgmaker-vxace-web-player-template run test:browser
```

### ウィンドウを出して確認

```bash
pnpm --filter @rutan/rpgmaker-vxace-web-player-template run test:browser:headed
```

### step 実行

```bash
pnpm --filter @rutan/rpgmaker-vxace-web-player-template run test:browser:debug
```

既に起動しているサーバーに接続したい場合だけ、明示的に `PLAYWRIGHT_BASE_URL` を指定する:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm --filter @rutan/rpgmaker-vxace-web-player-template run test:browser
```

## いまの smoke test

`tests/browser/demo-smoke.spec.ts` は次だけを確認する。

1. `?game_dir=demo` で起動できる
2. canvas が出る
3. title boot 後に `.runtime-error` が出ていない
4. `Enter` で `New Game` 相当の入力を送ったあとも `.runtime-error` が出ていない

失敗時は trace / screenshot を `test-results/` に残す。ローカル実行では video も残すが、CI では安定性を優先して video 記録を無効にしている。

## 実装方針

- browser test は guest script を置き換えない
- 不具合が出たら test を直すのではなく core を直す
- 期待値はまず「落ちないこと」と「runtime error が出ないこと」に絞る
- scene 固有の DOM を前提にしない

## 補助機能

runtime 側には画面内 error overlay を入れてある。  
Playwright test は `.runtime-error` の表示有無で boot failure を検知する。

ブラウザテストから直接 `page.goto('/?game_dir=...')` や `canvas.click(...)` を呼ばず、
`tests/browser/helpers` の補助関数を使う。

- `loadGame` は game URL 生成、canvas 表示待ち、起動後の settle、runtime error 確認をまとめる
- `clickGameCanvas` / `focusGameCanvas` は canvas クリック位置を統一する
- `tapKey` / `dispatchKeyEvent` は実入力と合成イベント入力の扱いを分ける
- `readAppDebugSnapshot` / `waitForTilemap` / `waitForVisibleWindow` は runtime 側の debug snapshot を読む
