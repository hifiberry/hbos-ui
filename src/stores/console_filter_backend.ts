/**
 * Console Logging Filter Backend
 *
 * This implementation logs all filter operations to the console without actually
 * communicating with a real backend. Useful for development and testing.
 *
 * Pre-configured with left and right filter banks, each supporting up to 4 filters.
 */

import { FilterBackend, type Filter, type FilterBanks, type BackendCapabilities, type FilterBankInfo } from './filter_backend_interface'

export class ConsoleFilterBackend extends FilterBackend {
  public readonly name = 'Console Filter Backend (Demo)'
  public readonly description = `
    <p><em>⚠️ This is a demonstration backend with no actual audio processing functionality. It's designed solely to showcase the filter designer interface and interactions.</em></p>
    
    <h4>Purpose:</h4>
    <p>This demo backend allows you to experience the filter designer UI, test filter operations, and understand how the interface works without connecting to real audio hardware.</p>    <h4>What it does:</h4>
    <ul>
      <li><strong>Visual Demonstration:</strong> Shows how filters appear and behave in the interface</li>
      <li><strong>Console Logging:</strong> All filter operations are logged to the browser console for development purposes</li>
      <li><strong>UI Testing:</strong> Allows testing of all filter designer features and interactions</li>
      <li><strong>Filter Limits:</strong> Demonstrates capacity limits (4 filters per channel)</li>
    </ul>

    <h4>What it does NOT do:</h4>
    <ul>
      <li>❌ No actual audio processing or filtering</li>
      <li>❌ No real-time audio effects</li>
      <li>❌ No backend communication</li>
      <li>❌ No persistent storage across sessions</li>
    </ul>

    <p><strong>To enable real audio processing:</strong> Add a HiFiBerry DSP-enabled sound card to your system.</p>
  `.trim()

  private filterBanks: FilterBanks = {}
  private nextFilterId = 0

  // Configuration for predefined filter banks
  private readonly PREDEFINED_BANKS = {
    left: { maxFilters: 16 },
    right: { maxFilters: 16 }
  }

  constructor() {
    super()
    this.initializePredefinedBanks()
  }

  private initializePredefinedBanks(): void {
    // Initialize left and right banks with empty filter arrays
    for (const [bankName] of Object.entries(this.PREDEFINED_BANKS)) {
      this.filterBanks[bankName] = {
        name: bankName,
        filters: []
      }
    }

    console.log(`[${this.name}] Initialized with predefined filter banks:`, Object.keys(this.PREDEFINED_BANKS))
  }

  private generateFilterId(): string {
    return `filter_${this.nextFilterId++}`
  }

  private ensureBankExists(bankName: string): void {
    if (!this.filterBanks[bankName]) {
      this.filterBanks[bankName] = {
        name: bankName,
        filters: []
      }
    }
  }

  private getMaxFiltersForBank(bankName: string): number {
    return this.PREDEFINED_BANKS[bankName as keyof typeof this.PREDEFINED_BANKS]?.maxFilters || 0
  }

  private canAddFilterToBank(bankName: string): boolean {
    const bank = this.filterBanks[bankName]
    const maxFilters = this.getMaxFiltersForBank(bankName)
    return bank ? bank.filters.length < maxFilters : false
  }

  async getBackendCapabilities(): Promise<BackendCapabilities> {
    const availableFilterBanks: FilterBankInfo[] = []

    for (const [bankName, config] of Object.entries(this.PREDEFINED_BANKS)) {
      const bank = this.filterBanks[bankName]
      availableFilterBanks.push({
        name: bankName,
        maxFilters: config.maxFilters,
        currentFilterCount: bank?.filters.length || 0
      })
    }

    const capabilities: BackendCapabilities = {
      backendName: this.name,
      backendDescription: this.description,
      availableFilterBanks
    }

    console.log(`[${this.name}] Backend capabilities:`, capabilities)
    return capabilities
  }

  async addFilter(bankName: string, position: number, filter: Omit<Filter, 'id'>): Promise<string> {
    this.ensureBankExists(bankName)

    // Check if the bank can accept more filters
    if (!this.canAddFilterToBank(bankName)) {
      const maxFilters = this.getMaxFiltersForBank(bankName)
      const currentCount = this.filterBanks[bankName]?.filters.length || 0

      console.error(`[${this.name}] Cannot add filter to bank "${bankName}": Maximum ${maxFilters} filters allowed, currently has ${currentCount}`)
      throw new Error(`Cannot add filter: Bank "${bankName}" has reached its maximum capacity of ${maxFilters} filters`)
    }

    const newFilter: Filter = {
      ...filter,
      id: this.generateFilterId()
    }

    const bank = this.filterBanks[bankName]
    const insertPosition = Math.max(0, Math.min(position, bank.filters.length))
    bank.filters.splice(insertPosition, 0, newFilter)

    // Console logging
    console.log(`[${this.name}] Added filter:`, {
      bankName,
      position: insertPosition,
      filter: newFilter,
      totalFiltersInBank: bank.filters.length,
      maxFiltersAllowed: this.getMaxFiltersForBank(bankName)
    })

    return newFilter.id
  }

  async removeFilter(bankName: string, position: number): Promise<boolean> {
    const bank = this.filterBanks[bankName]
    if (!bank || position < 0 || position >= bank.filters.length) {
      console.log(`[${this.name}] Failed to remove filter: Invalid position ${position} in bank "${bankName}"`)
      return false
    }

    const removedFilter = bank.filters[position]
    bank.filters.splice(position, 1)

    // Console logging
    console.log(`[${this.name}] Removed filter:`, {
      bankName,
      position,
      removedFilter,
      remainingFiltersInBank: bank.filters.length,
      maxFiltersAllowed: this.getMaxFiltersForBank(bankName)
    })

    return true
  }

  async updateFilter(bankName: string, position: number, updates: Partial<Omit<Filter, 'id'>>): Promise<boolean> {
    const bank = this.filterBanks[bankName]
    if (!bank || position < 0 || position >= bank.filters.length) {
      console.log(`[${this.name}] Failed to update filter: Invalid position ${position} in bank "${bankName}"`)
      return false
    }

    const currentFilter = bank.filters[position]
    const previousState = { ...currentFilter }

    bank.filters[position] = {
      ...currentFilter,
      ...updates,
      id: currentFilter.id // Ensure ID is not changed
    }

    // Console logging
    console.log(`[${this.name}] Updated filter:`, {
      bankName,
      position,
      previousState,
      updates,
      newState: bank.filters[position]
    })

    return true
  }

  async clearFiltersFromBank(bankName: string): Promise<void> {
    const bank = this.filterBanks[bankName]
    if (bank) {
      const clearedCount = bank.filters.length
      bank.filters = []

      // Console logging
      console.log(`[${this.name}] Cleared all filters from bank "${bankName}":`, {
        clearedFiltersCount: clearedCount,
        maxFiltersAllowed: this.getMaxFiltersForBank(bankName)
      })
    }
  }

  async createFilterBank(bankName: string): Promise<void> {
    this.ensureBankExists(bankName)

    // Console logging
    console.log(`[${this.name}] Created filter bank: "${bankName}"`)
  }

  async removeFilterBank(bankName: string): Promise<boolean> {
    if (this.filterBanks[bankName]) {
      delete this.filterBanks[bankName]

      // Console logging
      console.log(`[${this.name}] Removed filter bank: "${bankName}"`)
      return true
    }
    return false
  }

  async exportFilterConfig(): Promise<FilterBanks> {
    const config = JSON.parse(JSON.stringify(this.filterBanks))

    // Console logging
    console.log(`[${this.name}] Exported filter configuration:`, config)

    return config
  }

  async importFilterConfig(config: FilterBanks): Promise<void> {
    this.filterBanks = JSON.parse(JSON.stringify(config))

    // Update nextFilterId to prevent ID conflicts
    let maxId = 0
    Object.values(this.filterBanks).forEach(bank => {
      bank.filters.forEach(filter => {
        const idNumber = parseInt(filter.id.replace('filter_', ''))
        if (!isNaN(idNumber) && idNumber >= maxId) {
          maxId = idNumber + 1
        }
      })
    })
    this.nextFilterId = maxId

    // Console logging
    console.log(`[${this.name}] Imported filter configuration:`, config)
  }

  async getCurrentConfig(): Promise<FilterBanks> {
    return JSON.parse(JSON.stringify(this.filterBanks))
  }

  // Additional methods for local state management (not part of the interface)
  getFiltersFromBank(bankName: string): Filter[] {
    return this.filterBanks[bankName]?.filters || []
  }

  getFilter(bankName: string, position: number): Filter | null {
    const bank = this.filterBanks[bankName]
    if (!bank || position < 0 || position >= bank.filters.length) {
      return null
    }
    return bank.filters[position]
  }

  bankExists(bankName: string): boolean {
    return !!this.filterBanks[bankName]
  }

  getBankNames(): string[] {
    return Object.keys(this.filterBanks)
  }

  resetAllBanks(): void {
    this.filterBanks = {}
    this.nextFilterId = 0
    this.initializePredefinedBanks()

    // Console logging
    console.log(`[${this.name}] Reset all filter banks`)
  }

  // Additional helper method to check if a bank can accept more filters
  canAcceptMoreFilters(bankName: string): boolean {
    return this.canAddFilterToBank(bankName)
  }
}
