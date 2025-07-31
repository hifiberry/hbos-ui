/**
 * DSP Toolkit Filter Backend
 *
 * This backend connects to the actual DSP hardware using the DSP Toolkit API.
 * It uses the current DSP profile metadata to define available filter banks
 * based on the actual hardware configuration.
 */

import {
  FilterBackend,
  type Filter,
  type FilterBank,
  type FilterBanks,
  type BackendCapabilities,
  type FilterBankInfo
} from './filter_backend_interface'
import {
  getMetadata,
  getCacheStatus,
  type DSPMetadata,
  type CacheStatus
} from '@/api/dsptoolkit'
import { useDSPToolkitStore } from './dsp-toolkit'

// Extended FilterBank interface with maxFilters information
interface ExtendedFilterBank extends FilterBank {
  maxFilters: number
  baseAddress?: number // Memory base address for DSP hardware
}

// Extended FilterBanks interface
interface ExtendedFilterBanks {
  [bankName: string]: ExtendedFilterBank
}

export class DSPToolkitFilterBackend extends FilterBackend {
  readonly name = 'HiFiBery DSP'
  readonly shortDescription = 'Support for HiFiBerry DSP hardware'
  readonly description = `
    <div class="backend-info">
      <p><strong>HiFiBerry DSP</strong></p>
      <p>This backend connects directly to your DSP hardware using the DSP Toolkit API.
      Filter banks are automatically configured based on your current DSP profile metadata.</p>

      <div class="features">
        <h4>Features:</h4>
        <ul>
          <li>Real-time filter updates to DSP hardware</li>
          <li>Automatic filter bank detection from profile</li>
          <li>Hardware-specific filter configurations</li>
          <li>Sample rate awareness</li>
          <li>Profile-based filter limits</li>
        </ul>
      </div>

      <div class="requirements">
        <h4>Requirements:</h4>
        <ul>
          <li>Compatible DSP hardware (Beocreate, DAC+DSP, etc.)</li>
          <li>Active DSP profile loaded</li>
          <li>DSP Toolkit service running</li>
        </ul>
      </div>

      <div class="warning">
        <p><strong>⚠️ Important:</strong> Changes made through this backend will directly
        affect your audio output. Make sure to test changes carefully and keep backups
        of your working configurations.</p>
      </div>
    </div>
  `

  private filterBanks: ExtendedFilterBanks = {}
  private metadata: DSPMetadata | null = null
  private cacheStatus: CacheStatus | null = null
  private initialized = false

  /**
   * Initialize the backend by loading current DSP metadata and profile information
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Check DSP availability first using the store
      const dspToolkitStore = useDSPToolkitStore()
      const canUseDSP = await dspToolkitStore.canUseDSP()
      
      if (!canUseDSP) {
        const dspStatus = dspToolkitStore.status
        let errorMessage = 'DSP Toolkit backend unavailable: '
        if (dspStatus === 'backend_error') {
          errorMessage += 'HiFiBerry DSP software not available'
        } else if (dspStatus === 'no') {
          errorMessage += 'No DSP hardware detected'
        } else {
          errorMessage += 'DSP is not accessible'
        }
        throw new Error(errorMessage)
      }

      // Load current metadata and cache status
      [this.metadata, this.cacheStatus] = await Promise.all([
        getMetadata(),
        getCacheStatus()
      ])

      // Build filter banks based on available metadata
      await this.buildFilterBanksFromMetadata()

      this.initialized = true
      console.log('DSP Toolkit backend initialized', {
        profile: this.cacheStatus?.profile?.name,
        sampleRate: this.metadata?._system?.sampleRate,
        filterBanks: Object.keys(this.filterBanks)
      })
    } catch (error) {
      console.error('Failed to initialize DSP Toolkit backend:', error)
      throw new Error(`DSP initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Build filter banks based on current DSP metadata
   * This creates filter banks representing the actual DSP configuration
   */
  private async buildFilterBanksFromMetadata(): Promise<void> {
    this.filterBanks = {}

    // Log available metadata for debugging
    console.log('DSP Metadata:', this.metadata)
    console.log('Cache Status:', this.cacheStatus)

    // Get basic info from metadata
    const profileName = this.cacheStatus?.profile?.name || 'Unknown Profile'
    const sampleRate = this.metadata?._system?.sampleRate || 48000

    // Parse filter banks from metadata
    if (this.metadata) {
      // Parse custom filter banks (Left/Right channels)
      this.parseCustomFilterBanks()

      // Parse IIR filter banks (IIR_A, IIR_B, IIR_C, etc.)
      this.parseIIRFilterBanks()
    }

    // If no filter banks were found in metadata, create default stereo banks
    if (Object.keys(this.filterBanks).length === 0) {
      console.warn('No filter banks found in metadata, creating default stereo configuration')
      this.createDefaultFilterBanks(profileName)
    }

    console.log(`Built ${Object.keys(this.filterBanks).length} filter banks for ${profileName} at ${sampleRate}Hz:`, Object.keys(this.filterBanks))
  }

  /**
   * Parse custom filter register banks (Left/Right channels) from metadata
   */
  private parseCustomFilterBanks(): void {
    if (!this.metadata) return

    // Look for customFilterRegisterBankLeft and customFilterRegisterBankRight
    const metadata = this.metadata as Record<string, unknown>
    const leftBank = metadata.customFilterRegisterBankLeft
    const rightBank = metadata.customFilterRegisterBankRight

    if (leftBank && typeof leftBank === 'string') {
      const leftBankInfo = this.parseFilterBankInfo(leftBank, 'Left Channel')
      if (leftBankInfo) {
        this.filterBanks['left'] = leftBankInfo
        console.log(`Parsed left filter bank: ${leftBank} -> ${leftBankInfo.maxFilters} filters at address ${leftBankInfo.baseAddress}`)
      }
    }

    if (rightBank && typeof rightBank === 'string') {
      const rightBankInfo = this.parseFilterBankInfo(rightBank, 'Right Channel')
      if (rightBankInfo) {
        this.filterBanks['right'] = rightBankInfo
        console.log(`Parsed right filter bank: ${rightBank} -> ${rightBankInfo.maxFilters} filters at address ${rightBankInfo.baseAddress}`)
      }
    }
  }

  /**
   * Parse IIR filter banks (IIR_A, IIR_B, IIR_C, etc.) from metadata
   */
  private parseIIRFilterBanks(): void {
    if (!this.metadata) return

    // Look for IIR_A, IIR_B, IIR_C, etc. in metadata
    const iirBankPattern = /^IIR_[A-Z]$/
    const iirBanks: Array<{ key: string; value: string }> = []

    // Collect all IIR banks first
    for (const [key, value] of Object.entries(this.metadata)) {
      if (iirBankPattern.test(key) && typeof value === 'string') {
        iirBanks.push({ key, value })
      }
    }

    // Sort alphabetically by key
    iirBanks.sort((a, b) => a.key.localeCompare(b.key))

    // Parse sorted IIR banks
    for (const { key, value } of iirBanks) {
      const letter = key.split('_')[1] // Extract the letter (A, B, C, etc.)
      const displayName = `Crossover ${letter}` // Change display name
      const bankInfo = this.parseFilterBankInfo(value, displayName)
      if (bankInfo) {
        this.filterBanks[key.toLowerCase()] = bankInfo
        console.log(`Parsed IIR filter bank: ${key} = ${value} -> ${bankInfo.maxFilters} filters at address ${bankInfo.baseAddress}`)
      }
    }
  }

  /**
   * Parse filter bank info from metadata string format "baseAddress/memorySize"
   */
  private parseFilterBankInfo(bankString: string, displayName: string): ExtendedFilterBank | null {
    try {
      const parts = bankString.split('/')
      if (parts.length !== 2) {
        console.warn(`Invalid filter bank format: ${bankString}`)
        return null
      }

      const baseAddress = parseInt(parts[0], 10)
      const memoryCells = parseInt(parts[1], 10)

      if (isNaN(baseAddress) || isNaN(memoryCells)) {
        console.warn(`Invalid numeric values in filter bank: ${bankString}`)
        return null
      }

      // Calculate number of filters: memory cells / 5
      const maxFilters = Math.floor(memoryCells / 5)

      return {
        name: displayName,
        filters: [],
        maxFilters,
        baseAddress
      }
    } catch (error) {
      console.error(`Error parsing filter bank ${bankString}:`, error)
      return null
    }
  }

  /**
   * Create default filter banks when no metadata is available
   */
  private createDefaultFilterBanks(profileName: string): void {
    // Left channel filter bank
    this.filterBanks['left'] = {
      name: `Left Channel (${profileName})`,
      filters: [],
      maxFilters: 8 // Default fallback
      // No baseAddress for default banks
    }

    // Right channel filter bank
    this.filterBanks['right'] = {
      name: `Right Channel (${profileName})`,
      filters: [],
      maxFilters: 8 // Default fallback
      // No baseAddress for default banks
    }

    // If metadata indicates additional channels, add them
    if (this.isMultiChannelProfile()) {
      this.filterBanks['center'] = {
        name: `Center Channel (${profileName})`,
        filters: [],
        maxFilters: 8
        // No baseAddress for default banks
      }

      this.filterBanks['subwoofer'] = {
        name: `Subwoofer (${profileName})`,
        filters: [],
        maxFilters: 8
        // No baseAddress for default banks
      }
    }
  }

  /**
   * Determine if the current profile supports multi-channel operation
   * This would analyze the actual metadata structure in a real implementation
   */
  private isMultiChannelProfile(): boolean {
    // Check profile name for multi-channel indicators
    const profileName = this.cacheStatus?.profile?.name?.toLowerCase() || ''

    // Beocreate is typically 4-channel
    if (profileName.includes('beocreate') || profileName.includes('4ch') || profileName.includes('4-channel')) {
      return true
    }

    // Check metadata for channel information
    // In a real implementation, this would examine the actual metadata structure
    // to determine the number of output channels

    return false
  }

  /**
   * Get the maximum number of filters per bank based on DSP capabilities
   * This would be determined by the actual DSP hardware and profile in a real implementation
   */
  private getMaxFiltersPerBank(): number {
    // Default to 8 filters per bank for most DSP profiles
    // Real implementation would parse metadata to get actual limits
    return 8
  }

  async getBackendCapabilities(): Promise<BackendCapabilities> {
    await this.initialize()

    // Sort filter banks: left, right first, then IIR banks alphabetically
    const sortedBankEntries = Object.entries(this.filterBanks).sort(([keyA], [keyB]) => {
      // Prioritize left and right channels
      if (keyA === 'left') return -1
      if (keyB === 'left') return 1
      if (keyA === 'right') return -1
      if (keyB === 'right') return 1

      // Then sort IIR banks alphabetically
      return keyA.localeCompare(keyB)
    })

    const availableFilterBanks: FilterBankInfo[] = sortedBankEntries.map(([bankKey, bank]) => ({
      name: bankKey, // Use bank key instead of display name for compatibility
      maxFilters: bank.maxFilters,
      currentFilterCount: bank.filters.length
    }))

    return {
      availableFilterBanks,
      backendName: this.name,
      backendDescription: this.description,
      backendShortDescription: this.shortDescription
    }
  }

  async addFilter(bankName: string, position: number, filter: Omit<Filter, 'id'>): Promise<string> {
    await this.initialize()

    if (!this.filterBanks[bankName]) {
      throw new Error(`Filter bank '${bankName}' not found`)
    }

    const bank = this.filterBanks[bankName]
    const maxFilters = bank.maxFilters

    if (bank.filters.length >= maxFilters) {
      throw new Error(`Cannot add filter: ${bankName} bank is at maximum capacity (${maxFilters})`)
    }

    // Generate unique filter ID
    const filterId = `${bankName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const newFilter: Filter = {
      ...filter,
      id: filterId
    }

    // Insert at specified position or append
    if (position >= 0 && position < bank.filters.length) {
      bank.filters.splice(position, 0, newFilter)
    } else {
      bank.filters.push(newFilter)
    }

    console.log(`DSP Toolkit: Added ${filter.type} filter to ${bankName} bank`, {
      filterId,
      frequency: filter.frequency,
      position: position,
      // TODO: Here would be the actual DSP hardware update
      note: 'Hardware update not yet implemented'
    })

    // TODO: Implement actual DSP hardware update
    // await this.updateDSPHardware(bankName, bank.filters)

    return filterId
  }

  async removeFilter(bankName: string, position: number): Promise<boolean> {
    await this.initialize()

    if (!this.filterBanks[bankName]) {
      throw new Error(`Filter bank '${bankName}' not found`)
    }

    const bank = this.filterBanks[bankName]

    if (position < 0 || position >= bank.filters.length) {
      return false
    }

    const removedFilter = bank.filters.splice(position, 1)[0]

    console.log(`DSP Toolkit: Removed filter from ${bankName} bank`, {
      filterId: removedFilter.id,
      position,
      // TODO: Here would be the actual DSP hardware update
      note: 'Hardware update not yet implemented'
    })

    // TODO: Implement actual DSP hardware update
    // await this.updateDSPHardware(bankName, bank.filters)

    return true
  }

  async updateFilter(bankName: string, position: number, updates: Partial<Omit<Filter, 'id'>>): Promise<boolean> {
    await this.initialize()

    if (!this.filterBanks[bankName]) {
      throw new Error(`Filter bank '${bankName}' not found`)
    }

    const bank = this.filterBanks[bankName]

    if (position < 0 || position >= bank.filters.length) {
      return false
    }

    // Apply updates to the filter
    const filter = bank.filters[position]
    Object.assign(filter, updates)

    console.log(`DSP Toolkit: Updated filter in ${bankName} bank`, {
      filterId: filter.id,
      position,
      updates,
      // TODO: Here would be the actual DSP hardware update
      note: 'Hardware update not yet implemented'
    })

    // TODO: Implement actual DSP hardware update
    // await this.updateDSPHardware(bankName, bank.filters)

    return true
  }

  async clearFiltersFromBank(bankName: string): Promise<void> {
    await this.initialize()

    if (!this.filterBanks[bankName]) {
      throw new Error(`Filter bank '${bankName}' not found`)
    }

    this.filterBanks[bankName].filters = []

    console.log(`DSP Toolkit: Cleared all filters from ${bankName} bank`, {
      // TODO: Here would be the actual DSP hardware update
      note: 'Hardware update not yet implemented'
    })

    // TODO: Implement actual DSP hardware update
    // await this.updateDSPHardware(bankName, [])
  }

  async createFilterBank(bankName: string): Promise<void> {
    await this.initialize()

    if (this.filterBanks[bankName]) {
      throw new Error(`Filter bank '${bankName}' already exists`)
    }

    this.filterBanks[bankName] = {
      name: bankName,
      filters: [],
      maxFilters: 8 // Default value for manually created banks
      // No baseAddress for manually created banks
    }

    console.log(`DSP Toolkit: Created new filter bank '${bankName}'`, {
      // TODO: Here would be the actual DSP hardware configuration
      note: 'Hardware configuration not yet implemented'
    })
  }

  async removeFilterBank(bankName: string): Promise<boolean> {
    await this.initialize()

    if (!this.filterBanks[bankName]) {
      return false
    }

    delete this.filterBanks[bankName]

    console.log(`DSP Toolkit: Removed filter bank '${bankName}'`, {
      // TODO: Here would be the actual DSP hardware configuration
      note: 'Hardware configuration not yet implemented'
    })

    return true
  }

  async exportFilterConfig(): Promise<FilterBanks> {
    await this.initialize()

    // Convert ExtendedFilterBanks to FilterBanks (remove maxFilters)
    const result: FilterBanks = {}
    for (const [bankName, bank] of Object.entries(this.filterBanks)) {
      result[bankName] = {
        name: bank.name,
        filters: bank.filters
      }
    }
    return result
  }

  async importFilterConfig(config: FilterBanks): Promise<void> {
    await this.initialize()

    // Validate the imported configuration
    for (const [bankName, bank] of Object.entries(config)) {
      // Use existing bank's maxFilters or default to 8
      const existingBank = this.filterBanks[bankName]
      const maxFilters = existingBank?.maxFilters || 8
      if (bank.filters.length > maxFilters) {
        throw new Error(`Import failed: Bank '${bankName}' has ${bank.filters.length} filters, but maximum is ${maxFilters}`)
      }
    }

    // Import the configuration, preserving maxFilters from existing banks
    for (const [bankName, bank] of Object.entries(config)) {
      const existingBank = this.filterBanks[bankName]
      this.filterBanks[bankName] = {
        name: bank.name,
        filters: JSON.parse(JSON.stringify(bank.filters)),
        maxFilters: existingBank?.maxFilters || 8,
        baseAddress: existingBank?.baseAddress // Preserve baseAddress if it exists
      }
    }

    console.log('DSP Toolkit: Imported filter configuration', {
      bankCount: Object.keys(config).length,
      totalFilters: Object.values(config).reduce((sum, bank) => sum + bank.filters.length, 0),
      // TODO: Here would be the actual DSP hardware update
      note: 'Hardware update not yet implemented'
    })

    // TODO: Implement actual DSP hardware update for all banks
    // for (const [bankName, bank] of Object.entries(this.filterBanks)) {
    //   await this.updateDSPHardware(bankName, bank.filters)
    // }
  }

  async getCurrentConfig(): Promise<FilterBanks> {
    await this.initialize()
    return this.exportFilterConfig()
  }

  /**
   * TODO: Implement actual DSP hardware communication
   * This method would translate our filter representation to DSP-specific
   * biquad coefficients and write them to the appropriate DSP memory addresses
   */
  // private async updateDSPHardware(bankName: string, filters: Filter[]): Promise<void> {
  //   // Implementation would:
  //   // 1. Convert Filter objects to DSP biquad coefficients
  //   // 2. Calculate appropriate memory addresses for the bank
  //   // 3. Use DSP Toolkit API to write coefficients to hardware
  //   // 4. Handle error cases and validation
  // }
}
