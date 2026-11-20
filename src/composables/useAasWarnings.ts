import { getSystemdServiceStatus } from '@/api/config'
import { getRIAAEnabled, getSpeakerEQMasterGain } from '@/api/pipewire'

/**
 * What stops working on this device when it switches to aas: only what is in
 * use. A check that fails is left out of the list, not reported as an error.
 * Bluetooth is not on it: aas plays it through bluez-alsa.
 */
export const collectAasWarnings = async (): Promise<string[]> => {
  const serviceEnabled = async (name: string): Promise<boolean> => {
    try {
      const response = await getSystemdServiceStatus(name)
      return response.data?.enabled === 'enabled'
    } catch {
      return false
    }
  }

  const checks: Array<[string, () => Promise<boolean>]> = [
    ['AES67 stops working', () => serviceEnabled('aes67')],
    ['The USB audio gadget stops working', () => serviceEnabled('usbaudio')],
    [
      'The input processor (RIAA) stops working',
      async () => {
        const r = await getRIAAEnabled()
        return !('error' in r) && r.enabled === true
      },
    ],
    [
      'The volume limit is not applied',
      async () => {
        const r = await getSpeakerEQMasterGain()
        return !('error' in r) && r.gain < 0
      },
    ],
    ['Soloist stops working', () => serviceEnabled('soloist')],
  ]

  const results = await Promise.all(
    checks.map(async ([text, check]) => {
      try {
        return (await check()) ? text : null
      } catch {
        return null
      }
    }),
  )
  return results.filter((t): t is string => t !== null)
}

export const useAasWarnings = () => ({ collectAasWarnings })
