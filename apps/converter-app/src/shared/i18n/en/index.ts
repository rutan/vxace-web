import type { BaseTranslation } from '../i18n-types.js';

const en = {
  actions: {
    add: 'Add',
    backToSettings: 'Back to settings',
    browseFile: 'Select file',
    browseFolder: 'Select folder',
    close: 'Close',
    convert: 'Convert',
    open: 'Open',
    openBrowser: 'Open browser',
    openOutputFolder: 'Open output folder',
    previewInBrowser: 'Preview in browser',
    remove: 'Remove',
    stopPreview: 'Stop preview',
  },
  advanced: {
    excludeSourceFilePatterns: 'Exclude source files matching these paths',
    excludeSourceFiles: 'Exclude source files',
    injectHtml: 'Inject HTML into the player page',
    injectHtmlFiles: 'HTML files to inject',
    keepUnusedAssets: 'Keep assets matching these paths',
    noInjectHtmlFiles: 'No HTML files selected.',
    omitUnusedAssets: 'Remove unused assets',
    packAssets: 'Pack assets',
    title: 'Advanced settings',
  },
  app: {
    language: 'Language',
    languageEnglish: 'English',
    languageJapanese: 'Japanese',
  },
  errors: {
    title: 'Error details',
    unknown: 'An unexpected error occurred.',
    app: {
      apiUnavailableMessage: 'The Electron converter API is not available.',
      apiUnavailableTitle: 'Failed to initialize the app.',
    },
    draft: {
      cleanOutDir: {
        invalid: 'The output cleanup setting is invalid.',
      },
      gameId: {
        invalid:
          'Save data ID must start with a half-width alphanumeric character and may contain half-width alphanumerics, periods, hyphens, underscores, and colons.',
      },
      excludeSourceFilePatterns: {
        invalid: 'The source file paths to exclude setting is invalid.',
      },
      keepUnusedAssetsPatterns: {
        invalid: 'The asset paths to keep setting is invalid.',
      },
      injectHtmlFilePaths: {
        invalid: 'The HTML injection file paths setting is invalid.',
      },
      outDir: {
        required: 'Select an output folder.',
      },
      outputSubdirectoryName: {
        invalid: 'The output folder name is invalid.',
        required: 'Enter the folder name to create.',
      },
      packAssets: {
        invalid: 'The asset packing setting is invalid.',
      },
      screen: {
        invalid: 'Screen size must be an integer greater than or equal to 1.',
      },
      srcDir: {
        required: 'Select a game folder.',
      },
      title: {
        required: 'Enter a game title.',
      },
      useOmitUnusedAssets: {
        invalid: 'The unused asset removal setting is invalid.',
      },
      useInjectHtml: {
        invalid: 'The HTML injection setting is invalid.',
      },
      useExcludeSourceFiles: {
        invalid: 'The source file exclusion setting is invalid.',
      },
      virtualGamepad: {
        invalid: 'The mobile controls setting is invalid.',
      },
    },
    gameDirectory: {
      analysisFailedTitle: 'Could not verify the game folder.',
    },
    gameRoot: {
      gameIniMissing: 'Game.ini was not found. Select a RPG Maker VX Ace game folder.',
    },
    output: {
      containsSource: 'The output folder cannot be a parent folder that contains the game folder.',
      existingFiles: 'The output folder already contains files. Enable the confirmation checkbox to replace them.',
      insideSource: 'The output folder cannot be created inside the game folder.',
      openFailed: 'Could not open the output folder. {message:string}',
      sameAsSource: 'Select an output folder separate from the game folder.',
    },
    preview: {
      root: {
        required: 'No folder is available for preview.',
      },
      rootMissing: 'The output folder for preview was not found.',
      rootNotDirectory: 'Select a folder as the preview output target.',
      serverNotRunning: 'The preview server is not running.',
      startFailed: 'Failed to start the preview server.',
    },
    settingsFile: {
      invalid: 'The settings file is invalid.',
      operationFailedTitle: 'Settings file operation failed.',
      readFailed: 'Failed to read the settings file. {message:string}',
      unsupportedVersion: 'This settings file version is not supported.',
      writeFailed: 'Failed to write the settings file. {message:string}',
    },
  },
  main: {
    fileMenu: 'File',
    newDraft: 'New',
    openSettingsFile: 'Open Settings File',
    quit: 'Quit',
    saveSettingsFile: 'Save Settings File',
    selectGameDirectory: 'Select a RPG Maker VX Ace game folder',
    selectHtmlInjectionFiles: 'Select HTML files to inject',
    selectOutputDirectory: 'Select an output folder for web publishing',
    settingsMenu: 'Settings',
    viewMenu: 'View',
  },
  preview: {
    starting: 'Starting the preview server.',
    title: 'Preview in browser',
  },
  progress: {
    converting: 'Converting. Do not close this screen until conversion finishes.',
  },
  result: {
    convertedFiles: 'Output files',
    errorTitle: 'Conversion failed',
    generatedFile: 'Generated file',
    noConvertedFiles: 'No files were output.',
    noOmittedFiles: 'No files were excluded.',
    noSummary: 'No conversion summary is available.',
    omittedFiles: 'Excluded files',
    omittedReasonSourceFile: 'Source file',
    omittedReasonUnusedAsset: 'Unused asset',
    source: 'Source',
    successTitle: 'Conversion complete!',
  },
  settings: {
    cleanOutput: 'Delete existing files in the output folder before conversion',
    gameId: {
      description: 'Set a unique ID for each game. Only half-width alphanumeric characters and symbols are allowed.',
      example: 'Expected format: author:game-title. Example: rutan:rpg-quest',
      label: 'Save data ID',
      warning: 'Changing this ID after publishing the game prevents existing save data from carrying over.',
    },
    output: {
      actualDirectoryLabel: 'Actual output folder:',
      description: 'Select the folder where the converted web publishing files will be written.',
      parentDirectoryLabel: 'Parent folder',
      subdirectoryNameLabel: 'Folder name to create',
      subdirectoryNamePlaceholder: 'Example Game',
      title: 'Select output destination',
    },
    placeholder: {
      noSelection: 'Not selected',
      title: 'Enter the name shown in the browser title bar.',
    },
    screen: {
      height: 'Height',
      label: 'Screen size',
      width: 'Width',
    },
    source: {
      description:
        'Select a game folder created with RPG Maker VX Ace. You can select either a project folder or a deployed folder.',
      title: 'Select a game to convert',
    },
    title: {
      description: 'Enter conversion settings such as the game title.',
      label: 'Game title',
      title: 'Conversion settings',
    },
    virtualGamepad: {
      label: 'Mobile virtual gamepad',
      options: {
        none: 'None',
        normal: 'Standard',
        normalSwap: 'Swap confirm/cancel',
        simple: 'Simple',
      },
    },
  },
} satisfies BaseTranslation;

export default en;
