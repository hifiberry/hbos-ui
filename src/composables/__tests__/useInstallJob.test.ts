import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { getExtensionJob } = vi.hoisted(() => ({ getExtensionJob: vi.fn() }))
vi.mock('@/api/extensions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/extensions')>()
  return { ...actual, getExtensionJob }
})

import { useInstallJob } from '@/composables/useInstallJob'

const jobResponse = (phase: string, percent = 0, extra: Record<string, unknown> = {}) => ({
  status: 'success',
  data: {
    job: {
      id: 'j1',
      package: 'hifiberry-tidal-connect',
      action: 'install',
      phase,
      percent,
      exit_code: phase === 'done' ? 0 : null,
      error: null,
      started_at: 0,
      finished_at: null,
      log: ['building image'],
      ...extra,
    },
    reboot_required: false,
  },
})

// Let pending promise callbacks run between timer ticks.
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('useInstallJob', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    getExtensionJob.mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fetches the job immediately on track', async () => {
    getExtensionJob.mockResolvedValue(jobResponse('downloading', 20))
    const { track, phase, percent } = useInstallJob()

    track('j1')
    await flush()

    expect(getExtensionJob).toHaveBeenCalledWith('j1')
    expect(phase.value).toBe('downloading')
    expect(percent.value).toBe(20)
  })

  it('keeps polling while the job is running', async () => {
    getExtensionJob.mockResolvedValue(jobResponse('installing', 50))
    const { track } = useInstallJob({ intervalMs: 1000 })

    track('j1')
    await flush()
    expect(getExtensionJob).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)
    expect(getExtensionJob).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1000)
    expect(getExtensionJob).toHaveBeenCalledTimes(3)
  })

  it('stops polling once the job is done', async () => {
    getExtensionJob.mockResolvedValue(jobResponse('done', 100))
    const { track, isDone, isRunning } = useInstallJob({ intervalMs: 1000 })

    track('j1')
    await flush()

    expect(isDone.value).toBe(true)
    expect(isRunning.value).toBe(false)

    await vi.advanceTimersByTimeAsync(5000)
    expect(getExtensionJob).toHaveBeenCalledTimes(1)
  })

  it('stops polling once the job failed and exposes the error', async () => {
    getExtensionJob.mockResolvedValue(
      jobResponse('failed', 100, { error: 'exit code 100' }),
    )
    const { track, isFailed, error } = useInstallJob({ intervalMs: 1000 })

    track('j1')
    await flush()

    expect(isFailed.value).toBe(true)
    expect(error.value).toBe('exit code 100')

    await vi.advanceTimersByTimeAsync(5000)
    expect(getExtensionJob).toHaveBeenCalledTimes(1)
  })

  it('exposes the log', async () => {
    getExtensionJob.mockResolvedValue(jobResponse('installing', 50))
    const { track, log } = useInstallJob()

    track('j1')
    await flush()

    expect(log.value).toEqual(['building image'])
  })

  it('exposes reboot_required', async () => {
    getExtensionJob.mockResolvedValue({
      status: 'success',
      data: { job: { ...jobResponse('done', 100).data.job }, reboot_required: true },
    })
    const { track, rebootRequired } = useInstallJob()

    track('j1')
    await flush()

    expect(rebootRequired.value).toBe(true)
  })

  it('stop() halts polling', async () => {
    getExtensionJob.mockResolvedValue(jobResponse('installing', 50))
    const { track, stop } = useInstallJob({ intervalMs: 1000 })

    track('j1')
    await flush()
    stop()

    await vi.advanceTimersByTimeAsync(5000)
    expect(getExtensionJob).toHaveBeenCalledTimes(1)
  })

  it('keeps polling after a transient fetch error', async () => {
    getExtensionJob
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValue(jobResponse('done', 100))
    const { track, isDone } = useInstallJob({ intervalMs: 1000 })

    track('j1')
    await flush()
    expect(isDone.value).toBe(false)

    await vi.advanceTimersByTimeAsync(1000)
    expect(isDone.value).toBe(true)
  })

  it('tracking a new job resets previous state', async () => {
    getExtensionJob.mockResolvedValue(jobResponse('failed', 100, { error: 'boom' }))
    const { track, error } = useInstallJob()
    track('j1')
    await flush()
    expect(error.value).toBe('boom')

    getExtensionJob.mockResolvedValue(jobResponse('downloading', 5))
    track('j2')
    expect(error.value).toBeNull()
  })
})
