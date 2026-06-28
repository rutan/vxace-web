# rpgmaker-vxace-web-playground

Browser playground for trying RPG Maker VX Ace projects with VX Ace Web
Runtime.

## Overview

This app lets a user load a local RPG Maker VX Ace game directory directly in
the browser and try it with the web player runtime.

The playground reads dropped or selected files from the browser File API,
generates an in-memory game manifest, and runs the bundled
`@rutan/rpgmaker-vxace-web-player-template` inside an iframe. The game files are
not uploaded to a server; they are passed to the iframe in the current browser
session.

Use this app for quick compatibility checks while developing the runtime. For a
browser-ready distribution that can be hosted or published, use the converter
packages instead:

- `@rutan/rpgmaker-vxace-web-converter-cli`
- `@rutan/rpgmaker-vxace-web-converter-core`
- `rpgmaker-vxace-web-converter-app`

## Development

### Requirements

- Node.js `>=24.0.0`
- pnpm `10.33.1`

### Commands

From the repository root:

```bash
# install dependencies
pnpm install

# run in development mode
pnpm -run dev

# build
pnpm run build

# test
pnpm run test

# lint
pnpm run lint

# format
pnpm run format
```

## License

MIT License.
