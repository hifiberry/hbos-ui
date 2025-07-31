/**
 * Console Logging Filter Backend
 * 
 * This implementation logs all filter operations to the console without actually
 * communicating with a real backend. Useful for development and testing.
 */

import { FilterBackend, type Filter, type FilterBanks } from './filter_backend_interface'

export class ConsoleFilterBackend extends FilterBackend {
  private filterBanks: FilterBanks = {}
  private nextFilterId = 0

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

  async addFilter(bankName: string, position: number, filter: Omit<Filter, 'id'>): Promise<string> {
    this.ensureBankExists(bankName)

    const newFilter: Filter = {
      ...filter,
      id: this.generateFilterId()
    }

    const bank = this.filterBanks[bankName]
    const insertPosition = Math.max(0, Math.min(position, bank.filters.length))
    bank.filters.splice(insertPosition, 0, newFilter)

    // Console logging
    console.log(`[Console Filter Backend] Added filter:`, {
      bankName,
      position: insertPosition,
      filter: newFilter,
      totalFiltersInBank: bank.filters.length
    })

    return newFilter.id
  }

  async removeFilter(bankName: string, position: number): Promise<boolean> {
    const bank = this.filterBanks[bankName]
    if (!bank || position < 0 || position >= bank.filters.length) {
      console.log(`[Console Filter Backend] Failed to remove filter: Invalid position ${position} in bank "${bankName}"`)
      return false
    }

    const removedFilter = bank.filters[position]
    bank.filters.splice(position, 1)

    // Console logging
    console.log(`[Console Filter Backend] Removed filter:`, {
      bankName,
      position,
      removedFilter,
      remainingFiltersInBank: bank.filters.length
    })

    return true
  }

  async updateFilter(bankName: string, position: number, updates: Partial<Omit<Filter, 'id'>>): Promise<boolean> {
    const bank = this.filterBanks[bankName]
    if (!bank || position < 0 || position >= bank.filters.length) {
      console.log(`[Console Filter Backend] Failed to update filter: Invalid position ${position} in bank "${bankName}"`)
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
    console.log(`[Console Filter Backend] Updated filter:`, {
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
      console.log(`[Console Filter Backend] Cleared all filters from bank "${bankName}":`, {
        clearedFiltersCount: clearedCount
      })
    }
  }

  async createFilterBank(bankName: string): Promise<void> {
    this.ensureBankExists(bankName)
    
    // Console logging
    console.log(`[Console Filter Backend] Created filter bank: "${bankName}"`)
  }

  async removeFilterBank(bankName: string): Promise<boolean> {
    if (this.filterBanks[bankName]) {
      delete this.filterBanks[bankName]
      
      // Console logging
      console.log(`[Console Filter Backend] Removed filter bank: "${bankName}"`)
      return true
    }
    return false
  }

  async exportFilterConfig(): Promise<FilterBanks> {
    const config = JSON.parse(JSON.stringify(this.filterBanks))
    
    // Console logging
    console.log(`[Console Filter Backend] Exported filter configuration:`, config)
    
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
    console.log(`[Console Filter Backend] Imported filter configuration:`, config)
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
    
    // Console logging
    console.log(`[Console Filter Backend] Reset all filter banks`)
  }
}
