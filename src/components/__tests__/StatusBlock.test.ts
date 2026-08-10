import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import StatusBlock from '@/components/StatusBlock.vue'

const iconName = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findComponent({ name: 'Icon' }).props('icon') as string

describe('StatusBlock', () => {
  it('renders the message from the default slot', () => {
    const wrapper = mount(StatusBlock, { slots: { default: 'Could not reach the service' } })
    expect(wrapper.text()).toContain('Could not reach the service')
  })

  it('is an error block unless told otherwise', () => {
    const wrapper = mount(StatusBlock)
    expect(wrapper.classes()).toContain('status-block--error')
  })

  it.each(['error', 'warning', 'success'] as const)('carries the %s variant on the class', (variant) => {
    const wrapper = mount(StatusBlock, { props: { variant } })
    expect(wrapper.classes()).toContain(`status-block--${variant}`)
  })

  // An icon that 404s is worse than no icon, so every name the component can
  // emit has to exist as a file under public/images/svg - that is the only
  // place Icon.vue looks.
  it.each(['error', 'warning', 'success'] as const)('names an icon file that exists for %s', (variant) => {
    const wrapper = mount(StatusBlock, { props: { variant } })
    const file = resolve(__dirname, '../../../public/images/svg', `${iconName(wrapper)}.svg`)
    expect(existsSync(file), `${file} is missing`).toBe(true)
  })

  it('announces a failure but not a success', () => {
    expect(mount(StatusBlock, { props: { variant: 'error' } }).attributes('role')).toBe('alert')
    expect(mount(StatusBlock, { props: { variant: 'success' } }).attributes('role')).toBe('status')
  })
})
