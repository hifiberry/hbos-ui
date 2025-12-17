import { useAppConfigStore } from '@/stores/appconfig'

/**
 * List of image URL prefixes that need to be proxied through the audiocontrol API
 */
const IMAGE_PROXY_PREFIXES = [
  '/api/library/',     // MPD/library images: /api/library/mpd/image/...
  '/api/coverart/',    // Cover art API: /api/coverart/...
] as const

/**
 * Rewrite image URLs to be accessible through the proxy or production API
 * This is specifically for images returned by the audiocontrol API
 * @param url - The image URL to rewrite
 * @returns The rewritten URL that can be accessed from the browser
 */
export const rewriteImageUrl = (url: string): string => {
  console.log('[IMG] rewriteImageUrl START:', url)

  if (!url) {
    return url
  }

  // Handle external URLs (http://, https://) - return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  const configStore = useAppConfigStore()
  const { useProxy } = configStore.apiConfig()
  console.log('[IMG] useProxy:', useProxy)

  // If URL already starts with /api/audiocontrol/, it's already been rewritten
  let correctedUrl = url
  if (url.startsWith('/api/audiocontrol/')) {
    console.log('[IMG] SKIP - already has /api/audiocontrol/ prefix')
    correctedUrl = url
  } else {
    // Check if URL matches any of the image proxy prefixes
    const matchedPrefix = IMAGE_PROXY_PREFIXES.find(prefix => url.startsWith(prefix))
    console.log('[IMG] Matched prefix:', matchedPrefix)
    if (!matchedPrefix) {
      // URL doesn't need proxying, return as-is
      return url
    }

    // Convert /api/library/ to /api/audiocontrol/library/ and similar
    if (url.startsWith('/api/library/')) {
      correctedUrl = url.replace('/api/library/', '/api/audiocontrol/library/')
      console.log('Fixed library image URL:', { original: url, corrected: correctedUrl })
    } else if (url.startsWith('/api/coverart/')) {
      correctedUrl = url.replace('/api/coverart/', '/api/audiocontrol/coverart/')
      console.log('Fixed coverart image URL:', { original: url, corrected: correctedUrl })
    }
  }

  if (useProxy) {
    // In development with proxy, return the corrected URL
    // The Vite proxy will handle routing this to the actual device
    console.log('Image URL (proxy mode):', { original: url, final: correctedUrl })
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

  console.log('Image URL rewriting:', {
    original: url,
    corrected: correctedUrl,
    rewritten: rewrittenUrl,
    deviceIP,
    devicePort,
  })

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
  const { useProxy } = configStore.apiConfig()

  // Fix URLs that start with /api/library/ to /api/audiocontrol/library/
  // and /api/lyrics/ to /api/audiocontrol/lyrics/
  // and /api/coverart/ to /api/audiocontrol/coverart/
  // This is needed because the API server sometimes returns shortened paths
  // but they should include /audiocontrol/ to match our API structure
  let correctedUrl = url
  if (url.startsWith('/api/library/')) {
    correctedUrl = url.replace('/api/library/', '/api/audiocontrol/library/')
    console.log('Fixed library URL path:', { original: url, corrected: correctedUrl })
  } else if (url.startsWith('/api/lyrics/')) {
    correctedUrl = url.replace('/api/lyrics/', '/api/audiocontrol/lyrics/')
    console.log('Fixed lyrics URL path:', { original: url, corrected: correctedUrl })
  } else if (url.startsWith('/api/coverart/')) {
    correctedUrl = url.replace('/api/coverart/', '/api/audiocontrol/coverart/')
    console.log('Fixed coverart URL path:', { original: url, corrected: correctedUrl })
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
  // Just replace /api/ with the full API base URL
  const rewrittenUrl = correctedUrl.replace('/api/', `${apiBaseUrl}/`)

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
