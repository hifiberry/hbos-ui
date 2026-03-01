# Getting Started

This guide walks a new developer through setting up the project locally and making their first change.

## Prerequisites

- **Node.js** v22 or higher — [download](https://nodejs.org/en)
- **Git**
- A code editor — [VSCode](https://code.visualstudio.com/) is recommended (see `.vscode/extensions.json` for suggested extensions)

Familiarity with [Vue 3](https://vuejs.org/), [TypeScript](https://www.typescriptlang.org/), and [Pinia](https://pinia.vuejs.org/) will help, but you can pick things up as you go.

## 1. Clone and install

```bash
git clone https://github.com/hifiberry/hbos-ui.git
cd hbos-ui
npm install
```

## 2. Start the development server

```bash
npm run dev
```

This starts the Vite dev server at `http://localhost:5173`. The app will load, but all API calls will fail because there is no backend running locally — that is expected.

## 3. Connect to a real HiFiBerry device (recommended)

To get a fully functional UI, proxy API traffic to a real HiFiBerry device on your network.

**Step 1:** Copy the sample config:

```bash
cp vite.config.dev-server.ts.sample vite.config.dev-server.ts
```

**Step 2:** Open `vite.config.dev-server.ts` and set `deviceIP` to the IP address of your HiFiBerry device:

```typescript
const deviceIP = '192.168.1.42'  // ← your device IP here
const devicePort = '80'
```

**Step 3:** Start the server using the dev-server config:

```bash
npm run dev-server
```

Vite will proxy all `/api/*` requests to the device. The UI runs locally while data comes from the real backend.

> **Tip:** Use `npm run dev-server-expose` or `npm run dev-expose` to make the dev server accessible on your local network (e.g. from a phone or tablet).

## 4. Explore the project

See [Architecture](./architecture.md) for a full breakdown. A quick orientation:

| Path | What it is |
|------|-----------|
| `src/views/` | Top-level pages (now-playing, library, sound, services) |
| `src/components/` | Reusable UI components |
| `src/stores/` | Pinia stores — shared reactive state |
| `src/api/` | Functions that call the backend REST APIs |
| `src/composables/` | Reusable Vue composition functions |
| `src/assets/scss/` | Global styles, design tokens, mixins |
| `src/router/index.ts` | All route definitions |

## 5. Make a change

1. Pick a view or component to edit in `src/`
2. The dev server hot-reloads changes instantly
3. Before committing, run:

```bash
npm run lint       # fix lint errors
npm run type-check # check TypeScript types
```

See [Development](./development.md) for the full list of available commands and code style guidelines.

## Common issues

**App loads but shows no data**
This is normal without a backend. Run `npm run dev-server` with a device IP configured.

**Type errors after `npm install`**
Run `npm update` before building. Some type definitions may be stale.

**Port already in use**
Vite defaults to port 5173. Kill the other process or let Vite pick a free port automatically.
