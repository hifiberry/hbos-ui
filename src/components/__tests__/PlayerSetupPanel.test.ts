import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const {
  getSetupStatus, startSetupInstall, getSetupInstallState,
  startSignIn, getSignInState, cancelSignIn, signOut,
} = vi.hoisted(() => ({
  startSignIn: vi.fn(),
  getSignInState: vi.fn(),
  cancelSignIn: vi.fn(),
  signOut: vi.fn(),
  getSetupStatus: vi.fn(),
  startSetupInstall: vi.fn(),
  getSetupInstallState: vi.fn(),
}))
vi.mock('@/api/player-setup', () => ({
  getSetupStatus,
  startSetupInstall,
  getSetupInstallState,
  startSignIn,
  getSignInState,
  cancelSignIn,
  signOut,
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
    startSignIn.mockReset()
    getSignInState.mockReset()
    cancelSignIn.mockReset()
    signOut.mockReset()
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


  describe('sign-in', () => {
    const signInStatus = (over = {}, signIn = {}) =>
      status({
        binary_installed: true,
        logged_in: false,
        sign_in: { method: 'quick_connect', ready: true, account: null, server_name: null, ...signIn },
        ...over,
      })

    const start = async (w: ReturnType<typeof mountIt>) => {
      await w.find('[data-test="signin-start"]').trigger('click')
      await flushPromises()
    }

    it('shows Sign in button, no update button and no version line', async () => {
      const w = mountIt(true, signInStatus())
      await flushPromises()
      expect(w.find('[data-test="signin-start"]').exists()).toBe(true)
      expect(w.find('[data-test="setup-update"]').exists()).toBe(false)
      expect(w.find('[data-test="setup-version"]').exists()).toBe(false)
    })

    it('ready=false shows reason, no button', async () => {
      const w = mountIt(true, signInStatus({}, { ready: false, reason: 'Choose a server first.' }))
      await flushPromises()
      expect(w.find('[data-test="signin-not-ready"]').text()).toContain('Choose a server first.')
      expect(w.find('[data-test="signin-start"]').exists()).toBe(false)
    })

    it('pending shows code and instruction', async () => {
      startSignIn.mockResolvedValue({ code: '314359', expires_in: 300 })
      getSignInState.mockResolvedValue({ state: 'waiting', code: '314359', error: null })
      const w = mountIt(true, signInStatus())
      await start(w)
      expect(startSignIn).toHaveBeenCalledWith('/api/soloist')
      expect(w.find('[data-test="signin-code"]').text()).toBe('314359')
      const text = w.text()
      expect(text).toContain('profile')
      expect(text).toContain('Quick Connect')
      expect(w.find('[data-test="signin-start"]').exists()).toBe(false)
    })

    it('polls until approved then emits changed', async () => {
      startSignIn.mockResolvedValue({ code: '314359', expires_in: 300 })
      getSignInState
        .mockResolvedValueOnce({ state: 'waiting', code: '314359', error: null })
        .mockResolvedValueOnce({ state: 'approved', code: null, error: null })
      const w = mountIt(true, signInStatus())
      await start(w)
      await vi.advanceTimersByTimeAsync(1600)
      expect(w.emitted('changed')).toBeFalsy()
      await vi.advanceTimersByTimeAsync(1600)
      await flushPromises()
      expect(getSignInState).toHaveBeenCalledTimes(2)
      expect(w.emitted('changed')).toBeTruthy()
      await vi.advanceTimersByTimeAsync(5000)
      expect(getSignInState).toHaveBeenCalledTimes(2)
    })

    it('expired code returns to sign-in', async () => {
      startSignIn.mockResolvedValue({ code: '314359', expires_in: 300 })
      getSignInState.mockResolvedValue({ state: 'expired', code: null, error: 'The code expired.' })
      const w = mountIt(true, signInStatus())
      await start(w)
      await vi.advanceTimersByTimeAsync(1600)
      await flushPromises()
      expect(w.text()).toContain('The code expired.')
      expect(w.find('[data-test="signin-start"]').exists()).toBe(true)
      expect(w.find('[data-test="signin-code"]').exists()).toBe(false)
    })

    it('shows provider error on sign-in failure', async () => {
      startSignIn.mockRejectedValue(new Error('Quick Connect is disabled on the server'))
      const w = mountIt(true, signInStatus())
      await start(w)
      expect(w.find('.sb').text()).toContain('Quick Connect is disabled on the server')
      expect(w.find('[data-test="signin-start"]').exists()).toBe(true)
    })

    it('cancel calls cancelSignIn', async () => {
      startSignIn.mockResolvedValue({ code: '314359', expires_in: 300 })
      getSignInState.mockResolvedValue({ state: 'waiting', code: '314359', error: null })
      cancelSignIn.mockResolvedValue(undefined)
      const w = mountIt(true, signInStatus())
      await start(w)
      await w.find('[data-test="signin-cancel"]').trigger('click')
      await flushPromises()
      expect(cancelSignIn).toHaveBeenCalledWith('/api/soloist')
      expect(w.find('[data-test="signin-start"]').exists()).toBe(true)
    })

    it('stops polling on unmount', async () => {
      startSignIn.mockResolvedValue({ code: '314359', expires_in: 300 })
      getSignInState.mockResolvedValue({ state: 'waiting', code: '314359', error: null })
      const w = mountIt(true, signInStatus())
      await start(w)
      w.unmount()
      await vi.advanceTimersByTimeAsync(5000)
      expect(getSignInState).not.toHaveBeenCalled()
    })

    it('signed in shows account, server and Sign out', async () => {
      signOut.mockResolvedValue(undefined)
      const w = mountIt(
        true,
        signInStatus({ logged_in: true }, { account: 'alice', server_name: 'Home' }),
      )
      await flushPromises()
      expect(w.find('[data-test="signin-account"]').text()).toBe('Signed in as alice on Home.')
      await w.find('[data-test="signin-logout"]').trigger('click')
      await flushPromises()
      expect(signOut).toHaveBeenCalledWith('/api/soloist')
      expect(w.emitted('changed')).toBeTruthy()
    })

    it('provider without sign_in renders exactly as before', async () => {
      const w = mountIt(true, status({ binary_installed: true, version: 'soloist 1.0' }))
      await flushPromises()
      expect(w.find('[data-test="setup-version"]').exists()).toBe(true)
      expect(w.find('[data-test="setup-update"]').exists()).toBe(true)
      expect(w.find('[data-test="signin-start"]').exists()).toBe(false)
    })
  })
})
