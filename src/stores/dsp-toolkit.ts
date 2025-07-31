import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { check_dsp_toolkit, type DSPToolkitStatus } from '@/api/dsptoolkit'

/**
 * DSP Toolkit Store
 *
 * This store manages the DSP hardware detection status with caching.
 * It should be used throughout the app before making any DSP-related API calls.
 *
 * Usage examples:
 *
 * // Check if DSP operations are allowed
 * const dspStore = useDSPToolkitStore()
 * if (await dspStore.canUseDSP()) {
 *   // Proceed with DSP operations
 * }
 *
 * // Get detailed status
 * const status = await dspStore.getDSPStatus()
 * if (status === 'yes') {
 *   // DSP is available
 * } else if (status === 'no') {
 *   // No DSP detected
 * } else if (status === 'backend_error') {
 *   // Backend communication error
 * }
 *
 * // Force a fresh check (bypassing cache)
 * const status = await dspStore.checkDSPStatus(true)
 */

export const useDSPToolkitStore = defineStore('dsp-toolkit', () => {
  // State
  const status = ref<DSPToolkitStatus | null>(null)
  const isChecking = ref(false)
  const lastChecked = ref<Date | null>(null)
  const cacheTimeout = ref(5 * 60 * 1000) // 5 minutes cache timeout

  // Getters
  const isDSPAvailable = computed(() => status.value === 'yes')
  const isDSPDetected = computed(() => status.value === 'yes')
  const hasBackendError = computed(() => status.value === 'backend_error')
  const isNoDSP = computed(() => status.value === 'no')

  // Check if cache is still valid
  const isCacheValid = computed(() => {
    if (!lastChecked.value || !status.value) return false
    const now = new Date()
    const timeDiff = now.getTime() - lastChecked.value.getTime()
    return timeDiff < cacheTimeout.value
  })

  // Actions
  const checkDSPStatus = async (forceCheck = false): Promise<DSPToolkitStatus> => {
    // Return cached result if valid and not forcing check
    if (!forceCheck && isCacheValid.value && status.value) {
      return status.value
    }

    isChecking.value = true

    try {
      const result = await check_dsp_toolkit()
      status.value = result
      lastChecked.value = new Date()
      return result
    } catch (error) {
      console.error('Failed to check DSP toolkit status:', error)
      status.value = 'backend_error'
      lastChecked.value = new Date()
      return 'backend_error'
    } finally {
      isChecking.value = false
    }
  }

  const clearCache = () => {
    status.value = null
    lastChecked.value = null
  }

  const setCacheTimeout = (timeoutMs: number) => {
    cacheTimeout.value = timeoutMs
  }

  // Helper method to get status with automatic checking
  const getDSPStatus = async (): Promise<DSPToolkitStatus> => {
    return await checkDSPStatus()
  }

  // Helper method to check if DSP operations should be allowed
  const canUseDSP = async (): Promise<boolean> => {
    const dspStatus = await checkDSPStatus()
    return dspStatus === 'yes'
  }

  return {
    // State
    status,
    isChecking,
    lastChecked,
    cacheTimeout,

    // Getters
    isDSPAvailable,
    isDSPDetected,
    hasBackendError,
    isNoDSP,
    isCacheValid,

    // Actions
    checkDSPStatus,
    clearCache,
    setCacheTimeout,
    getDSPStatus,
    canUseDSP
  }
})
