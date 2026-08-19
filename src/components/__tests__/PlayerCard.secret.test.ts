import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerCard from '@/components/PlayerCard.vue'

const playerWithSecret = (isSet: boolean) => ({
  name: 'Spotify (Soloist)',
  systemdService: 'soloist',
  isExternal: true,
  enabled: false,
  settings: [
    { key: 'api_key', type: 'secret' as const, label: 'Soloist API key',
      default: '', is_set: isSet },
  ],
})

describe('PlayerCard secret settings', () => {
  it('renders a masked input for a secret setting', () => {
    const wrapper = mount(PlayerCard, {
      props: { player: playerWithSecret(false), isExpanded: true },
      global: { stubs: { Icon: true, ToggleSwitch: true } },
    })
    const input = wrapper.find('input[type="password"]')
    expect(input.exists()).toBe(true)
    // Write-only: nothing is ever pre-filled, because the API never returns it.
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('shows "not set" when the credential is absent', () => {
    const wrapper = mount(PlayerCard, {
      props: { player: playerWithSecret(false), isExpanded: true },
      global: { stubs: { Icon: true, ToggleSwitch: true } },
    })
    expect(wrapper.text()).toContain('Not set')
    expect(wrapper.find('[data-test="clear-secret-api_key"]').exists()).toBe(false)
  })

  it('shows "set" and offers a clear action when the credential exists', () => {
    const wrapper = mount(PlayerCard, {
      props: { player: playerWithSecret(true), isExpanded: true },
      global: { stubs: { Icon: true, ToggleSwitch: true } },
    })
    expect(wrapper.text()).toContain('Set')
    expect(wrapper.find('[data-test="clear-secret-api_key"]').exists()).toBe(true)
  })

  it('emits the typed value on input', async () => {
    const wrapper = mount(PlayerCard, {
      props: { player: playerWithSecret(false), isExpanded: true },
      global: { stubs: { Icon: true, ToggleSwitch: true } },
    })
    const input = wrapper.find('input[type="password"]')
    await input.setValue('abc123')
    const emitted = wrapper.emitted('update-external-setting')
    expect(emitted).toBeTruthy()
    expect(emitted![emitted!.length - 1]).toEqual(['api_key', 'abc123'])
  })

  it('emits an empty string when cleared', async () => {
    const wrapper = mount(PlayerCard, {
      props: { player: playerWithSecret(true), isExpanded: true },
      global: { stubs: { Icon: true, ToggleSwitch: true } },
    })
    await wrapper.find('[data-test="clear-secret-api_key"]').trigger('click')
    const emitted = wrapper.emitted('update-external-setting')
    expect(emitted![emitted!.length - 1]).toEqual(['api_key', ''])
  })

  it('never puts a secret value in the rendered markup', async () => {
    const wrapper = mount(PlayerCard, {
      props: { player: playerWithSecret(true), isExpanded: true },
      global: { stubs: { Icon: true, ToggleSwitch: true } },
    })
    await wrapper.find('input[type="password"]').setValue('SECRET-abc123')
    expect(wrapper.html()).not.toContain('SECRET-abc123')
  })
})
