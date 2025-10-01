# Cover Art Loader

A comprehensive cover art loading system for the HBOS UI that automatically finds cover art for songs with fallback to artist images.

## Features

- **Automatic Fallback**: Tries song-specific cover art first, then album art, then falls back to artist cover art
- **Backend Integration**: Uses the ACR (Audio Control REST) API's `/api/coverart/` endpoints
- **Vue Composable**: Easy-to-use reactive interface for Vue components
- **TypeScript Support**: Fully typed interfaces and error handling
- **Caching**: Leverages backend caching for improved performance
- **Multiple Formats**: Supports various image sources (HTTP URLs, local files, data URLs)

## Architecture

### Service Layer (`/src/services/coverartloader.ts`)
The core service that handles all cover art API interactions:

```typescript
import { coverArtLoader } from '@/services/coverartloader'

// Find cover art for a song with automatic fallback
const result = await coverArtLoader.findCoverArt(song)

// Get just the best cover art URL
const url = await coverArtLoader.getBestCoverArt(song)

// Get specific types of cover art
const songUrls = await coverArtLoader.getSongCoverArt(title, artist)
const artistUrls = await coverArtLoader.getArtistCoverArt(artist)
const albumUrls = await coverArtLoader.getAlbumCoverArt(album, artist, year)
```

### Vue Composable (`/src/composables/useCoverArt.ts`)
Reactive Vue composable for easy integration:

```typescript
import { useCoverArt } from '@/composables/useCoverArt'

const {
  loading,
  hasCoverArt,
  bestCoverArt,
  coverArtUrls,
  coverArtSource,
  loadCoverArt,
  clearCoverArt
} = useCoverArt()

// Load cover art for a song
await loadCoverArt(song)
```

### Vue Components
Ready-to-use components for displaying cover art:

- **`CoverArt.vue`**: Simple, reusable cover art component
- **`CoverArtExample.vue`**: Comprehensive example with testing interface

## Usage Examples

### Basic Usage with Composable

```vue
<template>
  <div>
    <img v-if="bestCoverArt" :src="bestCoverArt" alt="Cover art" />
    <div v-else-if="loading">Loading...</div>
    <div v-else>No cover art</div>
  </div>
</template>

<script setup>
import { useCoverArt } from '@/composables/useCoverArt'
import { usePlayerStore } from '@/stores/player'

const { loading, bestCoverArt, loadCoverArt } = useCoverArt()
const playerStore = usePlayerStore()

// Watch for current song changes
watch(() => playerStore.currentSong, async (song) => {
  if (song) {
    await loadCoverArt(song)
  }
}, { immediate: true })
</script>
```

### Using the Component

```vue
<template>
  <CoverArt 
    :song="currentSong" 
    size="large" 
    @loaded="onCoverArtLoaded"
    @error="onCoverArtError"
  />
</template>

<script setup>
import CoverArt from '@/components/CoverArt.vue'

const onCoverArtLoaded = (result) => {
  console.log('Cover art loaded:', result.urls.length, 'from', result.source)
}

const onCoverArtError = (error) => {
  console.warn('Cover art error:', error)
}
</script>
```

### Direct Service Usage

```typescript
import { coverArtLoader } from '@/services/coverartloader'

// Check if API is available
const isAvailable = await coverArtLoader.isApiAvailable()

// Get cover art for specific metadata
const urls = await coverArtLoader.getSongCoverArt('Bohemian Rhapsody', 'Queen')

// Get artist cover art
const artistUrls = await coverArtLoader.getArtistCoverArt('Queen')
```

## Fallback Strategy

The system uses a intelligent fallback strategy:

1. **Existing URLs**: First checks if the song already has `artwork_url` or `cover_art_url`
2. **Song-Specific**: Tries to find cover art for the specific song title + artist
3. **Album Art**: Falls back to album cover art if available
4. **Artist Art**: Finally falls back to artist images
5. **Graceful Failure**: Returns empty result if nothing is found

## Backend API Integration

The service integrates with the ACR API endpoints:

- `GET /api/coverart/song/{title_b64}/{artist_b64}` - Song-specific cover art
- `GET /api/coverart/artist/{artist_b64}` - Artist cover art
- `GET /api/coverart/album/{title_b64}/{artist_b64}` - Album cover art
- `GET /api/coverart/album/{title_b64}/{artist_b64}/{year}` - Album with year
- `GET /api/coverart/url/{url_b64}` - Cover art from URL
- `GET /api/coverart/methods` - Available methods and providers

All text parameters are automatically URL-safe base64 encoded.

## Error Handling

The system handles errors gracefully:

- **Network Errors**: Logged and returned as empty results
- **API Unavailable**: Falls back to existing URLs or empty state
- **Invalid Images**: Component handles image load errors
- **Missing Data**: Gracefully handles songs with missing metadata

## Performance Considerations

- **Backend Caching**: The ACR API caches results for improved performance
- **Lazy Loading**: Cover art is only loaded when requested
- **Fallback Efficiency**: Stops at first successful result in fallback chain
- **Error Resilience**: Individual provider failures don't break the entire system

## Testing

Use the example component (`CoverArtExample.vue`) to test the system:

1. Add the component to a test page
2. Enter song metadata in the test form
3. Click "Load Cover Art" to test the API
4. Check API status with the status button
5. Try various combinations of metadata

## Configuration

The service automatically uses the configured backend API URL from the app config store. No additional configuration is required.

## Future Enhancements

- **Local Caching**: Add frontend caching for frequently accessed images
- **Placeholder Images**: Generate dynamic placeholder images based on artist/song
- **Batch Loading**: Load cover art for multiple songs simultaneously
- **Progressive Loading**: Load low-resolution first, then high-resolution
- **Custom Providers**: Allow registration of custom cover art providers
