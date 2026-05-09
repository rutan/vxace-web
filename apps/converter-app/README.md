# rpgmaker-vxace-web-converter-app

Desktop converter application for RPG Maker VX Ace Web.

## Overview

This app provides an Electron-based desktop UI for converting RPG Maker VX Ace
games into browser-ready distributions.

It uses `@rutan/rpgmaker-vxace-web-converter-core` for conversion, wraps the
core options in a guided UI, and includes a local preview server for checking
the converted output in a browser.

Use this app when you want a graphical conversion workflow. If you need
automation or CI integration, use
`@rutan/rpgmaker-vxace-web-converter-cli` instead.

## Features

- Select a VX Ace project or deployed game directory.
- Select an output directory for web publishing files.
- Read the game title from `Game.ini` during source folder analysis.
- Configure title, save data ID, screen size, and mobile virtual gamepad mode.
- Advanced options
  - delete existing files in the output directory before conversion.
  - pack assets.
  - exclude source files such as save data.
  - omit assets that are statically detected as unused.
- Save and reopen converter settings as JSON files.
- Persist the latest draft automatically in the app user data directory.
- Preview the converted output through a local `127.0.0.1` web server.

## Development

### Requirements

- Node.js `>=24.0.0`
- pnpm `10.33.1`

### Commands

```bash
# install dependencies
pnpm install

# run in development mode
pnpm run dev

# test
pnpm run test

# lint
pnpm run lint

# format
pnpm run format

# build the app
pnpm run build
pnpm run gen-package
```

## License

MIT License.
