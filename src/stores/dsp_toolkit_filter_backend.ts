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
  type CacheStatus,
  setBiquadFilter,
  getStoredFilters,
  storeFilters,
  type DSPFilter,
  type FilterCoefficients,
  type BiquadRequest,
  getDSPProgramChecksum,
  type StoredFilter
} from '@/api/dsptoolkit'
import { useDSPToolkitStore } from './dsp-toolkit'

// Extended FilterBank interface with maxFilters information
interface ExtendedFilterBank extends FilterBank {
  maxFilters: number
  baseAddress?: number // Memory base address for DSP hardware
  metadataKey?: string // Original metadata key for this bank
}

// Extended FilterBanks interface
interface ExtendedFilterBanks {
  [bankName: string]: ExtendedFilterBank
}

// Filter bank name mapping: UI names -> DSP profile metadata keys
const FILTER_BANK_MAPPING: Record<string, string> = {
  'left': 'customFilterRegisterBankLeft',
  'right': 'customFilterRegisterBankRight'
  // Additional mappings can be added here for other filter banks
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

      // Load existing filters from the DSP filter store
      await this.loadStoredFilters()

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

    const metadata = this.metadata as Record<string, unknown>

    // Use the mapping to find the correct metadata keys
    for (const [uiName, metadataKey] of Object.entries(FILTER_BANK_MAPPING)) {
      const bankValue = metadata[metadataKey]

      if (bankValue && typeof bankValue === 'string') {
        const displayName = uiName === 'left' ? 'Left Channel' : 'Right Channel'
        const bankInfo = this.parseFilterBankInfo(bankValue, displayName)

        if (bankInfo) {
          // Store the metadata key for later use in hardware communication
          bankInfo.metadataKey = metadataKey
          this.filterBanks[uiName] = bankInfo
          console.log(`Parsed ${uiName} filter bank: ${metadataKey} = ${bankValue} -> ${bankInfo.maxFilters} filters at address ${bankInfo.baseAddress}`)
        }
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
        // Store the original metadata key for hardware communication
        bankInfo.metadataKey = key
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

  /**
   * Load stored filters from the DSP filter store for the current profile
   */
  private async loadStoredFilters(): Promise<void> {
    try {
      // Get stored filters for the current DSP profile
      const storedFilters = await getStoredFilters({ current: true })

      if (!storedFilters.filters) {
        console.log('DSP Filter Store: No stored filters found for current profile')
        return
      }

      // Convert stored filters back to our internal format and populate filter banks
      for (const [filterKey, storedFilter] of Object.entries(storedFilters.filters)) {
        const bankName = this.getBankNameFromMetadataKey(storedFilter.address)
        if (bankName && this.filterBanks[bankName]) {
          const internalFilter = this.convertDSPFilterToInternalFormat(storedFilter, filterKey)
          if (internalFilter) {
            // Insert filter at the correct position based on offset
            this.filterBanks[bankName].filters[storedFilter.offset] = internalFilter
          }
        }
      }

      console.log('DSP Filter Store: Loaded stored filters for current profile', {
        checksum: storedFilters.checksum,
        filterCount: Object.keys(storedFilters.filters).length
      })
    } catch (error) {
      // Don't fail initialization if we can't load stored filters
      console.warn('Failed to load stored filters:', error)
    }
  }

  /**
   * Get the internal bank name from a metadata key
   */
  private getBankNameFromMetadataKey(metadataKey: string): string | null {
    // Check the mapping in reverse
    for (const [bankName, mappedKey] of Object.entries(FILTER_BANK_MAPPING)) {
      if (mappedKey === metadataKey) {
        return bankName
      }
    }

    // For IIR banks, convert from IIR_A to iir_a
    if (metadataKey.startsWith('IIR_')) {
      return metadataKey.toLowerCase()
    }

    return null
  }

  /**
   * Convert DSP filter format back to our internal format
   */
  private convertDSPFilterToInternalFormat(storedFilter: StoredFilter, filterKey: string): Filter | null {
    const filter = storedFilter.filter

    // Handle direct coefficients (unsupported for now)
    if ('a0' in filter) {
      console.warn(`Direct coefficient filters not supported for reconstruction: ${filterKey}`)
      return null
    }

    // Convert typed filters
    const baseFilter = {
      id: filterKey,
      enabled: true,
      frequency: 'f' in filter ? filter.f : 1000
    }

    switch (filter.type) {
      case 'PeakingEq':
        return {
          ...baseFilter,
          type: 'peak',
          gain: filter.db,
          q: filter.q
        }
      case 'HighPass':
        return {
          ...baseFilter,
          type: 'highpass',
          gain: filter.db,
          q: filter.q
        }
      case 'LowPass':
        return {
          ...baseFilter,
          type: 'lowpass',
          gain: filter.db,
          q: filter.q
        }
      case 'HighShelf':
        return {
          ...baseFilter,
          type: 'shelf-high',
          gain: filter.db
        }
      case 'LowShelf':
        return {
          ...baseFilter,
          type: 'shelf-low',
          gain: filter.db
        }
      case 'Volume':
        // Volume filters are typically transparent and not useful to reconstruct
        console.log(`Skipping volume filter reconstruction: ${filterKey}`)
        return null
      default:
        console.warn(`Unknown DSP filter type for reconstruction: ${filter}`)
        return null
    }
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
      note: 'Updated DSP hardware'
    })

    // Update DSP hardware with the new filter configuration
    await this.updateDSPHardware(bankName, bank.filters)

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
      note: 'Updated DSP hardware'
    })

    // Update DSP hardware with the updated filter configuration
    await this.updateDSPHardware(bankName, bank.filters)

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
      note: 'Updated DSP hardware'
    })

    // Update DSP hardware with the updated filter configuration
    await this.updateDSPHardware(bankName, bank.filters)

    return true
  }

  async clearFiltersFromBank(bankName: string): Promise<void> {
    await this.initialize()

    if (!this.filterBanks[bankName]) {
      throw new Error(`Filter bank '${bankName}' not found`)
    }

    this.filterBanks[bankName].filters = []

    console.log(`DSP Toolkit: Cleared all filters from ${bankName} bank`, {
      note: 'Updated DSP hardware'
    })

    // Update DSP hardware with empty filter configuration
    await this.updateDSPHardware(bankName, [])
  }

  async createFilterBank(bankName: string): Promise<void> {
    await this.initialize()

    if (this.filterBanks[bankName]) {
      console.log(`DSP Toolkit: Filter bank '${bankName}' already exists, skipping creation`)
      return
    }

    this.filterBanks[bankName] = {
      name: bankName,
      filters: [],
      maxFilters: 8 // Default value for manually created banks
      // No baseAddress for manually created banks
    }

    console.log(`DSP Toolkit: Created new filter bank '${bankName}'`, {
      note: 'Manually created bank - no hardware configuration needed'
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
      note: 'Updated DSP hardware'
    })

    // Update DSP hardware for all imported banks
    for (const [bankName, bank] of Object.entries(this.filterBanks)) {
      await this.updateDSPHardware(bankName, bank.filters)
    }
  }

  async getCurrentConfig(): Promise<FilterBanks> {
    await this.initialize()
    return this.exportFilterConfig()
  }

  /**
   * Update DSP hardware with the current filter configuration
   * This method translates our filter representation to DSP-specific
   * biquad coefficients and writes them to the appropriate DSP memory addresses
   */
  private async updateDSPHardware(bankName: string, filters: Filter[]): Promise<void> {
    await this.initialize()

    const bank = this.filterBanks[bankName]
    if (!bank) {
      throw new Error(`Filter bank '${bankName}' not found`)
    }

    // Get the metadata key for this filter bank
    const metadataKey = bank.metadataKey || this.getMetadataKeyForBank(bankName)
    if (!metadataKey) {
      console.warn(`No metadata key found for bank '${bankName}', skipping hardware update`)
      return
    }

    try {
      // Clear all existing filters in the bank by writing empty filters
      const maxFilters = bank.maxFilters
      for (let i = 0; i < maxFilters; i++) {
        if (i < filters.length) {
          // Write the actual filter
          const filter = filters[i]
          const dspFilter = this.convertFilterToDSPFormat(filter)

          const biquadRequest: BiquadRequest = {
            address: metadataKey,
            offset: i,
            sampleRate: this.metadata?._system?.sampleRate || 48000,
            filter: dspFilter
          }

          await setBiquadFilter(biquadRequest)
          console.log(`DSP Hardware: Wrote ${filter.type} filter to ${metadataKey}[${i}]`, {
            frequency: filter.frequency,
            gain: filter.gain,
            q: filter.q
          })
        } else {
          // Clear unused filter slots with a transparent filter
          const transparentFilter: FilterCoefficients = {
            a0: 1.0, a1: 0.0, a2: 0.0,
            b0: 1.0, b1: 0.0, b2: 0.0
          }

          const biquadRequest: BiquadRequest = {
            address: metadataKey,
            offset: i,
            sampleRate: this.metadata?._system?.sampleRate || 48000,
            filter: transparentFilter
          }

          await setBiquadFilter(biquadRequest)
        }
      }

      // Store filters in the DSP filter store for persistence
      await this.storeFiltersInDSP(bankName, filters)

      console.log(`DSP Hardware: Successfully updated ${filters.length} filters in ${bankName} bank`)
    } catch (error) {
      console.error(`DSP Hardware: Failed to update ${bankName} bank:`, error)
      throw new Error(`Failed to update DSP hardware for ${bankName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert our internal Filter format to DSP API format
   */
  private convertFilterToDSPFormat(filter: Filter): DSPFilter {
    // Convert our internal filter representation to the DSP API format
    switch (filter.type) {
      case 'peak':
        return {
          type: 'PeakingEq',
          f: filter.frequency,
          db: filter.gain || 0,
          q: filter.q || 1.0
        }
      case 'highpass':
        return {
          type: 'HighPass',
          f: filter.frequency,
          db: filter.gain || 0,
          q: filter.q || 0.707
        }
      case 'lowpass':
        return {
          type: 'LowPass',
          f: filter.frequency,
          db: filter.gain || 0,
          q: filter.q || 0.707
        }
      case 'shelf-high':
        return {
          type: 'HighShelf',
          f: filter.frequency,
          db: filter.gain || 0,
          slope: 1.0,
          gain: filter.gain || 0
        }
      case 'shelf-low':
        return {
          type: 'LowShelf',
          f: filter.frequency,
          db: filter.gain || 0,
          slope: 1.0,
          gain: filter.gain || 0
        }
      case 'bandpass':
      case 'bandstop':
      case 'allpass':
        // For unsupported filter types, create a transparent volume filter
        console.warn(`Filter type '${filter.type}' not directly supported by DSP API, using transparent filter`)
        return {
          type: 'Volume',
          db: 0
        }
      default:
        // Fallback to a transparent filter for unknown types
        console.warn(`Unknown filter type: ${filter.type}, using transparent filter`)
        return {
          type: 'Volume',
          db: 0
        }
    }
  }

  /**
   * Get the metadata key for a given filter bank name
   */
  private getMetadataKeyForBank(bankName: string): string | null {
    // First check the mapping
    const mappedKey = FILTER_BANK_MAPPING[bankName]
    if (mappedKey) {
      return mappedKey
    }

    // For IIR banks, convert back to original format (iir_a -> IIR_A)
    if (bankName.startsWith('iir_')) {
      return bankName.toUpperCase()
    }

    return null
  }

  /**
   * Store filters in the DSP filter store for persistence
   */
  private async storeFiltersInDSP(bankName: string, filters: Filter[]): Promise<void> {
    try {
      // Get current DSP program checksum for filter store identification
      const checksumResponse = await getDSPProgramChecksum()
      const checksum = checksumResponse.checksum

      const metadataKey = this.getMetadataKeyForBank(bankName)
      if (!metadataKey) {
        console.warn(`Cannot store filters for ${bankName}: no metadata key found`)
        return
      }

      // Convert filters to the format expected by the filter store
      const filtersToStore = filters.map((filter, index) => ({
        address: metadataKey,
        offset: index,
        filter: this.convertFilterToDSPFormat(filter)
      }))

      if (filtersToStore.length > 0) {
        await storeFilters({
          checksum,
          filters: filtersToStore
        })

        console.log(`DSP Filter Store: Stored ${filtersToStore.length} filters for ${bankName} (${checksum})`)
      }
    } catch (error) {
      // Don't throw error if filter store fails - hardware update is more important
      console.warn(`Failed to store filters in DSP filter store:`, error)
    }
  }
}
