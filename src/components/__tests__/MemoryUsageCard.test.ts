import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MemoryUsageCard from '@/components/MemoryUsageCard.vue'
import type { MemoryFeature, MemoryReport } from '@/api/memory'

const feature = (overrides: Partial<MemoryFeature> = {}): MemoryFeature => ({
  id: 'mpd',
  name: 'Music Player Daemon',
  category: 'player',
  icon: 'music',
  package: 'hifiberry-mpd',
  units: ['mpd.service'],
  state: 'running',
  processes: 1,
  disposition: 'disable',
  partial: false,
  memory: {
    rss_kb: 123702, pss_kb: 118400, private_kb: 114900, shared_kb: 8802,
    swap_kb: 0, swap_pss_kb: 0,
    reclaimable: { min_kb: 114900, estimate_kb: 118400 },
  },
  ...overrides,
})

const report = (features: MemoryFeature[]): MemoryReport => ({
  system: {
    total_kb: 2027104, free_kb: 400000, available_kb: 812340, used_kb: 1214764,
    cached_kb: 210400, buffers_kb: 18200, swap_total_kb: 102396, swap_used_kb: 4096,
    process_pss_kb: 900000, unaccounted_kb: 12000,
  },
  features,
})

const mountCard = (features: MemoryFeature[]) =>
  mount(MemoryUsageCard, {
    props: { report: report(features), loading: false, error: null },
    global: { stubs: { Icon: true, RouterLink: { template: '<a><slot /></a>' } } },
  })

describe('MemoryUsageCard', () => {
  it('shows the feature name, not the unit name', () => {
    expect(mountCard([feature()]).text()).toContain('Music Player Daemon')
  })

  it('puts actionable features in the reducible group', () => {
    const wrapper = mountCard([feature()])
    expect(wrapper.get('[data-test="reducible"]').text()).toContain('Music Player Daemon')
  })

  it('puts required features in the required group', () => {
    const wrapper = mountCard([
      feature({ id: 'audiocontrol', name: 'Audio control', disposition: 'required' }),
    ])
    expect(wrapper.get('[data-test="required"]').text()).toContain('Audio control')
    expect(wrapper.find('[data-test="reducible"]').exists()).toBe(false)
  })

  it('suppresses reclaimable for required features', () => {
    const wrapper = mountCard([
      feature({ id: 'pipewire', name: 'Audio engine', disposition: 'required' }),
    ])
    expect(wrapper.find('[data-test="reclaimable-pipewire"]').exists()).toBe(false)
  })

  it('shows reclaimable for actionable features', () => {
    const wrapper = mountCard([feature()])
    expect(wrapper.get('[data-test="reclaimable-mpd"]').exists()).toBe(true)
  })

  it('offers no action link for required features', () => {
    const wrapper = mountCard([feature({ id: 'pw', disposition: 'required' })])
    expect(wrapper.find('[data-test="action-pw"]').exists()).toBe(false)
  })

  it('links an uninstallable feature to the extensions page', () => {
    const wrapper = mountCard([feature({ id: 'librespot', disposition: 'uninstall' })])
    expect(wrapper.get('[data-test="action-librespot"]').text()).toContain('Extensions')
  })

  it('links the local display to the display settings page', () => {
    const wrapper = mountCard([feature({ id: 'display', disposition: 'reconfigure' })])
    expect(wrapper.get('[data-test="action-display"]').text()).toContain('Display settings')
  })

  it('sorts the reducible group by reclaimable estimate, descending', () => {
    const small = feature({ id: 'small', name: 'Small' })
    small.memory.reclaimable.estimate_kb = 1000
    const big = feature({ id: 'big', name: 'Big' })
    big.memory.reclaimable.estimate_kb = 900000
    const text = mountCard([small, big]).get('[data-test="reducible"]').text()
    expect(text.indexOf('Big')).toBeLessThan(text.indexOf('Small'))
  })

  it('renders an error instead of the tables', () => {
    const wrapper = mount(MemoryUsageCard, {
      props: { report: null, loading: false, error: 'Endpoint unavailable' },
      global: { stubs: { Icon: true, RouterLink: true } },
    })
    expect(wrapper.text()).toContain('Endpoint unavailable')
    expect(wrapper.find('[data-test="reducible"]').exists()).toBe(false)
  })

  it('formats sizes in MB', () => {
    expect(mountCard([feature()]).text()).toContain('121 MB')
  })
})
