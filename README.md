# HiFiBerryOS WebUI

A modern Vue 3 web interface for HiFiBerryOS — an intuitive way to control and configure your HiFiBerry audio system.

## Features

- **Music library** — browse by artist, album, and track
- **Playback controls** — play, pause, skip, shuffle, repeat, queue management
- **Now playing** — real-time album art, lyrics, and metadata
- **Sound settings** — parametric EQ, crossover design, room acoustics
- **System configuration** — players, DSP programs, network, Bluetooth, display
- **Responsive** — desktop and mobile, dark/light mode

## Quick start

```bash
git clone https://github.com/hifiberry/hbos-ui.git
cd hbos-ui
npm install
npm run dev
```

Open `http://localhost:5173`. The UI loads but API calls won't return data without a backend — see [Getting Started](./docs/getting-started.md) to connect to a real device.

## Documentation

All documentation is in the [`docs/`](./docs/) directory.

| Document | Contents |
|----------|---------|
| [Getting Started](./docs/getting-started.md) | Setup, local dev, connecting to a HiFiBerry device |
| [Architecture](./docs/architecture.md) | Tech stack, folder structure, routing, state management |
| [Development](./docs/development.md) | Commands, code style, debugging |
| [Deployment](./docs/deployment.md) | Production build and Debian packaging |
| [Button System](./docs/button-system.md) | SCSS button mixin system |
| [Known Issues](./docs/known-issues.md) | Current limitations and workarounds |

## Contributing

1. Read [Getting Started](./docs/getting-started.md) and [Development](./docs/development.md)
2. Run `npm run lint` and `npm run type-check` before submitting changes
3. Follow the code style and component structure described in [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT — see [LICENSE](./LICENSE).
