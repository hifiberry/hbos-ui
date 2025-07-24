<template>
  <div class="metadata-tooltip" @click.stop>
    <div class="metadata-tooltip__header">
      <h3>Track Metadata</h3>
    </div>
    <div class="metadata-tooltip__content">
      <div v-if="song?.title" class="metadata-item">
        <span class="metadata-label">Title:</span>
        <span class="metadata-value">{{ song.title }}</span>
      </div>
      <div v-if="song?.artist" class="metadata-item">
        <span class="metadata-label">Artist:</span>
        <span class="metadata-value">{{ song.artist }}</span>
      </div>
      <div v-if="song?.album" class="metadata-item">
        <span class="metadata-label">Album:</span>
        <span class="metadata-value">{{ song.album }}</span>
      </div>
      <div v-if="song?.track_number !== undefined && song?.track_number !== null && song?.track_number > 0" class="metadata-item">
        <span class="metadata-label">Track #:</span>
        <span class="metadata-value">{{ song.track_number }}</span>
      </div>
      <div v-if="song?.duration" class="metadata-item">
        <span class="metadata-label">Duration:</span>
        <span class="metadata-value">{{ formatTime(song.duration) }}</span>
      </div>
      <div v-if="song?.source" class="metadata-item">
        <span class="metadata-label">Source:</span>
        <span class="metadata-value capitalize">{{ song.source }}</span>
      </div>
      <div v-if="song?.uri" class="metadata-item">
        <span class="metadata-label">URI:</span>
        <span class="metadata-value uri">{{ song.uri }}</span>
      </div>
      <div v-if="song?.stream_url" class="metadata-item">
        <span class="metadata-label">Stream URL:</span>
        <span class="metadata-value path">{{ song.stream_url }}</span>
      </div>
      
      <!-- Show a message if no metadata is available -->
      <div v-if="!hasAnyMetadata" class="metadata-item metadata-item--empty">
        <span class="metadata-value">No metadata available for this track</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Song } from '@/types/player'
import { formatTime } from '@/helpers/formatTime'

interface Props {
  song: Song | null
}

const props = defineProps<Props>()

// Check if any meaningful metadata is available
const hasAnyMetadata = computed(() => {
  if (!props.song) return false
  
  return !!(
    props.song.title ||
    props.song.artist ||
    props.song.album ||
    (props.song.track_number !== undefined && props.song.track_number !== null && props.song.track_number > 0) ||
    props.song.duration ||
    props.song.source ||
    props.song.uri ||
    props.song.stream_url
  )
})
</script>

<style scoped lang="scss">
.metadata-tooltip {
  position: absolute;
  background: var(--background-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  padding: 16px;
  min-width: 300px;
  max-width: 400px;
  z-index: 1000;
  color: var(--color-body);

  &__header {
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 8px;
    margin-bottom: 12px;

    h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-head);
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

.metadata-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;

  &--empty {
    justify-content: center;
    font-style: italic;
    opacity: 0.7;
  }

  .metadata-label {
    font-weight: 500;
    color: var(--color-body-secondary);
    min-width: 80px;
    font-size: 0.875rem;
  }

  .metadata-value {
    color: var(--color-body);
    font-size: 0.875rem;
    word-break: break-word;
    flex: 1;

    &.capitalize {
      text-transform: capitalize;
    }

    &.uri {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.8rem;
      background: rgba(var(--color-surface-rgb, 128, 128, 128), 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      word-break: break-all;
    }

    &.path {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.8rem;
      opacity: 0.8;
      word-break: break-all;
    }
  }
}
</style>
