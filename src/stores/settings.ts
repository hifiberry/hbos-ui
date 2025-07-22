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
    resetSettings
  }
})
