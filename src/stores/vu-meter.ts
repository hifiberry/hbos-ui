import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useVuMeterStore = defineStore('vu-meter', () => {
  // State — raw u8 values (0-255) from the binary WebSocket protocol
  const leftRms = ref(0)
  const leftPeak = ref(0)
  const rightRms = ref(0)
  const rightPeak = ref(0)
  const leftClipping = ref(false)
  const rightClipping = ref(false)
  const connected = ref(false)

  // Convert u8 (0-255) to percentage (0-100)
  const leftRmsPercent = computed(() => (leftRms.value / 255) * 100)
  const leftPeakPercent = computed(() => (leftPeak.value / 255) * 100)
  const rightRmsPercent = computed(() => (rightRms.value / 255) * 100)
  const rightPeakPercent = computed(() => (rightPeak.value / 255) * 100)

  // True if any channel has signal
  const hasSignal = computed(
    () => leftRms.value > 0 || rightRms.value > 0,
  )

  let socket: WebSocket | null = null
  let reconnectTimer: number | undefined = undefined

  function getWsUrl(): string {
    const hostname = window.location.hostname
    const port = window.location.port
    const portSuffix = port && port !== '80' ? `:${port}` : ''
    return `ws://${hostname}${portSuffix}/api/vu-meter/api/v1/levels`
  }

  function connect() {
    if (socket) return

    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = undefined
    }

    try {
      socket = new WebSocket(getWsUrl())
      socket.binaryType = 'arraybuffer'

      socket.onopen = () => {
        connected.value = true
      }

      socket.onclose = () => {
        connected.value = false
        socket = null
        // Reconnect after 2 seconds
        reconnectTimer = window.setTimeout(connect, 2000)
      }

      socket.onerror = () => {
        // onclose will fire after this, triggering reconnect
      }

      socket.onmessage = (event: MessageEvent) => {
        if (!(event.data instanceof ArrayBuffer) || event.data.byteLength < 6) return

        const view = new DataView(event.data)
        leftRms.value = view.getUint8(0)
        leftPeak.value = view.getUint8(1)
        rightRms.value = view.getUint8(2)
        rightPeak.value = view.getUint8(3)

        const flags = view.getUint8(4)
        leftClipping.value = (flags & 0x01) !== 0
        rightClipping.value = (flags & 0x02) !== 0
      }
    } catch {
      socket = null
      reconnectTimer = window.setTimeout(connect, 2000)
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = undefined
    }
    if (socket) {
      socket.close()
      socket = null
    }
    connected.value = false
  }

  return {
    // State
    leftRms,
    leftPeak,
    rightRms,
    rightPeak,
    leftClipping,
    rightClipping,
    connected,

    // Computed
    leftRmsPercent,
    leftPeakPercent,
    rightRmsPercent,
    rightPeakPercent,
    hasSignal,

    // Actions
    connect,
    disconnect,
  }
})
