<template>
  <div class="sound">
    <h1>Speaker Equaliser</h1>

    <!-- Frequency Graph Card -->
    <div class="card">
      <div class="graph">
        <canvas ref="frequencyChart"></canvas>
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

        <div class="filters">
          <div class="filter-header-wrapper">
            <h3 class="channel-title">{{ activeChannel === 'left' ? 'Left Channel' : 'Right Channel' }}</h3>
            <div class="more-option">
              <div>
                <AppIcon icon="link-unlinked" />
              </div>
              <div>
                <AppIcon icon="ear" />
              </div>
              <div>
                <AppIcon icon="more" />
              </div>
            </div>
          </div>

          <!-- Filter Buttons -->
          <div class="filter-buttons">
            <button v-for="filter in filters" :key="filter.id"
              :class="['filter', { active: activeFilter === filter.id }]" @click="setActiveFilter(filter.id)">
              <AppIcon :icon="filter.icon" :class="filter.icon === 'filter-peak' ? 'icon-stroke' : ''" />
              <div v-if="filter.text" class="filter-text">{{ filter.text }}</div>
            </button>

            <button class="filter active" @click="addNewFilter">
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

        <div class="filters">
          <div class="filter-header-wrapper">
            <h3 class="channel-title">Presets</h3>
            <div class="remove-filter-text">View Saved Presets</div>
          </div>
          <div class="filter-header-wrapper">
            <h3 class="channel-text">Current sound design can be saved to a listening mode preset.</h3>
          </div>
          <div class="filter-header-wrapper">
            <button class="save-listen-mode">Save Listening Mode</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Chart, registerables } from 'chart.js';
import AppIcon from '@/components/app-icon.vue';

Chart.register(...registerables);

const activeChannel = ref<'left' | 'right'>('left');
function setActiveChannel(channel: 'left' | 'right') {
  activeChannel.value = channel;
}

const filters = ref([
  { id: 1, icon: 'filter-peak-up', text: '164' },
  { id: 2, icon: 'filter-peak', text: '164' },
  { id: 3, icon: 'filter-peak-down', text: '164' },
  { id: 4, icon: 'filter-peak-down', text: '164' },
  { id: 5, icon: 'filter-peak-down', text: '164' },
  { id: 6, icon: 'filter-peak', text: '164' },
]);

const activeFilter = ref<number | null>(filters.value[0].id);
function setActiveFilter(id: number) {
  activeFilter.value = id;
}
function addNewFilter() {
  const newId = filters.value.length + 1;
  filters.value.push({ id: newId, icon: 'filter-peak', text: '164' });
  activeFilter.value = newId;
}

const frequency = ref(1000);
const gain = ref(0);
function incrementFrequency() {
  frequency.value += 1000;
}
function decrementFrequency() {
  frequency.value = Math.max(20, frequency.value - 1000);
}
function incrementGain() {
  gain.value += 1;
}
function decrementGain() {
  gain.value -= 1;
}

const frequencyChart = ref(null);
onMounted(() => {
  if (frequencyChart.value) {
    new Chart(frequencyChart.value, {
      type: 'line',
      data: {
        labels: [10, 50, 100, 500, 1000, 5000, 10000, 20000],
        datasets: [
          {
            label: 'Frequency Response',
            data: [0, 3, 1, -1, -2, 0, 2, -1],
            borderColor: '#666',
            borderWidth: 1,
            pointRadius: 0,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: 0,
        },
        scales: {
          x: {
            type: 'logarithmic',
            ticks: {
              callback: val => `${val}Hz`,
              color: '#aaa',
            },
            grid: {
              color: '#333',
            },
          },
          y: {
            min: -15,
            max: 15,
            ticks: {
              stepSize: 5,
              color: '#aaa',
            },
            grid: {
              color: '#333',
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
      },
    });
  }
});
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
      flex-wrap: wrap;

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
        background: white;
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
            gap: 20px; // Adjust this value as needed for the gap
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
          content: "";
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

@media (max-width: 768px) {
  .sound {
    padding: 10px;

    .equaliser-panel {
      .tabs .tab {
        font-size: 16px;
        padding: 10px;
      }

      .filter-buttons .filter {
        flex: 1 1 48%;
        padding: 12px;
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
      .tabs .tab {
        flex: 1 1 100%;
      }

      .filter-buttons .filter {
        flex: 1 1 100%;
        padding: 12px;
      }
    }
  }
}
</style>
