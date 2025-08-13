import { useAppConfigStore } from '@/stores/appconfig'

export interface FilterChainResponse {
  status: 'success' | 'error'
  data?: string  // DOT format content
  message?: string
}

/**
 * Get the current PipeWire filtergraph in DOT format
 */
export const getFilterChain = async (): Promise<FilterChainResponse> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const url = `${baseUrl}/pipewire/filtergraph`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to get filtergraph: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type')
  
  if (contentType?.includes('text/plain')) {
    // Success case - raw DOT content
    const dotContent = await response.text()
    return {
      status: 'success',
      data: dotContent
    }
  } else {
    // Error case - JSON response
    const errorData = await response.json()
    return {
      status: 'error',
      message: errorData.message || 'Failed to get filtergraph'
    }
  }
}
