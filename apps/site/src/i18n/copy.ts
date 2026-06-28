import type { VirtualGamepadMode } from '../features/converter/model/converter';
import type { I18nLang } from './locales';

type WbrText = string | string[];

type ConverterCopy = {
  page: {
    title: string;
    description: string;
  };
  intro: {
    heading: WbrText;
    body: string;
  };
  preparation: {
    heading: WbrText;
    body: string;
    items: Array<{
      heading: string;
      body: string;
    }>;
  };
  projectSelection: {
    heading: WbrText;
    loadedHeading: string;
    loadedBody: string;
    reset: string;
    readingHeading: string;
    dropHeading: string;
    body: string;
    selectFolder: string;
    errors: {
      noFiles: string;
      invalidProject: string;
    };
  };
  gameSettings: {
    heading: string;
    title: {
      label: string;
      description: string;
      required: string;
    };
    gameId: {
      label: string;
      description: string;
      warning: string;
      invalid: string;
    };
    screenSize: {
      label: string;
      description: string;
      widthLabel: string;
      heightLabel: string;
      invalidWidth: string;
      invalidHeight: string;
    };
    virtualGamepad: {
      label: string;
      description: string;
      options: Record<VirtualGamepadMode, string>;
    };
  };
  advancedSettings: {
    heading: string;
    packAssets: {
      label: string;
      description: string;
    };
    excludeSourceFiles: {
      label: string;
      description: string;
      patternsLabel: string;
      patternsDescription: string;
    };
    omitUnusedAssets: {
      label: string;
      description: string;
      patternsLabel: string;
      patternsDescription: string;
    };
    htmlInjection: {
      label: string;
      description: string;
      importButton: string;
      contentLabel: string;
      contentDescription: string;
    };
  };
  conversion: {
    heading: string;
    download: string;
    preview: string;
    converting: string;
    convert: string;
    previewDialogLabel: string;
    previewTitle: string;
    close: string;
    summary: {
      title: string;
      zipFilename: string;
      zipSize: string;
      gameTitle: string;
      gameId: string;
      screenSize: string;
      virtualGamepad: string;
      converted: string;
      omitted: string;
      warnings: string;
    };
    errors: {
      noProject: string;
    };
  };
};

type SiteCopy = {
  brand: string;
  header: {
    menu: {
      open: string;
      close: string;
    };
    navLabel: string;
    nav: {
      home: string;
      converter: string;
    };
    languageLabel: string;
    languages: Record<I18nLang, string>;
  };
  footer: {
    note: string;
  };
  landing: {
    page: {
      title: string;
      description: string;
    };
    hero: {
      heading: WbrText;
      copy: string;
      converterAction: string;
      githubAction: string;
    };
    demo: {
      heading: string;
      play: string;
      title: string;
    };
    about: {
      heading: string;
      paragraphs: string[];
      unofficial: string;
    };
    development: {
      heading: string;
      body: string;
      disclaimer: {
        beforeAuthor: string;
        author: {
          label: string;
          url: string;
        };
        afterAuthor: string;
        caution: string;
      };
      action: string;
    };
    mechanism: {
      heading: string;
      paragraphs: string[];
      compatibility: {
        heading: string;
        items: Array<{
          feature: string;
          status: string;
          notes?: Array<{
            before?: string;
            codes?: string[];
            after?: string;
          }>;
        }>;
      };
    };
    howToUse: {
      heading: string;
      easy: {
        heading: string;
        body: string;
        action: string;
      };
      advanced: {
        heading: string;
        body: string;
        packages: Array<{
          name: string;
          description: string;
        }>;
      };
    };
  };
  converter: ConverterCopy;
};

export const siteCopy = {
  en: {
    brand: 'VX Ace Web Runtime',
    header: {
      menu: {
        open: 'Open menu',
        close: 'Close menu',
      },
      navLabel: 'Global navigation',
      nav: {
        home: 'Home',
        converter: 'Converter',
      },
      languageLabel: 'Language',
      languages: {
        en: 'English',
        ja: '日本語',
      },
    },
    footer: {
      note: 'This is an unofficial project and is not affiliated with Gotcha Gotcha Games, the developer of RPG Maker.',
    },
    landing: {
      page: {
        title: 'VX Ace Web Runtime',
        description: 'VX Ace Web Runtime is an unofficial browser runtime for RPG Maker VX Ace games.',
      },
      hero: {
        heading: 'Run RPG Maker VX Ace games in the browser',
        copy: 'VX Ace Web Runtime is an unofficial project that makes RPG Maker VX Ace games playable in the browser.',
        converterAction: 'Convert in the browser',
        githubAction: 'GitHub',
      },
      demo: {
        heading: 'Demo',
        play: 'Play demo',
        title: 'VX Ace Web Runtime demo',
      },
      about: {
        heading: 'About VX Ace Web Runtime',
        paragraphs: [
          'VX Ace Web Runtime is an unofficial browser runtime for RPG Maker VX Ace games.',
          'The project provides a compatible runtime template for running RPG Maker VX Ace games in the browser, plus a public converter that packages games for that runtime.',
        ],
        unofficial: 'This project is not affiliated with Gotcha Gotcha Games, the developer of RPG Maker.',
      },
      development: {
        heading: 'Development and source code',
        body: 'The runtime, converter, and site source code are developed publicly on GitHub.',
        disclaimer: {
          beforeAuthor: 'This project is developed individually by ',
          author: {
            label: 'Rutan',
            url: 'https://github.com/rutan',
          },
          afterAuthor: ', and support is not provided.',
          caution: 'Use it at your own risk.',
        },
        action: 'View on GitHub',
      },
      mechanism: {
        heading: 'How it works',
        paragraphs: [
          'VX Ace Web Runtime uses Ruby.wasm and Pixi.js to build a compatible runtime that reproduces RGSS3 behavior.',
          'There are some differences from RPG Maker VX Ace because of Ruby version differences and browser constraints, but the runtime is designed to support many games.',
          'Note: This project does not guarantee that all games will work. Due to the nature of the project, long play sessions or large games may be unstable.',
        ],
        compatibility: {
          heading: 'Compatibility overview',
          items: [
            {
              feature: 'Maps and events',
              status: 'Works',
            },
            {
              feature: 'Battle',
              status: 'Works',
            },
            {
              feature: 'RGSS3 scripts',
              status: 'Most scripts work',
              notes: [
                {
                  before: 'Some APIs such as ',
                  codes: ['Win32API', 'dl'],
                  after: ' are partially supported.',
                },
              ],
            },
            {
              feature: 'Encrypted archives',
              status: 'Not supported',
            },
            {
              feature: 'File name handling',
              status:
                'Uses a manifest to resolve differences in letter casing in a way close to RPG Maker VX Ace behavior',
            },
            {
              feature: 'File writes, including save data',
              status: 'Mostly supported using IndexedDB',
              notes: [
                {
                  before:
                    'Due to browser limitations, data writes are performed using IndexedDB. Writing large files may fail.',
                },
              ],
            },
            {
              feature: 'Smartphone',
              status: 'Works with the virtual gamepad',
              notes: [
                {
                  before: 'iOS is only supported on the latest version.',
                },
              ],
            },
          ],
        },
      },
      howToUse: {
        heading: 'How to use',
        easy: {
          heading: 'Use the browser converter',
          body: 'A browser-based converter is available. Drag and drop a ZIP of your RPG Maker VX Ace game to convert it into browser-ready game data.',
          action: 'Convert in the browser',
        },
        advanced: {
          heading: 'Advanced usage',
          body: 'The following npm packages are available for build pipelines or custom converters.',
          packages: [
            {
              name: '@rutan/rpgmaker-vxace-web-player-template',
              description: 'Compatible runtime template for running RPG Maker VX Ace games in the browser',
            },
            {
              name: '@rutan/rpgmaker-vxace-web-converter-core',
              description: 'Converter library for packaging RPG Maker VX Ace games for browser playback',
            },
            {
              name: '@rutan/rpgmaker-vxace-web-converter-cli',
              description: 'CLI tool for converting RPG Maker VX Ace games into browser-ready game data',
            },
          ],
        },
      },
    },
    converter: {
      page: {
        title: 'Converter | VX Ace Web Runtime',
        description: 'Convert a VX Ace project in the browser and generate a distribution ZIP.',
      },
      intro: {
        heading: 'Convert RPG Maker VX Ace games for the browser',
        body: 'Load a game folder and generate a distribution ZIP that runs in the browser. The conversion runs entirely in your browser and is not uploaded to a server.',
      },
      preparation: {
        heading: 'Prepare before converting',
        body: 'Prepare your RPG Maker VX Ace game data with the following steps.',
        items: [
          {
            heading: 'Export with RTP included',
            body: 'Use Compress Game Data in RPG Maker VX Ace and enable Include RTP Data. Encrypted archives cannot be used.',
          },
          {
            heading: 'Extract the generated data',
            body: 'Extract the generated archive to any location.',
          },
          {
            heading: 'Check Game.ini',
            body: 'Make sure Game.ini, Data, Graphics, Audio, and related folders are directly inside the extracted folder.',
          },
        ],
      },
      projectSelection: {
        heading: 'Select game data',
        loadedHeading: 'Loading complete',
        loadedBody: 'Loaded {fileCount} files.',
        reset: 'Reset',
        readingHeading: 'Reading files',
        dropHeading: 'Drop the project folder here',
        body: 'Select a VX Ace project folder.',
        selectFolder: 'Select folder',
        errors: {
          noFiles: 'No files were found.',
          invalidProject: 'Could not read this as a VX Ace project. Select the project folder that contains Game.ini.',
        },
      },
      gameSettings: {
        heading: 'Game settings',
        title: {
          label: 'Game title',
          description: 'The game name used for the browser title bar and converted ZIP filename.',
          required: 'Enter a title.',
        },
        gameId: {
          label: 'Save data ID',
          description:
            'An ID used to identify save data. Changing it after publishing prevents existing saves from carrying over.',
          warning:
            'Use up to 128 ASCII characters. It must start with a letter or number and may contain letters, numbers, periods, underscores, colons, and hyphens.',
          invalid: 'Game ID must start with a letter or number and be 128 characters or fewer.',
        },
        screenSize: {
          label: 'Screen size',
          description: 'Display size of the game screen. The VX Ace default is 544 x 416 px.',
          widthLabel: 'Screen width',
          heightLabel: 'Screen height',
          invalidWidth: 'Screen width is invalid.',
          invalidHeight: 'Screen height is invalid.',
        },
        virtualGamepad: {
          label: 'Mobile virtual gamepad',
          description: 'Choose the on-screen gamepad shown for touch controls.',
          options: {
            normal: 'Show all common buttons with the normal layout',
            'normal-swap': 'Swap the confirm and cancel button positions',
            simple: 'Show only the directional pad, confirm, and cancel buttons',
            none: 'Do not show an on-screen gamepad',
          },
        },
      },
      advancedSettings: {
        heading: 'Advanced settings',
        packAssets: {
          label: 'Pack assets',
          description:
            'Output some assets, such as database files and images, as packed files. This reduces the number of asset load requests, but may slow down loading on some distribution servers.',
        },
        excludeSourceFiles: {
          label: 'Exclude source files',
          description: 'Exclude source files that are not required for browser playback from the output ZIP.',
          patternsLabel: 'File patterns to exclude',
          patternsDescription: 'Enter one pattern per line. The default excludes save data files.',
        },
        omitUnusedAssets: {
          label: 'Remove unused assets',
          description:
            'Detect assets that are not referenced by the game and exclude them from the output ZIP. [Caution] Assets referenced from RGSS3 scripts cannot be detected, so add them to the patterns of assets not to delete.',
          patternsLabel: 'Asset patterns to keep',
          patternsDescription: 'Enter one pattern per line for assets that should remain even if detected as unused.',
        },
        htmlInjection: {
          label: 'Inject HTML into the player page',
          description: 'Insert custom HTML into the player page for analytics or additional scripts.',
          importButton: 'Load HTML file',
          contentLabel: 'HTML to inject',
          contentDescription: 'Replaces <!-- USER-SCRIPT --> in the player template with this content.',
        },
      },
      conversion: {
        heading: 'Convert',
        download: 'Download converted ZIP',
        preview: 'Preview result',
        converting: 'Converting game',
        convert: 'Convert game',
        previewDialogLabel: 'Converted result preview',
        previewTitle: 'Preview',
        close: 'Close',
        summary: {
          title: 'Conversion complete',
          zipFilename: 'Generated file',
          zipSize: 'ZIP size',
          gameTitle: 'Game title',
          gameId: 'Save data ID',
          screenSize: 'Screen size',
          virtualGamepad: 'Virtual gamepad',
          converted: 'Converted',
          omitted: 'Omitted',
          warnings: 'Warnings',
        },
        errors: {
          noProject: 'Select a project to convert.',
        },
      },
    },
  },
  ja: {
    brand: 'VX Ace Web Runtime',
    header: {
      menu: {
        open: 'メニューを開く',
        close: 'メニューを閉じる',
      },
      navLabel: 'グローバルナビゲーション',
      nav: {
        home: 'ホーム',
        converter: '変換ツール',
      },
      languageLabel: '言語',
      languages: {
        en: 'English',
        ja: '日本語',
      },
    },
    footer: {
      note: '本プロジェクトは非公式のものです。RPGツクールの開発元であるGotcha Gotcha Gamesとは関係ありません。',
    },
    landing: {
      page: {
        title: 'VX Ace Web Runtime',
        description: 'VX Ace Web Runtime は、RPGツクールVX Ace製ゲーム向けの非公式ブラウザ実行環境です。',
      },
      hero: {
        heading: ['RPGツクール', 'VX Ace', 'の', 'ゲームを', 'ブラウザで動かす'],
        copy: 'VX Ace Web Runtimeは、RPGツクールVX Aceのゲームをブラウザ上でプレイできるようにする非公式プロジェクトです。',
        converterAction: 'ゲームを変換する',
        githubAction: 'GitHub',
      },
      demo: {
        heading: 'デモ',
        play: 'デモをプレイ',
        title: 'VX Ace Web Runtime デモ',
      },
      about: {
        heading: 'VX Ace Web Runtimeとは',
        paragraphs: [
          'VX Ace Web Runtimeは、RPGツクールVX Ace製ゲーム向けの非公式ブラウザ実行環境です。',
          'このプロジェクトでは、RPGツクールVX Aceのゲームをブラウザ上で動作させるための互換ランタイムテンプレートと、その互換ランタイムを利用した公開用のコンバーターを提供します。',
        ],
        unofficial: 'RPGツクールの開発元である Gotcha Gotcha Games 様とは一切関係のない非公式プロジェクトです。',
      },
      development: {
        heading: '開発とソースコード',
        body: 'ランタイム、コンバーター、サイトのソースコードは GitHub 上で公開しています。',
        disclaimer: {
          beforeAuthor: '本プロジェクトの開発は ',
          author: {
            label: 'Ruたん',
            url: 'https://github.com/rutan',
          },
          afterAuthor: ' が個人で行っており、サポートは提供されていません。',
          caution: '利用にあたっては自己責任でお願いします。',
        },
        action: 'GitHubで見る',
      },
      mechanism: {
        heading: '仕組み',
        paragraphs: [
          'Ruby.wasm と Pixi.js を使用してRGSS3の動作を再現する互換ランタイムを作成しています。',
          'Rubyバージョンの違いやブラウザの制約により、RPGツクールVX Aceの挙動と一部差異はありますが、多くのゲームが動作することを期待しています。',
          '※ すべてのゲームの動作を保証するものではありません。また性質上、長時間のプレイや大規模なゲームでは動作が不安定になる可能性があります。',
        ],
        compatibility: {
          heading: '対応状況',
          items: [
            {
              feature: 'マップ・イベント',
              status: '動作します',
            },
            {
              feature: '戦闘',
              status: '動作します',
            },
            {
              feature: 'RGSS3スクリプト',
              status: 'ほとんど動作します',
              notes: [
                {
                  codes: ['Win32API', 'dl'],
                  after: ' などの一部機能は部分的な対応となります',
                },
              ],
            },
            {
              feature: '暗号化アーカイブ',
              status: '非対応',
            },
            {
              feature: 'ファイル名の扱い',
              status:
                'ファイル名の対応表を用いて、日本語ファイル名や英字の大文字・小文字の違いを RPGツクールVX Ace に近い形で解決します',
            },
            {
              feature: 'ファイルの書き込み（セーブなど）',
              status: 'ほとんど対応',
              notes: [
                {
                  before:
                    'ブラウザの制約上、データの書き込みは IndexedDB を用いて行います。大容量ファイルの書き込みは失敗する場合があります。',
                },
              ],
            },
            {
              feature: 'スマートフォン',
              status: '仮想ゲームパッドで動作',
              notes: [
                {
                  before: 'iOSは最新のバージョンのみ対応しています',
                },
              ],
            },
          ],
        },
      },
      howToUse: {
        heading: '使い方',
        easy: {
          heading: '手軽に使う（おすすめ）',
          body: 'ブラウザから利用できるコンバーターを公開しています。作成したRPGツクールVX Aceのゲームをzip形式でドラッグ＆ドロップすることで、ブラウザ上で動作するゲームデータに変換できます。',
          action: 'ブラウザ上で変換する',
        },
        advanced: {
          heading: '高度な使い方',
          body: '以下の npm パッケージを公開しています。ビルドプロセスに組み込みたい場合や、独自のコンバーターを作成したい場合にご利用ください。',
          packages: [
            {
              name: '@rutan/rpgmaker-vxace-web-player-template',
              description: 'RPGツクールVX Aceのゲームをブラウザ上で動作させるための互換ランタイムのテンプレート',
            },
            {
              name: '@rutan/rpgmaker-vxace-web-converter-core',
              description: 'RPGツクールVX Aceのゲームをブラウザ上で動作するゲームデータに変換するためのコンバーター',
            },
            {
              name: '@rutan/rpgmaker-vxace-web-converter-cli',
              description: 'RPGツクールVX Aceのゲームをブラウザ上で動作するゲームデータに変換するCLIツール',
            },
          ],
        },
      },
    },
    converter: {
      page: {
        title: '変換ツール | VX Ace Web Runtime',
        description: 'ブラウザ上で VX Ace プロジェクトを変換し、配布用 ZIP を生成します。',
      },
      intro: {
        heading: ['RPGツクール', 'VX Aceの', 'ゲームを', 'ブラウザ向けに', '変換'],
        body: 'ゲームフォルダを読み込み、ブラウザで動作する公開用 ZIP を生成します。変換処理はすべてブラウザ内で実行され、サーバーには送信されません。',
      },
      preparation: {
        heading: ['変換前の', '準備'],
        body: '以下の手順でRPGツクール VX Ace のゲームデータを準備してください。',
        items: [
          {
            heading: 'RTPを含めて出力',
            body: 'RPGツクールVX Ace の「ゲームデータの圧縮」で「RTPのデータを含める」にチェックを入れて出力します。暗号化アーカイブは使用できません。',
          },
          {
            heading: '作成されたデータを展開',
            body: '出力された圧縮ファイルを任意の場所に展開します。',
          },
          {
            heading: 'Game.ini を確認',
            body: '展開したフォルダの直下に Game.ini、Data、Graphics、Audio などがあることを確認します。',
          },
        ],
      },
      projectSelection: {
        heading: ['ゲームデータを', '選択'],
        loadedHeading: '読み込みが完了しました',
        loadedBody: '{fileCount} 件のファイルを読み込みました。',
        reset: '取り消す',
        readingHeading: '読み込み中です',
        dropHeading: 'プロジェクトフォルダをここにドロップ',
        body: 'VX Ace のプロジェクトフォルダを選択してください。',
        selectFolder: 'フォルダを選択',
        errors: {
          noFiles: 'ファイルが見つかりませんでした。',
          invalidProject:
            'VX Ace プロジェクトとして読み込めませんでした。Game.ini が入っているプロジェクトフォルダを選択してください。',
        },
      },
      gameSettings: {
        heading: 'ゲーム設定',
        title: {
          label: 'ゲームタイトル',
          description: 'ブラウザのタイトルバーや変換結果のファイル名に使われるゲーム名です。',
          required: 'Title を入力してください。',
        },
        gameId: {
          label: '保存データID',
          description: 'セーブデータを識別するためのIDです。公開後に変更すると、既存のセーブデータを引き継げません。',
          warning: '半角英数字で始まり、半角英数字・ピリオド・アンダースコア・コロン・ハイフンが使用できます。',
          invalid: 'Game ID は英数字で始まる 128 文字以内の ID にしてください。',
        },
        screenSize: {
          label: '画面サイズ',
          description: 'ゲーム画面の表示サイズです。VX Ace 標準は 544 x 416 px です。',
          widthLabel: '画面の幅',
          heightLabel: '画面の高さ',
          invalidWidth: 'Screen Width が不正です。',
          invalidHeight: 'Screen Height が不正です。',
        },
        virtualGamepad: {
          label: 'スマホ向けバーチャルパッド',
          description: 'タッチ操作時に表示する画面上のゲームパッドを選択します。',
          options: {
            normal: '一通りのボタンを表示する（通常の配置）',
            'normal-swap': '決定・キャンセルの位置を入れ替える',
            simple: '方向キーと決定・キャンセルだけを表示する',
            none: '画面上のゲームパッドを表示しない',
          },
        },
      },
      advancedSettings: {
        heading: '上級者向け設定',
        packAssets: {
          label: 'アセットをパック化する',
          description:
            'データベースや画像などの一部アセットをパック化して出力します。アセットの読み込み回数が削減されますが、配信サーバーによっては逆に遅くなる場合があります。',
        },
        excludeSourceFiles: {
          label: '変換元ファイルを除外する',
          description: 'ブラウザ実行に不要な変換元ファイルを、出力 ZIP から除外します。',
          patternsLabel: '除外するファイルパターン',
          patternsDescription: '1行につき1パターンを指定します。初期値ではセーブデータファイルを除外します。',
        },
        omitUnusedAssets: {
          label: '未使用アセットを削除する',
          description:
            'ゲームから参照されていないアセットを検出し、出力 ZIP から除外します。【注意】RGSS3スクリプト内から参照されているアセットは検出できないため、手動で削除しないアセットパターンに追加してください。',
          patternsLabel: '削除しないアセットパターン',
          patternsDescription: '未使用と判定されても残したいアセットがある場合に、1行につき1パターンで指定します。',
        },
        htmlInjection: {
          label: 'プレイヤーページに HTML を挿入する',
          description:
            'プレイヤーページに任意の HTML を挿入します。アクセス解析や追加スクリプトが必要な場合に使います。',
          importButton: 'HTML ファイルを読み込む',
          contentLabel: '挿入する HTML',
          contentDescription: 'player template の <!-- USER-SCRIPT --> をこの内容で置換します。',
        },
      },
      conversion: {
        heading: '変換する',
        download: '変換したZIPをダウンロード',
        preview: 'プレビューで確認',
        converting: 'ゲームを変換中',
        convert: 'ゲームを変換する',
        previewDialogLabel: '変換結果のプレビュー',
        previewTitle: 'プレビュー',
        close: '閉じる',
        summary: {
          title: '変換が完了しました',
          zipFilename: '生成ファイル',
          zipSize: 'ZIP サイズ',
          gameTitle: 'ゲームタイトル',
          gameId: '保存データID',
          screenSize: '画面サイズ',
          virtualGamepad: 'バーチャルパッド',
          converted: 'Converted',
          omitted: 'Omitted',
          warnings: 'Warnings',
        },
        errors: {
          noProject: '変換対象のプロジェクトを選択してください。',
        },
      },
    },
  },
} satisfies Record<I18nLang, SiteCopy>;

export type { ConverterCopy, SiteCopy };
