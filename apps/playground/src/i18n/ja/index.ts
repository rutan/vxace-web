import type { Translation } from '../i18n-types.js';

const ja = {
  app: {
    title: 'RPGツクールVX Ace Web Playground',
  },
  header: {
    help: 'これは何？',
    reset: 'リセット',
    language: '言語',
  },
  dropZone: {
    title: 'RPGツクールVX Aceのゲームデータを選択',
    description: 'RTP素材を含めて出力し、展開した後の Game.ini を含むフォルダをドロップ、または選択してください。',
    chooseFolder: 'フォルダを選択',
    loading: '読み込み中...',
  },
  game: {
    defaultTitle: 'RPG Maker VX Ace Game',
  },
  errors: {
    missingGameIni: 'Game.ini が見つかりません。VX Ace プロジェクトのフォルダを選択してください。',
    missingScripts: 'Data/Scripts.rvdata2 が見つかりません。暗号化アーカイブではない VX Ace プロジェクトが必要です。',
  },
  warnings: {
    duplicateResourceCandidate: '同じリソース候補が複数あります: {key} ({candidateKey})',
  },
  help: {
    overview: {
      title: '概要',
      paragraph1:
        '『RPGツクールVX Ace Web Playground』は、自分が作成したRPGツクールVX Aceのプロジェクトをブラウザ上でお試し動作するためのツールです。',
      paragraph2: 'ゲームデータはサーバーに送信されることなく、ブラウザ内でのみ処理されます。安心してお試しください。',
      paragraph3: '本ツールは非公式のものであり、株式会社Gotcha Gotcha Gamesとは一切関係ありません。',
    },
    usage: {
      title: '使い方',
      steps: {
        export: {
          title: 'RTPを含めて出力',
          description:
            'RPGツクールVX Aceの「ゲームデータの圧縮」で「RTPのデータを含める」にチェックを入れて出力します。暗号化アーカイブは使用できません。',
        },
        extract: {
          title: '作成されたデータを展開',
          description: '出力された圧縮ファイルを任意の場所に展開します。',
        },
        confirm: {
          title: 'Game.ini を確認',
          description: '展開したフォルダの直下に Game.ini、Data、Graphics、Audio などがあることを確認します。',
        },
        drop: {
          title: 'フォルダをドロップ',
          description:
            'Game.ini を含むフォルダごと、このページにドラッグ＆ドロップするか、フォルダ選択から読み込みます。',
        },
      },
    },
    limitations: {
      title: '制限について',
      intro: 'ブラウザ実行の性質上、いくつかの制限があります。',
      rtp: '通常のプロジェクトフォルダにはRTP素材が含まれていません。RTP素材を含めて出力したゲームデータを使用してください。',
      encryptedData: 'RPGツクールVX Aceの暗号化データはサポートしていません。',
      media: 'MIDI再生、ムービー再生には非対応です。',
      scripts: '一部のRGSS3スクリプトは正常に動作しない可能性があります。',
      other: 'その他、いろいろ動かないこともあります。',
      desktop:
        'また、このPlaygroundページはパソコンでの利用を想定しています。スマートフォンやタブレットでは正常に動作しない可能性があります。',
    },
    author: {
      title: 'つくったひと',
      name: 'Ruたん',
      repository: 'GitHub リポジトリ',
    },
    licenses: {
      title: 'オープンソースライセンス',
      playground: 'Playground Application で使用しているライブラリのライセンスを表示',
      runtime: 'Web Player Runtime で使用しているライブラリのライセンスを表示',
    },
    legal: {
      trademark: 'RPG MAKERは、株式会社Gotcha Gotcha Gamesの登録商標又は商標です。',
      copyright: '©2011 Gotcha Gotcha Games Inc./YOJI OJIMA',
    },
    close: '閉じる',
  },
} satisfies Translation;

export default ja;
