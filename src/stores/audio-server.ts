import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getAudioServer, setAudioServer, type AudioServerName } from '@/api/audio-server'

export const useAudioServerStore = defineStore('audio-server', () => {
  const running = ref<AudioServerName>('pipewire')
  const chosen = ref<AudioServerName>('pipewire')
  const available = ref(false)
  const loaded = ref(false)
  /** Message of the last failed load, null after a successful one. */
  const error = ref<string | null>(null)

  const isAas = computed(() => running.value === 'aas')

  /** A failed load leaves the defaults: every view then behaves as under PipeWire. */
  const load = async () => {
    const result = await getAudioServer()
    if ('error' in result) {
      console.warn('Failed to load the audio server:', result.message)
      error.value = result.message
    } else {
      error.value = null
      running.value = result.running
      chosen.value = result.chosen
      available.value = result.available
    }
    loaded.value = true
  }

  /** Resolves with `reboot_required` and the route's warnings; rejects with its message. */
  const choose = async (
    server: AudioServerName,
  ): Promise<{ rebootRequired: boolean; warnings: string[] }> => {
    const result = await setAudioServer(server)
    if ('error' in result) throw new Error(result.message)
    running.value = result.running
    chosen.value = result.chosen
    available.value = result.available
    return { rebootRequired: result.reboot_required, warnings: result.warnings ?? [] }
  }

  return { running, chosen, available, loaded, error, isAas, load, choose }
})
