# RPG Maker VX Ace Web

| **English** | [日本語](./README.ja.md) |
| ----------- | ------------------------ |

RPG Maker VX Ace games in the browser.

## Overview

RPG Maker VX Ace Web is a development project for running games made with
[RPG Maker VX Ace](https://rpgmakerofficial.com/product/products/rpgvxace/index/)
in a web browser.

The project provides an RGSS3-compatible browser runtime and converter tooling
for building browser-ready game packages. The runtime is designed to run the
original guest game code and data as-is whenever possible, instead of requiring
game-specific patches or script rewrites.

## Project goals

- Run RPG Maker VX Ace games in the browser.
- Preserve compatibility with existing VX Ace game data and guest scripts.
- Provide converter tooling for generating browser-ready deployment packages.
- Keep the runtime game-agnostic: game logic belongs to `Scripts.rvdata2`, not
  to this repository.

## How to use

### Windows application

[Download from the releases page](https://github.com/rutan/vxace-web/releases?q=rpgmaker-vxace-web-converter-app&expanded=false)

### Command-line converter

Install from npm: `npm install -g @rutan/rpgmaker-vxace-web-converter-cli`

See the [README](./packages/converter-cli/README.md) of `@rutan/rpgmaker-vxace-web-converter-cli` for details.

## Packages

- [game-manifest](./packages/game-manifest): Manifest schema and utilities for
  game metadata, resource lookup, asset packaging, and runtime feature flags.
- [player-template](./packages/player-template): Browser player template and
  RGSS3-compatible runtime built on ruby.wasm and PixiJS.
- [converter-core](./packages/converter-core): Core conversion library for
  packaging VX Ace games for web deployment.
- [converter-cli](./packages/converter-cli): Command-line converter built on
  `converter-core`.
- [converter-app](./apps/converter-app): Electron-based desktop converter application
  built on `converter-core` with a GUI.

## Development

```bash
# Building the project (with turborepo)
pnpm run build

# Linting code
pnpm run lint

# Running tests
pnpm run test

# Formatting code (after editing)
pnpm run format
```

## Documentation

- [Runtime policy](./packages/player-template/docs/runtime-policy.md): Runtime
  responsibilities, boundaries, and compatibility policy for the player
  template.
- [Browser testing](./packages/player-template/docs/browser-testing.md): Browser
  smoke test and artifact collection workflow for the player template.

## License

The source code in this repository is distributed under the
[MIT License](./LICENSE).

Game data and assets under [`example/`](./example/) are not included in npm
packages and are not covered by the MIT License. They are distributed as RPG
Maker VX Ace user games under the
[RPG Maker Official terms](https://rpgmakerofficial.com/support/rule/),
including the game distribution conditions.

RPG Maker VX Ace, RTP assets, and converted game assets are subject to their own
licenses and terms. Make sure you have the rights to distribute any game data
and assets included in a web deployment.

See [NOTICE.md](./NOTICE.md) for additional notices.

## Disclaimer

- This project is developed by an individual and is not an official RPG Maker
  product or service.
- No support or warranty is provided. Use at your own risk.
