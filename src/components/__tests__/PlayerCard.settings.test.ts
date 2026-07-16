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
    // Scope to the settings row: PlayerCard also renders a top-level
    // enable/disable ToggleSwitch, so an unscoped findComponent would match
    // that one instead of the per-setting toggle.
    const toggle = wrapper.find('.config-option').findComponent({ name: 'ToggleSwitch' })
    toggle.vm.$emit('update:modelValue', false)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update-external-setting')?.[0]).toEqual(['songrec_enabled', false])
  })
})
