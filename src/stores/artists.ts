import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Artist } from '@/types/library'

const MOCK_ARTISTS: Artist[] = [
  {
    id: 'a1',
    name: 'Artist 1Artist 1Artist 1Artist 1Artist 1Artist 1',
    album_count: 1,
    thumb_url: ['https://r2.theaudiodb.com/images/media/artist/thumb/2-chainz-4ff3c2f2aba7b.jpg'],
    is_multi: true,
  },
  {
    id: 'a2',
    name: 'Artist 2',
    album_count: 1,
    thumb_url: ['https://r2.theaudiodb.com/images/media/artist/thumb/2-chainz-4ff3c2f2aba7b.jpg'],
    is_multi: true,
  },
  {
    id: 'a3',
    name: 'Artist 3',
    album_count: 10,
    thumb_url: ['https://r2.theaudiodb.com/images/media/artist/thumb/vtxsxr1358638421.jpg'],
    is_multi: true,
  },
  {
    id: 'a4',
    name: 'Artist 4',
    album_count: 1,
    thumb_url: ['https://r2.theaudiodb.com/images/media/artist/thumb/vtxsxr1358638421.jpg'],
    is_multi: true,
  },
  {
    id: 'a5',
    name: 'Artist 5',
    album_count: 1,
    thumb_url: ['https://r2.theaudiodb.com/images/media/artist/thumb/vtxsxr1358638421.jpg'],
    is_multi: true,
  },
  {
    id: 'a6',
    name: 'Artist 6',
    album_count: 8,
    thumb_url: ['https://r2.theaudiodb.com/images/media/artist/thumb/vtxsxr1358638421.jpg'],
    is_multi: true,
  },
]

export const useArtistsStore = defineStore('artists', () => {
  // State
  const loading = ref<boolean>(false)
  const artists = ref<Artist[]>([])

  // Action
  async function getArtists() {
    loading.value = true

    return new Promise((resolve) => {
      setTimeout(() => {
        loading.value = false
        artists.value = MOCK_ARTISTS
        resolve(true)
      }, 2400)
    })
  }

  return {
    // State
    loading,
    artists,

    // Action
    getArtists,
  }
})
