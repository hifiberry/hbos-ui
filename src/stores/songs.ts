import { ref } from 'vue'

import { defineStore } from 'pinia'
import type { Song } from '@/types/library'

const MOCK_SONG: Song = {
  id: 'song-1',
  title: 'American Wheeze',
  artist: '16 Horsepower',
  album: 'Olden',
  track_number: 1,
  liked: true,
  cover_art_url: '',
  thumbnail: 'https://r2.theaudiodb.com/images/media/artist/thumb/vtxsxr1358638421.jpg',
  duration: 252,
  position: 1,
}

const MOCK_SONGS: Song[] = [
  {
    id: 'song-1',
    title: 'Dedication',
    artist: '2 Chainz',
    album: 'COLLEGROVE',
    track_number: 1,
    liked: false,
    cover_art_url: '',
    thumbnail: 'https://r2.theaudiodb.com/images/media/artist/thumb/2-chainz-4ff3c2f2aba7b.jpg',
    duration: 299,
    position: 1,
  },
  {
    id: 'song-2',
    title: 'American Wheeze',
    artist: '16 Horsepower',
    album: 'Olden',
    track_number: 1,
    liked: true,
    cover_art_url: '',
    thumbnail: 'https://r2.theaudiodb.com/images/media/artist/thumb/vtxsxr1358638421.jpg',
    duration: 252,
    position: 1,
  },
  {
    id: 'song-3',
    title: 'American Wheeze',
    artist: '16 Horsepower',
    album: 'Olden',
    track_number: 1,
    liked: true,
    cover_art_url: '',
    thumbnail: 'https://r2.theaudiodb.com/images/media/artist/thumb/vtxsxr1358638421.jpg',
    duration: 122,
    position: 1,
  },
]

export const useSongsStore = defineStore('songs', () => {
  const loading = ref<boolean>(false)
  const songs = ref<Song[]>([])
  const song = ref<Song | null>(null)

  // State

  // Action
  // TODO make endpoins from acr
  async function getSongs() {
    loading.value = true

    return new Promise((resolve) => {
      setTimeout(() => {
        loading.value = false
        songs.value = MOCK_SONGS
        resolve(true)
      }, 2400)
    })
  }

  async function getSongById(id: string) {
    console.log('GET ALBUM', id)
    loading.value = true

    return new Promise((resolve) => {
      setTimeout(() => {
        loading.value = false
        song.value = MOCK_SONG
        resolve(true)
      }, 2400)
    })
  }

  return {
    // State
    song,
    songs,
    loading,

    //Action
    getSongs,
    getSongById,
  }
})
