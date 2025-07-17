import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface AppConfig {
  radioPlayer: string
  audiocontrol_api: {
    deviceIP: string
    devicePort: number
    apiPrefix: string
    useProxy: boolean
  }
}

export const useConfigStore = defineStore('config', () => {
  // State
  const config = ref<AppConfig>({
    radioPlayer: 'mpd', // Default radio player
    audiocontrol_api: {
      deviceIP: import.meta.env.VITE_APP_DEVICE_IP || window.location.hostname,
      devicePort: parseInt(import.meta.env.VITE_APP_DEVICE_PORT || '80', 10),
      apiPrefix: import.meta.env.VITE_APP_API_PREFIX || '/api/audiocontrol',
      useProxy: !import.meta.env.PROD // Use proxy in development
    }
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

  const setApiConfig = async (apiConfig: Partial<AppConfig['audiocontrol_api']>): Promise<boolean> => {
    return updateConfig({ audiocontrol_api: { ...config.value.audiocontrol_api, ...apiConfig } })
  }

  // API URL getters
  const getApiBaseUrl = (): string => {
    const { deviceIP, devicePort, apiPrefix, useProxy } = config.value.audiocontrol_api

    if (useProxy) {
      return `http://localhost:5173${apiPrefix}` // Use proxy in development
    }

    return `http://${deviceIP}:${devicePort}${apiPrefix}`
  }

  const getWsBaseUrl = (): string => {
    const { deviceIP, devicePort, apiPrefix } = config.value.audiocontrol_api
    // WebSocket always connects directly to API server (no proxy)
    const wsUrl = `ws://${deviceIP}:${devicePort}${apiPrefix}`
    console.log('Generated WebSocket URL:', wsUrl, 'from config:', { deviceIP, devicePort, apiPrefix })
    return wsUrl
  }

  return {
    // State
    config,
    loading,

    // Actions
    getConfig,
    updateConfig,
    setRadioPlayer,
    setApiConfig,

    // API URL getters
    getApiBaseUrl,
    getWsBaseUrl,

    // Getters
    radioPlayer: () => config.value.radioPlayer,
    apiConfig: () => config.value.audiocontrol_api
  }
})
