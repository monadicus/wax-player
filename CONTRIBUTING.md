# Contributing

## Setup

```bash
nvm use
npm install
```

Use a local environment file for the target station:

```bash
VITE_STATION_NAME=my-station
```

The repository pins Node in `.nvmrc` to the current latest release.

## Common Commands

```bash
nvm use
npm run dev
npm test
npm run lint
npm run build
```

## Scope

This repository is intentionally narrow:

- one embedded player
- one configurable station per deployment
- public WaxLive API and websocket integrations only
- copy-paste embedding through `public/embed.js`

Keep changes small, testable, and easy to review.
