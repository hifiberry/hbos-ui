import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getConfigKeys, getConfigValue, setConfigValue, deleteConfigValue } from '@/api/config'
import { enableService, disableService } from '@/api/config'
import { getSystemInfo } from '@/api/system'

export interface ServiceSettings {
  lastfm: {
    scrobble: boolean
    manageFavourites: boolean
  }
  spotify: {
    controlPlayer: boolean
    manageFavourites: boolean
  }
}

export interface RoomMeasurement {
  id: number
  name: string
  timestamp: string
  frequencies: number[]
  magnitudes: number[]
  sample_rate: number
  frequency_type?: 'log_summary' | 'fft' // Indicates if data is logarithmic frequency summary or regular FFT
  points_per_octave?: number // Only present for log_summary data
  frequency_range?: [number, number] // Frequency range for log_summary data
}

export interface UISettings {
  service: ServiceSettings
  expertMode: boolean
  vuMeterEnabled: boolean
}

export const useSettingsStore = defineStore('settings', () => {
  // State
  const settings = ref<UISettings>({
    service: {
      lastfm: {
        scrobble: true,
        manageFavourites: true
      },
      spotify: {
        controlPlayer: true,
        manageFavourites: true
      }
    },
    expertMode: false,
    vuMeterEnabled: true
  })

  const loading = ref(false)
  const loaded = ref(false)
  const piVersion = ref<string>('unknown')

  // Getters
  const getServiceSettings = (service: keyof ServiceSettings) => {
    return computed(() => settings.value.service[service])
  }

  const getLastfmSettings = computed(() => settings.value.service.lastfm)
  const getSpotifySettings = computed(() => settings.value.service.spotify)
  const getExpertMode = computed(() => settings.value.expertMode)
  const getVuMeterEnabled = computed(() => settings.value.vuMeterEnabled)
  const isPi5OrHigher = computed(() => {
    const v = parseInt(piVersion.value, 10)
    return !isNaN(v) && v >= 5
  })

  // Actions
  const updateServiceSettings = async <T extends keyof ServiceSettings>(
    service: T,
    newSettings: Partial<ServiceSettings[T]>
  ) => {
    settings.value.service[service] = {
      ...settings.value.service[service],
      ...newSettings
    } as ServiceSettings[T]

    await saveSettings()
  }

  const updateLastfmSettings = async (newSettings: Partial<ServiceSettings['lastfm']>) => {
    await updateServiceSettings('lastfm', newSettings)
  }

  const updateSpotifySettings = async (newSettings: Partial<ServiceSettings['spotify']>) => {
    await updateServiceSettings('spotify', newSettings)
  }

  const updateExpertMode = async (expertMode: boolean) => {
    settings.value.expertMode = expertMode
    await saveSettings()
  }

  const updateVuMeterEnabled = async (enabled: boolean) => {
    settings.value.vuMeterEnabled = enabled
    await saveSettings()
    // Also control the backend vu-meter service
    try {
      if (enabled) {
        await enableService('vu-meter')
      } else {
        await disableService('vu-meter')
      }
    } catch (error) {
      console.error('Failed to control vu-meter service:', error)
    }
  }

  const saveSettings = async () => {
    loading.value = true
    try {
      // Store settings in localStorage for persistence
      // TODO: Replace with API call when backend is ready
      localStorage.setItem('ui.service.settings', JSON.stringify(settings.value.service))
      localStorage.setItem('ui.expertMode', JSON.stringify(settings.value.expertMode))
      localStorage.setItem('ui.vuMeterEnabled', JSON.stringify(settings.value.vuMeterEnabled))
      console.log('Settings saved:', settings.value)
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const loadSettings = async () => {
    loading.value = true
    try {
      // Load settings from localStorage
      // TODO: Replace with API call when backend is ready
      const savedSettings = localStorage.getItem('ui.service.settings')
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings)
        settings.value.service = {
          ...settings.value.service,
          ...parsedSettings
        }
      }

      const savedExpertMode = localStorage.getItem('ui.expertMode')
      if (savedExpertMode) {
        settings.value.expertMode = JSON.parse(savedExpertMode)
      }

      const savedVuMeter = localStorage.getItem('ui.vuMeterEnabled')
      if (savedVuMeter !== null) {
        settings.value.vuMeterEnabled = JSON.parse(savedVuMeter)
      }

      // Fetch Pi version for hardware-gated features
      try {
        const systemInfo = await getSystemInfo()
        piVersion.value = systemInfo.pi_model?.version || 'unknown'
        console.log('Pi version detected:', piVersion.value)
      } catch (error) {
        console.warn('Failed to fetch Pi version:', error)
        piVersion.value = 'unknown'
      }

      console.log('Settings loaded:', settings.value)
      loaded.value = true
    } catch (error) {
      console.error('Failed to load settings:', error)
      // Use default settings on error
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const resetSettings = async () => {
    settings.value = {
      service: {
        lastfm: {
          scrobble: true,
          manageFavourites: true
        },
        spotify: {
          controlPlayer: true,
          manageFavourites: true
        }
  },
  expertMode: false,
  vuMeterEnabled: true
    }
    await saveSettings()
  }

  // Room measurement functions
  const saveRoomMeasurement = async (
    name: string,
    frequencies: number[],
    magnitudes: number[],
    sample_rate: number,
    metadata?: {
      frequency_type?: 'log_summary' | 'fft'
      points_per_octave?: number
      frequency_range?: [number, number]
    }
  ): Promise<number> => {
    try {
      // Get existing measurements to determine next ID
      // If this fails, we'll start with ID 1
      let nextId = 1
      try {
        const existingMeasurements = await getRoomMeasurements()
        if (existingMeasurements.length > 0) {
          nextId = Math.max(...existingMeasurements.map(m => m.id)) + 1
        }
      } catch {
        console.log('Could not load existing measurements for ID generation, starting with ID 1')
      }

      // Create new measurement
      const newMeasurement: RoomMeasurement = {
        id: nextId,
        name,
        timestamp: new Date().toISOString(),
        frequencies,
        magnitudes,
        sample_rate,
        ...metadata
      }

      // Save to backend config store
      await setConfigValue(`roomeq.measurement.${nextId}`, JSON.stringify(newMeasurement))

      console.log('Room measurement saved to backend:', newMeasurement)
      return nextId
    } catch (error) {
      console.error('Failed to save room measurement:', error)
      throw error
    }
  }

  const getRoomMeasurements = async (): Promise<RoomMeasurement[]> => {
    try {
      const measurements: RoomMeasurement[] = []

      // First get all config keys with the roomeq.measurement prefix
      const keysResponse = await getConfigKeys('roomeq.measurement.')

      if (keysResponse.status === 'success' && keysResponse.data && Array.isArray(keysResponse.data)) {
        // For each key, get the actual value
        for (const key of keysResponse.data) {
          if (key.startsWith('roomeq.measurement.')) {
            try {
              const valueResponse = await getConfigValue(key)
              if (valueResponse.status === 'success' && valueResponse.data?.value) {
                const measurement = JSON.parse(valueResponse.data.value) as RoomMeasurement
                measurements.push(measurement)
              }
            } catch (parseError) {
              console.error(`Failed to parse measurement ${key}:`, parseError)
            }
          }
        }
      }

      // Sort by ID
      return measurements.sort((a, b) => a.id - b.id)
    } catch (error) {
      // If we get a 404 or other error, it likely means no measurements exist yet
      // This is normal for a fresh installation, so we'll just return an empty array
      if (error instanceof Error && error.message.includes('404')) {
        console.log('No measurements found in backend (404) - this is normal for a fresh installation')
        return []
      }

      console.error('Failed to load room measurements from backend:', error)
      return []
    }
  }

  const deleteRoomMeasurement = async (id: number): Promise<void> => {
    try {
      await deleteConfigValue(`roomeq.measurement.${id}`)
      console.log(`Room measurement ${id} deleted from backend`)
    } catch (error) {
      console.error('Failed to delete room measurement from backend:', error)
      throw error
    }
  }

  return {
    // State
    settings: computed(() => settings.value),
    loading,
    loaded,

    // Getters
    getServiceSettings,
    getLastfmSettings,
    getSpotifySettings,
    getExpertMode,
    getVuMeterEnabled,
    isPi5OrHigher,
    piVersion,

    // Actions
    updateServiceSettings,
    updateLastfmSettings,
    updateSpotifySettings,
    updateExpertMode,
    updateVuMeterEnabled,
    saveSettings,
    loadSettings,
    resetSettings,

    // Room measurement actions
    saveRoomMeasurement,
    getRoomMeasurements,
    deleteRoomMeasurement
  }
})
