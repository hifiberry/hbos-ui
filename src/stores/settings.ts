import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

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
  // Add other UI settings here as needed
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
    }
  })

  const loading = ref(false)
  const loaded = ref(false)

  // Getters
  const getServiceSettings = (service: keyof ServiceSettings) => {
    return computed(() => settings.value.service[service])
  }

  const getLastfmSettings = computed(() => settings.value.service.lastfm)
  const getSpotifySettings = computed(() => settings.value.service.spotify)

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

  const saveSettings = async () => {
    loading.value = true
    try {
      // Store settings in localStorage for persistence
      // TODO: Replace with API call when backend is ready
      localStorage.setItem('ui.service.settings', JSON.stringify(settings.value.service))
      console.log('Settings saved:', settings.value.service)
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
        console.log('Settings loaded:', settings.value.service)
      }
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
      }
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
      // Get existing measurements
      const existingMeasurements = await getRoomMeasurements()

      // Find next ID
      const nextId = existingMeasurements.length > 0
        ? Math.max(...existingMeasurements.map(m => m.id)) + 1
        : 1

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

      // Save to localStorage
      localStorage.setItem(`roomeq.measurement.${nextId}`, JSON.stringify(newMeasurement))

      console.log('Room measurement saved:', newMeasurement)
      return nextId
    } catch (error) {
      console.error('Failed to save room measurement:', error)
      throw error
    }
  }

  const getRoomMeasurements = async (): Promise<RoomMeasurement[]> => {
    try {
      const measurements: RoomMeasurement[] = []

      // Scan localStorage for roomeq.measurement.* keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('roomeq.measurement.')) {
          const data = localStorage.getItem(key)
          if (data) {
            const measurement = JSON.parse(data) as RoomMeasurement
            measurements.push(measurement)
          }
        }
      }

      // Sort by ID
      return measurements.sort((a, b) => a.id - b.id)
    } catch (error) {
      console.error('Failed to load room measurements:', error)
      return []
    }
  }

  const deleteRoomMeasurement = async (id: number): Promise<void> => {
    try {
      localStorage.removeItem(`roomeq.measurement.${id}`)
      console.log(`Room measurement ${id} deleted`)
    } catch (error) {
      console.error('Failed to delete room measurement:', error)
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

    // Actions
    updateServiceSettings,
    updateLastfmSettings,
    updateSpotifySettings,
    saveSettings,
    loadSettings,
    resetSettings,

    // Room measurement actions
    saveRoomMeasurement,
    getRoomMeasurements,
    deleteRoomMeasurement
  }
})
