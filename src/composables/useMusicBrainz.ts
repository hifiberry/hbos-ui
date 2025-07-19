import { ref, computed } from 'vue'
import { musicBrainzService, type MusicBrainzResponse } from '@/services/musicbrainz'

export function useMusicBrainz() {
  const artistData = ref<MusicBrainzResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchArtist = async (mbid: string) => {
    if (!mbid) return

    loading.value = true
    error.value = null
    artistData.value = null

    try {
      const data = await musicBrainzService.getArtist(mbid)
      artistData.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch artist data'
    } finally {
      loading.value = false
    }
  }

  const formattedLifeSpan = computed(() => {
    if (!artistData.value?.['life-span']) return null
    return musicBrainzService.formatLifeSpan(artistData.value['life-span'])
  })

  const primaryGenre = computed(() => {
    if (!artistData.value?.tags) return null
    return musicBrainzService.getPrimaryGenre(artistData.value.tags)
  })

  const formattedLocation = computed(() => {
    if (!artistData.value) return null
    return musicBrainzService.getFormattedLocation(
      artistData.value.area,
      artistData.value['begin-area']
    )
  })

  const topTags = computed(() => {
    if (!artistData.value?.tags) return []
    return artistData.value.tags.slice(0, 5) // Top 5 tags
  })

  return {
    artistData,
    loading,
    error,
    fetchArtist,
    formattedLifeSpan,
    primaryGenre,
    formattedLocation,
    topTags
  }
}
