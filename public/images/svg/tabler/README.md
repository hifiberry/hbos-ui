# Tabler Icons Collection

This directory contains Tabler icons used throughout the HiFiBerry OS UI application.

## About Tabler Icons

Tabler Icons is a set of 4,000+ free SVG icons designed specifically for web interfaces. Key features:
- **Format**: SVG
- **Design**: Outline style with consistent 2px stroke width
- **ViewBox**: `0 0 24 24`
- **License**: MIT License (completely free)
- **Website**: [Tabler Icons](https://tabler-icons.io/)

## Icon Files and Tabler IDs

### Media Player Icons
- `player-play.svg` - **Tabler ID**: `player-play` - Play button
- `player-pause.svg` - **Tabler ID**: `player-pause` - Pause button
- `player-skip-back.svg` - **Tabler ID**: `player-skip-back` - Previous track
- `player-skip-forward.svg` - **Tabler ID**: `player-skip-forward` - Next track
- `arrows-shuffle.svg` - **Tabler ID**: `arrows-shuffle` - Shuffle mode
- `repeat.svg` - **Tabler ID**: `repeat` - Repeat all
- `repeat-once.svg` - **Tabler ID**: `repeat-once` - Repeat single track
- `heart.svg` - **Tabler ID**: `heart` - Heart/favorite button

### Interface Icons
- `chevron-down.svg` - **Tabler ID**: `chevron-down` - Dropdown arrow
- `chevron-up.svg` - **Tabler ID**: `chevron-up` - Collapse arrow
- `chevron-left.svg` - **Tabler ID**: `chevron-left` - Back arrow
- `chevron-right.svg` - **Tabler ID**: `chevron-right` - Forward arrow
- `caret-left-right.svg` - **Tabler ID**: `caret-left-right` - Balance/left-right adjustment control
- `x.svg` - **Tabler ID**: `x` - Close/clear button
- `plus.svg` - **Tabler ID**: `plus` - Add button
- `refresh.svg` - **Tabler ID**: `refresh` - Refresh button
- `check.svg` - **Tabler ID**: `check` - Checkmark
- `edit.svg` - **Tabler ID**: `edit` - Edit button
- `search.svg` - **Tabler ID**: `search` - Search icon
- `moon.svg` - **Tabler ID**: `moon` - Dark mode toggle
- `lyrics.svg` - **Custom** - Lyrics availability indicator (not from Tabler)

### Service & System Icons
- `server.svg` - **Tabler ID**: `server` - NAS/server icon
- `cloud.svg` - **Tabler ID**: `cloud` - Cloud services
- `device-desktop.svg` - **Tabler ID**: `device-desktop` - Computer/system
- `volume.svg` - **Tabler ID**: `volume` - Audio/volume
- `radio.svg` - **Tabler ID**: `radio` - Radio stations
- `playlist.svg` - **Tabler ID**: `playlist` - Playlists
- `music.svg` - **Tabler ID**: `music` - Music/audio
- `network.svg` - **Tabler ID**: `network` - Network
- `folder.svg` - **Tabler ID**: `folder` - Folder/directory
- `loader.svg` - **Tabler ID**: `loader` - Loading spinner

### Brand Icons
- `brand-spotify.svg` - **Tabler ID**: `brand-spotify` - Spotify
- `brand-lastfm.svg` - **Tabler ID**: `brand-lastfm` - Last.fm
- `hifiberry.svg` - **Custom** - HiFiBerry logo (not from Tabler)
- `musicbrainz.svg` - **Custom** - MusicBrainz logo with half-filled design (not from Tabler)

### User & Content Icons
- `users.svg` - **Tabler ID**: `users` - Users/people
- `notebook.svg` - **Tabler ID**: `notebook` - Notebook/album

## Usage

Icons should be used with the `Icon` component:

```vue
<Icon icon="tabler/player-play" />
```

## Stroke Width Customization

Tabler icons support stroke width customization via CSS:

```css
.icon-thin { stroke-width: 1; }
.icon-normal { stroke-width: 2; } /* Default */
.icon-bold { stroke-width: 3; }
```

## Current Implementation Status

These icons are alternatives to the current icon set. To use them:

1. Replace icon paths from base names to `tabler/icon-name`
2. Ensure consistent stroke width styling
3. Test visual consistency across the interface

## Icon Sources

All icons sourced from [Tabler Icons](https://tabler-icons.io/) with direct links:

- Player Play: <https://tabler-icons.io/icon/player-play>
- Player Pause: <https://tabler-icons.io/icon/player-pause>
- Player Skip Back: <https://tabler-icons.io/icon/player-skip-back>
- Player Skip Forward: <https://tabler-icons.io/icon/player-skip-forward>
- Arrows Shuffle: <https://tabler-icons.io/icon/arrows-shuffle>
- Repeat: <https://tabler-icons.io/icon/repeat>
- Repeat Once: <https://tabler-icons.io/icon/repeat-once>
- Heart: <https://tabler-icons.io/icon/heart>
- Chevron Down: <https://tabler-icons.io/icon/chevron-down>
- Chevron Up: <https://tabler-icons.io/icon/chevron-up>
- Chevron Left: <https://tabler-icons.io/icon/chevron-left>
- Chevron Right: <https://tabler-icons.io/icon/chevron-right>
- Caret Left Right: <https://tabler-icons.io/icon/caret-left-right>
- X: <https://tabler-icons.io/icon/x>
- Plus: <https://tabler-icons.io/icon/plus>
- Refresh: <https://tabler-icons.io/icon/refresh>
- Check: <https://tabler-icons.io/icon/check>
- Edit: <https://tabler-icons.io/icon/edit>
- Search: <https://tabler-icons.io/icon/search>
- Moon: <https://tabler-icons.io/icon/moon>
- Server: <https://tabler-icons.io/icon/server>
- Cloud: <https://tabler-icons.io/icon/cloud>
- Device Desktop: <https://tabler-icons.io/icon/device-desktop>
- Volume: <https://tabler-icons.io/icon/volume>
- Radio: <https://tabler-icons.io/icon/radio>
- Playlist: <https://tabler-icons.io/icon/playlist>
- Music: <https://tabler-icons.io/icon/music>
- Network: <https://tabler-icons.io/icon/network>
- Folder: <https://tabler-icons.io/icon/folder>
- Loader: <https://tabler-icons.io/icon/loader>
- Brand Spotify: <https://tabler-icons.io/icon/brand-spotify>
- Brand Lastfm: <https://tabler-icons.io/icon/brand-lastfm>
- Users: <https://tabler-icons.io/icon/users>
- Notebook: <https://tabler-icons.io/icon/notebook>
