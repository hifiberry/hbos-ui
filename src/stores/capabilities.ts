import { ref } from 'vue'
import { defineStore } from 'pinia'

import { getCapabilities } from '@/api/capabilities'

/**
 * What the audiocontrol daemon on this device can do.
 *
 * Only the image ladder is tracked so far. It gates `?size=` on cover art URLs:
 * an empty ladder means this release does not resize, so the UI asks for
 * originals instead of sending a parameter the daemon would ignore.
 */
export const useCapabilitiesStore = defineStore('capabilities', () => {
  const imageSizes = ref<number[]>([])

  // A single in-flight request shared by every caller. The grids both await
  // this before mapping their cover URLs, and the album grid is re-entered
  // whenever the genre filter changes.
  let inFlight: Promise<void> | null = null

  const load = async () => {
    const capabilities = await getCapabilities()
    imageSizes.value = capabilities?.images?.sizes ?? []
  }

  const ensureLoaded = (): Promise<void> => {
    if (!inFlight) {
      inFlight = load()
    }
    return inFlight
  }

  return {
    imageSizes,
    ensureLoaded,
  }
})
