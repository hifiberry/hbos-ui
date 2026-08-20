import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ExtensionCard from '@/components/ExtensionCard.vue'
import type { Extension } from '@/api/extensions'

const ext = (over: Partial<Extension> = {}): Extension => ({
  package: 'hifiberry-x',
  name: 'X',
  category: 'player',
  summary: 's',
  description: 'd',
  version: '2.0',
  installed_version: null,
  state: 'available',
  needs_reboot: 'no',
  icon_url: null,
  source: 'apt',
  ...over,
})

const mountCard = (extension: Extension) =>
  mount(ExtensionCard, {
    props: { extension },
    global: { stubs: { Icon: true } },
  })

describe('ExtensionCard upgrade hint', () => {
  it('says an upgrade is available when one is', () => {
    const w = mountCard(ext({ state: 'upgradable', installed_version: '1.0' }))
    expect(w.find('[data-test="upgrade-hint"]').text()).toBe('Upgrade available')
  })

  it('keeps the old -> new detail alongside it', () => {
    const w = mountCard(ext({ state: 'upgradable', installed_version: '1.0' }))
    expect(w.find('[data-test="version"]').text()).toContain('1.0')
    expect(w.find('[data-test="version"]').text()).toContain('2.0')
  })

  it('shows nothing for an installed extension that is current', () => {
    const w = mountCard(ext({ state: 'installed', installed_version: '2.0' }))
    expect(w.find('[data-test="upgrade-hint"]').exists()).toBe(false)
  })

  it('shows nothing for one that is not installed', () => {
    const w = mountCard(ext({ state: 'available' }))
    expect(w.find('[data-test="upgrade-hint"]').exists()).toBe(false)
  })
})
