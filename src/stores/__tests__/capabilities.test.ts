import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { getCapabilities } = vi.hoisted(() => ({ getCapabilities: vi.fn() }))
vi.mock('@/api/capabilities', () => ({ getCapabilities }))

import { useCapabilitiesStore } from '@/stores/capabilities'

describe('capabilities store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getCapabilities.mockReset()
  })

  it('exposes the advertised image ladder after loading', async () => {
    getCapabilities.mockResolvedValue({ version: '0.12.0', images: { sizes: [100, 140, 280] } })
    const store = useCapabilitiesStore()

    await store.ensureLoaded()

    expect(store.imageSizes).toEqual([100, 140, 280])
  })

  /** Both grids call this before mapping their cover URLs, and the album grid
   *  can be re-entered by a genre filter. One request per session, not per
   *  render. */
  it('asks the daemon only once however often it is called', async () => {
    getCapabilities.mockResolvedValue({ version: '0.12.0', images: { sizes: [100] } })
    const store = useCapabilitiesStore()

    await Promise.all([store.ensureLoaded(), store.ensureLoaded()])
    await store.ensureLoaded()

    expect(getCapabilities).toHaveBeenCalledTimes(1)
  })

  it('reports no sizes when the daemon does not resize', async () => {
    getCapabilities.mockResolvedValue(null)
    const store = useCapabilitiesStore()

    await store.ensureLoaded()

    expect(store.imageSizes).toEqual([])
  })
})
