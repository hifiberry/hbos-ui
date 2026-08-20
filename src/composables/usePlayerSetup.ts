import { computed, ref, watch, type Ref } from 'vue'
import { getSetupStatus, type PlayerSetupStatus } from '@/api/player-setup'

/**
 * Tracks whether a player that owns an installation step is actually ready.
 *
 * Lives on the card rather than inside the setup panel because the panel only
 * exists while the card is expanded. A collapsed card was therefore silent:
 * the toggle could be switched on for a player whose binary had never been
 * downloaded, and since start-soloist exits 0 in that state, systemd reports
 * inactive rather than failed and nothing surfaces the reason.
 */
export function usePlayerSetup(
  baseUrl: Ref<string | null | undefined>,
  credentialsSet: Ref<boolean>,
) {
  const status = ref<PlayerSetupStatus | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    const url = baseUrl.value
    if (!url) {
      status.value = null
      return
    }
    loading.value = true
    try {
      status.value = await getSetupStatus(url)
      error.value = null
    } catch (e) {
      // Leave the last known status in place: a dropped request is not
      // evidence that setup regressed.
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * True only when we KNOW setup is unfinished.
   *
   * Deliberately null while unknown -- no setup declared, not fetched yet, or
   * the provider unreachable. Callers gate on `=== true`, so a provider we
   * cannot reach never disables a control that would otherwise work: being
   * unable to check is not the same as knowing it will fail.
   */
  const setupIncomplete = computed<boolean | null>(() => {
    if (!baseUrl.value) return null
    if (status.value === null) return null
    return !status.value.binary_installed || !credentialsSet.value
  })

  const needsBinary = computed(() => status.value?.binary_installed === false)

  watch(baseUrl, refresh, { immediate: true })

  return { status, loading, error, refresh, setupIncomplete, needsBinary }
}
