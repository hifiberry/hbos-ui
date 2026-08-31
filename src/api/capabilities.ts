import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'

/**
 * What this daemon supports, as opposed to which release it is.
 *
 * `images.sizes` is the ladder acr snaps a `?size=` request up to. A release
 * without the endpoint answers 404, which acr's API doc calls a complete
 * answer: that daemon does not resize, so ask it for originals.
 */
export interface Capabilities {
  version: string
  images: {
    sizes: number[]
  }
}

/**
 * Fetch the daemon's capabilities, or `null` if it has none to report.
 *
 * A missing endpoint and an unreachable device are the same answer here - no
 * resizing - so neither is an error worth surfacing to the user.
 */
export async function getCapabilities(): Promise<Capabilities | null> {
  const configStore = useAppConfigStore()

  try {
    const response = await apiFetch(`${configStore.getApiBaseUrl()}/capabilities`)
    if (!response.ok) {
      return null
    }
    return (await response.json()) as Capabilities
  } catch (error) {
    console.warn('Capabilities not available, assuming no image resizing:', error)
    return null
  }
}
