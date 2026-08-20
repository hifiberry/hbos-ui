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

const mountIt = (credentialsSet = false, initial = status()) =>
  mount(PlayerSetupPanel, {
    props: {
      baseUrl: '/api/soloist',
      playerName: 'Spotify (Soloist)',
      binaryName: 'soloist',
      credentialsSet,
      status: initial,
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
    const w = mountIt()
    await flushPromises()
    expect(w.find('[data-test="setup-missing"]').exists()).toBe(true)
    expect(w.find('[data-test="setup-download"]').exists()).toBe(true)
  })

  it('starts the download and asks the card to re-read when it finishes', async () => {
    startSetupInstall.mockResolvedValue({ running: true, returncode: null, output: '' })
    getSetupInstallState.mockResolvedValue({
      running: false, returncode: 0, output: 'Installed /home/x/.local/bin/soloist',
    })

    const w = mountIt()
    await flushPromises()
    await w.find('[data-test="setup-download"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1600)
    await flushPromises()

    expect(startSetupInstall).toHaveBeenCalledWith('/api/soloist')
    // The card owns the status, so finishing means telling it to look again.
    expect(w.emitted('changed')).toBeTruthy()
  })

  it('surfaces a failed download instead of reporting nothing', async () => {
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
    const w = mountIt(false, status({ binary_installed: true, version: '1.3.7' }))
    await flushPromises()
    expect(w.find('[data-test="setup-needs-credentials"]').exists()).toBe(true)
  })

  it('stops asking once every secret is stored', async () => {
    const w = mountIt(true, status({ binary_installed: true, version: '1.3.7' }))
    await flushPromises()
    expect(w.find('[data-test="setup-needs-credentials"]').exists()).toBe(false)
    expect(w.find('[data-test="setup-not-logged-in"]').exists()).toBe(true)
  })

  it('confirms when the player is signed in', async () => {
    const w = mountIt(
      true,
      status({ binary_installed: true, version: '1.3.7', logged_in: true, device_name: 'Tannoy' }),
    )
    await flushPromises()
    expect(w.find('[data-test="setup-ready"]').text()).toContain('Tannoy')
  })

})
