/**
 * Composable for fetching and saving the diagnostic support report.
 *
 * The report is fetched once and reused for the download, so collecting it —
 * which shells out to journalctl, dpkg-query and systemctl — does not run twice.
 */

import { ref } from 'vue'
import { getSupportInfo } from '@/api/config'
import { useToastStore } from '@/stores/toast'

const FILE_PREFIX = 'hifiberry-supportinfo'

const GENERIC_ERROR_MESSAGE = 'Could not collect the support report'
// configurator upgrades deliberately don't restart config-server (playback must
// not be interrupted), so a freshly updated system can still be running an older
// config-server that doesn't know the /supportinfo route yet, and answers 404.
const STALE_SERVICE_ERROR_MESSAGE =
  'Could not collect the support report: an update is waiting for a service restart or reboot to take effect'

export function useSupportInfo() {
  const toastStore = useToastStore()

  const report = ref<string | null>(null)
  const loading = ref(false)

  async function fetchReport(): Promise<void> {
    loading.value = true
    try {
      report.value = await getSupportInfo()
    } catch (error) {
      report.value = null
      const isNotFound = error instanceof Error && error.message.includes('404')
      toastStore.showErrorToast(isNotFound ? STALE_SERVICE_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE)
      console.error('Failed to fetch support report:', error)
    } finally {
      loading.value = false
    }
  }

  function downloadReport(): void {
    if (report.value === null) {
      return
    }

    const date = new Date().toISOString().slice(0, 10)
    const blob = new Blob([report.value], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    // No hostname in the filename, for the same reason the report omits it.
    link.download = `${FILE_PREFIX}-${date}.txt`
    link.click()

    URL.revokeObjectURL(url)
  }

  return { report, loading, fetchReport, downloadReport }
}
