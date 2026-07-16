import { computed, onUnmounted, ref } from 'vue'
import {
  getExtensionJob,
  TERMINAL_PHASES,
  type ExtensionJob,
  type JobPhase,
} from '@/api/extensions'

const DEFAULT_INTERVAL_MS = 1000

/**
 * Poll an extension install job to completion.
 *
 * Installs outlive nginx's 60s proxy timeout, so the API hands back a job id
 * and we poll it. Polling (rather than a stream) also survives a page reload
 * mid-install.
 */
export function useInstallJob(options: { intervalMs?: number } = {}) {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS

  const job = ref<ExtensionJob | null>(null)
  const rebootRequired = ref(false)
  const error = ref<string | null>(null)

  let timer: ReturnType<typeof setTimeout> | null = null
  let currentId: string | null = null

  const phase = computed<JobPhase | null>(() => job.value?.phase ?? null)
  const percent = computed(() => job.value?.percent ?? 0)
  const log = computed(() => job.value?.log ?? [])
  const isDone = computed(() => phase.value === 'done')
  const isFailed = computed(() => phase.value === 'failed')
  const isRunning = computed(
    () => currentId !== null && phase.value !== null && !isTerminal(phase.value),
  )

  function isTerminal(value: JobPhase) {
    return TERMINAL_PHASES.includes(value)
  }

  function stop() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  async function poll(jobId: string) {
    try {
      const response = await getExtensionJob(jobId)
      // A newer track() may have superseded us while this was in flight.
      if (currentId !== jobId) return

      job.value = response.data.job
      rebootRequired.value = response.data.reboot_required
      error.value = response.data.job.error

      if (isTerminal(response.data.job.phase)) {
        stop()
        return
      }
    } catch {
      // A transient blip must not abandon a running install; keep polling.
    }

    if (currentId === jobId) {
      timer = setTimeout(() => poll(jobId), intervalMs)
    }
  }

  function track(jobId: string) {
    stop()
    currentId = jobId
    job.value = null
    rebootRequired.value = false
    error.value = null
    void poll(jobId)
  }

  onUnmounted(stop)

  return {
    job,
    phase,
    percent,
    log,
    isRunning,
    isDone,
    isFailed,
    rebootRequired,
    error,
    track,
    stop,
  }
}
