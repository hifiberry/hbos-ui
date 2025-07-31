/**
 * Filter Store for HiFiBerry OS UI
 *
 * This store manages audio filter configurations for different filter banks (e.g., left/right channels).
 * It provides functionality to add, remove, update, and manage filters with support for future
 * backend communication.
 *
 * Key Features:
 * - Multiple filter banks (left, right, or custom names like A-H, C1-C4, etc.)
 * - Position-based filter management with automatic shifting
 * - Unique filter IDs for internal tracking
 * - Import/Export functionality for backend communication
 * - Support for various filter types (highpass, lowpass, peak, etc.)
 * - Bulk operations for multi-channel setups
 * - Pluggable backend implementations (console logging, HTTP API, etc.)
 *
 * Backend Implementations:
 * - ConsoleFilterBackend: Logs all operations to console (for development/demo)
 * - Future: HTTPFilterBackend, WebSocketFilterBackend, etc.
 *
 * Usage:
 * ```typescript
 * const filterStore = useFilterStore()
 *
 * // Create filter banks (current: left/right, future: A-H, C1-C4, etc.)
 * filterStore.createMultipleFilterBanks(['left', 'right'])
 * // Or for future expansion:
 * // filterStore.createMultipleFilterBanks(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
 * // filterStore.createMultipleFilterBanks(['C1', 'C2', 'C3', 'C4'])
 *
 * // Add filters
 * const filterId = filterStore.addFilter('left', 0, {
 *   type: 'highpass',
 *   frequency: 80,
 *   q: 0.7,
 *   enabled: true
 * })
 *
 * // Update filters across multiple channels
 * filterStore.bulkUpdateFilter(['left', 'right'], 0, { frequency: 100 })
 *
 * // Export for backend
 * const config = filterStore.exportFilterConfig()
 * ```
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ConsoleFilterBackend } from './console_filter_backend'
import type { Filter, FilterBank, FilterBanks, FilterBackend, BackendCapabilities } from './filter_backend_interface'

// Re-export types for convenience
export type { Filter, FilterBank, FilterBanks, BackendCapabilities }

export const useFilterStore = defineStore('filter', () => {
  // State
  const filterBanks = ref<FilterBanks>({})
  
  // Backend implementation - can be swapped for different implementations
  const backend = new ConsoleFilterBackend()

  // Computed
  const getAllBanks = computed(() => filterBanks.value)
  const getBankNames = computed(() => Object.keys(filterBanks.value))

  // Helper function to sync backend state with local state
  const syncFromBackend = async (): Promise<void> => {
    filterBanks.value = await backend.getCurrentConfig()
  }

  // Get backend capabilities (name, filter bank limits, etc.)
  const getBackendCapabilities = async (): Promise<BackendCapabilities> => {
    return await backend.getBackendCapabilities()
  }

  // Check if a filter bank can accept more filters
  const canAddFilterToBank = async (bankName: string): Promise<boolean> => {
    const capabilities = await getBackendCapabilities()
    const bankInfo = capabilities.availableFilterBanks.find(bank => bank.name === bankName)
    
    if (!bankInfo) {
      return false // Bank doesn't exist in capabilities
    }
    
    return bankInfo.currentFilterCount < bankInfo.maxFilters
  }

  // Actions that delegate to the backend

  /**
   * Create a new filter bank if it doesn't exist
   */
  const createFilterBank = async (bankName: string): Promise<void> => {
    await backend.createFilterBank(bankName)
    await syncFromBackend()
  }

  /**
   * Get all filters from a specific bank
   */
  const getFiltersFromBank = (bankName: string): Filter[] => {
    return filterBanks.value[bankName]?.filters || []
  }

  /**
   * Get a specific filter by bank name and position
   */
  const getFilter = (bankName: string, position: number): Filter | null => {
    const bank = filterBanks.value[bankName]
    if (!bank || position < 0 || position >= bank.filters.length) {
      return null
    }
    return bank.filters[position]
  }

  /**
   * Add a filter at a specific position in a bank
   * If position is greater than current length, filter is added at the end
   * Throws an error if the bank has reached its maximum capacity
   */
  const addFilter = async (bankName: string, position: number, filter: Omit<Filter, 'id'>): Promise<string> => {
    // Check if the bank can accept more filters
    const canAdd = await canAddFilterToBank(bankName)
    if (!canAdd) {
      const capabilities = await getBackendCapabilities()
      const bankInfo = capabilities.availableFilterBanks.find(bank => bank.name === bankName)
      const maxFilters = bankInfo?.maxFilters || 0
      const currentCount = bankInfo?.currentFilterCount || 0
      
      throw new Error(`Cannot add filter: Bank "${bankName}" has reached its maximum capacity of ${maxFilters} filters (currently has ${currentCount})`)
    }
    
    const filterId = await backend.addFilter(bankName, position, filter)
    await syncFromBackend()
    return filterId
  }

  /**
   * Remove a filter at a specific position from a bank
   * Other filters will shift to fill the gap
   */
  const removeFilter = async (bankName: string, position: number): Promise<boolean> => {
    const result = await backend.removeFilter(bankName, position)
    if (result) {
      await syncFromBackend()
    }
    return result
  }

  /**
   * Update a filter at a specific position in a bank
   */
  const updateFilter = async (bankName: string, position: number, updates: Partial<Omit<Filter, 'id'>>): Promise<boolean> => {
    const result = await backend.updateFilter(bankName, position, updates)
    if (result) {
      await syncFromBackend()
    }
    return result
  }

  /**
   * Clear all filters from a specific bank
   */
  const clearFiltersFromBank = async (bankName: string): Promise<void> => {
    await backend.clearFiltersFromBank(bankName)
    await syncFromBackend()
  }

  /**
   * Remove an entire filter bank
   */
  const removeFilterBank = async (bankName: string): Promise<boolean> => {
    const result = await backend.removeFilterBank(bankName)
    if (result) {
      await syncFromBackend()
    }
    return result
  }

  /**
   * Move a filter from one position to another within the same bank
   */
  const moveFilter = async (bankName: string, fromPosition: number, toPosition: number): Promise<boolean> => {
    const bank = filterBanks.value[bankName]
    if (!bank || fromPosition < 0 || fromPosition >= bank.filters.length ||
        toPosition < 0 || toPosition >= bank.filters.length) {
      return false
    }

    // Get the filter to move
    const filterToMove = getFilter(bankName, fromPosition)
    if (!filterToMove) return false

    // Remove from original position
    const removeResult = await removeFilter(bankName, fromPosition)
    if (!removeResult) return false

    // Adjust target position if necessary (since we removed an item)
    const adjustedToPosition = fromPosition < toPosition ? toPosition - 1 : toPosition

    // Add at new position (without ID to let backend generate new one)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...filterData } = filterToMove
    await addFilter(bankName, adjustedToPosition, filterData)

    return true
  }

  /**
   * Copy a filter from one position to another (within same bank or different banks)
   */
  const copyFilter = async (sourceBankName: string, sourcePosition: number,
                     targetBankName: string, targetPosition: number): Promise<string | null> => {
    const sourceFilter = getFilter(sourceBankName, sourcePosition)
    if (!sourceFilter) {
      return null
    }

    // Create a copy without the ID (addFilter will generate a new one)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...filterCopy } = sourceFilter

    return await addFilter(targetBankName, targetPosition, filterCopy)
  }

  /**
   * Get the total number of filters in a bank
   */
  const getFilterCount = (bankName: string): number => {
    return filterBanks.value[bankName]?.filters.length || 0
  }

  /**
   * Check if a bank exists
   */
  const bankExists = (bankName: string): boolean => {
    return !!filterBanks.value[bankName]
  }

  /**
   * Reset all filter banks (useful for initialization or testing)
   */
  const resetAllBanks = async (): Promise<void> => {
    // For console backend, we can call its reset method directly
    if (backend instanceof ConsoleFilterBackend) {
      backend.resetAllBanks()
    }
    await syncFromBackend()
  }

  /**
   * Export filter configuration for backend communication
   */
  const exportFilterConfig = async (): Promise<FilterBanks> => {
    return await backend.exportFilterConfig()
  }

  /**
   * Import filter configuration from backend
   */
  const importFilterConfig = async (config: FilterBanks): Promise<void> => {
    await backend.importFilterConfig(config)
    await syncFromBackend()
  }

  /**
   * Create multiple filter banks at once
   * Useful for initializing standard channel configurations
   */
  const createMultipleFilterBanks = async (bankNames: string[]): Promise<void> => {
    for (const bankName of bankNames) {
      await backend.createFilterBank(bankName)
    }
    await syncFromBackend()
  }

  /**
   * Get filter banks that match a pattern (useful for future multi-channel setups)
   * Examples: getFilterBanksByPattern(/^[A-H]$/) for channels A-H
   *          getFilterBanksByPattern(/^C\d+$/) for channels C1, C2, C3, etc.
   */
  const getFilterBanksByPattern = (pattern: RegExp): string[] => {
    return Object.keys(filterBanks.value).filter(bankName => pattern.test(bankName))
  }

  /**
   * Apply an operation to multiple filter banks
   * Useful for operations that need to affect multiple channels simultaneously
   */
  const applyToMultipleBanks = (bankNames: string[], operation: (bankName: string) => void): void => {
    bankNames.forEach(bankName => {
      if (bankExists(bankName)) {
        operation(bankName)
      }
    })
  }

  /**
   * Bulk update filters across multiple banks
   * Useful for applying the same filter change to multiple channels
   */
  const bulkUpdateFilter = async (bankNames: string[], position: number, updates: Partial<Omit<Filter, 'id'>>): Promise<boolean[]> => {
    const results = []
    for (const bankName of bankNames) {
      results.push(await updateFilter(bankName, position, updates))
    }
    return results
  }

  return {
    // State
    filterBanks,

    // Computed
    getAllBanks,
    getBankNames,

    // Actions
    createFilterBank,
    createMultipleFilterBanks,
    getFiltersFromBank,
    getFilter,
    addFilter,
    removeFilter,
    updateFilter,
    clearFiltersFromBank,
    removeFilterBank,
    moveFilter,
    copyFilter,
    getFilterCount,
    bankExists,
    getFilterBanksByPattern,
    applyToMultipleBanks,
    bulkUpdateFilter,
    resetAllBanks,
    exportFilterConfig,
    importFilterConfig,

    // Backend management
    syncFromBackend,
    getBackendCapabilities,
    canAddFilterToBank
  }
})
