import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Albums } from '@/types/library'

const MOCK_ALBUMS: Albums[] = [
  {
    id: 'a1',
    name: 'Artist 1',
    release_date: '',
    tracks_count: 20,
    cover_art: 'https://r2.theaudiodb.com/images/media/artist/thumb/2-chainz-4ff3c2f2aba7b.jpg',
  },
  {
    id: 'a2',
    name: 'Artist 2',
    release_date: '',
    tracks_count: 20,
    cover_art: 'https://r2.theaudiodb.com/images/media/artist/thumb/2-chainz-4ff3c2f2aba7b.jpg',
  },
]

export const useAlbumsStore = defineStore('albums', () => {
  // State
  const loading = ref<boolean>(false)
  const albums = ref<Albums[]>([])

  // Action
  async function getAlbums() {
    loading.value = true

    return new Promise((resolve) => {
      setTimeout(() => {
        loading.value = false
        albums.value = MOCK_ALBUMS
        resolve(true)
      }, 2400)
    })
  }

  return {
    // State
    loading,
    albums,

    // Action
    getAlbums,
  }
})
