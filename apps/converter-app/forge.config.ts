import { cp, rm } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { normalize as normalizePosix } from 'node:path/posix';
import { fileURLToPath } from 'node:url';
import type { ForgeConfig } from '@electron-forge/shared-types';
import packageJSON from './package.json' with { type: 'json' };

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const config: ForgeConfig = {
  packagerConfig: {
    name: 'rpgmaker-vxace-web-converter',
    icon: resolve(__dirname, 'resources/icon'),
    appVersion: packageJSON.version,
    appCopyright: packageJSON.author,
    asar: true,
    ignore: (filePath) => {
      const normalizedFilePath = normalizePosix(filePath);

      if (normalizedFilePath === '.') return false;
      if (normalizedFilePath.startsWith('/dist')) return false;
      if (normalizedFilePath.startsWith('/package.json')) return false;

      return true;
    },
    // Because it doesn't work with pnpm / workspace
    prune: false,
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
      config: {},
    },
  ],
  hooks: {
    packageAfterCopy: async (_config, buildPath, _electronVersion, _platform, _arch) => {
      // copy dependencies to buildPath/node_modules (resolve to avoid issues with pnpm / workspace)
      const dependencies = Object.keys(packageJSON.dependencies || {});
      for (const dep of dependencies) {
        await cp(resolve(__dirname, `./node_modules/${dep}`), resolve(buildPath, `node_modules/${dep}`), {
          recursive: true,
          dereference: true,
        });
      }
    },
    postPackage: async (_config, { outputPaths }) => {
      // Remove unnecessary locale files from Electron (except English and Japanese)
      for (const outputPath of outputPaths) {
        const localesPath = resolve(outputPath, 'locales');

        const files = glob(`${localesPath}/*.pak`);
        for await (const file of files) {
          const fileName = basename(file);
          if (fileName.startsWith('en-')) continue;
          if (fileName === 'ja.pak') continue;

          await rm(file, { force: true });
        }
      }
    },
  },
};

export default config;
