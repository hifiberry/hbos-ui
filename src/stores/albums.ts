import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Album } from '@/types/library'

const MOCK_ALBUMS: Album[] = [
  {
    id: 'a1',
    name: 'Album 1',
    release_date: '',
    tracks_count: 20,
    cover_art: 'https://r2.theaudiodb.com/images/media/artist/thumb/2-chainz-4ff3c2f2aba7b!!!.jpg',
  },
  {
    id: 'a2',
    name: 'Album 2',
    release_date: '',
    tracks_count: 20,
    cover_art: 'https://r2.theaudiodb.com/images/media/artist/thumb/2-chainz-4ff3c2f2aba7b.jpg',
  },
]

const MOCK_ALBUM: Album = {
  id: 'a1',
  name: 'Album 1',
  release_date: '',
  tracks_count: 20,
  cover_art: 'https://r2.theaudiodb.com/images/media/artist/thumb/2-chainz-4ff3c2f2aba7b.jpg',
}

export const useAlbumsStore = defineStore('albums', () => {
  // State
  const loading = ref<boolean>(false)
  const albums = ref<Album[]>([])
  const album = ref<Album | null>(null)

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

  async function getAlbumById(id: string) {
    console.log('GET ALBUM', id)
    loading.value = true

    return new Promise((resolve) => {
      setTimeout(() => {
        loading.value = false
        album.value = MOCK_ALBUM
        resolve(true)
      }, 2400)
    })
  }

  return {
    // State
    loading,
    albums,
    album,

    // Action
    getAlbums,
    getAlbumById,
  }
})
