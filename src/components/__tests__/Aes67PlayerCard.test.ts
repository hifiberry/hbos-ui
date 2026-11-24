import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref, type Ref } from 'vue'

const m = vi.hoisted(() => ({
  getAes67: vi.fn(),
  getAes67Streams: vi.fn(),
  setAes67Input: vi.fn(),
  store: null as unknown as Record<string, unknown>,
}))

vi.mock('@/api/aas', () => ({
  getAes67: m.getAes67,
  getAes67Streams: m.getAes67Streams,
  setAes67Input: m.setAes67Input,
  isAasError: (x: unknown) => typeof x === 'object' && x !== null && 'error' in x,
}))
// The store's state as refs, so storeToRefs hands the card these very refs.
vi.mock('@/stores/audio-server', () => ({ useAudioServerStore: () => m.store }))

import Aes67PlayerCard from '@/components/Aes67PlayerCard.vue'
import { useToastStore } from '@/stores/toast'

const setStore = (running: 'pipewire' | 'aas') => {
  m.store = {
    running: ref(running),
    loaded: ref(true),
    error: ref<string | null>(null),
    load: vi.fn().mockResolvedValue(undefined),
  }
}
const storeRef = <T>(key: string) => m.store[key] as Ref<T>

const mountCard = async (open = true) => {
  const wrapper = mount(Aes67PlayerCard, {
    global: {
      stubs: {
        Icon: true,
        RouterLink: { props: ['to'], template: '<a data-test="link" :data-to="to.name"><slot /></a>' },
      },
    },
  })
  await flushPromises()
  if (open) await wrapper.find('[data-test="aes67-expand"]').trigger('click')
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountCard>>

const input = (fields: Record<string, unknown> = {}) => ({
  input: {
    enabled: true,
    stream: null,
    latency_ms: 5,
    latency_auto: true,
    receiving: false,
    mode: null,
    ...fields,
  },
})

const options = (wrapper: Wrapper) =>
  wrapper.findAll('[data-test="aes67-stream"] option').filter((o) => !(o.element as HTMLOptionElement).disabled)
const toggle = (wrapper: Wrapper) => wrapper.find('[data-test="aes67-enabled"] input')
const greyed = (wrapper: Wrapper) => wrapper.find('.player-item').classes().includes('greyed')

describe('AES67 player card', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setStore('aas')
    m.getAes67.mockResolvedValue(input())
    m.getAes67Streams.mockResolvedValue([])
    m.setAes67Input.mockResolvedValue({})
  })

  it('reads like the other players', async () => {
    const wrapper = await mountCard(false)
    expect(wrapper.find('h3').text()).toBe('AES67 (aas)')
    expect(wrapper.find('[data-test="aes67-settings"]').exists()).toBe(false)
    expect(greyed(wrapper)).toBe(false)
    expect(m.store.load).toHaveBeenCalledTimes(1)
  })

  it('is active only while enabled and receiving', async () => {
    m.getAes67.mockResolvedValue(input({ enabled: true, receiving: true }))
    let wrapper = await mountCard(false)
    expect(wrapper.find('[data-test="aes67-status"]').text()).toBe('active')
    expect(wrapper.find('[data-test="aes67-status"]').classes()).toContain('green')

    m.getAes67.mockResolvedValue(input({ enabled: true, receiving: false }))
    wrapper = await mountCard(false)
    expect(wrapper.find('[data-test="aes67-status"]').text()).toBe('inactive')

    m.getAes67.mockResolvedValue(input({ enabled: false, receiving: true }))
    wrapper = await mountCard(false)
    expect(wrapper.find('[data-test="aes67-status"]').text()).toBe('inactive')
  })

  it('is greyed out and points to the Audio Server page while aas does not run', async () => {
    setStore('pipewire')
    const wrapper = await mountCard()
    expect(greyed(wrapper)).toBe(true)
    const note = wrapper.find('[data-test="aes67-requires-aas"]')
    expect(note.text()).toContain('Requires the aas audio server')
    expect(note.find('[data-test="link"]').attributes('data-to')).toBe('audio-server')
    expect(toggle(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="aes67-settings"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="aes67-status"]').text()).toBe('inactive')
    expect(m.getAes67).not.toHaveBeenCalled()
  })

  it('is greyed out without a wired network on 404', async () => {
    m.getAes67.mockResolvedValue({ error: 'HTTP 404', message: 'Not Found' })
    const wrapper = await mountCard()
    expect(greyed(wrapper)).toBe(true)
    expect(wrapper.find('[data-test="aes67-unavailable"]').text()).toBe('Requires a wired network connection')
    expect(toggle(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="aes67-settings"]').exists()).toBe(false)
  })

  it('retries reading AES67', async () => {
    m.getAes67.mockResolvedValue({ error: 'HTTP 500', message: 'busy' })
    const wrapper = await mountCard()
    expect(greyed(wrapper)).toBe(true)
    expect(wrapper.find('[data-test="aes67-error"]').text()).toContain('Could not read the AES67 settings: busy')
    m.getAes67.mockResolvedValue(input())
    await wrapper.find('[data-test="aes67-retry"]').trigger('click')
    await flushPromises()
    expect(m.getAes67).toHaveBeenCalledTimes(2)
    expect(greyed(wrapper)).toBe(false)
    expect(wrapper.find('[data-test="aes67-error"]').exists()).toBe(false)
    expect(toggle(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('says when the audio server cannot be read, and retries it', async () => {
    // A failed read leaves the store's default: `running` says nothing then.
    setStore('pipewire')
    storeRef<string | null>('error').value = 'Network Error'
    const wrapper = await mountCard()
    expect(greyed(wrapper)).toBe(true)
    expect(wrapper.find('[data-test="aes67-server-error"]').text()).toContain(
      'Could not read the audio server: Network Error',
    )
    expect(wrapper.find('[data-test="aes67-requires-aas"]').exists()).toBe(false)
    expect(m.getAes67).not.toHaveBeenCalled()

    ;(m.store.load as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      storeRef<string | null>('error').value = null
      storeRef<string>('running').value = 'aas'
    })
    await wrapper.find('[data-test="aes67-server-retry"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="aes67-server-error"]').exists()).toBe(false)
    expect(m.getAes67).toHaveBeenCalledTimes(1)
    expect(greyed(wrapper)).toBe(false)
  })

  it('gives no reason until the audio server has been read', async () => {
    setStore('pipewire')
    storeRef<boolean>('loaded').value = false
    let done: () => void = () => {}
    ;(m.store.load as ReturnType<typeof vi.fn>).mockReturnValue(new Promise<void>((r) => (done = r)))
    const wrapper = await mountCard(false)
    expect(greyed(wrapper)).toBe(true)
    expect(wrapper.find('.player-note').exists()).toBe(false)

    storeRef<boolean>('loaded').value = true
    storeRef<string>('running').value = 'aas'
    done()
    await flushPromises()
    expect(wrapper.find('[data-test="aes67-requires-aas"]').exists()).toBe(false)
    expect(greyed(wrapper)).toBe(false)
  })

  it('says it is reading while the first GET /aes67 is under way', async () => {
    let answer: (v: unknown) => void = () => {}
    m.getAes67.mockReturnValue(new Promise((r) => (answer = r)))
    const wrapper = await mountCard(false)
    expect(greyed(wrapper)).toBe(true)
    expect(wrapper.find('[data-test="aes67-reading"]').text()).toBe('Reading…')
    answer(input())
    await flushPromises()
    expect(wrapper.find('[data-test="aes67-reading"]').exists()).toBe(false)
    expect(greyed(wrapper)).toBe(false)
  })

  it('follows the audio server while mounted', async () => {
    setStore('pipewire')
    const wrapper = await mountCard(false)
    expect(greyed(wrapper)).toBe(true)
    expect(m.getAes67).not.toHaveBeenCalled()

    storeRef<string>('running').value = 'aas'
    await flushPromises()
    expect(m.getAes67).toHaveBeenCalledTimes(1)
    expect(greyed(wrapper)).toBe(false)
    expect(toggle(wrapper).attributes('disabled')).toBeUndefined()

    await wrapper.find('[data-test="aes67-expand"]').trigger('click')
    expect(wrapper.find('[data-test="aes67-settings"]').exists()).toBe(true)

    storeRef<string>('running').value = 'pipewire'
    await flushPromises()
    expect(greyed(wrapper)).toBe(true)
    expect(wrapper.find('[data-test="aes67-requires-aas"]').exists()).toBe(true)
    expect(toggle(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="aes67-settings"]').exists()).toBe(false)

    // Un-greyed again, the settings stay closed until asked for.
    storeRef<string>('running').value = 'aas'
    await flushPromises()
    expect(greyed(wrapper)).toBe(false)
    expect(wrapper.find('[data-test="aes67-settings"]').exists()).toBe(false)
  })

  it('drops an answer to a request older than the last one', async () => {
    const wrapper = await mountCard(false)
    let oldAnswer: (v: unknown) => void = () => {}
    let newAnswer: (v: unknown) => void = () => {}
    m.getAes67
      .mockReturnValueOnce(new Promise((r) => (oldAnswer = r)))
      .mockReturnValueOnce(new Promise((r) => (newAnswer = r)))
    // The reload after this change is still in flight when aas stops and starts again.
    await toggle(wrapper).setValue(false)
    await flushPromises()
    storeRef<string>('running').value = 'pipewire'
    await flushPromises()
    storeRef<string>('running').value = 'aas'
    await flushPromises()
    expect(m.getAes67).toHaveBeenCalledTimes(3)

    oldAnswer(input({ enabled: false }))
    await flushPromises()
    expect(wrapper.find('[data-test="aes67-reading"]').exists()).toBe(true)
    expect(greyed(wrapper)).toBe(true)

    newAnswer(input({ enabled: true, receiving: true }))
    await flushPromises()
    expect(greyed(wrapper)).toBe(false)
    expect((toggle(wrapper).element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.find('[data-test="aes67-status"]').text()).toBe('active')
  })

  it('turns AES67 on', async () => {
    m.getAes67.mockResolvedValueOnce(input({ enabled: false })).mockResolvedValue(input({ enabled: true }))
    const wrapper = await mountCard(false)
    expect((toggle(wrapper).element as HTMLInputElement).checked).toBe(false)
    m.getAes67Streams.mockClear()

    await toggle(wrapper).setValue(true)
    await flushPromises()

    expect(m.setAes67Input).toHaveBeenCalledTimes(1)
    expect(m.setAes67Input).toHaveBeenCalledWith({ enabled: true })
    expect(m.getAes67).toHaveBeenCalledTimes(2)
    expect(m.getAes67Streams).toHaveBeenCalled()
    expect((toggle(wrapper).element as HTMLInputElement).checked).toBe(true)
  })

  it('reports a refused change and shows what aas holds', async () => {
    const errorToast = vi.spyOn(useToastStore(), 'showErrorToast')
    m.getAes67.mockResolvedValue(input({ enabled: false }))
    m.setAes67Input.mockResolvedValue({ error: 'HTTP 500', message: 'no interface' })
    const wrapper = await mountCard(false)

    await toggle(wrapper).setValue(true)
    await flushPromises()

    expect(errorToast).toHaveBeenCalledWith(expect.stringContaining('no interface'))
    expect(m.getAes67).toHaveBeenCalledTimes(2)
    expect((toggle(wrapper).element as HTMLInputElement).checked).toBe(false)
  })

  it('keeps the settings usable while the input is off', async () => {
    m.getAes67.mockResolvedValue(input({ enabled: false, latency_auto: false, latency_ms: 9 }))
    const wrapper = await mountCard()
    expect(wrapper.find('[data-test="aes67-stream"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-test="aes67-latency-input"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-test="aes67-latency-save"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-test="aes67-latency-auto"]').attributes('disabled')).toBeUndefined()
  })

  it('lists only selectable streams', async () => {
    m.getAes67Streams.mockResolvedValue([
      { name: 'a', selectable: true },
      { name: 'b', selectable: false },
    ])
    const wrapper = await mountCard()
    expect(options(wrapper).map((o) => o.text())).toEqual(['a'])
  })

  it('says when no stream is chosen', async () => {
    m.getAes67Streams.mockResolvedValue([{ name: 'a', selectable: true }])
    const wrapper = await mountCard()
    const select = wrapper.find('[data-test="aes67-stream"]')
    const selected = select.findAll('option').find((o) => (o.element as HTMLOptionElement).selected)
    expect(selected?.text()).toBe('No stream selected')
  })

  it('keeps an unannounced selection', async () => {
    m.getAes67.mockResolvedValue(input({ stream: 'gone' }))
    m.getAes67Streams.mockResolvedValue([{ name: 'a', selectable: true }])
    const wrapper = await mountCard()
    const select = wrapper.find('[data-test="aes67-stream"]')
    expect((select.element as HTMLSelectElement).value).toBe('gone')
    const selected = select.findAll('option').find((o) => (o.element as HTMLOptionElement).selected)
    expect(selected?.text()).toBe('gone (currently unavailable)')
    expect(m.setAes67Input).not.toHaveBeenCalled()
  })

  it('selects a stream', async () => {
    m.getAes67Streams.mockResolvedValue([
      { name: 'a', selectable: true },
      { name: 'c', selectable: true },
    ])
    const wrapper = await mountCard()
    await wrapper.find('[data-test="aes67-stream"]').setValue('a')
    await flushPromises()
    expect(m.setAes67Input).toHaveBeenCalledTimes(1)
    expect(m.setAes67Input).toHaveBeenCalledWith({ stream: 'a' })
  })

  it('sets the AES67 latency', async () => {
    m.getAes67.mockResolvedValue(input({ latency_ms: 5, latency_floor_ms: 6, latency_auto: true }))
    const wrapper = await mountCard()
    expect(wrapper.find('[data-test="aes67-latency-current"]').text()).toContain('Automatic (6 ms)')
    expect(wrapper.find('[data-test="aes67-latency-note"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="aes67-settings"]').text()).toContain(
      "The lowest possible latency depends on the sound card latency, set on the Audio Server page.",
    )

    m.getAes67.mockResolvedValue(input({ latency_ms: 4, latency_floor_ms: 6, latency_auto: false }))
    await wrapper.find('[data-test="aes67-latency-input"]').setValue('4')
    await wrapper.find('[data-test="aes67-latency-save"]').trigger('click')
    await flushPromises()
    expect(m.setAes67Input).toHaveBeenCalledWith({ latency_ms: 4 })
    expect(wrapper.find('[data-test="aes67-latency-current"]').text()).toContain('4 ms')
    expect(wrapper.find('[data-test="aes67-latency-note"]').text()).toBe(
      'Too low for this device. AES67 uses 6 ms, the lowest it can handle.',
    )

    m.getAes67.mockResolvedValue(input({ latency_ms: 5, latency_floor_ms: 6, latency_auto: true }))
    await wrapper.find('[data-test="aes67-latency-auto"]').trigger('click')
    await flushPromises()
    expect(m.setAes67Input).toHaveBeenLastCalledWith({ latency_ms: 'auto' })
    expect(wrapper.find('[data-test="aes67-latency-current"]').text()).toContain('Automatic (6 ms)')
    expect(wrapper.find('[data-test="aes67-latency-note"]').exists()).toBe(false)
  })

  it('refuses an AES67 latency outside 1 to 100 whole ms', async () => {
    const wrapper = await mountCard()
    for (const bad of ['0', '101', '2.5', '']) {
      await wrapper.find('[data-test="aes67-latency-input"]').setValue(bad)
      const save = wrapper.find('[data-test="aes67-latency-save"]')
      expect(save.attributes('disabled'), `Set enabled for "${bad}"`).toBeDefined()
      await save.trigger('click')
    }
    expect(m.setAes67Input).not.toHaveBeenCalled()
  })
})
