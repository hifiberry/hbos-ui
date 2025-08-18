<template>
  <div class="room-acoustics-page">
    <div class="room-acoustics">
      <div class="page-header">
        <h1>Room Acoustics Correction</h1>
        <button @click="startMeasurement" class="measure-button" title="Start Room Measurement">
          <AppIcon icon="tabler/microphone" />
          Measure Room
        </button>
      </div>

      <!-- Measurements List -->
      <div v-if="measurements.length > 0" class="measurements-section">
        <h2>Saved Measurements</h2>
        <div class="measurements-grid">
          <div
            v-for="measurement in measurements"
            :key="measurement.id"
            class="measurement-card"
            @click="openEqualisation(measurement)"
            title="Open equalisation wizard"
          >
            <div class="measurement-header">
              <div class="measurement-info">
                <h3>{{ measurement.name }}</h3>
                <p class="measurement-date">{{ formatDate(measurement.timestamp) }}</p>
                <p class="measurement-details">
                  {{ measurement.frequencies.length }} frequency points • {{ measurement.sample_rate }} Hz
                </p>
              </div>
              <button @click.stop="deleteMeasurement(measurement.id)" class="delete-button" title="Delete Measurement">
                <AppIcon icon="close" />
              </button>
            </div>
            <div class="measurement-preview">
              <svg viewBox="0 0 300 100" class="preview-svg">
                <path
                  :d="generatePreviewPath(measurement)"
                  fill="none"
                  stroke="#4CAF50"
                  stroke-width="1"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="card">
        <div class="empty-state">
          <AppIcon icon="tabler/armchair" class="empty-icon" />
          <h3>Room Acoustics Correction</h3>
          <p>Use the "Measure Room" button above to start the acoustic measurement wizard. This will help you analyze and correct room acoustics for optimal sound reproduction.</p>
        </div>
      </div>
    </div>

    <!-- Room Measurement Wizard -->
    <AppRoomMeasurementWizard
      :is-open="showMeasurementWizard"
      @close="showMeasurementWizard = false"
      @measurement-completed="handleMeasurementCompleted"
    />

    <!-- Room Equalisation Wizard -->
    <AppRoomEqualisationWizard
      :is-open="showEqualisationWizard"
      :measurement="selectedMeasurement"
      @close="showEqualisationWizard = false"
      @equalisation-setup="handleEqualisationSetup"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/app-icon.vue'
import AppRoomMeasurementWizard from '@/components/app-room-measurement-wizard.vue'
import AppRoomEqualisationWizard from '@/components/app-room-equalisation-wizard.vue'
import { useSettingsStore, type RoomMeasurement } from '@/stores/settings'

// State
const showMeasurementWizard = ref(false)
const showEqualisationWizard = ref(false)
const selectedMeasurement = ref<RoomMeasurement | null>(null)
const measurements = ref<RoomMeasurement[]>([])
const settingsStore = useSettingsStore()

// Methods
const startMeasurement = () => {
  showMeasurementWizard.value = true
}

const openEqualisation = (measurement: RoomMeasurement) => {
  selectedMeasurement.value = measurement
  showEqualisationWizard.value = true
}

const handleMeasurementCompleted = async () => {
  console.log('Room measurement completed')
  showMeasurementWizard.value = false
  await loadMeasurements() // Refresh the measurements list
}

const handleEqualisationSetup = (setup: unknown) => {
  console.log('Equalisation setup selected:', setup)
  // TODO: Wire to backend when API is available
}

const loadMeasurements = async () => {
  try {
    measurements.value = await settingsStore.getRoomMeasurements()
    console.log('Loaded measurements:', measurements.value)
  } catch (error) {
    console.error('Failed to load measurements:', error)
    measurements.value = []
  }
}

const deleteMeasurement = async (id: number) => {
  try {
    await settingsStore.deleteRoomMeasurement(id)
    await loadMeasurements() // Refresh the list
    console.log(`Measurement ${id} deleted`)
  } catch (error) {
    console.error('Failed to delete measurement:', error)
  }
}

const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

const generatePreviewPath = (measurement: RoomMeasurement): string => {
  if (!measurement.frequencies || !measurement.magnitudes) return ''

  const minFreq = 20
  const maxFreq = 20000
  const minMag = Math.min(...measurement.magnitudes)
  const maxMag = Math.max(...measurement.magnitudes)
  const width = 300
  const height = 100

  const logScale = (freq: number) => {
    return (Math.log10(freq / minFreq) / Math.log10(maxFreq / minFreq)) * width
  }

  const magScale = (mag: number) => {
    return height - ((mag - minMag) / (maxMag - minMag)) * height
  }

  let path = ''
  for (let i = 0; i < measurement.frequencies.length; i++) {
    const freq = measurement.frequencies[i]
    const mag = measurement.magnitudes[i]

    if (freq >= minFreq && freq <= maxFreq) {
      const x = logScale(freq)
      const y = magScale(mag)

      if (path === '') {
        path = `M ${x} ${y}`
      } else {
        path += ` L ${x} ${y}`
      }
    }
  }

  return path
}

// Lifecycle
onMounted(() => {
  loadMeasurements()
})
</script>

<style scoped lang="scss">
@use '@/assets/scss/mixins' as *;
.room-acoustics-page {
  width: 100%;
  height: 100%;
}

.room-acoustics {
  padding: 20px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h1 {
      margin: 0;
      font-family: 'Metropolis', sans-serif;
      font-weight: 500;
      font-size: 28px;
    }

    .measure-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 1rem;
      transition: background-color 0.2s ease;

      &:hover {
        background: var(--primary-dark, var(--primary));
        opacity: 0.9;
      }

      svg {
        width: 18px;
        height: 18px;
      }
    }
  }

  .measurements-section {
    margin-bottom: 20px;

    h2 {
      font-size: 22px;
      font-weight: 500;
      margin-bottom: 20px;
      color: #333;
    }

    .measurements-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .measurement-card {
      background: var(--card-background, #fff);
      border: 1px solid var(--border-color, #e5e5e5);
      border-radius: 8px;
      padding: 20px;
      position: relative;
      transition: box-shadow 0.2s ease;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .delete-button {
        @include delete-button(24px, 14px);
        position: absolute;
        top: 16px;
        right: 16px;
      }

      .measurement-header {
        margin-bottom: 15px;
        padding-right: 40px; // Leave space for delete button

        .measurement-info {
          h3 {
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 8px 0;
            color: #333;
          }

          .measurement-date {
            font-size: 14px;
            color: #666;
            margin: 0 0 4px 0;
          }

          .measurement-details {
            font-size: 12px;
            color: #888;
            margin: 0;
          }
        }
      }

      .measurement-preview {
        .preview-svg {
          width: 100%;
          height: 80px;
          background: #f8f9fa;
          border-radius: 4px;
        }
      }
    }
  }

  .card {
    padding: 40px;
    margin-bottom: 20px;
    border-radius: 8px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
  }

  .empty-state {
    text-align: center;
    max-width: 400px;

    .empty-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 20px;
      fill: #707070;
    }

    h3 {
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 15px;
      color: #333;
    }

    p {
      font-size: 16px;
      color: #666;
      line-height: 1.6;
    }
  }
}

@media (max-width: 768px) {
  .room-acoustics {
    padding: 10px;

    .page-header {
      flex-direction: column;
      gap: 15px;
      align-items: stretch;

      .measure-button {
        justify-content: center;
      }
    }

    .measurements-section {
      .measurements-grid {
        grid-template-columns: 1fr;
        gap: 15px;
      }

      .measurement-card {
        padding: 15px;

        .delete-button {
          top: 12px;
          right: 12px;
        }

        .measurement-header {
          padding-right: 36px; // Adjust for smaller delete button spacing

          .measurement-info {
            h3 {
              font-size: 16px;
            }

            .measurement-date {
              font-size: 12px;
            }

            .measurement-details {
              font-size: 11px;
            }
          }
        }

        .measurement-preview {
          .preview-svg {
            height: 60px;
          }
        }
      }
    }

    .card {
      padding: 20px;
      min-height: 300px;
    }

    .empty-state {
      .empty-icon {
        width: 48px;
        height: 48px;
      }

      h3 {
        font-size: 20px;
      }

      p {
        font-size: 14px;
      }
    }
  }
}
</style>
