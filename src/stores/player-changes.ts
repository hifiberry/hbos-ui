import { defineStore } from 'pinia'

export const usePlayerChangesStore = defineStore('player-changes', () => {

  /**
   * Handle when the current player changes
   * @param {string} oldPlayerName - The name of the previous player
   * @param {string} newPlayerName - The name of the new current player
   */
  const player_changed = (oldPlayerName: string | null, newPlayerName: string | null) => {
    console.log('Player changed:', { from: oldPlayerName, to: newPlayerName })

    // TODO: Implement player change handling logic
  }

  return {
    // Actions
    player_changed,
  }
})
