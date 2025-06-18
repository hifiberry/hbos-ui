import { defineStore } from 'pinia'

interface Song {
  title: string
  artist: string
  album: string
  track_number: number
  liked: boolean
  cover_art_url: string
  thumbnail: string
  duration: number
  position: number
}

export const useSongInfo = defineStore('song-info', () => {
  // State
  const songInfo: Song = {
    title: 'Title',
    artist: 'Artist',
    album: 'Album',
    track_number: 1,
    liked: true,
    cover_art_url: '',
    thumbnail: 'https://r2.theaudiodb.com/images/media/artist/thumb/vtxsxr1358638421.jpg',
    duration: 3000,
    position: 1,
  }

  return {
    // State
    songInfo
  }
})
