import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'

/** What the owner can do about a feature. `required` means the UI shows its
 *  usage but offers no action: pipewire and audiocontrol are the two largest
 *  consumers on a typical device and neither can be turned off. */
export type FeatureDisposition = 'required' | 'disable' | 'uninstall' | 'reconfigure' | 'none'

/** How much stopping this feature would return. No exact figure exists:
 *  pages shared inside the feature are invisible to `min_kb`, and pages it
 *  shares with the rest of the system are not freed by stopping it. */
export interface Reclaimable {
  min_kb: number
  estimate_kb: number
  swap_pss_kb: number
}

export interface FeatureMemory {
  rss_kb: number
  pss_kb: number
  private_kb: number
  shared_kb: number
  swap_kb: number
  swap_pss_kb: number
  reclaimable: Reclaimable
}

export interface MemoryFeature {
  id: string
  name: string
  category: string | null
  icon: string | null
  package: string | null
  units: string[]
  state: string | null
  processes: number
  disposition: FeatureDisposition
  partial: boolean
  memory: FeatureMemory
}

export interface SystemMemory {
  total_kb: number
  free_kb: number
  available_kb: number
  used_kb: number
  cached_kb: number
  buffers_kb: number
  swap_total_kb: number
  swap_used_kb: number
  process_pss_kb: number
  unaccounted_kb: number
}

export interface MemoryReport {
  system: SystemMemory
  features: MemoryFeature[]
}

/**
 * Fetch the per-feature memory report.
 *
 * Returns null when the endpoint is unavailable, which includes devices
 * running a configurator older than the one that added it.
 */
export const getMemoryUsage = async (): Promise<MemoryReport | null> => {
  try {
    const configStore = useAppConfigStore()
    const url = `${configStore.getConfigApiBaseUrl()}/memory`
    const response = await apiFetch(url)

    if (!response.ok) {
      console.error('Failed to get memory usage:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting memory usage:', error)
    return null
  }
}
