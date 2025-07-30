<template>
  <div>
    <div class="app-audio-controls-header">
      <!-- All controls in one centered main section -->
      <div class="app-audio-controls-header--main">
        <!-- Lyrics button -->
        <button
          class="app-audio-controls__secondary lyrics-button"
          :class="{ 'lyrics-button--active': song?.metadata?.lyrics_available }"
          :disabled="!song?.metadata?.lyrics_available"
          @click="openLyrics"
        >
          <img src="/images/svg/tabler/lyrics.svg" alt="Lyrics" />
        </button>

        <!-- Shuffle button -->
        <AppIconButton
          class="app-audio-controls__secondary"
          :class="{ active: audioControls.isShuffle }"
          icon="lucide/shuffle"
          title="Shuffle"
          :disabled="isSendingCommand || !caps.canShuffle"
          @click="audioControls.toggleShuffle"
        />

        <!-- Previous button -->
        <AppIconButton
          icon="lucide/skip-back"
          title="Previous"
          :disabled="isSendingCommand || !caps.canPrevious"
          @click="audioControls.playNextOrPrev('previous')"
        />

        <!-- Play/Pause button -->
        <AppIconButton
          :icon="audioControls.isPlaying ? 'lucide/pause' : 'lucide/play'"
          title="Play/Pause"
          :disabled="isSendingCommand || !(caps.canPlay || caps.canPause)"
          @click="audioControls.togglePlayPause"
        />

        <!-- Next button -->
        <AppIconButton
          icon="lucide/skip-forward"
          title="Next"
          :disabled="isSendingCommand || !caps.canNext"
          @click="audioControls.playNextOrPrev('next')"
        />

        <!-- Loop button -->
        <AppIconButton
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

        <!-- Heart button -->
        <button
          class="app-audio-controls__secondary heart-button"
          :class="{ 'heart-button--active': currentSongIsFavourite }"
          :title="heartButtonTitle"
          :disabled="isSendingCommand || checkingFavourite"
          @click="toggleCurrentSongFavourite"
        >
          <img
            :src="currentSongIsFavourite ? '/images/svg/lucide/heart-filled.svg' : '/images/svg/lucide/heart-outline.svg'"
            alt="Favorite"
          />
        </button>
      </div>
    </div>

    <!-- Lyrics Overlay -->
    <AppLyricsOverlay
      :is-visible="showLyricsOverlay"
      :song="song"
      @close="closeLyrics"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIconButton from '@/components/app-icon-button.vue'
import AppLyricsOverlay from '@/components/app-lyrics-overlay.vue'
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
