<template>
  <div class="app-audio-controls" :class="{ 'is-separate': isSeparate }">
    <AppIconButton
      v-if="!isOnSticky"
      class="app-audio-controls__secondary"
      :class="{ active: audioControls.isShuffle }"
      icon="shuffle"
      title="Shuffle"
      :disabled="isSendingCommand || !caps.canShuffle"
      @click="audioControls.toggleShuffle"
    />

    <div class="app-audio-controls--main">
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
    </div>

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
</script>

<style lang="scss">
.app-audio-controls {
  $root: &;

  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;

  @include media-down(md) {
    gap: 24px;
  }

  @include media-down(sm) {
    gap: 12px;
    justify-content: space-between;
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
