import { useAppConfigStore } from '@/stores/appconfig'

// Types for System Information API
export interface SystemInfo {
  pi_model: {
    name: string
    version: string
  }
  hat_info: {
    vendor: string
    product: string
    uuid: string
    vendor_card: string
  }
  system: {
    uuid: string
  }
  status: 'success' | 'error'
  message?: string
  error?: string
}

/**
 * Get system information including Pi model, HAT details, and system UUID
 */
export const getSystemInfo = async (): Promise<SystemInfo> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/systeminfo`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return data as SystemInfo
}
