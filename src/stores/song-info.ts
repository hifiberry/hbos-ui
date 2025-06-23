import { ref } from 'vue'

import { defineStore } from 'pinia'
import type { Song } from '@/types/player'

export const useSongInfo = defineStore('song-info', () => {
  // State
  const songInfo = ref<Song | null>({
    title: 'American Wheeze',
    artist: '16 Horsepower',
    album: 'Olden',
    track_number: 1,
    liked: true,
    cover_art_url: '',
    thumbnail: 'https://r2.theaudiodb.com/images/media/artist/thumb/vtxsxr1358638421.jpg',
    duration: 252,
    position: 1,
  })

  // TODO cleanup setTimeout (this is only for testing purposes)
  /* setTimeout(() => {
    // songInfo.value = null

    songInfo.value = {
      title: 'Dedication',
      artist: '2 Chainz',
      album: 'COLLEGROVE',
      track_number: 1,
      liked: false,
      cover_art_url: '',
      thumbnail: 'https://r2.theaudiodb.com/images/media/artist/thumb/2-chainz-4ff3c2f2aba7b.jpg',
      duration: 299,
      position: 1,
    }
  }, 5000) */

  return {
    // State
    songInfo,
  }
})
