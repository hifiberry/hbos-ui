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
        icon="shuffle"
        title="Shuffle"
        :disabled="isSendingCommand || !caps.canShuffle"
        @click="audioControls.toggleShuffle"
      />

      <AppIconButton
        icon="prev"
        title="Previous"
        :disabled="isSendingCommand || !caps.canPrevious"
        @click="audioControls.playNextOrPrev('previous')"
      />

      <AppIconButton
        :icon="audioControls.isPlaying ? 'pause' : 'play'"
        title="Play/Pause"
        :disabled="isSendingCommand || !(caps.canPlay || caps.canPause)"
        @click="audioControls.togglePlayPause"
      />

      <AppIconButton
        icon="next"
        title="Next"
        :disabled="isSendingCommand || !caps.canNext"
        @click="audioControls.playNextOrPrev('next')"
      />

      <AppIconButton
        v-if="!isOnSticky"
        class="app-audio-controls__secondary"
        :class="{ active: !audioControls.iscurrentLoopModeNone }"
        :icon="audioControls.iscurrentLoopModeTrack ? 'loop-one' : 'loop'"
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
        icon="heart"
        title="Add to favorites"
        :disabled="true"
        @click="toggleFavorite"
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

const { isSendingCommand, playerCapabilities: caps } = storeToRefs(usePlayerStore())

const audioControls = useAudioControls()

const toggleFavorite = () => {
  // TODO: Implement favorite functionality
  console.log('Toggle favorite clicked')
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

      @include media-down(md) {
        width: 32px;
        height: 32px;
      }
    }
  }

  svg.active#{$root}__secondary {
    color: var(--primary);
  }

  .heart-button {
    opacity: 0.4;

    &:disabled {
      cursor: not-allowed;
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
    }
  }
}
</style>
