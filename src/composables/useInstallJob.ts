import { computed, onUnmounted, ref } from 'vue'
import {
  ExtensionsApiError,
  getExtensionJob,
  TERMINAL_PHASES,
  type ExtensionJob,
  type JobPhase,
} from '@/api/extensions'

const DEFAULT_INTERVAL_MS = 1000

// A job lives only in config-server's memory (JobRegistry._jobs is a plain
// dict), so it vanishes if that process restarts -- which an extension's own
// postinst can trigger part-way through its own install. A 404 therefore means
// "this job will never report again", not "try again in a second".
const MAX_CONSECUTIVE_FAILURES = 15

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
  let consecutiveFailures = 0
  const currentId = ref<string | null>(null)

  const phase = computed<JobPhase | null>(() => job.value?.phase ?? null)
  const percent = computed(() => job.value?.percent ?? 0)
  const log = computed(() => job.value?.log ?? [])
  const isDone = computed(() => phase.value === 'done')
  const isFailed = computed(() => phase.value === 'failed')
  const isRunning = computed(
    () => currentId.value !== null && phase.value !== null && !isTerminal(phase.value),
  )

  function isTerminal(value: JobPhase) {
    return TERMINAL_PHASES.includes(value)
  }

  function stop() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    currentId.value = null
  }

  /** End tracking with a failure the UI can actually show.
   *
   *  The real job is gone, so nothing will ever set a terminal phase for us.
   *  Without synthesising one the dialog keeps rendering the last phase it
   *  saw -- reporting "Configuring" indefinitely for work that already
   *  finished, with its Close button disabled because isRunning stays true. */
  function abandon(jobId: string, message: string) {
    error.value = message
    job.value = {
      id: jobId,
      package: job.value?.package ?? null,
      action: job.value?.action ?? 'install',
      phase: 'failed',
      percent: job.value?.percent ?? 0,
      exit_code: null,
      error: message,
      started_at: job.value?.started_at ?? 0,
      finished_at: null,
      log: job.value?.log ?? [],
    }
    stop()
  }

  async function poll(jobId: string) {
    try {
      const response = await getExtensionJob(jobId)
      // A newer track() (or stop()) may have superseded us while this was in flight.
      if (currentId.value !== jobId) return

      consecutiveFailures = 0
      job.value = response.data.job
      rebootRequired.value = response.data.reboot_required
      error.value = response.data.job.error

      if (isTerminal(response.data.job.phase)) {
        stop()
        return
      }
    } catch (e) {
      if (currentId.value !== jobId) return

      // The job is gone for good -- retrying cannot bring it back.
      if (e instanceof ExtensionsApiError && e.status === 404) {
        abandon(
          jobId,
          'Lost track of this job: the configuration server restarted while it ' +
            'was running. The operation itself may well have completed \u2014 the ' +
            'list below has been refreshed to show the current state.',
        )
        return
      }

      // Anything else may be a blip (a reload, a dropped connection), so keep
      // polling -- but not for ever, or an unreachable server looks identical
      // to work still in progress.
      consecutiveFailures += 1
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        abandon(
          jobId,
          `Lost contact with the configuration server (no response for ` +
            `${Math.round((MAX_CONSECUTIVE_FAILURES * intervalMs) / 1000)}s). ` +
            'The operation may still be running; refresh to see the current state.',
        )
        return
      }
    }

    if (currentId.value === jobId) {
      timer = setTimeout(() => poll(jobId), intervalMs)
    }
  }

  function track(jobId: string) {
    stop()
    currentId.value = jobId
    job.value = null
    rebootRequired.value = false
    error.value = null
    consecutiveFailures = 0
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
