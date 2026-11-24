import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

const m = vi.hoisted(() => ({
  getSettings: vi.fn(),
  getAes67: vi.fn(),
  getAes67Streams: vi.fn(),
  setAes67Input: vi.fn(),
  getAasLatency: vi.fn(),
  setAasLatency: vi.fn(),
  store: null as unknown as Record<string, unknown>,
}))

vi.mock('@/api/aas', () => ({
  getSettings: m.getSettings,
  getAes67: m.getAes67,
  getAes67Streams: m.getAes67Streams,
  setAes67Input: m.setAes67Input,
  isAasError: (x: unknown) => typeof x === 'object' && x !== null && 'error' in x,
}))
vi.mock('@/api/audio-server', () => ({
  getAasLatency: m.getAasLatency,
  setAasLatency: m.setAasLatency,
}))
vi.mock('@/api/system', () => ({ rebootSystem: vi.fn() }))
vi.mock('@/composables/useAasWarnings', () => ({
  useAasWarnings: () => ({ collectAasWarnings: vi.fn().mockResolvedValue([]) }),
}))
vi.mock('@/stores/audio-server', () => ({ useAudioServerStore: () => m.store }))

import AudioServerView from '@/views/services/audio-server.vue'
import { useToastStore } from '@/stores/toast'

const setStore = (running: 'pipewire' | 'aas') => {
  m.store = {
    running: ref(running),
    chosen: ref(running),
    available: ref(true),
    error: ref(null),
    load: vi.fn().mockResolvedValue(undefined),
    choose: vi.fn(),
  }
}

const mountPage = async () => {
  const wrapper = mount(AudioServerView, {
    global: {
      stubs: {
        Icon: true,
        PageContent: { template: '<div><slot /></div>' },
        ConfirmationDialog: {
          props: ['isOpen', 'title', 'message'],
          emits: ['confirm', 'close'],
          template:
            '<div v-if="isOpen" data-test="dialog" :data-title="title"><p>{{ message }}</p>' +
            '<button data-test="dialog-confirm" @click="$emit(\'confirm\')">ok</button>' +
            '<button data-test="dialog-cancel" @click="$emit(\'close\')">cancel</button></div>',
        },
      },
    },
  })
  await flushPromises()
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountPage>>

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

const NO_AES67 =
  'AES67 is not available on this device: it needs aas with AES67 and a wired network connection.'

const section = (wrapper: Wrapper) => wrapper.find('[data-test="aes67-section"]')
const options = (wrapper: Wrapper) =>
  wrapper.findAll('[data-test="aes67-stream"] option').filter((o) => !(o.element as HTMLOptionElement).disabled)

describe('audio server page: AES67', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setStore('aas')
    m.getSettings.mockResolvedValue({ latency_ms: 5, latency_recommended_ms: 5, latency_min_ms: 3 })
    m.getAasLatency.mockResolvedValue({ latency_ms: 8 })
    m.setAasLatency.mockImplementation(async (v: number | null) => ({ latency_ms: v, restarted: false }))
    m.getAes67.mockResolvedValue(input())
    m.getAes67Streams.mockResolvedValue([])
    m.setAes67Input.mockResolvedValue({})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const aes67Controls = (wrapper: Wrapper) => [
    wrapper.find('[data-test="aes67-enabled"] input'),
    wrapper.find('[data-test="aes67-stream"]'),
    wrapper.find('[data-test="aes67-latency-save"]'),
    wrapper.find('[data-test="aes67-latency-auto"]'),
  ]

  it('holds AES67 while aas restarts, then reloads it', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    m.setAasLatency.mockImplementation(async (v: number | null) => ({ latency_ms: v, restarted: true }))
    m.getAes67.mockResolvedValue(input({ latency_auto: false, latency_ms: 9 }))
    const wrapper = await mountPage()
    m.getAes67.mockClear()
    m.getAes67Streams.mockClear()
    m.getSettings.mockReset()
    m.getSettings
      .mockResolvedValueOnce({ error: 'Network Error', message: 'Failed to fetch' })
      .mockResolvedValue({ latency_ms: 6, latency_recommended_ms: 5, latency_min_ms: 3 })

    await wrapper.find('[data-test="latency-input"]').setValue('6')
    await wrapper.find('[data-test="latency-save"]').trigger('click')
    await flushPromises()
    for (const control of aes67Controls(wrapper)) {
      expect(control.attributes('disabled')).toBeDefined()
    }
    await vi.advanceTimersByTimeAsync(1000)
    expect(m.getAes67).not.toHaveBeenCalled()

    m.getAes67.mockResolvedValue(input({ latency_auto: false, latency_ms: 9, latency_floor_ms: 8 }))
    m.getAes67Streams.mockResolvedValue([{ name: 'a', selectable: true }])
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(wrapper.find('[data-test="latency-restarting"]').exists()).toBe(false)
    expect(m.getAes67).toHaveBeenCalledTimes(1)
    expect(m.getAes67Streams).toHaveBeenCalledTimes(1)
    expect(options(wrapper).map((o) => o.text())).toEqual(['a'])
    expect(wrapper.find('[data-test="aes67-enabled"] input').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-test="aes67-latency-auto"]').attributes('disabled')).toBeUndefined()
  })

  it('retries reading AES67', async () => {
    m.getAes67.mockResolvedValue({ error: 'HTTP 500', message: 'busy' })
    const wrapper = await mountPage()
    expect(section(wrapper).text()).toContain('Could not read AES67: busy')
    m.getAes67.mockResolvedValue(input())
    await wrapper.find('[data-test="aes67-retry"]').trigger('click')
    await flushPromises()
    expect(m.getAes67).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-test="aes67-enabled"]').exists()).toBe(true)
  })

  it('shows the no-AES67 note on 404', async () => {
    m.getAes67.mockResolvedValue({ error: 'HTTP 404', message: 'Not Found' })
    const wrapper = await mountPage()
    expect(section(wrapper).text()).toContain(NO_AES67)
    expect(wrapper.find('[data-test="aes67-enabled"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="aes67-stream"]').exists()).toBe(false)
  })

  it('is absent while PipeWire runs', async () => {
    setStore('pipewire')
    const wrapper = await mountPage()
    expect(section(wrapper).exists()).toBe(false)
    expect(m.getAes67).not.toHaveBeenCalled()
  })

  it('turns AES67 on', async () => {
    m.getAes67.mockResolvedValueOnce(input({ enabled: false })).mockResolvedValue(input({ enabled: true }))
    const wrapper = await mountPage()
    const toggle = wrapper.find('[data-test="aes67-enabled"] input')
    expect((toggle.element as HTMLInputElement).checked).toBe(false)
    m.getAes67Streams.mockClear()

    await toggle.setValue(true)
    await flushPromises()

    expect(m.setAes67Input).toHaveBeenCalledTimes(1)
    expect(m.setAes67Input).toHaveBeenCalledWith({ enabled: true })
    expect(m.getAes67).toHaveBeenCalledTimes(2)
    expect(m.getAes67Streams).toHaveBeenCalled()
    expect((wrapper.find('[data-test="aes67-enabled"] input').element as HTMLInputElement).checked).toBe(true)
  })

  it('reports a refused change and shows what aas holds', async () => {
    const errorToast = vi.spyOn(useToastStore(), 'showErrorToast')
    m.getAes67.mockResolvedValue(input({ enabled: false }))
    m.setAes67Input.mockResolvedValue({ error: 'HTTP 500', message: 'no interface' })
    const wrapper = await mountPage()

    await wrapper.find('[data-test="aes67-enabled"] input').setValue(true)
    await flushPromises()

    expect(errorToast).toHaveBeenCalledWith(expect.stringContaining('no interface'))
    expect(m.getAes67).toHaveBeenCalledTimes(2)
    expect((wrapper.find('[data-test="aes67-enabled"] input').element as HTMLInputElement).checked).toBe(false)
  })

  it('lists only selectable streams', async () => {
    m.getAes67Streams.mockResolvedValue([
      { name: 'a', selectable: true },
      { name: 'b', selectable: false },
    ])
    const wrapper = await mountPage()
    expect(options(wrapper).map((o) => o.text())).toEqual(['a'])
  })

  it('keeps an unannounced selection', async () => {
    m.getAes67.mockResolvedValue(input({ stream: 'gone' }))
    m.getAes67Streams.mockResolvedValue([{ name: 'a', selectable: true }])
    const wrapper = await mountPage()
    const select = wrapper.find('[data-test="aes67-stream"]')
    expect((select.element as HTMLSelectElement).value).toBe('gone')
    const selected = select.findAll('option').find((o) => (o.element as HTMLOptionElement).selected)
    expect(selected?.text()).toBe('gone (not announced)')
    expect(m.setAes67Input).not.toHaveBeenCalled()
  })

  it('selects a stream', async () => {
    m.getAes67Streams.mockResolvedValue([
      { name: 'a', selectable: true },
      { name: 'c', selectable: true },
    ])
    const wrapper = await mountPage()
    await wrapper.find('[data-test="aes67-stream"]').setValue('a')
    await flushPromises()
    expect(m.setAes67Input).toHaveBeenCalledTimes(1)
    expect(m.setAes67Input).toHaveBeenCalledWith({ stream: 'a' })
  })

  it('sets the AES67 latency', async () => {
    m.getAes67.mockResolvedValue(input({ latency_ms: 5, latency_floor_ms: 6, latency_auto: true }))
    const wrapper = await mountPage()
    expect(wrapper.find('[data-test="aes67-latency-current"]').text()).toContain('Automatic (6 ms)')
    expect(wrapper.find('[data-test="aes67-latency-note"]').exists()).toBe(false)
    expect(section(wrapper).text()).toContain(
      "The AES67 latency includes the card's buffer: a lower card latency lowers the least it can hold.",
    )

    m.getAes67.mockResolvedValue(input({ latency_ms: 4, latency_floor_ms: 6, latency_auto: false }))
    await wrapper.find('[data-test="aes67-latency-input"]').setValue('4')
    await wrapper.find('[data-test="aes67-latency-save"]').trigger('click')
    await flushPromises()
    expect(m.setAes67Input).toHaveBeenCalledWith({ latency_ms: 4 })
    expect(wrapper.find('[data-test="aes67-latency-current"]').text()).toContain('4 ms')
    expect(wrapper.find('[data-test="aes67-latency-note"]').text()).toBe(
      'This board holds at least 6 ms; the stream plays at 6 ms.',
    )

    m.getAes67.mockResolvedValue(input({ latency_ms: 5, latency_floor_ms: 6, latency_auto: true }))
    await wrapper.find('[data-test="aes67-latency-auto"]').trigger('click')
    await flushPromises()
    expect(m.setAes67Input).toHaveBeenLastCalledWith({ latency_ms: 'auto' })
    expect(wrapper.find('[data-test="aes67-latency-current"]').text()).toContain('Automatic (6 ms)')
    expect(wrapper.find('[data-test="aes67-latency-note"]').exists()).toBe(false)
  })

  it('refuses an AES67 latency outside 1 to 100 whole ms', async () => {
    const wrapper = await mountPage()
    for (const bad of ['0', '101', '2.5', '']) {
      await wrapper.find('[data-test="aes67-latency-input"]').setValue(bad)
      const save = wrapper.find('[data-test="aes67-latency-save"]')
      expect(save.attributes('disabled'), `Set enabled for "${bad}"`).toBeDefined()
      await save.trigger('click')
    }
    expect(m.setAes67Input).not.toHaveBeenCalled()
  })

  it('recommended sets AES67 first, then the latency', async () => {
    const wrapper = await mountPage()
    await wrapper.find('[data-test="recommended"]').trigger('click')
    const dialog = wrapper.find('[data-test="dialog"]')
    expect(dialog.text()).toContain('Recommended (5 ms)')
    expect(dialog.text()).toContain('AES67 latency: Automatic')
    expect(m.setAes67Input).not.toHaveBeenCalled()

    await wrapper.find('[data-test="dialog-confirm"]').trigger('click')
    await flushPromises()
    expect(m.setAes67Input).toHaveBeenCalledWith({ latency_ms: 'auto' })
    expect(m.setAasLatency).toHaveBeenCalledWith(null)
    expect(m.setAes67Input.mock.invocationCallOrder[0]).toBeLessThan(
      m.setAasLatency.mock.invocationCallOrder[0],
    )
  })

  it('recommended leaves a latency that is already the default', async () => {
    const successToast = vi.spyOn(useToastStore(), 'showSuccessToast')
    m.getAasLatency.mockResolvedValue({ latency_ms: null })
    const wrapper = await mountPage()
    await wrapper.find('[data-test="recommended"]').trigger('click')
    await wrapper.find('[data-test="dialog-confirm"]').trigger('click')
    await flushPromises()
    expect(m.setAes67Input).toHaveBeenCalledWith({ latency_ms: 'auto' })
    expect(m.setAasLatency).not.toHaveBeenCalled()
    expect(successToast).toHaveBeenCalledWith('Recommended values set.')
  })

  it('recommended sets only the card latency without AES67', async () => {
    m.getAes67.mockResolvedValue({ error: 'HTTP 404', message: 'Not Found' })
    const wrapper = await mountPage()
    await wrapper.find('[data-test="recommended"]').trigger('click')
    expect(wrapper.find('[data-test="dialog"]').text()).not.toContain('AES67')
    await wrapper.find('[data-test="dialog-confirm"]').trigger('click')
    await flushPromises()
    expect(m.setAes67Input).not.toHaveBeenCalled()
    expect(m.setAasLatency).toHaveBeenCalledWith(null)
  })
})
