import type { Translation } from '../i18n-types.js';

const ja = {
  actions: {
    add: '追加',
    backToSettings: '設定に戻る',
    browseFile: 'ファイルを選択',
    browseFolder: 'フォルダを選択',
    close: '閉じる',
    convert: '変換する',
    open: '開く',
    openBrowser: 'ブラウザを開く',
    openOutputFolder: '出力フォルダを開く',
    previewInBrowser: 'ブラウザでプレビュー',
    remove: '削除',
    stopPreview: 'プレビューを終了する',
  },
  advanced: {
    excludeSourceFilePatterns: '除外する変換元ファイルのパス',
    excludeSourceFiles: '変換元ファイルを除外する',
    injectHtml: 'プレイヤーページに HTML を挿入する',
    injectHtmlFiles: '挿入する HTML ファイル',
    keepUnusedAssets: '削除しないアセットのパス',
    noInjectHtmlFiles: 'HTML ファイルが選択されていません。',
    omitUnusedAssets: '未使用アセットを削除する',
    packAssets: 'アセットをパック化する',
    title: '上級者向け設定',
  },
  app: {
    language: '言語',
    languageEnglish: '英語',
    languageJapanese: '日本語',
  },
  errors: {
    title: 'エラー内容',
    unknown: '予期しないエラーが発生しました。',
    app: {
      apiUnavailableMessage: 'Electron の変換 API が利用できません。',
      apiUnavailableTitle: 'アプリの初期化に失敗しました。',
    },
    draft: {
      cleanOutDir: {
        invalid: '出力先の削除設定が正しくありません。',
      },
      gameId: {
        invalid:
          '保存データIDは半角英数字で始め、半角英数字・ドット・ハイフン・アンダースコア・コロンで入力してください。',
      },
      excludeSourceFilePatterns: {
        invalid: '除外する変換元ファイルの設定が正しくありません。',
      },
      keepUnusedAssetsPatterns: {
        invalid: '保持するアセットパスの設定が正しくありません。',
      },
      injectHtmlFilePaths: {
        invalid: '挿入する HTML ファイルの設定が正しくありません。',
      },
      outDir: {
        required: '出力フォルダを選択してください。',
      },
      outputSubdirectoryName: {
        invalid: '作成するフォルダ名が正しくありません。',
        required: '作成するフォルダ名を入力してください。',
      },
      packAssets: {
        invalid: 'アセットのパック化設定が正しくありません。',
      },
      screen: {
        invalid: '画面サイズは1以上の整数で入力してください。',
      },
      srcDir: {
        required: 'ゲームフォルダを選択してください。',
      },
      title: {
        required: 'ゲームタイトルを入力してください。',
      },
      useOmitUnusedAssets: {
        invalid: '未使用アセットの削除設定が正しくありません。',
      },
      useInjectHtml: {
        invalid: 'HTML 挿入の設定が正しくありません。',
      },
      useExcludeSourceFiles: {
        invalid: '変換元ファイルの除外設定が正しくありません。',
      },
      virtualGamepad: {
        invalid: 'スマホ向けバーチャルパッドの設定が正しくありません。',
      },
    },
    gameDirectory: {
      analysisFailedTitle: 'ゲームフォルダを確認できませんでした。',
    },
    gameRoot: {
      gameIniMissing: 'Game.ini が見つかりません。RPGツクールVX Aceのゲームフォルダを選択してください。',
    },
    output: {
      containsSource: '出力先はゲームフォルダを含む親フォルダにできません。',
      existingFiles: '出力先フォルダに既存のファイルがあります。置き換える場合は確認チェックを入れてください。',
      insideSource: '出力先はゲームフォルダの中に作成できません。',
      openFailed: '出力フォルダを開けませんでした。{message}',
      sameAsSource: '出力先はゲームフォルダとは別の場所を選択してください。',
    },
    preview: {
      root: {
        required: 'プレビューするフォルダがありません。',
      },
      rootMissing: 'プレビューする出力フォルダが見つかりません。',
      rootNotDirectory: 'プレビューする出力先はフォルダを指定してください。',
      serverNotRunning: 'プレビューサーバーが起動していません。',
      startFailed: 'プレビューサーバーの起動に失敗しました。',
    },
    settingsFile: {
      invalid: '設定ファイルの形式が正しくありません。',
      operationFailedTitle: '設定ファイルの操作に失敗しました。',
      readFailed: '設定ファイルを読み込めませんでした。{message}',
      unsupportedVersion: 'この設定ファイルのバージョンには対応していません。',
      writeFailed: '設定ファイルを書き込めませんでした。{message}',
    },
  },
  main: {
    fileMenu: 'ファイル',
    newDraft: '新規',
    openSettingsFile: '設定ファイルを開く',
    quit: '終了',
    saveSettingsFile: '設定ファイルを保存する',
    selectGameDirectory: 'RPGツクールVX Aceのゲームフォルダを選択',
    selectHtmlInjectionFiles: '挿入する HTML ファイルを選択',
    selectOutputDirectory: '変換後の出力先を選択',
    settingsMenu: '設定',
    viewMenu: '表示',
  },
  preview: {
    starting: 'プレビューサーバーを起動しています。',
    title: 'ブラウザでプレビュー',
  },
  progress: {
    converting: '変換中です。完了するまでこの画面を閉じないでください。',
  },
  result: {
    convertedFiles: '出力ファイル',
    errorTitle: '変換に失敗しました',
    generatedFile: '生成ファイル',
    noConvertedFiles: '出力されたファイルはありません',
    noOmittedFiles: '除外されたファイルはありません',
    noSummary: '変換結果のサマリーがありません',
    omittedFiles: '除外ファイル',
    omittedReasonSourceFile: '変換元ファイル',
    omittedReasonUnusedAsset: '未使用アセット',
    source: '変換元',
    successTitle: '変換が完了しました！',
  },
  settings: {
    cleanOutput: '出力先に既存ファイルがある場合は、削除してから変換する',
    gameId: {
      description: 'ゲームごとに個別のIDを設定してください。半角の英数字と記号のみ使用可能です。',
      example: '「作者名:ゲーム名」などを想定しています。（例: rutan:rpg-quest）',
      label: '保存データID',
      warning: 'ゲーム公開後に別のIDに変更すると、セーブデータが引き継がれません。',
    },
    output: {
      actualDirectoryLabel: '実際の出力先:',
      description: '変換後の Web 公開用ファイルを出力するフォルダを選択します。',
      parentDirectoryLabel: '親フォルダ',
      subdirectoryNameLabel: '作成するフォルダ名',
      subdirectoryNamePlaceholder: 'Example Game',
      title: '出力先を選択',
    },
    placeholder: {
      noSelection: '未選択',
      title: 'ブラウザのタイトルバーに表示される名前を入力してください。',
    },
    screen: {
      height: '高さ',
      label: '画面サイズ',
      width: '幅',
    },
    source: {
      description:
        'RPGツクールVX Ace で作成されたゲームフォルダを選択します。プロジェクトフォルダ、またはデプロイメントしたフォルダを選択できます。',
      title: '変換するゲームを選択',
    },
    title: {
      description: 'ゲームタイトルなどの変換設定を入力します。',
      label: 'ゲームタイトル',
      title: '変換設定',
    },
    virtualGamepad: {
      label: 'スマホ向けバーチャルパッドの表示',
      options: {
        none: 'なし',
        normal: '標準',
        normalSwap: '決定・キャンセル入れ替え',
        simple: 'シンプル',
      },
    },
  },
} satisfies Translation;

export default ja;
