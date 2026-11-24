import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import PlayersView from '@/views/services/players.vue'
import PlayerCard from '@/components/PlayerCard.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const m = vi.hoisted(() => ({
  getAes67: vi.fn(),
  store: null as unknown as Record<string, unknown>,
  externalPlayers: [] as Record<string, unknown>[],
}))

vi.mock('@/api/aas', () => ({
  getAes67: m.getAes67,
  getAes67Streams: vi.fn().mockResolvedValue([]),
  setAes67Input: vi.fn(),
  isAasError: (x: unknown) => typeof x === 'object' && x !== null && 'error' in x,
}))
vi.mock('@/stores/audio-server', () => ({ useAudioServerStore: () => m.store }))

vi.mock('@/api/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/config')>()
  return {
    ...actual,
    getMultipleServiceStatus: vi.fn().mockResolvedValue(new Map()),
    enableNowService: vi.fn(),
    disableNowService: vi.fn(),
    checkSystemdServiceExists: vi.fn().mockResolvedValue({ data: { exists: true } }),
    getExternalPlayers: vi.fn(async () => m.externalPlayers),
    saveExternalPlayerSettings: vi.fn(),
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

const external = (name: string, provided_by: string) => ({
  name,
  provided_by,
  systemd_service: provided_by,
  icon_url: '',
  allow_change: true,
  maintainer_name: 'Experimental',
  maintainer_url: '',
  settings: [],
})

const setStore = (running: 'pipewire' | 'aas') => {
  m.store = { running: ref(running), load: vi.fn().mockResolvedValue(undefined) }
}

const mountPlayersView = async () => {
  const wrapper = mount(PlayersView, {
    global: {
      stubs: {
        PageContent: { template: '<div><slot /></div>' },
        Icon: true,
        InlineSvg: true,
        RouterLink: { props: ['to'], template: '<a :data-to="to.name"><slot /></a>' },
      },
    },
  })
  await flushPromises()
  await flushPromises()
  return wrapper
}

const builtinNames = (wrapper: Awaited<ReturnType<typeof mountPlayersView>>) =>
  wrapper
    .find('.players-list')
    .findAll('h3')
    .map((h) => h.text())

describe('players.vue: AES67', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setStore('aas')
    m.getAes67.mockResolvedValue({
      input: { enabled: true, stream: null, latency_ms: 5, latency_auto: true, receiving: true, mode: null },
    })
    m.externalPlayers = [external('AES67', 'hifiberry-aes67'), external('Other', 'other-player')]
  })

  it('lists AES67 (aas) after Bluetooth among the built-in players', async () => {
    const wrapper = await mountPlayersView()
    const names = builtinNames(wrapper)
    expect(names[names.length - 1]).toBe('AES67 (aas)')
    expect(names[names.length - 2]).toBe('Bluetooth (hifiberry-bluetooth)')
    const card = wrapper.find('[data-test="aes67-player"]')
    expect(card.find('.player-item').classes()).not.toContain('greyed')
    expect(card.find('[data-test="aes67-status"]').text()).toBe('active')
  })

  it('greys AES67 out while PipeWire runs', async () => {
    setStore('pipewire')
    const wrapper = await mountPlayersView()
    const card = wrapper.find('[data-test="aes67-player"]')
    expect(card.find('.player-item').classes()).toContain('greyed')
    expect(card.find('[data-test="aes67-requires-aas"]').text()).toContain('Requires the aas audio server')
    expect(card.find('[data-test="aes67-enabled"] input').attributes('disabled')).toBeDefined()
    expect(m.getAes67).not.toHaveBeenCalled()
  })

  it('says AES67 needs a wired network on 404', async () => {
    m.getAes67.mockResolvedValue({ error: 'HTTP 404', message: 'Not Found' })
    const wrapper = await mountPlayersView()
    const card = wrapper.find('[data-test="aes67-player"]')
    expect(card.find('.player-item').classes()).toContain('greyed')
    expect(card.find('[data-test="aes67-unavailable"]').text()).toBe('Needs a wired network connection')
  })

  it('hides the old hifiberry-aes67 extension', async () => {
    const wrapper = await mountPlayersView()
    const providers = wrapper
      .findAllComponents(PlayerCard)
      .map((c) => (c.props('player') as { providedBy: string }).providedBy)
    expect(providers).toContain('other-player')
    expect(providers).not.toContain('hifiberry-aes67')
  })
})
