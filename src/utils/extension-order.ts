import type { Extension, ExtensionState } from '@/api/extensions'

// An extension with an update waiting is the only entry on the Extensions page
// that asks the user to act, so it belongs at the top. Everything else ranks
// equal and keeps the order it arrived in, which is the server's alphabetical
// listing -- that only holds because the sort is stable, which
// Array.prototype.sort has been since ES2019.
const STATE_ORDER: Record<ExtensionState, number> = {
  upgradable: 0,
  installed: 1,
  available: 1,
}

const rank = (state: ExtensionState): number => STATE_ORDER[state] ?? 1

/** Upgradable first, otherwise input order preserved. Does not mutate. */
export const sortByUpgradeFirst = <T extends Pick<Extension, 'state'>>(
  extensions: readonly T[],
): T[] => [...extensions].sort((a, b) => rank(a.state) - rank(b.state))
