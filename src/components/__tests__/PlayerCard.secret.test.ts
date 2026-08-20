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

  it('never renders a value carried on the setting object, even if one is present', () => {
    // Unlike the other fixtures, this one carries a `value` field on the
    // secret setting -- something the real API never sends, but nothing in
    // the type system rules out. Every other test's fixtures omit `value`
    // entirely, so `:value="setting.value"` (or `:value="setting.pendingSecret"`)
    // would pass all of them. This is the one test that would actually fail
    // if such a binding were reintroduced.
    const player = {
      ...playerWithSecret(true),
      settings: [
        { key: 'api_key', type: 'secret' as const, label: 'Soloist API key',
          default: '', is_set: true, value: 'LEAKED-should-never-render' },
      ],
    }
    const wrapper = mount(PlayerCard, {
      props: { player, isExpanded: true },
      global: { stubs: { Icon: true, ToggleSwitch: true } },
    })
    const input = wrapper.find('input[type="password"]')
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(wrapper.html()).not.toContain('LEAKED-should-never-render')
  })

  it('does not resurface a typed secret on remount, given the input is unbound', async () => {
    // Mount, type, and unmount, then remount against the *same* player
    // object. This demonstrates that PlayerCard itself holds no local state
    // (ref, computed, etc.) that survives a remount -- an input bound via
    // `v-model` or a local ref would resurface the typed text here.
    // It does NOT by itself prove nothing was mutated onto `setting.value`:
    // that would only resurface in the rendered input if a `:value` binding
    // also existed, and the previous test is what rules that out.
    const player = playerWithSecret(true)
    const first = mount(PlayerCard, {
      props: { player, isExpanded: true },
      global: { stubs: { Icon: true, ToggleSwitch: true } },
    })
    await first.find('input[type="password"]').setValue('SECRET-abc123')
    first.unmount()

    const second = mount(PlayerCard, {
      props: { player, isExpanded: true },
      global: { stubs: { Icon: true, ToggleSwitch: true } },
    })
    const input = second.find('input[type="password"]')
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(second.html()).not.toContain('SECRET-abc123')
  })
})

describe('PlayerCard setting help link', () => {
  const mountWithSetting = (setting: Record<string, unknown>) =>
    mount(PlayerCard, {
      props: {
        player: {
          name: 'Spotify (Soloist)',
          providedBy: 'soloist-wrapper',
          systemdService: 'soloist',
          isExternal: true,
          exists: true,
          config: 'none',
          status: 'inactive',
          settings: [setting],
        },
        isExpanded: true,
      },
      global: {
        stubs: {
          Icon: true,
          InlineSvg: true,
          ToggleSwitch: true,
          PlayerSetupPanel: true,
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

  it('links to the vendor docs when the setting declares one', () => {
    const w = mountWithSetting({
      key: 'api_key', type: 'secret', label: 'Soloist API key', default: '',
      is_set: false, help_url: 'https://developer.spotify.com/documentation/soloist',
    })
    const link = w.find('[data-test="help-api_key"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://developer.spotify.com/documentation/soloist')
    // Opening a vendor page must not hand it a window handle back.
    expect(link.attributes('rel')).toContain('noopener')
    expect(link.attributes('target')).toBe('_blank')
  })

  it('shows no link when the setting declares none', () => {
    const w = mountWithSetting({
      key: 'api_key', type: 'secret', label: 'Soloist API key', default: '', is_set: false,
    })
    expect(w.find('[data-test="help-api_key"]').exists()).toBe(false)
  })
})
