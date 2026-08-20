import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const { getSetupStatus, startSetupInstall, getSetupInstallState } = vi.hoisted(() => ({
  getSetupStatus: vi.fn(),
  startSetupInstall: vi.fn(),
  getSetupInstallState: vi.fn(),
}))
vi.mock('@/api/player-setup', () => ({
  getSetupStatus,
  startSetupInstall,
  getSetupInstallState,
}))

import PlayerSetupPanel from '@/components/PlayerSetupPanel.vue'

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

const mountIt = (credentialsSet = false) =>
  mount(PlayerSetupPanel, {
    props: {
      baseUrl: '/api/soloist',
      playerName: 'Spotify (Soloist)',
      binaryName: 'soloist',
      credentialsSet,
    },
    global: { stubs: { StatusBlock: { template: '<div class="sb"><slot /></div>' } } },
  })

describe('PlayerSetupPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    getSetupStatus.mockReset()
    startSetupInstall.mockReset()
    getSetupInstallState.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('offers the download when the binary is missing', async () => {
    getSetupStatus.mockResolvedValue(status())
    const w = mountIt()
    await flushPromises()
    expect(w.find('[data-test="setup-missing"]').exists()).toBe(true)
    expect(w.find('[data-test="setup-download"]').exists()).toBe(true)
  })

  it('starts the download and reports success', async () => {
    getSetupStatus.mockResolvedValueOnce(status())
    startSetupInstall.mockResolvedValue({ running: true, returncode: null, output: '' })
    getSetupInstallState.mockResolvedValue({
      running: false, returncode: 0, output: 'Installed /home/x/.local/bin/soloist',
    })
    getSetupStatus.mockResolvedValue(status({ binary_installed: true, version: '1.3.7' }))

    const w = mountIt()
    await flushPromises()
    await w.find('[data-test="setup-download"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1600)
    await flushPromises()

    expect(startSetupInstall).toHaveBeenCalled()
    expect(w.find('[data-test="setup-version"]').text()).toContain('1.3.7')
  })

  it('surfaces a failed download instead of reporting nothing', async () => {
    getSetupStatus.mockResolvedValue(status())
    startSetupInstall.mockResolvedValue({ running: true, returncode: null, output: '' })
    getSetupInstallState.mockResolvedValue({
      running: false, returncode: 6, output: 'HTTP error (404)',
    })

    const w = mountIt()
    await flushPromises()
    await w.find('[data-test="setup-download"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1600)
    await flushPromises()

    expect(w.find('.sb').text()).toContain('exit code 6')
    expect(w.find('[data-test="setup-log"]').text()).toContain('HTTP error')
  })

  it('tells the user to fill in settings once the binary is there', async () => {
    getSetupStatus.mockResolvedValue(status({ binary_installed: true, version: '1.3.7' }))
    const w = mountIt(false)
    await flushPromises()
    expect(w.find('[data-test="setup-needs-credentials"]').exists()).toBe(true)
  })

  it('stops asking once every secret is stored', async () => {
    getSetupStatus.mockResolvedValue(status({ binary_installed: true, version: '1.3.7' }))
    const w = mountIt(true)
    await flushPromises()
    expect(w.find('[data-test="setup-needs-credentials"]').exists()).toBe(false)
    expect(w.find('[data-test="setup-not-logged-in"]').exists()).toBe(true)
  })

  it('confirms when the player is signed in', async () => {
    getSetupStatus.mockResolvedValue(
      status({ binary_installed: true, version: '1.3.7', logged_in: true, device_name: 'Tannoy' }),
    )
    const w = mountIt(true)
    await flushPromises()
    expect(w.find('[data-test="setup-ready"]').text()).toContain('Tannoy')
  })

  it('reports an unreachable provider rather than looking idle', async () => {
    getSetupStatus.mockRejectedValue(new Error('Setup API request failed: 502'))
    const w = mountIt()
    await flushPromises()
    expect(w.find('.sb').text()).toContain('502')
  })
})
