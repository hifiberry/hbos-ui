import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface AppConfig {
  radioPlayer: string
}

export const useConfigStore = defineStore('config', () => {
  // State
  const config = ref<AppConfig>({
    radioPlayer: 'mpd' // Default radio player
  })
  const loading = ref(false)

  // Actions
  const getConfig = async (): Promise<AppConfig> => {
    loading.value = true
    try {
      // In a real implementation, this would fetch from API
      // For now, return the default config
      return config.value
    } catch (error) {
      console.error('Failed to get configuration:', error)
      return config.value
    } finally {
      loading.value = false
    }
  }

  const updateConfig = async (newConfig: Partial<AppConfig>): Promise<boolean> => {
    loading.value = true
    try {
      // In a real implementation, this would save to API
      config.value = { ...config.value, ...newConfig }
      return true
    } catch (error) {
      console.error('Failed to update configuration:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  const setRadioPlayer = async (playerName: string): Promise<boolean> => {
    return updateConfig({ radioPlayer: playerName })
  }

  return {
    // State
    config,
    loading,

    // Actions
    getConfig,
    updateConfig,
    setRadioPlayer,

    // Getters
    radioPlayer: () => config.value.radioPlayer
  }
})
