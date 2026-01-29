/**
 * Backend Interface for Filter Operations
 *
 * This defines the contract for different filter backend implementations.
 * Implementations can be console logging (for demo), HTTP API calls, WebSocket, etc.
 */

/**
 * Interface for the filter. Those filters
 * come directly from the backend.
 */
export interface Filter {
  id: string
  type: 'highpass' | 'lowpass' | 'bandpass' | 'bandstop' | 'peak' | 'shelf-low' | 'shelf-high' | 'allpass'
  frequency: number
  gain?: number // For peak and shelf filters
  q?: number // Quality factor
  enabled: boolean
}

/**
 * A interface that holds a name of a filterbank, as
 * well as an array of filters.
 */
export interface FilterBank {
  name: string
  filters: Filter[]
}

export interface FilterBanks {
  [bankName: string]: FilterBank
}

/**
 * Stores information about a `FilterBank`.
 */
export interface FilterBankInfo {
  name: string
  maxFilters: number
  currentFilterCount: number
  filterBankType: string
}

export interface BackendCapabilities {
  availableFilterBanks: FilterBankInfo[]
  backendName: string
  backendDescription: string
  backendShortDescription: string
}

/**
 * Abstract base class for filter backend implementations
 */
export abstract class FilterBackend {
  /**
   * Name of this backend implementation
   */
  abstract readonly name: string

  /**
   * Extended description of this backend implementation
   */
  abstract readonly description: string

  /**
   * Get information about available filter banks and their limits
   */
  abstract getBackendCapabilities(): Promise<BackendCapabilities>
  /**
   * Add a filter to a specific bank at a specific position
   */
  abstract addFilter(bankName: string, position: number, filter: Omit<Filter, 'id'>): Promise<string>

  /**
   * Remove a filter from a specific bank at a specific position
   */
  abstract removeFilter(bankName: string, position: number): Promise<boolean>

  /**
   * Update a filter at a specific position in a bank
   */
  abstract updateFilter(bankName: string, position: number, updates: Partial<Omit<Filter, 'id'>>): Promise<boolean>

  /**
   * Clear all filters from a specific bank
   */
  abstract clearFiltersFromBank(bankName: string): Promise<void>

  /**
   * Create a new filter bank
   */
  abstract createFilterBank(bankName: string): Promise<void>

  /**
   * Remove an entire filter bank
   */
  abstract removeFilterBank(bankName: string): Promise<boolean>

  /**
   * Export filter configuration
   */
  abstract exportFilterConfig(): Promise<FilterBanks>

  /**
   * Import filter configuration
   */
  abstract importFilterConfig(config: FilterBanks): Promise<void>

  /**
   * Get current filter configuration (for initialization)
   */
  abstract getCurrentConfig(): Promise<FilterBanks>
}
