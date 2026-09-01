import { useAppConfigStore } from '@/stores/appconfig'

/**
 * List of image URL prefixes that need to be proxied through the audiocontrol API
 */
const IMAGE_PROXY_PREFIXES = [
  '/api/library/',     // MPD/library images: /api/library/mpd/image/...
  '/api/coverart/',    // Cover art API: /api/coverart/...
] as const

/** Prefixes already announced this session, so each is reported once. */
const announcedRepairs = new Set<string>()

/**
 * Announce a repair that should no longer be necessary.
 *
 * As of hifiberry/acr#30 audiocontrol emits every path it hands a client -
 * library images, artist cover art, song cover art and lyrics - under the
 * externally visible /api/audiocontrol prefix, over REST and the WebSocket
 * alike, which makes the repairs below dead code against a current daemon.
 * They are kept for one release rather than deleted on trust: hifiberry-webui
 * declares no dependency on hifiberry-audiocontrol, so nothing stops an old
 * daemon pairing with a new interface, and the failure is silent -- an
 * un-prefixed path falls through nginx to this app, which answers 200 with
 * index.html, so the browser caches an HTML document as an album cover.
 *
 * This warning is the evidence for deleting them. If it never appears in the
 * field, the repair is not load-bearing and can go.
 *
 * Reported once per prefix per session. The artist store rewrites one URL per
 * artist and the album grid one per cell, so warning on each would put
 * thousands of identical lines in front of whoever is reading the console --
 * which buries the real ones and says nothing the first line did not.
 */
const warnRepairedPath = (prefix: string, original: string, corrected: string): void => {
  if (announcedRepairs.has(prefix)) {
    return
  }
  announcedRepairs.add(prefix)

  console.warn(
    `[deprecated] audiocontrol returned a path without the /api/audiocontrol prefix; ` +
    `the web interface repaired it: ${original} -> ${corrected}. ` +
    `A daemon carrying hifiberry/acr#30 does not need this, and the repair is ` +
    `scheduled for removal. Further ${prefix} repairs this session are not reported.`
  )
}

/**
 * Rewrite image URLs to be accessible through the proxy or production API
 * This is specifically for images returned by the audiocontrol API
 * @param url - The image URL to rewrite
 * @returns The rewritten URL that can be accessed from the browser
 */
export const rewriteImageUrl = (url: string): string => {
  if (!url) {
    return url
  }

  // Handle external URLs (http://, https://) - return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  const configStore = useAppConfigStore()
  const { useProxy } = configStore.apiConfig()

  // If URL already starts with /api/audiocontrol/, it's already been rewritten
  let correctedUrl = url
  if (url.startsWith('/api/audiocontrol/')) {
    correctedUrl = url
  } else {
    // Check if URL matches any of the image proxy prefixes
    const matchedPrefix = IMAGE_PROXY_PREFIXES.find(prefix => url.startsWith(prefix))
    if (!matchedPrefix) {
      // URL doesn't need proxying, return as-is
      return url
    }

    // Convert /api/library/ to /api/audiocontrol/library/ and similar
    if (url.startsWith('/api/library/')) {
      correctedUrl = url.replace('/api/library/', '/api/audiocontrol/library/')
      warnRepairedPath('/api/library/', url, correctedUrl)
    } else if (url.startsWith('/api/coverart/')) {
      correctedUrl = url.replace('/api/coverart/', '/api/audiocontrol/coverart/')
      warnRepairedPath('/api/coverart/', url, correctedUrl)
    }
  }

  if (useProxy) {
    // In development with proxy, return the corrected URL
    // The Vite proxy will handle routing this to the actual device
    console.log('[IMG]', url, '->', correctedUrl)
    return correctedUrl
  }

  // In production (or when not using proxy), prepend the device base URL
  const deviceIP = configStore.config.audiocontrol_api.deviceIP
  const devicePort = configStore.config.audiocontrol_api.devicePort

  // Build full URL with device IP/port
  // correctedUrl is like: /api/audiocontrol/library/mpd/image/...
  // We want: http://192.168.1.67/api/audiocontrol/library/mpd/image/...
  const portSuffix = devicePort === 80 ? '' : `:${devicePort}`
  const rewrittenUrl = `http://${deviceIP}${portSuffix}${correctedUrl}`

  console.log('[IMG]', url, '->', rewrittenUrl)

  return rewrittenUrl
}

/**
 * This function helps to deal with reverse proxies that rewrite the API url without the API
 * server knowing the full path.
 * @param url - The URL to rewrite
 * @returns The rewritten URL with full API prefix
 */
export const rewriteAudiocontrolApiUrl = (url: string): string => {
  if (!url) {
    return url
  }

  // Handle external URLs (http://, https://) - return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // Only process URLs that start with /api/
  if (!url.startsWith('/api/')) {
    return url
  }

  const configStore = useAppConfigStore()
  const { useProxy, apiPrefix } = configStore.apiConfig()

  // Fix URLs that start with /api/library/ to /api/audiocontrol/library/
  // and /api/lyrics/ to /api/audiocontrol/lyrics/
  // and /api/coverart/ to /api/audiocontrol/coverart/
  // This is needed because the API server sometimes returns shortened paths
  // but they should include /audiocontrol/ to match our API structure
  let correctedUrl = url
  if (url.startsWith('/api/library/')) {
    correctedUrl = url.replace('/api/library/', '/api/audiocontrol/library/')
    warnRepairedPath('/api/library/', url, correctedUrl)
  } else if (url.startsWith('/api/lyrics/')) {
    correctedUrl = url.replace('/api/lyrics/', '/api/audiocontrol/lyrics/')
    warnRepairedPath('/api/lyrics/', url, correctedUrl)
  } else if (url.startsWith('/api/coverart/')) {
    correctedUrl = url.replace('/api/coverart/', '/api/audiocontrol/coverart/')
    warnRepairedPath('/api/coverart/', url, correctedUrl)
  }

  if (useProxy) {
    // In development with proxy, return the corrected URL
    // The Vite proxy will handle routing this to the actual device
    console.log('API URL (proxy mode):', { original: url, final: correctedUrl })
    return correctedUrl
  }

  // In production (or when not using proxy), use the full API base URL
  const apiBaseUrl = configStore.getApiBaseUrl()

  // For already encoded URLs, don't double-encode
  // apiBaseUrl already ends in the API prefix (/api/audiocontrol), so strip that
  // same prefix off the corrected path. Replacing only /api/ left the
  // audiocontrol segment in twice - /api/audiocontrol/audiocontrol/lyrics/... -
  // which is not a route the gateway knows, so it answered 401.
  const rewrittenUrl = correctedUrl.startsWith(`${apiPrefix}/`)
    ? `${apiBaseUrl}${correctedUrl.slice(apiPrefix.length)}`
    : correctedUrl.replace('/api/', `${apiBaseUrl}/`)

  // Enhanced debug logging to understand what's happening
  console.log('API URL rewriting:', {
    original: url,
    corrected: correctedUrl,
    rewritten: rewrittenUrl,
    apiBaseUrl,
    useProxy,
    config: configStore.apiConfig()
  })

  return rewrittenUrl
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use rewriteAudiocontrolApiUrl instead
 */
export const rewrite_audiocontrol_api_url = rewriteAudiocontrolApiUrl
