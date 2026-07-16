import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ExtensionCard from '@/components/ExtensionCard.vue'
import type { Extension } from '@/api/extensions'

const extension = (overrides: Partial<Extension> = {}): Extension => ({
  package: 'hifiberry-tidal-connect',
  name: 'Tidal Connect',
  category: 'player',
  summary: 'Tidal Connect endpoint',
  description: 'Stream from the Tidal app.',
  version: '1.0.2',
  installed_version: null,
  state: 'available',
  needs_reboot: 'no',
  icon_url: null,
  ...overrides,
})

describe('ExtensionCard', () => {
  it('shows the display name, not the package name', () => {
    const wrapper = mount(ExtensionCard, { props: { extension: extension() } })
    expect(wrapper.text()).toContain('Tidal Connect')
  })

  it('shows the summary', () => {
    const wrapper = mount(ExtensionCard, { props: { extension: extension() } })
    expect(wrapper.text()).toContain('Tidal Connect endpoint')
  })

  it('offers Install when available', () => {
    const wrapper = mount(ExtensionCard, { props: { extension: extension() } })
    expect(wrapper.get('[data-test="action"]').text()).toBe('Install')
  })

  it('emits install with the package name', async () => {
    const wrapper = mount(ExtensionCard, { props: { extension: extension() } })
    await wrapper.get('[data-test="action"]').trigger('click')
    expect(wrapper.emitted('install')).toEqual([['hifiberry-tidal-connect']])
  })

  it('offers Remove when installed', () => {
    const wrapper = mount(ExtensionCard, {
      props: { extension: extension({ state: 'installed', installed_version: '1.0.2' }) },
    })
    expect(wrapper.get('[data-test="action"]').text()).toBe('Remove')
  })

  it('emits uninstall when installed', async () => {
    const wrapper = mount(ExtensionCard, {
      props: { extension: extension({ state: 'installed', installed_version: '1.0.2' }) },
    })
    await wrapper.get('[data-test="action"]').trigger('click')
    expect(wrapper.emitted('uninstall')).toEqual([['hifiberry-tidal-connect']])
  })

  it('offers Update when upgradable', () => {
    const wrapper = mount(ExtensionCard, {
      props: { extension: extension({ state: 'upgradable', installed_version: '1.0.1' }) },
    })
    expect(wrapper.get('[data-test="action"]').text()).toBe('Update')
  })

  it('emits install when updating', async () => {
    const wrapper = mount(ExtensionCard, {
      props: { extension: extension({ state: 'upgradable', installed_version: '1.0.1' }) },
    })
    await wrapper.get('[data-test="action"]').trigger('click')
    expect(wrapper.emitted('install')).toEqual([['hifiberry-tidal-connect']])
  })

  it('shows the installed version when installed', () => {
    const wrapper = mount(ExtensionCard, {
      props: { extension: extension({ state: 'installed', installed_version: '1.0.2' }) },
    })
    expect(wrapper.get('[data-test="version"]').text()).toContain('1.0.2')
  })

  it('warns when a reboot may be needed', () => {
    const wrapper = mount(ExtensionCard, {
      props: { extension: extension({ needs_reboot: 'maybe' }) },
    })
    expect(wrapper.find('[data-test="reboot-hint"]').exists()).toBe(true)
  })

  it('does not warn when no reboot is needed', () => {
    const wrapper = mount(ExtensionCard, { props: { extension: extension() } })
    expect(wrapper.find('[data-test="reboot-hint"]').exists()).toBe(false)
  })

  it('disables the action while busy', () => {
    const wrapper = mount(ExtensionCard, {
      props: { extension: extension(), busy: true },
    })
    expect(wrapper.get('[data-test="action"]').attributes('disabled')).toBeDefined()
  })

  it('does not emit while busy', async () => {
    const wrapper = mount(ExtensionCard, {
      props: { extension: extension(), busy: true },
    })
    await wrapper.get('[data-test="action"]').trigger('click')
    expect(wrapper.emitted('install')).toBeUndefined()
  })

  it('falls back to a category icon when no icon_url is given', () => {
    const wrapper = mount(ExtensionCard, { props: { extension: extension() } })
    expect(wrapper.get('[data-test="icon"]').attributes('data-category')).toBe('player')
  })
})
