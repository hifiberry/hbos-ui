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
        :loading="loading"
        :loaded="loaded"
        :items="sortedArtists"
        poster-form="circle"
        @click="(artist) => router.push({ name: 'artist-album', params: { artistId: artist.id } })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

import AppBackRouter from '@/components/app-back-router.vue'
import AppSearch from '@/components/app-search.vue'
import AppPosterGrid from '@/components/app-poster-grid.vue'

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
