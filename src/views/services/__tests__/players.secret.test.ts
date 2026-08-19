import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PlayersView from '@/views/services/players.vue'
import PlayerCard from '@/components/PlayerCard.vue'

// players.vue is the only place `pendingSecret` (the typed-but-unsaved
// credential) lives, so this has to be an integration-style mount of the
// view rather than a PlayerCard-only test.

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Two external players, so a save on one can be observed to (not) disturb
// the other's still-open, unsaved config panel. `externalPlayers` is the
// mutable "server state" the mocked API reads from and writes back to.
const { externalPlayers, saveExternalPlayerSettings } = vi.hoisted(() => {
  const makePlayer = (systemdService: string, name: string, key: string) => ({
    name,
    provided_by: systemdService,
    systemd_service: systemdService,
    icon_url: '',
    allow_change: true,
    maintainer_name: '',
    maintainer_url: '',
    settings: [
      { key, type: 'secret' as const, label: `${name} API key`, default: '', is_set: false },
    ],
  })
  return {
    externalPlayers: [
      makePlayer('soloist', 'Spotify (Soloist)', 'api_key'),
      makePlayer('other-service', 'Other Service', 'token'),
    ],
    saveExternalPlayerSettings: vi.fn().mockResolvedValue({}),
  }
})

vi.mock('@/api/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/config')>()
  return {
    ...actual,
    getMultipleServiceStatus: vi.fn().mockResolvedValue(new Map()),
    enableNowService: vi.fn(),
    disableNowService: vi.fn(),
    // `true` here so builtin players (and the mocked external ones, which
    // share this same existence check) stay visible under the view's
    // default non-expert-mode filter, which hides anything with exists === false.
    checkSystemdServiceExists: vi.fn().mockResolvedValue({ data: { exists: true } }),
    // Deep-cloned per call so the view's own copies never alias the "server
    // state" array directly -- only explicit test mutations (below) change it.
    getExternalPlayers: vi.fn(async () =>
      externalPlayers.map(p => ({ ...p, settings: p.settings.map(s => ({ ...s })) }))
    ),
    saveExternalPlayerSettings,
  }
})

vi.mock('@/services/toslink', () => ({
  getTOSLinkStatus: vi.fn().mockResolvedValue({
    available: false,
    allowChange: false,
    error: undefined,
    sensitivity: undefined,
    signalDetected: false,
    enabled: false,
  }),
  enableTOSLink: vi.fn(),
  disableTOSLink: vi.fn(),
  setTOSLinkSensitivity: vi.fn(),
}))

const mountPlayersView = async () => {
  const wrapper = mount(PlayersView, {
    global: {
      stubs: {
        PageContent: { template: '<div><slot /></div>' },
        Icon: true,
        InlineSvg: true,
        ToggleSwitch: true,
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })
  // onMounted kicks off loadServiceStatus, which awaits several mocked
  // calls in sequence (external players, TOSLink, per-service existence).
  await flushPromises()
  await flushPromises()
  return wrapper
}

const findCard = (wrapper: ReturnType<typeof mount>, systemdService: string) =>
  wrapper.findAllComponents(PlayerCard)
    .find(c => (c.props('player') as { systemdService?: string }).systemdService === systemdService)!

describe('players.vue secret setting lifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    saveExternalPlayerSettings.mockClear()
    // Reset "server state" between tests.
    externalPlayers[0].settings[0].is_set = false
    externalPlayers[1].settings[0].is_set = false
  })

  it('drops a typed-but-cancelled secret so a later save does not resend it', async () => {
    const wrapper = await mountPlayersView()
    let card = findCard(wrapper, 'soloist')
    expect(card.exists()).toBe(true)

    // Open the config panel, type a credential, then Cancel instead of Save.
    await card.find('.expand-caret').trigger('click')
    card = findCard(wrapper, 'soloist')
    await card.find('input[type="password"]').setValue('SECRET-abc123')
    await card.find('.config-btn--cancel').trigger('click')

    // Reopen and save without retyping anything.
    card = findCard(wrapper, 'soloist')
    await card.find('.expand-caret').trigger('click')
    card = findCard(wrapper, 'soloist')
    await card.find('.config-btn--save').trigger('click')
    await flushPromises()

    expect(saveExternalPlayerSettings).toHaveBeenCalledTimes(1)
    const [, values] = saveExternalPlayerSettings.mock.calls[0]
    // Cancel must have cleared the pending value: "leave alone" (no key
    // sent), not "clear" (empty string sent) and not the typed text.
    expect(values).not.toHaveProperty('api_key')
  })

  it('does not let saving one external player discard another player\'s unsaved secret', async () => {
    const wrapper = await mountPlayersView()

    // Open BOTH external players' config panels at once -- toggleConfigExpanded
    // is additive over a Set, so this is a reachable, legitimate UI state.
    await findCard(wrapper, 'soloist').find('.expand-caret').trigger('click')
    await findCard(wrapper, 'other-service').find('.expand-caret').trigger('click')

    // Type into player B's secret field. Never saved, never cancelled --
    // it should still be sitting there as a pending edit.
    await findCard(wrapper, 'other-service').find('input[type="password"]').setValue('B-SECRET-xyz')

    // Player A's save resolves and the server reports A's credential is now
    // stored (is_set flips), exercising the same refresh path that must not
    // touch player B.
    saveExternalPlayerSettings.mockImplementationOnce(async () => {
      externalPlayers[0].settings[0].is_set = true
      return {}
    })
    await findCard(wrapper, 'soloist').find('.config-btn--save').trigger('click')
    await flushPromises()

    // Now save B, without retyping anything into it.
    await findCard(wrapper, 'other-service').find('.config-btn--save').trigger('click')
    await flushPromises()

    expect(saveExternalPlayerSettings).toHaveBeenCalledTimes(2)
    const [serviceB, valuesB] = saveExternalPlayerSettings.mock.calls[1]
    expect(serviceB).toBe('other-service')
    // B's typed-but-unsaved secret must have survived A's save and refresh.
    expect(valuesB).toHaveProperty('token', 'B-SECRET-xyz')
  })
})
