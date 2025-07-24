<template>
  <div :class="['song-control-info', { card: isOnSticky, 'is-on-header': isOnHeader }]">
    <div v-if="song" class="song-control-info__box" @click="goToNowPlaying">
      <div
        class="song-control-info__cover"
        @mouseenter="showTooltip = true"
        @mouseleave="showTooltip = false"
        @mousemove="updateTooltipPosition"
      >
        <AppCover :src="rewriteAudiocontrolApiUrl(song.cover_art_url || '')" :alt="song.artist || 'Artist'" />

        <!-- Metadata Tooltip -->
        <AppMetadataTooltip
          v-if="showTooltip && song"
          :song="song"
          class="song-control-info__metadata-tooltip"
          :style="tooltipStyles"
        />
      </div>
      <div class="song-control-info__attr">
        <div class="h3">
          <AppMarquee>
            {{ song.title }}
          </AppMarquee>
        </div>

        <p>
          <AppMarquee>{{ song.artist }}</AppMarquee>
        </p>
      </div>
    </div>

    <div class="song-control-info__controls">
      <AppAudioControls isSeparate :isOnSticky="isOnSticky" />

      <AppProgressControl v-if="!isOnSticky" isOnHeader isDraggable />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppAudioControls from '@/components/app-audio-controls.vue'
import AppProgressControl from '@/components/app-progress-control.vue'
import AppCover from '@/components/app-cover.vue'
import AppMarquee from '@/components/app-marquee.vue'
import AppMetadataTooltip from '@/components/app-metadata-tooltip.vue'
import { rewriteAudiocontrolApiUrl } from '@/api/utils'

import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player.ts'

const router = useRouter()
const { currentSong: song } = storeToRefs(usePlayerStore())

interface AudioSongControlInfoProps {
  isOnSticky?: boolean
  isOnHeader?: boolean
}

const { isOnSticky = false, isOnHeader = false } = defineProps<AudioSongControlInfoProps>()

const goToNowPlaying = () => {
  router.push({ name: 'now-playing' })
}

// Tooltip state
const showTooltip = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)

// Update tooltip position based on mouse movement
const updateTooltipPosition = (event: MouseEvent) => {
  tooltipX.value = event.clientX
  tooltipY.value = event.clientY
}

// Computed styles for tooltip positioning with boundary detection
const tooltipStyles = computed(() => {
  const tooltipWidth = 350 // Approximate tooltip width
  const tooltipHeight = 200 // Approximate tooltip height
  const offset = 10

  let left = tooltipX.value + offset
  let top = tooltipY.value - offset

  // Adjust if tooltip would go off the right edge
  if (left + tooltipWidth > window.innerWidth) {
    left = tooltipX.value - tooltipWidth - offset
  }

  // Adjust if tooltip would go off the bottom edge
  if (top + tooltipHeight > window.innerHeight) {
    top = tooltipY.value - tooltipHeight - offset
  }

  // Ensure tooltip doesn't go off the left edge
  if (left < offset) {
    left = offset
  }

  // Ensure tooltip doesn't go off the top edge
  if (top < offset) {
    top = offset
  }

  return {
    left: `${left}px`,
    top: `${top}px`,
    position: 'fixed' as const
  }
})
</script>

<style scoped lang="scss">
.song-control-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  &__cover {
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 5px;
    overflow: hidden;
    position: relative;
    cursor: help;

    &:deep(.app-cover) {
      width: 100%;
      height: 100%;
      svg {
        width: 50%;
        height: 50%;
      }
    }
  }

  &__metadata-tooltip {
    pointer-events: none;
    z-index: 1000;
  }
  &__box {
    display: flex;
    gap: 10px;
    align-items: center;
    width: calc(100% - 120px);
    cursor: pointer;
    border-radius: 8px;
    padding: 4px;
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--color-background-hover, rgba(255, 255, 255, 0.05));

      .h3 {
        color: var(--color-head);
      }

      p {
        color: var(--color-body-primary);
      }
    }

    &__attr {
      flex: 1;
    }
  }

  // Compact styling when used in header
  &.is-on-header {
    .song-control-info__box {
      width: auto; // Don't take full width
      max-width: 280px; // Limit to reasonable size
      min-width: 200px; // Ensure minimum readable width
    }
  }
  &__attr {
    color: var(--color-body-secondary);
    max-width: 260px;
    min-width: 100px;
    .h3 {
      margin-bottom: 3px;
    }
  }
  &.card {
    background-color: var(--background-sidebar);
    border-radius: 10px;
    padding: 12px;
    box-shadow: $box-shadow-main-content;
  }
}
</style>
