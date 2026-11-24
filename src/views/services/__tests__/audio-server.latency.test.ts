import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

const m = vi.hoisted(() => ({
  getSettings: vi.fn(),
  getAes67: vi.fn(),
  getAasLatency: vi.fn(),
  setAasLatency: vi.fn(),
  store: null as unknown as Record<string, unknown>,
}))

vi.mock('@/api/aas', () => ({
  getSettings: m.getSettings,
  getAes67: m.getAes67,
  getAes67Streams: vi.fn(),
  setAes67Input: vi.fn(),
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
// The store's state as refs, so storeToRefs hands the view these very refs.
vi.mock('@/stores/audio-server', () => ({ useAudioServerStore: () => m.store }))

import AudioServerView from '@/views/services/audio-server.vue'
import { useToastStore } from '@/stores/toast'

const setStore = (running: 'pipewire' | 'aas', chosen: 'pipewire' | 'aas' = running) => {
  m.store = {
    running: ref(running),
    chosen: ref(chosen),
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
        PageContent: {
          props: ['backrouterLink'],
          template: '<div data-test="page" :data-back="backrouterLink?.name"><slot /></div>',
        },
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

const settings = (latency_ms: number, extra: Record<string, number> = { latency_recommended_ms: 5, latency_min_ms: 3 }) => ({
  latency_ms,
  ...extra,
})

const typeLatency = async (wrapper: Awaited<ReturnType<typeof mountPage>>, value: string) => {
  await wrapper.find('[data-test="latency-input"]').setValue(value)
}

describe('audio server page: card latency', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setStore('aas')
    m.getSettings.mockResolvedValue(settings(5))
    // Without AES67: its section is audio-server.aes67.test.ts's.
    m.getAes67.mockResolvedValue({ error: 'HTTP 404', message: 'Not Found' })
    m.getAasLatency.mockResolvedValue({ latency_ms: null })
    m.setAasLatency.mockImplementation(async (v: number | null) => ({ latency_ms: v, restarted: true }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hides aas settings while PipeWire runs', async () => {
    setStore('pipewire')
    const errorToast = vi.spyOn(useToastStore(), 'showErrorToast')
    const wrapper = await mountPage()

    expect(wrapper.find('[data-test="latency-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="aes67-section"]').exists()).toBe(false)
    expect(errorToast).not.toHaveBeenCalled()
    expect(m.getSettings).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Use aas')
  })

  it('says so when aas does not answer, and keeps the latency usable', async () => {
    m.getSettings.mockResolvedValue({ error: 'Network Error', message: 'down' })
    m.getAasLatency.mockResolvedValue({ latency_ms: 8 })
    const wrapper = await mountPage()
    expect(wrapper.find('[data-test="aas-not-answering"]').text()).toContain(
      'aas is not answering right now; it may be restarting.',
    )
    expect(wrapper.find('[data-test="latency-saved"]').text()).toContain('8 ms')
    expect(wrapper.find('[data-test="latency-running"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="aes67-section"]').exists()).toBe(false)
    const input = wrapper.find('[data-test="latency-input"]')
    expect(input.attributes('placeholder')).toBe("aas's default")
    // Without aas's figures there is nothing to warn about.
    await typeLatency(wrapper, '2')
    expect(wrapper.find('[data-test="latency-note"]').exists()).toBe(false)
  })

  it('retries aas when it does not answer', async () => {
    m.getSettings.mockResolvedValue({ error: 'Network Error', message: 'down' })
    const wrapper = await mountPage()
    m.getSettings.mockResolvedValue(settings(5))
    await wrapper.find('[data-test="aas-retry"]').trigger('click')
    await flushPromises()
    expect(m.store.load).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-test="aas-not-answering"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="latency-running"]').text()).toContain('5 ms')
  })

  it('saves and sets the recommended latency while aas does not answer', async () => {
    m.getSettings.mockResolvedValue({ error: 'Network Error', message: 'down' })
    m.setAasLatency.mockImplementation(async (v: number | null) => ({ latency_ms: v, restarted: false }))
    const wrapper = await mountPage()

    await typeLatency(wrapper, '2')
    await wrapper.find('[data-test="latency-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="dialog"]').exists()).toBe(false)
    expect(m.setAasLatency).toHaveBeenCalledWith(2)
    expect(wrapper.find('[data-test="latency-saved"]').text()).toContain('2 ms')

    await wrapper.find('[data-test="recommended"]').trigger('click')
    const dialog = wrapper.find('[data-test="dialog"]')
    expect(dialog.text()).toContain("Latency: aas's default")
    expect(dialog.text()).not.toMatch(/\d+ ms/)
    await wrapper.find('[data-test="dialog-confirm"]').trigger('click')
    await flushPromises()
    expect(m.setAasLatency).toHaveBeenLastCalledWith(null)
  })

  it('says when aas is chosen but not running', async () => {
    setStore('pipewire', 'aas')
    m.getSettings.mockResolvedValue({ error: 'Network Error', message: 'down' })
    const wrapper = await mountPage()
    expect(wrapper.find('[data-test="aas-not-running"]').text()).toBe(
      'aas is chosen but not running right now; it may be restarting.',
    )
    expect(wrapper.find('[data-test="aas-not-answering"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('The change applies after a reboot.')
  })

  it('does not say aas is not running while it runs', async () => {
    const wrapper = await mountPage()
    expect(wrapper.find('[data-test="aas-not-running"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="aas-not-answering"]').exists()).toBe(false)
  })

  it('shows a fractional saved latency', async () => {
    m.getAasLatency.mockResolvedValue({ latency_ms: 7.5 })
    m.getSettings.mockResolvedValue(settings(7.5))
    const wrapper = await mountPage()
    expect(wrapper.find('[data-test="latency-saved"]').text()).toContain('7.5 ms')
    expect(wrapper.find('[data-test="latency-running"]').text()).not.toContain('differs')
  })

  it('goes back to the Settings page', async () => {
    const wrapper = await mountPage()
    expect(wrapper.find('[data-test="page"]').attributes('data-back')).toBe('services')
  })

  it('says when the saved latency applies at the next start', async () => {
    m.setAasLatency.mockImplementation(async (v: number | null) => ({ latency_ms: v, restarted: false }))
    const wrapper = await mountPage()
    m.getSettings.mockClear()
    await typeLatency(wrapper, '8')
    await wrapper.find('[data-test="latency-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="latency-pending"]').text()).toBe(
      'Saved; it applies when aas next starts.',
    )
    expect(wrapper.find('[data-test="latency-restarting"]').exists()).toBe(false)
    expect(m.getSettings).not.toHaveBeenCalled()
  })

  it('stops waiting for aas when the page is left', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const wrapper = await mountPage()
    m.getSettings.mockReset()
    let answer: (v: unknown) => void = () => {}
    m.getSettings
      .mockReturnValueOnce(new Promise((resolve) => (answer = resolve)))
      .mockResolvedValue({ error: 'Network Error', message: 'Failed to fetch' })

    await typeLatency(wrapper, '8')
    await wrapper.find('[data-test="latency-save"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    expect(m.getSettings).toHaveBeenCalledTimes(1)

    // Left while a poll is in flight: its answer must not schedule another.
    wrapper.unmount()
    answer({ error: 'Network Error', message: 'Failed to fetch' })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(m.getSettings).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('gives up on a hanging poll in time', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const wrapper = await mountPage()
    m.getSettings.mockReset()
    m.getSettings.mockReturnValue(new Promise(() => {}))

    await typeLatency(wrapper, '7')
    await wrapper.find('[data-test="latency-save"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(33_000)
    await flushPromises()

    expect(wrapper.find('[data-test="latency-restarting"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="latency-error"]').text()).toContain('7 ms')
    expect(m.getSettings).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) })
  })

  it('shows the saved latency or the recommended one', async () => {
    let wrapper = await mountPage()
    let input = wrapper.find('[data-test="latency-input"]')
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(input.attributes('placeholder')).toBe('Recommended (5 ms)')
    expect(wrapper.find('[data-test="latency-saved"]').text()).toContain('Recommended (5 ms)')

    m.getAasLatency.mockResolvedValue({ latency_ms: 8 })
    m.getSettings.mockResolvedValue(settings(8))
    wrapper = await mountPage()
    input = wrapper.find('[data-test="latency-input"]')
    expect((input.element as HTMLInputElement).value).toBe('8')
    expect(wrapper.find('[data-test="latency-saved"]').text()).toContain('8 ms')
  })

  it('says when the running latency differs from the saved one', async () => {
    m.getAasLatency.mockResolvedValue({ latency_ms: 8 })
    m.getSettings.mockResolvedValue(settings(10))
    const wrapper = await mountPage()
    const running = wrapper.find('[data-test="latency-running"]').text()
    expect(running).toContain('10 ms')
    expect(running).toContain('differs from the saved value')
  })

  it('shows the note for the typed value', async () => {
    const wrapper = await mountPage()
    await typeLatency(wrapper, '4')
    expect(wrapper.find('[data-test="latency-note"]').text()).toBe(
      'Lower than recommended for this board: it may drop out under heavy load.',
    )
    await typeLatency(wrapper, '5')
    expect(wrapper.find('[data-test="latency-note"]').exists()).toBe(false)
  })

  it('refuses a latency outside 1 to 100 whole ms', async () => {
    const wrapper = await mountPage()
    for (const bad of ['4.5', '0', '101', '']) {
      await typeLatency(wrapper, bad)
      const save = wrapper.find('[data-test="latency-save"]')
      expect(save.attributes('disabled'), `Save enabled for "${bad}"`).toBeDefined()
      await save.trigger('click')
    }
    expect(m.setAasLatency).not.toHaveBeenCalled()
  })

  it('confirms below the lowest safe value', async () => {
    const wrapper = await mountPage()
    await typeLatency(wrapper, '2')
    await wrapper.find('[data-test="latency-save"]').trigger('click')
    expect(wrapper.find('[data-test="dialog"]').exists()).toBe(true)

    await wrapper.find('[data-test="dialog-cancel"]').trigger('click')
    await flushPromises()
    expect(m.setAasLatency).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="dialog"]').exists()).toBe(false)

    await wrapper.find('[data-test="latency-save"]').trigger('click')
    await wrapper.find('[data-test="dialog-confirm"]').trigger('click')
    await flushPromises()
    expect(m.setAasLatency).toHaveBeenCalledWith(2)
  })

  it('saves at or above the lowest safe value without asking', async () => {
    const wrapper = await mountPage()
    await typeLatency(wrapper, '3')
    await wrapper.find('[data-test="latency-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="dialog"]').exists()).toBe(false)
    expect(m.setAasLatency).toHaveBeenCalledWith(3)
  })

  it('waits for aas after saving', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const wrapper = await mountPage()
    m.getSettings.mockReset()
    m.getSettings
      .mockResolvedValueOnce({ error: 'Network Error', message: 'Failed to fetch' })
      .mockResolvedValue(settings(8))

    await typeLatency(wrapper, '8')
    await wrapper.find('[data-test="latency-save"]').trigger('click')
    await flushPromises()
    expect(m.setAasLatency).toHaveBeenCalledWith(8)
    expect(wrapper.find('[data-test="latency-restarting"]').text()).toContain('Restarting…')

    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.find('[data-test="latency-restarting"]').exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(wrapper.find('[data-test="latency-restarting"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="latency-running"]').text()).toContain('8 ms')
    expect(wrapper.find('[data-test="latency-running"]').text()).not.toContain('differs')
    expect(wrapper.find('[data-test="latency-saved"]').text()).toContain('8 ms')
    expect(wrapper.find('[data-test="latency-error"]').exists()).toBe(false)
  })

  it('keeps waiting while the old aas still answers', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const wrapper = await mountPage()
    m.getSettings.mockReset()
    m.getSettings.mockResolvedValueOnce(settings(5)).mockResolvedValue(settings(8.0))

    await typeLatency(wrapper, '8')
    await wrapper.find('[data-test="latency-save"]').trigger('click')
    await flushPromises()

    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.find('[data-test="latency-restarting"]').text()).toContain('Restarting…')

    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(wrapper.find('[data-test="latency-restarting"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="latency-running"]').text()).toContain('8 ms')
    expect(m.getSettings).toHaveBeenCalledTimes(2)
  })

  it('waits for the recommended value after saving the default', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    m.getAasLatency.mockResolvedValue({ latency_ms: 8 })
    m.getSettings.mockResolvedValue(settings(8))
    const wrapper = await mountPage()
    m.getSettings.mockReset()
    m.getSettings.mockResolvedValueOnce(settings(8)).mockResolvedValue(settings(5))

    // An empty field cannot be saved; Task 8's "Recommended" button saves null.
    m.setAasLatency.mockResolvedValue({ latency_ms: null, restarted: true })
    await typeLatency(wrapper, '9')
    await wrapper.find('[data-test="latency-save"]').trigger('click')
    await flushPromises()

    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.find('[data-test="latency-restarting"]').exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(wrapper.find('[data-test="latency-restarting"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="latency-saved"]').text()).toContain('Recommended (5 ms)')
  })

  it('names the last running value when aas answers with another one', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const wrapper = await mountPage()
    m.getSettings.mockReset()
    m.getSettings.mockResolvedValue(settings(5))

    await typeLatency(wrapper, '7')
    await wrapper.find('[data-test="latency-save"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(30_000)
    await flushPromises()

    expect(m.getSettings).toHaveBeenCalledTimes(30)
    const error = wrapper.find('[data-test="latency-error"]').text()
    expect(error).toContain('7 ms')
    expect(error).toContain('5 ms')
  })

  it('shows the saved latency as unknown when the config server does not answer', async () => {
    m.getAasLatency.mockResolvedValue({ error: 'HTTP 500', message: 'boom' })
    m.getSettings.mockResolvedValue(settings(8))
    const wrapper = await mountPage()
    const saved = wrapper.find('[data-test="latency-saved"]').text()
    expect(saved).toContain('unknown')
    expect(saved).not.toContain('Recommended')
    expect(wrapper.find('[data-test="latency-running"]').text()).not.toContain('differs')
  })

  it('saves the value that opened the confirmation', async () => {
    const wrapper = await mountPage()
    await typeLatency(wrapper, '2')
    await wrapper.find('[data-test="latency-save"]').trigger('click')
    await typeLatency(wrapper, '9')
    await wrapper.find('[data-test="dialog-confirm"]').trigger('click')
    await flushPromises()
    expect(m.setAasLatency).toHaveBeenCalledWith(2)
  })

  it('names the saved value when aas does not come back', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const wrapper = await mountPage()
    m.getSettings.mockReset()
    m.getSettings.mockResolvedValue({ error: 'Network Error', message: 'Failed to fetch' })

    await typeLatency(wrapper, '7')
    await wrapper.find('[data-test="latency-save"]').trigger('click')
    await flushPromises()

    await vi.advanceTimersByTimeAsync(29_000)
    expect(wrapper.find('[data-test="latency-restarting"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="latency-error"]').exists()).toBe(false)

    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(m.getSettings).toHaveBeenCalledTimes(30)
    expect(wrapper.find('[data-test="latency-restarting"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="latency-error"]').text()).toContain('7 ms')

    await vi.advanceTimersByTimeAsync(5000)
    expect(m.getSettings).toHaveBeenCalledTimes(30)
  })

  it('reports a refused save', async () => {
    const errorToast = vi.spyOn(useToastStore(), 'showErrorToast')
    m.setAasLatency.mockResolvedValue({ error: 'HTTP 400', message: 'latency_ms out of range' })
    const wrapper = await mountPage()
    await typeLatency(wrapper, '8')
    await wrapper.find('[data-test="latency-save"]').trigger('click')
    await flushPromises()
    expect(errorToast).toHaveBeenCalledWith(expect.stringContaining('latency_ms out of range'))
    expect(wrapper.find('[data-test="latency-restarting"]').exists()).toBe(false)
  })
})
