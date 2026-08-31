import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import Poster from '@/components/Poster.vue'

const props = {
  title: 'Kind of Blue',
  subtitle: 'Miles Davis',
  src: 'http://device/api/audiocontrol/library/mpd/image/album:12?size=280',
}

describe('Poster', () => {
  /**
   * PosterGrid renders 50-100 of these at once and appends more on scroll, so
   * whether the browser gets to defer the off-screen ones is the difference
   * between a handful of requests and every cover in the library. It only gets
   * that choice if the <img> is what fetches: a JS preload has already started
   * the request by the time `loading="lazy"` is looked at.
   */
  it('leaves the fetch to the browser instead of preloading', () => {
    const image = vi.spyOn(window, 'Image')

    mount(Poster, { props, global: { stubs: { CustomMarquee: true, Icon: true } } })

    expect(image).not.toHaveBeenCalled()
  })

  it('renders a lazily-loaded img at the given src', () => {
    const wrapper = mount(Poster, { props, global: { stubs: { CustomMarquee: true, Icon: true } } })

    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe(props.src)
    expect(img.attributes('loading')).toBe('lazy')
  })

  it('replaces a cover that fails to load with the placeholder', async () => {
    const wrapper = mount(Poster, { props, global: { stubs: { CustomMarquee: true, Icon: true } } })

    await wrapper.get('img').trigger('error')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.poster-img').classes()).toContain('placeholder')
  })

  /** Scrolling a grid reuses these components with a new src; a cover that
   *  failed for one album must not blank out the next one. */
  it('tries again when the src changes', async () => {
    const wrapper = mount(Poster, { props, global: { stubs: { CustomMarquee: true, Icon: true } } })
    await wrapper.get('img').trigger('error')

    await wrapper.setProps({ src: 'http://device/api/audiocontrol/library/mpd/image/album:13?size=280' })

    expect(wrapper.find('img').exists()).toBe(true)
  })
})

/** PosterGrid passes `item.$cover_src || ''`, and an artist with no image has
 *  no thumb_url at all. An <img src=""> re-requests the current page rather
 *  than failing, so there is no error event to fall back on. */
it('shows the placeholder when there is no cover at all', () => {
  const wrapper = mount(Poster, {
    props: { ...props, src: '' },
    global: { stubs: { CustomMarquee: true, Icon: true } },
  })

  expect(wrapper.find('img').exists()).toBe(false)
  expect(wrapper.find('.poster-img').classes()).toContain('placeholder')
})
