/** One output's levels from an aas `/levels` frame, raw 0..255 values. */
export interface AasMasterLevels {
  leftRms: number
  leftPeak: number
  rightRms: number
  rightPeak: number
  leftClipping: boolean
  rightClipping: boolean
}

/**
 * Find meter 1 (the master) in a `/levels` frame. Meters follow one another,
 * each `[id, n, rms/peak per channel, clip bits]`. A mono master shows on
 * both sides. Returns null when the frame has no complete meter 1.
 */
export function parseAasLevels(buffer: ArrayBuffer): AasMasterLevels | null {
  const view = new DataView(buffer)
  let pos = 0
  while (pos + 2 <= view.byteLength) {
    const id = view.getUint8(pos)
    const channels = view.getUint8(pos + 1)
    const size = 2 + channels * 2 + 1
    if (pos + size > view.byteLength) return null
    if (id === 1) {
      if (channels < 1) return null
      const rightAt = channels >= 2 ? pos + 4 : pos + 2
      const clip = view.getUint8(pos + 2 + channels * 2)
      return {
        leftRms: view.getUint8(pos + 2),
        leftPeak: view.getUint8(pos + 3),
        rightRms: view.getUint8(rightAt),
        rightPeak: view.getUint8(rightAt + 1),
        leftClipping: (clip & 0x01) !== 0,
        rightClipping: channels >= 2 ? (clip & 0x02) !== 0 : (clip & 0x01) !== 0,
      }
    }
    pos += size
  }
  return null
}
