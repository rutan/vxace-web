# Playground で実現したいこと

## 概要

手元にあるRPGツクールVX AceのプロジェクトをD&Dすることで、ブラウザ上でお試しプレイできるPlaygroundを作成する。

性質上、RPGツクールVX Aceが利用可能なPC環境からのみの利用を想定。

## ページ構成

- ヘッダー
  - 左上にタイトル
  - 右上にボタン
    - ヘルプボタン
    - リセットボタン
- コンテンツエリア
  - 初期状態ではファイルのドロップゾーンを表示
  - 後にゲームエリアになる

## イメージ

1. D&Dされたファイルをもとに manifest を生成
2. @rutan/rpgmaker-vxace-web-player-template を利用してゲームをプレイ

### ゲームの読み込みについて

@rutan/rpgmaker-vxace-web-player-template のテンプレートでは、テンプレートの直下の `game` フォルダにゲームのファイルを配置する必要があるが、今回のPlaygroundでは、D&Dされたファイルをもとに manifest を生成するため、`game` フォルダは存在しない。

テンプレート側を加工するか、Service Workerを利用して通信を奪うかなど方法を考える必要がある。
