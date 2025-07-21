<template>
  <div class="app-audio-controls" :class="{ 'is-separate': isSeparate }">
    <div class="app-audio-controls__left">
      <!-- Empty left column for balance -->
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
        :title="currentSongIsFavourite ? 'Remove from favorites' : 'Add to favorites'"
        :disabled="isSendingCommand || checkingFavourite"
        @click="toggleCurrentSongFavourite"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIconButton from '@/components/app-icon-button.vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useAudioControls } from '@/stores/audio-controls'

interface AppAudioControlsProps {
  isSeparate?: boolean
  isOnSticky?: boolean
}

const { isSeparate = false, isOnSticky = false } = defineProps<AppAudioControlsProps>()

const playerStore = usePlayerStore()
const { isSendingCommand, playerCapabilities: caps, currentSongIsFavourite, checkingFavourite } = storeToRefs(playerStore)

const audioControls = useAudioControls()

const toggleCurrentSongFavourite = () => {
  playerStore.toggleCurrentSongFavourite()
}
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

  &__left {
    display: flex;
    justify-content: flex-start;
  }

  &__right {
    display: flex;
    justify-content: flex-end;
    gap: 24px;

    @include media-down(md) {
      gap: 16px;
    }

    @include media-down(sm) {
      gap: 12px;
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

  // Styling for secondary buttons (shuffle, repeat) when not active
  &__secondary:not(.active) svg {
    color: var(--color-body-secondary); /* Lighter color instead of opacity */
    @include icon-stroke-thin; /* Thinner stroke width (1px instead of 1.25px) */
  }

  svg.active#{$root}__secondary {
    color: var(--primary);
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

  // Styling for secondary buttons (shuffle, repeat) when not active in separate mode
  &__secondary:not(.active) svg {
    color: var(--color-body-secondary); /* Lighter color instead of opacity */
    @include icon-stroke-thin; /* Thinner stroke width (1px instead of 1.25px) */
  }
}
</style>
