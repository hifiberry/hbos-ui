<template>
  <div class="sound">
    <h1>Speaker Equaliser</h1>

    <!-- Frequency Graph Card -->
    <div class="card">
      <div class="graph">
        <ApexChart type="line" height="300" :options="chartOptions" :series="chartSeries" />
      </div>
    </div>

    <div class="card mt-3">
      <div class="equaliser-panel">
        <!-- Channel Tabs -->
        <div class="tabs">
          <button :class="['tab', { active: activeChannel === 'left' }]" @click="setActiveChannel('left')">
            Left Channel
          </button>
          <button :class="['tab', { active: activeChannel === 'right' }]" @click="setActiveChannel('right')">
            Right
          </button>
        </div>

        <!-- Filters Panel -->
        <div class="filters">
          <div class="filter-header-wrapper">
            <h3 class="channel-title">
              {{ activeChannel === 'left' ? 'Left Channel' : 'Right Channel' }}
            </h3>
            <div class="more-option">
              <AppIcon icon="link-unlinked" />
              <AppIcon icon="ear" />
              <AppIcon icon="more" />
            </div>
          </div>

          <!-- Filter Buttons -->
          <div class="filter-buttons">
            <button v-for="filter in filters" :key="filter.id"
              :class="['filter', { active: activeFilter === filter.id }]" @click="setActiveFilter(filter.id)">
              <AppIcon :icon="filter.icon" :class="filter.icon === 'filter-peak' ? 'icon-stroke' : ''" />
              <div v-if="filter.text" class="filter-text">{{ filter.text }}</div>
            </button>
            <button class="filter active" @click="showAddFilterModal = true">
              <AppIcon icon="plus" />
            </button>
          </div>
        </div>

        <!-- Static Content -->
        <div class="filters">
          <div class="filter-header-wrapper">
            <h3 class="channel-title">Filter Name</h3>
            <div class="remove-filter-text">- Remove Filter</div>
          </div>
          <div class="filter-header-wrapper">
            <h3 class="channel-title">On</h3>
            <div class="remove-filter-text">
              <div class="player-actions">
                <div class="player-toggle">
                  <label class="toggle-switch">
                    <input type="checkbox" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="filter-control">
          <div class="control-grid">
            <div class="control-item">
              <div class="control-value">
                <div>{{ frequency }} Hz</div>
                <div class="chevron">
                  <AppIcon icon="chevron-thin-small-left" @click="decrementFrequency" />
                  <AppIcon icon="chevron-thin-small-right" @click="incrementFrequency" />
                </div>
              </div>
              <div class="control-label">Frequency</div>
            </div>
            <div class="control-item">
              <div class="control-value">
                <div>{{ gain }} dB</div>
                <div class="chevron">
                  <AppIcon icon="minus-small" @click="decrementGain" />
                  <AppIcon icon="plus-small" @click="incrementGain" />
                </div>
              </div>
              <div class="control-label">Gain</div>
            </div>
            <div class="control-item">
              <div class="control-value">
                <div>Q 0.71</div>
                <div class="chevron">
                  <AppIcon icon="resize-wider" />
                  <AppIcon icon="resize-narrower" />
                </div>
              </div>
              <div class="control-label">Width</div>
            </div>
          </div>
        </div>

        <!-- Presets -->
        <div class="filters">
          <div class="filter-header-wrapper">
            <h3 class="channel-title">Presets</h3>
            <div class="remove-filter-text">View Saved Presets</div>
          </div>
          <div class="filter-header-wrapper">
            <h3 class="channel-text">
              Current sound design can be saved to a listening mode preset.
            </h3>
          </div>
          <div class="filter-header-wrapper">
            <button class="save-listen-mode">Save Listening Mode</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- Add Filter Modal -->
  <teleport to="body">
    <div v-if="showAddFilterModal" class="modal-backdrop" @click.self="showAddFilterModal = false">
      <div class="modal-content">
        <h2>Add New Filter</h2>
        <p>Select filter type before adding:</p>

        <div class="filter-type-selector">
          <button v-for="type in ['filter-peak', 'filter-low-shelf', 'filter-high-shelf']" :key="type"
            :class="['filter-type-option', { selected: selectedFilterType === type }]"
            @click="selectedFilterType = type">
            <AppIcon :icon="type" />
            <span>{{ type.replace('filter-', '').replace('-', ' ') }}</span>
          </button>
        </div>

        <div class="modal-actions">
          <button :disabled="!selectedFilterType" @click="confirmAddFilter">Confirm</button>
          <button @click="showAddFilterModal = false">Cancel</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import AppIcon from '@/components/app-icon.vue'
import ApexChart from 'vue3-apexcharts'

// Types
type Channel = 'left' | 'right'

interface Filter {
  id: number
  icon: string
  text: string
  frequency: number
  gain: number
}

interface SeriesData {
  name: string
  type: 'area' | 'line'
  data: number[]
}

// State
const activeChannel = ref<Channel>('left')
const selectedFilterType = ref<string | null>(null)
const filters = ref<Filter[]>([
  { id: 1, icon: 'filter-peak-up', text: '1000', frequency: 1000, gain: 0 }
])
const showAddFilterModal = ref(false)

const activeFilter = ref<number | null>(filters.value[0].id)
const frequency = ref(filters.value[0].frequency)
const gain = ref(filters.value[0].gain)
const widthType = ref<'narrow' | 'wide'>('narrow')
const isDragging = ref(false)

// Methods
function setActiveChannel(channel: Channel) {
  activeChannel.value = channel
}

function setActiveFilter(id: number) {
  activeFilter.value = id
  const filter = filters.value.find(f => f.id === id)
  if (filter) {
    frequency.value = filter.frequency
    gain.value = filter.gain
  }
}
const confirmAddFilter = () => {
  if (!selectedFilterType.value) return;

  const newId = Date.now(); // simple unique ID
  filters.value.push({
    id: newId,
    icon: selectedFilterType.value,
    text: '',
    frequency: 1000,
    gain: 0,
  });
  activeFilter.value = newId;

  selectedFilterType.value = null;
  showAddFilterModal.value = false;
};

function addNewFilter() {
  const newId = filters.value.length + 1
  const newFilter: Filter = {
    id: newId,
    icon: 'filter-peak',
    text: '1000',
    frequency: 1000,
    gain: 0,
  }
  filters.value.push(newFilter)
  setActiveFilter(newFilter.id)
}

function incrementFrequency() {
  const filter = filters.value.find(f => f.id === activeFilter.value)
  if (filter) {
    filter.frequency = Math.min(10000, filter.frequency + 1000)
    frequency.value = filter.frequency
  }
}

function decrementFrequency() {
  const filter = filters.value.find(f => f.id === activeFilter.value)
  if (filter) {
    filter.frequency = Math.max(20, filter.frequency - 1000)
    frequency.value = filter.frequency
  }
}

function incrementGain() {
  const filter = filters.value.find(f => f.id === activeFilter.value)
  if (filter) {
    filter.gain = Math.min(25, filter.gain + 1)
    gain.value = filter.gain
  }
}

function decrementGain() {
  const filter = filters.value.find(f => f.id === activeFilter.value)
  if (filter) {
    filter.gain = Math.max(-25, filter.gain - 1)
    gain.value = filter.gain
  }
}

function toggleWidth() {
  widthType.value = widthType.value === 'narrow' ? 'wide' : 'narrow'
}

function formatHz(val: string | number) {
  return `${val} Hz`
}

const baseFreqs = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
  2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000,
]

function getEQCurve(icon: string, freq: number, gain: number): number[] {
  const widthFactor = widthType.value === 'narrow' ? 2 : 1
  return baseFreqs.map((x) => {
    const d = Math.log10(x / freq)
    const response =
      icon === 'filter-peak-up'
        ? gain * Math.exp(-Math.pow(d * widthFactor, 2))
        : icon === 'filter-peak-down'
          ? -Math.abs(gain) * Math.exp(-Math.pow(d * widthFactor, 2))
          : gain * 0.5 * Math.exp(-Math.pow(d * widthFactor, 2))
    return parseFloat(response.toFixed(1))
  })
}

// FIXED: Add type to avoid 'never[]' error
const chartSeries = ref<SeriesData[]>([
  { name: 'EQ Curve', type: 'area', data: [] },
  { name: 'Reference', type: 'area', data: [] },
])

const chartOptions = ref({
  chart: {
    type: 'area',
    height: '100%',
    toolbar: { show: false },
    zoom: { enabled: false },
    events: {
      mouseDown: () => {
        isDragging.value = true
      },
      mouseUp: () => {
        isDragging.value = false
      },
      mouseMove: (event: MouseEvent, chartContext: any) => {
        if (!isDragging.value) return
        const chartEl = chartContext?.chart?.el
        const rect = chartEl?.getBoundingClientRect()
        if (!event || !rect) return

        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        const chartWidth = rect.width
        const chartHeight = rect.height

        const logFreq = Math.log10(20) + (x / chartWidth) * (Math.log10(10000) - Math.log10(20))
        const newFreq = Math.pow(10, logFreq)
        const newGain = 25 - (y / chartHeight) * 50

        const filter = filters.value.find((f) => f.id === activeFilter.value)
        if (filter) {
          filter.frequency = Math.round(Math.max(20, Math.min(10000, newFreq)))
          filter.gain = Math.round(Math.max(-25, Math.min(25, newGain)))
          frequency.value = filter.frequency
          gain.value = filter.gain
        }
      },
    },
  },
  stroke: {
    curve: 'smooth',
    width: [2, 2],
    colors: ['#00b8ff', '#ff69b4'],
  },
  fill: {
    type: ['gradient', 'gradient'],
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.05,
      stops: [0, 90, 100],
    },
    opacity: [0.4, 0.2],
    colors: ['#00b8ff', '#ff69b4'],
  },
  colors: ['#00b8ff', '#ff69b4'],
  xaxis: {
    type: 'category',
    categories: baseFreqs,
    labels: {
      formatter: formatHz,
      style: { colors: '#aaa' },
    },
  },
  yaxis: {
    min: -25,
    max: 25,
    tickAmount: 5,
    labels: { style: { colors: '#aaa' } },
  },
  markers: {
    size: 6,
    colors: ['#00b8ff'],
    strokeColor: '#fff',
    strokeWidth: 2,
    hover: { size: 9 },
  },
  dataLabels: { enabled: false },
  grid: { borderColor: '#333' },
  tooltip: { shared: true, intersect: false },
  legend: { show: true },
})

// 👉 Show only active filter curve
watchEffect(() => {
  const active = filters.value.find((f) => f.id === activeFilter.value)
  if (!active) return
  const eqCurve = getEQCurve(active.icon, active.frequency, active.gain)
  chartSeries.value = [
    { name: 'EQ Curve', type: 'area', data: eqCurve },
    { name: 'Reference', type: 'area', data: eqCurve },
  ]
})

// 👉 Sync frequency/gain from active filter
watchEffect(() => {
  const filter = filters.value.find((f) => f.id === activeFilter.value)
  if (filter) {
    frequency.value = filter.frequency
    gain.value = filter.gain
  }
})

// 👉 Update text for each filter button (only frequency shown)
watchEffect(() => {
  filters.value.forEach((f) => {
    f.text = `${f.frequency}` // only frequency, no dB
  })
})
</script>



<style scoped lang="scss">
.sound {
  padding: 20px;

  .card {
    border: 1px solid #ccc;
    padding: 10px;
    margin-bottom: 20px;
  }

  .graph {
    height: 300px;
    position: relative;

    canvas {
      width: 100% !important;
      height: 100% !important;
      background: transparent;
    }
  }

  .equaliser-panel {
    .tabs {
      display: flex;
      flex-wrap: nowrap; // keep left/right tabs on the same line

      .tab {
        flex: 1 1 50%;
        padding: 14px;
        background: #f2f2f2;
        cursor: pointer;
        font-family: 'Metropolis', sans-serif;
        font-size: 20px;
        color: #707070;
        border: 1px solid #ccc;
        border-right: none;

        &:first-child {
          border-radius: 8px 0 0 8px;
        }

        &:last-child {
          border-radius: 0 5px 5px 0;
          border-right: 1px solid #ccc;
        }

        &.active {
          background: #e11e4a;
          color: white;
        }
      }
    }

    .filter-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .filter {
        padding: 15px 30px;
        border: 1px solid rgba(112, 112, 112, 1);
        cursor: pointer;
        border-radius: 5px;
        margin: 5px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        svg {
          width: 24px;
          height: 24px;
        }

        &.active {
          color: #e11e4a;
          background: rgba(225, 30, 74, 0.1);
          border: 2px solid #e11e4a;
        }

        .filter-text {
          margin-top: 5px;
          font-weight: 500;
        }
      }
    }

    .filter-control {
      .control-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border: 1px solid rgba(112, 112, 112, 0.5);
        border-radius: 8px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.02);
        backdrop-filter: blur(4px);
      }

      .control-item {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border-right: 1px solid rgba(112, 112, 112, 0.5);

        &:last-child {
          border-right: none;
        }

        .control-value {
          width: 100%;
          text-align: center;
          padding: 12px;
          font-weight: 600;
          font-size: 16px;
          color: rgba(0, 0, 0, 0.7);
          border-bottom: 1px solid rgba(112, 112, 112, 0.5);
          background: rgba(255, 255, 255, 0.02);

          .chevron {
            display: flex;
            justify-content: center;
            margin-top: 10px;
            gap: 20px;
          }
        }

        .control-label {
          width: 100%;
          text-align: center;
          padding: 12px;
          font-weight: 500;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.5);
        }
      }
    }

    .filter-header-wrapper {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;

      .save-listen-mode {
        color: #e11e4a;
        border: 2px solid #e11e4a;
        width: 100%;
        padding: 15px 0px;
        border-radius: 5px;
        font-size: 23px;
        font-weight: 500;
      }

      .channel-text {
        color: rgba(112, 112, 112, 1);
      }

      .more-option {
        display: flex;
        min-width: 90px;
        justify-content: space-between;
        margin: 11px 1px;
      }

      .icon-stroke path {
        stroke: #e11e4a !important;
        stroke-width: 2px;
        fill: none;
      }

      .remove-filter-text {
        color: #e11e4a;
      }
    }

    .channel-title {
      font-family: 'Metropolis', sans-serif;
      font-weight: 500;
      font-size: 20px;
      line-height: 1;
      margin: 15px 1px;
    }
  }

  .player-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 16px;

    .player-toggle {
      display: flex;
      align-items: center;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      cursor: pointer;

      input {
        opacity: 0;
      }

      .toggle-slider {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--color-body-secondary);
        transition: 0.3s;
        border-radius: 24px;

        &:before {
          position: absolute;
          content: '';
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }
      }

      input:checked+.toggle-slider {
        background-color: var(--primary);
      }

      input:checked+.toggle-slider:before {
        transform: translateX(20px);
      }
    }
  }
}

// ✅ Responsive fixes: tabs always inline, no forced stacking of filters
@media (max-width: 768px) {
  .sound {
    padding: 10px;

    .equaliser-panel {
      .tabs {
        flex-wrap: nowrap;
      }

      .tabs .tab {
        font-size: 16px;
        padding: 10px;
      }

      .filter-control .control-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  }
}

@media (max-width: 480px) {
  .sound {
    .equaliser-panel {
      .tabs {
        flex-wrap: nowrap;
      }

      .tabs .tab {
        flex: 1 1 50%;
      }
    }
  }
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: #fff;
  padding: 30px;
  border-radius: 10px;
  width: 400px;
  max-width: 90%;
  text-align: center;
  font-family: 'Metropolis', sans-serif;

  h2 {
    font-size: 22px;
    margin-bottom: 15px;
  }

  p {
    font-size: 16px;
    margin-bottom: 20px;
  }

  .modal-actions {
    display: flex;
    justify-content: center;
    gap: 20px;

    button {
      padding: 10px 20px;
      font-size: 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;

      &:first-child {
        background-color: #e11e4a;
        color: #fff;
      }

      &:last-child {
        background-color: #ccc;
        color: #333;
      }
    }
  }
}

.filter-type-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  margin: 4px;
  border: 1px solid #ccc;
  cursor: pointer;
  border-radius: 6px;
}

.filter-type-option.selected {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}
</style>
