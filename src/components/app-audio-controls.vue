<template>
  <div>
    <div class="app-audio-controls" :class="[{ 'is-separate': isSeparate, 'is-on-header': isOnHeader }, $attrs.class]">
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
      <button
        v-if="!isOnSticky"
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

interface AppAudioControlsProps {
  isSeparate?: boolean
  isOnSticky?: boolean
  isOnHeader?: boolean
}

const { isSeparate = false, isOnSticky = false, isOnHeader = false } = defineProps<AppAudioControlsProps>()

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
      opacity: 1;

      img {
        filter: invert(17%) sepia(89%) saturate(6472%) hue-rotate(342deg) brightness(92%) contrast(89%) !important; /* Full red color for active state */
      }
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

/* Header-specific styling - reduced spacing and smaller icons */
.app-audio-controls.is-on-header {
  max-width: 300px; /* Default for <1000px */
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 32px; /* Icon-sized gap between sections */

  /* Responsive breakpoints for max-width */
  @media (min-width: 1000px) {
    max-width: 400px;
    gap: 32px;
  }

  @media (min-width: 1500px) {
    max-width: 600px;
    gap: 32px;
  }

  .app-audio-controls__left {
    justify-self: start;
    margin-right: 0 !important; /* Remove margins - using grid gap instead */
    margin-left: 0 !important;
  }

  .app-audio-controls__right {
    justify-self: end;
    margin-left: 0 !important; /* Remove margins - using grid gap instead */
    margin-right: 0 !important;
  }

  /* Main controls centered */
  .app-audio-controls--main {
    justify-self: center;
    gap: 8px; /* Tighter spacing between main control buttons */

    @include media-down(md) {
      gap: 6px;
    }
  }

  /* Force all SVG icons to be smaller in header */
  svg,
  .app-icon {
    width: 21px !important; /* 35% smaller than 32px for secondary controls */
    height: 21px !important;
    color: var(--secondary-audio-controls) !important;

    @include media-down(md) {
      width: 16px !important; /* 35% smaller than 24px for secondary controls */
      height: 16px !important;
    }
  }

  /* Secondary controls (shuffle/loop) - default inactive appearance */
  .app-audio-controls__secondary {
    opacity: 0.4; /* Default lighter appearance for secondary controls */
    
    &.active {
      opacity: 1 !important; /* Full opacity when active */
    }
  }

  /* Main control specific styling - player controls 25% smaller */
  .app-audio-controls--main {
    svg,
    .app-icon {
      width: 24px !important; /* 25% smaller than 32px for main controls */
      height: 24px !important;
      color: var(--main-audio-controls-separate) !important;
      opacity: 1 !important; /* Ensure main controls are always fully visible */

      @include media-down(md) {
        width: 18px !important; /* 25% smaller than 24px for main controls */
        height: 18px !important;
      }
    }
  }

  /* Override for secondary controls within main controls (shuffle/loop) - higher specificity */
  .app-audio-controls--main button.app-audio-controls__secondary {
    opacity: 0.4; /* Default inactive state for shuffle/loop */

    &.active {
      opacity: 1 !important; /* Full opacity when active */
    }
  }

  /* Image buttons (lyrics and heart) - 35% smaller */
  .lyrics-button img,
  .heart-button img {
    width: 21px !important; /* 35% smaller than 32px */
    height: 21px !important;

    @include media-down(md) {
      width: 16px !important; /* 35% smaller than 24px */
      height: 16px !important;
    }
  }
}
</style>
