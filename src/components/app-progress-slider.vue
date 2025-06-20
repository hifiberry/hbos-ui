<template>
  <div
    ref="slider"
    class="app-progress-slider"
    :class="{ disabled, 'is-on-header': isOnHeader }"
    @click="handleClick"
    @mousedown="startDrag"
    @touchstart="startTouch"
  >
    <div class="app-progress-slider__track">
      <div class="app-progress-slider__progress" :style="{ width: displayPercent + '%' }" />
    </div>
    <div
      v-if="hasThumb && !isOnHeader"
      class="app-progress-slider__thumb"
      :style="{ left: displayPercent + '%' }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'

interface AppProgressSliderProps {
  value: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  hasThumb?: boolean
  isDraggable?: boolean
  isOnHeader?: boolean
}

const {
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  hasThumb = true,
  isDraggable = false,
  isOnHeader = false,
} = defineProps<AppProgressSliderProps>()

const emit = defineEmits<{
  (e: 'click:progress', value: number): void
}>()

const slider = ref<HTMLDivElement | null>(null)
const dragging = ref(false)
const hasDragged = ref(false)
const internalValue = ref(value)

watch(
  () => value,
  (newVal) => {
    if (!dragging.value) internalValue.value = newVal
  },
)

const displayPercent = computed(() => {
  const clamped = Math.min(Math.max(internalValue.value, min), max)
  return ((clamped - min) / (max - min)) * 100
})

function getValueFromMouse(event: MouseEvent): number | null {
  if (!slider.value) return null

  const rect = slider.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const width = rect.width
  const ratio = clickX / width

  let newValue = min + ratio * (max - min)

  if (step > 0) {
    newValue = Math.round((newValue - min) / step) * step + min
  }

  return Math.min(Math.max(newValue, min), max)
}

function handleClick(event: MouseEvent) {
  if (disabled || isDraggable) return

  const newValue = getValueFromMouse(event)
  if (newValue !== null) {
    emit('click:progress', newValue)
  }
}

function startDrag(event: MouseEvent) {
  if (disabled || !isDraggable) return

  dragging.value = true
  hasDragged.value = false

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  event.preventDefault()
}

function onDrag(event: MouseEvent) {
  if (!dragging.value || disabled) return

  const newValue = getValueFromMouse(event)
  if (newValue !== null) {
    internalValue.value = newValue
    hasDragged.value = true
  }
}

function stopDrag() {
  if (!dragging.value) return

  if (hasDragged.value) {
    emit('click:progress', internalValue.value)
  }

  dragging.value = false
  hasDragged.value = false

  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// For touch devices
function getValueFromTouch(event: TouchEvent, useChangedTouches = false): number | null {
  if (!slider.value) return null

  const touches = useChangedTouches ? event.changedTouches : event.touches
  if (touches.length === 0) return null

  const rect = slider.value.getBoundingClientRect()
  const touchX = touches[0].clientX - rect.left
  const width = rect.width
  const ratio = touchX / width

  let newValue = min + ratio * (max - min)

  if (step > 0) {
    newValue = Math.round((newValue - min) / step) * step + min
  }

  return Math.min(Math.max(newValue, min), max)
}

let touchStartX = 0
let touchMoved = false

function startTouch(event: TouchEvent) {
  if (disabled) return

  touchMoved = false
  touchStartX = event.touches[0].clientX

  if (!isDraggable) return

  dragging.value = true
  hasDragged.value = false

  document.addEventListener('touchmove', onTouchMove)
  document.addEventListener('touchend', stopTouch)
}

function onTouchMove(event: TouchEvent) {
  if (event.touches.length === 0) return

  const deltaX = Math.abs(event.touches[0].clientX - touchStartX)
  if (deltaX > 5) touchMoved = true // threshold to detect dragging

  if (!dragging.value || disabled) return

  const newValue = getValueFromTouch(event)
  if (newValue !== null) {
    internalValue.value = newValue
    hasDragged.value = true
  }
}

function stopTouch(event: TouchEvent) {
  if (!touchMoved) {
    const newValue = getValueFromTouch(event, true) // use changedTouches
    if (newValue !== null) emit('click:progress', newValue)
  }

  if (dragging.value && hasDragged.value) {
    emit('click:progress', internalValue.value)
  }

  dragging.value = false
  hasDragged.value = false

  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', stopTouch)
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', stopTouch)
})
</script>

<style scoped lang="scss">
.app-progress-slider {
  position: relative;
  width: 100%;
  height: 8px;
  background: var(--progress-slider-bg);
  border-radius: 4px;
  cursor: pointer;
  user-select: none;

  @include media-down(md) {
    height: 6px;
    border-radius: 3px;
  }

  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  &__track {
    position: absolute;
    height: 100%;
    width: 100%;
    background-color: transparent;
  }

  &__progress {
    height: 100%;
    background-color: var(--primary);
    border-radius: 4px;

    @include media-down(md) {
      border-radius: 3px;
    }
  }

  &__thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background-color: var(--primary);
    border-radius: 50%;
    pointer-events: none;
  }

  &.is-on-header {
    margin-top: 16px;
    height: 2px;
    border-radius: 1px;
    background: var(--progress-slider-on-header-bg);

    @include media-down(md) {
      margin-top: 12px;
    }

    .app-progress-slider__progress {
      height: 2px;
      border-radius: 1px;
      background-color: var(--progress-slider-on-header-progess);
    }
  }
}
</style>
