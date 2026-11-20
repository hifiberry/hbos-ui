import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const m = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('@/api/http', () => ({ apiFetch: m.apiFetch }))
vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getConfigApiBaseUrl: () => '/api/v1' }),
}))
vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({ showSuccessToast: m.success, showErrorToast: m.error }),
}))

import BluetoothSettings from '@/components/BluetoothSettings.vue'

const BUILTIN = { address: '00:11:22:33:44:55', name: 'speaker', bus: 'built-in', powered: true }
const STICK = { address: 'AA:BB:CC:DD:EE:FF', name: 'HiFiBerry-speaker', bus: 'usb', powered: false }

const settings = (adapters: object[]) => ({
  status: 'success',
  data: { capability: 'NoInputNoOutput', discoverable: false, adapters },
})

const reply = (body: object, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => body })

const mountWith = async (adapters: object[]) => {
  m.apiFetch.mockResolvedValueOnce(reply(settings(adapters)))
  const wrapper = mount(BluetoothSettings, {
    global: {
      stubs: { ToggleSwitch: true, BluetoothSettingsModal: true, ContentBox: { template: '<div><slot /></div>' } },
    },
  })
  await flushPromises()
  return wrapper
}

describe('BluetoothSettings adapter selector', () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset())
  })

  it('is hidden with one adapter', async () => {
    const wrapper = await mountWith([{ ...BUILTIN, selected: true }])
    expect(wrapper.find('.adapter-select').exists()).toBe(false)
  })

  it('lists the adapters with the one in use selected', async () => {
    const wrapper = await mountWith([{ ...BUILTIN, selected: true }, { ...STICK, selected: false }])
    const select = wrapper.find('.adapter-select')
    expect(select.exists()).toBe(true)
    const options = select.findAll('option').map((o) => o.text())
    expect(options).toEqual([
      'Built-in: speaker (00:11:22:33:44:55)',
      'USB: HiFiBerry-speaker (AA:BB:CC:DD:EE:FF)',
    ])
    expect((select.element as HTMLSelectElement).value).toBe(BUILTIN.address)
  })

  it('stores a new choice and tells the page to reload the devices', async () => {
    const wrapper = await mountWith([{ ...BUILTIN, selected: true }, { ...STICK, selected: false }])
    m.apiFetch.mockResolvedValueOnce(
      reply(settings([{ ...BUILTIN, selected: false }, { ...STICK, selected: true }])),
    )
    await wrapper.find('.adapter-select').setValue(STICK.address)
    await flushPromises()
    const [url, init] = m.apiFetch.mock.calls[1]
    expect(url).toBe(`/api/v1/bluetooth/settings?adapter=${STICK.address}`)
    expect(init).toEqual({ method: 'POST' })
    expect(wrapper.emitted('adapter-changed')).toEqual([[STICK.address]])
    expect(m.success).toHaveBeenCalled()
  })

  it('goes back to the adapter in use when the change fails', async () => {
    const wrapper = await mountWith([{ ...BUILTIN, selected: true }, { ...STICK, selected: false }])
    m.apiFetch.mockResolvedValueOnce(reply({ status: 'error' }, false))
    const select = wrapper.find('.adapter-select')
    await select.setValue(STICK.address)
    await flushPromises()
    expect((select.element as HTMLSelectElement).value).toBe(BUILTIN.address)
    expect(wrapper.emitted('adapter-changed')).toBeUndefined()
    expect(m.error).toHaveBeenCalled()
  })
})
