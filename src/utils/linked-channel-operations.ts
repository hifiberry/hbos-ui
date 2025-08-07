/**
 * Utility functions for managing linked channel operations in audio equalizers.
 * 
 * This module provides reusable functionality for synchronizing filter operations
 * across multiple audio channels when they are linked/grouped together.
 */

import type { Filter } from '@/utils/filtercalc';
import { setIndividualFilterBypassState } from '@/api/dsptoolkit';

export interface ChannelFilterArrays {
  [channelName: string]: Filter[];
}

export interface ChannelBankAddresses {
  [channelName: string]: string;
}

export type ChannelMode = 'individual' | 'both';

/**
 * Configuration for linked channel operations
 */
export interface LinkedChannelConfig {
  channelMode: ChannelMode;
  activeChannel: string;
  channelArrays: ChannelFilterArrays;
  bankAddresses: ChannelBankAddresses;
  updateStoreCallback?: (channelName: string, filterIndex: number, filter: Filter) => Promise<void>;
  addStoreCallback?: (channelName: string, filterIndex: number, filter: Filter) => Promise<void>;
  removeStoreCallback?: (channelName: string, filterIndex: number) => Promise<void>;
  clearStoreCallback?: (channelName: string) => Promise<void>;
}

/**
 * Determines which channels should be affected by an operation
 */
export function getTargetChannels(
  channelMode: ChannelMode,
  activeChannel: string,
  availableChannels?: string[]
): string[] {
  if (channelMode === 'both') {
    // When in both mode, affect all available channels
    return availableChannels || ['left', 'right'];
  } else {
    // When in individual mode, affect only the active channel
    return [activeChannel];
  }
}

/**
 * Applies a function to filters across multiple channels
 */
export async function applyToLinkedChannels<T extends Filter>(
  config: LinkedChannelConfig,
  filterId: number,
  updateFn: (filter: T, channelName: string, filterIndex: number) => void | Promise<void>,
  targetChannels?: string[]
): Promise<void> {
  const channelsToUpdate = targetChannels || getTargetChannels(
    config.channelMode,
    config.activeChannel,
    Object.keys(config.channelArrays)
  );

  const updatePromises: Promise<void>[] = [];

  for (const channelName of channelsToUpdate) {
    const filters = config.channelArrays[channelName];
    if (!filters) {
      console.warn(`[Linked Channels] Unknown channel: ${channelName}`);
      continue;
    }

    const filter = filters.find(f => f.id === filterId);
    if (filter) {
      const filterIndex = filters.findIndex(f => f.id === filterId);
      if (filterIndex !== -1) {
        // Apply the update function
        const result = updateFn(filter as T, channelName, filterIndex);
        
        // Handle both sync and async update functions
        const updatePromise = Promise.resolve(result).then(async () => {
          // Update the backend store if callback is provided
          if (config.updateStoreCallback) {
            await config.updateStoreCallback(channelName, filterIndex, filter);
          }
        });
        
        updatePromises.push(updatePromise);
      }
    }
  }

  await Promise.all(updatePromises);
}

/**
 * Adds a new filter to linked channels
 */
export async function addFilterToLinkedChannels(
  config: LinkedChannelConfig,
  newFilter: Filter,
  targetChannels?: string[]
): Promise<void> {
  const channelsToUpdate = targetChannels || getTargetChannels(
    config.channelMode,
    config.activeChannel,
    Object.keys(config.channelArrays)
  );

  const addPromises: Promise<void>[] = [];

  for (const channelName of channelsToUpdate) {
    const filters = config.channelArrays[channelName];
    if (!filters) {
      console.warn(`[Linked Channels] Unknown channel: ${channelName}`);
      continue;
    }

    // Create a copy of the filter for this channel (with same ID for linked operations)
    const filterCopy: Filter = { ...newFilter };
    filters.push(filterCopy);

    // Update the backend store if callback is provided
    if (config.addStoreCallback) {
      const addPromise = config.addStoreCallback(channelName, filters.length - 1, filterCopy);
      addPromises.push(addPromise);
    }
  }

  await Promise.all(addPromises);
}

/**
 * Removes a filter from linked channels
 */
export async function removeFilterFromLinkedChannels(
  config: LinkedChannelConfig,
  filterId: number,
  targetChannels?: string[]
): Promise<void> {
  const channelsToUpdate = targetChannels || getTargetChannels(
    config.channelMode,
    config.activeChannel,
    Object.keys(config.channelArrays)
  );

  const removePromises: Promise<void>[] = [];

  for (const channelName of channelsToUpdate) {
    const filters = config.channelArrays[channelName];
    if (!filters) {
      console.warn(`[Linked Channels] Unknown channel: ${channelName}`);
      continue;
    }

    const filterIndex = filters.findIndex(f => f.id === filterId);
    if (filterIndex !== -1) {
      // Remove the filter from the array
      filters.splice(filterIndex, 1);

      // Update the backend store if callback is provided
      if (config.removeStoreCallback) {
        const removePromise = config.removeStoreCallback(channelName, filterIndex);
        removePromises.push(removePromise);
      }
    }
  }

  await Promise.all(removePromises);
}

/**
 * Toggles the enabled state of a filter across linked channels with REST API bypass
 */
export async function toggleFilterEnabledLinked(
  config: LinkedChannelConfig,
  filterId: number,
  targetChannels?: string[]
): Promise<void> {
  const channelsToUpdate = targetChannels || getTargetChannels(
    config.channelMode,
    config.activeChannel,
    Object.keys(config.channelArrays)
  );

  // Find the filter to determine the new enabled state
  let newEnabledState: boolean | null = null;
  for (const channelName of channelsToUpdate) {
    const filters = config.channelArrays[channelName];
    const filter = filters?.find(f => f.id === filterId);
    if (filter) {
      newEnabledState = !filter.enabled;
      break;
    }
  }

  if (newEnabledState === null) {
    console.warn(`[Linked Channels] Filter ${filterId} not found in any channel`);
    return;
  }

  const bypassPromises: Promise<void>[] = [];

  for (const channelName of channelsToUpdate) {
    const filters = config.channelArrays[channelName];
    const bankAddress = config.bankAddresses[channelName];
    
    if (!filters || !bankAddress) {
      console.warn(`[Linked Channels] Missing filters or bank address for channel: ${channelName}`);
      continue;
    }

    const filter = filters.find(f => f.id === filterId);
    if (filter) {
      // Update UI state
      filter.enabled = newEnabledState;

      // Get the filter index (offset) within the channel
      const filterOffset = filters.findIndex(f => f.id === filterId);
      
      if (filterOffset !== -1) {
        // Update filter store
        if (config.updateStoreCallback) {
          await config.updateStoreCallback(channelName, filterOffset, filter);
        }
        
        // Call REST API to bypass/enable the individual filter in hardware
        // Note: bypassed = !enabled (when enabled=false, filter should be bypassed=true)
        const bypassPromise = setIndividualFilterBypassState(
          bankAddress,
          filterOffset,
          !newEnabledState, // bypassed is opposite of enabled
        ).then(response => {
          console.log(`Filter ${channelName}[${filterOffset}] ${newEnabledState ? 'enabled' : 'bypassed'} - ${response.message}`);
        }).catch(error => {
          console.error(`Failed to ${newEnabledState ? 'enable' : 'bypass'} filter ${channelName}[${filterOffset}]:`, error);
          // Revert UI state on error
          if (filter) {
            filter.enabled = !newEnabledState;
          }
          throw error;
        });

        bypassPromises.push(bypassPromise);
      }
    }
  }

  // Wait for all bypass operations to complete
  await Promise.all(bypassPromises);
}

/**
 * Copies filters from source channel to target channels (used when linking channels)
 */
export async function copyFiltersToChannels(
  config: LinkedChannelConfig,
  sourceChannelName: string,
  targetChannelNames: string[]
): Promise<void> {
  const sourceFilters = config.channelArrays[sourceChannelName];
  if (!sourceFilters) {
    console.warn(`[Linked Channels] Source channel ${sourceChannelName} not found`);
    return;
  }

  const copyPromises: Promise<void>[] = [];

  for (const targetChannelName of targetChannelNames) {
    if (targetChannelName === sourceChannelName) continue;

    const targetFilters = config.channelArrays[targetChannelName];
    if (!targetFilters) {
      console.warn(`[Linked Channels] Target channel ${targetChannelName} not found`);
      continue;
    }

    // Create deep copies with new IDs to avoid conflicts
    const copiedFilters = sourceFilters.map((filter, index) => ({
      ...filter,
      id: Date.now() + index + 1000 + (targetChannelName.charCodeAt(0) * 100) // Ensure unique IDs
    }));

    // Replace the target channel's filters
    config.channelArrays[targetChannelName] = copiedFilters;

    // Clear and rebuild the target channel in the backend
    const copyPromise = (async () => {
      if (config.clearStoreCallback) {
        await config.clearStoreCallback(targetChannelName);
      }

      if (config.addStoreCallback) {
        for (const [index, filter] of copiedFilters.entries()) {
          await config.addStoreCallback(targetChannelName, index, filter);
        }
      }
    })();

    copyPromises.push(copyPromise);
  }

  await Promise.all(copyPromises);
}

/**
 * Updates filter properties (frequency, gain, Q) across linked channels
 */
export async function updateFilterPropertyLinked(
  config: LinkedChannelConfig,
  filterId: number,
  propertyUpdater: (filter: Filter) => void,
  targetChannels?: string[]
): Promise<void> {
  await applyToLinkedChannels(
    config,
    filterId,
    (filter: Filter) => {
      propertyUpdater(filter);
    },
    targetChannels
  );
}

/**
 * Updates generic biquad coefficients across linked channels
 */
export async function updateGenericCoeffLinked(
  config: LinkedChannelConfig,
  filterId: number,
  coeffName: string,
  value: number,
  targetChannels?: string[]
): Promise<void> {
  await applyToLinkedChannels(
    config,
    filterId,
    (filter: Filter) => {
      // Initialize genericCoeffs if it doesn't exist
      if (!filter.genericCoeffs) {
        filter.genericCoeffs = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };
      }

      // Update the specific coefficient
      switch (coeffName) {
        case 'b0': filter.genericCoeffs.b0 = value; break;
        case 'b1': filter.genericCoeffs.b1 = value; break;
        case 'b2': filter.genericCoeffs.b2 = value; break;
        case 'a1': filter.genericCoeffs.a1 = value; break;
        case 'a2': filter.genericCoeffs.a2 = value; break;
      }
    },
    targetChannels
  );
}
