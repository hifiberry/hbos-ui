<template>
  <div>
    <div class="app-audio-controls" :class="[{ 'is-separate': isSeparate, 'is-on-header': isOnHeader }, $attrs.class]">
      <!-- Left section: Lyrics button -->
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

      <!-- Empty spacer block 1 -->
      <div class="app-audio-controls__spacer"></div>

      <!-- Center section: Main controls -->
      <div class="app-audio-controls--main">
        <IconButton
          v-if="!isOnSticky"
          class="app-audio-controls__secondary"
          :class="{ active: audioControls.isShuffle }"
          icon="lucide/shuffle"
          title="Shuffle"
          :disabled="isSendingCommand || !caps.canShuffle"
          @click="audioControls.toggleShuffle"
        />

        <IconButton
          icon="lucide/skip-back"
          title="Previous"
          :disabled="isSendingCommand || !caps.canPrevious"
          @click="audioControls.playNextOrPrev('previous')"
        />

        <IconButton
          :icon="audioControls.isPlaying ? 'lucide/pause' : 'lucide/play'"
          title="Play/Pause"
          :disabled="isSendingCommand || !(caps.canPlay || caps.canPause)"
          @click="audioControls.togglePlayPause"
        />

        <IconButton
          icon="lucide/skip-forward"
          title="Next"
          :disabled="isSendingCommand || !caps.canNext"
          @click="audioControls.playNextOrPrev('next')"
        />

        <IconButton
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

      <!-- Empty spacer block 2 -->
      <div class="app-audio-controls__spacer"></div>

      <!-- Right section: Heart button -->
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

interface AudioControlsProps {
  isSeparate?: boolean
  isOnSticky?: boolean
  isOnHeader?: boolean
}

const { isSeparate = false, isOnSticky = false, isOnHeader = false } = defineProps<AudioControlsProps>()

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
  display: grid;
  grid-template-columns: auto 1fr auto 1fr auto; /* 5 columns: left, spacer, center, spacer, right */
  align-items: center;

  /* On small screens, switch to single column layout when side buttons are hidden */
  @media (max-width: 500px) {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  &__left {
    display: flex;
    justify-content: flex-start;
    margin-right: 30px;

    @include media-down(md) {
      margin-right: 15px;
    }

    /* Hide on small screens to save space */
    @media (max-width: 500px) {
      display: none;
    }
  }

  &__spacer {
    /* Empty spacer elements for flexible spacing */
    min-width: 0;
  }

  &__right {
    display: flex;
    justify-content: flex-end;
    gap: 24px;
    margin-left: 30px;

    @include media-down(md) {
      gap: 16px;
      margin-left: 15px;
    }

    @include media-down(sm) {
      gap: 12px;
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
    margin-left: 30px;
    margin-right: 30px;

    @include media-down(md) {
      margin-left: 15px;
      margin-right: 15px;
    }

    &:disabled {
      cursor: not-allowed;
    }

    img {
      width: 32px;
      height: 32px;
      filter: invert(17%) sepia(89%) saturate(6472%) hue-rotate(342deg) brightness(92%) contrast(89%); /* Red color matching play/pause controls */

      @include media-down(md) {
        width: 24px;
        height: 24px;
      }
    }

    &--active {
      img {
        filter: invert(17%) sepia(89%) saturate(6472%) hue-rotate(342deg) brightness(92%) contrast(89%) !important; /* Full red color for active state */
      }
    }
  }

  .lyrics-button {
    opacity: 0.4; /* Default inactive state, same as heart button */
    margin-right: 30px;

    @include media-down(md) {
      margin-right: 15px;
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
  display: grid;
  grid-template-columns: auto 40px auto 40px auto; /* Fixed 40px spacers for precise control */
  align-items: center;

  &__left {
    justify-self: start;
    margin-right: 0; /* Remove margins - using grid structure instead */
    margin-left: 0;
  }

  &__spacer {
    /* Spacers in header have fixed width for precise control */
    width: 40px;
  }

  &__right {
    justify-self: end;
    margin-left: 0; /* Remove margins - using grid structure instead */
    margin-right: 0;
  }

  /* Main controls centered */
  &--main {
    justify-self: center;
  }

  /* Make lyrics and heart button icons smaller in header (70% of current size) */
  .lyrics-button img {
    width: 22px; /* 70% of 32px = 22.4px, rounded to 22px */
    height: 22px;

    @include media-down(md) {
      width: 17px; /* 70% of 24px = 16.8px, rounded to 17px */
      height: 17px;
    }
  }

  .heart-button img {
    width: 22px; /* 70% of 32px = 22.4px, rounded to 22px */
    height: 22px;

    @include media-down(md) {
      width: 17px; /* 70% of 24px = 16.8px, rounded to 17px */
      height: 17px;
    }
  }
}

/* Override is-separate styles when both is-separate and is-on-header are present */
.app-audio-controls.is-separate.is-on-header {
  display: grid !important; /* Override the flex from is-separate */
  grid-template-columns: auto 40px auto 40px auto !important; /* Use the flexible 5-column structure */
}
</style>
