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

const { externalPlayer, saveExternalPlayerSettings } = vi.hoisted(() => ({
  externalPlayer: {
    name: 'Spotify (Soloist)',
    provided_by: 'soloist',
    systemd_service: 'soloist',
    icon_url: '',
    allow_change: true,
    maintainer_name: '',
    maintainer_url: '',
    settings: [
      { key: 'api_key', type: 'secret' as const, label: 'Soloist API key', default: '', is_set: false },
    ],
  },
  saveExternalPlayerSettings: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/api/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/config')>()
  return {
    ...actual,
    getMultipleServiceStatus: vi.fn().mockResolvedValue(new Map()),
    enableNowService: vi.fn(),
    disableNowService: vi.fn(),
    // `true` here so builtin players (and the mocked external one, which
    // shares this same existence check) stay visible under the view's
    // default non-expert-mode filter, which hides anything with exists === false.
    checkSystemdServiceExists: vi.fn().mockResolvedValue({ data: { exists: true } }),
    getExternalPlayers: vi.fn().mockResolvedValue([externalPlayer]),
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

const soloistCard = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAllComponents(PlayerCard)
    .find(c => (c.props('player') as { systemdService?: string }).systemdService === 'soloist')!

describe('players.vue secret setting lifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    saveExternalPlayerSettings.mockClear()
  })

  it('drops a typed-but-uncancelled secret so a later save does not resend it', async () => {
    const wrapper = await mountPlayersView()
    let card = soloistCard(wrapper)
    expect(card.exists()).toBe(true)

    // Open the config panel, type a credential, then Cancel instead of Save.
    await card.find('.expand-caret').trigger('click')
    card = soloistCard(wrapper)
    await card.find('input[type="password"]').setValue('SECRET-abc123')
    await card.find('.config-btn--cancel').trigger('click')

    // Reopen and save without retyping anything.
    card = soloistCard(wrapper)
    await card.find('.expand-caret').trigger('click')
    card = soloistCard(wrapper)
    await card.find('.config-btn--save').trigger('click')
    await flushPromises()

    expect(saveExternalPlayerSettings).toHaveBeenCalledTimes(1)
    const [, values] = saveExternalPlayerSettings.mock.calls[0]
    // Cancel must have cleared the pending value: "leave alone" (no key
    // sent), not "clear" (empty string sent) and not the typed text.
    expect(values).not.toHaveProperty('api_key')
  })
})
