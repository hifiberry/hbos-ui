/**
 * Preset ownership for the filter editors.
 *
 * A speaker preset writes raw biquad coefficients into a bank. Those filters
 * are real and must stay visible — the count and the response curve are the
 * whole point — but the editors rewrite a bank wholesale on every edit, so a
 * single band-by-band change would silently destroy the applied preset.
 *
 * This marks such a bank read-only, names the preset that owns it, and offers
 * the one deliberate way out: clear the preset on the device, then edit
 * freely.
 */

import { ref, computed, type Ref } from 'vue'
import { isRawCoefficientFilter, type Filter } from '@/utils/filtercalc'
import { listSpeakerPresets, clearSpeakerPreset } from '@/api/dsptoolkit'
import { useToastStore } from '@/stores/toast'

export function usePresetLock(filters: Ref<Filter[]>) {
  const toastStore = useToastStore()

  const presetName = ref<string | null>(null)
  const showClearDialog = ref(false)
  const isClearing = ref(false)

  /**
   * A bank is preset-owned when it holds at least one raw-coefficient filter.
   * Room EQ corrections and hand-built crossovers are typed filters and are
   * unaffected.
   */
  const isPresetOwned = computed(() =>
    filters.value.some(isRawCoefficientFilter)
  )

  const lockMessage = computed(() =>
    presetName.value
      ? `These filters come from the speaker preset ${presetName.value} and cannot be ` +
        `edited band-by-band here.`
      : 'These filters come from a speaker preset and cannot be edited band-by-band here.'
  )

  const clearConfirmationMessage = computed(() =>
    `This returns all four channels to no filters` +
    `${presetName.value ? `, removing the preset ${presetName.value}` : ''}. ` +
    `Channel levels, delays, polarity and input sources are left as they are.`
  )

  /** Resolve the name of the applied preset for the banner. */
  async function loadAppliedPreset(): Promise<void> {
    try {
      const { presets, current } = await listSpeakerPresets()
      if (!current) {
        presetName.value = null
        return
      }
      presetName.value = presets.find(preset => preset.id === current)?.name ?? current
    } catch (error) {
      // The lock does not depend on this: the generic filters are evidence
      // enough. Only the name in the banner is lost.
      console.warn('preset-lock: could not resolve the applied speaker preset:', error)
      presetName.value = null
    }
  }

  /**
   * Wrap a mutating handler so it cannot fire while the bank is preset-owned.
   * The controls stay visible and the curve stays drawn; only the writes stop.
   */
  function readOnly<A extends unknown[], R>(handler: (...args: A) => R) {
    return (...args: A): R | undefined => {
      if (isPresetOwned.value) return undefined
      return handler(...args)
    }
  }

  /** Clear the preset on the device, then reload whatever the page shows. */
  async function confirmClearPreset(reload: () => Promise<void>): Promise<void> {
    isClearing.value = true
    try {
      const result = await clearSpeakerPreset()
      showClearDialog.value = false
      presetName.value = null
      await reload()
      toastStore.showSuccessToast(
        result.cleared
          ? `Cleared the speaker preset; ${result.filtersCleared} filters removed.`
          : 'No speaker preset was applied.'
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('preset-lock: failed to clear the speaker preset:', error)
      toastStore.showErrorToast(`Could not clear the speaker preset: ${message}`)
    } finally {
      isClearing.value = false
    }
  }

  return {
    presetName,
    isPresetOwned,
    lockMessage,
    clearConfirmationMessage,
    showClearDialog,
    isClearing,
    loadAppliedPreset,
    readOnly,
    confirmClearPreset
  }
}
