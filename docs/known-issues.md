# Known Issues

This document tracks known limitations and open issues in the codebase.

## Build

**Type errors before build**
Run `npm update` before `npm run build` if you see type-check failures after a fresh `npm install`.

## WebSocket

**Missing `position` in WebSocket messages**
The `data.position` field is not included in WebSocket `data` objects, so the seek/progress bar cannot update in real time from socket events.

**Missing subscription events**
These events are expected but not received from the backend:
- `position_changed` — `state_changed` is received instead
- `loop_mode_changed` — not received
- `shuffle_changed` — not received

## Playback

**Incorrect seek position after shuffle**
When pressing the Shuffle button during playback, the `/api/now-playing` response occasionally returns an incorrect `position` value, causing the progress bar to jump.

## Cover art

**`cover_art_url` not resolving**
The `cover_art_url` field on the `song` object returned by `/api/now-playing` sometimes cannot be used directly as an image `src`. The cover art loader service works around this by trying multiple fallback strategies.

Example of a response where `cover_art_url` is missing:

```json
{
  "player": { "name": "mpd", ... },
  "song": {
    "title": "You Can",
    "artist": "Aylex",
    "duration": 188,
    "stream_url": "Aylex/Aylex - You Can (freetouse.com).mp3",
    "source": "mpd"
  },
  "state": "paused",
  "position": 2.208
}
```
