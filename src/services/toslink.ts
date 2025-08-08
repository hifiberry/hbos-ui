import { check_dsp_toolkit, getMetadata, readMemory, writeMemory } from '@/api/dsptoolkit'

export interface TOSLinkStatus {
  available: boolean;
  enabled: boolean;
  signalDetected: boolean;
  allowChange: boolean;
  error?: string;
  requiresDSP: boolean;
  sensitivity?: 'low' | 'medium' | 'high';
}

export interface TOSLinkConfig {
  displayName: string;
  providedBy: string;
  icon: string;
  registers: {
    enable: string;
    signalDetection: string;
    sensitivity: string;
  };
}

export interface TOSLinkRegisters {
  enableSPDIFRegister: string;
  readSPDIFOnRegister: string;
  sensitivitySPDIFRegister: string;
}

// Default configuration for TOSLink service
const TOSLINK_CONFIG: TOSLinkConfig = {
  displayName: 'TOSLink',
  providedBy: 'DSP',
  icon: 'toslink',
  registers: {
    enable: 'enableSPDIFRegister', // Metadata property name for enable memory address
    signalDetection: 'readSPDIFOnRegister', // Metadata property name for signal detection memory address
    sensitivity: 'sensitivitySPDIFRegister' // Metadata property name for sensitivity memory address
  }
};

// Sensitivity level mapping to float values
const SENSITIVITY_LEVELS = {
  low: 0.01,      // Low sensitivity
  medium: 0.001,  // Medium sensitivity (default)
  high: 0.00005   // High sensitivity
} as const;

// Reverse mapping from float values to sensitivity levels (sorted by value descending for matching)
const SENSITIVITY_VALUES = [
  { value: 0.01, level: 'low' },
  { value: 0.001, level: 'medium' },
  { value: 0.00005, level: 'high' }
] as const;

/**
 * Check DSP availability
 */
export async function checkDSPAvailability(): Promise<boolean> {
  try {
    const response = await check_dsp_toolkit();
    return response !== null && response.toString().length > 0;
  } catch (error) {
    console.error('Failed to check DSP availability:', error);
    return false;
  }
}

/**
 * Check if the TOSLink hardware is available through DSP metadata
 */
export async function checkTOSLinkAvailable(): Promise<boolean> {
  try {
    const dspAvailable = await checkDSPAvailability();
    if (!dspAvailable) {
      return false;
    }

    // Get metadata to check if SPDIF registers are defined
    const metadata = await getMetadata();

    // Check if the SPDIF register names exist in metadata
    return !!(metadata.enableSPDIFRegister && metadata.readSPDIFOnRegister && metadata.sensitivitySPDIFRegister);
  } catch (error) {
    console.error(`Failed to check TOSLink availability:`, error);
    return false;
  }
}

/**
 * Get comprehensive TOSLink status
 */
export async function getTOSLinkStatus(): Promise<TOSLinkStatus> {
  const status: TOSLinkStatus = {
    available: false,
    enabled: false,
    signalDetected: false,
    allowChange: false,
    requiresDSP: true
  };

  try {
    // First check if DSP hardware is available
    const dspAvailable = await checkDSPAvailability();

    if (!dspAvailable) {
      status.error = 'DSP sound card with TOSLink input required';
      status.available = false;
      status.allowChange = false;
      return status;
    }

    // Get DSP metadata to find the SPDIF register names
    const metadata = await getMetadata();
    console.log('[TOSLink getTOSLinkStatus] Metadata received:', metadata);
    console.log('[TOSLink getTOSLinkStatus] enableSPDIFRegister:', metadata.enableSPDIFRegister, typeof metadata.enableSPDIFRegister);
    console.log('[TOSLink getTOSLinkStatus] readSPDIFOnRegister:', metadata.readSPDIFOnRegister, typeof metadata.readSPDIFOnRegister);
    console.log('[TOSLink getTOSLinkStatus] sensitivitySPDIFRegister:', metadata.sensitivitySPDIFRegister, typeof metadata.sensitivitySPDIFRegister);

    if (!metadata.enableSPDIFRegister || !metadata.readSPDIFOnRegister || !metadata.sensitivitySPDIFRegister) {
      status.error = 'TOSLink memory addresses not available in DSP metadata';
      status.available = false;
      status.allowChange = false;
      return status;
    }

    status.available = true;
    status.allowChange = true;

    // Check if SPDIF is enabled by reading the enable memory address
    try {
      // Use decimal address directly from metadata
      const enableAddress = metadata.enableSPDIFRegister as string;
      console.log('[TOSLink getTOSLinkStatus] Reading enable address:', enableAddress, typeof enableAddress);
      const enabledResponse = await readMemory(enableAddress);
      console.log('[TOSLink getTOSLinkStatus] readMemory response for enable:', enabledResponse);
      if (enabledResponse && enabledResponse.values && enabledResponse.values.length > 0) {
        // Parse value as hex if it starts with "0x", otherwise as decimal
        const rawValue = enabledResponse.values[0] as string;
        const value = rawValue.startsWith('0x') ? parseInt(rawValue, 16) : parseInt(rawValue, 10);
        status.enabled = !isNaN(value) && value > 0;
        console.log('[TOSLink getTOSLinkStatus] Enable status - raw value:', rawValue, 'parsed:', value, 'enabled:', status.enabled);
      }
    } catch (error) {
      console.warn('[TOSLink getTOSLinkStatus] Failed to read SPDIF enable memory address:', error);
      status.enabled = false;
    }

    // Check if signal is detected by reading the signal detection memory address
    try {
      // Use decimal address directly from metadata
      const signalAddress = metadata.readSPDIFOnRegister as string;
      console.log('[TOSLink getTOSLinkStatus] Reading signal address:', signalAddress, typeof signalAddress);
      const signalResponse = await readMemory(signalAddress);
      console.log('[TOSLink getTOSLinkStatus] readMemory response for signal:', signalResponse);
      if (signalResponse && signalResponse.values && signalResponse.values.length > 0) {
        // Parse value as hex if it starts with "0x", otherwise as decimal
        const rawValue = signalResponse.values[0] as string;
        const value = rawValue.startsWith('0x') ? parseInt(rawValue, 16) : parseInt(rawValue, 10);
        status.signalDetected = !isNaN(value) && value > 0;
        console.log('[TOSLink getTOSLinkStatus] Signal status - raw value:', rawValue, 'parsed:', value, 'detected:', status.signalDetected);
      }
    } catch (error) {
      console.warn('[TOSLink getTOSLinkStatus] Failed to read SPDIF signal detection memory address:', error);
      status.signalDetected = false;
    }

        // Check current sensitivity level by reading the sensitivity memory address
    try {
      const currentSensitivity = await getTOSLinkSensitivity();
      status.sensitivity = currentSensitivity;
      console.log('[TOSLink getTOSLinkStatus] Current sensitivity level:', status.sensitivity);
    } catch (error) {
      console.warn('[TOSLink getTOSLinkStatus] Failed to read SPDIF sensitivity memory address:', error);
      status.sensitivity = 'medium'; // Default to medium if read fails
    }

  } catch (error) {
    console.error('Failed to get TOSLink status:', error);
    status.error = 'Failed to check TOSLink status';
    status.available = false;
    status.allowChange = false;
  }

  return status;
}

/**
 * Enable TOSLink input
 */
export async function enableTOSLink(): Promise<void> {
  const status = await getTOSLinkStatus();

  if (!status.available) {
    throw new Error(status.error || 'TOSLink is not available');
  }

  if (!status.allowChange) {
    throw new Error('Not allowed to change TOSLink state');
  }

  try {
    const metadata = await getMetadata();
    console.log('[TOSLink enableTOSLink] Metadata received:', metadata);
    console.log('[TOSLink enableTOSLink] enableSPDIFRegister:', metadata.enableSPDIFRegister, typeof metadata.enableSPDIFRegister);
    if (!metadata.enableSPDIFRegister) {
      throw new Error('Enable SPDIF memory address not found in metadata');
    }

    // Enable SPDIF by writing 1 to the enable memory address (use decimal address from metadata)
    const enableAddress = metadata.enableSPDIFRegister as string;
    console.log('[TOSLink enableTOSLink] Writing to address:', enableAddress, typeof enableAddress, 'value: 1');

    const writeRequest = {
      address: enableAddress,
      value: 1,
      store: true // Store this memory setting for auto-loading on startup
    };
    console.log('[TOSLink enableTOSLink] writeMemory request object:', writeRequest);

    await writeMemory(writeRequest);
    console.log('[TOSLink enableTOSLink] writeMemory completed successfully');
  } catch (error) {
    console.error('[TOSLink enableTOSLink] Failed to enable TOSLink:', error);
    throw new Error(`Failed to enable TOSLink: ${error}`);
  }
}

/**
 * Disable TOSLink input
 */
export async function disableTOSLink(): Promise<void> {
  const status = await getTOSLinkStatus();

  if (!status.available) {
    throw new Error(status.error || 'TOSLink is not available');
  }

  if (!status.allowChange) {
    throw new Error('Not allowed to change TOSLink state');
  }

  try {
    const metadata = await getMetadata();
    console.log('[TOSLink disableTOSLink] Metadata received:', metadata);
    console.log('[TOSLink disableTOSLink] enableSPDIFRegister:', metadata.enableSPDIFRegister, typeof metadata.enableSPDIFRegister);
    if (!metadata.enableSPDIFRegister) {
      throw new Error('Enable SPDIF memory address not found in metadata');
    }

    // Disable SPDIF by writing 0 to the enable memory address (use decimal address from metadata)
    const enableAddress = metadata.enableSPDIFRegister as string;
    console.log('[TOSLink disableTOSLink] Writing to address:', enableAddress, typeof enableAddress, 'value: 0');

    const writeRequest = {
      address: enableAddress,
      value: 0,
      store: true // Store this memory setting for auto-loading on startup
    };
    console.log('[TOSLink disableTOSLink] writeMemory request object:', writeRequest);

    await writeMemory(writeRequest);
    console.log('[TOSLink disableTOSLink] writeMemory completed successfully');
  } catch (error) {
    console.error('[TOSLink disableTOSLink] Failed to disable TOSLink:', error);
    throw new Error(`Failed to disable TOSLink: ${error}`);
  }
}

/**
 * Get current TOSLink input sensitivity level
 */
export async function getTOSLinkSensitivity(): Promise<'low' | 'medium' | 'high'> {
  try {
    const metadata = await getMetadata();
    if (!metadata.sensitivitySPDIFRegister) {
      throw new Error('Sensitivity SPDIF memory address not found in metadata');
    }

    // Read sensitivity as float value
    const sensitivityAddress = metadata.sensitivitySPDIFRegister as string;
    console.log('[TOSLink getTOSLinkSensitivity] Reading sensitivity address:', sensitivityAddress, 'as float');

    const sensitivityResponse = await readMemory(sensitivityAddress, undefined, 'float');
    console.log('[TOSLink getTOSLinkSensitivity] readMemory response for sensitivity:', sensitivityResponse);

    if (sensitivityResponse && sensitivityResponse.values && sensitivityResponse.values.length > 0) {
      const floatValue = parseFloat(sensitivityResponse.values[0] as string);
      console.log('[TOSLink getTOSLinkSensitivity] Float value:', floatValue);

      // Find the closest sensitivity level by calculating absolute differences
      let closestLevel: 'low' | 'medium' | 'high' = 'medium';
      let smallestDifference = Infinity;
      
      for (const { value, level } of SENSITIVITY_VALUES) {
        const difference = Math.abs(floatValue - value);
        console.log('[TOSLink getTOSLinkSensitivity] Comparing', floatValue, 'with', level, '(', value, ') - difference:', difference);
        
        if (difference < smallestDifference) {
          smallestDifference = difference;
          closestLevel = level;
        }
      }
      
      console.log('[TOSLink getTOSLinkSensitivity] Closest sensitivity level:', closestLevel, 'with difference:', smallestDifference);
      return closestLevel;
    }

    throw new Error('No sensitivity value returned from memory read');
  } catch (error) {
    console.error('[TOSLink getTOSLinkSensitivity] Failed to get TOSLink sensitivity:', error);
    return 'medium'; // Default fallback
  }
}

/**
 * Set TOSLink input sensitivity level
 */
export async function setTOSLinkSensitivity(sensitivity: 'low' | 'medium' | 'high'): Promise<void> {
  const status = await getTOSLinkStatus();

  if (!status.available) {
    throw new Error(status.error || 'TOSLink is not available');
  }

  if (!status.allowChange) {
    throw new Error('Not allowed to change TOSLink state');
  }

  try {
    const metadata = await getMetadata();
    console.log('[TOSLink setTOSLinkSensitivity] Metadata received:', metadata);
    console.log('[TOSLink setTOSLinkSensitivity] sensitivitySPDIFRegister:', metadata.sensitivitySPDIFRegister, typeof metadata.sensitivitySPDIFRegister);
    if (!metadata.sensitivitySPDIFRegister) {
      throw new Error('Sensitivity SPDIF memory address not found in metadata');
    }

    // Get the float value for the sensitivity level
    const sensitivityValue = SENSITIVITY_LEVELS[sensitivity];
    const sensitivityAddress = metadata.sensitivitySPDIFRegister as string;
    console.log('[TOSLink setTOSLinkSensitivity] Writing to address:', sensitivityAddress, typeof sensitivityAddress, 'value:', sensitivityValue, 'sensitivity:', sensitivity);

    const writeRequest = {
      address: sensitivityAddress,
      value: sensitivityValue, // Float value (0.01, 0.001, or 0.00005)
      store: true // Store this memory setting for auto-loading on startup
    };
    console.log('[TOSLink setTOSLinkSensitivity] writeMemory request object:', writeRequest);

    await writeMemory(writeRequest);
    console.log('[TOSLink setTOSLinkSensitivity] writeMemory completed successfully');
  } catch (error) {
    console.error('[TOSLink setTOSLinkSensitivity] Failed to set TOSLink sensitivity:', error);
    throw new Error(`Failed to set TOSLink sensitivity: ${error}`);
  }
}

export { TOSLINK_CONFIG };
