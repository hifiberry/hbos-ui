import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getAudioServer, setAudioServer, type AudioServerName } from '@/api/audio-server'

export const useAudioServerStore = defineStore('audio-server', () => {
  const running = ref<AudioServerName>('pipewire')
  const chosen = ref<AudioServerName>('pipewire')
  const available = ref(false)
  const loaded = ref(false)

  const isAas = computed(() => running.value === 'aas')

  /** A failed load leaves the defaults: every view then behaves as under PipeWire. */
  const load = async () => {
    const result = await getAudioServer()
    if ('error' in result) {
      console.warn('Failed to load the audio server:', result.message)
    } else {
      running.value = result.running
      chosen.value = result.chosen
      available.value = result.available
    }
    loaded.value = true
  }

  /** Resolves with `reboot_required`; rejects with the route's message. */
  const choose = async (server: AudioServerName): Promise<boolean> => {
    const result = await setAudioServer(server)
    if ('error' in result) throw new Error(result.message)
    running.value = result.running
    chosen.value = result.chosen
    available.value = result.available
    return result.reboot_required
  }

  return { running, chosen, available, loaded, isAas, load, choose }
})
