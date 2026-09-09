import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
    reclaimable: { min_kb: 114900, estimate_kb: 118400, swap_pss_kb: 0 },
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

// Fillers exist only to push the total feature count above five, so the
// disclosure (and the three groups behind it) actually renders. They use
// memory so they are not dropped by the zero-usage filter, and default to
// `required` so they land in neither `reducible` nor `unknown` unless a test
// says otherwise.
const filler = (n: number, overrides: Partial<MemoryFeature> = {}): MemoryFeature[] =>
  Array.from({ length: n }, (_, i) =>
    feature({
      id: `filler-${i}`,
      name: `Filler ${i}`,
      disposition: 'required',
      memory: {
        rss_kb: 500, pss_kb: 500, private_kb: 500, shared_kb: 0, swap_kb: 0, swap_pss_kb: 0,
        reclaimable: { min_kb: 0, estimate_kb: 0, swap_pss_kb: 0 },
      },
      ...overrides,
    }))

const expand = (wrapper: ReturnType<typeof mountCard>) =>
  wrapper.get('[data-test="show-all"]').trigger('click')

describe('MemoryUsageCard', () => {
  it('shows the feature name, not the unit name', () => {
    expect(mountCard([feature()]).text()).toContain('Music Player Daemon')
  })

  // The grouped sections only render once expanded, and only when there are
  // more than five features total -- so these fixtures pad the list with
  // filler features to get there.
  it('puts actionable features in the reducible group', async () => {
    const wrapper = mountCard([feature(), ...filler(5)])
    await expand(wrapper)
    expect(wrapper.get('[data-test="reducible"]').text()).toContain('Music Player Daemon')
  })

  it('puts required features in the required group', async () => {
    const wrapper = mountCard([
      feature({ id: 'audiocontrol', name: 'Audio control', disposition: 'required' }),
      ...filler(5),
    ])
    await expand(wrapper)
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

  it('sorts the reducible group by reclaimable estimate, descending', async () => {
    const small = feature({ id: 'small', name: 'Small' })
    small.memory.reclaimable.estimate_kb = 1000
    const big = feature({ id: 'big', name: 'Big' })
    big.memory.reclaimable.estimate_kb = 900000
    const wrapper = mountCard([small, big, ...filler(4)])
    await expand(wrapper)
    const text = wrapper.get('[data-test="reducible"]').text()
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

  // --- A feature using nothing is not a row worth showing. Kernel threads
  // have no mm, so smaps_rollup is empty, the statm fallback yields RSS 0 and
  // PSS None, and all ~120 of them land in the kernel bucket -- which then
  // renders as "Kernel, 118 processes, 0 MB RES / 0 MB actual" on every
  // device. It reads as a bug and it is conceptually empty: the PSS of a
  // kernel thread is zero by definition, and real kernel memory is already
  // carried in unaccounted_kb.
  const zeroUsage = (overrides: Partial<MemoryFeature> = {}) =>
    feature({
      memory: {
        rss_kb: 0, pss_kb: 0, private_kb: 0, shared_kb: 0, swap_kb: 0, swap_pss_kb: 0,
        reclaimable: { min_kb: 0, estimate_kb: 0, swap_pss_kb: 0 },
      },
      ...overrides,
    })

  it('does not render a feature that uses no memory', () => {
    const wrapper = mountCard([
      zeroUsage({ id: 'kernel', name: 'Kernel', disposition: 'none', processes: 118 }),
      feature({ id: 'audiocontrol', name: 'Audio control', disposition: 'required' }),
    ])
    expect(wrapper.text()).not.toContain('Kernel')
    expect(wrapper.text()).toContain('Audio control')
  })

  it('does not render a zero-usage feature in the reducible group either', async () => {
    const wrapper = mountCard([
      zeroUsage({ id: 'idle', name: 'Idle thing', disposition: 'disable' }),
      feature(),
      ...filler(5),
    ])
    await expand(wrapper)
    expect(wrapper.get('[data-test="reducible"]').text()).not.toContain('Idle thing')
  })

  // --- The backend computes both ends of the reclaimable range because no
  // exact answer exists: estimate_kb counts, at their per-process share, pages
  // the feature shares with everything outside it -- glibc, and the Python
  // interpreter shared between config-server, sigmatcpserver and roomeq-server
  // -- none of which stopping the feature returns. Showing only estimate_kb
  // systematically overstates what is freed.
  it('shows both ends of the reclaimable range', () => {
    const f = feature()
    f.memory.reclaimable = { min_kb: 114900, estimate_kb: 118400 }
    expect(mountCard([f]).get('[data-test="reclaimable-mpd"]').text()).toContain('112\u2013116 MB')
  })

  it('shows a single figure when both bounds round to the same MB', () => {
    const f = feature()
    f.memory.reclaimable = { min_kb: 114900, estimate_kb: 114950, swap_pss_kb: 0 }
    const text = mountCard([f]).get('[data-test="reclaimable-mpd"]').text()
    expect(text).toContain('112 MB')
    expect(text).not.toContain('\u2013')
  })

  // --- reclaimable is RAM only now; a feature that also holds swapped-out
  // pages needs that called out separately, or an owner relieving memory
  // pressure is pointed at the wrong service (Bluetooth: 1.6 MB of RAM but
  // 26.8 MB of swap, previously shown as "frees 28 MB" and ranked mid-table).
  it('shows the swap figure for a feature that holds swap', () => {
    const f = feature({ id: 'bluetooth', name: 'Bluetooth' })
    f.memory.reclaimable = { min_kb: 1600, estimate_kb: 1600, swap_pss_kb: 26800 }
    const text = mountCard([f]).get('[data-test="swap-bluetooth"]').text()
    expect(text).toContain('26 MB')
  })

  it('renders no swap element for a feature with no swap', () => {
    const wrapper = mountCard([feature()])
    expect(wrapper.find('[data-test="swap-mpd"]').exists()).toBe(false)
  })

  it('does not round a small but real swap figure down to nothing', () => {
    const f = feature({ id: 'roon', name: 'Roon' })
    f.memory.reclaimable = { min_kb: 1100, estimate_kb: 1100, swap_pss_kb: 400 }
    const text = mountCard([f]).get('[data-test="swap-roon"]').text()
    expect(text).toContain('<1 MB')
  })

  // --- unaccounted_kb is emitted so the columns visibly add up to the
  // machine's RAM. Dropping it leaves the owner looking at Total 1980 MB above
  // rows summing to far less, with nothing explaining the gap.
  it('shows how much memory is in use', () => {
    expect(mountCard([feature()]).get('[data-test="summary-used"]').text()).toContain('1186 MB')
  })

  it('accounts for the memory no feature owns', () => {
    expect(mountCard([feature()]).get('[data-test="summary-unaccounted"]').text()).toContain('12 MB')
  })

  it('does not round a small but real figure down to nothing', () => {
    const f = feature({ id: 'tiny', name: 'Tiny' })
    f.memory.rss_kb = 400
    expect(mountCard([f]).text()).toContain('<1 MB')
    expect(mountCard([f]).text()).not.toContain('0 MB RES')
  })

  // --- Several disable rows share the link text "Settings", which a screen
  // reader announces as "Settings, Settings, Settings" with nothing to tell
  // them apart.
  it('names the feature in the action link for assistive technology', () => {
    const wrapper = mountCard([feature()])
    expect(wrapper.get('[data-test="action-mpd"]').attributes('aria-label'))
      .toContain('Music Player Daemon')
  })
})

describe('MemoryUsageCard top five and disclosure', () => {
  // Eight features with distinct pss_kb, spanning all three dispositions plus
  // one outside the known set, so ranking and grouping can both be exercised
  // on the same fixture. Sorted here from largest to smallest for readability;
  // mountCard receives them in a different order so rendering order can't
  // accidentally match input order.
  const eight = () => [
    feature({ id: 'huge-none', name: 'Huge Unknown', disposition: 'none',
      memory: { rss_kb: 900000, pss_kb: 900000, private_kb: 900000, shared_kb: 0, swap_kb: 0, swap_pss_kb: 0,
        reclaimable: { min_kb: 0, estimate_kb: 0, swap_pss_kb: 0 } } }),
    feature({ id: 'big-required', name: 'Big Required', disposition: 'required',
      memory: { rss_kb: 800000, pss_kb: 800000, private_kb: 800000, shared_kb: 0, swap_kb: 0, swap_pss_kb: 0,
        reclaimable: { min_kb: 0, estimate_kb: 0, swap_pss_kb: 0 } } }),
    feature({ id: 'mid-disable', name: 'Mid Disable', disposition: 'disable',
      memory: { rss_kb: 700000, pss_kb: 700000, private_kb: 690000, shared_kb: 10000, swap_kb: 0, swap_pss_kb: 0,
        reclaimable: { min_kb: 690000, estimate_kb: 700000, swap_pss_kb: 0 } } }),
    feature({ id: 'weird-disposition', name: 'Weird Feature', disposition: 'mystery' as MemoryFeature['disposition'],
      memory: { rss_kb: 600000, pss_kb: 600000, private_kb: 600000, shared_kb: 0, swap_kb: 0, swap_pss_kb: 0,
        reclaimable: { min_kb: 0, estimate_kb: 0, swap_pss_kb: 0 } } }),
    feature({ id: 'fifth', name: 'Fifth Largest', disposition: 'uninstall',
      memory: { rss_kb: 500000, pss_kb: 500000, private_kb: 500000, shared_kb: 0, swap_kb: 0, swap_pss_kb: 0,
        reclaimable: { min_kb: 500000, estimate_kb: 500000, swap_pss_kb: 0 } } }),
    feature({ id: 'sixth', name: 'Sixth Largest', disposition: 'disable',
      memory: { rss_kb: 400000, pss_kb: 400000, private_kb: 400000, shared_kb: 0, swap_kb: 0, swap_pss_kb: 0,
        reclaimable: { min_kb: 400000, estimate_kb: 400000, swap_pss_kb: 0 } } }),
    feature({ id: 'seventh', name: 'Seventh Largest', disposition: 'required',
      memory: { rss_kb: 300000, pss_kb: 300000, private_kb: 300000, shared_kb: 0, swap_kb: 0, swap_pss_kb: 0,
        reclaimable: { min_kb: 0, estimate_kb: 0, swap_pss_kb: 0 } } }),
    feature({ id: 'eighth', name: 'Eighth Largest', disposition: 'none',
      memory: { rss_kb: 200000, pss_kb: 200000, private_kb: 200000, shared_kb: 0, swap_kb: 0, swap_pss_kb: 0,
        reclaimable: { min_kb: 0, estimate_kb: 0, swap_pss_kb: 0 } } }),
  ]

  it('renders exactly five feature rows, collapsed by default', () => {
    const wrapper = mountCard(eight())
    expect(wrapper.get('[data-test="top-five"]').findAll('tr').length).toBe(5)
  })

  it('ranks the top five by pss_kb, ignoring which group they belong to', () => {
    const wrapper = mountCard(eight())
    const text = wrapper.get('[data-test="top-five"]').text()
    // The five biggest by pss_kb: 900000, 800000, 700000, 600000, 500000.
    expect(text).toContain('Huge Unknown')
    expect(text).toContain('Big Required')
    expect(text).toContain('Mid Disable')
    expect(text).toContain('Weird Feature')
    expect(text).toContain('Fifth Largest')
    // The three smallest are excluded from the top five.
    expect(text).not.toContain('Sixth Largest')
    expect(text).not.toContain('Seventh Largest')
    expect(text).not.toContain('Eighth Largest')
  })

  it('does not render the grouped sections before expanding', () => {
    const wrapper = mountCard(eight())
    expect(wrapper.find('[data-test="reducible"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="required"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="unknown"]').exists()).toBe(false)
  })

  it('expanding reveals the rest of the features', async () => {
    const wrapper = mountCard(eight())
    await expand(wrapper)
    // Sixth, seventh and eighth were excluded from the top five, but must
    // show up somewhere once expanded.
    const fullText = wrapper.text()
    expect(fullText).toContain('Sixth Largest')
    expect(fullText).toContain('Seventh Largest')
    expect(fullText).toContain('Eighth Largest')
  })

  it('labels the disclosure control with the total feature count', () => {
    const wrapper = mountCard(eight())
    expect(wrapper.get('[data-test="show-all"]').text()).toContain('8')
  })

  it('puts a none-disposition feature under Unknown functionality, not Required', async () => {
    const wrapper = mountCard(eight())
    await expand(wrapper)
    expect(wrapper.get('[data-test="unknown"]').text()).toContain('Eighth Largest')
    expect(wrapper.get('[data-test="required"]').text()).not.toContain('Eighth Largest')
  })

  it('puts an unrecognised disposition under Unknown functionality rather than dropping it', async () => {
    const wrapper = mountCard(eight())
    await expand(wrapper)
    expect(wrapper.get('[data-test="unknown"]').text()).toContain('Weird Feature')
  })

  it('still puts a required feature under Required once expanded', async () => {
    const wrapper = mountCard(eight())
    await expand(wrapper)
    expect(wrapper.get('[data-test="required"]').text()).toContain('Seventh Largest')
  })

  it('never puts the same feature in more than one group', async () => {
    const wrapper = mountCard(eight())
    await expand(wrapper)
    const groups = ['reducible', 'required', 'unknown'] as const
    const names = eight().map(f => f.name)
    for (const name of names) {
      const appearances = groups.filter(g => wrapper.get(`[data-test="${g}"]`).text().includes(name))
      expect(appearances.length, `${name} appeared in ${appearances.join(', ') || 'no groups'}`).toBe(1)
    }
  })

  it('renders no disclosure control when there are five or fewer features', () => {
    const wrapper = mountCard(eight().slice(0, 5))
    expect(wrapper.find('[data-test="show-all"]').exists()).toBe(false)
  })
})

describe('MemoryUsageCard icons', () => {
  // The Icon component resolves `icon="tabler/x"` to public/images/svg/tabler/x.svg
  // at runtime. A name with no matching file renders nothing and the card loses
  // the header icon every sibling card has -- silently, with no build or test
  // failure. This pins every icon the card names to a file that exists.
  it('names only icons that exist on disk', () => {
    const source = readFileSync(resolve('src/components/MemoryUsageCard.vue'), 'utf-8')
    const names = [...source.matchAll(/icon="([^"]+)"/g)].map(m => m[1])
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) {
      const svg = resolve(`public/images/svg/${name}.svg`)
      expect(existsSync(svg), `missing icon asset: public/images/svg/${name}.svg`).toBe(true)
    }
  })
})
