import { useAppConfigStore } from '@/stores/appconfig'

/**
 * Rewrite URLs that start with /api/ to use the full audiocontrol API prefix
 * This function helps to deal with reverse proxies that rewrite the API url without the API
 * server knowing the full path.
 * @param url - The URL to rewrite
 * @returns The rewritten URL with full API prefix
 */
export const rewriteAudiocontrolApiUrl = (url: string): string => {
  if (!url || !url.startsWith('/api/')) {
    return url
  }

  const configStore = useAppConfigStore()
  const { useProxy } = configStore.apiConfig()

  // Fix URLs that start with /api/library/ to /api/audiocontrol/library/
  // This is needed because the API server sometimes returns /api/library/ paths
  // but they should be /api/audiocontrol/library/ to match our API structure
  let correctedUrl = url
  if (url.startsWith('/api/library/')) {
    correctedUrl = url.replace('/api/library/', '/api/audiocontrol/library/')
    console.log('Fixed library URL path:', { original: url, corrected: correctedUrl })
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
