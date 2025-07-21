<template>
  <span
    :class="['app-icon-mask', `icon-${icon.replace('/', '-')}`]"
    :style="{ width: `${width}px`, height: `${height}px` }"
  />
</template>

<script setup lang="ts">
interface IconMaskProps {
  icon?: string
  width?: number | string
  height?: number | string
}

const { icon = 'logo', width = 24, height = 24 } = defineProps<IconMaskProps>()
</script>

<style scoped lang="scss">
.app-icon-mask {
  display: inline-block;
  background-color: currentColor;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  transition: all 0.2s linear;

  // Fallback for browsers that don't support mask
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
}

// Generate mask URLs for each icon
.icon-tabler-volume-off {
  mask-image: url('/images/svg/tabler/volume-off.svg');
  -webkit-mask-image: url('/images/svg/tabler/volume-off.svg');
}

.icon-tabler-volume {
  mask-image: url('/images/svg/tabler/volume.svg');
  -webkit-mask-image: url('/images/svg/tabler/volume.svg');
}

.icon-moon-thin {
  mask-image: url('/images/svg/moon-thin.svg');
  -webkit-mask-image: url('/images/svg/moon-thin.svg');
}

.icon-play {
  mask-image: url('/images/svg/play.svg');
  -webkit-mask-image: url('/images/svg/play.svg');
}

.icon-pause {
  mask-image: url('/images/svg/pause.svg');
  -webkit-mask-image: url('/images/svg/pause.svg');
}

.icon-next {
  mask-image: url('/images/svg/next.svg');
}

.icon-prev {
  mask-image: url('/images/svg/prev.svg');
}

.icon-shuffle {
  mask-image: url('/images/svg/shuffle.svg');
}

.icon-loop {
  mask-image: url('/images/svg/loop.svg');
}

.icon-loop-one {
  mask-image: url('/images/svg/loop-one.svg');
}

.icon-magnifying-glass-light {
  mask-image: url('/images/svg/magnifying-glass-light.svg');
}

.icon-clear {
  mask-image: url('/images/svg/clear.svg');
}

.icon-caret-down {
  mask-image: url('/images/svg/caret-down.svg');
}

.icon-loading {
  mask-image: url('/images/svg/loading.svg');
}

.icon-music {
  mask-image: url('/images/svg/music.svg');
}

.icon-music-note-simple-light {
  mask-image: url('/images/svg/music-note-simple-light.svg');
}

.icon-notebook-thin {
  mask-image: url('/images/svg/notebook-thin.svg');
}

.icon-playlist-light {
  mask-image: url('/images/svg/playlist-light.svg');
}

.icon-play-light {
  mask-image: url('/images/svg/play-light.svg');
}

.icon-users-thin {
  mask-image: url('/images/svg/users-thin.svg');
}

// Additional commonly used icons
.icon-computer {
  mask-image: url('/images/svg/computer.svg');
}

.icon-edit {
  mask-image: url('/images/svg/edit.svg');
}

.icon-checkmark {
  mask-image: url('/images/svg/checkmark.svg');
}

.icon-close {
  mask-image: url('/images/svg/close.svg');
}

.icon-hifiberry {
  mask-image: url('/images/svg/hifiberry.svg');
}

.icon-volume {
  mask-image: url('/images/svg/volume.svg');
}

.icon-heart {
  mask-image: url('/images/svg/heart.svg');
}

.icon-plus {
  mask-image: url('/images/svg/plus.svg');
}

.icon-refresh {
  mask-image: url('/images/svg/refresh.svg');
}

.icon-nas {
  mask-image: url('/images/svg/nas.svg');
}

.icon-cloud {
  mask-image: url('/images/svg/cloud.svg');
}

// Lucide icons
.icon-lucide-play {
  mask-image: url('/images/svg/lucide/play.svg');
}

.icon-lucide-pause {
  mask-image: url('/images/svg/lucide/pause.svg');
}

.icon-lucide-skip-back {
  mask-image: url('/images/svg/lucide/skip-back.svg');
}

.icon-lucide-skip-forward {
  mask-image: url('/images/svg/lucide/skip-forward.svg');
}

.icon-lucide-shuffle {
  mask-image: url('/images/svg/lucide/shuffle.svg');
}

.icon-lucide-repeat {
  mask-image: url('/images/svg/lucide/repeat.svg');
}

.icon-lucide-repeat-1 {
  mask-image: url('/images/svg/lucide/repeat-1.svg');
}

.icon-lucide-heart {
  mask-image: url('/images/svg/lucide/heart.svg');
}

.icon-lucide-heart-outline {
  mask-image: url('/images/svg/lucide/heart-outline.svg');
}

.icon-lucide-heart-filled {
  mask-image: url('/images/svg/lucide/heart-filled.svg');
}
</style>
