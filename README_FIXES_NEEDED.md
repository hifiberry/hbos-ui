# Fixes:

Before running `npm run build` run the command `npm update` to fix <strong>type-check</strong> errors

## WebSocket:

We don't get the `data.position` in the WebSocket messages `data` object

## Subscriptions:

    'position_changed' // We don't get 'position_changed' - instead getting 'state_changed'
    'loop_mode_change // We don't get 'loop_mode_changed' - nothing getting
    'shuffle_changed' // We don't get 'loop_mode_changed' - nothing getting

## Behavior:

<strong><i>Sometimes</i></strong> when pressing the Shuffle button during playback, the `fetch(${apiBase}/now-playing)` call returns `data` with an incorrect `position` for seek/progress bar

## Song cover image:

<mark>cover_art_url</mark> in the `song` object (got using `fetch(${apiBase}/now-playing)` request) used as image src can't get the cover image

```diff
{
  "player": {
    "name": "mpd",
    "id": "mpd:6600",
    "state": "paused",
    "is_active": true,
    "has_library": true,
    "last_seen": "2025-07-01T08:42:57.173376417+00:00"
  },
  "song": {
    "title": "You Can",
    "artist": "Aylex",
    "track_number": 0,
    "duration": 188,</code>
-   "cover_art_url": "/api/library/mpd/image/Aylex%2FAylex%20-%20You%20Can%20%28freetouse.com%29.mp3",
    "stream_url": "Aylex/Aylex - You Can (freetouse.com).mp3",
    "source": "mpd"
  },
  "state": "paused",
  "shuffle": false,
  "loop_mode": "no",
  "position": 2.208
}
```

## Additional questions:
