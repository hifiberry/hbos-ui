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

  const when = (text: string, check: () => Promise<boolean>) => async () =>
    (await check()) ? text : null

  // aas has a volume limit of its own, but PipeWire's is not copied into it.
  const pipewireLimit = async () => {
    const r = await getSpeakerEQMasterGain()
    if ('error' in r) return null
    const db = Math.round(r.gain * 10) / 10
    if (!(db < 0)) return null
    return `The volume limit of ${db} dB is not carried over: set it again under Sound, General`
  }

  const checks: Array<() => Promise<string | null>> = [
    when('AES67 stops working', () => serviceEnabled('aes67')),
    when('The USB audio gadget stops working', () => serviceEnabled('usbaudio')),
    when('The input processor (RIAA) stops working', async () => {
      const r = await getRIAAEnabled()
      return !('error' in r) && r.enabled === true
    }),
    pipewireLimit,
    when('Soloist stops working', () => serviceEnabled('soloist')),
  ]

  const results = await Promise.all(
    checks.map(async (check) => {
      try {
        return await check()
      } catch {
        return null
      }
    }),
  )
  return results.filter((t): t is string => t !== null)
}

export const useAasWarnings = () => ({ collectAasWarnings })
