/**
 * Composable for managing filter bank bypass (A/B comparison).
 * Supports momentary bypass via mouse/touch or spacebar.
 *
 * Accepts a getBanksToBypass function that returns the bank addresses
 * to bypass based on current channel/mode state.
 */

import { ref, type Ref } from 'vue';
import {
  setFilterBankBypassState,
  type FilterBypassSetResponse
} from '@/api/dsptoolkit';

/**
 * Generic bypass composable.
 * @param getBanksToBypass - Returns list of bank addresses to bypass
 * @param isDragging - Ref indicating if user is dragging a filter (suppresses bypass)
 */
export function useBypass(
  getBanksToBypass: () => string[],
  isDragging: Ref<boolean>
) {
  const isBypassed = ref(false);
  const previousFilterStates = ref<string[]>([]);

  async function startBypass() {
    if (isBypassed.value || isDragging.value) return;

    isBypassed.value = true;

    try {
      const banksToBypass = getBanksToBypass();

      previousFilterStates.value = [...banksToBypass];

      const bypassPromises: Promise<FilterBypassSetResponse>[] = banksToBypass.map(bankName =>
        setFilterBankBypassState(bankName, true).catch((error: Error) => {
          console.error(`Failed to bypass filter bank ${bankName}:`, error);
          throw error;
        })
      );

      await Promise.all(bypassPromises);
    } catch (error) {
      console.error('Failed to start bypass:', error);
      isBypassed.value = false;
    }
  }

  async function endBypass() {
    if (!isBypassed.value) return;

    isBypassed.value = false;

    if (previousFilterStates.value.length === 0) return;

    try {
      const restorePromises: Promise<FilterBypassSetResponse>[] = previousFilterStates.value.map(bankName =>
        setFilterBankBypassState(bankName, false).catch((error: Error) => {
          console.error(`Failed to restore filter bank ${bankName}:`, error);
          throw error;
        })
      );

      await Promise.all(restorePromises);
      previousFilterStates.value = [];
    } catch (error) {
      console.error('Failed to end bypass:', error);
    }
  }

  return {
    isBypassed,
    startBypass,
    endBypass,
  };
}
