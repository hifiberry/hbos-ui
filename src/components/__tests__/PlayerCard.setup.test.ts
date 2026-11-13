import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'

const { getSetupStatus } = vi.hoisted(() => ({ getSetupStatus: vi.fn() }))
vi.mock('@/api/player-setup', () => ({ getSetupStatus }))

import PlayerCard from '@/components/PlayerCard.vue'

const status = (over = {}) => ({
  binary_installed: true,
  version: '1.0',
  build_date: null,
  expires_on: null,
  bridge_connected: true,
  logged_in: false,
  is_active: false,
  device_name: null,
  ...over,
})

const signIn = (over = {}) => ({
  method: 'quick_connect',
  account: null,
  server_name: null,
  ready: true,
  reason: null,
  ...over,
})

const player = (over = {}) => ({
  name: 'Jellyfin',
  providedBy: 'hifiberry-jellyfin',
  systemdService: 'jellyfin',
  config: 'none',
  status: 'inactive',
  icon: 'jellyfin',
  enabled: false,
  exists: true,
  isExternal: true,
  allow_change: true,
  setup: { base_url: '/api/jellyfin' },
  settings: [
    { key: 'server_url', type: 'text', label: 'Server address', default: '', value: '' },
  ],
  ...over,
})

const mountCard = (p = player(), isExpanded = false) =>
  mount(PlayerCard, {
    props: { player: p, isExpanded },
    global: {
      stubs: {
        Icon: true,
        InlineSvg: true,
        ToggleSwitch: true,
        RouterLink: true,
        PlayerSetupPanel: true,
      },
    },
  })

// The card's own enable toggle, not a per-setting one.
const enableToggle = (w: ReturnType<typeof mountCard>) =>
  w.find('.player-toggle').findComponent({ name: 'ToggleSwitch' })

describe('PlayerCard setup gating', () => {
  beforeEach(() => getSetupStatus.mockReset())

  it('keeps a player that is off from being switched on before sign-in', async () => {
    getSetupStatus.mockResolvedValue(status({ sign_in: signIn() }))
    const w = mountCard(player({ status: 'inactive' }))
    await flushPromises()
    expect(enableToggle(w).props('disabled')).toBe(true)
  })

  // Signing out, or choosing another server, while the player runs leaves it
  // on and "not signed in". Turning it off must still work.
  it('lets a player that is on be switched off while setup is incomplete', async () => {
    getSetupStatus.mockResolvedValue(status({ sign_in: signIn(), is_active: true }))
    const w = mountCard(player({ status: 'active' }))
    await flushPromises()
    expect(w.find('[data-test="setup-required"]').exists()).toBe(true)
    expect(enableToggle(w).props('disabled')).toBe(false)
  })

  it('a DSP-provided player counts as on when enabled', async () => {
    getSetupStatus.mockResolvedValue(status({ sign_in: signIn() }))
    const w = mountCard(player({ providedBy: 'DSP', enabled: true, status: 'inactive' }))
    await flushPromises()
    expect(enableToggle(w).props('disabled')).toBe(false)
  })

  it('says sign-in is needed when the player has a sign-in flow', async () => {
    getSetupStatus.mockResolvedValue(status({ sign_in: signIn() }))
    const w = mountCard()
    await flushPromises()
    const badge = w.find('[data-test="setup-required"]').text()
    expect(badge).toContain('sign in')
    expect(badge).not.toContain('add settings')
  })

  it('still asks for settings when a player without sign-in lacks a secret', async () => {
    getSetupStatus.mockResolvedValue(status())
    const w = mountCard(player({
      settings: [{ key: 'key', type: 'secret', label: 'Key', default: '', is_set: false }],
    }))
    await flushPromises()
    expect(w.find('[data-test="setup-required"]').text()).toContain('add settings')
  })
})

describe('PlayerCard setup status refresh', () => {
  beforeEach(() => getSetupStatus.mockReset())

  it('re-reads the setup status whenever the card is expanded', async () => {
    getSetupStatus.mockResolvedValue(status({ sign_in: signIn() }))
    const w = mountCard()
    await flushPromises()
    expect(getSetupStatus).toHaveBeenCalledTimes(1)
    await w.setProps({ isExpanded: true })
    await flushPromises()
    expect(getSetupStatus).toHaveBeenCalledTimes(2)
    await w.setProps({ isExpanded: false })
    await flushPromises()
    expect(getSetupStatus).toHaveBeenCalledTimes(2)
  })

  // Saving the server setting is what makes the player ready to sign in; the
  // page replaces the settings with what the server holds after a successful
  // save, and the stale "Choose a server first." must go with it.
  it('re-reads the setup status after the settings were saved', async () => {
    getSetupStatus.mockResolvedValueOnce(
      status({ sign_in: signIn({ ready: false, reason: 'Choose a server first.' }) }),
    )
    getSetupStatus.mockResolvedValueOnce(status({ sign_in: signIn() }))
    const p = player()
    const w = mountCard(p, true)
    await flushPromises()
    const before = getSetupStatus.mock.calls.length
    await w.setProps({
      player: {
        ...p,
        settings: [{ ...p.settings[0], value: 'http://jellyfin.example:8096' }],
      },
    })
    await flushPromises()
    expect(getSetupStatus.mock.calls.length).toBe(before + 1)
    expect(w.findComponent({ name: 'PlayerSetupPanel' }).props('status').sign_in.ready).toBe(true)
  })

  it('does not re-read while a setting is only being edited', async () => {
    getSetupStatus.mockResolvedValue(status({ sign_in: signIn() }))
    // Reactive, as the page's players are, so an in-place edit is visible.
    const p = reactive(player())
    const w = mountCard(p, true)
    await flushPromises()
    const before = getSetupStatus.mock.calls.length
    // updateExternalSetting mutates the value in place until Save.
    p.settings[0].value = 'http://jellyfin.exa'
    await flushPromises()
    expect(getSetupStatus.mock.calls.length).toBe(before)
    expect(w.exists()).toBe(true)
  })
})
