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
  config_api: {
    deviceIP: string
    devicePort: number
    apiPrefix: string
    useProxy: boolean
  }
}

export const useAppConfigStore = defineStore('appconfig', () => {
  // State
  const config = ref<AppConfig>({
    radioPlayer: 'mpd', // Default radio player
    audiocontrol_api: {
      deviceIP: import.meta.env.VITE_APP_DEVICE_IP || window.location.hostname,
      devicePort: parseInt(import.meta.env.VITE_APP_DEVICE_PORT || '80', 10),
      apiPrefix: import.meta.env.VITE_APP_API_PREFIX || '/api/audiocontrol',
      useProxy: !import.meta.env.PROD // Use proxy in development to avoid CORS
    },
    config_api: {
      deviceIP: import.meta.env.VITE_APP_DEVICE_IP || window.location.hostname,
      devicePort: parseInt(import.meta.env.VITE_APP_DEVICE_PORT || '80', 10),
      apiPrefix: import.meta.env.VITE_APP_CONFIG_API_PREFIX || '/api/config/v1',
      useProxy: !import.meta.env.PROD // Use proxy in development to avoid CORS
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

    let apiUrl: string
    if (useProxy) {
      // Use current host and port for proxy in development
      const currentUrl = window.location.origin
      apiUrl = `${currentUrl}${apiPrefix}`
    } else {
      // Don't include port 80 in the URL as it's the default HTTP port
      const portSuffix = devicePort === 80 ? '' : `:${devicePort}`
      apiUrl = `http://${deviceIP}${portSuffix}${apiPrefix}`
    }
    
    return apiUrl
  }

  const getWsBaseUrl = (): string => {
    const { deviceIP, devicePort, apiPrefix } = config.value.audiocontrol_api
    // WebSocket always connects directly to API server (no proxy)
    // Don't include port 80 for WebSocket as it's the default HTTP port, but the WebSocket will use port 80
    const portSuffix = devicePort === 80 ? '' : `:${devicePort}`
    const wsUrl = `ws://${deviceIP}${portSuffix}${apiPrefix}`
    return wsUrl
  }

  const getConfigApiBaseUrl = (): string => {
    const { deviceIP, devicePort, apiPrefix, useProxy } = config.value.config_api

    let configApiUrl: string
    if (useProxy) {
      // Use current host and port for proxy in development
      const currentUrl = window.location.origin
      configApiUrl = `${currentUrl}${apiPrefix}`
    } else {
      // Don't include port 80 in the URL as it's the default HTTP port
      const portSuffix = devicePort === 80 ? '' : `:${devicePort}`
      configApiUrl = `http://${deviceIP}${portSuffix}${apiPrefix}`
    }
    
    return configApiUrl
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
    getConfigApiBaseUrl,

    // Getters
    radioPlayer: () => config.value.radioPlayer,
    apiConfig: () => config.value.audiocontrol_api,
    configApiConfig: () => config.value.config_api
  }
})
