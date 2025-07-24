<template>
  <div>
    <div class="app-audio-controls" :class="[{ 'is-separate': isSeparate }, $attrs.class]">
      <div class="app-audio-controls__left">
              <button
          class="app-audio-controls__secondary lyrics-button"
          :class="{ 'lyrics-button--active': song?.metadata?.lyrics_available }"
          :disabled="!song?.metadata?.lyrics_available"
          @click="openLyrics"
        >
          <img src="/images/svg/tabler/lyrics.svg" alt="Lyrics" />
        </button>
      </div>

    <div class="app-audio-controls--main">
      <AppIconButton
        v-if="!isOnSticky"
        class="app-audio-controls__secondary"
        :class="{ active: audioControls.isShuffle }"
        icon="lucide/shuffle"
        title="Shuffle"
        :disabled="isSendingCommand || !caps.canShuffle"
        @click="audioControls.toggleShuffle"
      />

      <AppIconButton
        icon="lucide/skip-back"
        title="Previous"
        :disabled="isSendingCommand || !caps.canPrevious"
        @click="audioControls.playNextOrPrev('previous')"
      />

      <AppIconButton
        :icon="audioControls.isPlaying ? 'lucide/pause' : 'lucide/play'"
        title="Play/Pause"
        :disabled="isSendingCommand || !(caps.canPlay || caps.canPause)"
        @click="audioControls.togglePlayPause"
      />

      <AppIconButton
        icon="lucide/skip-forward"
        title="Next"
        :disabled="isSendingCommand || !caps.canNext"
        @click="audioControls.playNextOrPrev('next')"
      />

      <AppIconButton
        v-if="!isOnSticky"
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

    <div class="app-audio-controls__right">
      <AppIconButton
        v-if="!isOnSticky"
        class="app-audio-controls__secondary heart-button"
        :class="{ 'heart-button--active': currentSongIsFavourite }"
        :icon="currentSongIsFavourite ? 'lucide/heart-filled' : 'lucide/heart-outline'"
        :title="heartButtonTitle"
        :disabled="isSendingCommand || checkingFavourite"
        @click="toggleCurrentSongFavourite"
      />
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

interface AppAudioControlsProps {
  isSeparate?: boolean
  isOnSticky?: boolean
}

const { isSeparate = false, isOnSticky = false } = defineProps<AppAudioControlsProps>()

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
.app-audio-controls {
  $root: &;

  width: 100%;
  max-width: 600px; /* Match typical progress bar width */
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;

  @include media-down(md) {
    max-width: 500px;
  }

  @include media-down(sm) {
    max-width: 100%;
  }

  /* On small screens, switch to single column layout when side buttons are hidden */
  @media (max-width: 500px) {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  &__left {
    display: flex;
    justify-content: flex-start;
    margin-right: 100px; /* Large spacing between left section and center controls */

    @include media-down(md) {
      margin-right: 80px;
    }

    @include media-down(sm) {
      margin-right: 60px;
    }

    /* Hide on small screens to save space */
    @media (max-width: 500px) {
      display: none;
    }
  }

  &__right {
    display: flex;
    justify-content: flex-end;
    gap: 24px;
    margin-left: 100px; /* Large spacing between center controls and right section */

    @include media-down(md) {
      gap: 16px;
      margin-left: 80px;
    }

    @include media-down(sm) {
      gap: 12px;
      margin-left: 60px;
    }

    /* Hide on small screens to save space */
    @media (max-width: 500px) {
      display: none;
    }
  }

  svg {
    width: 32px;
    height: 32px;
    color: var(--secondary-audio-controls);
    @include audio-control-stroke; /* Use mixin for consistent stroke width */

    @include media-down(md) {
      width: 24px;
      height: 24px;
    }
  }

  &--main {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 32px;

    @include media-down(md) {
      gap: 16px;
    }

    @include media-down(sm) {
      gap: 21px;
    }

    svg {
      width: 48px;
      height: 48px;
      color: var(--main-audio-controls);
      @include audio-control-stroke; /* Use mixin for consistent stroke width */

      @include media-down(md) {
        width: 32px;
        height: 32px;
      }
    }
  }

  .heart-button {
    opacity: 0.4;

    &:disabled {
      cursor: not-allowed;
    }

    /* Default styling for both heart states */
    svg {
      @include audio-control-stroke; /* Use mixin for consistent stroke width */
    }

    &--active {
      opacity: 1;
      color: var(--color-icon-primary) !important; /* Use primary icon color for consistency */
    }
  }

  .lyrics-button {
    opacity: 0.4; /* Default inactive state, same as heart button */

    img {
      width: 32px;
      height: 32px;
      filter: invert(17%) sepia(89%) saturate(6472%) hue-rotate(342deg) brightness(92%) contrast(89%) opacity(0.4); /* Light red color for inactive state */

      @include media-down(md) {
        width: 24px;
        height: 24px;
      }
    }

    &--active {
      opacity: 1 !important; /* Override disabled button opacity */
      cursor: pointer; /* Make it clear it's clickable */

      img {
        filter: invert(17%) sepia(89%) saturate(6472%) hue-rotate(342deg) brightness(92%) contrast(89%) !important; /* Full red color for active state */
      }
    }
  }
}

.app-audio-controls.is-separate {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;

  @include media-down(md) {
    gap: 23px;
  }

  svg {
    width: 24px;
    height: 24px;
    color: var(--secondary-audio-controls);
    @include audio-control-stroke; /* Use mixin for consistent stroke width */

    @include media-down(md) {
      width: 20px;
      height: 20px;
    }
  }

  .app-audio-controls--main {
    gap: 16px;

    svg {
      width: 24px;
      height: 24px;
      color: var(--main-audio-controls-separate);
      @include audio-control-stroke; /* Use mixin for consistent stroke width */
    }
  }
}
</style>
