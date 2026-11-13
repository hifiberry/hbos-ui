import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerCard from '@/components/PlayerCard.vue'

const externalPlayer = {
  name: 'Analog Input',
  providedBy: 'analog-recognition',
  systemdService: 'analog-recognition',
  config: 'none',
  status: 'inactive',
  icon: 'analog',
  enabled: false,
  exists: true,
  isExternal: true,
  settings: [
    { key: 'songrec_enabled', type: 'toggle', label: 'Recognize tracks',
      default: true, value: true },
  ],
}

describe('PlayerCard generic settings', () => {
  it('renders a config caret for an external player that has settings', () => {
    const wrapper = mount(PlayerCard, {
      props: { player: externalPlayer, isExpanded: false },
      global: { stubs: { Icon: true, InlineSvg: true, ToggleSwitch: true, RouterLink: true } },
    })
    expect(wrapper.find('.expand-caret').exists()).toBe(true)
  })

  it('emits update-external-setting when a toggle setting changes', async () => {
    const wrapper = mount(PlayerCard, {
      props: { player: externalPlayer, isExpanded: true },
      global: { stubs: { Icon: true, InlineSvg: true, RouterLink: true } },
    })
    // Scope to the settings control: PlayerCard also renders a top-level
    // enable/disable ToggleSwitch, so an unscoped findComponent would match
    // that one instead of the per-setting toggle. The control lives in
    // .config-control; .config-option is now just the label beside it.
    const toggle = wrapper.find('.config-control').findComponent({ name: 'ToggleSwitch' })
    toggle.vm.$emit('update:modelValue', false)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update-external-setting')?.[0]).toEqual(['songrec_enabled', false])
  })

  describe('text setting', () => {
    const textPlayer = {
      ...externalPlayer,
      settings: [
        { key: 'server_url', type: 'text', label: 'Server URL',
          default: '', value: 'http://jf.local:8096', max_length: 64 },
      ],
    }
    const mountText = () => mount(PlayerCard, {
      props: { player: textPlayer, isExpanded: true },
      global: { stubs: { Icon: true, InlineSvg: true, RouterLink: true } },
    })

    it('renders a text setting with its value', () => {
      const input = mountText().find('.config-control input.text-input')
      expect(input.exists()).toBe(true)
      expect(input.attributes('type')).toBe('text')
      expect((input.element as HTMLInputElement).value).toBe('http://jf.local:8096')
      expect(input.attributes('maxlength')).toBe('64')
    })

    it('emits text on change, not on input', async () => {
      const wrapper = mountText()
      const input = wrapper.find('.config-control input.text-input')
      // setValue() fires change as well as input; set the value and fire only input.
      ;(input.element as HTMLInputElement).value = 'http://other:8096'
      await input.trigger('input')
      expect(wrapper.emitted('update-external-setting')).toBeUndefined()
      await input.trigger('change')
      expect(wrapper.emitted('update-external-setting')?.[0]).toEqual(['server_url', 'http://other:8096'])
    })
  })
})
