import type { BaseTranslation } from '../i18n-types.js';

const en = {
  app: {
    title: 'RPG Maker VX Ace Web Playground',
  },
  header: {
    help: 'What is this?',
    reset: 'Reset',
    language: 'Language',
  },
  dropZone: {
    title: 'Select exported RPG Maker VX Ace game data',
    description: 'Drop or choose the extracted game folder that contains Game.ini and bundled RTP assets.',
    chooseFolder: 'Choose folder',
    loading: 'Loading...',
  },
  game: {
    defaultTitle: 'RPG Maker VX Ace Game',
  },
  errors: {
    missingGameIni: 'Game.ini was not found. Choose an RPG Maker VX Ace project folder.',
    missingScripts: 'Data/Scripts.rvdata2 was not found. An unencrypted RPG Maker VX Ace project is required.',
  },
  warnings: {
    duplicateResourceCandidate: 'Duplicate resource candidate: {key:string} ({candidateKey:string})',
  },
  help: {
    overview: {
      title: 'Overview',
      paragraph1:
        'RPG Maker VX Ace Web Playground is a tool for trying your own RPG Maker VX Ace project directly in the browser.',
      paragraph2: 'Game data is processed only inside your browser and is not uploaded to a server.',
      paragraph3: 'This tool is unofficial and is not affiliated with Gotcha Gotcha Games Inc.',
    },
    usage: {
      title: 'How to use',
      steps: {
        export: {
          title: 'Export with RTP',
          description:
            'In RPG Maker VX Ace, use Compress Game Data and enable Include RTP Data before exporting. Encrypted archives cannot be used.',
        },
        extract: {
          title: 'Extract the output',
          description: 'Extract the generated archive to a folder.',
        },
        confirm: {
          title: 'Check Game.ini',
          description:
            'Make sure Game.ini, Data, Graphics, Audio, and other game files are directly inside the extracted folder.',
        },
        drop: {
          title: 'Drop the folder',
          description:
            'Drag and drop the folder that contains Game.ini into this page, or load it with the folder picker.',
        },
      },
    },
    limitations: {
      title: 'Limitations',
      intro: 'Because this runs in a browser, some limitations apply.',
      rtp: 'The original project folder usually does not include RTP assets. Use exported game data that includes RTP assets.',
      encryptedData: 'Encrypted RPG Maker VX Ace data is not supported.',
      media: 'MIDI playback and movie playback are not supported.',
      scripts: 'Some RGSS3 scripts may not work correctly.',
      other: 'Other things may also fail to work.',
      desktop: 'This Playground page is intended for desktop use. It may not work correctly on smartphones or tablets.',
    },
    author: {
      title: 'Created by',
      name: 'Rutan',
      repository: 'GitHub repository',
    },
    licenses: {
      title: 'OSS Licenses',
      playground: 'View licenses of libraries used in the Playground application.',
      runtime: 'View licenses of libraries used in the Web Player Runtime.',
    },
    legal: {
      trademark: 'RPG MAKER is a registered trademark or trademark of Gotcha Gotcha Games Inc.',
      copyright: '©2011 Gotcha Gotcha Games Inc./YOJI OJIMA',
    },
    close: 'Close',
  },
} satisfies BaseTranslation;

export default en;
