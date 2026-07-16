import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerCard from '@/components/PlayerCard.vue'

// NOTE: mount options mirror PlayerCard.settings.test.ts (props, stubs) —
// this factory only sets the fields these assertions care about, plus
// isExpanded which the component requires.
const mountCard = (player: Record<string, unknown>) =>
  mount(PlayerCard, {
    props: { player, isExpanded: false },
    global: {
      stubs: {
        Icon: true,
        InlineSvg: true,
        ToggleSwitch: true,
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })

describe('PlayerCard install affordance', () => {
  it('offers an install link when the service is not installed', () => {
    const wrapper = mountCard({
      name: 'Tidal',
      systemd_service: 'tidal-connect',
      exists: false,
      extension_package: 'hifiberry-tidal-connect',
    })
    expect(wrapper.find('[data-test="install-link"]').exists()).toBe(true)
  })

  it('does not offer an install link when the service exists', () => {
    const wrapper = mountCard({
      name: 'MPD',
      systemd_service: 'mpd',
      exists: true,
    })
    expect(wrapper.find('[data-test="install-link"]').exists()).toBe(false)
  })

  it('does not offer an install link when no extension package is known', () => {
    const wrapper = mountCard({
      name: 'Mystery',
      systemd_service: 'mystery',
      exists: false,
    })
    expect(wrapper.find('[data-test="install-link"]').exists()).toBe(false)
  })
})
