<template>
  <div class="artists">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'library' }">Artists</AppBackRouter>
      <div class="search-bar">
        <AppSearch
          v-model="search"
          :debounce="300"
          placeholder="Search artists..."
          @change="onSearch"
        />
      </div>
    </div>
    <div class="card">
      <AppPosterGrid
        ref="posterGrid"
        :loading="loading"
        :loaded="loaded"
        :items="sortedArtists"
        :show-all="true"
        poster-form="circle"
        @click="(artist) => router.push({ name: 'artist-album', params: { artistId: artist.id } })"
      />
    </div>

    <!-- Alphabet Index -->
    <AppAlphabetIndex
      :items="sortedArtists"
      @letter-click="scrollToLetter"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

import AppBackRouter from '@/components/app-back-router.vue'
import AppSearch from '@/components/app-search.vue'
import AppPosterGrid from '@/components/app-poster-grid.vue'
import AppAlphabetIndex from '@/components/AppAlphabetIndex.vue'

import { storeToRefs } from 'pinia'

import { useArtistStore } from '@/stores/artist.ts'
const artistStore = useArtistStore()
const { loading, loaded, sortedArtists } = storeToRefs(artistStore)
const { getArtists, setSearchQuery, clearSearch } = artistStore

const search = ref<string>('')

const onSearch = (searchValue: string) => {
  search.value = searchValue
  setSearchQuery(searchValue)
}

const scrollToLetter = (letter: string) => {
  if (letter === '#') {
    // Handle scrolling to artists starting with numbers
    const targetArtist = sortedArtists.value.find(artist => {
      const firstChar = artist.name.charAt(0)
      return /[0-9]/.test(firstChar)
    })

    if (targetArtist) {
      // Find the wrapper element with data-id
      const wrapperElement = document.querySelector(`[data-id="${targetArtist.$id}"]`)

      if (wrapperElement) {
        // Find the poster element inside the wrapper (has actual dimensions)
        let posterElement = wrapperElement.querySelector('.app-poster') as HTMLElement

        if (!posterElement) {
          // Fallback: try finding any element with "poster" in the class name
          posterElement = wrapperElement.querySelector('[class*="poster"]') as HTMLElement
        }

        if (posterElement) {
          // Scroll to the poster element
          posterElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        } else {
          // Last resort: scroll to the wrapper itself
          wrapperElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }
      }
    } else {
      // If no artists with numbers, scroll to top
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
    return
  }

  // Find the first artist that starts with this letter
  const targetArtist = sortedArtists.value.find(artist =>
    artist.name.charAt(0).toUpperCase() === letter
  )

  if (targetArtist) {
    // Find the wrapper element with data-id
    const wrapperElement = document.querySelector(`[data-id="${targetArtist.$id}"]`)

    if (wrapperElement) {
      // Find the poster element inside the wrapper (has actual dimensions)
      let posterElement = wrapperElement.querySelector('.app-poster') as HTMLElement

      if (!posterElement) {
        // Fallback: try finding any element with "poster" in the class name
        posterElement = wrapperElement.querySelector('[class*="poster"]') as HTMLElement
      }

      if (posterElement) {
        // Scroll to the poster element
        posterElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        })
      } else {
        // Last resort: scroll to the wrapper itself
        wrapperElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    }
  }
}

onMounted(() => {
  getArtists()
  // Clear any existing search when component mounts
  clearSearch()
  search.value = ''
})
</script>

<style scoped lang="scss">
.artists {
  .breadcrumbs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .search-bar {
      max-width: 200px;
    }
  }
}
</style>
