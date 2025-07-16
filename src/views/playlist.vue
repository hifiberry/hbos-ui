<template>
  <div class="playlist">
    <h1>Playlist</h1>

    <!-- Show message when current player doesn't support playlists -->
    <div v-if="!playerCapabilities.hasQueue" class="playlist-no-support">
      <div class="empty-state">
        <AppIcon icon="playlist-light" class="empty-icon" />
        <h2>No playlist support</h2>
        <p>The current player does not support playlist functionality</p>
      </div>
    </div>

    <!-- Show playlist content when player supports playlists -->
    <div v-else>
      <!-- Loading state -->
      <div v-if="loading" class="playlist-loading">
        <div class="track-list">
          <div
            v-for="(_, index) in 5"
            :key="`skeleton-${index}`"
            class="track-item skeleton-item"
          >
            <div class="track-item__num">{{ index + 1 }}</div>
            <div class="skeleton-desc">
              <AppSkeleton width="60%" height="20px" />
              <AppSkeleton width="40%" height="16px" />
            </div>
          </div>
        </div>
      </div>

      <!-- Empty playlist -->
      <div v-else-if="queue.length === 0" class="playlist-empty">
        <div class="empty-state">
          <AppIcon icon="playlist-light" class="empty-icon" />
          <h2>Your playlist is empty</h2>
          <p>Add songs from your library to create your playlist</p>
        </div>
      </div>

      <!-- Playlist with songs -->
      <div v-else class="playlist-content">
        <div class="playlist-header">
          <h2>{{ queue.length }} song{{ queue.length !== 1 ? 's' : '' }} in queue</h2>
        </div>

        <div class="track-list">
          <div
            v-for="(track, index) in queue"
            :key="`queue-${index}`"
            class="track-item"
            :class="{ 'track-item--current': isCurrentTrack(track) }"
            @click="playTrackAtIndex(index)"
          >
            <div class="track-item__num">{{ index + 1 }}</div>
            <div class="track-item__desc">
              <div class="track-item__title">{{ track.name || 'Unknown Title' }}</div>
              <div class="track-item__artist">{{ track.artist || 'Unknown Artist' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlist'
import AppIcon from '@/components/app-icon.vue'
import AppSkeleton from '@/components/skeletons/app-skeleton.vue'

import type { Track } from '@/types/library'

const playerStore = usePlayerStore()
const { playerCapabilities, currentSong } = storeToRefs(playerStore)
const { sendCommand } = playerStore

const playlistStore = usePlaylistStore()
const { loading, queue } = storeToRefs(playlistStore)
const { fetchQueue } = playlistStore

// Function to play a track at a specific queue index
const playTrackAtIndex = async (index: number) => {
  try {
    await sendCommand('pause')
    await sendCommand(`play_queue_index:${index}`)
    await sendCommand('play')
  } catch (error) {
    console.error('Failed to play track at index:', index, error)
  }
}

// Function to check if a track is currently playing
const isCurrentTrack = (track: Track) => {
  if (!currentSong.value || !track) return false

  // Match by URI if both have it
  if (track.uri && currentSong.value.uri) {
    return track.uri === currentSong.value.uri
  }

  // Fallback: match by name/title and artist
  const titleMatch = track.name === currentSong.value.title
  const artistMatch = track.artist === currentSong.value.artist

  return titleMatch && artistMatch
}

onMounted(async () => {
  // Only fetch queue if player supports it
  if (playerCapabilities.value.hasQueue) {
    await fetchQueue()
  }
})
</script>

<style scoped lang="scss">
.playlist {
  .playlist-empty,
  .playlist-no-support,
  .playlist-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;

    .empty-state {
      text-align: center;
      max-width: 400px;

      .empty-icon {
        width: 80px;
        height: 80px;
        margin-bottom: 24px;
        color: var(--color-body-secondary);
        opacity: 0.5;
      }

      h2 {
        margin-bottom: 12px;
        color: var(--color-body-primary);
      }

      p {
        color: var(--color-body-secondary);
        line-height: 1.5;
      }
    }
  }

  .playlist-no-support {
    .empty-state {
      .empty-icon {
        opacity: 0.3;
      }

      h2 {
        color: var(--color-body-secondary);
      }
    }
  }

  .playlist-content {
    .playlist-header {
      margin-bottom: 24px;

      h2 {
        color: var(--color-body-primary);
        font-size: 1.25rem;
        margin: 0;
      }
    }
  }

  .track-list {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .track-item {
      display: grid;
      grid-template-columns: 40px 1fr;
      gap: 16px;
      align-items: center;
      padding: 12px;
      border-radius: 8px;
      transition: background-color 0.2s ease;
      cursor: pointer;

      &:hover {
        background-color: var(--color-background-hover, rgba(255, 255, 255, 0.05));
      }

      &--current {
        background-color: var(--primary);
        color: #ffffff;

        .track-item__num,
        .track-item__title,
        .track-item__artist {
          color: #ffffff;
        }

        .track-item__title {
          font-weight: 600;
        }

        &:hover {
          background-color: var(--primary);
          opacity: 0.9;
        }
      }

      &__num {
        font-size: 0.875rem;
        color: var(--color-body-secondary);
        text-align: center;
        font-weight: 500;
      }

      &__desc {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      &__title {
        font-weight: 500;
        color: var(--color-body-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &__artist {
        font-size: 0.875rem;
        color: var(--color-body-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &.skeleton-item {
        .skeleton-desc {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
        }
      }
    }
  }
}
</style>
