<template>
  <div
    class="vu-meter"
    :class="{ 'vu-meter--silent': !vuMeterStore.hasSignal }"
  >
    <!-- Left channel -->
    <div class="vu-meter__row">
      <span class="vu-meter__label">L</span>
      <div class="vu-meter__track">
        <div
          class="vu-meter__fill"
          :style="{ width: smoothLeft + '%' }"
          :class="{ 'vu-meter__fill--clip': vuMeterStore.leftClipping }"
        />
        <div
          class="vu-meter__peak"
          :style="{ left: leftPeakHold + '%' }"
        />
      </div>
    </div>
    <!-- Right channel -->
    <div class="vu-meter__row">
      <span class="vu-meter__label">R</span>
      <div class="vu-meter__track">
        <div
          class="vu-meter__fill"
          :style="{ width: smoothRight + '%' }"
          :class="{ 'vu-meter__fill--clip': vuMeterStore.rightClipping }"
        />
        <div
          class="vu-meter__peak"
          :style="{ left: rightPeakHold + '%' }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useVuMeterStore } from '@/stores/vu-meter'

const vuMeterStore = useVuMeterStore()

const smoothLeft = ref(0)
const smoothRight = ref(0)
const leftPeakHold = ref(0)
const rightPeakHold = ref(0)

const SMOOTHING = 0.3
const PEAK_DECAY = 0.4 // % per frame
let animId: number | null = null

function animate() {
  // Smooth RMS
  smoothLeft.value += (vuMeterStore.leftRmsPercent - smoothLeft.value) * SMOOTHING
  smoothRight.value += (vuMeterStore.rightRmsPercent - smoothRight.value) * SMOOTHING

  // Peak hold with decay
  const lp = vuMeterStore.leftPeakPercent
  if (lp > leftPeakHold.value) leftPeakHold.value = lp
  else leftPeakHold.value = Math.max(0, leftPeakHold.value - PEAK_DECAY)

  const rp = vuMeterStore.rightPeakPercent
  if (rp > rightPeakHold.value) rightPeakHold.value = rp
  else rightPeakHold.value = Math.max(0, rightPeakHold.value - PEAK_DECAY)

  animId = requestAnimationFrame(animate)
}

onMounted(() => {
  vuMeterStore.connect()
  animId = requestAnimationFrame(animate)
})

onUnmounted(() => {
  vuMeterStore.disconnect()
  if (animId !== null) cancelAnimationFrame(animId)
})
</script>

<style scoped lang="scss">
.vu-meter {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 160px;
  transition: opacity 0.8s ease;

  &--silent {
    opacity: 0.25;
  }
}

.vu-meter__row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.vu-meter__label {
  color: var(--color-body-secondary);
  font-size: 10px;
  width: 10px;
  text-align: right;
  flex-shrink: 0;
  opacity: 0.6;
}

.vu-meter__track {
  position: relative;
  height: 6px;
  flex: 1;
  border-radius: 3px;
  background: var(--progress-slider-bg);
  overflow: hidden;
}

.vu-meter__fill {
  height: 100%;
  border-radius: 3px;
  background: var(--primary);
  transition: width 80ms ease-out;

  &--clip {
    background: #ef4444;
  }
}

.vu-meter__peak {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: var(--primary);
  opacity: 0.5;
  border-radius: 1px;
  transform: translateX(-1px);
}
</style>
