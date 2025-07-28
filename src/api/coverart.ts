import { useAppConfigStore } from '@/stores/appconfig'

export interface CoverArtUpdateRequest {
  url: string
}

export interface CoverArtUpdateResponse {
  success: boolean
  message: string
}

/**
 * Update the custom image URL for a specific artist
 * @param artistName - The artist name (will be base64 encoded)
 * @param imageUrl - The URL of the custom image to set for the artist
 * @returns Promise<CoverArtUpdateResponse>
 */
export async function updateArtistImage(artistName: string, imageUrl: string): Promise<CoverArtUpdateResponse> {
  const configStore = useAppConfigStore()
  const apiBaseUrl = configStore.getApiBaseUrl()

  // URL-safe base64 encode the artist name (without padding) - UTF-8 safe
  const artistB64 = btoa(unescape(encodeURIComponent(artistName)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const url = `${apiBaseUrl}/coverart/artist/${artistB64}/update`

  const requestBody: CoverArtUpdateRequest = {
    url: imageUrl
  }

  console.log('Updating artist image:', {
    artistName,
    artistB64,
    imageUrl,
    requestUrl: url,
    requestBody
  })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Artist image update response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Artist image update failed:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: CoverArtUpdateResponse = await response.json()
    console.log('Artist image update success:', data)
    return data
  } catch (error) {
    console.error('Error updating artist image:', error)
    throw error
  }
}
