import type { AasPlugin } from '@/api/aas'

/**
 * The balance plugin of the master: the one at its `output` stage, else at its
 * `mix` stage. The `analog` stage belongs to the analog input, never to the
 * master's balance.
 */
export function findBalancePlugin(plugins: AasPlugin[]): AasPlugin | null {
  for (const stage of ['1/output/', '1/mix/']) {
    const found = plugins.find((p) => p.type === 'balance' && p.id.startsWith(stage))
    if (found) return found
  }
  return null
}
