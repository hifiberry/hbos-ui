<template>
  <div class="settings">
    <h1>General sound settings</h1>

    <div class="settings-overview">
      <div class="service-card">
        <div class="setting-item">
          <div class="setting-header">
            <div class="setting-label">
              <AppIcon icon="tabler/speaker" class="setting-icon" />
              <div class="setting-title">
                <h3>Volume limit</h3>
              </div>
            </div>
            <div class="setting-progress">
              <AppProgressSlider
                :value="volumeLimitPercent"
                :min="0"
                :max="100"
                :step="1"
                :disabled="!volumeAvailable"
                :has-thumb="true"
                :is-draggable="true"
                :is-on-header="false"
                @click:progress="onSliderChange"
              />
            </div>
            <div class="setting-value">
              <span class="percent">{{ volumeLimitPercent }}%</span>
              <span class="db">{{ displayDb }}</span>
            </div>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-header">
            <div class="setting-label">
              <AppIcon icon="tabler/speaker" class="setting-icon" />
              <div class="setting-title">
                <h3>Balance</h3>
              </div>
            </div>
            <div class="setting-progress">
              <AppProgressSlider
                :value="balancePercent"
                :min="0"
                :max="100"
                :step="1"
                :disabled="false"
                :has-thumb="true"
                :is-draggable="true"
                :is-on-header="false"
                @click:progress="onBalanceChange"
              />
            </div>
            <div class="setting-value">
              <span class="percent">{{ balancePercent }}%</span>
              <span class="db">{{ balanceLabel }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'
import AppProgressSlider from '@/components/app-progress-slider.vue'
import { ref, computed, onMounted } from 'vue'
import { getPipewireVolume, setPipewireVolume, type PipewireVolumeData } from '@/api/pipewire'

// Local UI state for volume limit (0-100%)
const volumeLimitPercent = ref<number>(100)
const volumeLimitDb = ref<number | null>(null)
const volumeAvailable = ref<boolean>(true)

// Convert percentage to attenuation in dB (0% => -∞ dB, otherwise 20*log10(p))
const displayDb = computed(() => {
  if (volumeLimitDb.value === null) {
    const p = volumeLimitPercent.value / 100
    if (p <= 0) return '- ∞ dB'
    const db = 20 * Math.log10(p)
    const rounded = Math.round(db * 10) / 10 // 0.1 dB precision
    return `${rounded.toFixed(1)} dB`
  }
  const rounded = Math.round(volumeLimitDb.value * 10) / 10
  return `${rounded.toFixed(1)} dB`
})

// Update local state when the slider changes (click or drag end)
async function onSliderChange(newVal: number) {
  const pct = Math.round(newVal)
  volumeLimitPercent.value = pct
  // PipeWire expects linear 0.0-1.0; API handles curve conversion and returns dB
  try {
    const linear = Math.max(0, Math.min(1, pct / 100))
    const res = await setPipewireVolume('default', { volume: linear })
    if (res.status === 'success' && res.data) {
      // Reflect authoritative values from backend
      const data = res.data as PipewireVolumeData
      volumeLimitPercent.value = Math.round((data.volume ?? linear) * 100)
      volumeLimitDb.value = data.volume_db
      volumeAvailable.value = true
    }
  } catch (e) {
    console.error('Failed to set PipeWire default volume:', e)
    volumeAvailable.value = false
  }
}

// Balance (0..100) where 50 = center
const balancePercent = ref<number>(50)

// Human-readable label: Left/Right/Center with bias amount
const balanceLabel = computed(() => {
  const p = balancePercent.value
  const delta = Math.abs(p - 50) * 2 // 0..100 bias amount
  const amt = Math.round(delta)
  if (amt === 0) return 'Center'
  return p < 50 ? `Left +${amt}%` : `Right +${amt}%`
})

function onBalanceChange(newVal: number) {
  balancePercent.value = Math.round(newVal)
}

// Initialize from default sink volume
onMounted(async () => {
  try {
    const res = await getPipewireVolume('default')
    if (res.status === 'success' && res.data) {
      const data = res.data as PipewireVolumeData
      volumeLimitPercent.value = Math.round((data.volume ?? 1) * 100)
      volumeLimitDb.value = data.volume_db
      volumeAvailable.value = true
    }
  } catch (e) {
    console.warn('PipeWire volume not available:', e)
    volumeAvailable.value = false
  }
})
</script>

<style scoped lang="scss">
.settings {
  h1 { margin-bottom: 32px; color: var(--color-head); }
  .settings-overview {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;
    .service-card {
      display: block; background: var(--background-card); border-radius: 8px; padding: 24px; border: 1px solid var(--color-border, #e5e7eb);
      .service-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
      .service-icon { width: 24px; height: 24px; color: var(--color-primary); }
      h2 { margin: 0; color: var(--color-head); font-size: 1.25rem; }
      .service-description { color: var(--color-body-secondary); line-height: 1.5; }

      .setting-item {
        margin-top: 0;
        padding-top: 10px;
        border-top: none;

      /* add spacing only between subsequent settings */
      & + .setting-item {
        margin-top: 15px;
      }
        .setting-header {
          display: grid;
          grid-template-columns: 260px 1fr 200px; /* label | slider | value */
          align-items: center;
          column-gap: 16px;
          margin-bottom: 10px;

          .setting-label {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0; /* allow text to ellipsize if needed */
          }

          .setting-icon {
            width: 40px;
            height: 40px;
            color: var(--color-primary);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .setting-icon :deep(svg) {
            width: 28px;
            height: 28px;
            object-fit: contain;
          }

          .setting-title {
            display: flex;
            flex-direction: column;
            gap: 2px;
            h3 { margin: 0; font-size: 1.125rem; font-weight: 600; color: var(--color-head); }
            .muted { color: var(--color-body-secondary); }
          }

          .setting-progress {
            display: flex;
            align-items: center;
            min-width: 180px;
          }

          .setting-value {
            justify-self: end;
            display: flex;
            gap: 10px;
            align-items: baseline;
            .percent { font-weight: 600; color: var(--color-head); }
            .db { color: var(--color-body-secondary); }
          }
        }

        .setting-control {
          input[type='range'] {
            width: 100%;
          }
        }
      }
    }
  }
}

/* Responsive: stack into one column on small screens */
@media (max-width: 800px) {
  .settings {
    .settings-overview { grid-template-columns: 1fr; }
    .settings-overview .service-card .setting-item .setting-header {
          /* Force vertical stacking on small screens */
      display: flex !important;
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
    }
    .settings-overview .service-card .setting-item .setting-header .setting-label { align-items: center; }
    .settings-overview .service-card .setting-item .setting-header .setting-progress { min-width: 0; }
    .settings-overview .service-card .setting-item .setting-header .setting-progress :deep(.app-progress-slider) { width: 100%; }
    .settings-overview .service-card .setting-item .setting-header .setting-value { align-self: flex-start; }
  }
}
</style>
