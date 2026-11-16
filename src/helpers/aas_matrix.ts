/**
 * Channel mode of the master under `aas`, expressed as routes of its matrix.
 * Sources are `players` and, when the current matrix already routes it, `analog`.
 */
import type { AasMatrix, AasRoute } from '@/api/aas'
import type { AudioMode } from '@/helpers/mixing_matrix'

const MASTER = 1
const MONO_GAIN_DB = -6

/** [side of the source, output channel, gain_db] per mode. */
const MODE_ROUTES: Record<AudioMode, [string, number, number?][]> = {
  stereo: [['left', 1], ['right', 2]],
  swapped: [['left', 2], ['right', 1]],
  mono: [
    ['left', 1, MONO_GAIN_DB],
    ['right', 1, MONO_GAIN_DB],
    ['left', 2, MONO_GAIN_DB],
    ['right', 2, MONO_GAIN_DB],
  ],
  left: [['left', 1], ['left', 2]],
  right: [['right', 1], ['right', 2]],
}

const routesFor = (source: string, mode: AudioMode): AasRoute[] =>
  MODE_ROUTES[mode].map(([side, to, gain]) => {
    const route: AasRoute = { from: `${source}.${side}`, to }
    if (gain !== undefined) route.gain_db = gain
    return route
  })

/** The matrix with the master's routes set to `mode`; further outputs are kept as they are. */
export function modeToMatrix(current: AasMatrix, mode: AudioMode): AasMatrix {
  const master = current.outputs.find((o) => o.output === MASTER)
  const sources = ['players']
  if (master?.routes.some((r) => r.from.startsWith('analog.'))) sources.push('analog')
  const routes = sources.flatMap((s) => routesFor(s, mode))

  const outputs = current.outputs.map((o) => (o.output === MASTER ? { ...o, routes } : o))
  if (!master) outputs.unshift({ output: MASTER, routes })
  return { outputs }
}

const key = (r: AasRoute) => `${r.from}>${r.to}@${r.gain_db ?? 0}`

/** The mode of the master's `players` routes; no routes or an unknown shape read as stereo. */
export function matrixToMode(matrix: AasMatrix): AudioMode {
  const master = matrix.outputs.find((o) => o.output === MASTER)
  const have = (master?.routes ?? []).filter((r) => r.from.startsWith('players.')).map(key).sort()
  if (have.length === 0) return 'stereo'
  for (const mode of Object.keys(MODE_ROUTES) as AudioMode[]) {
    const want = routesFor('players', mode).map(key).sort()
    if (want.length === have.length && want.every((k, i) => k === have[i])) return mode
  }
  return 'stereo'
}
