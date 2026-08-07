import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const showErrorToast = vi.fn()
vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({ showErrorToast, showSuccessToast: vi.fn(), showInfoToast: vi.fn() }),
}))

const getSupportInfo = vi.fn()
vi.mock('@/api/config', () => ({ getSupportInfo: () => getSupportInfo() }))

import { useSupportInfo } from '@/composables/useSupportInfo'

describe('useSupportInfo', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    })
  })

  it('stores the fetched report and clears loading', async () => {
    getSupportInfo.mockResolvedValue('## System\nPi Model: Pi 5\n')
    const { report, loading, fetchReport } = useSupportInfo()

    expect(loading.value).toBe(false)
    await fetchReport()

    expect(report.value).toContain('Pi Model: Pi 5')
    expect(loading.value).toBe(false)
  })

  it('reports a failure through the toast store and leaves the report empty', async () => {
    getSupportInfo.mockRejectedValue(new Error('boom'))
    const { report, loading, fetchReport } = useSupportInfo()

    await fetchReport()

    expect(report.value).toBeNull()
    expect(loading.value).toBe(false)
    expect(showErrorToast).toHaveBeenCalled()
  })

  it('reports a distinct message on 404, pointing at the pending restart/reboot', async () => {
    getSupportInfo.mockRejectedValue(new Error('Failed to get support report: 404 Not Found'))
    const { report, loading, fetchReport } = useSupportInfo()

    await fetchReport()

    expect(report.value).toBeNull()
    expect(loading.value).toBe(false)
    expect(showErrorToast).toHaveBeenCalledOnce()
    const message = showErrorToast.mock.calls[0][0]
    expect(message).toMatch(/restart|reboot/i)
    expect(message).not.toBe('Could not collect the support report')
  })

  it('downloads the already fetched text without fetching again', async () => {
    getSupportInfo.mockResolvedValue('report body')
    const clickSpy = vi.fn()
    const anchor = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)

    const { fetchReport, downloadReport } = useSupportInfo()
    await fetchReport()
    downloadReport()

    expect(clickSpy).toHaveBeenCalledOnce()
    expect(getSupportInfo).toHaveBeenCalledOnce()
    expect(anchor.download).toMatch(/^hifiberry-supportinfo-\d{4}-\d{2}-\d{2}\.txt$/)
  })

  it('does nothing on download when no report has been fetched', () => {
    const clickSpy = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue(
      { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement,
    )
    const { downloadReport } = useSupportInfo()

    downloadReport()

    expect(clickSpy).not.toHaveBeenCalled()
  })
})
