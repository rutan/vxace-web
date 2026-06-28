# VX Ace Web Runtime

| [English](./README.md) | **日本語** |
| ---------------------- | ---------- |

RPGツクールVX Aceのゲームをブラウザで動かすための非公式ブラウザ実行環境です。

## 概要

VX Ace Web Runtimeは、[RPGツクールVX Ace](https://rpgmakerofficial.com/product/products/rpgvxace/index/)で作成されたゲームをWebブラウザ上で動作させるための非公式ブラウザ実行環境です。

本プロジェクトでは、RGSS3互換のブラウザランタイムと、ブラウザ向けにゲームパッケージを変換するツールを提供します。ランタイムは、ゲームごとにパッチを当てたりスクリプトを書き直したりすることなく、可能な限りオリジナルのゲームコードやデータをそのまま実行できるように設計されています。

## プロジェクトの目的

- RPGツクールVX Aceのゲームをブラウザで動作させる
- 既存のVX Aceのゲームデータやスクリプトとの互換性を維持する
- ブラウザ配信用パッケージを作成するための変換ツールを提供する
- ランタイムを特定のゲームに依存させない（ゲームロジックはリポジトリ内ではなく、`Scripts.rvdata2`に保持する）

## 利用方法

### Windows向けアプリケーション

[リリースページからダウンロード](https://github.com/rutan/vxace-web/releases?q=rpgmaker-vxace-web-converter-app&expanded=false)

### コマンドラインツール

npmからインストールできます `npm install -g @rutan/rpgmaker-vxace-web-converter-cli`

詳細は `@rutan/rpgmaker-vxace-web-converter-cli` の [README](./packages/converter-cli/README.md) を参照してください。

## パッケージ構成

- [game-manifest](./packages/game-manifest): ゲームのメタデータ、リソースパスの解決、アセットのパッケージング、機能フラグを扱うマニフェストスキーマとユーティリティ
- [player-template](./packages/player-template): ruby.wasmとPixiJSをベースに構築された、RGSS3互換ランタイムおよびブラウザプレイヤーテンプレート
- [converter-core](./packages/converter-core): RPGツクールVX AceのゲームをWeb配信用に変換するためのコアライブラリ
- [converter-cli](./packages/converter-cli): `converter-core`をベースにしたコマンドライン変換ツール
- [converter-app](./apps/converter-app): `converter-core`をベースにしたElectron製のデスクトップアプリ

## 開発

```bash
# プロジェクトのビルド (turborepo)
pnpm run build

# コードの静的解析 (Lint)
pnpm run lint

# テストの実行
pnpm run test

# コードのフォーマット
pnpm run format
```

## ドキュメント

- [ランタイムポリシー](./packages/player-template/docs/runtime-policy.md): プレイヤーテンプレートにおけるランタイムの役割、境界線、および互換性ポリシー
- [ブラウザテスト](./packages/player-template/docs/browser-testing.md): プレイヤーテンプレートのブラウザスモークテストおよび成果物収集ワークフロー

## ライセンス

本リポジトリのソースコードは [MITライセンス](./LICENSE) の下で配布されています。

[`example/`](./example/) に含まれるゲームデータやアセットは、npmパッケージには含まれておらず、MITライセンスの適用外です。これらは、ゲーム配布条件を含む [RPGツクール公式の利用規約](https://rpgmakerofficial.com/support/rule/) に基づき、RPGツクールVX Aceのユーザーゲームとして配布されています。

RPGツクールVX Ace本体、RTPアセット、および変換されたゲームアセットには、それぞれ個別のライセンスと利用規約が適用されます。Web上で配布するゲームデータやアセットについては、配布に必要な権利を有していることを必ず確認してください。

詳細な注意事項については [NOTICE.md](./NOTICE.md) を参照してください。

## 免責事項

- 本プロジェクトは個人の開発者によるものであり、RPGツクール公式な製品やサービスではありません
- サポートや保証は提供されません。自己責任で使用してください
