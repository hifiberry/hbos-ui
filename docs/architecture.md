# Architecture

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | [Vue 3](https://vuejs.org/) with Composition API |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Build tool | [Vite](https://vitejs.dev/) |
| State management | [Pinia](https://pinia.vuejs.org/) |
| Routing | [Vue Router 4](https://router.vuejs.org/) |
| Styling | SCSS with a design token + mixin system |
| Charts | [ApexCharts](https://apexcharts.com/), [Chart.js](https://www.chartjs.org/), [D3](https://d3js.org/) |
| Notifications | [vue3-toastify](https://vue3-toastify.js.org/) |

## Entry point

```
index.html
  └── src/main.ts          ← bootstraps Vue, Pinia, router, toast
        └── src/App.vue    ← root component
              └── src/layouts/default.vue  ← sidebar + header + <RouterView>
```

## Folder structure

```
src/
├── api/            API abstraction layer (one file per backend service)
├── assets/scss/    Global styles, variables, mixins, themes
├── components/     Reusable UI components
├── composables/    Composition functions (useX pattern)
├── helpers/        Pure utility/helper functions
├── layouts/        Page shell layouts
├── router/         Route definitions (index.ts)
├── services/       Higher-level service integrations (cover art, MusicBrainz)
├── stores/         Pinia stores
├── types/          Shared TypeScript interfaces and types
├── utils/          Domain-specific utilities (DSP math, filter calculations)
└── views/          Page-level components, organized by route section
```

## Routing

Routes are defined in `src/router/index.ts`. The app has four top-level sections, each with sub-routes:

```
/                    → redirects to /now-playing
/now-playing         Now playing view
/playlist            Queue view
/library/
  albums/            Album list, individual album, artist albums
  artists/           Artist list
  radio/             Radio stations
/sound/
  general/           General sound settings
  speaker-equalizer/ Parametric EQ
  crossover-design/  Crossover filter editor
  room-acoustics/    Room EQ wizard
/services/
  players/           Player management
  web-services/      Third-party web service config
  music-files/       SMB music file mounts
  dsp-programs/      DSP profile management
  dsp-backends/      DSP backend config
  system-info/       System info and network
  display/           Display settings
  system-tools/      System tools
  pipewire-filter-chain/ PipeWire filter chain
  bluetooth-settings/ Bluetooth device management
/now-playing-minimal Kiosk/embedded now-playing view
```

## State management

Pinia stores live in `src/stores/`. Key stores:

| Store | Purpose |
|-------|---------|
| `player.ts` | Current playback state (song, position, shuffle, loop) |
| `player-web-socket.ts` | WebSocket connection for real-time player events |
| `player-changes.ts` | Tracks state changes from WebSocket messages |
| `library.ts` | Music library data |
| `album.ts`, `artist.ts`, `songs.ts` | Library sub-stores |
| `radio.ts` | Radio station list |
| `playlist.ts` | Current playback queue |
| `appconfig.ts` | App-level config (API base URLs, device settings) |
| `settings.ts` | User preferences |
| `audio-controls.ts` | Volume and audio control state |
| `dsp-toolkit.ts` | DSP toolkit state |
| `filter_connector.ts` | Filter chain state (pluggable backend pattern) |
| `toast.ts` | Notification queue |

## API layer

`src/api/` contains functions that make HTTP calls to the HiFiBerryOS backend. Each file maps to a backend service:

| File | Backend service |
|------|----------------|
| `config.ts` | Config API (`/api/config/v1`) — system config, network, systemd |
| `player.ts` | AudioControl API — playback control |
| `volume.ts` | Volume control |
| `system.ts` | System info and tools |
| `dsptoolkit.ts` | DSP Toolkit API |
| `filterchain.ts` | Filter chain API |
| `pipewire.ts` | PipeWire API |
| `roomeq.ts` | Room EQ API |
| `coverart.ts` | Cover art API |
| `spotify.ts` | Spotify integration |
| `lastfm.ts` | Last.fm scrobbling |
| `smb.ts` | SMB music file mounts |

The `appconfig` store provides the base URL for each API, which is set based on how the dev server is configured (see [Getting Started](./getting-started.md)).

## Real-time updates

The player state is kept in sync via a WebSocket connection managed by `src/stores/player-web-socket.ts`. The UI subscribes to events like `state_changed` and `song_changed` to update without polling.

## Styling system

All styles use SCSS. Variables, mixins, and themes are auto-imported into every component via `vite.config.ts`:

```scss
@use "@/assets/scss/variables.scss" as *;
@use "@/assets/scss/mixins.scss" as *;
@use "@/assets/scss/variables/colors.scss" as *;
@use "@/assets/scss/themes.scss" as *;
```

This means you can use any mixin or variable directly in component `<style scoped>` blocks without importing them manually. See [Button System](./button-system.md) for the button mixin reference.

## Filter store: pluggable backend pattern

The DSP filter system (`src/stores/filter_connector.ts`) uses a Strategy pattern so the backend implementation can be swapped without touching the UI:

```
filter_connector.ts (Pinia store)
  └── delegates to FilterBackend interface
        ├── ConsoleFilterBackend  (development/demo)
        ├── HttpFilterBackend     (production HTTP API)
        └── DspToolkitFilterBackend (DSP Toolkit integration)
```

See `src/stores/README.md` for details on switching or adding backends.

## Cover art system

Cover art loading uses a layered fallback approach:

1. Existing `artwork_url` / `cover_art_url` on the song object
2. Song-specific cover art via `/api/coverart/song/…`
3. Album art via `/api/coverart/album/…`
4. Artist art via `/api/coverart/artist/…`

The service (`src/services/coverartloader.ts`) is consumed via the `useCoverArt` composable. See `src/services/README.md` for the full API.
