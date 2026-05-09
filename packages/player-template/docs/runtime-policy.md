# Runtime Policy

## 目的

`packages/player-template` は、RPG Maker VX Ace のゲームをブラウザ上で実行するための **RGSS3 互換ランタイム** である。

player-template runtime の役割は、ゲーム本体を再実装することではない。  
ゲーム本体は `Game.ini`、`Scripts.rvdata2`、`Data/*.rvdata2`、`Graphics/*` に含まれており、player-template runtime はそれを受け入れて実行するための基盤のみを提供する。

## 基本原則

1. player-template runtime は engine であり、game ではない。
2. ゲーム固有ロジックは `Scripts.rvdata2` 側に存在する前提で扱う。
3. `Scripts.rvdata2` が依存するものだけを core として実装する。
4. 足りない機能を guest-side class の自前実装で埋めてはならない。
5. 互換性の問題は core API の不足または意味論の差として解決する。

## 責務の境界

### player-template runtime が持つべきもの

- Ruby WASM 上の実行環境
- JS bridge
- RGSS3 core API の互換実装
- `rvdata2` のロードと復元
- 画像、入力、音、描画、画面更新のブラウザ実装
- デバッグ補助と互換性検証用のテスト

### player-template runtime が持ってはいけないもの

- `Scene_Title`
- `Scene_Map`
- `Game_Map`
- `Game_Player`
- `Game_Interpreter`
- `Window_Command`
- `Window_TitleCommand`
- その他、VX Ace 標準 script またはゲーム固有 script に属する class

これらは engine の責務ではなく、`Scripts.rvdata2` に属する guest code である。

## ディレクトリ方針

### `src/ruby/0_internal`

内部補助のみを置く。  
ブラウザ実装、bridge、ランタイム補助など、guest code から直接参照されないものはここに閉じる。

### `src/ruby/1_core`

RGSS3 互換 API のみを置く。  
ここに置くコードは、ゲーム非依存でなければならない。

例:

- `Graphics`
- `Input`
- `Audio`
- `Bitmap`
- `Sprite`
- `Viewport`
- `Window`
- `Tilemap`
- `Rect`
- `Tone`
- `Color`
- `Table`

### `src/ruby/2_extension`

VX Ace Web Runtime が提供する独自の拡張機能を置く。

ゲーム開発者が明示的に VX Ace Web Runtime 向けの処理を行いたい場合、ここで定義される API を使うことができる。

```ruby
if defined?(RPGVXAceWeb)
  # VX Ace Web Runtime 向けの処理
else
  # それ以外の環境向けの処理
end
```

### `public/<game>`

guest assets を置く。  
ここにある script と data がゲーム本体であり、runtime 側の Ruby 実装はそれを置き換えてはならない。

## Boot 方針

本番 boot は次の責務だけを持つ。

1. `0_internal` を読み込む
2. `1_core` を読み込む
3. 対象ゲームの `Game.ini` を読む
4. `Scripts.rvdata2` を読み、順に評価する

本番 boot が独自の `Scene_Title` や `Scene_Map` に分岐してはならない。

## 実装判断の基準

新しいゲームが動かない場合、最初に疑うべきなのは次のいずれかである。

- core class が存在しない
- core method が存在しない
- core method の振る舞いが RGSS3 と異なる
- `rvdata2` の復元が不完全
- JS bridge が core の期待を満たしていない

疑ってはいけないのは次である。

- 標準 script の代わりに scene/game/window class を runtime 側で書けばよい
- 特定ゲームを動かすために専用 class を足せばよい
- `demo` 用の仮実装を本番 runtime に混ぜればよい

## 設計レビュー用チェックリスト

変更前に次を確認する。

- これは game-specific code ではなく core か
- `Scripts.rvdata2` から見て自然な API か
- ほかの VX Ace ゲームでも再利用できるか
- debug/harness と本番 runtime が分離されているか
- top-level class 名の衝突を起こさないか

1 つでも `No` なら、その実装は core に置くべきではない可能性が高い。

## 成功条件

成功とは、runtime 側に game-specific class を追加せずに、`Scripts.rvdata2` 側の既存 script が core API のみを使ってそのまま起動することである。

タイトル画面やマップ画面が出ること自体は成功条件ではない。  
**guest code を差し替えずに動くこと** が成功条件である。
