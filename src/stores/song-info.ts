import { ref } from 'vue'

import { defineStore } from 'pinia'
import type { Song } from '@/types/player'

export const useSongInfo = defineStore('song-info', () => {
  // State
  const songInfo = ref<Song | null>({
    title: 'Title',
    artist: 'Artist',
    album: 'Album',
    track_number: 1,
    liked: true,
    cover_art_url: '',
    thumbnail: 'https://r2.theaudiodb.com/images/media/artist/thumb/vtxsxr1358638421.jpg',
    duration: 3000,
    position: 1,
  })

  return {
    // State
    songInfo,
  }
})
