<template>
  <PageContent>
    <div class="room-acoustics">
      <div class="page-header">
        <BackRouter :to="{name: 'sound'}">
          Room Acoustics
        </BackRouter>
        <button @click="startMeasurement" class="measure-button" title="Start Room Measurement">
          <Icon icon="tabler/microphone" />
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
                <Icon icon="tabler/x" />
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

      <!-- Saved Equalisation Settings -->
      <div v-if="equalisationConfigs.length > 0" class="equalisation-section">
        <h2>Saved Room EQ Configurations</h2>
        <div class="equalisation-grid">
          <div
            v-for="config in equalisationConfigs"
            :key="config.key"
            class="equalisation-card"
            @click="openChannelSelectionDialog(config)"
          >
            <div class="equalisation-header">
              <div class="equalisation-info">
                <h3>{{ config.data.name }}</h3>
                <p class="equalisation-date">{{ formatDate(config.data.created_at) }}</p>
                <p class="equalisation-details">
                  {{ config.data.filters.length }} filters
                  <span v-if="config.data.optimization_results?.improvement_db">
                    • {{ config.data.optimization_results.improvement_db.toFixed(1) }}dB improvement
                  </span>
                  <span v-if="config.data.settings?.min_frequency && config.data.settings?.max_frequency">
                    • {{ Math.round(config.data.settings.min_frequency) }}Hz - {{ Math.round(config.data.settings.max_frequency) }}Hz
                  </span>
                </p>
              </div>
              <button @click.stop="deleteEqualisationConfig(config.key)" class="delete-button" title="Delete Configuration">
                <Icon icon="tabler/x" />
              </button>
            </div>
            <div class="equalisation-response">
              <svg viewBox="0 0 300 100" class="response-svg">
                <!-- Frequency response curve -->
                <path
                  :d="generateEQResponsePath(config.data.filters)"
                  fill="none"
                  stroke="#58a6ff"
                  stroke-width="2"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="measurements.length === 0 && equalisationConfigs.length === 0" class="card">
        <div class="empty-state">
          <Icon icon="tabler/armchair" class="empty-icon" />
          <h3>Room Acoustics Correction</h3>
          <p>Use the "Measure Room" button above to start the acoustic measurement wizard. This will help you analyze and correct room acoustics for optimal sound reproduction.</p>
        </div>
      </div>
    </div>

    <!-- Room Measurement Wizard -->
    <RoomMeasurementWizard
      :is-open="showMeasurementWizard"
      @close="showMeasurementWizard = false"
      @measurement-completed="handleMeasurementCompleted"
    />

    <!-- Room Equalisation Wizard -->
    <RoomEqualisationWizard
      :is-open="showEqualisationWizard"
      :measurement="selectedMeasurement"
      @close="showEqualisationWizard = false"
      @equalisation-setup="handleEqualisationSetup"
    />

    <!-- Channel Selection Dialog -->
    <div v-if="showChannelSelectionDialog" class="modal-overlay" @click="closeChannelSelectionDialog">
      <div class="modal-content channel-selection-modal" @click.stop>
        <div class="modal-header">
          <h2>Apply Room EQ Configuration</h2>
          <button @click="closeChannelSelectionDialog" class="close-button" title="Close">
            <Icon icon="tabler/x" />
          </button>
        </div>

        <div class="modal-body">
          <div class="channel-selection-content">
            <p>Apply the Room EQ configuration "{{ selectedRoomEQConfig?.data.name }}" to which channel(s)?</p>

            <div class="channel-options">
              <label class="channel-option">
                <input
                  type="radio"
                  v-model="selectedChannel"
                  value="left"
                  name="channel"
                />
                <span class="radio-label">Left Channel Only</span>
              </label>

              <label class="channel-option">
                <input
                  type="radio"
                  v-model="selectedChannel"
                  value="right"
                  name="channel"
                />
                <span class="radio-label">Right Channel Only</span>
              </label>

              <label class="channel-option">
                <input
                  type="radio"
                  v-model="selectedChannel"
                  value="both"
                  name="channel"
                />
                <span class="radio-label">Both Channels</span>
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeChannelSelectionDialog" class="nav-button secondary">
            Cancel
          </button>
          <button @click="handleChannelSelectionConfirm" :disabled="!selectedRoomEQConfig" class="nav-button primary">
            Apply to Speaker Equalizer
          </button>
        </div>
      </div>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import BackRouter from '@/components/BackRouter.vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import PageContent from '@/components/PageContent.vue'
import RoomMeasurementWizard from '@/components/RoomMeasurementWizard.vue'
import RoomEqualisationWizard from '@/components/RoomEqualisationWizard.vue'
import { useSettingsStore, type RoomMeasurement } from '@/stores/settings'
import { getConfigKeys, getConfigValue, deleteConfigValue } from '@/api/config'
import { type Filter } from '@/utils/filtercalc'
import { type BiquadFilterType } from '@/utils/biquad'
import { generateCombinedGraphData, type GraphDimensions, DEFAULT_FREQ_RANGE } from '@/utils/filtergraph'

// Room EQ Configuration Types
interface RoomEQConfig {
  name: string;
  filters: Array<{
    filter_type: string;
    frequency: number;
    gain_db: number;
    q: number;
    description?: string;
  }>;
  optimization_results?: {
    improvement_db?: number;
    final_rms_error?: number;
  };
  settings?: {
    min_frequency?: number;
    max_frequency?: number;
  };
  created_at: string;
}

interface RoomEQConfigItem {
  key: string;
  data: RoomEQConfig;
}

// State
const showMeasurementWizard = ref(false)
const showEqualisationWizard = ref(false)
const showChannelSelectionDialog = ref(false)
const selectedMeasurement = ref<RoomMeasurement | null>(null)
const selectedRoomEQConfig = ref<RoomEQConfigItem | null>(null)
const selectedChannel = ref<'left' | 'right' | 'both'>('both')
const measurements = ref<RoomMeasurement[]>([])
const equalisationConfigs = ref<RoomEQConfigItem[]>([])
const settingsStore = useSettingsStore()
const router = useRouter()

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
  // After equalisation wizard completes, refresh the configs list
  loadEqualisationConfigs()
}

const openChannelSelectionDialog = (config: RoomEQConfigItem) => {
  if (!config || !config.key) {
    console.error('Invalid Room EQ configuration:', config)
    return
  }

  console.log('Opening channel selection dialog for config:', config)
  selectedRoomEQConfig.value = config
  selectedChannel.value = 'both' // Default to both channels
  showChannelSelectionDialog.value = true
}

const closeChannelSelectionDialog = () => {
  showChannelSelectionDialog.value = false
  selectedRoomEQConfig.value = null
}

const handleChannelSelectionConfirm = async () => {
  const config = selectedRoomEQConfig.value
  if (!config) {
    console.warn('No Room EQ configuration selected')
    return
  }

  closeChannelSelectionDialog()

  // Navigate to speaker equalizer with query parameters to apply the Room EQ config
  await router.push({
    path: '/sound/speaker-equalizer',
    query: {
      applyRoomEQ: config.key,
      channel: selectedChannel.value
    }
  })
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

const loadEqualisationConfigs = async () => {
  try {
    const configs: RoomEQConfigItem[] = []

    // First get all config keys with the correction-filters prefix (same as Room EQ wizard uses)
    const keysResponse = await getConfigKeys('correction-filters.')

    if (keysResponse.status === 'success' && keysResponse.data && Array.isArray(keysResponse.data)) {
      // For each key, get the actual value
      for (const key of keysResponse.data) {
        if (key.startsWith('correction-filters.')) {
          try {
            const valueResponse = await getConfigValue(key)
            if (valueResponse.status === 'success' && valueResponse.data?.value) {
              const configData = JSON.parse(valueResponse.data.value) as RoomEQConfig
              configs.push({ key, data: configData })
            }
          } catch (parseError) {
            console.warn(`Failed to parse Room EQ config ${key}:`, parseError)
          }
        }
      }
    }

    // Sort by creation date (newest first)
    configs.sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime())
    equalisationConfigs.value = configs
    console.log('Loaded Room EQ configurations:', configs)
  } catch (error) {
    // If we get a 404 or other error, it likely means no configurations exist yet
    // This is normal for a fresh installation, so we'll just return an empty array
    if (error instanceof Error && error.message.includes('404')) {
      console.log('No Room EQ configurations found (404) - this is normal for a fresh installation')
      equalisationConfigs.value = []
      return
    }

    console.error('Failed to load Room EQ configurations:', error)
    equalisationConfigs.value = []
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

const deleteEqualisationConfig = async (configKey: string) => {
  try {
    await deleteConfigValue(configKey)
    await loadEqualisationConfigs() // Refresh the list
    console.log(`Room EQ configuration ${configKey} deleted`)
  } catch (error) {
    console.error('Failed to delete Room EQ configuration:', error)
  }
}

const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

// Convert Room EQ filter to Speaker EQ filter format (reusing the conversion logic)
const convertRoomEQFilterToEQFilter = (roomEQFilter: RoomEQConfig['filters'][0], index: number): Filter => {
  // Map Room EQ filter types to Speaker EQ filter types
  const filterTypeMap: Record<string, BiquadFilterType> = {
    'hp': 'highpass',        // Room EQ uses 'hp'
    'lp': 'lowpass',         // Room EQ uses 'lp'
    'eq': 'peaking',         // Room EQ uses 'eq' for peaking/parametric EQ
    'peak': 'peaking',
    'peaking': 'peaking',
    'lowpass': 'lowpass',
    'highpass': 'highpass',
    'lowshelf': 'lowshelf',
    'highshelf': 'highshelf'
  };

  const filterType = filterTypeMap[roomEQFilter.filter_type] || 'peaking';

  return {
    id: Date.now() + index,
    icon: filterType,
    text: filterType.charAt(0).toUpperCase() + filterType.slice(1),
    frequency: Math.round(roomEQFilter.frequency),
    gain: roomEQFilter.gain_db,
    Q: roomEQFilter.q || 1.0,
    enabled: true
  };
};

const generateEQResponsePath = (filters: RoomEQConfig['filters']): string => {
  // Convert Room EQ filters to Filter format
  const convertedFilters = filters.map(convertRoomEQFilterToEQFilter);

  // Set up graph dimensions
  const dimensions: GraphDimensions = {
    plotWidth: 300,
    plotHeight: 100,
    minFreq: DEFAULT_FREQ_RANGE.min,
    maxFreq: DEFAULT_FREQ_RANGE.max,
    minGain: -12,
    maxGain: 12
  };

  // Generate combined graph data using existing utilities
  const graphData = generateCombinedGraphData(convertedFilters, dimensions, 150);

  return graphData ? graphData.linePath : '';
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
  loadEqualisationConfigs()
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
      cursor: pointer;

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

  .equalisation-section {
    margin-bottom: 20px;

    h2 {
      font-size: 22px;
      font-weight: 500;
      margin-bottom: 20px;
      color: #333;
    }

    .equalisation-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }

    .equalisation-card {
      background: var(--card-background, #fff);
      border: 1px solid var(--border-color, #e5e5e5);
      border-radius: 8px;
      padding: 20px;
      position: relative;
      cursor: pointer;
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

      .equalisation-header {
        margin-bottom: 15px;
        padding-right: 40px; // Leave space for delete button

        .equalisation-info {
          h3 {
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 8px 0;
            color: #333;
          }

          .equalisation-date {
            font-size: 14px;
            color: #666;
            margin: 0 0 4px 0;
          }

          .equalisation-details {
            font-size: 12px;
            color: #888;
            margin: 0;
          }
        }
      }

      .equalisation-response {
        .response-svg {
          width: 100%;
          height: 80px;
          background: #f8f9fa;
          border-radius: 6px;

          path {
            stroke: #58a6ff;
            stroke-width: 2;
            fill: none;
          }
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

    .equalisation-section {
      .equalisation-grid {
        grid-template-columns: 1fr;
        gap: 15px;
      }

      .equalisation-card {
        padding: 15px;

        .delete-button {
          top: 12px;
          right: 12px;
        }

        .equalisation-header {
          padding-right: 36px; // Adjust for smaller delete button spacing

          .equalisation-info {
            h3 {
              font-size: 16px;
            }

            .equalisation-date {
              font-size: 12px;
            }

            .equalisation-details {
              font-size: 11px;
            }
          }
        }

        .equalisation-response {
          .response-svg {
            height: 50px;
            background: #f8f9fa;

            path {
              stroke: #58a6ff;
              stroke-width: 1.5;
            }
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

/* Channel Selection Modal - consistent with wizard styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.channel-selection-modal {
  background: var(--background-card);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  position: relative;

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 32px 20px 32px;
    border-bottom: 1px solid var(--color-border);

    h2 {
      margin: 0;
      color: var(--color-head);
      font-size: 1.5rem;
      font-weight: 600;
    }

    .close-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      color: var(--color-body-secondary);
      transition: all 0.2s ease;

      &:hover {
        background: var(--color-bg-secondary);
        color: var(--color-head);
      }

      svg {
        width: 20px;
        height: 20px;
      }
    }
  }

  .modal-body {
    padding: 32px;
    flex: 1;
    overflow-y: auto;

    .channel-selection-content {
      p {
        color: var(--color-body-secondary);
        margin-bottom: 24px;
        font-size: 1rem;
        line-height: 1.5;
      }

      .channel-options {
        display: flex;
        flex-direction: column;
        gap: 16px;

        .channel-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border: 2px solid var(--color-border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: var(--color-bg);

          &:hover {
            border-color: var(--primary);
            background: var(--color-bg-secondary);
          }

          input[type="radio"] {
            margin: 0;
            accent-color: var(--primary);
            width: 18px;
            height: 18px;
          }

          input[type="radio"]:checked + .radio-label {
            color: var(--primary);
            font-weight: 600;
          }

          .radio-label {
            font-size: 1rem;
            color: var(--color-body);
            cursor: pointer;
            line-height: 1.5;
          }
        }
      }
    }
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 32px 32px 32px;
    border-top: 1px solid var(--color-border);

    .nav-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
      font-size: 0.875rem;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.secondary {
        background: var(--color-bg-secondary);
        color: var(--color-body);
        border: 1px solid var(--color-border);

        &:hover:not(:disabled) {
          background: var(--color-border);
        }
      }

      &.primary {
        background: var(--primary);
        color: white;

        &:hover:not(:disabled) {
          background: var(--primary-dark, var(--primary));
          opacity: 0.9;
        }
      }

      svg {
        width: 16px;
        height: 16px;
      }
    }
  }
}
</style>
