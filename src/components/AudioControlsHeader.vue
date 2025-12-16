<template>
  <div>
    <div class="app-audio-controls-header">
      <!-- All controls in one centered main section -->
      <div class="app-audio-controls-header--main">
        <!-- Shuffle button -->
        <IconButton
          class="app-audio-controls__secondary"
          :class="{ active: audioControls.isShuffle }"
          icon="lucide/shuffle"
          title="Shuffle"
          :disabled="isSendingCommand || !caps.canShuffle"
          @click="audioControls.toggleShuffle"
        />

        <!-- Previous button -->
        <IconButton
          icon="lucide/skip-back"
          title="Previous"
          :disabled="isSendingCommand || !caps.canPrevious"
          @click="audioControls.playNextOrPrev('previous')"
        />

        <!-- Play/Pause button -->
        <IconButton
          :icon="audioControls.isPlaying ? 'lucide/pause' : 'lucide/play'"
          title="Play/Pause"
          :disabled="isSendingCommand || !(caps.canPlay || caps.canPause)"
          @click="audioControls.togglePlayPause"
        />

        <!-- Next button -->
        <IconButton
          icon="lucide/skip-forward"
          title="Next"
          :disabled="isSendingCommand || !caps.canNext"
          @click="audioControls.playNextOrPrev('next')"
        />

        <!-- Loop button -->
        <IconButton
          class="app-audio-controls__secondary"
          :class="{ active: !audioControls.iscurrentLoopModeNone }"
          :icon="audioControls.iscurrentLoopModeTrack ? 'lucide/repeat-1' : 'lucide/repeat'"
          :title="
            audioControls.iscurrentLoopModeTrack
              ? 'Loop Track'
              : audioControls.iscurrentLoopModePlaylist
                ? 'Loop Playlist'
                : 'Loop'
          "
          :disabled="isSendingCommand || !caps.canLoop"
          @click="audioControls.cycleLoopMode"
        />
      </div>
    </div>

    <!-- Lyrics Overlay -->
    <LyricsOverlay
      :is-visible="showLyricsOverlay"
      :song="song"
      @close="closeLyrics"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import IconButton from '@/components/IconButton.vue'
import LyricsOverlay from '@/components/LyricsOverlay.vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useAudioControls } from '@/stores/audio-controls'

// Disable automatic attribute inheritance since we handle it manually
defineOptions({
  inheritAttrs: false
})

const playerStore = usePlayerStore()
const {
  isSendingCommand,
  playerCapabilities: caps,
  currentSongIsFavourite,
  currentSongFavouriteProviders,
  checkingFavourite,
  currentSong: song
} = storeToRefs(playerStore)

const audioControls = useAudioControls()

// Lyrics overlay state
const showLyricsOverlay = ref(false)

const toggleCurrentSongFavourite = () => {
  playerStore.toggleCurrentSongFavourite()
}

// Lyrics functions
const openLyrics = () => {
  if (song.value?.metadata?.lyrics_available) {
    showLyricsOverlay.value = true
  }
}

const closeLyrics = () => {
  showLyricsOverlay.value = false
}

// Computed property for heart button title with providers info
const heartButtonTitle = computed(() => {
  if (currentSongIsFavourite.value) {
    const providers = currentSongFavouriteProviders.value
    if (providers.length > 0) {
      const serviceList = providers.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')
      return `Remove from favorites (${serviceList})`
    }
    return 'Remove from favorites'
  } else {
    return 'Add to favorites'
  }
})
</script>

<style lang="scss">
.app-audio-controls-header {
  width: 100%;
  max-width: 500px; /* Compact size for header */
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;

  &--main {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px; /* Tighter spacing for header */

    @include media-down(md) {
      gap: 12px;
    }

    @include media-down(sm) {
      gap: 8px;
    }

    /* Main control buttons (play/pause/prev/next) - regular size */
    .app-icon {
      width: 24px;
      height: 24px;
      color: var(--main-audio-controls-separate);
      @include audio-control-stroke;

      @include media-down(md) {
        width: 20px;
        height: 20px;
      }
    }

    /* Secondary controls (shuffle/loop) - smaller */
    .app-audio-controls__secondary .app-icon {
      width: 20px;
      height: 20px;
      color: var(--secondary-audio-controls);

      @include media-down(md) {
        width: 18px;
        height: 18px;
      }
    }
  }

  /* Heart button styling */
  .heart-button {
    opacity: 0.4;
    margin-left: 15px;
    margin-right: 15px;

    &:disabled {
      cursor: not-allowed;
    }

    img {
      width: 20px;
      height: 20px;
      filter: invert(17%) sepia(89%) saturate(6472%) hue-rotate(342deg) brightness(92%) contrast(89%) opacity(0.4);

      @include media-down(md) {
        width: 18px;
        height: 18px;
      }
    }

    &--active {
      opacity: 1;

      img {
        filter: invert(17%) sepia(89%) saturate(6472%) hue-rotate(342deg) brightness(92%) contrast(89%) !important;
      }
    }
  }

  /* Lyrics button styling */
  .lyrics-button {
    opacity: 0.4;
    margin-left: 15px;
    margin-right: 15px;

    img {
      width: 20px;
      height: 20px;
      filter: invert(17%) sepia(89%) saturate(6472%) hue-rotate(342deg) brightness(92%) contrast(89%) opacity(0.4);

      @include media-down(md) {
        width: 18px;
        height: 18px;
      }
    }

    &--active {
      opacity: 1 !important;
      cursor: pointer;

      img {
        filter: invert(17%) sepia(89%) saturate(6472%) hue-rotate(342deg) brightness(92%) contrast(89%) !important;
      }
    }
  }
}
</style>
