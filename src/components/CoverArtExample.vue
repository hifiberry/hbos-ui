<!--
  Example component demonstrating how to use the cover art loader
  This can be used as a reference for implementing cover art in other components
-->
<template>
  <div class="cover-art-example">
    <h3>Cover Art Example</h3>

    <!-- Cover Art Display -->
    <div class="cover-art-container">
      <div v-if="loading" class="loading">
        Loading cover art...
      </div>

      <div v-else-if="error" class="error">
        Error: {{ error }}
      </div>

      <div v-else-if="hasCoverArt" class="cover-art-display">
        <img
          v-if="bestCoverArt"
          :src="bestCoverArt"
          :alt="`Cover art for ${currentSong?.title || 'Unknown'}`"
          class="cover-image"
          @error="onImageError"
        />
        <p class="cover-source">Source: {{ coverArtSource }}</p>
        <details v-if="coverArtUrls.length > 1" class="all-urls">
          <summary>All URLs ({{ coverArtUrls.length }})</summary>
          <ul>
            <li v-for="(url, index) in coverArtUrls" :key="index">
              <a :href="url" target="_blank">{{ url }}</a>
            </li>
          </ul>
        </details>
      </div>

      <div v-else class="no-cover-art">
        No cover art found
      </div>
    </div>

    <!-- Test Controls -->
    <div class="test-controls">
      <h4>Test with Sample Data</h4>
      <div class="input-group">
        <label>
          Song Title:
          <input v-model="testSong.title" type="text" placeholder="Enter song title">
        </label>
        <label>
          Artist:
          <input v-model="testSong.artist" type="text" placeholder="Enter artist name">
        </label>
        <label>
          Album (optional):
          <input v-model="testSong.album" type="text" placeholder="Enter album name">
        </label>
      </div>
      <div class="button-group">
        <button @click="testCoverArt" :disabled="!testSong.title || !testSong.artist">
          Load Cover Art
        </button>
        <button @click="clearTest">
          Clear
        </button>
        <button @click="loadSampleData">
          Load Sample
        </button>
      </div>
    </div>

    <!-- API Status -->
    <div class="api-status">
      <button @click="checkApi">Check API Status</button>
      <span v-if="apiStatus !== null" :class="['status', apiStatus ? 'online' : 'offline']">
        API {{ apiStatus ? 'Available' : 'Unavailable' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCoverArt } from '@/composables/useCoverArt'
import type { Song } from '@/types/player'

// Use the cover art composable
const {
  loading,
  coverArtUrls,
  hasCoverArt,
  bestCoverArt,
  coverArtSource,
  error,
  loadCoverArt,
  checkApiAvailability,
  clearCoverArt
} = useCoverArt()

// Test data
const testSong = ref<Partial<Song>>({
  title: '',
  artist: '',
  album: '',
  duration: 0
})

const currentSong = ref<Song | null>(null)
const apiStatus = ref<boolean | null>(null)

// Methods
const testCoverArt = async () => {
  if (!testSong.value.title || !testSong.value.artist) return

  const song: Song = {
    title: testSong.value.title,
    artist: testSong.value.artist,
    album: testSong.value.album || undefined,
    duration: testSong.value.duration || 0
  }

  currentSong.value = song
  await loadCoverArt(song)
}

const clearTest = () => {
  testSong.value = {
    title: '',
    artist: '',
    album: '',
    duration: 0
  }
  currentSong.value = null
  clearCoverArt()
}

const loadSampleData = () => {
  testSong.value = {
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    duration: 355
  }
}

const checkApi = async () => {
  apiStatus.value = await checkApiAvailability()
}

const onImageError = (event: Event) => {
  console.warn('Failed to load cover art image:', (event.target as HTMLImageElement).src)
}

// Check API status on mount
onMounted(() => {
  checkApi()
})
</script>

<style scoped>
.cover-art-example {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.cover-art-container {
  margin: 20px 0;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  text-align: center;
}

.loading {
  color: #666;
  font-style: italic;
}

.error {
  color: #d32f2f;
  background: #ffebee;
  padding: 10px;
  border-radius: 4px;
}

.cover-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.cover-source {
  margin-top: 10px;
  font-size: 14px;
  color: #666;
  text-transform: capitalize;
}

.all-urls {
  margin-top: 15px;
  text-align: left;
}

.all-urls ul {
  margin: 10px 0;
  padding-left: 20px;
}

.all-urls a {
  word-break: break-all;
  color: #1976d2;
}

.no-cover-art {
  color: #666;
  font-style: italic;
  padding: 40px;
}

.test-controls {
  margin: 30px 0;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.input-group label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-weight: bold;
}

.input-group input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.button-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.button-group button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background: #1976d2;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.button-group button:hover:not(:disabled) {
  background: #1565c0;
}

.button-group button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.api-status {
  margin-top: 20px;
  text-align: center;
}

.api-status button {
  padding: 8px 16px;
  margin-right: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.status {
  font-weight: bold;
}

.status.online {
  color: #4caf50;
}

.status.offline {
  color: #f44336;
}
</style>
