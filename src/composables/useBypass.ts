/**
 * Composable for managing filter bank bypass (A/B comparison).
 * Supports momentary bypass via mouse/touch or spacebar.
 */

import { ref, type Ref } from 'vue';
import {
  setFilterBankBypassState,
  type FilterBypassSetResponse
} from '@/api/dsptoolkit';

type Channel = 'left' | 'right';
type ChannelMode = 'individual' | 'both';

export function useBypass(
  activeChannel: Ref<Channel>,
  channelMode: Ref<ChannelMode>,
  isDragging: Ref<boolean>
) {
  const isBypassed = ref(false);
  const previousFilterStates = ref<string[]>([]);

  async function startBypass() {
    if (isBypassed.value || isDragging.value) return;

    isBypassed.value = true;

    try {
      const banksToBypass: string[] = [];

      if (channelMode.value === 'both') {
        banksToBypass.push('customFilterRegisterBankLeft', 'customFilterRegisterBankRight');
      } else {
        const bankName = activeChannel.value === 'left'
          ? 'customFilterRegisterBankLeft'
          : 'customFilterRegisterBankRight';
        banksToBypass.push(bankName);
      }

      previousFilterStates.value = [...banksToBypass];

      const bypassPromises: Promise<FilterBypassSetResponse>[] = banksToBypass.map(bankName =>
        setFilterBankBypassState(bankName, true).catch((error: Error) => {
          console.error(`speaker-equalizer: Failed to bypass filter bank ${bankName}:`, error);
          throw error;
        })
      );

      await Promise.all(bypassPromises);
    } catch (error) {
      console.error('speaker-equalizer: Failed to start bypass:', error);
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
          console.error(`speaker-equalizer: Failed to restore filter bank ${bankName}:`, error);
          throw error;
        })
      );

      await Promise.all(restorePromises);
      previousFilterStates.value = [];
    } catch (error) {
      console.error('speaker-equalizer: Failed to end bypass:', error);
    }
  }

  return {
    isBypassed,
    startBypass,
    endBypass,
  };
}
