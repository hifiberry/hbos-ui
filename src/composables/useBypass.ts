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

  // Bypass is press-and-hold, so a quick tap fires startBypass() and
  // endBypass() back to back. Both write live hardware registers, and
  // without this chain the restore requests overtook the still-in-flight
  // bypass requests, leaving banks in the wrong state and popping the
  // output (hifiberry-os#626). Every hardware operation queues behind the
  // previous one.
  let pending: Promise<void> = Promise.resolve();

  function enqueue(operation: () => Promise<void>): Promise<void> {
    const next = pending.then(operation, operation);
    // Keep the chain alive even if an operation rejects.
    pending = next.catch(() => undefined);
    return next;
  }

  async function startBypass() {
    if (isBypassed.value || isDragging.value) return;

    isBypassed.value = true;

    const banksToBypass = getBanksToBypass();
    previousFilterStates.value = [...banksToBypass];

    return enqueue(async () => {
      try {
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
    });
  }

  async function endBypass() {
    if (!isBypassed.value) return;

    isBypassed.value = false;

    const banksToRestore = [...previousFilterStates.value];
    if (banksToRestore.length === 0) return;

    return enqueue(async () => {
      try {
        const restorePromises: Promise<FilterBypassSetResponse>[] = banksToRestore.map(bankName =>
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
    });
  }

  return {
    isBypassed,
    startBypass,
    endBypass,
  };
}
