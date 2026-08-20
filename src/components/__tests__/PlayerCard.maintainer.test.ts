import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerCard from '@/components/PlayerCard.vue'

// Mirrors PlayerCard.install.test.ts's harness.
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

describe('PlayerCard maintainer label', () => {
  it('renders the "Wanted" sentinel as a call for a maintainer', () => {
    const wrapper = mountCard({
      name: 'Spotify',
      systemd_service: 'librespot',
      exists: true,
      maintainerName: 'Wanted',
      maintainerUrl: 'https://example.invalid/maintainers-wanted.md',
    })
    const text = wrapper.text()
    expect(text).toContain('Looking for maintainer')
    // The bare sentinel reads as a status of the player, not a request.
    expect(text).not.toMatch(/\bWanted\b(?!.*Looking)/)
  })

  it('keeps the link when translating the sentinel', () => {
    const wrapper = mountCard({
      name: 'Spotify',
      systemd_service: 'librespot',
      exists: true,
      maintainerName: 'Wanted',
      maintainerUrl: 'https://example.invalid/maintainers-wanted.md',
    })
    const link = wrapper.find('.maintainer-link')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('Looking for maintainer')
  })

  it('leaves a real maintainer name alone', () => {
    const wrapper = mountCard({
      name: 'AES67',
      systemd_service: 'aes67',
      exists: true,
      maintainerName: 'HiFiBerry',
    })
    expect(wrapper.text()).toContain('HiFiBerry')
    expect(wrapper.text()).not.toContain('Looking for maintainer')
  })

  it('shows nothing when no maintainer is declared', () => {
    const wrapper = mountCard({
      name: 'Music Assistant',
      systemd_service: 'sendspin',
      exists: true,
    })
    expect(wrapper.find('.player-maintainer').exists()).toBe(false)
  })
})
