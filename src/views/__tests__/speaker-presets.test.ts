import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const listSpeakerPresets = vi.fn()
const getMetadata = vi.fn()
const getDSPProfilesMetadata = vi.fn()
const applySpeakerPreset = vi.fn()
const updateDSPProfile = vi.fn()
const check_dsp_toolkit = vi.fn()

vi.mock('@/api/dsptoolkit', () => ({
  listSpeakerPresets: (...args: unknown[]) => listSpeakerPresets(...args),
  getMetadata: (...args: unknown[]) => getMetadata(...args),
  getDSPProfilesMetadata: (...args: unknown[]) => getDSPProfilesMetadata(...args),
  applySpeakerPreset: (...args: unknown[]) => applySpeakerPreset(...args),
  updateDSPProfile: (...args: unknown[]) => updateDSPProfile(...args),
  check_dsp_toolkit: (...args: unknown[]) => check_dsp_toolkit(...args),
}))

import SpeakerPresets from '@/views/sound/speaker-presets.vue'

// The real bundled profiles, because the point of these tests is which board
// a profile may be written to and the real modelName values are what decide
// that. Both are shipped by hifiberry-dspprofiles, so both are on disk on
// every HiFiBerryOS device regardless of which board it has.
const BEOCREATE_PROFILE = {
  programID: 'beocreate-universal',
  modelName: 'Beocreate 4-Channel Amplifier',
  profileName: 'Beocreate Universal',
  profileVersion: '11',
  sampleRate: '48000',
  checksum: 'AA',
  _system: { filepath: '/usr/share/hifiberry/dspprofiles/beocreate-universal-11.xml' },
}

const DACDSP_PROFILE = {
  programID: 'dacdsp-universal',
  modelName: 'DAC+ DSP',
  profileName: 'DAC+ DSP',
  profileVersion: '15',
  sampleRate: '48000',
  checksum: 'BB',
  _system: { filepath: '/usr/share/hifiberry/dspprofiles/dacdsp-15.xml' },
}

const INCOMPATIBLE_PRESET = {
  id: 'beovox-s35',
  name: 'Beovox S 35',
  description: null,
  requiredProfile: 'beocreate-universal',
  sampleRate: 48000,
  readOnly: true,
  filterCounts: { a: 9, b: 9, c: 6, d: 6 },
  compatible: false,
  incompatibleReason:
    "Preset needs the 'beocreate-universal' DSP program, but 'dacdsp-universal' is loaded",
}

const mountPage = () =>
  mount(SpeakerPresets, {
    global: {
      stubs: {
        Icon: true,
        PageContent: { template: '<div><slot /></div>' },
        ContentBox: { template: '<div><slot /></div>' },
        ConfirmationDialog: {
          props: ['isOpen', 'title', 'message'],
          template:
            '<div v-if="isOpen" data-test="dialog"><h2 data-test="dialog-title">{{ title }}</h2><p>{{ message }}</p></div>',
        },
      },
    },
  })

const render = async () => {
  const wrapper = mountPage()
  await flushPromises()
  return wrapper
}

describe('speaker presets page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    listSpeakerPresets.mockResolvedValue({
      presets: [INCOMPATIBLE_PRESET],
      current: null,
    })
    getDSPProfilesMetadata.mockResolvedValue({
      profiles: { 'beocreate-universal-11.xml': BEOCREATE_PROFILE, 'dacdsp-15.xml': DACDSP_PROFILE },
      count: 2,
      directory: '/usr/share/hifiberry/dspprofiles',
    })
    check_dsp_toolkit.mockResolvedValue('yes')
  })

  describe('the install-profile-and-apply remedy', () => {
    it('is offered when a supported board is running the wrong program', async () => {
      // A Beocreate running some other Beocreate program: deploying
      // beocreate-universal is exactly the right thing to do.
      getMetadata.mockResolvedValue({
        checksum: 'CC',
        programID: 'beocreate-legacy',
        modelName: 'Beocreate 4-Channel Amplifier',
      })

      const wrapper = await render()

      expect(wrapper.find('[data-test="install-and-apply"]').exists()).toBe(true)
    })

    it('is not offered on a board the required profile is not for', async () => {
      // The one that damages hardware. hifiberry-dspprofiles is a hard
      // dependency, so beocreate-universal is on a DAC+DSP's disk too and
      // "is the profile installed?" is always true. Writing it into a
      // DAC+DSP's EEPROM persists across reboots and is undone only from the
      // DSP Programs page.
      getMetadata.mockResolvedValue({
        checksum: 'BB',
        programID: 'dacdsp-universal',
        modelName: 'DAC+ DSP',
      })

      const wrapper = await render()

      expect(wrapper.find('[data-test="install-and-apply"]').exists()).toBe(false)
    })

    it('is not offered when the loaded profile cannot be read', async () => {
      // No DSP board: the reason reads "No DSP profile metadata available",
      // which is not a program mismatch, and the deploy would only produce a
      // raw error toast.
      getMetadata.mockRejectedValue(new Error('HTTP 502: Bad Gateway'))

      const wrapper = await render()

      expect(wrapper.find('[data-test="install-and-apply"]').exists()).toBe(false)
    })

    it('is not offered when the metadata names no board', async () => {
      getMetadata.mockResolvedValue({ checksum: 'CC', programID: 'beocreate-legacy' })

      const wrapper = await render()

      expect(wrapper.find('[data-test="install-and-apply"]').exists()).toBe(false)
    })

    it('is not offered when the required program is already loaded', async () => {
      // Incompatible for some other reason -- version, sample rate, bank
      // sizes -- which deploying the same profile again cannot fix.
      getMetadata.mockResolvedValue({
        checksum: 'AA',
        programID: 'beocreate-universal',
        modelName: 'Beocreate 4-Channel Amplifier',
      })

      const wrapper = await render()

      expect(wrapper.find('[data-test="install-and-apply"]').exists()).toBe(false)
    })

    it('is not offered when the required profile is not installed', async () => {
      getMetadata.mockResolvedValue({
        checksum: 'BB',
        programID: 'beocreate-legacy',
        modelName: 'Beocreate 4-Channel Amplifier',
      })
      getDSPProfilesMetadata.mockResolvedValue({
        profiles: { 'dacdsp-15.xml': DACDSP_PROFILE },
        count: 1,
        directory: '/usr/share/hifiberry/dspprofiles',
      })

      const wrapper = await render()

      expect(wrapper.find('[data-test="install-and-apply"]').exists()).toBe(false)
    })
  })

  describe('the confirmation dialog', () => {
    it('says the profile is being installed on the install path', async () => {
      getMetadata.mockResolvedValue({
        checksum: 'CC',
        programID: 'beocreate-legacy',
        modelName: 'Beocreate 4-Channel Amplifier',
      })
      const wrapper = await render()

      await wrapper.find('[data-test="install-and-apply"]').trigger('click')

      expect(wrapper.find('[data-test="dialog-title"]').text()).toBe(
        'Install profile and apply Beovox S 35?',
      )
    })

    it('stays plain on the ordinary apply path', async () => {
      listSpeakerPresets.mockResolvedValue({
        presets: [{ ...INCOMPATIBLE_PRESET, compatible: true, incompatibleReason: null }],
        current: null,
      })
      getMetadata.mockResolvedValue({
        checksum: 'AA',
        programID: 'beocreate-universal',
        modelName: 'Beocreate 4-Channel Amplifier',
      })
      const wrapper = await render()

      await wrapper.find('[data-test="apply"]').trigger('click')

      expect(wrapper.find('[data-test="dialog-title"]').text()).toBe('Apply Beovox S 35?')
    })
  })

  describe('a system with no DSP', () => {
    it('explains what is missing instead of quoting the proxy', async () => {
      listSpeakerPresets.mockRejectedValue(new Error('HTTP 502: Bad Gateway'))
      check_dsp_toolkit.mockResolvedValue('backend_error')

      const wrapper = await render()

      expect(wrapper.find('[data-test="no-dsp"]').exists()).toBe(true)
      expect(wrapper.text()).not.toContain('502')
    })

    it('explains it when no DSP board is detected either', async () => {
      listSpeakerPresets.mockRejectedValue(new Error('HTTP 500'))
      check_dsp_toolkit.mockResolvedValue('no')

      const wrapper = await render()

      expect(wrapper.find('[data-test="no-dsp"]').exists()).toBe(true)
    })

    it('still reports a real failure when the DSP is present', async () => {
      listSpeakerPresets.mockRejectedValue(new Error('Something specific broke'))
      check_dsp_toolkit.mockResolvedValue('yes')

      const wrapper = await render()

      expect(wrapper.find('[data-test="no-dsp"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('Something specific broke')
    })
  })
})
