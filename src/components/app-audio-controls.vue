<template>
  <div class="app-audio-controls" :class="{ 'is-separate': isSeparate }">
    <AppIconButton
      v-if="!isOnSticky"
      icon="shuffle"
      title="Shuffle"
      :disabled="audioControls.isSendingCommand"
      @click="audioControls.toggleShuffle"
    />

    <div class="app-audio-controls--main">
      <AppIconButton
        icon="prev"
        title="Previous"
        :disabled="audioControls.isSendingCommand"
        @click="audioControls.playNextOrPrev('previous')"
      />

      <AppIconButton
        :icon="audioControls.isPlaying ? 'pause' : 'play'"
        title="Play/Pause"
        :disabled="audioControls.isSendingCommand"
        @click="audioControls.togglePlayPause"
      />

      <AppIconButton
        icon="next"
        title="Next"
        :disabled="audioControls.isSendingCommand"
        @click="audioControls.playNextOrPrev('next')"
      />
    </div>

    <AppIconButton
      v-if="!isOnSticky"
      icon="loop"
      title="Loop"
      :disabled="audioControls.isSendingCommand"
      @click="audioControls.cycleLoopMode"
    />
  </div>
</template>

<script setup lang="ts">
import AppIconButton from '@/components/app-icon-button.vue'
import { useAudioControls } from '@/stores/audio-controls'

interface AppAudioControlsProps {
  isSeparate?: boolean
  isOnSticky?: boolean
}

const { isSeparate = false, isOnSticky = false } = defineProps<AppAudioControlsProps>()

const audioControls = useAudioControls()
</script>

<style lang="scss">
.app-audio-controls {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;

  svg {
    width: 32px;
    height: 32px;
    color: var(--secondary-audio-controls);
  }

  &--main {
    display: flex;
    align-items: center;
    gap: 32px;

    svg {
      width: 48px;
      height: 48px;
      color: var(--main-audio-controls);
    }
  }
}

.app-audio-controls.is-separate {
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 24px;
    height: 24px;
    color: var(--secondary-audio-controls);
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
