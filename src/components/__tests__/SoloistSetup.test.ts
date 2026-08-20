import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const { getSoloistStatus, startSoloistInstall, getSoloistInstallState } = vi.hoisted(() => ({
  getSoloistStatus: vi.fn(),
  startSoloistInstall: vi.fn(),
  getSoloistInstallState: vi.fn(),
}))
vi.mock('@/api/soloist', () => ({
  getSoloistStatus,
  startSoloistInstall,
  getSoloistInstallState,
}))

import SoloistSetup from '@/components/SoloistSetup.vue'

const status = (over = {}) => ({
  binary_installed: false,
  version: null,
  build_date: null,
  expires_on: null,
  bridge_connected: false,
  logged_in: false,
  is_active: false,
  device_name: null,
  ...over,
})

const mountIt = (apiKeySet = false) =>
  mount(SoloistSetup, {
    props: { apiKeySet },
    global: { stubs: { StatusBlock: { template: '<div class="sb"><slot /></div>' } } },
  })

describe('SoloistSetup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    getSoloistStatus.mockReset()
    startSoloistInstall.mockReset()
    getSoloistInstallState.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('offers the download when the binary is missing', async () => {
    getSoloistStatus.mockResolvedValue(status())
    const w = mountIt()
    await flushPromises()
    expect(w.find('[data-test="soloist-missing"]').exists()).toBe(true)
    expect(w.find('[data-test="soloist-download"]').exists()).toBe(true)
  })

  it('starts the download and reports success', async () => {
    getSoloistStatus.mockResolvedValueOnce(status())
    startSoloistInstall.mockResolvedValue({ running: true, returncode: null, output: '' })
    getSoloistInstallState.mockResolvedValue({
      running: false, returncode: 0, output: 'Installed /home/x/.local/bin/soloist',
    })
    getSoloistStatus.mockResolvedValue(status({ binary_installed: true, version: '1.3.7' }))

    const w = mountIt()
    await flushPromises()
    await w.find('[data-test="soloist-download"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1600)
    await flushPromises()

    expect(startSoloistInstall).toHaveBeenCalled()
    expect(w.find('[data-test="soloist-version"]').text()).toContain('1.3.7')
  })

  it('surfaces a failed download instead of reporting nothing', async () => {
    getSoloistStatus.mockResolvedValue(status())
    startSoloistInstall.mockResolvedValue({ running: true, returncode: null, output: '' })
    getSoloistInstallState.mockResolvedValue({
      running: false, returncode: 6, output: 'HTTP error (404)',
    })

    const w = mountIt()
    await flushPromises()
    await w.find('[data-test="soloist-download"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1600)
    await flushPromises()

    expect(w.find('.sb').text()).toContain('exit code 6')
    expect(w.find('[data-test="soloist-log"]').text()).toContain('HTTP error')
  })

  it('tells the user to set a key once the binary is there', async () => {
    getSoloistStatus.mockResolvedValue(status({ binary_installed: true, version: '1.3.7' }))
    const w = mountIt(false)
    await flushPromises()
    expect(w.find('[data-test="soloist-needs-key"]').exists()).toBe(true)
  })

  it('stops asking for a key once one is stored', async () => {
    getSoloistStatus.mockResolvedValue(status({ binary_installed: true, version: '1.3.7' }))
    const w = mountIt(true)
    await flushPromises()
    expect(w.find('[data-test="soloist-needs-key"]').exists()).toBe(false)
    expect(w.find('[data-test="soloist-not-logged-in"]').exists()).toBe(true)
  })

  it('confirms when Soloist is signed in', async () => {
    getSoloistStatus.mockResolvedValue(
      status({ binary_installed: true, version: '1.3.7', logged_in: true, device_name: 'Tannoy' }),
    )
    const w = mountIt(true)
    await flushPromises()
    expect(w.find('[data-test="soloist-ready"]').text()).toContain('Tannoy')
  })

  it('reports an unreachable bridge rather than looking idle', async () => {
    getSoloistStatus.mockRejectedValue(new Error('Soloist API request failed: 502'))
    const w = mountIt()
    await flushPromises()
    expect(w.find('.sb').text()).toContain('502')
  })
})
