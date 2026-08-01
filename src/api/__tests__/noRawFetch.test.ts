import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// vitest runs with the project root as cwd.
const SRC = join(process.cwd(), 'src')

/**
 * Guards against the bug class fixed in the Spotify/Last.fm auth flows: calling
 * an nginx-gated backend with bare `fetch()` instead of `apiFetch()`.
 *
 * A bare `fetch()` sends no session cookie and no `X-CSRF-Token`, and — the
 * user-visible symptom — swallows the gateway's 401 into a generic "HTTP 401"
 * error instead of opening the sign-in prompt. Every call that goes to one of
 * the device's own API prefixes must therefore go through `apiFetch`.
 *
 * Calls to third-party hosts (MusicBrainz, radio-browser, fanart.tv …) are not
 * gated and are intentionally out of scope.
 */

// Files that legitimately call bare fetch().
const ALLOWED = new Set([
  'api/http.ts', // apiFetch itself is the one place that wraps window.fetch
  'api/auth.ts', // /api/auth/* is exempt from the gate (auth_request off)
  'services/musicbrainz.ts', // third-party host, not behind the gateway
])

const BASE_URL_HINTS = [
  'ApiBaseUrl',
  'apiBaseUrl',
  'apiBase',
  'baseUrl',
  'backendUrl',
  'getApiBaseUrl',
]

const collect = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) collect(full, out)
    else if (/\.(ts|vue)$/.test(entry)) out.push(full)
  }
  return out
}

describe('gated API calls go through apiFetch', () => {
  it('has no bare fetch() against a device API base URL', () => {
    const offenders: string[] = []

    for (const file of collect(SRC)) {
      const rel = relative(SRC, file).replaceAll('\\', '/')
      if (ALLOWED.has(rel)) continue

      const source = readFileSync(file, 'utf8')
      // Every `fetch(` that is not part of `apiFetch(`.
      const re = /(?<![A-Za-z0-9_$.])fetch\s*\(/g
      let match: RegExpExecArray | null

      while ((match = re.exec(source)) !== null) {
        // The URL argument may wrap onto following lines, so look ahead a bit.
        const argument = source.slice(match.index, match.index + 200)

        // Either the base URL is interpolated right there, or the call passes a
        // variable (`fetch(url, …)`) that was built from one earlier in the file.
        let hitsDeviceApi = BASE_URL_HINTS.some((hint) => argument.includes(hint))
        if (!hitsDeviceApi) {
          const identifier = argument.match(/fetch\s*\(\s*([A-Za-z_$][\w$]*)/)?.[1]
          if (identifier) {
            const assignment = new RegExp(`\\b(?:const|let|var)\\s+${identifier}\\s*=[^\\n]*`, 'g')
            hitsDeviceApi = (source.match(assignment) ?? []).some((line) =>
              BASE_URL_HINTS.some((hint) => line.includes(hint)),
            )
          }
        }

        if (hitsDeviceApi) {
          const line = source.slice(0, match.index).split('\n').length
          offenders.push(`${rel}:${line}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })
})
