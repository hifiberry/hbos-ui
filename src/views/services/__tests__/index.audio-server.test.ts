import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsView from '@/views/services/index.vue'

// The Settings page is a grid of ContentBoxLink tiles. The link is stubbed so
// the test can read the `to` prop each tile was given.
const mountSettings = () =>
  mount(SettingsView, {
    global: {
      stubs: {
        PageContent: { template: '<div><slot /></div>' },
        Icon: true,
        ContentBoxLink: {
          props: ['to', 'height'],
          template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
        },
      },
    },
  })

describe('Settings: Audio Server tile', () => {
  it('links to the audio-server view with an "Audio Server" heading', () => {
    const wrapper = mountSettings()
    const tile = wrapper
      .findAll('a')
      .find(a => a.attributes('data-to') === JSON.stringify({ name: 'audio-server' }))

    expect(tile, 'no tile links to { name: "audio-server" }').toBeDefined()
    expect(tile!.text()).toContain('Audio Server')
  })

  it('keeps the System Tools tile', () => {
    const wrapper = mountSettings()
    const tile = wrapper
      .findAll('a')
      .find(a => a.attributes('data-to') === JSON.stringify({ name: 'system-tools' }))

    expect(tile).toBeDefined()
    expect(tile!.text()).toContain('System Tools')
  })
})
